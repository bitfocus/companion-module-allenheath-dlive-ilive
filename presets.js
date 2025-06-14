// presets.js - Presets for dLive module
const { combineRgb } = require('@companion-module/base')

function getPresets(instance) {
	const presets = []

	// Input Channel Mute Presets (first 16 channels)
	for (let ch = 1; ch <= 16; ch++) {
		presets.push({
			type: 'button',
			category: 'Input Channels',
			name: `Input ${ch} Mute`,
			style: {
				text: `IN ${ch}\\n$(dlive:mute_input_${ch})`,
				size: '14',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(0, 0, 0)
			},
			steps: [
				{
					down: [
						{
							actionId: 'muteInputChannel',
							options: {
								channel: ch,
								mute: 'toggle'
							}
						}
					],
					up: []
				}
			],
			feedbacks: [
				{
					feedbackId: 'inputMuteStatus',
					options: {
						channel: ch
					},
					style: {
						bgcolor: combineRgb(255, 0, 0),
						color: combineRgb(255, 255, 255)
					}
				}
			]
		})
	}

	// DCA Mute Presets
	for (let dca = 1; dca <= 8; dca++) {
		presets.push({
			type: 'button',
			category: 'DCA Groups',
			name: `DCA ${dca} Mute`,
			style: {
				text: `DCA ${dca}\\n$(dlive:mute_dca_${dca})`,
				size: '14',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(0, 0, 0)
			},
			steps: [
				{
					down: [
						{
							actionId: 'muteDCA',
							options: {
								dca: dca,
								mute: 'toggle'
							}
						}
					],
					up: []
				}
			],
			feedbacks: [
				{
					feedbackId: 'dcaMuteStatus',
					options: {
						dca: dca
					},
					style: {
						bgcolor: combineRgb(255, 0, 0),
						color: combineRgb(255, 255, 255)
					}
				}
			]
		})
	}

	// Scene Recall Presets
	for (let scene = 1; scene <= 10; scene++) {
		presets.push({
			type: 'button',
			category: 'Scene Management',
			name: `Recall Scene ${scene}`,
			style: {
				text: `SCENE\\n${scene}`,
				size: '18',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(0, 0, 128)
			},
			steps: [
				{
					down: [
						{
							actionId: 'recallScene',
							options: {
								scene: scene
							}
						}
					],
					up: []
				}
			],
			feedbacks: [
				{
					feedbackId: 'currentScene',
					options: {
						scene: scene
					},
					style: {
						bgcolor: combineRgb(0, 255, 0),
						color: combineRgb(0, 0, 0)
					}
				}
			]
		})
	}

	// Mix Bus Presets
	const busTypes = [
		{ id: 'aux', name: 'AUX', color: combineRgb(128, 0, 128) },
		{ id: 'group', name: 'GRP', color: combineRgb(0, 128, 0) },
		{ id: 'matrix', name: 'MTX', color: combineRgb(128, 128, 0) }
	]

	busTypes.forEach(busType => {
		for (let ch = 1; ch <= 8; ch++) {
			presets.push({
				type: 'button',
				category: `${busType.name} Buses`,
				name: `${busType.name} ${ch} Mute`,
				style: {
					text: `${busType.name} ${ch}\\n$(dlive:mute_mono_${busType.id}_${ch})`,
					size: '14',
					color: combineRgb(255, 255, 255),
					bgcolor: combineRgb(0, 0, 0)
				},
				steps: [
					{
						down: [
							{
								actionId: 'muteMixBus',
								options: {
									busType: busType.id,
									channelType: 'mono',
									channel: ch,
									mute: 'toggle'
								}
							}
						],
						up: []
					}
				],
				feedbacks: [
					{
						feedbackId: 'mixBusMuteStatus',
						options: {
							busType: busType.id,
							channelType: 'mono',
							channel: ch
						},
						style: {
							bgcolor: busType.color,
							color: combineRgb(255, 255, 255)
						}
					}
				]
			})
		}
	})

	// Phantom Power Presets
	for (let socket = 1; socket <= 8; socket++) {
		presets.push({
			type: 'button',
			category: 'Preamp Control',
			name: `Socket ${socket} Phantom`,
			style: {
				text: `48V\\nSOCK ${socket}`,
				size: '14',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(0, 0, 0)
			},
			steps: [
				{
					down: [
						{
							actionId: 'preampPhantom',
							options: {
								socket: socket,
								phantom: 'toggle'
							}
						}
					],
					up: []
				}
			],
			feedbacks: [
				{
					feedbackId: 'preampPhantomStatus',
					options: {
						socket: socket
					},
					style: {
						bgcolor: combineRgb(255, 165, 0),
						color: combineRgb(0, 0, 0)
					}
				}
			]
		})
	}

	// DCA Assignment Presets
	for (let dca = 1; dca <= 4; dca++) {
		for (let ch = 1; ch <= 8; ch++) {
			presets.push({
				type: 'button',
				category: 'DCA Assignment',
				name: `Input ${ch} → DCA ${dca}`,
				style: {
					text: `IN${ch}\\nDCA${dca}`,
					size: '14',
					color: combineRgb(255, 255, 255),
					bgcolor: combineRgb(64, 64, 64)
				},
				steps: [
					{
						down: [
							{
								actionId: 'assignToDCA',
								options: {
									channel: ch,
									dca: dca,
									assign: 'toggle'
								}
							}
						],
						up: []
					}
				],
				feedbacks: [
					{
						feedbackId: 'dcaAssignmentStatus',
						options: {
							channel: ch,
							dca: dca
						},
						style: {
							bgcolor: combineRgb(0, 255, 0),
							color: combineRgb(0, 0, 0)
						}
					}
				]
			})
		}
	}

	// Status and Information Presets
	presets.push({
		type: 'button',
		category: 'Status',
		name: 'Connection Status',
		style: {
			text: 'dLive\\n$(dlive:connection_status)',
			size: '14',
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(64, 64, 64)
		},
		steps: [
			{
				down: [],
				up: []
			}
		],
		feedbacks: [
			{
				feedbackId: 'connectionStatus',
				options: {
					connectionType: 'any'
				},
				style: {
					bgcolor: combineRgb(0, 255, 0),
					color: combineRgb(0, 0, 0)
				}
			}
		]
	})

	presets.push({
		type: 'button',
		category: 'Status',
		name: 'Current Scene',
		style: {
			text: 'SCENE\\n$(dlive:current_scene)',
			size: '18',
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(0, 0, 128)
		},
		steps: [
			{
				down: [],
				up: []
			}
		],
		feedbacks: []
	})

	presets.push({
		type: 'button',
		category: 'Status',
		name: 'MIDI Activity',
		style: {
			text: 'MIDI\\nACTIVITY',
			size: '14',
			color: combineRgb(0, 0, 0),
			bgcolor: combineRgb(64, 64, 64)
		},
		steps: [
			{
				down: [],
				up: []
			}
		],
		feedbacks: [
			{
				feedbackId: 'midiActivity',
				options: {
					timeout: 5,
					source: 'any'
				},
				style: {
					bgcolor: combineRgb(0, 255, 255),
					color: combineRgb(0, 0, 0)
				}
			}
		]
	})

	// UFX Control Presets
	const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
	keys.forEach((key, index) => {
		presets.push({
			type: 'button',
			category: 'UFX Control',
			name: `UFX Key ${key}`,
			style: {
				text: `UFX\\n${key}`,
				size: '14',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(128, 0, 128)
			},
			steps: [
				{
					down: [
						{
							actionId: 'setUFXKey',
							options: {
								key: index
							}
						}
					],
					up: []
				}
			],
			feedbacks: [
				{
					feedbackId: 'ufxKeyScale',
					options: {
						checkType: 'key',
						key: key
					},
					style: {
						bgcolor: combineRgb(255, 0, 255),
						color: combineRgb(255, 255, 255)
					}
				}
			]
		})
	})

	presets.push({
		type: 'button',
		category: 'UFX Control',
		name: 'UFX Scale Major',
		style: {
			text: 'UFX\\nMAJOR',
			size: '14',
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(128, 0, 128)
		},
		steps: [
			{
				down: [
					{
						actionId: 'setUFXScale',
						options: {
							scale: 0
						}
					}
				],
				up: []
			}
		],
		feedbacks: [
			{
				feedbackId: 'ufxKeyScale',
				options: {
					checkType: 'scale',
					scale: 'Major'
				},
				style: {
					bgcolor: combineRgb(255, 0, 255),
					color: combineRgb(255, 255, 255)
				}
			}
		]
	})

	presets.push({
		type: 'button',
		category: 'UFX Control',
		name: 'UFX Scale Minor',
		style: {
			text: 'UFX\\nMINOR',
			size: '14',
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(128, 0, 128)
		},
		steps: [
			{
				down: [
					{
						actionId: 'setUFXScale',
						options: {
							scale: 1
						}
					}
				],
				up: []
			}
		],
		feedbacks: [
			{
				feedbackId: 'ufxKeyScale',
				options: {
					checkType: 'scale',
					scale: 'Minor'
				},
				style: {
					bgcolor: combineRgb(255, 0, 255),
					color: combineRgb(255, 255, 255)
				}
			}
		]
	})

	// Surface Control Presets (if surface connected)
	if (instance.config.connectToSurface) {
		presets.push({
			type: 'button',
			category: 'Surface Control',
			name: 'Go/Next',
			style: {
				text: 'GO\\nNEXT',
				size: '18',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(0, 128, 0)
			},
			steps: [
				{
					down: [
						{
							actionId: 'goNext',
							options: {
								ccNumber: 80
							}
						}
					],
					up: []
				}
			],
			feedbacks: []
		})

		presets.push({
			type: 'button',
			category: 'Surface Control',
			name: 'Go/Previous',
			style: {
				text: 'GO\\nPREV',
				size: '18',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(128, 128, 0)
			},
			steps: [
				{
					down: [
						{
							actionId: 'goPrevious',
							options: {
								ccNumber: 81
							}
						}
					],
					up: []
				}
			],
			feedbacks: []
		})
	}

	// Legacy TCP Presets (if enabled)
	if (instance.config.enableLegacyTcp) {
		presets.push({
			type: 'button',
			category: 'dLive Functions',
			name: 'Talkback',
			style: {
				text: 'TALK\\nBACK',
				size: '14',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(255, 0, 0)
			},
			steps: [
				{
					down: [
						{
							actionId: 'talkback',
							options: {
								talkback: 'toggle'
							}
						}
					],
					up: []
				}
			],
			feedbacks: []
		})

		presets.push({
			type: 'button',
			category: 'dLive Functions',
			name: 'Virtual Sound Check',
			style: {
				text: 'VSC\\nTOGGLE',
				size: '14',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(0, 128, 128)
			},
			steps: [
				{
					down: [
						{
							actionId: 'vsc',
							options: {
								vsc: 'toggle'
							}
						}
					],
					up: []
				}
			],
			feedbacks: []
		})
	}

	return presets
}

module.exports = {
	getPresets
}