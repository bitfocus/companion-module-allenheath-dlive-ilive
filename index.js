/**
 *
 * Companion instance class for the A&H dLive & iLive Mixers.
 * @version 2.0.0
 *
 */

const { InstanceBase, Regex, runEntrypoint, TCPHelper, combineRgb } = require('@companion-module/base')
const { graphics } = require('companion-module-utils')
const actions = require('./actions')
const upgradeScripts = require('./upgrade')
const MidiParser = require('./midi')
const { FadingWorker } = require('./fades')
const { AhnetMeterClient } = require('./ahnet-meters')

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
		this.state = new Map()
		this.ahnetMeterValues = new Map()
		this.ahnetInputNames = new Map()
		this.ahnetInputColors = new Map()
		this.ahnetMixConfig = {}
		this.activeAhnetFeedbacks = new Map()
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

	getFaderSpecs() {
		if (this.config.model == 'dLive') {
			return [
				{ actionId: 'fader_input', name: 'Input', shortName: 'CH', qty: 128, offset: -1, n: 0 },
				{ actionId: 'fader_mono_group', name: 'Mono Group', shortName: 'MGrp', qty: 62, offset: -1, n: 1 },
				{ actionId: 'fader_stereo_group', name: 'Stereo Group', shortName: 'SGrp', qty: 31, offset: 0x3f, n: 1 },
				{ actionId: 'fader_mono_aux', name: 'Mono Aux', shortName: 'MAux', qty: 62, offset: -1, n: 2 },
				{ actionId: 'fader_stereo_aux', name: 'Stereo Aux', shortName: 'SAux', qty: 31, offset: 0x3f, n: 2 },
				{ actionId: 'fader_mono_matrix', name: 'Mono Matrix', shortName: 'MMtx', qty: 62, offset: -1, n: 3 },
				{ actionId: 'fader_stereo_matrix', name: 'Stereo Matrix', shortName: 'SMtx', qty: 31, offset: 0x3f, n: 3 },
				{ actionId: 'fader_mono_fx_send', name: 'Mono FX Send', shortName: 'MFX', qty: 16, offset: -1, n: 4 },
				{ actionId: 'fader_stereo_fx_send', name: 'Stereo FX Send', shortName: 'SFX', qty: 16, offset: 0x0f, n: 4 },
				{ actionId: 'fader_fx_return', name: 'FX Return', shortName: 'FXR', qty: 16, offset: 0x1f, n: 4 },
				{ actionId: 'fader_DCA', name: 'DCA', shortName: 'DCA', qty: 24, offset: 0x35, n: 4 },
				{ actionId: 'fader_ufx_send', name: 'UFX Stereo Send', shortName: 'UFXS', qty: 8, offset: 0x55, n: 4 },
				{ actionId: 'fader_ufx_return', name: 'UFX Stereo Return', shortName: 'UFXR', qty: 8, offset: 0x5d, n: 4 },
			]
		}

		return [
			{ actionId: 'fader_input', name: 'Input', shortName: 'CH', qty: 64, offset: 0x1f, n: 0 },
			{ actionId: 'fader_mix', name: 'Mix', shortName: 'Mix', qty: 32, offset: 0x5f, n: 0 },
			{ actionId: 'fader_mono_fx_send', name: 'FX Send', shortName: 'FXS', qty: 8, offset: -1, n: 0 },
			{ actionId: 'fader_fx_return', name: 'FX Return', shortName: 'FXR', qty: 8, offset: 0x07, n: 0 },
			{ actionId: 'fader_DCA', name: 'DCA', shortName: 'DCA', qty: 16, offset: 0x0f, n: 0 },
		]
	}

	getFaderSpec(actionId) {
		return this.getFaderSpecs().find((spec) => spec.actionId == actionId)
	}

	getFaderPath(actionId, strip) {
		let spec = this.getFaderSpec(actionId)
		if (!spec) return undefined

		return `${spec.n}/${parseInt(strip)}/faderLevel`
	}

	getFaderVariableId(path) {
		return `fader_${path.replace(/\//g, '_')}`
	}

	formatFaderValue(value) {
		let level = parseInt(value)
		if (isNaN(level) || level <= 0) return '-Inf'
		let dbVal = ((level - 107) / 2).toFixed(1)
		const dbText = dbVal == 0 ? '0.0' : dbVal > 0 ? `+${dbVal}` : dbVal
		return `${dbText} dB`
	}

	getFaderLevelPercent(value) {
		if (String(value).toUpperCase() == '-INF') return 0
		if (/^\d+$/.test(String(value))) {
			let level = parseInt(value)
			return (Math.min(Math.max(level, 0), 127) / 127) * 100
		}

		let db = parseFloat(String(value).replace('+', ''))
		if (isNaN(db)) return 0
		return (Math.min(Math.max(db * 2 + 107, 0), 127) / 127) * 100
	}

	getMutePath(chOfs, strip) {
		return `${parseInt(chOfs)}/${parseInt(strip)}/mute`
	}

	setMuteState(chOfs, strip, muted) {
		if (this.state == undefined) this.state = new Map()
		this.state.set(this.getMutePath(chOfs, strip), !!muted)
		this.checkFeedbacks('mute_state')
	}

	setStateValue(path, value) {
		if (this.state == undefined) this.state = new Map()
		this.state.set(path, value)
		if (path.endsWith('/faderLevel')) {
			const variableId = this.getFaderVariableId(path)
			this.setVariableValues({ [variableId]: this.formatFaderValue(value) })
			this.checkFeedbacks('fader_position')
		}
	}

	updateVariables() {
		let variables = []
		for (const spec of this.getFaderSpecs()) {
			for (let i = 1; i <= spec.qty; i++) {
				let strip = i + spec.offset
				let path = `${spec.n}/${strip}/faderLevel`
				variables.push({
					variableId: this.getFaderVariableId(path),
					name: `${spec.name} ${i} fader level`,
				})
			}
		}
		for (const variable of this.getAhnetMeterVariables()) {
			variables.push(variable)
		}
		for (const variable of this.getAhnetMixConfigVariables()) {
			variables.push(variable)
		}
		this.setVariableDefinitions(variables)
		this.updateAhnetInputNameVariableValues()
		this.updateAhnetMixConfigVariableValues()
	}

	getAhnetMixConfigVariables() {
		if (this.config?.model != 'iLive' || !this.config?.enableAhnetMeters) return []

		return [
			{ variableId: 'ilive_mix_config', name: 'iLive detected mix configuration' },
			{ variableId: 'ilive_mix_config_group', name: 'iLive detected group configuration' },
			{ variableId: 'ilive_mix_config_fx', name: 'iLive detected FX send configuration' },
			{ variableId: 'ilive_mix_config_aux', name: 'iLive detected aux configuration' },
			{ variableId: 'ilive_mix_config_matrix', name: 'iLive detected matrix configuration' },
			{ variableId: 'ilive_mix_config_main', name: 'iLive detected main configuration' },
			{ variableId: 'ilive_mono_group_count', name: 'iLive detected mono group count' },
			{ variableId: 'ilive_stereo_group_count', name: 'iLive detected stereo group count' },
			{ variableId: 'ilive_mono_fx_count', name: 'iLive detected mono FX send count' },
			{ variableId: 'ilive_stereo_fx_count', name: 'iLive detected stereo FX send count' },
			{ variableId: 'ilive_mono_aux_count', name: 'iLive detected mono aux count' },
			{ variableId: 'ilive_stereo_aux_count', name: 'iLive detected stereo aux count' },
			{ variableId: 'ilive_mono_matrix_count', name: 'iLive detected mono matrix count' },
			{ variableId: 'ilive_stereo_matrix_count', name: 'iLive detected stereo matrix count' },
			{ variableId: 'ilive_main_count', name: 'iLive detected main channel count' },
		]
	}

	getAhnetMeterVariables() {
		if (this.config?.model != 'iLive' || !this.config?.enableAhnetMeters) return []

		const variables = []
		const inputMeters = [
			{ id: 'preamp', name: 'Post PreAmp/Trim level' },
			{ id: 'post_peq', name: 'Post Gate/PEQ level' },
			{ id: 'post_comp', name: 'Post Compressor level' },
			{ id: 'limiter_deess', name: 'Post Limiter/De-Ess level' },
			{ id: 'post_delay', name: 'Post Delay level' },
			{ id: 'gate_gr', name: 'Gate gain reduction' },
			{ id: 'comp_gr', name: 'Compressor gain reduction' },
			{ id: 'limiter_gr', name: 'Limiter gain reduction' },
		]

		for (let channel = 1; channel <= 64; channel++) {
			variables.push({
				variableId: `ilive_input_${channel}_name`,
				name: `iLive Input ${channel} name`,
			})
			for (const meter of inputMeters) {
				variables.push({
					variableId: `ilive_input_${channel}_${meter.id}`,
					name: `iLive Input ${channel} ${meter.name}`,
				})
				variables.push({
					variableId: `ilive_input_${channel}_${meter.id}_raw`,
					name: `iLive Input ${channel} ${meter.name} raw`,
				})
			}
		}

		for (let aux = 1; aux <= 6; aux++) {
			variables.push({
				variableId: `ilive_aux_${aux}_meter`,
				name: `iLive Aux ${aux} output meter`,
			})
			variables.push({
				variableId: `ilive_aux_${aux}_meter_raw`,
				name: `iLive Aux ${aux} output meter raw`,
			})
		}

		for (const main of ['left', 'right']) {
			variables.push({
				variableId: `ilive_main_${main}_meter`,
				name: `iLive Main ${main[0].toUpperCase()}${main.slice(1)} output meter`,
			})
			variables.push({
				variableId: `ilive_main_${main}_meter_raw`,
				name: `iLive Main ${main[0].toUpperCase()}${main.slice(1)} output meter raw`,
			})
		}

		return variables
	}

	updateAhnetInputNameVariableValues() {
		if (this.config?.model != 'iLive' || !this.config?.enableAhnetMeters) return

		const values = {}
		for (let channel = 1; channel <= 64; channel++) {
			values[`ilive_input_${channel}_name`] = this.ahnetInputNames?.get(channel) || `CH ${channel}`
		}
		this.setVariableValues(values)
	}

	updateFeedbacks() {
		this.setFeedbackDefinitions({
			fader_position: {
				type: 'advanced',
				name: 'Fader Position',
				description: 'Show a horizontal fader position meter on the button',
				options: [
					{
						type: 'textinput',
						label: 'Level',
						id: 'level',
						default: '0',
						useVariables: true,
					},
					{
						type: 'dropdown',
						label: 'Position',
						id: 'position',
						default: 'bottom',
						choices: [
							{ id: 'top', label: 'top' },
							{ id: 'bottom', label: 'bottom' },
						],
					},
				],
				callback: async (feedback, context) => {
					const rawLevel = await context.parseVariablesInString(feedback.options.level)
					const barWidth = 7
					return {
						imageBuffer: graphics.bar({
							width: feedback.image.width,
							height: feedback.image.height,
							colors: [
								{
									size: 100,
									color: combineRgb(0, 96, 255),
									background: combineRgb(0, 96, 255),
									backgroundOpacity: 64,
								},
							],
							barLength: feedback.image.width - 10,
							barWidth,
							type: 'horizontal',
							value: this.getFaderLevelPercent(rawLevel),
							offsetX: 5,
							offsetY: feedback.options.position == 'top' ? 1 : feedback.image.height - barWidth - 1,
							opacity: 255,
						}),
					}
				},
			},
			ilive_meter: {
				type: 'advanced',
				name: 'iLive AHNet Meter',
				description: 'Show an iLive AHNet input or output meter on the button',
				subscribe: async (feedback) => this.subscribeAhnetFeedback(feedback),
				unsubscribe: async (feedback) => this.unsubscribeAhnetFeedback(feedback),
				options: [
					{
						type: 'dropdown',
						label: 'Meter',
						id: 'meter',
						default: 'input_preamp',
						choices: [
							{ id: 'input_preamp', label: 'Input Post PreAmp/Trim' },
							{ id: 'input_post_peq', label: 'Input Post Gate/PEQ' },
							{ id: 'input_post_comp', label: 'Input Post Compressor' },
							{ id: 'input_limiter_deess', label: 'Input Post Limiter/De-Ess' },
							{ id: 'input_post_delay', label: 'Input Post Delay' },
							{ id: 'input_gate_gr', label: 'Input Gate GR' },
							{ id: 'input_comp_gr', label: 'Input Compressor GR' },
							{ id: 'input_limiter_gr', label: 'Input Limiter GR' },
							{ id: 'aux', label: 'Aux Output' },
							{ id: 'main_left', label: 'Main Left Output' },
							{ id: 'main_right', label: 'Main Right Output' },
						],
					},
					{
						type: 'number',
						label: 'Input Channel',
						id: 'channel',
						default: 1,
						min: 1,
						max: 64,
					},
					{
						type: 'number',
						label: 'Aux',
						id: 'aux',
						default: 1,
						min: 1,
						max: 6,
					},
					{
						type: 'dropdown',
						label: 'Position',
						id: 'position',
						default: 'bottom',
						choices: [
							{ id: 'top', label: 'top' },
							{ id: 'bottom', label: 'bottom' },
						],
					},
				],
				callback: async (feedback) => {
					const value = this.getAhnetMeterPercent(feedback.options.meter, feedback.options)
					const barWidth = 7
					return {
						imageBuffer: graphics.bar({
							width: feedback.image.width,
							height: feedback.image.height,
							colors: [
								{
									size: 100,
									color: combineRgb(0, 180, 80),
									background: combineRgb(0, 180, 80),
									backgroundOpacity: 64,
								},
							],
							barLength: feedback.image.width - 10,
							barWidth,
							type: 'horizontal',
							value,
							offsetX: 5,
							offsetY: feedback.options.position == 'top' ? 1 : feedback.image.height - barWidth - 1,
							opacity: 255,
						}),
					}
				},
			},
			ilive_meter_vertical: {
					type: 'advanced',
					name: 'iLive AHNet Meter Vertical',
					description: 'Show a vertical iLive AHNet meter on the side of the button',
				subscribe: async (feedback) => this.subscribeAhnetFeedback(feedback),
				unsubscribe: async (feedback) => this.unsubscribeAhnetFeedback(feedback),
				options: [
					{
						type: 'dropdown',
						label: 'Meter',
						id: 'meter',
						default: 'input_preamp',
						choices: [
							{ id: 'input_preamp', label: 'Input Post PreAmp/Trim' },
							{ id: 'input_post_peq', label: 'Input Post Gate/PEQ' },
							{ id: 'input_post_comp', label: 'Input Post Compressor' },
							{ id: 'input_limiter_deess', label: 'Input Post Limiter/De-Ess' },
							{ id: 'input_post_delay', label: 'Input Post Delay' },
							{ id: 'input_gate_gr', label: 'Input Gate GR' },
							{ id: 'input_comp_gr', label: 'Input Compressor GR' },
							{ id: 'input_limiter_gr', label: 'Input Limiter GR' },
							{ id: 'aux', label: 'Aux Output' },
							{ id: 'main_left', label: 'Main Left Output' },
							{ id: 'main_right', label: 'Main Right Output' },
						],
					},
					{
						type: 'number',
						label: 'Input Channel',
						id: 'channel',
						default: 1,
						min: 1,
						max: 64,
					},
					{
						type: 'number',
						label: 'Aux',
						id: 'aux',
						default: 1,
						min: 1,
						max: 6,
					},
					{
						type: 'dropdown',
						label: 'Side',
						id: 'side',
						default: 'right',
						choices: [
							{ id: 'left', label: 'left' },
							{ id: 'right', label: 'right' },
						],
					},
					{
						type: 'number',
						label: 'Slot',
						id: 'slot',
						default: 0,
						min: 0,
						max: 5,
					},
				],
				callback: async (feedback) => {
					const value = this.getAhnetMeterPercent(feedback.options.meter, feedback.options)
					const definition = this.getAhnetMeterDefinition(feedback.options.meter, feedback.options)
					const dynamics = definition?.dynamics === true
					const side = feedback.options.side || 'right'
					const slot = Math.min(Math.max(parseInt(feedback.options.slot || 0), 0), 5)
					const barWidth = side == 'left' ? 4 : 6
					const offsetX = side == 'left' ? 1 + slot * (barWidth + 1) : feedback.image.width - barWidth - 1 - slot * (barWidth + 1)
					return {
						imageBuffer: graphics.bar({
							width: feedback.image.width,
							height: feedback.image.height,
							colors: dynamics
								? [{ size: 100, color: combineRgb(255, 0, 0), background: combineRgb(255, 0, 0), backgroundOpacity: 64 }]
								: [
										{ size: 72, color: combineRgb(0, 255, 0), background: combineRgb(0, 255, 0), backgroundOpacity: 64 },
										{ size: 25, color: combineRgb(255, 165, 0), background: combineRgb(255, 165, 0), backgroundOpacity: 64 },
										{ size: 3, color: combineRgb(255, 0, 0), background: combineRgb(255, 0, 0), backgroundOpacity: 64 },
									],
							barLength: feedback.image.height - 10,
							barWidth,
							type: 'vertical',
							value,
							offsetX,
							offsetY: 5,
							opacity: 255,
							reverse: dynamics,
						}),
					}
				},
			},
			ilive_channel_color_background: {
				type: 'advanced',
				name: 'iLive Channel Colour Background',
				description: 'Show a dark version of the iLive input channel colour behind the button',
				subscribe: async (feedback) => this.subscribeAhnetFeedback(feedback),
				unsubscribe: async (feedback) => this.unsubscribeAhnetFeedback(feedback),
				options: [
					{
						type: 'number',
						label: 'Input Channel',
						id: 'channel',
						default: 1,
						min: 1,
						max: 64,
					},
				],
				callback: async (feedback) => ({
					bgcolor: this.getAhnetDarkInputColor(feedback.options.channel),
					color: combineRgb(255, 255, 255),
				}),
			},
			mute_state: {
				type: 'boolean',
				name: 'Mute State',
				description: 'Change button background when the matching strip is muted',
				defaultStyle: {
					bgcolor: combineRgb(180, 0, 0),
					color: combineRgb(255, 255, 255),
				},
				options: [
					{
						type: 'number',
						label: 'MIDI Channel Offset',
						id: 'chOfs',
						default: 0,
						min: 0,
						max: 15,
					},
					{
						type: 'number',
						label: 'Strip',
						id: 'strip',
						default: 0,
						min: 0,
						max: 127,
					},
				],
				callback: (feedback) => {
					return this.state?.get(this.getMutePath(feedback.options.chOfs, feedback.options.strip)) === true
				},
			},
		})
	}

	subscribeAhnetFeedback(feedback) {
		if (!feedback?.id) return
		const requirements = { banks: new Set(), inputNames: new Set() }

		if (feedback.feedbackId == 'ilive_meter' || feedback.feedbackId == 'ilive_meter_vertical') {
			const definition = this.getAhnetMeterDefinition(feedback.options.meter, feedback.options)
			if (definition) requirements.banks.add(definition.bank)
			if (String(feedback.options.meter || '').startsWith('input_')) {
				requirements.inputNames.add(Math.min(Math.max(parseInt(feedback.options.channel || 1), 1), 64))
			}
		}

		if (feedback.feedbackId == 'ilive_channel_color_background') {
			requirements.inputNames.add(Math.min(Math.max(parseInt(feedback.options.channel || 1), 1), 64))
		}

		this.activeAhnetFeedbacks.set(feedback.id, requirements)
		this.updateAhnetActiveSubscriptions()
	}

	unsubscribeAhnetFeedback(feedback) {
		if (!feedback?.id) return
		this.activeAhnetFeedbacks?.delete(feedback.id)
		this.updateAhnetActiveSubscriptions()
	}

	updateAhnetActiveSubscriptions() {
		const banks = new Set()
		const inputNames = new Set()

		for (const requirements of this.activeAhnetFeedbacks?.values?.() || []) {
			for (const bank of requirements.banks || []) banks.add(bank)
			for (const channel of requirements.inputNames || []) inputNames.add(channel)
		}

		const subscriptions = {
			banks: [...banks].sort((a, b) => a - b),
			nameEntries: {
				input: [...inputNames].sort((a, b) => a - b),
			},
		}
		this.ahnetActiveSubscriptions = subscriptions
		this.ahnetMeterClient?.setActiveSubscriptions(subscriptions)
	}

	getAhnetMeterDefinition(meter, options) {
		const channel = Math.min(Math.max(parseInt(options.channel || 1), 1), 64)
		const aux = Math.min(Math.max(parseInt(options.aux || 1), 1), 6)
		const auxMixOutput = this.getAhnetMixOutputIndex('monoAux', aux)
		const mainLeftMixOutput = this.getAhnetMainMixOutputIndex('left')
		const mainRightMixOutput = this.getAhnetMainMixOutputIndex('right')

		switch (meter) {
			case 'input_preamp':
				return { bank: 0, index: channel - 1 }
			case 'input_post_peq':
				return { bank: 0, index: channel + 63 }
			case 'input_post_comp':
				return { bank: 1, index: channel - 1 }
			case 'input_limiter_deess':
				return { bank: 1, index: channel + 63 }
			case 'input_post_delay':
				return { bank: 2, index: channel - 1 }
			case 'input_gate_gr':
				return { bank: 4, index: channel - 1, dynamics: true, dynamicsRange: 30 }
			case 'input_comp_gr':
				return { bank: 4, index: channel + 63, dynamics: true, dynamicsRange: 30 }
			case 'input_limiter_gr':
				return { bank: 5, index: channel - 1, dynamics: true, dynamicsRange: 30 }
			case 'aux':
				return { bank: 6, index: auxMixOutput ?? aux + 13 }
			case 'main_left':
				return { bank: 6, index: mainLeftMixOutput ?? 24 }
			case 'main_right':
				return { bank: 6, index: mainRightMixOutput ?? 25 }
			default:
				return undefined
		}
	}

	getAhnetMixOutputStart(type) {
		const requiredKeys = ['monoGroup', 'stereoGroup', 'monoAux', 'stereoAux']
		const hasDetectedLayout = requiredKeys.every((key) => Object.prototype.hasOwnProperty.call(this.ahnetMixConfig || {}, key))
		if (!hasDetectedLayout) return undefined

		let offset = 0
		const monoGroup = this.getAhnetMixConfigValue('monoGroup')
		const stereoGroup = this.getAhnetMixConfigValue('stereoGroup')
		const monoAux = this.getAhnetMixConfigValue('monoAux')
		const stereoAux = this.getAhnetMixConfigValue('stereoAux')
		const configuredMixOutputs = monoGroup + stereoGroup * 2 + monoAux + stereoAux * 2
		if (configuredMixOutputs <= 0) return undefined

		if (type == 'monoGroup') return offset
		offset += monoGroup
		if (type == 'stereoGroup') return offset
		offset += stereoGroup * 2
		if (type == 'monoAux') return offset
		offset += monoAux
		if (type == 'stereoAux') return offset
		offset += stereoAux * 2
		if (type == 'main') return offset
		return undefined
	}

	getAhnetMixOutputIndex(type, number) {
		const start = this.getAhnetMixOutputStart(type)
		const index = Math.max(parseInt(number || 1), 1) - 1
		if (!Number.isFinite(start) || index < 0) return undefined
		if (type == 'stereoGroup' || type == 'stereoAux') return start + index * 2
		return start + index
	}

	getAhnetMainMixOutputIndex(side) {
		const start = this.getAhnetMixOutputStart('main')
		if (!Number.isFinite(start)) return undefined
		return start + (side == 'right' ? 1 : 0)
	}

	getAhnetRawMeterValue(bank, index) {
		return this.ahnetMeterValues?.get(`${bank}:${index}`) ?? 0
	}

	getAhnetMeterPercent(meter, options) {
		const definition = this.getAhnetMeterDefinition(meter, options)
		if (!definition) return 0

		const raw = this.getAhnetRawMeterValue(definition.bank, definition.index)
		return this.normalizeAhnetMeter(raw, definition)
	}

	normalizeAhnetMeter(raw, dynamics = false) {
		const value = parseInt(raw)
		const definition = typeof dynamics === 'object' ? dynamics : { dynamics }
		const isDynamics = definition.dynamics === true
		if (!Number.isFinite(value) || value === 0) return 0
		if (!isDynamics && (value === 32769 || value === 43985)) return 0
		if (!isDynamics && value <= 32) return 100
		if (isDynamics && value <= 32) return 0
		if (isDynamics) {
			const range = Math.max(definition.dynamicsRange ?? 30, 1)
			const percent = (this.getAhnetDynamicsReductionDb(value) / range) * 100
			return Math.min(Math.max(percent, 0), 100)
		}
		return Math.min(Math.max(((value - 43985) / (65535 - 43985)) * 100, 0), 100)
	}

	getAhnetDynamicsReductionDb(raw) {
		const value = parseInt(raw)
		if (!Number.isFinite(value) || value <= 32) return 0
		return Math.max((65535 - value) / 256, 0)
	}

	formatAhnetMeter(raw, dynamics = false, dynamicsRange = 30) {
		const definition = typeof dynamics === 'object' ? dynamics : { dynamics, dynamicsRange }
		const percent = this.normalizeAhnetMeter(raw, definition)
		if (definition.dynamics) {
			const reduction = this.getAhnetDynamicsReductionDb(raw)
			return reduction <= 0.05 ? '0.0 dB' : `-${reduction.toFixed(1)} dB`
		}

		if (percent <= 0) return '-Inf dB'
		if (percent >= 99.5) return 'CLIP'
		const db = -30 + percent * 0.5
		return `${db >= 0 ? '+' : ''}${db.toFixed(1)} dB`
	}

	handleAhnetMeterBank(bank, values) {
		if (this.ahnetMeterValues == undefined) this.ahnetMeterValues = new Map()
		for (let index = 0; index < values.length; index++) {
			this.ahnetMeterValues.set(`${bank}:${index}`, values[index])
		}
		this.scheduleAhnetMeterUpdate()
	}

	scheduleAhnetMeterUpdate() {
		if (this.ahnetMeterUpdateTimer) return
		const interval = Math.min(Math.max(parseInt(this.config?.ahnetMeterRefreshMs || 33), 15), 250)
		this.ahnetMeterUpdateTimer = setTimeout(() => {
			delete this.ahnetMeterUpdateTimer
			const now = Date.now()
			const variableInterval = Math.min(Math.max(parseInt(this.config?.ahnetVariableRefreshMs || 250), 50), 1000)
			if (!this.ahnetLastVariableUpdate || now - this.ahnetLastVariableUpdate >= variableInterval) {
				this.ahnetLastVariableUpdate = now
				this.updateAhnetMeterVariableValues()
			}
			this.checkFeedbacks('ilive_meter', 'ilive_meter_vertical')
		}, interval)
	}

	updateAhnetMeterVariableValues() {
		if (this.config?.model != 'iLive') return

		const values = {}
		const inputMeters = [
			{ id: 'preamp', bank: 0, index: (channel) => channel - 1 },
			{ id: 'post_peq', bank: 0, index: (channel) => channel + 63 },
			{ id: 'post_comp', bank: 1, index: (channel) => channel - 1 },
			{ id: 'limiter_deess', bank: 1, index: (channel) => channel + 63 },
			{ id: 'post_delay', bank: 2, index: (channel) => channel - 1 },
			{ id: 'gate_gr', bank: 4, index: (channel) => channel - 1, dynamics: true, dynamicsRange: 30 },
			{ id: 'comp_gr', bank: 4, index: (channel) => channel + 63, dynamics: true, dynamicsRange: 30 },
			{ id: 'limiter_gr', bank: 5, index: (channel) => channel - 1, dynamics: true, dynamicsRange: 30 },
		]

		const activeInputChannels = new Set(this.ahnetActiveSubscriptions?.nameEntries?.input || [])
		const inputChannels = activeInputChannels.size > 0 ? [...activeInputChannels].sort((a, b) => a - b) : []
		for (const channel of inputChannels) {
			for (const meter of inputMeters) {
				const raw = this.getAhnetRawMeterValue(meter.bank, meter.index(channel))
				values[`ilive_input_${channel}_${meter.id}`] = this.formatAhnetMeter(raw, meter)
				values[`ilive_input_${channel}_${meter.id}_raw`] = raw
			}
		}

		for (let aux = 1; aux <= 6; aux++) {
			const definition = this.getAhnetMeterDefinition('aux', { aux })
			const raw = this.getAhnetRawMeterValue(definition.bank, definition.index)
			values[`ilive_aux_${aux}_meter`] = this.formatAhnetMeter(raw)
			values[`ilive_aux_${aux}_meter_raw`] = raw
		}

		const leftDefinition = this.getAhnetMeterDefinition('main_left', {})
		const rightDefinition = this.getAhnetMeterDefinition('main_right', {})
		const left = this.getAhnetRawMeterValue(leftDefinition.bank, leftDefinition.index)
		const right = this.getAhnetRawMeterValue(rightDefinition.bank, rightDefinition.index)
		values.ilive_main_left_meter = this.formatAhnetMeter(left)
		values.ilive_main_left_meter_raw = left
		values.ilive_main_right_meter = this.formatAhnetMeter(right)
		values.ilive_main_right_meter_raw = right

		this.setVariableValues(values)
	}

	handleAhnetChannelName(managerKey, channel, name, colour) {
		if (managerKey == 'input') this.handleAhnetInputName(channel, name, colour)
	}

	handleAhnetInputName(channel, name, colour) {
		if (!this.ahnetInputNames) this.ahnetInputNames = new Map()
		if (!this.ahnetInputColors) this.ahnetInputColors = new Map()

		if (colour && Number.isFinite(colour.r) && Number.isFinite(colour.g) && Number.isFinite(colour.b)) {
			const colorValue = combineRgb(colour.r, colour.g, colour.b)
			if (this.ahnetInputColors.get(channel) !== colorValue) {
				this.ahnetInputColors.set(channel, colorValue)
				this.checkFeedbacks('ilive_channel_color_background')
			}
		}

		const cleanName = String(name || '').trim()
		if (!cleanName) return

		if (this.ahnetInputNames.get(channel) === cleanName) return
		this.ahnetInputNames.set(channel, cleanName)
		this.setVariableValues({ [`ilive_input_${channel}_name`]: cleanName })
	}

	getAhnetDarkInputColor(channel) {
		const color = this.ahnetInputColors?.get(parseInt(channel))
		if (!color) return combineRgb(0, 0, 0)

		const r = (color >> 16) & 0xff
		const g = (color >> 8) & 0xff
		const b = color & 0xff
		return combineRgb(Math.floor(r * 0.22), Math.floor(g * 0.22), Math.floor(b * 0.22))
	}

	getAhnetMixConfigValue(key) {
		const detected = this.ahnetMixConfig?.[key]
		if (detected !== undefined) return detected

		const fallbackMap = {
			monoGroup: 'monoGroup',
			stereoGroup: 'stereoGroup',
			monoFx: 'monoFx',
			stereoFx: 'stereoFx',
			monoAux: 'monoAux',
			stereoAux: 'stereoAux',
			monoMatrix: 'monoMatrix',
			stereoMatrix: 'stereoMatrix',
		}
		const configKey = fallbackMap[key]
		if (!configKey) return 0
		return Math.max(parseInt(this.config?.[configKey] || 0), 0)
	}

	formatAhnetMixConfigSummary() {
		const group = `Group (${this.getAhnetMixConfigValue('monoGroup')} mono / ${this.getAhnetMixConfigValue('stereoGroup')} stereo)`
		const fx = `FX (${this.getAhnetMixConfigValue('monoFx')} mono / ${this.getAhnetMixConfigValue('stereoFx')} stereo)`
		const aux = `Aux (${this.getAhnetMixConfigValue('monoAux')} mono / ${this.getAhnetMixConfigValue('stereoAux')} stereo)`
		const matrix = `Matrix (${this.getAhnetMixConfigValue('monoMatrix')} mono / ${this.getAhnetMixConfigValue('stereoMatrix')} stereo)`
		const main = this.getAhnetMixConfigValue('main') >= 2 ? 'Main (LR)' : 'Main (unknown)'
		return { group, fx, aux, matrix, main, summary: `${group} ${fx} ${aux} ${matrix} ${main}` }
	}

	updateAhnetMixConfigVariableValues() {
		if (this.config?.model != 'iLive' || !this.config?.enableAhnetMeters) return

		const summary = this.formatAhnetMixConfigSummary()
		this.setVariableValues({
			ilive_mix_config: summary.summary,
			ilive_mix_config_group: summary.group,
			ilive_mix_config_fx: summary.fx,
			ilive_mix_config_aux: summary.aux,
			ilive_mix_config_matrix: summary.matrix,
			ilive_mix_config_main: summary.main,
			ilive_mono_group_count: this.getAhnetMixConfigValue('monoGroup'),
			ilive_stereo_group_count: this.getAhnetMixConfigValue('stereoGroup'),
			ilive_mono_fx_count: this.getAhnetMixConfigValue('monoFx'),
			ilive_stereo_fx_count: this.getAhnetMixConfigValue('stereoFx'),
			ilive_mono_aux_count: this.getAhnetMixConfigValue('monoAux'),
			ilive_stereo_aux_count: this.getAhnetMixConfigValue('stereoAux'),
			ilive_mono_matrix_count: this.getAhnetMixConfigValue('monoMatrix'),
			ilive_stereo_matrix_count: this.getAhnetMixConfigValue('stereoMatrix'),
			ilive_main_count: this.getAhnetMixConfigValue('main'),
		})
	}

	handleAhnetMixConfig(key, count) {
		if (!this.ahnetMixConfig) this.ahnetMixConfig = {}
		const normalizedCount = Math.max(parseInt(count || 0), 0)
		if (this.ahnetMixConfig[key] === normalizedCount) return

		this.ahnetMixConfig[key] = normalizedCount
		this.scheduleAhnetMixConfigUpdate()
	}

	scheduleAhnetMixConfigUpdate() {
		if (this.ahnetMixConfigUpdateTimer) return
		this.ahnetMixConfigUpdateTimer = setTimeout(() => {
			delete this.ahnetMixConfigUpdateTimer
			this.updateAhnetMixConfigVariableValues()
			this.updateActions()
			this.updateVariables()
			this.updatePresets()
			this.log('info', `iLive AHNet mix config detected: ${this.formatAhnetMixConfigSummary().summary}`)
		}, 250)
	}

	getAhnetMeterPresetFeedback(meter, options = {}) {
		return {
			feedbackId: options.vertical ? 'ilive_meter_vertical' : 'ilive_meter',
			options: {
				meter,
				channel: options.channel || 1,
				aux: options.aux || 1,
				position: options.position || 'bottom',
				side: options.side || 'right',
				slot: options.slot || 0,
			},
		}
	}

	getAhnetDynamicsPresetFeedbacks(channel) {
		if (this.config?.model != 'iLive' || !this.config?.enableAhnetMeters) return []

		return [
			this.getAhnetMeterPresetFeedback('input_gate_gr', { channel, vertical: true, side: 'left', slot: 0 }),
			this.getAhnetMeterPresetFeedback('input_comp_gr', { channel, vertical: true, side: 'left', slot: 1 }),
			this.getAhnetMeterPresetFeedback('input_limiter_gr', { channel, vertical: true, side: 'left', slot: 2 }),
		]
	}

	getAhnetInputColorBackgroundFeedback(channel) {
		if (this.config?.model != 'iLive' || !this.config?.enableAhnetMeters) return []

		return [
			{
				feedbackId: 'ilive_channel_color_background',
				options: { channel },
			},
		]
	}

	getMuteInfoForFaderSpec(spec, strip) {
		const muteActionMap = {
			fader_input: 'mute_input',
			fader_mix: 'mute_mix',
			fader_mono_group: 'mute_mono_group',
			fader_stereo_group: 'mute_stereo_group',
			fader_mono_aux: 'mute_mono_aux',
			fader_stereo_aux: 'mute_stereo_aux',
			fader_mono_matrix: 'mute_mono_matrix',
			fader_stereo_matrix: 'mute_stereo_matrix',
			fader_mono_fx_send: 'mute_mono_fx_send',
			fader_stereo_fx_send: 'mute_stereo_fx_send',
			fader_fx_return: 'mute_fx_return',
			fader_DCA: 'mute_dca',
			fader_ufx_send: 'mute_ufx_send',
			fader_ufx_return: 'mute_ufx_return',
		}
		const actionId = muteActionMap[spec.actionId]
		if (!actionId) return undefined

		let chOfs = spec.n
		if (this.config.model != 'dLive') chOfs = 0
		return { actionId, chOfs, strip }
	}

	getAhnetMeterInfoForFaderSpec(spec, index) {
		if (this.config?.model != 'iLive' || !this.config?.enableAhnetMeters) return undefined

		if (spec.actionId == 'fader_input') {
			return { meter: 'input_preamp', options: { channel: index } }
		}
		if (spec.actionId == 'fader_mix' && index >= 1 && index <= 6) {
			return { meter: 'aux', options: { aux: index } }
		}
		return undefined
	}

	getAhnetMeterPreset(name, category, text, variable, meter, options = {}) {
		return {
			type: 'button',
			category,
			name,
			style: {
				text: `${text}\\n${variable}`,
				size: 14,
				show_topbar: false,
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(0, 0, 0),
			},
			steps: [
				{
					down: [],
					up: [],
				},
			],
			feedbacks: [
				...(String(meter).startsWith('input_') ? this.getAhnetInputColorBackgroundFeedback(options.channel || 1) : []),
				this.getAhnetMeterPresetFeedback(meter, { ...options, vertical: true }),
			],
		}
	}

	getAhnetMeterPresets() {
		if (this.config?.model != 'iLive' || !this.config?.enableAhnetMeters) return []

		const presets = []
		const inputMeters = [
			{ meter: 'input_preamp', id: 'preamp', label: 'PreAmp', category: 'iLive AHNet Input Meters' },
			{ meter: 'input_post_peq', id: 'post_peq', label: 'Post PEQ', category: 'iLive AHNet Input Meters' },
			{ meter: 'input_post_comp', id: 'post_comp', label: 'Post Comp', category: 'iLive AHNet Input Meters' },
			{ meter: 'input_limiter_deess', id: 'limiter_deess', label: 'Post Lim', category: 'iLive AHNet Input Meters' },
			{ meter: 'input_post_delay', id: 'post_delay', label: 'Post Delay', category: 'iLive AHNet Input Meters' },
			{ meter: 'input_gate_gr', id: 'gate_gr', label: 'Gate GR', category: 'iLive AHNet Dynamics Meters' },
			{ meter: 'input_comp_gr', id: 'comp_gr', label: 'Comp GR', category: 'iLive AHNet Dynamics Meters' },
			{ meter: 'input_limiter_gr', id: 'limiter_gr', label: 'Limit GR', category: 'iLive AHNet Dynamics Meters' },
		]

		for (let channel = 1; channel <= 64; channel++) {
			for (const input of inputMeters) {
				const variable = `$(${this.label}:ilive_input_${channel}_${input.id})`
				const nameVariable = `$(${this.label}:ilive_input_${channel}_name)`
				presets.push(
					this.getAhnetMeterPreset(
						`CH ${channel} ${input.label}`,
						input.category,
						`${nameVariable}\\n${input.label}`,
						variable,
						input.meter,
						{ channel }
					)
				)
			}
		}

		for (let aux = 1; aux <= 6; aux++) {
			const variable = `$(${this.label}:ilive_aux_${aux}_meter)`
			presets.push(
				this.getAhnetMeterPreset(
					`Aux ${aux} output meter`,
					'iLive AHNet Output Meters',
					`AUX ${aux}\\nMeter`,
					variable,
					'aux',
					{ aux }
				)
			)
		}

		for (const main of [
			{ id: 'main_left', variableId: 'ilive_main_left_meter', label: 'MAIN L' },
			{ id: 'main_right', variableId: 'ilive_main_right_meter', label: 'MAIN R' },
		]) {
			const variable = `$(${this.label}:${main.variableId})`
			presets.push(
				this.getAhnetMeterPreset(
					`${main.label} output meter`,
					'iLive AHNet Output Meters',
					`${main.label}\\nMeter`,
					variable,
					main.id
				)
			)
		}

		return presets
	}

	getFaderPresetLabel(spec, index) {
		if (this.config?.model == 'iLive' && this.config?.enableAhnetMeters && spec.actionId == 'fader_input') {
			return `$(${this.label}:ilive_input_${index}_name)`
		}
		return `${spec.shortName} ${index}`
	}

	updatePresets() {
		let presets = []
		for (const spec of this.getFaderSpecs()) {
			for (let i = 1; i <= spec.qty; i++) {
				let strip = i + spec.offset
				let path = `${spec.n}/${strip}/faderLevel`
				let variable = `$(${this.label}:${this.getFaderVariableId(path)})`
				let label = this.getFaderPresetLabel(spec, i)
				let muteInfo = this.getMuteInfoForFaderSpec(spec, strip)
				let ahnetMeterInfo = this.getAhnetMeterInfoForFaderSpec(spec, i)
				let colorBackgroundFeedbacks = spec.actionId == 'fader_input' ? this.getAhnetInputColorBackgroundFeedback(i) : []
				let dynamicsFeedbacks = spec.actionId == 'fader_input' ? this.getAhnetDynamicsPresetFeedbacks(i) : []
				presets.push({
					type: 'button',
					category: 'Fader Control Buttons (Fade -inf / 0db)',
					name: `${label} fade to 0 dB / -Inf`,
					style: {
						text: `${label}\\n${variable}\\n0 dB / -Inf`,
						size: 14,
						show_topbar: false,
						color: combineRgb(255, 255, 255),
						bgcolor: combineRgb(0, 0, 0),
					},
					steps: [
						{
							down: [
								{
									actionId: spec.actionId,
									options: {
										strip,
										level: 107,
										fadeDuration: 1000,
										fadeAlgorithm: 'linear',
										fadeType: 'ease-in-out',
									},
								},
							],
							up: [],
						},
						{
							down: [
								{
									actionId: spec.actionId,
									options: {
										strip,
										level: 0,
										fadeDuration: 1000,
										fadeAlgorithm: 'linear',
										fadeType: 'ease-in-out',
									},
								},
							],
							up: [],
						},
					],
					feedbacks: [
						...colorBackgroundFeedbacks,
						{
							feedbackId: 'fader_position',
							options: {
								level: variable,
								position: 'bottom',
							},
						},
						...(ahnetMeterInfo
							? [this.getAhnetMeterPresetFeedback(ahnetMeterInfo.meter, { ...ahnetMeterInfo.options, vertical: true })]
							: []),
						...dynamicsFeedbacks,
					],
				})

				presets.push({
					type: 'button',
					category: 'Fader Control Knobs',
					name: `${label} fader control`,
					options: {
						rotaryActions: true,
					},
					style: {
						text: `${label}\\n${variable}`,
						size: 14,
						show_topbar: false,
						color: combineRgb(255, 255, 255),
						bgcolor: combineRgb(0, 0, 0),
					},
					steps: [
						{
							down: muteInfo
								? [
										{
											actionId: muteInfo.actionId,
											options: {
												strip: muteInfo.strip,
												mute: 'toggle',
											},
										},
									]
								: [],
							up: [],
							rotate_left: [
								{
									actionId: spec.actionId,
									options: {
										strip,
										level: -1,
										relative: true,
										fadeDuration: 0,
									},
								},
							],
							rotate_right: [
								{
									actionId: spec.actionId,
									options: {
										strip,
										level: 1,
										relative: true,
										fadeDuration: 0,
									},
								},
							],
						},
					],
					feedbacks: [
						...colorBackgroundFeedbacks,
						{
							feedbackId: 'fader_position',
							options: {
								level: variable,
								position: 'bottom',
							},
						},
						...(muteInfo
							? [
									{
										feedbackId: 'mute_state',
										options: {
											chOfs: muteInfo.chOfs,
											strip: muteInfo.strip,
										},
									},
								]
							: []),
						...(ahnetMeterInfo
							? [this.getAhnetMeterPresetFeedback(ahnetMeterInfo.meter, { ...ahnetMeterInfo.options, vertical: true })]
							: []),
						...dynamicsFeedbacks,
					],
				})
			}
		}
		presets.push(...this.getAhnetMeterPresets())
		this.setPresetDefinitions(presets)
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
		let path = this.getFaderPath(actionId, opt.strip)
		let inputCh = parseInt(opt.strip)
		if (path == undefined) {
			switch(actionId) {
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
		}
		if (path == undefined) return
		let current = this.state.get(path) || 0
		let target = parseInt(opt.level)
		if (opt.relative) {
			target = current + target
		}
		target = Math.min(Math.max(target, 0), 127)

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
				const mute = opt.mute == 'toggle' ? this.state?.get(this.getMutePath(chOfs, strip)) !== true : !!opt.mute
				this.setMuteState(chOfs, strip, mute)
				cmd.buffers = [Buffer.from([0x90 + chOfs, strip, mute ? 0x7f : 0x3f, 0x90 + chOfs, strip, 0])]
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
				tooltip: 'IP address of the dLive surface/MixRack or iLive MixRack.',
				width: 6,
				default: '192.168.1.70',
				regex: Regex.IP,
			},
			{
				type: 'dropdown',
				id: 'model',
				label: 'Console Type',
				tooltip: 'Select dLive for dLive MIDI/TCP support, or iLive for iLive MIDI plus AHNet meter support.',
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
				tooltip: 'TCP port used for MIDI-over-IP control. dLive and iLive normally use 51325.',
				width: 6,
				default: 51325,
				min: 1,
				max: 65535,
			},
			{
				type: 'number',
				id: 'tcpPort',
				label: 'TCP Port',
				tooltip: 'dLive advanced control and iLive AHNet sessions normally use TCP port 51321.',
				width: 6,
				default: 51321,
				min: 1,
				max: 65535,
			},
			{
				type: 'checkbox',
				id: 'enableAhnetMeters',
				label: 'Enable iLive AHNet meters',
				tooltip: 'Enable live iLive input/output meters, gain reduction meters, channel names, and channel colours via AHNet.',
				width: 6,
				default: false,
				isVisibleExpression: '$(config:model) == "iLive"',
			},
			{
				type: 'number',
				id: 'ahnetUdpPort',
				label: 'iLive AHNet Console UDP Port',
				tooltip: 'Console UDP setup port for AHNet meter subscription. The normal iLive value is 51324.',
				width: 6,
				default: 51324,
				min: 1,
				max: 65535,
				isVisibleExpression: '$(config:model) == "iLive" && $(config:enableAhnetMeters) == true',
			},
			{
				type: 'number',
				id: 'ahnetLocalUdpPort',
				label: 'iLive AHNet Local UDP Port',
				tooltip: 'Local UDP port Companion binds to receive AHNet meter packets. Use a port different from the MIDI port.',
				width: 6,
				default: 51326,
				min: 1,
				max: 65535,
				isVisibleExpression: '$(config:model) == "iLive" && $(config:enableAhnetMeters) == true',
			},
			{
				type: 'number',
				id: 'ahnetMeterRefreshMs',
				label: 'iLive AHNet meter refresh (ms)',
				tooltip: 'How often Companion redraws graphical iLive meters. 75 ms is a good starting point if many buttons are visible.',
				width: 6,
				default: 33,
				min: 15,
				max: 250,
				isVisibleExpression: '$(config:model) == "iLive" && $(config:enableAhnetMeters) == true',
			},
			{
				type: 'number',
				id: 'ahnetVariableRefreshMs',
				label: 'iLive AHNet dB text refresh (ms)',
				tooltip: 'How often text variables such as dB values are updated. Slower values reduce Companion load.',
				width: 6,
				default: 250,
				min: 50,
				max: 1000,
				isVisibleExpression: '$(config:model) == "iLive" && $(config:enableAhnetMeters) == true',
			},
			{
				type: 'number',
				id: 'faderUpdateRateMs',
				label: 'Fader fade update interval (ms)',
				tooltip: 'Interval used while executing Companion fade actions. Lower values feel smoother but send more traffic.',
				width: 6,
				default: 50,
				min: 10,
				max: 250,
			},
			{
				type: 'number',
				id: 'midiChannel',
				label: 'MIDI Channel for dLive System (N)',
				tooltip: 'Base MIDI channel for dLive advanced control. dLive uses channels N through N+4.',
				width: 12,
				default: 0,
				min: 0,
				max: 15,
				isVisibleExpression: '$(config:model) == "dLive"',
			},
			{
				type: 'static-text',
				id: 'mixLayoutInfo',
				width: 12,
				label: 'Mix layout',
				value: 'dLive uses these manual mix counts for bus addressing. iLive AHNet meters detect the mix layout automatically when meters are enabled.',
				isVisibleExpression: '$(config:model) == "dLive"',
			},
			{
				type: 'number',
				id: 'monoGroup',
				label: 'Number of Mono Groups',
				tooltip: 'dLive manual mix-layout count used for group addressing.',
				width: 6,
				default: 0,
				min: 0,
				max: 64,
				isVisibleExpression: '$(config:model) == "dLive"',
			},
			{
				type: 'number',
				id: 'stereoGroup',
				label: 'Number of Stereo Groups',
				tooltip: 'dLive manual mix-layout count used for stereo group addressing.',
				width: 6,
				default: 0,
				min: 0,
				max: 64,
				isVisibleExpression: '$(config:model) == "dLive"',
			},
			{
				type: 'number',
				id: 'monoFx',
				label: 'Number of Mono FX',
				tooltip: 'dLive manual mix-layout count used for mono FX send addressing.',
				width: 6,
				default: 0,
				min: 0,
				max: 64,
				isVisibleExpression: '$(config:model) == "dLive"',
			},
			{
				type: 'number',
				id: 'stereoFx',
				label: 'Number of Stereo FX',
				tooltip: 'dLive manual mix-layout count used for stereo FX send addressing.',
				width: 6,
				default: 0,
				min: 0,
				max: 64,
				isVisibleExpression: '$(config:model) == "dLive"',
			},
			{
				type: 'number',
				id: 'monoAux',
				label: 'Number of Mono AUX',
				tooltip: 'dLive manual mix-layout count used for mono aux addressing.',
				width: 6,
				default: 0,
				min: 0,
				max: 64,
				isVisibleExpression: '$(config:model) == "dLive"',
			},
			{
				type: 'number',
				id: 'stereoAux',
				label: 'Number of Stereo AUX',
				tooltip: 'dLive manual mix-layout count used for stereo aux addressing.',
				width: 6,
				default: 0,
				min: 0,
				max: 64,
				isVisibleExpression: '$(config:model) == "dLive"',
			},
			{
				type: 'number',
				id: 'monoMatrix',
				label: 'Number of Mono Matrices',
				tooltip: 'dLive manual mix-layout count used for mono matrix addressing.',
				width: 6,
				default: 0,
				min: 0,
				max: 64,
				isVisibleExpression: '$(config:model) == "dLive"',
			},
			{
				type: 'number',
				id: 'stereoMatrix',
				label: 'Number of Stereo Matrices',
				tooltip: 'dLive manual mix-layout count used for stereo matrix addressing.',
				width: 6,
				default: 0,
				min: 0,
				max: 64,
				isVisibleExpression: '$(config:model) == "dLive"',
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
		this.fadingWorker.stopAll()
		this.stopAhnetMeters()
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
						this.setStateValue(`${this.currentMidiChannel.n}/${this.currentMidiChannel.channel}/faderLevel`, message.value)
					}
				}
			}
		} else if (message.type === 0x90) {
			if (message.velocity === 0x7f || message.velocity === 0x3f) {
				this.setMuteState(message.channel, message.note, message.velocity === 0x7f)
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
		this.ahnetMeterValues = new Map()
		this.ahnetInputNames = new Map()
		this.ahnetInputColors = new Map()
		this.ahnetMixConfig = {}
		if (!this.activeAhnetFeedbacks) this.activeAhnetFeedbacks = new Map()
		this.ahnetDynamicsBaselines = new Map()
		this.ahnetActiveSubscriptions = { banks: [], nameEntries: { input: [] } }
		this.updateAhnetActiveSubscriptions()
		this.updateAhnetInputNameVariableValues()
		this.updateAhnetMixConfigVariableValues()
		this.stopAhnetMeters()
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

			if (this.config.model == 'iLive' && this.config.enableAhnetMeters) {
				try {
					this.startAhnetMeters()
				} catch (error) {
					this.log('error', `Unable to start iLive AHNet meters: ${error.message}`)
				}
			}
		} else if (message.type === 0x90) {
			if (message.velocity === 0x7f || message.velocity === 0x3f) {
				this.setMuteState(message.channel, message.note, message.velocity === 0x7f)
			}
		}
	}

	startAhnetMeters() {
		this.stopAhnetMeters()
		try {
			this.ahnetMeterClient = new AhnetMeterClient(this, {
				host: this.config.host,
				tcpPort: this.config.tcpPort || 51321,
				udpPort: this.config.ahnetUdpPort || 51324,
				localUdpPort: this.config.ahnetLocalUdpPort || 51326,
				banks: 10,
			})
			this.ahnetMeterClient.setActiveSubscriptions(this.ahnetActiveSubscriptions || { banks: [], nameEntries: { input: [] } })
			this.ahnetMeterClient.start()
		} catch (error) {
			this.stopAhnetMeters()
			throw error
		}
	}

	stopAhnetMeters() {
		if (this.ahnetMeterUpdateTimer) {
			clearTimeout(this.ahnetMeterUpdateTimer)
			delete this.ahnetMeterUpdateTimer
		}
		delete this.ahnetLastVariableUpdate
		if (this.ahnetMeterClient) {
			this.ahnetMeterClient.stop()
			delete this.ahnetMeterClient
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
			midiPort: 51325,
			tcpPort: 51321,
			midiChannel: 0
		}

		// Ensure port defaults are set even if config exists
		if (!this.config.midiPort) this.config.midiPort = 51325
		if (this.config.model == 'iLive' && this.config.midiPort == 51328) this.config.midiPort = 51325
		if (!this.config.tcpPort) this.config.tcpPort = 51321
		if (!this.config.ahnetUdpPort) this.config.ahnetUdpPort = 51324
		if (!this.config.ahnetLocalUdpPort || this.config.ahnetLocalUdpPort == 51325) this.config.ahnetLocalUdpPort = 51326
		if (!this.config.ahnetMeterRefreshMs) this.config.ahnetMeterRefreshMs = 33
		if (!this.config.ahnetVariableRefreshMs) this.config.ahnetVariableRefreshMs = 250
		if (!this.config.faderUpdateRateMs) this.config.faderUpdateRateMs = 50
		if (this.config.midiChannel === undefined) this.config.midiChannel = 0
		this.fadingWorker.setUpdateRate(Math.min(Math.max(parseInt(this.config.faderUpdateRateMs || 50), 10), 250))

		this.updateActions()
		this.updateVariables()
		this.updateFeedbacks()
		this.updatePresets()
		this.init_tcp()
	}
}

runEntrypoint(ModuleInstance, upgradeScripts)
