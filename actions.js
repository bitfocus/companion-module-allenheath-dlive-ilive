const { combineRgb } = require('@companion-module/base')

module.exports = {
	/**
	 * Get the available actions.
	 *
	 * @returns {Object[]} the available actions
	 * @access public
	 * @since 1.2.0
	 */

	getActionDefinitions() {
		this.chCount = this.config.model == 'dLive' ? 128 : 64
		this.dcaCount = this.config.model == 'dLive' ? 24 : 16
		this.sceneCount = this.config.model == 'dLive' ? 500 : 250

		let actions = {}

		this.CHOICES_INPUT_CHANNEL = []
		for (let i = 0; i < this.chCount; i++) {
			this.CHOICES_INPUT_CHANNEL.push({ label: `CH ${i + 1}`, id: i })
		}

		this.CHOICES_SCENES = []
		for (let i = 0; i < this.sceneCount; i++) {
			this.CHOICES_SCENES.push({ label: `SCENE ${i + 1}`, id: i })
		}

		this.CHOICES_DCA = []
		for (let i = 0; i < this.dcaCount; i++) {
			this.CHOICES_DCA.push({ label: `DCA ${i + 1}`, id: i })
		}

		this.CHOICES_MUTE = []
		for (let i = 0; i < 8; i++) {
			this.CHOICES_MUTE.push({ label: `MUTE ${i + 1}`, id: i })
		}

		this.CHOICES_FADER = []
		for (let i = 0; i < 128; i++) {
			let dbVal = ((i - 107) / 2).toFixed(1)
			let dbStr = i == 0 ? '-INF' : dbVal == 0 ? dbVal : dbVal > 0 ? `+${dbVal}` : `-${dbVal}`
			this.CHOICES_FADER.push({ label: `${dbStr} dB`, id: i })
		}

		this.muteOptions = (name, qty, ofs) => {
			this.CHOICES = []
			for (let i = 1; i <= qty; i++) {
				this.CHOICES.push({ label: `${name} ${i}`, id: i + ofs })
			}
			return [
				{
					type: 'dropdown',
					label: name,
					id: 'strip',
					default: 1 + ofs,
					choices: this.CHOICES,
					minChoicesForSearch: 0,
				},
				{
					type: 'checkbox',
					label: 'Mute',
					id: 'mute',
					default: true,
				},
			]
		}

		this.phantomOptions = (name, qty, ofs) => {
			this.CHOICES = []
			for (let i = 1; i <= qty; i++) {
				this.CHOICES.push({ label: `${name} ${i}`, id: i + ofs })
			}
			return [
				{
					type: 'dropdown',
					label: name,
					id: 'strip',
					default: 1 + ofs,
					choices: this.CHOICES,
					minChoicesForSearch: 0,
				},
				{
					type: 'checkbox',
					label: 'Phantom',
					id: 'phantom',
					default: true,
				},
			]
		}

		this.faderOptions = (name, qty, ofs) => {
			this.CHOICES = []
			for (let i = 1; i <= qty; i++) {
				this.CHOICES.push({ label: `${name} ${i}`, id: i + ofs })
			}
			return [
				{
					type: 'dropdown',
					label: name,
					id: 'strip',
					default: 1 + ofs,
					choices: this.CHOICES,
					minChoicesForSearch: 0,
				},
				{
					type: 'dropdown',
					label: 'Level',
					id: 'level',
					default: 0,
					choices: this.CHOICES_FADER,
					minChoicesForSearch: 0,
				},
			]
		}

		// Actions for dLive
		if (this.config.model == 'dLive') {
			actions['mute_input'] = {
				name: 'Mute Input',
				options: this.muteOptions('Input Channel', 128, -1),
				callback: async (action) => {
					this.sendAction('mute_input', action.options)
				},
			}
			actions['mute_mono_group'] = {
				name: 'Mute Mono Group',
				options: this.muteOptions('Mono Group', 62, -1),
				callback: async (action) => {
					this.sendAction('mute_mono_group', action.options)
				},
			}
			actions['mute_stereo_group'] = {
				name: 'Mute Stereo Group',
				options: this.muteOptions('Stereo Group', 31, 0x3f),
				callback: async (action) => {
					this.sendAction('mute_stereo_group', action.options)
				},
			}
			actions['mute_mono_aux'] = {
				name: 'Mute Mono Aux',
				options: this.muteOptions('Mono Aux', 62, -1),
				callback: async (action) => {
					this.sendAction('mute_mono_aux', action.options)
				},
			}
			actions['mute_stereo_aux'] = {
				name: 'Mute Stereo Aux',
				options: this.muteOptions('Stereo Aux', 31, 0x3f),
				callback: async (action) => {
					this.sendAction('mute_stereo_aux', action.options)
				},
			}
			actions['mute_mono_matrix'] = {
				name: 'Mute Mono Matrix',
				options: this.muteOptions('Mono Matrix', 62, -1),
				callback: async (action) => {
					this.sendAction('mute_mono_matrix', action.options)
				},
			}
			actions['mute_stereo_matrix'] = {
				name: 'Mute Stereo Matrix',
				options: this.muteOptions('Stereo Matrix', 31, 0x3f),
				callback: async (action) => {
					this.sendAction('mute_stereo_matrix', action.options)
				},
			}
			actions['mute_mono_fx_send'] = {
				name: 'Mute Mono FX Send',
				options: this.muteOptions('Mono FX Send', 16, -1),
				callback: async (action) => {
					this.sendAction('mute_mono_fx_send', action.options)
				},
			}
			actions['mute_stereo_fx_send'] = {
				name: 'Mute Stereo FX Send',
				options: this.muteOptions('Stereo FX Send', 16, 0x0f),
				callback: async (action) => {
					this.sendAction('mute_stereo_fx_send', action.options)
				},
			}
			actions['mute_fx_return'] = {
				name: 'Mute FX Return',
				options: this.muteOptions('FX Return', 16, 0x1f),
				callback: async (action) => {
					this.sendAction('mute_fx_return', action.options)
				},
			}
			actions['mute_master'] = {
				name: 'Mute Group Master',
				options: this.muteOptions('Mute Group Master', 8, 0x4d),
				callback: async (action) => {
					this.sendAction('mute_master', action.options)
				},
			}
			actions['mute_dca'] = {
				name: 'Mute DCA',
				options: this.muteOptions('DCA', 24, 0x35),
				callback: async (action) => {
					this.sendAction('mute_dca', action.options)
				},
			}
			actions['mute_ufx_send'] = {
				name: 'Mute UFX Stereo Send',
				options: this.muteOptions('UFX Stereo Send', 8, 0x55),
				callback: async (action) => {
					this.sendAction('mute_ufx_send', action.options)
				},
			}
			actions['mute_ufx_return'] = {
				name: 'Mute UFX Stereo Return',
				options: this.muteOptions('UFX Stereo Return', 8, 0x5d),
				callback: async (action) => {
					this.sendAction('mute_ufx_return', action.options)
				},
			}
			actions['fader_input'] = {
				name: 'Set Input Fader to Level',
				options: this.faderOptions('Channel', 128, -1),
				callback: async (action) => {
					this.sendAction('fader_input', action.options)
				},
			}
			actions['fader_mono_group'] = {
				name: 'Set Mono Group Master Fader to Level',
				options: this.faderOptions('Mono Group', 62, -1),
				callback: async (action) => {
					this.sendAction('fader_mono_group', action.options)
				},
			}
			actions['fader_stereo_group'] = {
				name: 'Set Stereo Group Master Fader to Level',
				options: this.faderOptions('Stereo Group', 31, 0x3f),
				callback: async (action) => {
					this.sendAction('fader_stereo_group', action.options)
				},
			}
			actions['fader_mono_aux'] = {
				name: 'Set Mono Aux Master Fader to Level',
				options: this.faderOptions('Mono Aux', 62, -1),
				callback: async (action) => {
					this.sendAction('fader_mono_aux', action.options)
				},
			}
			actions['fader_stereo_aux'] = {
				name: 'Set Stereo Aux Master Fader to Level',
				options: this.faderOptions('Stereo Aux', 31, 0x3f),
				callback: async (action) => {
					this.sendAction('fader_stereo_aux', action.options)
				},
			}
			actions['fader_mono_matrix'] = {
				name: 'Set Mono Matrix Master Fader to Level',
				options: this.faderOptions('Mono Matrix', 62, -1),
				callback: async (action) => {
					this.sendAction('fader_mono_matrix', action.options)
				},
			}
			actions['fader_stereo_matrix'] = {
				name: 'Set Stereo Matrix Master Fader to Level',
				options: this.faderOptions('Stereo Matrix', 31, 0x3f),
				callback: async (action) => {
					this.sendAction('fader_stereo_matrix', action.options)
				},
			}
			actions['fader_mono_fx_send'] = {
				name: 'Set Mono FX Send Master Fader to Level',
				options: this.faderOptions('Mono FX Send', 16, -1),
				callback: async (action) => {
					this.sendAction('fader_mono_fx_send', action.options)
				},
			}
			actions['fader_stereo_fx_send'] = {
				name: 'Set Stereo FX Send Master Fader to Level',
				options: this.faderOptions('Stereo FX Send', 16, 0x0f),
				callback: async (action) => {
					this.sendAction('fader_stereo_fx_send', action.options)
				},
			}
			actions['fader_fx_return'] = {
				name: 'Set FX Return Fader to Level',
				options: this.faderOptions('FX Return', 16, 0x1f),
				callback: async (action) => {
					this.sendAction('fader_fx_return', action.options)
				},
			}
			actions['fader_DCA'] = {
				name: 'Set DCA Fader to Level',
				options: this.faderOptions('DCA', 24, 0x35),
				callback: async (action) => {
					this.sendAction('fader_DCA', action.options)
				},
			}
			actions['fader_ufx_send'] = {
				name: 'Set UFX Stereo Send Fader to Level',
				options: this.faderOptions('UFX Stereo Send', 8, 0x55),
				callback: async (action) => {
					this.sendAction('fader_ufx_send', action.options)
				},
			}
			actions['fader_ufx_return'] = {
				name: 'Set UFX Stereo Return Fader to Level',
				options: this.faderOptions('UFX Stereo Return', 8, 0x5d),
				callback: async (action) => {
					this.sendAction('fader_ufx_return', action.options)
				},
			}
		} else {
			// Actions for iLive
			actions['mute_input'] = {
				name: 'Mute Input',
				options: this.muteOptions('Input Channel', 64, 0x1f),
				callback: async (action) => {
					this.sendAction('mute_input', action.options)
				},
			}
			actions['mute_mix'] = {
				name: 'Mute Mix',
				options: this.muteOptions('Mix', 32, 0x5f),
				callback: async (action) => {
					this.sendAction('mute_mix', action.options)
				},
			}
			actions['mute_mono_fx_send'] = {
				name: 'Mute FX Send',
				options: this.muteOptions('FX Send', 8, -1),
				callback: async (action) => {
					this.sendAction('mute_mono_fx_send', action.options)
				},
			}
			actions['mute_fx_return'] = {
				name: 'Mute FX Return',
				options: this.muteOptions('FX Return', 8, 0x07),
				callback: async (action) => {
					this.sendAction('mute_fx_return', action.options)
				},
			}
			actions['mute_dca'] = {
				name: 'Mute DCA',
				options: this.muteOptions('DCA', 16, 0x0f),
				callback: async (action) => {
					this.sendAction('mute_dca', action.options)
				},
			}

			actions['fader_input'] = {
				name: 'Set Input Fader to Level',
				options: this.faderOptions('Channel', 64, 0x1f),
				callback: async (action) => {
					this.sendAction('fader_input', action.options)
				},
			}
			actions['fader_mix'] = {
				name: 'Set Mix Fader to Level',
				options: this.faderOptions('Mix', 32, 0x5f),
				callback: async (action) => {
					this.sendAction('fader_mix', action.options)
				},
			}
			actions['fader_mono_fx_send'] = {
				name: 'Set FX Send Master Fader to Level',
				options: this.faderOptions('FX Send', 8, -1),
				callback: async (action) => {
					this.sendAction('fader_mono_fx_send', action.options)
				},
			}
			actions['fader_fx_return'] = {
				name: 'Set FX Return Fader to Level',
				options: this.faderOptions('FX Return', 8, 0x07),
				callback: async (action) => {
					this.sendAction('fader_fx_return', action.options)
				},
			}
			actions['fader_DCA'] = {
				name: 'Set DCA Fader to Level',
				options: this.faderOptions('DCA', 16, 0x0f),
				callback: async (action) => {
					this.sendAction('fader_DCA', action.options)
				},
			}
		}

		// Actions for all products
		actions['phantom'] = {
			name: 'Toggle 48v Phantom on Preamp',
			options: this.phantomOptions('Preamp', this.chCount, -1),
			callback: async (action) => {
				this.sendAction('phantom', action.options)
			},
		}

		actions['dca_assign'] = {
			name: 'Assign DCA Groups for channel',
			options: [
				{
					type: 'dropdown',
					label: 'Input Channel',
					id: 'inputChannel',
					default: '0',
					choices: this.CHOICES_INPUT_CHANNEL,
					minChoicesForSearch: 0,
				},
				{
					type: 'multidropdown',
					label: 'DCA',
					id: 'dcaGroup',
					default: [],
					choices: this.CHOICES_DCA,
				},
			],
			callback: async (action) => {
				this.sendAction('dca_assign', action.options)
			},
		}

		if (this.config.model == 'dLive') {
			actions['mute_assign'] = {
				name: 'Assign Mute Groups for channel',
				options: [
					{
						type: 'dropdown',
						label: 'Input Channel',
						id: 'inputChannel',
						default: '0',
						choices: this.CHOICES_INPUT_CHANNEL,
						minChoicesForSearch: 0,
					},
					{
						type: 'multidropdown',
						label: 'MUTE',
						id: 'muteGroup',
						default: [],
						choices: this.CHOICES_MUTE,
					},
				],
				callback: async (action) => {
					this.sendAction('mute_assign', action.options)
				},
			}

			actions['vsc'] = {
				name: 'Virtual Soundcheck',
				options: [
					{
						type: 'dropdown',
						label: 'VSC Mode',
						id: 'vscMode',
						default: 0,
						choices: [
							{ label: 'Inactive', id: 0 },
							{ label: 'Record Send', id: 1 },
							{ label: 'Virtual SoundCheck', id: 2 },
						],
					},
				],
				callback: async (action) => {
					this.sendAction('vsc', action.options)
				},
			}

			actions['talkback_on'] = {
				name: 'Talkback On',
				options: [
					{
						type: 'checkbox',
						label: 'ON',
						id: 'on',
						default: true,
					},
				],
				callback: async (action) => {
					this.sendAction('talkback_on', action.options)
				},
			}
		}

		actions['scene_recall'] = {
			name: 'Scene recall',
			options: [
				{
					type: 'dropdown',
					label: 'Scene Number',
					id: 'sceneNumber',
					default: '0',
					choices: this.CHOICES_SCENES,
					minChoicesForSearch: 0,
				},
			],
			callback: async (action) => {
				this.sendAction('scene_recall', action.options)
			},
		}

		// New Protocol V2.0 Actions
		
		// Scene Navigation
		actions['scene_next'] = {
			name: 'Scene Go Next',
			options: [],
			callback: async (action) => {
				this.sendAction('scene_next', action.options)
			},
		}

		actions['scene_previous'] = {
			name: 'Scene Go Previous',
			options: [],
			callback: async (action) => {
				this.sendAction('scene_previous', action.options)
			},
		}

		// Solo Controls
		actions['solo_input'] = {
			name: 'Solo Input Channel',
			options: [
				{
					type: 'dropdown',
					label: 'Input Channel',
					id: 'strip',
					default: 0,
					choices: this.CHOICES_INPUT_CHANNEL,
					minChoicesForSearch: 0,
				},
				{
					type: 'checkbox',
					label: 'Solo',
					id: 'solo',
					default: true,
				},
			],
			callback: async (action) => {
				this.sendAction('solo_input', action.options)
			},
		}

		// EQ Controls
		actions['eq_enable_input'] = {
			name: 'EQ Enable/Disable Input Channel',
			options: [
				{
					type: 'dropdown',
					label: 'Input Channel',
					id: 'strip',
					default: 0,
					choices: this.CHOICES_INPUT_CHANNEL,
					minChoicesForSearch: 0,
				},
				{
					type: 'checkbox',
					label: 'EQ Enable',
					id: 'enable',
					default: true,
				},
			],
			callback: async (action) => {
				this.sendAction('eq_enable_input', action.options)
			},
		}

		// Preamp Gain Control
		this.CHOICES_GAIN = []
		for (let i = 0; i <= 127; i++) {
			let gainVal = ((i * 60) / 127 - 10).toFixed(1) // -10dB to +50dB range
			let gainStr = gainVal == 0 ? '0' : gainVal > 0 ? `+${gainVal}` : gainVal
			this.CHOICES_GAIN.push({ label: `${gainStr} dB`, id: i })
		}

		actions['preamp_gain'] = {
			name: 'Set Preamp Gain',
			options: [
				{
					type: 'dropdown',
					label: 'Input Channel',
					id: 'strip',
					default: 0,
					choices: this.CHOICES_INPUT_CHANNEL,
					minChoicesForSearch: 0,
				},
				{
					type: 'dropdown',
					label: 'Gain Level',
					id: 'gain',
					default: 42, // Approximately 0dB
					choices: this.CHOICES_GAIN,
					minChoicesForSearch: 0,
				},
			],
			callback: async (action) => {
				this.sendAction('preamp_gain', action.options)
			},
		}

		// Preamp Pad Control
		actions['preamp_pad'] = {
			name: 'Toggle Preamp Pad',
			options: [
				{
					type: 'dropdown',
					label: 'Input Channel',
					id: 'strip',
					default: 0,
					choices: this.CHOICES_INPUT_CHANNEL,
					minChoicesForSearch: 0,
				},
				{
					type: 'checkbox',
					label: 'Pad (-20dB)',
					id: 'pad',
					default: true,
				},
			],
			callback: async (action) => {
				this.sendAction('preamp_pad', action.options)
			},
		}

		// High Pass Filter Control
		this.CHOICES_HPF = [
			{ label: 'Off', id: 0 },
			{ label: '20 Hz', id: 1 },
			{ label: '25 Hz', id: 2 },
			{ label: '31.5 Hz', id: 3 },
			{ label: '40 Hz', id: 4 },
			{ label: '50 Hz', id: 5 },
			{ label: '63 Hz', id: 6 },
			{ label: '80 Hz', id: 7 },
			{ label: '100 Hz', id: 8 },
			{ label: '125 Hz', id: 9 },
			{ label: '160 Hz', id: 10 },
			{ label: '200 Hz', id: 11 },
			{ label: '250 Hz', id: 12 },
			{ label: '315 Hz', id: 13 },
			{ label: '400 Hz', id: 14 },
		]

		actions['hpf_control'] = {
			name: 'Set High Pass Filter',
			options: [
				{
					type: 'dropdown',
					label: 'Input Channel',
					id: 'strip',
					default: 0,
					choices: this.CHOICES_INPUT_CHANNEL,
					minChoicesForSearch: 0,
				},
				{
					type: 'dropdown',
					label: 'HPF Frequency',
					id: 'frequency',
					default: 0,
					choices: this.CHOICES_HPF,
				},
			],
			callback: async (action) => {
				this.sendAction('hpf_control', action.options)
			},
		}

		// Send Level Controls
		this.sendLevelOptions = (name, qty, ofs) => {
			this.CHOICES = []
			for (let i = 1; i <= qty; i++) {
				this.CHOICES.push({ label: `${name} ${i}`, id: i + ofs })
			}
			return [
				{
					type: 'dropdown',
					label: 'Input Channel',
					id: 'inputChannel',
					default: 0,
					choices: this.CHOICES_INPUT_CHANNEL,
					minChoicesForSearch: 0,
				},
				{
					type: 'dropdown',
					label: name,
					id: 'send',
					default: 1 + ofs,
					choices: this.CHOICES,
					minChoicesForSearch: 0,
				},
				{
					type: 'dropdown',
					label: 'Send Level',
					id: 'level',
					default: 0,
					choices: this.CHOICES_FADER,
					minChoicesForSearch: 0,
				},
			]
		}

		if (this.config.model == 'dLive') {
			// Send Level Controls for dLive
			actions['send_aux_mono'] = {
				name: 'Set Aux Mono Send Level',
				options: this.sendLevelOptions('Mono Aux', 62, -1),
				callback: async (action) => {
					this.sendAction('send_aux_mono', action.options)
				},
			}

			actions['send_aux_stereo'] = {
				name: 'Set Aux Stereo Send Level',
				options: this.sendLevelOptions('Stereo Aux', 31, 0x3f),
				callback: async (action) => {
					this.sendAction('send_aux_stereo', action.options)
				},
			}

			actions['send_fx_mono'] = {
				name: 'Set FX Mono Send Level',
				options: this.sendLevelOptions('Mono FX', 16, -1),
				callback: async (action) => {
					this.sendAction('send_fx_mono', action.options)
				},
			}

			actions['send_fx_stereo'] = {
				name: 'Set FX Stereo Send Level',
				options: this.sendLevelOptions('Stereo FX', 16, 0x0f),
				callback: async (action) => {
					this.sendAction('send_fx_stereo', action.options)
				},
			}

			actions['send_matrix_mono'] = {
				name: 'Set Matrix Mono Send Level',
				options: this.sendLevelOptions('Mono Matrix', 62, -1),
				callback: async (action) => {
					this.sendAction('send_matrix_mono', action.options)
				},
			}

			actions['send_matrix_stereo'] = {
				name: 'Set Matrix Stereo Send Level',
				options: this.sendLevelOptions('Stereo Matrix', 31, 0x3f),
				callback: async (action) => {
					this.sendAction('send_matrix_stereo', action.options)
				},
			}

			// UFX Send Level Controls
			actions['send_ufx'] = {
				name: 'Set UFX Stereo Send Level',
				options: this.sendLevelOptions('UFX Stereo Send', 8, 0x55),
				callback: async (action) => {
					this.sendAction('send_ufx', action.options)
				},
			}

			// UFX Global Key Control
			this.CHOICES_UFX_KEY = [
				{ label: 'C', id: 0x00 },
				{ label: 'C#', id: 0x01 },
				{ label: 'D', id: 0x02 },
				{ label: 'D#', id: 0x03 },
				{ label: 'E', id: 0x04 },
				{ label: 'F', id: 0x05 },
				{ label: 'F#', id: 0x06 },
				{ label: 'G', id: 0x07 },
				{ label: 'G#', id: 0x08 },
				{ label: 'A', id: 0x09 },
				{ label: 'A#', id: 0x0a },
				{ label: 'B', id: 0x0b },
			]

			actions['ufx_global_key'] = {
				name: 'Set UFX Global Key',
				options: [
					{
						type: 'dropdown',
						label: 'Key',
						id: 'key',
						default: 0x00,
						choices: this.CHOICES_UFX_KEY,
					},
				],
				callback: async (action) => {
					this.sendAction('ufx_global_key', action.options)
				},
			}

			// UFX Global Scale Control
			this.CHOICES_UFX_SCALE = [
				{ label: 'Major', id: 0x00 },
				{ label: 'Minor', id: 0x01 },
			]

			actions['ufx_global_scale'] = {
				name: 'Set UFX Global Scale',
				options: [
					{
						type: 'dropdown',
						label: 'Scale',
						id: 'scale',
						default: 0x00,
						choices: this.CHOICES_UFX_SCALE,
					},
				],
				callback: async (action) => {
					this.sendAction('ufx_global_scale', action.options)
				},
			}

			// UFX Unit Parameter Control
			actions['ufx_unit_parameter'] = {
				name: 'Set UFX Unit Parameter',
				options: [
					{
						type: 'number',
						label: 'UFX MIDI Channel (M)',
						id: 'midiChannel',
						default: 1,
						min: 1,
						max: 16,
					},
					{
						type: 'number',
						label: 'Control Number (nn)',
						id: 'controlNumber',
						default: 1,
						min: 0,
						max: 127,
					},
					{
						type: 'number',
						label: 'Value (vv)',
						id: 'value',
						default: 0,
						min: 0,
						max: 127,
					},
				],
				callback: async (action) => {
					this.sendAction('ufx_unit_parameter', action.options)
				},
			}

			// UFX Unit Key Parameter (with CC value scaling)
			actions['ufx_unit_key'] = {
				name: 'Set UFX Unit Key Parameter',
				options: [
					{
						type: 'number',
						label: 'UFX MIDI Channel (M)',
						id: 'midiChannel',
						default: 1,
						min: 1,
						max: 16,
					},
					{
						type: 'number',
						label: 'Control Number (nn)',
						id: 'controlNumber',
						default: 1,
						min: 0,
						max: 127,
					},
					{
						type: 'dropdown',
						label: 'Key',
						id: 'key',
						default: 'C',
						choices: [
							{ label: 'C', id: 'C' },
							{ label: 'C#', id: 'C#' },
							{ label: 'D', id: 'D' },
							{ label: 'D#', id: 'D#' },
							{ label: 'E', id: 'E' },
							{ label: 'F', id: 'F' },
							{ label: 'F#', id: 'F#' },
							{ label: 'G', id: 'G' },
							{ label: 'G#', id: 'G#' },
							{ label: 'A', id: 'A' },
							{ label: 'A#', id: 'A#' },
							{ label: 'B', id: 'B' },
						],
					},
				],
				callback: async (action) => {
					this.sendAction('ufx_unit_key', action.options)
				},
			}

			// UFX Unit Scale Parameter (with CC value scaling)
			actions['ufx_unit_scale'] = {
				name: 'Set UFX Unit Scale Parameter',
				options: [
					{
						type: 'number',
						label: 'UFX MIDI Channel (M)',
						id: 'midiChannel',
						default: 1,
						min: 1,
						max: 16,
					},
					{
						type: 'number',
						label: 'Control Number (nn)',
						id: 'controlNumber',
						default: 1,
						min: 0,
						max: 127,
					},
					{
						type: 'dropdown',
						label: 'Scale',
						id: 'scale',
						default: 'Major',
						choices: [
							{ label: 'Major', id: 'Major' },
							{ label: 'Minor', id: 'Minor' },
							{ label: 'Chromatic', id: 'Chromatic' },
						],
					},
				],
				callback: async (action) => {
					this.sendAction('ufx_unit_scale', action.options)
				},
			}

			// Input to Main Assignment
			actions['input_to_main'] = {
				name: 'Input to Main Assign',
				options: [
					{
						type: 'dropdown',
						label: 'Input Channel',
						id: 'strip',
						default: 0,
						choices: this.CHOICES_INPUT_CHANNEL,
						minChoicesForSearch: 0,
					},
					{
						type: 'checkbox',
						label: 'Assign to Main',
						id: 'assign',
						default: true,
					},
				],
				callback: async (action) => {
					this.sendAction('input_to_main', action.options)
				},
			}
		} else {
			// Send Level Controls for iLive (simplified)
			actions['send_mix'] = {
				name: 'Set Mix Send Level',
				options: this.sendLevelOptions('Mix', 32, 0x5f),
				callback: async (action) => {
					this.sendAction('send_mix', action.options)
				},
			}

			actions['send_fx'] = {
				name: 'Set FX Send Level',
				options: this.sendLevelOptions('FX Send', 8, -1),
				callback: async (action) => {
					this.sendAction('send_fx', action.options)
				},
			}
		}

		return actions
	},
}
