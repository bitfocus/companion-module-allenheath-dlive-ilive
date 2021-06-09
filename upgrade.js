module.exports = [
	// Upgrage 1.2.0 > 1.3.0 (adding iLive functions)
	function (context, config, actions, feedbacks) {
		let changed = false

		if (config) {
			if (config.model === undefined) {
				config.model = 'dLive'
				changed = true
			}
		}

		return changed
	},

	// Upgrade  1.0.x > 1.2.0
	function (cntext, config, actions, releaseActions, feedbacks) {
		let changed = false
		let dcaChArr = []

		console.log('Running 1.0.x -> 1.2.0 Upgrade.')

		let checkUpgrade = (action, changed) => {
			let newAction = ''

			switch (action.action) {
				case 'mute_input':
					newAction = action.action
					action.options.mute = action.options.mute == 'mute_on' ? true : false
					break
				case 'dca_assignment_on':
					if (dcaChArr[action.options.inputChannel] == undefined) {
						dcaChArr[action.options.inputChannel] = []
					}
					newAction = 'dca_assign'
					dcaChArr[action.options.inputChannel].push(`${action.options.dcaChannel & 0x3f}`)
					break
				case 'scene_recall_128':
				case 'scene_recall_256':
				case 'scene_recall_384':
				case 'scene_recall_500':
					newAction = 'scene_recall'
					break
			}

			if (newAction != '') {
				console.log(`Action ${action.action} => ${newAction}`)
				action.action = newAction
				changed = true
			}

			return changed
		}

		for (let k in actions) {
			changed = checkUpgrade(actions[k], changed)
		}

		for (let k in actions) {
			if (actions[k].action == 'dca_assign') {
				actions[k].options['dcaGroup'] = dcaChArr[actions[k].options.inputChannel]
			}
		}

		return changed
	},
]

