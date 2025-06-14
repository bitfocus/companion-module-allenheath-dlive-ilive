// variables.js - Variables for dLive module

function getVariables(instance) {
	const variables = []

	// Connection status variables
	variables.push({
		name: 'Connection Status',
		variableId: 'connection_status'
	})

	variables.push({
		name: 'Connected Sockets',
		variableId: 'connected_sockets'
	})

	variables.push({
		name: 'MixRack Connected',
		variableId: 'mixrack_connected'
	})

	variables.push({
		name: 'Surface Connected', 
		variableId: 'surface_connected'
	})

	// MIDI activity variables
	variables.push({
		name: 'Last MIDI Activity',
		variableId: 'last_midi_activity'
	})

	variables.push({
		name: 'Last MIDI Message Type',
		variableId: 'last_midi_type'
	})

	variables.push({
		name: 'Last MIDI Channel',
		variableId: 'last_midi_channel'
	})

	variables.push({
		name: 'Last MIDI Source',
		variableId: 'last_midi_source'
	})

	variables.push({
		name: 'Last MIDI Raw Data',
		variableId: 'last_midi_raw'
	})

	// Console information variables
	variables.push({
		name: 'Console Model',
		variableId: 'console_model'
	})

	variables.push({
		name: 'Console IP Address',
		variableId: 'console_ip'
	})

	// Scene variables
	variables.push({
		name: 'Current Scene',
		variableId: 'current_scene'
	})

	variables.push({
		name: 'Last Scene Recalled',
		variableId: 'last_scene_recalled'
	})

	// System status variables
	variables.push({
		name: 'Module Version',
		variableId: 'module_version'
	})

	variables.push({
		name: 'MIDI Messages Received',
		variableId: 'midi_messages_received'
	})

	variables.push({
		name: 'MIDI Messages Sent',
		variableId: 'midi_messages_sent'
	})

	// UFX variables
	variables.push({
		name: 'UFX Global Key',
		variableId: 'ufx_global_key'
	})

	variables.push({
		name: 'UFX Global Scale',
		variableId: 'ufx_global_scale'
	})

	// Essential channel variables (only commonly used channels)
	
	// Input channel mute status (first 32 channels - most commonly used)
	for (let ch = 1; ch <= 32; ch++) {
		variables.push({
			name: `Input ${ch} Mute Status`,
			variableId: `mute_input_${ch}`
		})
	}

	// DCA mute status (all 24 DCAs)
	for (let ch = 1; ch <= 24; ch++) {
		variables.push({
			name: `DCA ${ch} Mute Status`,
			variableId: `mute_dca_${ch}`
		})
	}

	// Common group variables (first 8 of each type)
	for (let ch = 1; ch <= 8; ch++) {
		variables.push({
			name: `Mono Group ${ch} Mute Status`,
			variableId: `mute_mono_group_${ch}`
		})

		variables.push({
			name: `Stereo Group ${ch} Mute Status`,
			variableId: `mute_stereo_group_${ch}`
		})

		variables.push({
			name: `Mono Aux ${ch} Mute Status`,
			variableId: `mute_mono_aux_${ch}`
		})

		variables.push({
			name: `Stereo Aux ${ch} Mute Status`,
			variableId: `mute_stereo_aux_${ch}`
		})
	}

	// Preamp variables (first 32 sockets - most commonly used)
	for (let socket = 1; socket <= 32; socket++) {
		variables.push({
			name: `Preamp Socket ${socket} Gain`,
			variableId: `preamp_gain_socket${socket}`
		})

		variables.push({
			name: `Preamp Socket ${socket} Phantom Power`,
			variableId: `preamp_phantom_socket${socket}`
		})
	}

	// Channel names (first 32 channels)
	for (let ch = 1; ch <= 32; ch++) {
		variables.push({
			name: `Channel ${ch} Name`,
			variableId: `channel_${ch}_name`
		})
	}

	// NOTE: Additional variables are created dynamically when MIDI messages are received
	// This keeps the initial variable count manageable while still supporting all dLive features

	return variables
}

function initializeVariableValues(instance) {
	const values = {
		'connection_status': 'Disconnected',
		'connected_sockets': '0',
		'mixrack_connected': 'No',
		'surface_connected': 'No',
		'last_midi_activity': 'None',
		'last_midi_type': 'None',
		'last_midi_channel': '0',
		'last_midi_source': 'None',
		'last_midi_raw': 'None',
		'console_model': instance.config.model || 'Unknown',
		'console_ip': instance.config.host || 'Unknown',
		'module_version': '2.0.0',
		'midi_messages_received': '0',
		'midi_messages_sent': '0',
		'current_scene': 'Unknown',
		'last_scene_recalled': 'None',
		'ufx_global_key': 'Unknown',
		'ufx_global_scale': 'Unknown'
	}

	// Initialize common mute status variables
	for (let ch = 1; ch <= 32; ch++) {
		values[`mute_input_${ch}`] = 'Unknown'
	}

	for (let ch = 1; ch <= 24; ch++) {
		values[`mute_dca_${ch}`] = 'Unknown'
	}

	for (let ch = 1; ch <= 8; ch++) {
		values[`mute_mono_group_${ch}`] = 'Unknown'
		values[`mute_stereo_group_${ch}`] = 'Unknown'
		values[`mute_mono_aux_${ch}`] = 'Unknown'
		values[`mute_stereo_aux_${ch}`] = 'Unknown'
	}

	// Initialize preamp variables
	for (let socket = 1; socket <= 32; socket++) {
		values[`preamp_gain_socket${socket}`] = '0'
		values[`preamp_phantom_socket${socket}`] = 'OFF'
	}

	// Initialize channel names
	for (let ch = 1; ch <= 32; ch++) {
		values[`channel_${ch}_name`] = ''
	}

	return values
}

// Function to dynamically create variables as needed
function createDynamicVariable(instance, variableId, name) {
	// Check if variable already exists
	const existingVariables = instance.getVariableDefinitions()
	if (existingVariables.find(v => v.variableId === variableId)) {
		return // Variable already exists
	}

	// Create new variable definition
	const newVariable = {
		name: name,
		variableId: variableId
	}

	// Add to existing variables
	const allVariables = [...existingVariables, newVariable]
	instance.setVariableDefinitions(allVariables)
}

module.exports = {
	getVariables,
	initializeVariableValues,
	createDynamicVariable
}