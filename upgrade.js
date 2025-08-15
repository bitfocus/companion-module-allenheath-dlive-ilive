const upgradeScripts = [
	// Upgrade 1.2.0 > 1.3.0 (adding iLive functions)
	function (context, props) {
		const result = {
			updatedConfig: null,
			updatedActions: [],
			updatedFeedbacks: [],
		}

		if (props.config) {
			if (props.config.model === undefined) {
				result.updatedConfig = { ...props.config, model: 'dLive' }
			}
		}

		return result
	},

	// Upgrade 1.0.x > 1.2.0
	function (context, props) {
		const result = {
			updatedConfig: null,
			updatedActions: [],
			updatedFeedbacks: [],
		}

		let dcaChArr = []
		
		console.log('Running 1.0.x -> 1.2.0 Upgrade.')

		for (let action of props.actions) {
			let newAction = { ...action }
			let changed = false

			switch (action.actionId) {
				case 'mute_input':
					newAction.options.mute = action.options.mute == 'mute_on' ? true : false
					changed = true
					break
				case 'dca_assignment_on':
					if (dcaChArr[action.options.inputChannel] == undefined) {
						dcaChArr[action.options.inputChannel] = []
					}
					newAction.actionId = 'dca_assign'
					dcaChArr[action.options.inputChannel].push(`${action.options.dcaChannel & 0x3f}`)
					changed = true
					break
				case 'scene_recall_128':
				case 'scene_recall_256':
				case 'scene_recall_384':
				case 'scene_recall_500':
					newAction.actionId = 'scene_recall'
					changed = true
					break
			}

			if (changed) {
				console.log(`Action ${action.actionId} => ${newAction.actionId}`)
				result.updatedActions.push(newAction)
			}
		}

		// Update DCA assignments
		for (let action of result.updatedActions) {
			if (action.actionId == 'dca_assign') {
				action.options['dcaGroup'] = dcaChArr[action.options.inputChannel]
			}
		}

		return result
	},
]

module.exports = upgradeScripts

