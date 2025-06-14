// feedbacks.js - Feedbacks for dLive module
const { combineRgb } = require('@companion-module/base')

function getFeedbacks(instance) {
	const feedbacks = {}

	// Connection Status Feedback
	feedbacks.connectionStatus = {
		type: 'boolean',
		name: 'Connection Status',
		description: 'Shows if module is connected to dLive',
		defaultStyle: {
			bgcolor: combineRgb(0, 255, 0),
			color: combineRgb(0, 0, 0)
		},
		options: [
			{
				type: 'dropdown',
				label: 'Connection Type',
				id: 'connectionType',
				default: 'any',
				choices: [
					{ id: 'any', label: 'Any Connection' },
					{ id: 'mixrack', label: 'MixRack Only' },
					{ id: 'surface', label: 'Surface Only' },
					{ id: 'both', label: 'Both Connected' }
				]
			}
		],
		callback: (feedback) => {
			const mixrackConnected = instance.getVariableValue('mixrack_connected') === 'Yes'
			const surfaceConnected = instance.getVariableValue('surface_connected') === 'Yes'
			
			switch (feedback.options.connectionType) {
				case 'any':
					return mixrackConnected || surfaceConnected
				case 'mixrack':
					return mixrackConnected
				case 'surface':
					return surfaceConnected
				case 'both':
					return mixrackConnected && surfaceConnected
				default:
					return false
			}
		}
	}

	// Input Channel Mute Status
	feedbacks.inputMuteStatus = {
		type: 'boolean',
		name: 'Input Channel Mute Status',
		description: 'Shows mute status of input channel',
		defaultStyle: {
			bgcolor: combineRgb(255, 0, 0),
			color: combineRgb(255, 255, 255)
		},
		options: [
			{
				type: 'number',
				label: 'Input Channel',
				id: 'channel',
				default: 1,
				min: 1,
				max: 128,
				required: true
			}
		],
		callback: (feedback) => {
			const channel = parseInt(feedback.options.channel)
			const muteStatus = instance.getVariableValue(`mute_input_${channel}`)
			return muteStatus === 'ON'
		}
	}

	// DCA Mute Status
	feedbacks.dcaMuteStatus = {
		type: 'boolean',
		name: 'DCA Mute Status',
		description: 'Shows mute status of DCA',
		defaultStyle: {
			bgcolor: combineRgb(255, 0, 0),
			color: combineRgb(255, 255, 255)
		},
		options: [
			{
				type: 'number',
				label: 'DCA Number',
				id: 'dca',
				default: 1,
				min: 1,
				max: 24,
				required: true
			}
		],
		callback: (feedback) => {
			const dca = parseInt(feedback.options.dca)
			const muteStatus = instance.getVariableValue(`mute_dca_${dca}`)
			return muteStatus === 'ON'
		}
	}

	// Mix Bus Mute Status
	feedbacks.mixBusMuteStatus = {
		type: 'boolean',
		name: 'Mix Bus Mute Status',
		description: 'Shows mute status of mix bus',
		defaultStyle: {
			bgcolor: combineRgb(255, 0, 0),
			color: combineRgb(255, 255, 255)
		},
		options: [
			{
				type: 'dropdown',
				label: 'Bus Type',
				id: 'busType',
				default: 'aux',
				choices: [
					{ id: 'aux', label: 'Aux Bus' },
					{ id: 'group', label: 'Group' },
					{ id: 'matrix', label: 'Matrix' }
				]
			},
			{
				type: 'dropdown',
				label: 'Channel Type',
				id: 'channelType',
				default: 'mono',
				choices: [
					{ id: 'mono', label: 'Mono' },
					{ id: 'stereo', label: 'Stereo' }
				]
			},
			{
				type: 'number',
				label: 'Channel Number',
				id: 'channel',
				default: 1,
				min: 1,
				max: 62,
				required: true
			}
		],
		callback: (feedback) => {
			const busType = feedback.options.busType
			const channelType = feedback.options.channelType
			const channel = parseInt(feedback.options.channel)
			
			const variableId = `mute_${channelType}_${busType}_${channel}`
			const muteStatus = instance.getVariableValue(variableId)
			return muteStatus === 'ON'
		}
	}

	// DCA Assignment Status
	feedbacks.dcaAssignmentStatus = {
		type: 'boolean',
		name: 'DCA Assignment Status',
		description: 'Shows if channel is assigned to DCA',
		defaultStyle: {
			bgcolor: combineRgb(0, 255, 0),
			color: combineRgb(0, 0, 0)
		},
		options: [
			{
				type: 'number',
				label: 'Input Channel',
				id: 'channel',
				default: 1,
				min: 1,
				max: 128,
				required: true
			},
			{
				type: 'number',
				label: 'DCA Number',
				id: 'dca',
				default: 1,
				min: 1,
				max: 24,
				required: true
			}
		],
		callback: (feedback) => {
			const channel = parseInt(feedback.options.channel) - 1
			const dca = parseInt(feedback.options.dca)
			
			const assignStatus = instance.getVariableValue(`dca_assign_ch${channel}_dca${dca}`)
			return assignStatus === 'ON'
		}
	}

	// Scene Status
	feedbacks.currentScene = {
		type: 'boolean',
		name: 'Current Scene',
		description: 'Shows if specified scene is current',
		defaultStyle: {
			bgcolor: combineRgb(0, 0, 255),
			color: combineRgb(255, 255, 255)
		},
		options: [
			{
				type: 'number',
				label: 'Scene Number',
				id: 'scene',
				default: 1,
				min: 1,
				max: 500,
				required: true
			}
		],
		callback: (feedback) => {
			const sceneNumber = parseInt(feedback.options.scene)
			const currentScene = parseInt(instance.getVariableValue('current_scene'))
			return currentScene === sceneNumber
		}
	}

	// MIDI Activity Indicator
	feedbacks.midiActivity = {
		type: 'boolean',
		name: 'MIDI Activity',
		description: 'Shows recent MIDI activity',
		defaultStyle: {
			bgcolor: combineRgb(0, 255, 255),
			color: combineRgb(0, 0, 0)
		},
		options: [
			{
				type: 'number',
				label: 'Activity Timeout (seconds)',
				id: 'timeout',
				default: 5,
				min: 1,
				max: 60
			},
			{
				type: 'dropdown',
				label: 'Source Filter',
				id: 'source',
				default: 'any',
				choices: [
					{ id: 'any', label: 'Any Source' },
					{ id: 'mixrack', label: 'MixRack Only' },
					{ id: 'surface', label: 'Surface Only' }
				]
			}
		],
		callback: (feedback) => {
			const lastActivity = instance.getVariableValue('last_midi_activity')
			const source = instance.getVariableValue('last_midi_source')
			const timeout = parseInt(feedback.options.timeout) * 1000
			
			if (!lastActivity || lastActivity === 'None') {
				return false
			}
			
			// Check source filter
			if (feedback.options.source !== 'any' && source !== feedback.options.source) {
				return false
			}
			
			const activityTime = new Date(lastActivity).getTime()
			const currentTime = new Date().getTime()
			
			return (currentTime - activityTime) < timeout
		}
	}

	// Preamp Status
	feedbacks.preampPhantomStatus = {
		type: 'boolean',
		name: 'Preamp Phantom Power Status',
		description: 'Shows phantom power status',
		defaultStyle: {
			bgcolor: combineRgb(255, 165, 0),
			color: combineRgb(0, 0, 0)
		},
		options: [
			{
				type: 'number',
				label: 'Socket Number',
				id: 'socket',
				default: 1,
				min: 1,
				max: 128,
				required: true
			}
		],
		callback: (feedback) => {
			const socket = parseInt(feedback.options.socket)
			const phantomStatus = instance.getVariableValue(`preamp_phantom_socket${socket}`)
			return phantomStatus === 'ON'
		}
	}

	// UFX Status
	feedbacks.ufxKeyScale = {
		type: 'boolean',
		name: 'UFX Key/Scale Status',
		description: 'Shows if UFX is set to specific key/scale',
		defaultStyle: {
			bgcolor: combineRgb(128, 0, 128),
			color: combineRgb(255, 255, 255)
		},
		options: [
			{
				type: 'dropdown',
				label: 'Check Type',
				id: 'checkType',
				default: 'key',
				choices: [
					{ id: 'key', label: 'Key Only' },
					{ id: 'scale', label: 'Scale Only' },
					{ id: 'both', label: 'Key and Scale' }
				]
			},
			{
				type: 'dropdown',
				label: 'Key',
				id: 'key',
				default: 'C',
				choices: [
					{ id: 'C', label: 'C' },
					{ id: 'C#', label: 'C#' },
					{ id: 'D', label: 'D' },
					{ id: 'D#', label: 'D#' },
					{ id: 'E', label: 'E' },
					{ id: 'F', label: 'F' },
					{ id: 'F#', label: 'F#' },
					{ id: 'G', label: 'G' },
					{ id: 'G#', label: 'G#' },
					{ id: 'A', label: 'A' },
					{ id: 'A#', label: 'A#' },
					{ id: 'B', label: 'B' }
				],
				isVisible: (options) => options.checkType === 'key' || options.checkType === 'both'
			},
			{
				type: 'dropdown',
				label: 'Scale',
				id: 'scale',
				default: 'Major',
				choices: [
					{ id: 'Major', label: 'Major' },
					{ id: 'Minor', label: 'Minor' }
				],
				isVisible: (options) => options.checkType === 'scale' || options.checkType === 'both'
			}
		],
		callback: (feedback) => {
			const checkType = feedback.options.checkType
			const currentKey = instance.getVariableValue('ufx_global_key')
			const currentScale = instance.getVariableValue('ufx_global_scale')
			
			let keyMatches = true
			let scaleMatches = true
			
			if (checkType === 'key' || checkType === 'both') {
				keyMatches = currentKey === feedback.options.key
			}
			
			if (checkType === 'scale' || checkType === 'both') {
				scaleMatches = currentScale === feedback.options.scale
			}
			
			return keyMatches && scaleMatches
		}
	}

	// Fader Level Range
	feedbacks.faderLevelRange = {
		type: 'boolean',
		name: 'Fader Level Range',
		description: 'Shows if fader is within specified range',
		defaultStyle: {
			bgcolor: combineRgb(255, 255, 0),
			color: combineRgb(0, 0, 0)
		},
		options: [
			{
				type: 'number',
				label: 'Channel',
				id: 'channel',
				default: 1,
				min: 0,
				max: 127,
				required: true
			},
			{
				type: 'number',
				label: 'Channel Offset',
				id: 'offset',
				default: 0,
				min: 0,
				max: 4,
				required: true,
				tooltip: '0=Input, 1=Group, 2=Aux, 3=Matrix, 4=DCA'
			},
			{
				type: 'number',
				label: 'Minimum Level',
				id: 'minLevel',
				default: 100,
				min: 0,
				max: 127,
				required: true
			},
			{
				type: 'number',
				label: 'Maximum Level',
				id: 'maxLevel',
				default: 127,
				min: 0,
				max: 127,
				required: true
			}
		],
		callback: (feedback) => {
			const channel = parseInt(feedback.options.channel)
			const offset = parseInt(feedback.options.offset)
			const minLevel = parseInt(feedback.options.minLevel)
			const maxLevel = parseInt(feedback.options.maxLevel)
			
			const currentLevel = parseInt(instance.getVariableValue(`fader_level_ch${channel}_offset${offset}`)) || 0
			
			return currentLevel >= minLevel && currentLevel <= maxLevel
		}
	}

	// Console Model
	feedbacks.consoleModel = {
		type: 'boolean',
		name: 'Console Model',
		description: 'Shows if connected to specific console type',
		defaultStyle: {
			bgcolor: combineRgb(100, 100, 100),
			color: combineRgb(255, 255, 255)
		},
		options: [
			{
				type: 'dropdown',
				label: 'Console Type',
				id: 'model',
				default: 'dLive',
				choices: [
					{ id: 'dLive', label: 'dLive' },
					{ id: 'iLive', label: 'iLive' }
				]
			}
		],
		callback: (feedback) => {
			const currentModel = instance.getVariableValue('console_model')
			return currentModel === feedback.options.model
		}
	}

	// MIDI Message Type Filter
	feedbacks.lastMidiType = {
		type: 'boolean',
		name: 'Last MIDI Message Type',
		description: 'Shows if last MIDI message was of specific type',
		defaultStyle: {
			bgcolor: combineRgb(0, 128, 255),
			color: combineRgb(255, 255, 255)
		},
		options: [
			{
				type: 'dropdown',
				label: 'Message Type',
				id: 'messageType',
				default: 'note_on',
				choices: [
					{ id: 'note_on', label: 'Note On' },
					{ id: 'note_off', label: 'Note Off' },
					{ id: 'control_change', label: 'Control Change' },
					{ id: 'program_change', label: 'Program Change' },
					{ id: 'pitch_bend', label: 'Pitch Bend' },
					{ id: 'sysex', label: 'System Exclusive' }
				]
			},
			{
				type: 'number',
				label: 'Activity Timeout (seconds)',
				id: 'timeout',
				default: 10,
				min: 1,
				max: 60
			}
		],
		callback: (feedback) => {
			const lastType = instance.getVariableValue('last_midi_type')
			const lastActivity = instance.getVariableValue('last_midi_activity')
			const timeout = parseInt(feedback.options.timeout) * 1000
			
			if (!lastActivity || lastActivity === 'None') {
				return false
			}
			
			const activityTime = new Date(lastActivity).getTime()
			const currentTime = new Date().getTime()
			
			const withinTimeout = (currentTime - activityTime) < timeout
			const typeMatches = lastType === feedback.options.messageType
			
			return withinTimeout && typeMatches
		}
	}

	return feedbacks
}

module.exports = {
	getFeedbacks
}