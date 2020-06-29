module.exports = {

    addUpgradeScripts() {

        console.log('Running upgrade script.');
        // this.config._configIdx = -1; // For Debugging upgradeScript only

        // Upgrade  1.0.x > 1.2.0
        this.addUpgradeScript((config, actions, releaseActions, feedbacks) => {
        
            let changed = false;
            let dcaChArr  = [];
 
            console.log('Running 1.0.x -> 1.2.0 Upgrade.');
        
            let checkUpgrade = ((action, changed) => {
                let newAction = '';
 
                switch (action.action) {
                    case 'mute_input':
                        newAction           = action.action;
                        action.options.mute = (action.options.mute == 'mute_on' ? true : false);
                        break;
                    case 'dca_assignment_on':
                        if (dcaChArr[action.options.inputChannel] == undefined) {
                            dcaChArr[action.options.inputChannel] = [];
                        }
                        newAction = 'dca_assign';
                        dcaChArr[action.options.inputChannel].push(`${(action.options.dcaChannel & 0x3F)}`);
                        break;
                    case 'scene_recall_128':
                    case 'scene_recall_256':
                    case 'scene_recall_384':
                    case 'scene_recall_500':
                        newAction = 'scene_recall';
                        break;
                }

                if (newAction != '') {
                    console.log(`Action ${action.action} => ${newAction}`);
                    action.action =  newAction;
                    action.label = this.id + ':' + action.action;
                    changed = true;
                }

                return changed;

            });

            for (let k in actions) {
                changed = checkUpgrade(actions[k], changed);
            }

            for (let k in actions) {
                if (actions[k].action == 'dca_assign') {
                    actions[k].options['dcaGroup'] = dcaChArr[actions[k].options.inputChannel];
                }
            }

            dcaChArr = [];
            for (let k in releaseActions) {
                changed = checkUpgrade(releaseActions[k], changed);
            }
            for (let k in releaseActions) {
                if (releaseActions[k].action == 'dca_assign') {
                    releaseActions[k].options['dcaGroup'] = dcaChArr[releaseActions[k].options.inputChannel];
                }
            }

          return changed;
        
        });
    }
}