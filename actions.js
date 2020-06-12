module.exports = {

	/**
	* Get the available actions.
	*
	* @returns {Object[]} the available actions
	* @access public
	* @since 1.1.0
	*/

	getActions() {

		var actions = {};

		this.CHOICES_INPUT_CHANNEL = [];
		for (var i = 0; i < 128; i++) {
			this.CHOICES_INPUT_CHANNEL.push({ label: `CH ${i + 1}`, id: i });
		}
		
		this.CHOICES_FX_BUS = [];
		for (var i = 0; i < 16; i++) {
			this.CHOICES_FX_BUS.push({ label: `FX ${i + 1}`, id: i });
		}
		
		this.CHOICES_SCENES = [];
		for (var i = 0; i < 500; i++) {
			this.CHOICES_SCENES.push({ label: `SCENE ${i + 1}`, id: i });
		}

		this.CHOICES_DCA = [];
		for (var i = 0; i < 24; i++) {
			this.CHOICES_DCA.push({ label: `DCA ${i+1}`, id: i });
		}

		this.CHOICES_MUTE = [];
		for (let i = 24; i < 32; i++) {
			this.CHOICES_MUTE.push({ label: `MUTE ${i - 23}`, id: i });
		}

		actions['mute_input'] = {
				label: 'Mute Input',
				options: [{
					type:    'dropdown',
					label:   'Input Channel',
					id:      'inputChannel',
					default: '0',
					choices: this.CHOICES_INPUT_CHANNEL
				},{
					type:    'checkbox',
					label:   'Mute',
					id:      'mute',
					default: true
				}]
		};

		actions['mute_fx_bus'] = {
			label: 'Mute FX Send',
			options: [{
				type:    'dropdown',
				label:   'FX Bus',
				id:      'fxBus',
				default: '0',
				choices: this.CHOICES_FX_BUS
			},{
				type:    'checkbox',
				label:   'Mute',
				id:      'mute',
				default: true
			}]
		};

		actions['mute_group'] = {
				label: 'Mute Group',
				options: [{
					type:    'dropdown',
					label:   'Mute Group',
					id:      'group',
					default: '24',
					choices: this.CHOICES_MUTE
				},{
					type:    'checkbox',
					label:   'Mute',
					id:      'mute',
					default: true
				}]
		};

		actions['mute_dca'] = {
			label: 'Mute DCA',
			options: [{
				type:    'dropdown',
				label:   'Mute DCA',
				id:      'group',
				default: '0',
				choices: this.CHOICES_DCA
			},{
				type:    'checkbox',
				label:   'Mute',
				id:      'mute',
				default: true
			}]
		};			


		actions['dca_assign'] = {
			label: 'Assign DCA Groups for channel',
			options: [{
				type:    'dropdown',
				label:   'Input Channel',
				id:      'inputChannel',
				default: '0',
				choices: this.CHOICES_INPUT_CHANNEL
			},{
				type:     'dropdown',
				label:    'DCA',
				id:       'dcaGroup',
				default:  [],
				multiple: true,
				choices:  this.CHOICES_DCA
			}]
		};

		actions['mute_assign'] = {
			label: 'Assign Mute Groups for channel',
			options: [{
				type:    'dropdown',
				label:   'Input Channel',
				id:      'inputChannel',
				default: '0',
				choices: this.CHOICES_INPUT_CHANNEL
			},{
				type:     'dropdown',
				label:    'MUTE',
				id:       'muteGroup',
				default:  [],
				multiple: true,
				choices:  this.CHOICES_MUTE
			}]
		};

		actions['scene_recall'] = {
			label: 'Scene recall',
			options: [{
				type:    'dropdown',
				label:   'Scene Number',
				id:      'sceneNumber',
				default: '0',
				choices: this.CHOICES_SCENES
			}]
		};

		if (!this.MIDI) {
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
			}			
		}

		return actions;
	
	}
}
