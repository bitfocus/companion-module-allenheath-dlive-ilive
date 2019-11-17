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

		actions['mute_input'] = {
				label: 'Mute input',
				options: [{
					type: 'dropdown',
					label: 'Input channel',
					id: 'inputChannel',
					default: '0',
					choices: this.CHOICES_INPUT_CHANNEL
				},{
					type: 'dropdown',
					label: 'Mute',
					id: 'mute',
					default: 'mute_on',
					choices: [{ label: 'mute on', id: 'mute_on' }, { label: 'mute off', id: 'mute_off' }]
				}]
		};

		actions['channel_select'] = {
				label: 'Select channel',
				options: [{
					type: 'dropdown',
					label: 'Input channel',
					id: 'inputChannel',
					default: '0',
					choices: this.CHOICES_INPUT_CHANNEL
				}]
		};

		actions['main_assignment'] = {
				label: 'Channel Assignment to Main Mix',
				options: [{
					type: 'dropdown',
					label: 'Input channel',
					id: 'inputChannel',
					default: '0',
					choices: this.CHOICES_INPUT_CHANNEL
				},{
					type: 'dropdown',
					label: 'on/off',
					id: 'main_mix',
					default: 'on',
					choices: [{ label: 'on', id: 'on' }, { label: 'off', id: 'off' }]
				}]
		};

		actions['dca_assignment_on'] = {
				label: 'Set DCA on channel on',
				options: [{
					type: 'dropdown',
					label: 'Input channel',
					id: 'inputChannel',
					default: '0',
					choices: this.CHOICES_INPUT_CHANNEL
				},{
					type: 'dropdown',
					label: 'DCA',
					id: 'dcaChannel',
					choices: this.CHOICES_DCA_ON_CHANNEL
				}]
		};

		actions['dca_assignment_off'] = {
				label: 'Set DCA on channel off',
				options: [{
					type: 'dropdown',
					label: 'Input channel',
					id: 'inputChannel',
					default: '0',
					choices: this.CHOICES_INPUT_CHANNEL
				},{
					type: 'dropdown',
					label: 'DCA',
					id: 'dcaChannel',
					choices: this.CHOICES_DCA_OFF_CHANNEL
				}]
		};

		actions['channel_name'] = {
				label: 'Set Channel name',
				options: [{
					type: 'dropdown',
					label: 'Input channel',
					id: 'inputChannel',
					default: '0',
					choices: this.CHOICES_INPUT_CHANNEL
				},{
					type: 'textinput',
					label: 'Name (max 5char.)',
					id: 'chName'
				}]
		};

		actions['channel_color'] = {
				label: 'Set Channel color',
				options: [{
					type: 'dropdown',
					label: 'Input channel',
					id: 'inputChannel',
					default: '0',
					choices: this.CHOICES_INPUT_CHANNEL
				},{
					type: 'dropdown',
					label: 'Color',
					id: 'channelColor',
					choices: this.CHOICES_COLOR
				}]
		};

		actions['scene_recall_128'] = {
				label: 'Scene recall 1-128',
				options: [{
					type: 'dropdown',
					label: 'Scene number',
					id: 'sceneNumber',
					default: '0',
					choices: this.CHOICES_INPUT_CHANNEL
				}]
		};

		actions['scene_recall_256'] = {
				label: 'Scene recall 129-256',
				options: [{
					type: 'dropdown',
					label: 'Scene number',
					id: 'sceneNumber',
					default: '128',
					choices: this.CHOICES_INPUT_CHANNEL_256
				}]
		};

		actions['scene_recall_384'] = {
				label: 'Scene recall 257-384',
				options: [{
					type: 'dropdown',
					label: 'Scene number',
					id: 'sceneNumber',
					default: '256',
					choices: this.CHOICES_INPUT_CHANNEL_384
				}]
		};

		actions['scene_recall_500'] = {
				label: 'Scene recall 385-500',
				options: [{
					type: 'dropdown',
					label: 'Scene number',
					id: 'sceneNumber',
					default: '384',
					choices: this.CHOICES_INPUT_CHANNEL_500
				}]
		};
		return actions;
	}
}
