// actions.js - Actions for dLive module

function getActions(instance) {
	const actions = {}

	// Input Channel Actions
	actions.muteInputChannel = {
		name: 'Mute Input Channel',
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
				type: 'dropdown',
				label: 'Action',
				id: 'mute',
				default: 'toggle',
				choices: [
					{ id: 'on', label: 'Mute' },
					{ id: 'off', label: 'Unmute' },
					{ id: 'toggle', label: 'Toggle' }
				]
			}
		],
		callback: async (action) => {
			const channel = parseInt(action.options.channel) - 1 // Convert to 0-based
			let isMuted
			
			if (action.options.mute === 'toggle') {
				// Get current state from variable
				const currentState = instance.getVariableValue(`mute_input_${channel + 1}`)
				isMuted = currentState !== 'ON'
			} else {
				isMuted = action.options.mute === 'on'
			}
			
			const command = instance.createMuteCommand(channel, isMuted, 'input')
			instance.sendMidiCommand(command, 'mixrack')
		}
	}

	actions.inputChannelFader = {
		name: 'Input Channel Fader',
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
				label: 'Level (0-127)',
				id: 'level',
				default: 107, // Approximately 0dB
				min: 0,
				max: 127,
				required: true,
				tooltip: '0 = -∞, 107 ≈ 0dB, 127 = +10dB'
			}
		],
		callback: async (action) => {
			const channel = parseInt(action.options.channel) - 1 // Convert to 0-based
			const level = parseInt(action.options.level)
			
			const command = instance.createFaderCommand(channel, level, 'input')
			instance.sendMidiCommand(command, 'mixrack')
		}
	}

	// DCA Actions
	actions.muteDCA = {
		name: 'Mute DCA',
		options: [
			{
				type: 'number',
				label: 'DCA Number',
				id: 'dca',
				default: 1,
				min: 1,
				max: instance.dcaCount,
				required: true
			},
			{
				type: 'dropdown',
				label: 'Action',
				id: 'mute',
				default: 'toggle',
				choices: [
					{ id: 'on', label: 'Mute' },
					{ id: 'off', label: 'Unmute' },
					{ id: 'toggle', label: 'Toggle' }
				]
			}
		],
		callback: async (action) => {
			const dcaNumber = parseInt(action.options.dca) - 1 // Convert to 0-based
			let isMuted
			
			if (action.options.mute === 'toggle') {
				const currentState = instance.getVariableValue(`mute_dca_${dcaNumber + 1}`)
				isMuted = currentState !== 'ON'
			} else {
				isMuted = action.options.mute === 'on'
			}
			
			const command = instance.createMuteCommand(dcaNumber, isMuted, 'dca')
			instance.sendMidiCommand(command, 'mixrack')
		}
	}

	actions.dcaFader = {
		name: 'DCA Fader',
		options: [
			{
				type: 'number',
				label: 'DCA Number',
				id: 'dca',
				default: 1,
				min: 1,
				max: instance.dcaCount,
				required: true
			},
			{
				type: 'number',
				label: 'Level (0-127)',
				id: 'level',
				default: 107,
				min: 0,
				max: 127,
				required: true
			}
		],
		callback: async (action) => {
			const dcaNumber = parseInt(action.options.dca) - 1
			const level = parseInt(action.options.level)
			
			const command = instance.createFaderCommand(dcaNumber, level, 'dca')
			instance.sendMidiCommand(command, 'mixrack')
		}
	}

	actions.assignToDCA = {
		name: 'Assign Channel to DCA',
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
				max: instance.dcaCount,
				required: true
			},
			{
				type: 'dropdown',
				label: 'Action',
				id: 'assign',
				default: 'toggle',
				choices: [
					{ id: 'on', label: 'Assign' },
					{ id: 'off', label: 'Unassign' },
					{ id: 'toggle', label: 'Toggle' }
				]
			}
		],
		callback: async (action) => {
			const channel = parseInt(action.options.channel) - 1
			const dcaNumber = parseInt(action.options.dca)
			let assign
			
			if (action.options.assign === 'toggle') {
				const currentState = instance.getVariableValue(`dca_assign_ch${channel}_dca${dcaNumber}`)
				assign = currentState !== 'ON'
			} else {
				assign = action.options.assign === 'on'
			}
			
			const command = instance.createDCAAssignCommand(channel, dcaNumber, assign)
			instance.sendMidiCommand(command, 'mixrack')
		}
	}

	// Mix Bus Actions
	actions.muteMixBus = {
		name: 'Mute Mix Bus',
		options: [
			{
				type: 'dropdown',
				label: 'Mix Bus Type',
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
			},
			{
				type: 'dropdown',
				label: 'Action',
				id: 'mute',
				default: 'toggle',
				choices: [
					{ id: 'on', label: 'Mute' },
					{ id: 'off', label: 'Unmute' },
					{ id: 'toggle', label: 'Toggle' }
				]
			}
		],
		callback: async (action) => {
			const channel = parseInt(action.options.channel) - 1
			const busType = action.options.busType
			const channelType = action.options.channelType
			let isMuted
			
			// Calculate note offset for stereo channels
			let note = channel
			if (channelType === 'stereo') {
				note = 0x40 + channel
			}
			
			if (action.options.mute === 'toggle') {
				const variableId = `mute_${channelType}_${busType}_${channel + 1}`
				const currentState = instance.getVariableValue(variableId)
				isMuted = currentState !== 'ON'
			} else {
				isMuted = action.options.mute === 'on'
			}
			
			const command = instance.createMuteCommand(note, isMuted, busType)
			instance.sendMidiCommand(command, 'mixrack')
		}
	}

	// Scene Management
	actions.recallScene = {
		name: 'Recall Scene',
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
		callback: async (action) => {
			const sceneNumber = parseInt(action.options.scene)
			const command = instance.createSceneRecallCommand(sceneNumber)
			instance.sendMidiCommand(command, 'mixrack')
		}
	}

	// Preamp Control
	actions.preampPhantom = {
		name: 'Preamp Phantom Power',
		options: [
			{
				type: 'number',
				label: 'Socket Number',
				id: 'socket',
				default: 1,
				min: 1,
				max: 128,
				required: true
			},
			{
				type: 'dropdown',
				label: 'Action',
				id: 'phantom',
				default: 'toggle',
				choices: [
					{ id: 'on', label: 'On' },
					{ id: 'off', label: 'Off' },
					{ id: 'toggle', label: 'Toggle' }
				]
			}
		],
		callback: async (action) => {
			const socket = parseInt(action.options.socket) - 1
			let phantomOn
			
			if (action.options.phantom === 'toggle') {
				const currentState = instance.getVariableValue(`preamp_phantom_socket${socket + 1}`)
				phantomOn = currentState !== 'ON'
			} else {
				phantomOn = action.options.phantom === 'on'
			}
			
			// Create dLive SysEx message for phantom power
			const phantomValue = phantomOn ? 0x7F : 0x00
			const sysexCommand = Buffer.from([
				0xF0, 0x00, 0x00, 0x1A, 0x50, 0x10, 0x01, 0x00, // dLive SysEx header
				0x0C, socket, phantomValue, 0xF7
			])
			
			instance.sendMidiCommand(sysexCommand, 'mixrack')
		}
	}

	actions.preampGain = {
		name: 'Preamp Gain',
		options: [
			{
				type: 'number',
				label: 'Socket Number',
				id: 'socket',
				default: 1,
				min: 1,
				max: 128,
				required: true
			},
			{
				type: 'number',
				label: 'Gain (0-127)',
				id: 'gain',
				default: 64,
				min: 0,
				max: 127,
				required: true,
				tooltip: 'MIDI value representing gain range'
			}
		],
		callback: async (action) => {
			const socket = parseInt(action.options.socket) - 1
			const gain = parseInt(action.options.gain)
			
			// Pitch bend message for preamp gain
			const pitchBendCommand = Buffer.from([
				0xE0 + instance.baseMidiChannel, socket, gain
			])
			
			instance.sendMidiCommand(pitchBendCommand, 'mixrack')
		}
	}

	// Channel Naming
	actions.setChannelName = {
		name: 'Set Channel Name',
		options: [
			{
				type: 'number',
				label: 'Channel Number',
				id: 'channel',
				default: 1,
				min: 1,
				max: 128,
				required: true
			},
			{
				type: 'textinput',
				label: 'Channel Name',
				id: 'name',
				default: '',
				required: true
			}
		],
		callback: async (action) => {
			const channel = parseInt(action.options.channel) - 1
			const name = action.options.name.toString()
			
			// Convert name to ASCII bytes
			const nameBytes = Buffer.from(name, 'ascii')
			
			// Create dLive SysEx message for channel name
			const sysexCommand = Buffer.concat([
				Buffer.from([0xF0, 0x00, 0x00, 0x1A, 0x50, 0x10, 0x01, 0x00]), // dLive SysEx header
				Buffer.from([0x03, channel]), // Name command + channel
				nameBytes,
				Buffer.from([0xF7]) // SysEx terminator
			])
			
			instance.sendMidiCommand(sysexCommand, 'mixrack')
		}
	}

	// UFX Controls
	actions.setUFXKey = {
		name: 'Set UFX Global Key',
		options: [
			{
				type: 'dropdown',
				label: 'Key',
				id: 'key',
				default: 0,
				choices: [
					{ id: 0, label: 'C' },
					{ id: 1, label: 'C#' },
					{ id: 2, label: 'D' },
					{ id: 3, label: 'D#' },
					{ id: 4, label: 'E' },
					{ id: 5, label: 'F' },
					{ id: 6, label: 'F#' },
					{ id: 7, label: 'G' },
					{ id: 8, label: 'G#' },
					{ id: 9, label: 'A' },
					{ id: 10, label: 'A#' },
					{ id: 11, label: 'B' }
				]
			}
		],
		callback: async (action) => {
			const key = parseInt(action.options.key)
			
			// Control Change message for UFX Global Key
			const ccCommand = Buffer.from([
				0xB0 + instance.baseMidiChannel, 0x0C, key
			])
			
			instance.sendMidiCommand(ccCommand, 'mixrack')
		}
	}

	actions.setUFXScale = {
		name: 'Set UFX Global Scale',
		options: [
			{
				type: 'dropdown',
				label: 'Scale',
				id: 'scale',
				default: 0,
				choices: [
					{ id: 0, label: 'Major' },
					{ id: 1, label: 'Minor' }
				]
			}
		],
		callback: async (action) => {
			const scale = parseInt(action.options.scale)
			
			// Control Change message for UFX Global Scale
			const ccCommand = Buffer.from([
				0xB0 + instance.baseMidiChannel, 0x0D, scale
			])
			
			instance.sendMidiCommand(ccCommand, 'mixrack')
		}
	}

	// dLive-specific TCP commands (if legacy TCP is enabled)
	if (instance.config.enableLegacyTcp) {
		actions.talkback = {
			name: 'Talkback On/Off',
			options: [
				{
					type: 'dropdown',
					label: 'Action',
					id: 'talkback',
					default: 'toggle',
					choices: [
						{ id: 'on', label: 'On' },
						{ id: 'off', label: 'Off' },
						{ id: 'toggle', label: 'Toggle' }
					]
				}
			],
			callback: async (action) => {
				let command
				
				if (action.options.talkback === 'toggle') {
					// Simple toggle command
					command = 'TALKBACK TOGGLE'
				} else {
					command = action.options.talkback === 'on' ? 'TALKBACK ON' : 'TALKBACK OFF'
				}
				
				instance.sendTcpCommand(command)
			}
		}

		actions.vsc = {
			name: 'Virtual Sound Check',
			options: [
				{
					type: 'dropdown',
					label: 'Action',
					id: 'vsc',
					default: 'toggle',
					choices: [
						{ id: 'on', label: 'On' },
						{ id: 'off', label: 'Off' },
						{ id: 'toggle', label: 'Toggle' }
					]
				}
			],
			callback: async (action) => {
				let command
				
				if (action.options.vsc === 'toggle') {
					command = 'VSC TOGGLE'
				} else {
					command = action.options.vsc === 'on' ? 'VSC ON' : 'VSC OFF'
				}
				
				instance.sendTcpCommand(command)
			}
		}
	}

	// Surface-specific actions (if surface connected)
	if (instance.config.connectToSurface) {
		actions.recallCue = {
			name: 'Recall Cue (Surface)',
			options: [
				{
					type: 'number',
					label: 'Cue ID',
					id: 'cueId',
					default: 1,
					min: 0,
					max: 1999,
					required: true,
					tooltip: 'Cue list recall ID (0-1999)'
				}
			],
			callback: async (action) => {
				const cueId = parseInt(action.options.cueId)
				const bank = Math.floor(cueId / 128)
				const cue = cueId % 128
				
				const command = Buffer.from([
					0xB0 + instance.baseMidiChannel, 0x00, bank,
					0xC0 + instance.baseMidiChannel, cue
				])
				
				instance.sendMidiCommand(command, 'surface')
			}
		}

		actions.goNext = {
			name: 'Go/Next Scene (Surface)',
			options: [
				{
					type: 'number',
					label: 'Control Number',
					id: 'ccNumber',
					default: 80,
					min: 0,
					max: 127,
					tooltip: 'MIDI CC number configured in dLive for Go/Next'
				}
			],
			callback: async (action) => {
				const ccNumber = parseInt(action.options.ccNumber)
				
				const command = Buffer.from([
					0xB0 + instance.baseMidiChannel, ccNumber, 127
				])
				
				instance.sendMidiCommand(command, 'surface')
			}
		}

		actions.goPrevious = {
			name: 'Go/Previous Scene (Surface)',
			options: [
				{
					type: 'number',
					label: 'Control Number',
					id: 'ccNumber',
					default: 81,
					min: 0,
					max: 127,
					tooltip: 'MIDI CC number configured in dLive for Go/Previous'
				}
			],
			callback: async (action) => {
				const ccNumber = parseInt(action.options.ccNumber)
				
				const command = Buffer.from([
					0xB0 + instance.baseMidiChannel, ccNumber, 127
				])
				
				instance.sendMidiCommand(command, 'surface')
			}
		}
	}

	// Generic MIDI Actions
	actions.sendCustomMidi = {
		name: 'Send Custom MIDI',
		options: [
			{
				type: 'textinput',
				label: 'MIDI Hex Data',
				id: 'midiData',
				default: '90 00 7F',
				required: true,
				tooltip: 'Space-separated hex bytes (e.g., "90 00 7F" for Note On)'
			},
			{
				type: 'dropdown',
				label: 'Target',
				id: 'target',
				default: 'mixrack',
				choices: [
					{ id: 'mixrack', label: 'MixRack' },
					{ id: 'surface', label: 'Surface' }
				]
			}
		],
		callback: async (action) => {
			try {
				const hexData = action.options.midiData.trim()
				const bytes = hexData.split(/\s+/).map(hex => parseInt(hex, 16))
				
				if (bytes.some(byte => isNaN(byte) || byte < 0 || byte > 255)) {
					instance.log('error', 'Invalid MIDI hex data')
					return
				}
				
				const command = Buffer.from(bytes)
				instance.sendMidiCommand(command, action.options.target)
				
			} catch (error) {
				instance.log('error', `Failed to parse MIDI data: ${error.message}`)
			}
		}
	}

	// Request Status Actions
	actions.requestMuteStatus = {
		name: 'Request Mute Status',
		options: [
			{
				type: 'dropdown',
				label: 'Channel Type',
				id: 'channelType',
				default: 'input',
				choices: [
					{ id: 'input', label: 'Input' },
					{ id: 'dca', label: 'DCA' },
					{ id: 'group', label: 'Group' },
					{ id: 'aux', label: 'Aux' }
				]
			},
			{
				type: 'number',
				label: 'Channel Number',
				id: 'channel',
				default: 1,
				min: 1,
				max: 128,
				required: true
			}
		],
		callback: async (action) => {
			const channelType = action.options.channelType
			const channel = parseInt(action.options.channel) - 1
			
			// Calculate MIDI channel and note based on channel type
			let midiChannel = instance.baseMidiChannel
			let note = channel
			
			switch (channelType) {
				case 'input':
					midiChannel = instance.baseMidiChannel
					break
				case 'group':
					midiChannel = instance.baseMidiChannel + 1
					break
				case 'aux':
					midiChannel = instance.baseMidiChannel + 2
					break
				case 'dca':
					midiChannel = instance.baseMidiChannel + 4
					note = 0x36 + channel
					break
			}
			
			// SysEx message to request mute status
			const sysexCommand = Buffer.from([
				0xF0, 0x00, 0x00, 0x1A, 0x50, 0x10, 0x01, 0x00, // dLive SysEx header
				midiChannel, 0x05, 0x09, note, 0xF7
			])
			
			instance.sendMidiCommand(sysexCommand, 'mixrack')
		}
	}

	actions.requestChannelName = {
		name: 'Request Channel Name',
		options: [
			{
				type: 'number',
				label: 'Channel Number',
				id: 'channel',
				default: 1,
				min: 1,
				max: 128,
				required: true
			}
		],
		callback: async (action) => {
			const channel = parseInt(action.options.channel) - 1
			
			// SysEx message to request channel name
			const sysexCommand = Buffer.from([
				0xF0, 0x00, 0x00, 0x1A, 0x50, 0x10, 0x01, 0x00, // dLive SysEx header
				0x01, channel, 0xF7
			])
			
			instance.sendMidiCommand(sysexCommand, 'mixrack')
		}
	}

	return actions
}

module.exports = {
	getActions
}