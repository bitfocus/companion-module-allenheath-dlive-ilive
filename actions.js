module.exports = {

	/**
	* Get the available actions.
	*
	* @returns {Object[]} the available actions
	* @access public
	* @since 1.2.0
	*/

	getActions() {
		let self = this;
		let actions = {};

		self.CHOICES_INPUT_CHANNEL = [];
		for (let i = 0; i < 128; i++) {
			self.CHOICES_INPUT_CHANNEL.push({ label: `CH ${i + 1}`, id: i });
		}
		
		self.CHOICES_SCENES = [];
		for (let i = 0; i < 500; i++) {
			self.CHOICES_SCENES.push({ label: `SCENE ${i + 1}`, id: i });
		}

		self.CHOICES_DCA = [];
		for (let i = 0; i < 24; i++) {
			self.CHOICES_DCA.push({ label: `DCA ${i + 1}`, id: i });
		}

		self.CHOICES_MUTE = [];
		for (let i = 0; i < 8; i++) {
			self.CHOICES_MUTE.push({ label: `MUTE ${i + 1}`, id: i });
		}

		self.muteoptions = (name, qty, ofs) => {
			self.CHOICES = [];
			for (let i = 1; i <= qty; i++) {
				self.CHOICES.push({ label: `${name} ${i}`, id: i + ofs });
			}
			return [{
				type:    'dropdown',
				label:   name,
				id:      'strip',
				default: 1 + ofs,
				choices: self.CHOICES
			},{
				type:    'checkbox',
				label:   'Mute',
				id:      'mute',
				default: true
			}]
		}

		actions['mute_input'] = {
			label: 'Mute Input',
			options: self.muteoptions('Input Channel', 128, -1)
		};

		actions['mute_mono_group'] = {
			label: 'Mute Mono Group',
			options: self.muteoptions('Mono Group', 62, -1)
		}

		actions['mute_stereo_group'] = {
			label: 'Mute Stereo Group',
			options: self.muteoptions('Stereo Group', 31, 0x3F)
		}

		actions['mute_mono_aux'] = {
			label: 'Mute Mono Aux',
			options: self.muteoptions('Mono Aux', 62, -1)
		}

		actions['mute_stereo_aux'] = {
			label: 'Mute Stereo Aux',
			options: self.muteoptions('Stereo Aux', 31, 0x3F)
		}

		actions['mute_mono_matrix'] = {
			label: 'Mute Mono Matrix',
			options: self.muteoptions('Mono Matrix', 62, -1)
		}

		actions['mute_stereo_matrix'] = {
			label: 'Mute Stereo Matrix',
			options: self.muteoptions('Stereo Matrix', 31, 0x3F)
		}

		actions['mute_mono_fx_send'] = {
			label: 'Mute Mono FX Send',
			options: self.muteoptions('Mono FX Send', 16, -1)
		};

		actions['mute_stereo_fx_send'] = {
			label: 'Mute Stereo FX Send',
			options: self.muteoptions('Stereo FX Send', 16, 0x0F)
		};

		actions['mute_fx_return'] = {
			label: 'Mute FX Return',
			options: self.muteoptions('Stereo FX Return', 16, 0x1F)
		};

		actions['mute_dca'] = {
			label: 'Mute DCA',
			options: self.muteoptions('DCA', 24, 0x35)
		};			

		actions['mute_master'] = {
			label: 'Mute Group Master',
			options: self.muteoptions('Mute Group Master', 8, 0x4D)
		};


		actions['dca_assign'] = {
			label: 'Assign DCA Groups for channel',
			options: [{
				type:    'dropdown',
				label:   'Input Channel',
				id:      'inputChannel',
				default: '0',
				choices: self.CHOICES_INPUT_CHANNEL
			},{
				type:     'dropdown',
				label:    'DCA',
				id:       'dcaGroup',
				default:  [],
				multiple: true,
				choices:  self.CHOICES_DCA
			}]
		};

		actions['mute_assign'] = {
			label: 'Assign Mute Groups for channel',
			options: [{
				type:    'dropdown',
				label:   'Input Channel',
				id:      'inputChannel',
				default: '0',
				choices: self.CHOICES_INPUT_CHANNEL
			},{
				type:     'dropdown',
				label:    'MUTE',
				id:       'muteGroup',
				default:  [],
				multiple: true,
				choices:  self.CHOICES_MUTE
			}]
		};

		actions['scene_recall'] = {
			label: 'Scene recall',
			options: [{
				type:    'dropdown',
				label:   'Scene Number',
				id:      'sceneNumber',
				default: '0',
				choices: self.CHOICES_SCENES
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

		return actions;
	
	}
}
