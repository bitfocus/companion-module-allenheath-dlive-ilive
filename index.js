/**
 *
 * Companion instance class for the A&H dLive & iLive Mixers.
 * @version 2.0.0
 *
 */

const { InstanceBase, Regex, runEntrypoint, TCPHelper } = require('@companion-module/base')
const actions = require('./actions')
const upgradeScripts = require('./upgrade')

/**
 * @extends InstanceBase
 * @since 2.0.0
 */

class ModuleInstance extends InstanceBase {
	/**
	 * Create an instance.
	 *
	 * @param {unknown} internal - the internal instance object
	 * @since 2.0.0
	 */
	constructor(internal) {
		super(internal)

		Object.assign(this, {
			...actions,
		})
	}

	/**
	 * Setup the actions.
	 *
	 * @access public
	 * @since 2.0.0
	 */
	updateActions() {
		this.setActionDefinitions(this.getActionDefinitions())
	}

	setRouting(ch, selArray, isMute) {
		let routingCmds = []
		let start = isMute ? this.dcaCount : 0
		let qty = isMute ? 8 : this.dcaCount
		let chOfs = this.config.model == 'dLive' ? 0 : 0x20
		for (let i = start; i < start + qty; i++) {
			let grpCode = i + (selArray.includes(`${i - start}`) ? 0x40 : 0)
			routingCmds.push(Buffer.from([0xb0, 0x63, ch + chOfs, 0xb0, 0x62, 0x40, 0xb0, 0x06, grpCode]))
		}

		return routingCmds
	}

	/**
	 * Executes the provided action.
	 *
	 * @param {string} actionId - the action ID to be executed
	 * @param {Object} options - the action options
	 * @access public
	 * @since 2.0.0
	 */
	sendAction(actionId, options) {
		let opt = options
		let channel = parseInt(opt.inputChannel)
		let chOfs = 0
		let strip = parseInt(opt.strip)
		let cmd = { port: this.config.midiPort, buffers: [] }

		switch (
			actionId // Note that only available actions for the type (TCP or MIDI) will be processed
		) {
			case 'mute_input':
			case 'mute_mix':
				chOfs = 0
				break

			case 'mute_mono_group':
			case 'mute_stereo_group':
				chOfs = this.config.model == 'dLive' ? 1 : 0
				break

			case 'mute_mono_aux':
			case 'mute_stereo_aux':
				chOfs = this.config.model == 'dLive' ? 2 : 0
				break

			case 'mute_mono_matrix':
			case 'mute_stereo_matrix':
				chOfs = this.config.model == 'dLive' ? 3 : 0
				break

			case 'mute_mono_fx_send':
			case 'mute_stereo_fx_send':
			case 'mute_fx_return':
			case 'mute_dca':
			case 'mute_master':
			case 'mute_ufx_send':
			case 'mute_ufx_return':
				chOfs = this.config.model == 'dLive' ? 4 : 0
				break

			case 'fader_input':
			case 'fader_mix':
				chOfs = 0
				break

			case 'fader_mono_group':
			case 'fader_stereo_group':
				chOfs = 1
				break

			case 'fader_mono_aux':
			case 'fader_stereo_aux':
				chOfs = 2
				break

			case 'fader_mono_matrix':
			case 'fader_stereo_matrix':
				chOfs = 3
				break

			case 'fader_DCA':
			case 'fader_mono_fx_send':
			case 'fader_stereo_fx_send':
			case 'fader_fx_return':
			case 'fader_ufx_send':
			case 'fader_ufx_return':
				chOfs = this.config.model == 'dLive' ? 4 : 0
				break

			case 'phantom':
				cmd.buffers = [
					Buffer.from([0xf0, 0, 0, 0x1a, 0x50, 0x10, 0x01, 0, 0, 0x0c, strip, opt.phantom ? 0x7f : 0, 0xf7]),
				]
				break

			case 'dca_assign':
				cmd.buffers = this.setRouting(channel, opt.dcaGroup, false)
				break

			case 'mute_assign':
				cmd.buffers = this.setRouting(channel, opt.muteGroup, true)
				break

			case 'scene_recall':
				let sceneNumber = parseInt(opt.sceneNumber)
				cmd.buffers = [Buffer.from([0xb0, 0, (sceneNumber >> 7) & 0x0f, 0xc0, sceneNumber & 0x7f])]
				break

			case 'scene_next':
				cmd.buffers = [Buffer.from([0xb0, 0x77, 0x7f])] // Control Change for Scene Next
				break

			case 'scene_previous':
				cmd.buffers = [Buffer.from([0xb0, 0x76, 0x7f])] // Control Change for Scene Previous
				break

			case 'solo_input':
				cmd.buffers = [Buffer.from([0xb0, 0x73, strip, 0xb0, 0x26, opt.solo ? 0x7f : 0x00])]
				break

			case 'eq_enable_input':
				// NRPN message for EQ Enable/Disable
				cmd.buffers = [Buffer.from([0xb0, 0x63, strip, 0xb0, 0x62, 0x01, 0xb0, 0x06, opt.enable ? 0x7f : 0x00])]
				break

			case 'preamp_gain':
				// Pitchbend message for preamp gain (14-bit value)
				let gainValue = parseInt(opt.gain)
				let lsb = gainValue & 0x7f
				let msb = (gainValue >> 7) & 0x7f
				cmd.buffers = [Buffer.from([0xe0, lsb, msb])]
				break

			case 'preamp_pad':
				cmd.buffers = [
					Buffer.from([0xf0, 0, 0, 0x1a, 0x50, 0x10, 0x01, 0, 0, 0x0d, strip, opt.pad ? 0x7f : 0, 0xf7]),
				]
				break

			case 'hpf_control':
				// NRPN message for HPF control
				cmd.buffers = [Buffer.from([0xb0, 0x63, strip, 0xb0, 0x62, 0x02, 0xb0, 0x06, parseInt(opt.frequency)])]
				break

			case 'input_to_main':
				// NRPN message for Input to Main assignment
				cmd.buffers = [Buffer.from([0xb0, 0x63, strip, 0xb0, 0x62, 0x03, 0xb0, 0x06, opt.assign ? 0x7f : 0x00])]
				break

			case 'send_aux_mono':
			case 'send_aux_stereo':
			case 'send_fx_mono':
			case 'send_fx_stereo':
			case 'send_matrix_mono':
			case 'send_matrix_stereo':
			case 'send_mix':
			case 'send_fx':
			case 'send_ufx':
				// SysEx messages for send levels
				let inputCh = parseInt(opt.inputChannel)
				let sendCh = parseInt(opt.send)
				let sendLevel = parseInt(opt.level)
				let sendType = 0x01 // Default for aux sends
				
				if (actionId.includes('fx') && !actionId.includes('ufx')) {
					sendType = 0x02 // FX sends
				} else if (actionId.includes('matrix')) {
					sendType = 0x03 // Matrix sends
				} else if (actionId.includes('ufx')) {
					sendType = 0x04 // UFX sends
				}
				
				cmd.buffers = [
					Buffer.from([0xf0, 0, 0, 0x1a, 0x50, 0x10, 0x01, 0, 0, sendType, inputCh, sendCh, sendLevel, 0xf7]),
				]
				break

			case 'ufx_global_key':
				// Control Change message for UFX Global Key (BN, 0C, Key)
				cmd.buffers = [Buffer.from([0xb0 + (this.config.midiChannel || 0), 0x0c, parseInt(opt.key)])]
				break

			case 'ufx_global_scale':
				// Control Change message for UFX Global Scale (BN, 0D, Scale)
				cmd.buffers = [Buffer.from([0xb0 + (this.config.midiChannel || 0), 0x0d, parseInt(opt.scale)])]
				break

			case 'ufx_unit_parameter':
				// Control Change message for UFX Unit Parameter (BM, nn, vv)
				let midiCh = parseInt(opt.midiChannel) - 1 // Convert to 0-based
				cmd.buffers = [Buffer.from([0xb0 + midiCh, parseInt(opt.controlNumber), parseInt(opt.value)])]
				break

			case 'ufx_unit_key':
				// Control Change message for UFX Unit Key Parameter with CC value scaling
				let keyMidiCh = parseInt(opt.midiChannel) - 1 // Convert to 0-based
				let controlNum = parseInt(opt.controlNumber)
				
				// Map key to CC value range (refer to protocol table)
				let keyMapping = {
					'C': 5,    // Mid-range value for C (0-10 range)
					'C#': 16,  // Mid-range value for C# (11-21 range)
					'D': 26,   // Mid-range value for D (22-31 range)
					'D#': 37,  // Mid-range value for D# (32-42 range)
					'E': 47,   // Mid-range value for E (43-52 range)
					'F': 58,   // Mid-range value for F (53-63 range)
					'F#': 69,  // Mid-range value for F# (64-74 range)
					'G': 79,   // Mid-range value for G (75-84 range)
					'G#': 90,  // Mid-range value for G# (85-95 range)
					'A': 100,  // Mid-range value for A (96-105 range)
					'A#': 111, // Mid-range value for A# (106-116 range)
					'B': 122   // Mid-range value for B (117-127 range)
				}
				
				let keyValue = keyMapping[opt.key] || 5
				cmd.buffers = [Buffer.from([0xb0 + keyMidiCh, controlNum, keyValue])]
				break

			case 'ufx_unit_scale':
				// Control Change message for UFX Unit Scale Parameter with CC value scaling
				let scaleMidiCh = parseInt(opt.midiChannel) - 1 // Convert to 0-based
				let scaleControlNum = parseInt(opt.controlNumber)
				
				// Map scale to CC value range (refer to protocol table)
				let scaleMapping = {
					'Major': 21,      // Mid-range value for Major (0-42 range)
					'Minor': 63,      // Mid-range value for Minor (43-84 range)
					'Chromatic': 106  // Mid-range value for Chromatic (85-127 range)
				}
				
				let scaleValue = scaleMapping[opt.scale] || 21
				cmd.buffers = [Buffer.from([0xb0 + scaleMidiCh, scaleControlNum, scaleValue])]
				break

			case 'talkback_on':
				cmd = {
					port: this.config.tcpPort,
					buffers: [Buffer.from([0xf0, 0, 2, 0, 0x4b, 0, 0x4a, 0x10, 0xe7, 0, 1, opt.on ? 1 : 0, 0xf7])],
				}
				break

			case 'vsc':
				cmd = {
					port: this.config.tcpPort,
					buffers: [Buffer.from([0xf0, 0, 2, 0, 0x4b, 0, 0x4a, 0x10, 0x8a, 0, 1, opt.vscMode, 0xf7])],
				}
		}

		if (cmd.buffers.length == 0) {
			// Mute or Fader Level actions
			if (actionId.slice(0, 4) == 'mute') {
				cmd.buffers = [Buffer.from([0x90 + chOfs, strip, opt.mute ? 0x7f : 0x3f, 0x90 + chOfs, strip, 0])]
			} else {
				let faderLevel = parseInt(opt.level)
				cmd.buffers = [Buffer.from([0xb0 + chOfs, 0x63, strip, 0x62, 0x17, 0x06, faderLevel])]
			}
		}

		// console.log(cmd);

		for (let i = 0; i < cmd.buffers.length; i++) {
			if (cmd.port === this.config.midiPort && this.midiSocket !== undefined) {
				this.log('debug', `sending ${cmd.buffers[i].toString('hex')} via MIDI @${this.config.host}:${this.config.midiPort}`)
				this.midiSocket.send(cmd.buffers[i]).catch((e) => {
					this.log('error', `MIDI send error: ${e.message}`)
				})
			} else if (this.tcpSocket !== undefined) {
				this.log('debug', `sending ${cmd.buffers[i].toString('hex')} via TCP @${this.config.host}:${this.config.tcpPort}`)
				this.tcpSocket.send(cmd.buffers[i]).catch((e) => {
					this.log('error', `TCP send error: ${e.message}`)
				})
			}
		}
	}

	/**
	 * Creates the configuration fields for web config.
	 *
	 * @returns {Array} the config fields
	 * @access public
	 * @since 2.0.0
	 */
	getConfigFields() {
		return [
			{
				type: 'static-text',
				id: 'info',
				width: 12,
				label: 'Information',
				value: 'This module is for the Allen & Heath dLive and iLive mixers',
			},
			{
				type: 'textinput',
				id: 'host',
				label: 'Target IP',
				width: 6,
				default: '192.168.1.70',
				regex: Regex.IP,
			},
			{
				type: 'dropdown',
				id: 'model',
				label: 'Console Type',
				width: 6,
				default: 'dLive',
				choices: [
					{ id: 'dLive', label: 'dLive' },
					{ id: 'iLive', label: 'iLive' },
				],
			},
			{
				type: 'number',
				id: 'midiPort',
				label: 'MIDI Port',
				width: 6,
				default: 51328,
				min: 1,
				max: 65535,
			},
			{
				type: 'number',
				id: 'tcpPort',
				label: 'TCP Port (dLive only)',
				width: 6,
				default: 51321,
				min: 1,
				max: 65535,
			},
			{
				type: 'number',
				id: 'midiChannel',
				label: 'MIDI Channel for dLive System (N)',
				width: 6,
				default: 0,
				min: 0,
				max: 15,
			},
		]
	}

	/**
	 * Clean up the instance before it is destroyed.
	 *
	 * @access public
	 * @since 2.0.0
	 */
	async destroy() {
		if (this.tcpSocket !== undefined) {
			this.tcpSocket.destroy()
		}

		if (this.midiSocket !== undefined) {
			this.midiSocket.destroy()
		}

		this.log('debug', `destroyed ${this.id}`)
	}

	/**
	 * Main initialization function called once the module
	 * is OK to start doing things.
	 *
	 * @access public
	 * @since 1.2.0
	 */
	async init() {
		// Initialize with current config or empty object if not set yet
		await this.configUpdated(this.config || {})
	}

	/**
	 * INTERNAL: use setup data to initalize the tcp socket object.
	 *
	 * @access protected
	 * @since 2.0.0
	 */
	init_tcp() {
		if (this.tcpSocket !== undefined) {
			this.tcpSocket.destroy()
			delete this.tcpSocket
		}

		if (this.midiSocket !== undefined) {
			this.midiSocket.destroy()
			delete this.midiSocket
		}

		if (this.config.host) {
			this.midiSocket = new TCPHelper(this.config.host, this.config.midiPort)

			this.midiSocket.on('status_change', (status, message) => {
				this.updateStatus(status, message)
			})

			this.midiSocket.on('error', (err) => {
				this.log('error', 'MIDI error: ' + err.message)
			})

			this.midiSocket.on('connect', () => {
				this.log('debug', `MIDI Connected to ${this.config.host}`)
			})

			if (this.config.model == 'dLive') {
				this.tcpSocket = new TCPHelper(this.config.host, this.config.tcpPort)

				this.tcpSocket.on('status_change', (status, message) => {
					this.updateStatus(status, message)
				})

				this.tcpSocket.on('error', (err) => {
					this.log('error', 'TCP error: ' + err.message)
				})

				this.tcpSocket.on('connect', () => {
					this.log('debug', `TCP Connected to ${this.config.host}`)
				})
			}
		}
	}

	/**
	 * Process an updated configuration array.
	 *
	 * @param {Object} config - the new configuration
	 * @access public
	 * @since 2.0.0
	 */
	async configUpdated(config) {
		// Provide default config if none exists
		this.config = config || {
			host: '192.168.1.70',
			model: 'dLive',
			midiPort: 51328,
			tcpPort: 51321,
			midiChannel: 0
		}

		// Ensure port defaults are set even if config exists
		if (!this.config.midiPort) this.config.midiPort = 51328
		if (!this.config.tcpPort) this.config.tcpPort = 51321
		if (this.config.midiChannel === undefined) this.config.midiChannel = 0

		this.updateActions()
		this.init_tcp()
	}
}

runEntrypoint(ModuleInstance, upgradeScripts)
