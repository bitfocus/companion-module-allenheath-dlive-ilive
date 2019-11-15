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
/*
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
*/
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

		return actions;
	}
}
