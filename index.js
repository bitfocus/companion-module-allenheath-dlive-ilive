/**
 *
 * Companion instance class for the A&H dLive & iLive Mixers.
 * @version 2.0.0
 *
 */

let tcp = require('../../tcp')
let instance_skel = require('../../instance_skel')
let actions = require('./actions')
let upgradeScripts = require('./upgrade')
const MIDI = 51328 //The new version of firmware change the port of midi connections.
const TCP = 51321
const { InstanceBase, Regex, runEntrypoint, TCPHelper } = require('@companion-module/base')
const actions = require('./actions')
const upgradeScripts = require('./upgrade')
const MidiParser = require('./midi')
const { FadingWorker } = require('./fades')

const sysExHeader = [0xF0, 0, 0, 0x1a, 0x50, 0x10, 1, 0];

let mixes = {
	group: {n: 1, stereoOffset: 0x40},
	aux: {n: 2, stereoOffset: 0x40},
	fx: {n: 4, stereoOffset: 0x10},
	matrix: {n: 3, stereoOffset: 0x40}
}

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

		this.fadingWorker = new FadingWorker(this)
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


	sendActionWithFade(actionId, opt) {
		let path;
		let inputCh = parseInt(opt.strip)
		switch(actionId) {
			case 'fader_input':
			case 'fader_mix':
				path = `0/${inputCh}/faderLevel`
				break

			case 'fader_mono_group':
			case 'fader_stereo_group':
				path = `1/${inputCh}/faderLevel`
				break

			case 'fader_mono_aux':
			case 'fader_stereo_aux':
				path = `2/${inputCh}/faderLevel`
				break

			case 'fader_mono_matrix':
			case 'fader_stereo_matrix':
				path = `3/${inputCh}/faderLevel`
				break

			case 'fader_DCA':
			case 'fader_mono_fx_send':
			case 'fader_stereo_fx_send':
			case 'fader_fx_return':
			case 'fader_ufx_send':
			case 'fader_ufx_return':
				let n = this.config.model == 'dLive' ? 4 : 0
				path = `${n}/${inputCh}/faderLevel`
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
				inputCh = parseInt(opt.inputChannel)
				let sendCh = parseInt(opt.send)
				
				let sendN = 0x02 // Default for aux sends
				
				if (actionId.includes('matrix')) {
					sendN = 0x03 // Matrix sends
				} else if (actionId.includes('fx')) {
					sendN = 0x04 // FX and UFX sends
				}
				path = `0/${inputCh}/sendLevels/${sendN}/${sendCh}`
				break;
		}
		let target = parseInt(opt.level)

		let current = this.state.get(path) || 0
		this.state.set(path, target)
		this.fadingWorker.run(
				path,
				current,
				target,
				parseInt(opt.fadeDuration),
				opt.fadeAlgorithm,
				opt.fadeType,
				true,
		)
	}

	sendValueByPath(path, value) {
		const parts = path.split("/")
		const [n, channel, type] = parts
		let cmd = { port: this.config.midiPort, buffers: [] }
		switch (type) {
			case "sendLevels":
				const sendN = parts[3]
				const sendChannel = parts[4]
				cmd.buffers.push(Buffer.from([...sysExHeader, parseInt(n), 0x0D, parseInt(channel), sendN, sendChannel, value, 0xf7]))
				break;
			case "faderLevel":
				cmd.buffers.push(
					Buffer.from([0xb0 + parseInt(n), 0x63, parseInt(channel), 0x62, 0x17, 0x06, value])
				)
				break;
			
		}

		for (let i = 0; i < cmd.buffers.length; i++) {
			if (cmd.port === this.config.midiPort && this.midiSocket !== undefined) {
				this.log('debug', `sending ${type} ${cmd.buffers[i].toString('hex')} via MIDI @${this.config.host}:${this.config.midiPort}`)
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
    this.log("info", "action: " + actionId)
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
				// TODO: probably for iLive this needs another command? 

				// SysEx messages for send levels
				let inputCh = parseInt(opt.inputChannel)
				let sendCh = parseInt(opt.send)
				let sendLevel = parseInt(opt.level)
				let sendType = 0x02 // Default for aux sends
				
				if (actionId.includes('matrix')) {
					sendType = 0x03 // Matrix sends
				} else if (actionId.includes('fx')) {
					sendType = 0x04 // FX and UFX sends
				}
				
				cmd.buffers = [
					Buffer.from([...sysExHeader, 0, 0x0D, inputCh, sendType, sendCh, sendLevel, 0xf7]),
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
				width: 12,
				default: 0,
				min: 0,
				max: 15,
			},
			{
				type: 'number',
				id: 'monoGroup',
				label: 'Number of Mono Groups',
				width: 6,
				default: 0,
				min: 0,
				max: 64,
			},
			{
				type: 'number',
				id: 'stereoGroup',
				label: 'Number of Stereo Groups',
				width: 6,
				default: 0,
				min: 0,
				max: 64,
			},
			{
				type: 'number',
				id: 'monoFx',
				label: 'Number of Mono FX',
				width: 6,
				default: 0,
				min: 0,
				max: 64,
			},
			{
				type: 'number',
				id: 'stereoFx',
				label: 'Number of Stereo FX',
				width: 6,
				default: 0,
				min: 0,
				max: 64,
			},
			{
				type: 'number',
				id: 'monoAux',
				label: 'Number of Mono AUX',
				width: 6,
				default: 0,
				min: 0,
				max: 64,
			},
			{
				type: 'number',
				id: 'stereoAux',
				label: 'Number of Stereo AUX',
				width: 6,
				default: 0,
				min: 0,
				max: 64,
			},
			{
				type: 'number',
				id: 'monoMatrix',
				label: 'Number of Mono Matrices',
				width: 6,
				default: 0,
				min: 0,
				max: 64,
			},
			{
				type: 'number',
				id: 'stereoMatrix',
				label: 'Number of Stereo Matrices',
				width: 6,
				default: 0,
				min: 0,
				max: 64,
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
	async init(config) {
		this.config = config;
		// Initialize with current config or empty object if not set yet
		await this.configUpdated(this.config || {})
	}

	parseMidiMessage(message) {
		if (message.type === 0xF0) {
			let command = message.raw[9];
			let n = message.raw[8];
			let channel = message.raw[10];
			
			// Send levels
			if (command === 0x0D) {
				let sendN = message.raw[11];
				let sendChannel = message.raw[12];
				let level = message.raw[13];

				this.log("debug", `Received send level ${n} ${channel} ${sendN} ${sendChannel} ${level}`)
				this.state.set(`${n}/${channel}/sendLevels/${sendN}/${sendChannel}`, level)
			}
		} else if (message.type === 0xB0) {
			// NPRN message: typically three messages in a row to change a channel parameter
			// 1. Select the channel
			// 2. Select the paramter
			// 3. Set the parameter value
			// 
			if (message.controller === 0x63) {
				this.currentMidiChannel = {
					n: message.channel,
					channel: message.value
				}
			} else if (message.controller === 0x62) {
				this.currentMidiParameter = message.value
			} else if (message.controller === 0x06) {
				if (this.currentMidiChannel && this.currentMidiParameter) {
					if (this.currentMidiParameter === 0x17) {
						this.log("debug", `Received fader level ${this.currentMidiChannel.n}/${this.currentMidiChannel.channel}/faderLevel`)
						this.state.set(`${this.currentMidiChannel.n}/${this.currentMidiChannel.channel}/faderLevel`, message.value)
					}
				}
			}
		}
	}

	/**
	 * INTERNAL: use setup data to initalize the tcp socket object.
	 *
	 * @access protected
	 * @since 2.0.0
	 */
	init_tcp() {
		this.state = new Map();
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
				this.requestMidiValues()
			})
			this.midiParser = new MidiParser();
			this.midiSocket.on('data', (e) => {
				this.midiParser.processData(e)
			})
			this.midiParser.addListener("message", (message) => {
				this.parseMidiMessage(message)
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

	async requestMidiValues() {
		if (this.config.model === "dLive") {
			// Request fader and send level of all input channels
			for (let i = 0; i < 128; i++) {
				this.midiSocket.send(Buffer.from([...sysExHeader, 0, 5, 0x0b, 0x17, i, 0xF7]))
				for (const mix of Object.keys(mixes)) {
					let mixConfig = mixes[mix]
					 for (const layout of ['mono', 'stereo']) {
					 	let numberOfMixes = this.config[layout + mix[0].toUpperCase() + mix.slice(1)] || 0
					 	let offset = layout === 'stereo' ? mixConfig.stereoOffset : 0

					 	for (let sendChannel = 1; sendChannel <= numberOfMixes; sendChannel++) {
					 		this.midiSocket.send(Buffer.from([...sysExHeader, 0, 5, 0x0F, 0x0D, i, mixConfig.n, offset + sendChannel - 1, 0xF7]))
					 	}
					 }
				}
				await new Promise((resolve) => setTimeout(resolve, 100))
			}

			for (const mix of Object.keys(mixes)) {
				let mixConfig = mixes[mix]
					for (const layout of ['mono', 'stereo']) {
					let numberOfMixes = this.config[layout + mix[0].toUpperCase() + mix.slice(1)] || 0
					let offset = layout === 'stereo' ? mixConfig.stereoOffset : 0

					for (let sendChannel = 1; sendChannel <= numberOfMixes; sendChannel++) {
						this.midiSocket.send(Buffer.from([...sysExHeader, mixConfig.n, 5, 0x0b, 0x17, offset + sendChannel - 1, 0xF7]))
					}
				}
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
