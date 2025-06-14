import { InstanceBase, InstanceStatus, runEntrypoint, Regex } from '@companion-module/base'
import { createConnection } from 'net'

class DLiveTcpMidiInstance extends InstanceBase {
	constructor(internal) {
		super(internal)
		
		// TCP connection for MIDI over TCP
		this.socket = null
		this.config = {}
		this.isConnected = false
		this.reconnectTimer = null
		
		// MIDI message parsing
		this.midiBuffer = Buffer.alloc(0)
		this.midiMessageCount = 0
		this.lastMessageTime = null
		
		// Message filtering and throttling
		this.messageThrottle = new Map() // For throttling frequent messages
		this.throttleInterval = 100 // ms between same message updates
		this.maxMessagesPerSecond = 50 // Limit total message processing
		this.messageTimestamps = [] // Track message rate
		
		// Softkey tracking (main focus)
		this.softkeys = new Map()
	}

	async init(config) {
		this.config = config
		this.log('info', 'dLive TCP MIDI Receiver initializing...')
		
		this.updateStatus(InstanceStatus.Connecting)
		this.initVariables()
		this.connectTCP()
	}

	getConfigFields() {
		return [
			{
				type: 'static-text',
				id: 'info',
				width: 12,
				label: 'dLive TCP MIDI Receiver',
				value: 'This module receives TCP MIDI messages from Allen & Heath dLive mixers and creates variables for softkey commands. Configure your dLive to send MIDI over TCP to this IP address.'
			},
			{
				type: 'textinput',
				id: 'host',
				label: 'dLive IP Address',
				width: 8,
				default: '192.168.1.100',
				regex: Regex.IP,
				tooltip: 'IP address of your dLive MixRack or Surface'
			},
			{
				type: 'dropdown',
				id: 'port',
				label: 'MIDI Port',
				width: 4,
				default: 51325,
				choices: [
					{ id: 51325, label: '51325 - MixRack (unencrypted)' },
					{ id: 51327, label: '51327 - MixRack (TLS encrypted)' },
					{ id: 51328, label: '51328 - Surface (unencrypted)' },
					{ id: 51329, label: '51329 - Surface (TLS encrypted)' }
				],
				tooltip: 'TCP port for MIDI over TCP connection'
			},
			{
				type: 'number',
				id: 'base_midi_channel',
				label: 'Base MIDI Channel (1-16)',
				width: 4,
				default: 1,
				min: 1,
				max: 16,
				tooltip: 'Base MIDI channel configured in dLive (Utility > Control > MIDI)'
			},
			{
				type: 'number',
				id: 'reconnect_interval',
				label: 'Reconnect Interval (seconds)',
				width: 4,
				default: 5,
				min: 0,
				max: 60,
				tooltip: 'Auto-reconnect interval in seconds (0 = disable auto-reconnect)'
			},
			{
				type: 'checkbox',
				id: 'debug_midi',
				label: 'Debug MIDI Messages',
				width: 6,
				default: false,
				tooltip: 'Log all received MIDI messages for debugging'
			}
		]
	}

	initVariables() {
		const variables = [
			// Connection status
			{ variableId: 'connection_status', name: 'Connection Status' },
			{ variableId: 'tcp_connected', name: 'TCP Connected' },
			{ variableId: 'last_connection_time', name: 'Last Connection Time' },
			
			// MIDI activity (minimal)
			{ variableId: 'midi_messages_received', name: 'MIDI Messages Received' },
			{ variableId: 'last_midi_time', name: 'Last MIDI Message Time' },
			{ variableId: 'last_midi_hex', name: 'Last MIDI Message (Hex)' },
			
			// Softkey states ONLY
			{ variableId: 'active_softkeys', name: 'Active Softkeys Count' },
			{ variableId: 'last_softkey_pressed', name: 'Last Softkey Pressed' }
		]
		
		this.setVariableDefinitions(variables)
		
		// Set initial values
		this.setVariableValues({
			connection_status: 'Disconnected',
			tcp_connected: 'No',
			midi_messages_received: '0',
			last_midi_time: 'None',
			last_midi_hex: 'None',
			active_softkeys: '0',
			last_softkey_pressed: 'None'
		})
	}

	connectTCP() {
		if (!this.config.host || !this.config.port) {
			this.updateStatus(InstanceStatus.BadConfig, 'Host or port not configured')
			return
		}

		this.log('info', `Connecting to dLive at ${this.config.host}:${this.config.port}`)
		this.destroyConnection()

		this.socket = createConnection({
			host: this.config.host,
			port: parseInt(this.config.port),
			// Remove timeout - keep connection alive indefinitely
		})

		this.socket.on('connect', () => {
			this.log('info', 'TCP MIDI connection established')
			this.isConnected = true
			this.updateStatus(InstanceStatus.Ok, 'Connected - Receiving MIDI')
			
			// Configure socket for persistent connection
			this.socket.setKeepAlive(true, 15000) // Send keep-alive every 15 seconds
			this.socket.setNoDelay(true)          // Disable Nagle's algorithm for low latency
			
			const now = new Date().toISOString()
			this.setVariableValues({
				connection_status: 'Connected',
				tcp_connected: 'Yes',
				last_connection_time: now
			})
		})

		this.socket.on('data', (data) => {
			this.handleMidiData(data)
		})

		this.socket.on('error', (err) => {
			this.log('error', `TCP error: ${err.message}`)
			this.handleDisconnection()
		})

		this.socket.on('close', () => {
			this.log('warn', 'TCP connection closed by remote host')
			this.handleDisconnection()
		})
	}

	handleDisconnection() {
		this.isConnected = false
		this.updateStatus(InstanceStatus.ConnectionFailure, 'Connection lost - will retry')
		this.setVariableValues({
			connection_status: 'Disconnected',
			tcp_connected: 'No'
		})
		
		// Auto-reconnect with backoff (if enabled)
		const reconnectInterval = this.config.reconnect_interval || 5
		if (reconnectInterval > 0 && !this.reconnectTimer) {
			this.log('info', `Reconnecting in ${reconnectInterval} seconds...`)
			
			this.reconnectTimer = setTimeout(() => {
				this.reconnectTimer = null
				this.connectTCP()
			}, reconnectInterval * 1000)
		} else if (reconnectInterval === 0) {
			this.log('info', 'Auto-reconnect disabled')
			this.updateStatus(InstanceStatus.Disconnected, 'Disconnected - auto-reconnect disabled')
		}
	}

	handleMidiData(data) {
		// Add data to buffer
		this.midiBuffer = Buffer.concat([this.midiBuffer, data])
		
		// Process complete MIDI messages
		while (this.midiBuffer.length > 0) {
			const result = this.extractMidiMessage()
			if (!result.message) break
			
			this.processMidiMessage(result.message)
			this.midiBuffer = this.midiBuffer.slice(result.bytesConsumed)
		}
	}

	extractMidiMessage() {
		if (this.midiBuffer.length === 0) {
			return { message: null, bytesConsumed: 0 }
		}

		const statusByte = this.midiBuffer[0]
		
		// Must be a status byte (0x80-0xFF)
		if ((statusByte & 0x80) === 0) {
			// Skip non-status bytes
			return { message: null, bytesConsumed: 1 }
		}
		
		// Get message length
		const messageLength = this.getMidiMessageLength(statusByte)
		
		if (this.midiBuffer.length < messageLength) {
			// Wait for complete message
			return { message: null, bytesConsumed: 0 }
		}
		
		const message = this.midiBuffer.slice(0, messageLength)
		return { message, bytesConsumed: messageLength }
	}

	getMidiMessageLength(statusByte) {
		const messageType = statusByte & 0xF0
		
		switch (messageType) {
			case 0x80: // Note Off
			case 0x90: // Note On
			case 0xB0: // Control Change
			case 0xE0: // Pitch Bend
				return 3
			case 0xC0: // Program Change
			case 0xD0: // Channel Pressure
				return 2
			case 0xF0: // System messages
				if (statusByte === 0xF0) {
					// SysEx - find 0xF7 terminator
					for (let i = 1; i < this.midiBuffer.length; i++) {
						if (this.midiBuffer[i] === 0xF7) {
							return i + 1
						}
					}
					return 0 // Incomplete SysEx
				}
				return 1
			default:
				return 1
		}
	}

	processMidiMessage(message) {
		const now = Date.now()
		
		// Rate limiting check
		if (!this.checkMessageRate(now)) {
			return // Skip processing if rate limit exceeded
		}
		
		this.midiMessageCount++
		this.lastMessageTime = new Date().toISOString()
		
		const statusByte = message[0]
		const channel = (statusByte & 0x0F) + 1
		const messageType = statusByte & 0xF0
		
		// Convert to hex string for display
		const hexString = Array.from(message)
			.map(b => b.toString(16).padStart(2, '0').toUpperCase())
			.join(' ')
		
		if (this.config.debug_midi) {
			this.log('debug', `MIDI RX: ${hexString} (Ch${channel})`)
		}
		
		// Update activity variables
		this.setVariableValues({
			midi_messages_received: this.midiMessageCount.toString(),
			last_midi_time: this.lastMessageTime,
			last_midi_hex: hexString
		})
		
		// Reset variables after 1 second
		this.scheduleReset()
		
		// ONLY process Note On/Off for softkey detection
		switch (messageType) {
			case 0x90: // Note On (softkeys)
				if (message[2] > 0) { // Velocity > 0 = pressed
					this.handleSoftkeyPress(channel, message[1], message[2])
				} else { // Velocity 0 = released
					this.handleSoftkeyRelease(channel, message[1])
				}
				break
			case 0x80: // Note Off (softkeys)
				this.handleSoftkeyRelease(channel, message[1])
				break
			// Ignore all other MIDI messages
		}
	}

	handleSoftkeyPress(channel, note, velocity) {
		const softkeyId = `note_${channel}_${note}`
		const timestamp = new Date().toISOString()
		
		this.log('info', `Softkey pressed: Channel ${channel}, Note ${note}, Velocity ${velocity}`)
		
		// Add to active softkeys
		this.softkeys.set(softkeyId, {
			channel,
			note,
			velocity,
			timestamp
		})
		
		// Update variables
		this.setVariableValues({
			active_softkeys: this.softkeys.size.toString(),
			last_softkey_pressed: softkeyId,
			
			// Create specific variables for this softkey
			[`softkey_${softkeyId}_status`]: 'PRESSED',
			[`softkey_${softkeyId}_velocity`]: velocity.toString(),
			[`softkey_${softkeyId}_time`]: timestamp
		})
	}

	handleSoftkeyRelease(channel, note) {
		const softkeyId = `note_${channel}_${note}`
		const timestamp = new Date().toISOString()
		
		this.log('info', `Softkey released: Channel ${channel}, Note ${note}`)
		
		// Remove from active softkeys
		this.softkeys.delete(softkeyId)
		
		// Update variables
		this.setVariableValues({
			active_softkeys: this.softkeys.size.toString(),
			
			// Update specific variables for this softkey
			[`softkey_${softkeyId}_status`]: 'RELEASED',
			[`softkey_${softkeyId}_velocity`]: '0',
			[`softkey_${softkeyId}_time`]: timestamp
		})
	}

	// Message filtering and throttling methods
	checkMessageRate(now) {
		// Clean old timestamps (older than 1 second)
		this.messageTimestamps = this.messageTimestamps.filter(timestamp => now - timestamp < 1000)
		
		// Check if we're under the rate limit
		if (this.messageTimestamps.length >= this.maxMessagesPerSecond) {
			if (this.config.debug_midi) {
				this.log('debug', 'Message rate limit exceeded, dropping message')
			}
			return false
		}
		
		this.messageTimestamps.push(now)
		return true
	}

	scheduleReset() {
		// Clear existing timer
		if (this.resetTimer) {
			clearTimeout(this.resetTimer)
		}
		
		// Reset variables after 1 second of no activity
		this.resetTimer = setTimeout(() => {
			this.setVariableValues({
				last_midi_hex: 'None',
				last_softkey_pressed: 'None'
			})
			this.resetTimer = null
		}, 1000)
	}

	destroyConnection() {
		if (this.socket) {
			this.socket.removeAllListeners()
			this.socket.destroy()
			this.socket = null
		}
		
		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer)
			this.reconnectTimer = null
		}
		
		if (this.resetTimer) {
			clearTimeout(this.resetTimer)
			this.resetTimer = null
		}
	}

	async destroy() {
		this.log('info', 'dLive TCP MIDI Receiver shutting down')
		this.destroyConnection()
		this.updateStatus(InstanceStatus.Disconnected)
	}

	async configUpdated(config) {
		this.log('info', 'Configuration updated, reconnecting...')
		this.config = config
		this.destroyConnection()
		this.connectTCP()
	}
}

runEntrypoint(DLiveTcpMidiInstance, [])