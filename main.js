// main.js - Allen & Heath dLive Companion Module
const { InstanceBase, runEntrypoint, InstanceStatus, combineRgb } = require('@companion-module/base')
const net = require('net')

const { getConfigFields } = require('./config.js')
const { getActions } = require('./actions.js')
const { getFeedbacks } = require('./feedbacks.js')
const { getVariables, initializeVariableValues, createDynamicVariable } = require('./variables.js')
const { getPresets } = require('./presets.js')

// Port constants from dLive MIDI over TCP specification v2.0
const MIXRACK_MIDI_PORT = 51325      // MixRack MIDI (unencrypted)
const MIXRACK_MIDI_TLS_PORT = 51327  // MixRack MIDI (TLS)
const SURFACE_MIDI_PORT = 51328      // Surface MIDI (unencrypted) 
const SURFACE_MIDI_TLS_PORT = 51329  // Surface MIDI (TLS)
const TCP_PORT = 51321               // Legacy TCP commands (non-MIDI)

class dLiveInstance extends InstanceBase {
	constructor(internal) {
		super(internal)

		// Initialize state
		this.config = {}
		this.sockets = {
			mixrackMidi: null,     // MixRack MIDI connection (bidirectional)
			surfaceMidi: null,     // Surface MIDI connection (bidirectional)
			tcp: null              // Legacy TCP commands
		}
		
		// MIDI state management
		this.midiBuffer = {
			mixrack: Buffer.alloc(0),
			surface: Buffer.alloc(0)
		}
		this.lastMidiActivity = null
		this.runningStatus = {
			mixrack: null,
			surface: null
		}
		
		// Console capabilities and MIDI channel configuration
		this.baseMidiChannel = 0  // N (base MIDI channel from dLive config)
		this.dcaCount = 24

		// Statistics
		this.midiMessagesSent = 0
		this.midiMessagesReceived = 0

		// Variable storage
		this.variableValues = {}
		
		// NRPN parsing state
		this.lastNRPN_MSB = undefined
		this.lastNRPN_LSB = undefined
	}

	async init(config) {
		this.config = config
		this.updateStatus(InstanceStatus.Connecting)
		
		// Initialize MIDI channel configuration
		this.baseMidiChannel = (this.config.baseMidiChannel || 1) - 1 // Convert to 0-based
		this.dcaCount = this.config.dcaCount || 24
		
		// Set up module components
		this.setActionDefinitions(getActions(this))
		this.setFeedbackDefinitions(getFeedbacks(this))
		this.setVariableDefinitions(getVariables(this))
		this.setPresetDefinitions(getPresets(this))
		
		// Initialize variable values
		this.variableValues = initializeVariableValues(this)
		this.setVariableValues(this.variableValues)
		
		// Initialize connections
		await this.initConnections()
	}

	async destroy() {
		this.log('debug', 'Module shutting down')
		this.destroyConnections()
	}

	async configUpdated(config) {
		this.config = config
		
		// Update MIDI configuration
		this.baseMidiChannel = (this.config.baseMidiChannel || 1) - 1
		this.dcaCount = this.config.dcaCount || 24
		
		this.log('debug', 'Config updated, reinitializing connections')
		
		// Update module components with new config
		this.setActionDefinitions(getActions(this))
		this.setFeedbackDefinitions(getFeedbacks(this))
		this.setVariableDefinitions(getVariables(this))
		this.setPresetDefinitions(getPresets(this))
		
		// Restart connections with new config
		this.destroyConnections()
		await this.initConnections()
	}

	getConfigFields() {
		return getConfigFields()
	}

	async initConnections() {
		if (!this.config.host) {
			this.updateStatus(InstanceStatus.BadConfig, 'No host configured')
			return
		}

		try {
			// Initialize MixRack MIDI connection (bidirectional)
			if (this.config.connectToMixrack !== false) {
				await this.initMixrackMidiSocket()
			}
			
			// Initialize Surface MIDI connection (bidirectional) 
			if (this.config.connectToSurface) {
				await this.initSurfaceMidiSocket()
			}
			
			// Initialize legacy TCP socket for non-MIDI commands
			if (this.config.model === 'dLive' && this.config.enableLegacyTcp) {
				await this.initTcpSocket()
			}
			
			this.updateConnectionStatus()
			
		} catch (error) {
			this.log('error', `Failed to initialize connections: ${error.message}`)
			this.updateStatus(InstanceStatus.ConnectionFailure, error.message)
		}
	}

	async initMixrackMidiSocket() {
		return new Promise((resolve, reject) => {
			const port = this.config.useTLS ? MIXRACK_MIDI_TLS_PORT : MIXRACK_MIDI_PORT
			this.sockets.mixrackMidi = new net.Socket()
			
			this.sockets.mixrackMidi.setTimeout(5000)
			
			this.sockets.mixrackMidi.on('connect', async () => {
				this.log('debug', `MixRack MIDI connected to ${this.config.host}:${port}`)
				
				// Handle TLS authentication if enabled
				if (this.config.useTLS && this.config.username && this.config.password) {
					try {
						await this.authenticateTLS(this.sockets.mixrackMidi, this.config.username, this.config.password)
					} catch (authError) {
						this.log('error', `TLS authentication failed: ${authError.message}`)
						reject(authError)
						return
					}
				}
				
				resolve()
			})
			
			this.sockets.mixrackMidi.on('data', (data) => {
				this.handleMidiData(data, 'mixrack')
			})
			
			this.sockets.mixrackMidi.on('error', (err) => {
				this.log('error', `MixRack MIDI socket error: ${err.message}`)
				if (this.sockets.mixrackMidi) {
					this.sockets.mixrackMidi.destroy()
					this.sockets.mixrackMidi = null
				}
				reject(err)
			})
			
			this.sockets.mixrackMidi.on('close', () => {
				this.log('debug', 'MixRack MIDI socket closed')
				this.sockets.mixrackMidi = null
				this.runningStatus.mixrack = null
				this.midiBuffer.mixrack = Buffer.alloc(0)
				this.updateConnectionStatus()
			})
			
			this.sockets.mixrackMidi.connect(port, this.config.host)
		})
	}

	async initSurfaceMidiSocket() {
		return new Promise((resolve, reject) => {
			const port = this.config.useTLS ? SURFACE_MIDI_TLS_PORT : SURFACE_MIDI_PORT
			this.sockets.surfaceMidi = new net.Socket()
			
			this.sockets.surfaceMidi.setTimeout(5000)
			
			this.sockets.surfaceMidi.on('connect', async () => {
				this.log('debug', `Surface MIDI connected to ${this.config.host}:${port}`)
				
				// Handle TLS authentication if enabled
				if (this.config.useTLS && this.config.username && this.config.password) {
					try {
						await this.authenticateTLS(this.sockets.surfaceMidi, this.config.username, this.config.password)
					} catch (authError) {
						this.log('error', `TLS authentication failed: ${authError.message}`)
						reject(authError)
						return
					}
				}
				
				resolve()
			})
			
			this.sockets.surfaceMidi.on('data', (data) => {
				this.handleMidiData(data, 'surface')
			})
			
			this.sockets.surfaceMidi.on('error', (err) => {
				this.log('error', `Surface MIDI socket error: ${err.message}`)
				if (this.sockets.surfaceMidi) {
					this.sockets.surfaceMidi.destroy()
					this.sockets.surfaceMidi = null
				}
				reject(err)
			})
			
			this.sockets.surfaceMidi.on('close', () => {
				this.log('debug', 'Surface MIDI socket closed')
				this.sockets.surfaceMidi = null
				this.runningStatus.surface = null
				this.midiBuffer.surface = Buffer.alloc(0)
				this.updateConnectionStatus()
			})
			
			this.sockets.surfaceMidi.connect(port, this.config.host)
		})
	}

	async authenticateTLS(socket, username, password) {
		return new Promise((resolve, reject) => {
			const authMessage = `${username},${password}`
			socket.write(authMessage)
			
			// Wait for "AuthOK" response
			const authTimeout = setTimeout(() => {
				reject(new Error('TLS authentication timeout'))
			}, 5000)
			
			const authHandler = (data) => {
				const response = data.toString()
				if (response.includes('AuthOK')) {
					clearTimeout(authTimeout)
					socket.removeListener('data', authHandler)
					this.log('debug', 'TLS authentication successful')
					resolve()
				} else {
					clearTimeout(authTimeout)
					socket.removeListener('data', authHandler)
					reject(new Error('TLS authentication failed'))
				}
			}
			
			socket.on('data', authHandler)
		})
	}

	async initTcpSocket() {
		return new Promise((resolve, reject) => {
			this.sockets.tcp = new net.Socket()
			
			this.sockets.tcp.setTimeout(5000)
			
			this.sockets.tcp.on('connect', () => {
				this.log('debug', `TCP socket connected to ${this.config.host}:${TCP_PORT}`)
				resolve()
			})
			
			this.sockets.tcp.on('error', (err) => {
				this.log('error', `TCP socket error: ${err.message}`)
				if (this.sockets.tcp) {
					this.sockets.tcp.destroy()
					this.sockets.tcp = null
				}
				reject(err)
			})
			
			this.sockets.tcp.on('close', () => {
				this.log('debug', 'TCP socket closed')
				this.sockets.tcp = null
				this.updateConnectionStatus()
			})
			
			this.sockets.tcp.connect(TCP_PORT, this.config.host)
		})
	}

	handleMidiData(data, source) {
		// Add new data to the appropriate buffer
		this.midiBuffer[source] = Buffer.concat([this.midiBuffer[source], data])
		
		// Process complete MIDI messages
		while (this.midiBuffer[source].length > 0) {
			const result = this.extractMidiMessage(this.midiBuffer[source], source)
			
			if (result.message) {
				// Process the complete MIDI message
				this.processMidiMessage(result.message, source)
				this.midiBuffer[source] = this.midiBuffer[source].slice(result.bytesConsumed)
			} else {
				// Wait for more data
				break
			}
		}
	}

	extractMidiMessage(buffer, source) {
		if (buffer.length === 0) {
			return { message: null, bytesConsumed: 0 }
		}

		let statusByte = buffer[0]
		let messageStart = 0
		
		// Handle MIDI Running Status
		if (statusByte < 0x80) {
			// This is a data byte, use running status
			if (this.runningStatus[source]) {
				statusByte = this.runningStatus[source]
				messageStart = 0 // Don't skip the first byte
			} else {
				// No running status available, skip this byte
				return { message: null, bytesConsumed: 1 }
			}
		} else {
			// This is a status byte, update running status
			this.runningStatus[source] = statusByte
			messageStart = 1 // Skip the status byte in data extraction
		}
		
		// Determine message length based on status byte
		const messageLength = this.getMidiMessageLength(statusByte)
		const totalBytesNeeded = messageStart + messageLength - 1 // -1 because status is counted
		
		if (buffer.length < totalBytesNeeded) {
			// Wait for more data
			return { message: null, bytesConsumed: 0 }
		}
		
		// Extract complete message
		let message
		if (messageStart === 0) {
			// Running status - prepend the status byte
			message = Buffer.concat([Buffer.from([statusByte]), buffer.slice(0, messageLength - 1)])
		} else {
			// Normal message
			message = buffer.slice(0, messageLength)
		}
		
		return { message: message, bytesConsumed: totalBytesNeeded }
	}

	getMidiMessageLength(statusByte) {
		// Return expected message length for MIDI status byte
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
					// SysEx - find F7 terminator
					// This is a simplified approach - in practice, need to scan for F7
					return 8 // Minimum expected for dLive SysEx
				}
				return 1
			default:
				return 1
		}
	}

	processMidiMessage(message, source) {
		const statusByte = message[0]
		const channel = (statusByte & 0x0F) + 1
		const messageType = statusByte & 0xF0
		
		this.lastMidiActivity = new Date().toISOString()
		this.midiMessagesReceived++
		
		this.setVariableValues({
			'last_midi_activity': this.lastMidiActivity,
			'midi_messages_received': this.midiMessagesReceived.toString(),
			'last_midi_source': source
		})
		
		let messageInfo = {
			type: 'unknown',
			channel: channel,
			source: source,
			raw: Array.from(message).map(b => `0x${b.toString(16).padStart(2, '0')}`).join(' ')
		}
		
		switch (messageType) {
			case 0x80: // Note Off
				messageInfo.type = 'note_off'
				messageInfo.note = message[1]
				messageInfo.velocity = message[2]
				this.log('debug', `MIDI Note Off from ${source}: Ch${channel} Note${message[1]} Vel${message[2]}`)
				this.handleDLiveMute(channel, message[1], false) // Note off = mute off
				break
				
			case 0x90: // Note On
				messageInfo.type = 'note_on'
				messageInfo.note = message[1]
				messageInfo.velocity = message[2]
				
				if (message[2] === 0) {
					// Velocity 0 = Note Off
					messageInfo.type = 'note_off'
					this.log('debug', `MIDI Note Off (vel 0) from ${source}: Ch${channel} Note${message[1]}`)
					this.handleDLiveMute(channel, message[1], false)
				} else {
					this.log('debug', `MIDI Note On from ${source}: Ch${channel} Note${message[1]} Vel${message[2]}`)
					// Handle dLive mute logic based on velocity ranges
					if (message[2] >= 0x40) {
						this.handleDLiveMute(channel, message[1], true) // Mute ON
					} else if (message[2] <= 0x3F && message[2] > 0) {
						this.handleDLiveMute(channel, message[1], false) // Mute OFF
					}
				}
				break
				
			case 0xB0: // Control Change
				messageInfo.type = 'control_change'
				messageInfo.controller = message[1]
				messageInfo.value = message[2]
				this.log('debug', `MIDI CC from ${source}: Ch${channel} CC${message[1]} Val${message[2]}`)
				this.handleDLiveMidiCC(channel, message[1], message[2])
				break
				
			case 0xC0: // Program Change (Scene Recall)
				messageInfo.type = 'program_change'
				messageInfo.program = message[1]
				this.log('debug', `MIDI Program Change from ${source}: Ch${channel} Prog${message[1]}`)
				this.handleDLiveSceneRecall(channel, message[1])
				break
				
			case 0xE0: // Pitch Bend (Preamp Gain)
				messageInfo.type = 'pitch_bend'
				messageInfo.value = (message[2] << 7) | message[1]
				this.log('debug', `MIDI Pitch Bend from ${source}: Ch${channel} Val${messageInfo.value}`)
				this.handleDLivePreampGain(message[1], message[2])
				break
				
			case 0xF0: // System Exclusive
				if (statusByte === 0xF0) {
					messageInfo.type = 'sysex'
					this.log('debug', `MIDI SysEx from ${source}: ${message.length} bytes`)
					this.handleDLiveSysEx(message, source)
				}
				break
		}
		
		// Update variables with parsed message info
		this.updateMidiVariables(messageInfo)
		
		// Check feedbacks that might be affected by this MIDI message
		this.checkFeedbacks()
	}

	handleDLiveMute(midiChannel, note, isMuted) {
		// Handle dLive mute messages based on MIDI channel and note
		// Channel offsets: Input=N, Group=N+1, Aux=N+2, Matrix=N+3, DCA/FX=N+4
		const channelOffset = midiChannel - 1 - this.baseMidiChannel
		let channelType, channelNumber, variableId
		
		switch (channelOffset) {
			case 0: // Input channels
				channelType = 'input'
				channelNumber = note + 1
				variableId = `mute_input_${channelNumber}`
				break
			case 1: // Groups
				if (note <= 0x3D) {
					channelType = 'mono_group'
					channelNumber = note + 1
					variableId = `mute_mono_group_${channelNumber}`
				} else if (note >= 0x40 && note <= 0x5E) {
					channelType = 'stereo_group'
					channelNumber = note - 0x40 + 1
					variableId = `mute_stereo_group_${channelNumber}`
				}
				break
			case 2: // Aux
				if (note <= 0x3D) {
					channelType = 'mono_aux'
					channelNumber = note + 1
					variableId = `mute_mono_aux_${channelNumber}`
				} else if (note >= 0x40 && note <= 0x5E) {
					channelType = 'stereo_aux'
					channelNumber = note - 0x40 + 1
					variableId = `mute_stereo_aux_${channelNumber}`
				}
				break
			case 3: // Matrix
				if (note <= 0x3D) {
					channelType = 'mono_matrix'
					channelNumber = note + 1
					variableId = `mute_mono_matrix_${channelNumber}`
				} else if (note >= 0x40 && note <= 0x5E) {
					channelType = 'stereo_matrix'
					channelNumber = note - 0x40 + 1
					variableId = `mute_stereo_matrix_${channelNumber}`
				}
				break
			case 4: // DCA, FX, Mains, Mute Groups
				if (note >= 0x36 && note <= 0x4D) {
					channelType = 'dca'
					channelNumber = note - 0x36 + 1
					variableId = `mute_dca_${channelNumber}`
				} else if (note >= 0x4E && note <= 0x55) {
					channelType = 'mute_group'
					channelNumber = note - 0x4E + 1
					variableId = `mute_group_${channelNumber}`
				} else if (note >= 0x30 && note <= 0x35) {
					channelType = 'main'
					channelNumber = note - 0x30 + 1
					variableId = `mute_main_${channelNumber}`
				}
				break
		}
		
		if (variableId) {
			// Create dynamic variable if it doesn't exist (for channels beyond the common range)
			if (channelType === 'input' && channelNumber > 32) {
				createDynamicVariable(this, variableId, `Input ${channelNumber} Mute Status`)
			} else if ((channelType === 'mono_group' || channelType === 'stereo_group' || 
					   channelType === 'mono_aux' || channelType === 'stereo_aux') && channelNumber > 8) {
				createDynamicVariable(this, variableId, `${channelType.replace('_', ' ')} ${channelNumber} Mute Status`)
			}
			
			this.setVariableValues({
				[variableId]: isMuted ? 'ON' : 'OFF'
			})
		}
	}

	handleDLiveMidiCC(midiChannel, controller, value) {
		// Handle NRPN and other CC messages from dLive
		// This includes fader levels, DCA assignments, etc.
		
		// Update generic CC variable
		this.setVariableValues({
			[`cc_ch${midiChannel}_cc${controller}`]: value.toString()
		})
		
		// Handle specific dLive CC messages
		switch (controller) {
			case 0x63: // NRPN MSB
				this.lastNRPN_MSB = value
				break
			case 0x62: // NRPN LSB  
				this.lastNRPN_LSB = value
				break
			case 0x06: // Data Entry MSB
				if (this.lastNRPN_MSB !== undefined && this.lastNRPN_LSB !== undefined) {
					this.handleDLiveNRPN(midiChannel, this.lastNRPN_MSB, this.lastNRPN_LSB, value)
				}
				break
			case 0x0C: // UFX Global Key
				this.setVariableValues({
					'ufx_global_key': this.getUFXKeyName(value)
				})
				break
			case 0x0D: // UFX Global Scale
				this.setVariableValues({
					'ufx_global_scale': value === 0 ? 'Major' : 'Minor'
				})
				break
		}
	}

	handleDLiveNRPN(midiChannel, msb, lsb, value) {
		// Handle dLive NRPN messages
		const nrpn = (msb << 7) | lsb
		
		switch (lsb) {
			case 0x17: // Fader Level
				const channelOffset = midiChannel - 1 - this.baseMidiChannel
				this.setVariableValues({
					[`fader_level_ch${msb}_offset${channelOffset}`]: value.toString()
				})
				break
			case 0x18: // Main Mix Assignment
				this.setVariableValues({
					[`main_assign_ch${msb}`]: value >= 0x40 ? 'ON' : 'OFF'
				})
				break
			case 0x40: // DCA/Mute Group Assignment
				this.handleDCAMuteAssignment(msb, value)
				break
		}
	}

	handleDCAMuteAssignment(channel, value) {
		if (value >= 0x40 && value <= 0x57) {
			// DCA Assignment ON
			const dcaNumber = value - 0x40 + 1
			this.setVariableValues({
				[`dca_assign_ch${channel}_dca${dcaNumber}`]: 'ON'
			})
		} else if (value >= 0x00 && value <= 0x17) {
			// DCA Assignment OFF
			const dcaNumber = value + 1
			this.setVariableValues({
				[`dca_assign_ch${channel}_dca${dcaNumber}`]: 'OFF'
			})
		} else if (value >= 0x58 && value <= 0x5F) {
			// Mute Group Assignment ON
			const muteGroupNumber = value - 0x58 + 1
			this.setVariableValues({
				[`mute_group_assign_ch${channel}_grp${muteGroupNumber}`]: 'ON'
			})
		} else if (value >= 0x18 && value <= 0x1F) {
			// Mute Group Assignment OFF
			const muteGroupNumber = value - 0x18 + 1
			this.setVariableValues({
				[`mute_group_assign_ch${channel}_grp${muteGroupNumber}`]: 'OFF'
			})
		}
	}

	handleDLiveSceneRecall(midiChannel, program) {
		// Handle scene recall messages
		// Scene number calculation depends on bank select (CC 0)
		this.setVariableValues({
			'last_scene_recalled': program.toString(),
			'current_scene': program.toString()
		})
	}

	handleDLivePreampGain(socket, gainValue) {
		// Handle preamp gain messages (Pitch Bend)
		this.setVariableValues({
			[`preamp_gain_socket${socket}`]: gainValue.toString()
		})
	}

	handleDLiveSysEx(message, source) {
		// Handle dLive SysEx messages
		if (message.length < 8) return
		
		// Check for dLive SysEx header: F0, 00, 00, 1A, 50, 10, 01, 00
		if (message[1] === 0x00 && message[2] === 0x00 && message[3] === 0x1A && 
			message[4] === 0x50 && message[5] === 0x10) {
			
			const command = message[8]
			
			switch (command) {
				case 0x02: // Channel Name Response
					if (message.length > 10) {
						const channel = message[9]
						const nameBytes = message.slice(10, -1) // Exclude F7
						const name = Buffer.from(nameBytes).toString('ascii')
						this.setVariableValues({
							[`channel_${channel}_name`]: name
						})
					}
					break
				case 0x05: // Channel Color Response
					if (message.length >= 12) {
						const channel = message[9]
						const color = message[10]
						this.setVariableValues({
							[`channel_${channel}_color`]: this.getColorName(color)
						})
					}
					break
				case 0x08: // Preamp Pad Response
					if (message.length >= 12) {
						const socket = message[9]
						const padState = message[10]
						this.setVariableValues({
							[`preamp_pad_socket${socket}`]: padState === 0x7F ? 'ON' : 'OFF'
						})
					}
					break
				case 0x0B: // Preamp 48V Response
					if (message.length >= 12) {
						const socket = message[9]
						const phantomState = message[10]
						this.setVariableValues({
							[`preamp_phantom_socket${socket}`]: phantomState === 0x7F ? 'ON' : 'OFF'
						})
					}
					break
			}
		}
	}

	getUFXKeyName(keyValue) {
		const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
		return keys[keyValue] || 'Unknown'
	}

	getColorName(colorValue) {
		const colors = ['Off', 'Red', 'Green', 'Yellow', 'Blue', 'Purple', 'Lt Blue', 'White']
		return colors[colorValue] || 'Unknown'
	}

	updateMidiVariables(messageInfo) {
		// Update variables based on received MIDI message
		this.setVariableValues({
			'last_midi_type': messageInfo.type,
			'last_midi_channel': messageInfo.channel.toString(),
			'last_midi_raw': messageInfo.raw,
			'last_midi_source': messageInfo.source || 'unknown'
		})
	}

	destroyConnections() {
		// Close all sockets
		Object.keys(this.sockets).forEach(socketName => {
			if (this.sockets[socketName]) {
				this.sockets[socketName].destroy()
				this.sockets[socketName] = null
			}
		})
		
		// Reset state
		this.runningStatus = { mixrack: null, surface: null }
		this.midiBuffer = { mixrack: Buffer.alloc(0), surface: Buffer.alloc(0) }
		this.updateConnectionStatus()
	}

	updateConnectionStatus() {
		const connectedSockets = Object.values(this.sockets).filter(socket => socket !== null).length
		let status = 'Disconnected'
		let statusText = 'No connections'
		
		if (connectedSockets > 0) {
			status = 'Connected'
			const socketNames = []
			if (this.sockets.mixrackMidi) socketNames.push('MixRack')
			if (this.sockets.surfaceMidi) socketNames.push('Surface')
			if (this.sockets.tcp) socketNames.push('TCP')
			statusText = `Connected: ${socketNames.join(', ')}`
			this.updateStatus(InstanceStatus.Ok, statusText)
		} else {
			this.updateStatus(InstanceStatus.Disconnected, statusText)
		}
		
		this.setVariableValues({
			'connection_status': status,
			'connected_sockets': connectedSockets.toString(),
			'mixrack_connected': this.sockets.mixrackMidi ? 'Yes' : 'No',
			'surface_connected': this.sockets.surfaceMidi ? 'Yes' : 'No'
		})
	}

	// Method to send MIDI commands to the appropriate target
	sendMidiCommand(buffer, target = 'mixrack') {
		let socket
		
		switch (target) {
			case 'mixrack':
				socket = this.sockets.mixrackMidi
				break
			case 'surface': 
				socket = this.sockets.surfaceMidi
				break
			case 'tcp':
				socket = this.sockets.tcp
				break
			default:
				socket = this.sockets.mixrackMidi // Default to mixrack
		}
		
		if (!socket) {
			this.log('warn', `Cannot send MIDI command: ${target} socket not connected`)
			return false
		}
		
		if (!Buffer.isBuffer(buffer)) {
			this.log('error', 'MIDI command must be a Buffer')
			return false
		}
		
		try {
			socket.write(buffer)
			this.log('debug', `Sent MIDI: ${buffer.toString('hex')} via ${target}`)
			this.midiMessagesSent++
			this.setVariableValues({
				'midi_messages_sent': this.midiMessagesSent.toString()
			})
			return true
		} catch (error) {
			this.log('error', `Failed to send MIDI command: ${error.message}`)
			return false
		}
	}

	// Helper methods for creating dLive MIDI commands (updated for correct channel calculation)
	createMuteCommand(channel, isMuted, channelType = 'input') {
		// Calculate correct MIDI channel and note based on dLive specification
		let midiChannel = this.baseMidiChannel
		let note = channel
		
		switch (channelType) {
			case 'input':
				midiChannel = this.baseMidiChannel
				note = channel
				break
			case 'group':
				midiChannel = this.baseMidiChannel + 1
				note = channel
				break
			case 'aux':
				midiChannel = this.baseMidiChannel + 2
				note = channel
				break
			case 'matrix':
				midiChannel = this.baseMidiChannel + 3
				note = channel
				break
			case 'dca':
				midiChannel = this.baseMidiChannel + 4
				note = 0x36 + channel
				break
		}
		
		const velocity = isMuted ? 0x7F : 0x3F
		return Buffer.from([0x90 + midiChannel, note, velocity, 0x90 + midiChannel, note, 0x00])
	}

	createFaderCommand(channel, level, channelType = 'input') {
		// Calculate correct MIDI channel based on dLive specification
		let midiChannel = this.baseMidiChannel
		
		switch (channelType) {
			case 'input':
				midiChannel = this.baseMidiChannel
				break
			case 'group':
				midiChannel = this.baseMidiChannel + 1
				break
			case 'aux':
				midiChannel = this.baseMidiChannel + 2
				break
			case 'matrix':
				midiChannel = this.baseMidiChannel + 3
				break
			case 'dca':
				midiChannel = this.baseMidiChannel + 4
				break
		}
		
		// NRPN message for fader level (parameter ID 0x17)
		return Buffer.from([
			0xB0 + midiChannel, 0x63, channel,
			0xB0 + midiChannel, 0x62, 0x17,
			0xB0 + midiChannel, 0x06, level
		])
	}

	createSceneRecallCommand(sceneNumber) {
		// Scene recall with bank select
		const bank = Math.floor((sceneNumber - 1) / 128)
		const scene = (sceneNumber - 1) % 128
		
		return Buffer.from([
			0xB0 + this.baseMidiChannel, 0x00, bank,
			0xC0 + this.baseMidiChannel, scene
		])
	}

	// DCA assignment commands using NRPN
	createDCAAssignCommand(channel, dcaNumber, assign) {
		const midiChannel = this.baseMidiChannel
		const value = assign ? (0x40 + dcaNumber - 1) : (dcaNumber - 1)
		
		return Buffer.from([
			0xB0 + midiChannel, 0x63, channel,
			0xB0 + midiChannel, 0x62, 0x40,
			0xB0 + midiChannel, 0x06, value
		])
	}

	// TCP command sender for dLive-specific functions
	sendTcpCommand(command) {
		if (!this.sockets.tcp) {
			this.log('warn', 'Cannot send TCP command: TCP socket not connected')
			return false
		}
		
		try {
			this.sockets.tcp.write(command + '\r\n')
			this.log('debug', `Sent TCP: ${command}`)
			return true
		} catch (error) {
			this.log('error', `Failed to send TCP command: ${error.message}`)
			return false
		}
	}
}

// Export the instance class as default
module.exports = dLiveInstance

// Run the module if this is the main entry point  
if (require.main === module) {
	runEntrypoint(dLiveInstance, [])
}