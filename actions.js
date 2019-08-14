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
					default: '1',
					choices: this.CHOICES_INPUT_CHANNEL
				},{
					type: 'dropdown',
					label: 'Mute',
					id: 'mute',
					default: 'mute_on',
					choices: [{ label: 'mute on', id: 'mute_on' }, { label: 'mute off', id: 'mute_off' }]
				}]
		};

		return actions;
	}
}
