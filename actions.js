const { config } = require("chai");

module.exports = {

	/**
	* Get the available actions.
	*
	* @returns {Object[]} the available actions
	* @access public
	* @since 1.2.0
	*/

	getActions() {
		this.chCount    = (this.config.model == 'dLive') ? 128 : 64;
		this.dcaCount   = (this.config.model == 'dLive') ? 24 : 16;
		this.sceneCount = (this.config.model == 'dLive') ? 500 : 250;
		
		let actions = {};

		this.CHOICES_INPUT_CHANNEL = [];
		for (let i = 0; i < this.chCount; i++) {
			this.CHOICES_INPUT_CHANNEL.push({ label: `CH ${i + 1}`, id: i });
		}
		
		this.CHOICES_SCENES = [];
		for (let i = 0; i < this.sceneCount; i++) {
			this.CHOICES_SCENES.push({ label: `SCENE ${i + 1}`, id: i });
		}

		this.CHOICES_DCA = [];
		for (let i = 0; i < this.dcaCount; i++) {
			this.CHOICES_DCA.push({ label: `DCA ${i + 1}`, id: i });
		}

		this.CHOICES_MUTE = [];
		for (let i = 0; i < 8; i++) {
			this.CHOICES_MUTE.push({ label: `MUTE ${i + 1}`, id: i });
		}

		this.CHOICES_FADER = [];
		for (let i = 0; i < 128; i++) {
			let dbVal = ((i - 107) / 2).toFixed(1)
			let dbStr = (i == 0) ? '-INF' : (dbVal == 0) ? dbVal : (dbVal > 0) ? `+${dbVal}` : `-${dbVal}`;
			this.CHOICES_FADER.push({ label: `${dbStr} dB`, id: i})
		}

		this.muteOptions = (name, qty, ofs) => {
			this.CHOICES = [];
			for (let i = 1; i <= qty; i++) {
				this.CHOICES.push({ label: `${name} ${i}`, id: i + ofs });
			}
			return [{
				type:    'dropdown',
				label:   name,
				id:      'strip',
				default: 1 + ofs,
				choices: this.CHOICES,
				minChoicesForSearch: 0
			},{
				type:    'checkbox',
				label:   'Mute',
				id:      'mute',
				default: true
			}]
		}

		this.phantomOptions = (name, qty, ofs) => {
			this.CHOICES = [];
			for (let i = 1; i <= qty; i++) {
				this.CHOICES.push({ label: `${name} ${i}`, id: i + ofs });
			}
			return [{
				type:    'dropdown',
				label:   name,
				id:      'strip',
				default: 1 + ofs,
				choices: this.CHOICES,
				minChoicesForSearch: 0
			},{
				type:    'checkbox',
				label:   'Phantom',
				id:      'phantom',
				default: true
			}]
		}

		this.faderOptions = (name, qty, ofs) => {
			this.CHOICES = [];
			for (let i = 1; i <= qty; i++) {
				this.CHOICES.push({ label: `${name} ${i}`, id: i + ofs });
			}
			return [{
				type:    'dropdown',
				label:   name,
				id:      'strip',
				default: 1 + ofs,
				choices: this.CHOICES,
				minChoicesForSearch: 0
			},{
				type:    'dropdown',
				label:   'Level',
				id:      'level',
				default: 0,
				choices: this.CHOICES_FADER,
				minChoicesForSearch: 0
			}]
		}


		// Actions for dLive
		if (this.config.model == 'dLive') {
			actions['mute_input'] = {
				label: 'Mute Input',
				options: this.muteOptions('Input Channel', 128, -1)
			};	
			actions['mute_mono_group'] = {
				label: 'Mute Mono Group',
				options: this.muteOptions('Mono Group', 62, -1)
			}
			actions['mute_stereo_group'] = {
				label: 'Mute Stereo Group',
				options: this.muteOptions('Stereo Group', 31, 0x3F)
			}
			actions['mute_mono_aux'] = {
				label: 'Mute Mono Aux',
				options: this.muteOptions('Mono Aux', 62, -1)
			}
			actions['mute_stereo_aux'] = {
				label: 'Mute Stereo Aux',
				options: this.muteOptions('Stereo Aux', 31, 0x3F)
			}
			actions['mute_mono_matrix'] = {
				label: 'Mute Mono Matrix',
				options: this.muteOptions('Mono Matrix', 62, -1)
			}
			actions['mute_stereo_matrix'] = {
				label: 'Mute Stereo Matrix',
				options: this.muteOptions('Stereo Matrix', 31, 0x3F)
			}	
			actions['mute_mono_fx_send'] = {
				label: 'Mute Mono FX Send',
				options: this.muteOptions('Mono FX Send', 16, -1)
			};
			actions['mute_stereo_fx_send'] = {
				label: 'Mute Stereo FX Send',
				options: this.muteOptions('Stereo FX Send', 16, 0x0F)
			};
			actions['mute_fx_return'] = {
				label: 'Mute FX Return',
				options: this.muteOptions('FX Return', 16, 0x1F)
			};
			actions['mute_master'] = {
				label: 'Mute Group Master',
				options: this.muteOptions('Mute Group Master', 8, 0x4D)
			};
			actions['mute_dca'] = {
				label: 'Mute DCA',
				options: this.muteOptions('DCA', 24, 0x35)
			};
			actions['fader_input'] = {
				label: 'Set Input Fader to Level',
				options: this.faderOptions('Channel', 128, -1)
			}
			actions['fader_mono_group'] = {
				label: 'Set Mono Group Master Fader to Level',
				options: this.faderOptions('Mono Group', 62, -1)
			}
			actions['fader_stereo_group'] = {
				label: 'Set Stereo Group Master Fader to Level',
				options: this.faderOptions('Stereo Group', 31, 0x3F)
			}
			actions['fader_mono_aux'] = {
				label: 'Set Mono Aux Master Fader to Level',
				options: this.faderOptions('Mono Aux', 62, -1)
			}
			actions['fader_stereo_aux'] = {
				label: 'Set Stereo Aux Master Fader to Level',
				options: this.faderOptions('Stereo Aux', 31, 0x3F)
			}
			actions['fader_mono_matrix'] = {
				label: 'Set Mono Matrix Master Fader to Level',
				options: this.faderOptions('Mono Matrix', 62, -1)
			}
			actions['fader_stereo_matrix'] = {
				label: 'Set Stereo Matrix Master Fader to Level',
				options: this.faderOptions('Stereo Matrix', 31, 0x3F)
			}		
			actions['fader_mono_fx_send'] = {
				label: 'Set Mono FX Send Master Fader to Level',
				options: this.faderOptions('Mono FX Send', 16, -1)
			}
			actions['fader_stereo_fx_send'] = {
				label: 'Set Stereo FX Send Master Fader to Level',
				options: this.faderOptions('Stereo FX Send', 16, 0x0F)
			}
			actions['fader_fx_return'] = {
				label: 'Set FX Return Fader to Level',
				options: this.faderOptions('FX Return', 16, 0x1F)
			}
			actions['fader_DCA'] = {
				label: 'Set DCA Fader to Level',
				options: this.faderOptions('DCA', 24, 0x35)
			}	
	
		} else if (this.config.model == 'qu16') {
			actions['mute_input'] = {
				label: 'Mute Input',
				options: this.muteOptions('Input Channel', 32, 0x1F)
			};
		} else { // Actions for iLive
			actions['mute_input'] = {
				label: 'Mute Input',
				options: this.muteOptions('Input Channel', 64, 0x1F)
			};
			actions['mute_mix'] = {
				label: 'Mute Mix',
				options: this.muteOptions('Mix', 32, 0x5F)
			};
			actions['mute_mono_fx_send'] = {
				label: 'Mute FX Send',
				options: this.muteOptions('FX Send', 8, -1)
			};
			actions['mute_fx_return'] = {
				label: 'Mute FX Return',
				options: this.muteOptions('FX Return', 8, 0x07)
			};
			actions['mute_dca'] = {
				label: 'Mute DCA',
				options: this.muteOptions('DCA', 16, 0x0F)
			};			

			actions['fader_input'] = {
				label: 'Set Input Fader to Level',
				options: this.faderOptions('Channel', 64, 0x1F)
			}
			actions['fader_mix'] = {
				label: 'Set Mix Fader to Level',
				options: this.faderOptions('Mix', 32, 0x5F)
			}
			actions['fader_mono_fx_send'] = {
				label: 'Set FX Send Master Fader to Level',
				options: this.faderOptions('FX Send', 8, -1)
			}	
			actions['fader_fx_return'] = {
				label: 'Set FX Return Fader to Level',
				options: this.faderOptions('FX Return', 8, 0x07)
			}
			actions['fader_DCA'] = {
				label: 'Set DCA Fader to Level',
				options: this.faderOptions('DCA', 16, 0x0F)
			}	

		}
	
		actions['phantom'] = {
			label: 'Toggle 48v Phantom on Preamp',
			options: this.phantomOptions('Preamp', this.chCount, -1)
		}


		actions['dca_assign'] = {
			label: 'Assign DCA Groups for channel',
			options: [{
				type:    'dropdown',
				label:   'Input Channel',
				id:      'inputChannel',
				default: '0',
				choices: this.CHOICES_INPUT_CHANNEL,
				minChoicesForSearch: 0
			},{
				type:     'dropdown',
				label:    'DCA',
				id:       'dcaGroup',
				default:  [],
				multiple: true,
				choices:  this.CHOICES_DCA
			}]
		};

		if (this.config.model == 'dLive') {

			actions['mute_assign'] = {
				label: 'Assign Mute Groups for channel',
				options: [{
					type:    'dropdown',
					label:   'Input Channel',
					id:      'inputChannel',
					default: '0',
					choices: this.CHOICES_INPUT_CHANNEL,
					minChoicesForSearch: 0
				},{
					type:     'dropdown',
					label:    'MUTE',
					id:       'muteGroup',
					default:  [],
					multiple: true,
					choices:  this.CHOICES_MUTE
				}]
			};
				
			actions['vsc'] = {
				label: 'Virtual Soundcheck',
				options: [{
					type:    'dropdown',
					label:   'VSC Mode',
					id:      'vscMode',
					default: 0,
					choices: [
						{ label: "Inactive",           id: 0 },
						{ label: "Record Send",        id: 1 },
						{ label: "Virtual SoundCheck", id: 2 }
					]
				}]
			};

			actions['talkback_on'] = {
				label: 'Talkback On',
				options: [{
					type:    'checkbox',
					label:   'ON',
					id:      'on',
					default: true,
				}]
			};

		}

		actions['scene_recall'] = {
			label: 'Scene recall',
			options: [{
				type:    'dropdown',
				label:   'Scene Number',
				id:      'sceneNumber',
				default: '0',
				choices: this.CHOICES_SCENES,
				minChoicesForSearch: 0
			}]
		};

		return actions;
	
	}
}
