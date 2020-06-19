module.exports = {

    addUpgradeScripts() {

        console.log('Running upgrade script.');
        
        // Upgrade  1.0.x > 1.2.0
        this.addUpgradeScript((config, actions, releaseActions, feedbacks) => {
            let changed = false;
            console.log('Running 1.0.x -> 1.2.0 Upgrade.')
        
            let checkUpgrade = function(action, changed) {
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
                        dcaChArr[action.options.inputChannel].push(action.options.dcaChannel);
                        break;
                    case 'scene_recall_128':
                    case 'scene_recall_256':
                    case 'scene_recall_384':
                    case 'scene_recall_500':
                        newAction = 'scene_recall';
                        break;
                }

                if(newAction != '') {
                    console.log(`Action ${action.action} => ${newAction}`);
                    action.action =  newAction;
                    action.label = this.id + ':' + action.action;
                    changed = true;
                }

                return changed;
            }

            let dcaChArr = [];
            for (let k in actions) {
                changed = checkUpgrade(actions[k], changed);
            }
            for (let k in actions) {
                let a = actions[k];
                if (a.action = 'dca_assign') {
                    a.action.options.dcaGroup = dcaChArr[a.action.options.inputChannel];
                }
            }

            dcaChArr = [];
            for (let k in releaseActions) {
                changed = checkUpgrade(releaseActions[k], changed);
            }
            for (let k in releaseActions) {
                let r = releaseActions[k];
                if (r.action = 'dca_assign') {
                    r.action.options.dcaGroup = dcaChArr[r.action.options.inputChannel];
                }
            }

            return changed;
        
        });
    }
}