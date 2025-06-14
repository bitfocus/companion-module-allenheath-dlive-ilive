// config.js - Configuration fields for dLive module
const { Regex } = require('@companion-module/base')

function getConfigFields() {
	return [
		{
			type: 'static-text',
			id: 'info',
			width: 12,
			label: 'Information',
			value: 'This module controls Allen & Heath dLive and iLive mixers using the official MIDI over TCP protocol. It supports bidirectional communication with dLive MixRack and Surface units.'
		},
		{
			type: 'textinput',
			id: 'host',
			label: 'dLive IP Address',
			width: 6,
			default: '10.0.1.131',
			regex: Regex.IP,
			required: true,
			tooltip: 'IP address of the dLive MixRack or Surface'
		},
		{
			type: 'dropdown',
			id: 'model',
			label: 'Console Type',
			width: 6,
			default: 'dLive',
			choices: [
				{ id: 'dLive', label: 'dLive' },
				{ id: 'iLive', label: 'iLive' }
			],
			tooltip: 'Select your mixer model. dLive supports MIDI over TCP, iLive uses legacy MIDI commands.'
		},
		{
			type: 'static-text',
			id: 'connection_info',
			width: 12,
			label: 'Connection Configuration',
			value: 'Configure which dLive units to connect to. MixRack connection is recommended for most control applications.'
		},
		{
			type: 'checkbox',
			id: 'connectToMixrack',
			label: 'Connect to MixRack',
			width: 6,
			default: true,
			tooltip: 'Connect to dLive MixRack for scene recall and processing control (TCP 51325/51327)'
		},
		{
			type: 'checkbox',
			id: 'connectToSurface',
			label: 'Connect to Surface',
			width: 6,
			default: false,
			tooltip: 'Connect to dLive Surface for cue list control and surface feedback (TCP 51328/51329)'
		},
		{
			type: 'static-text',
			id: 'security_info',
			width: 12,
			label: 'Security Settings',
			value: 'TLS encryption provides secure communication but requires authentication credentials configured on the dLive.'
		},
		{
			type: 'checkbox',
			id: 'useTLS',
			label: 'Use TLS Encryption',
			width: 12,
			default: false,
			tooltip: 'Use encrypted TLS connection (requires authentication). Unencrypted is usually sufficient for trusted networks.'
		},
		{
			type: 'textinput',
			id: 'username',
			label: 'TLS Username',
			width: 6,
			default: '',
			isVisible: (options) => options.useTLS === true,
			tooltip: 'Username for TLS authentication (UserProfile 00-1F)'
		},
		{
			type: 'textinput',
			id: 'password',
			label: 'TLS Password',
			width: 6,
			default: '',
			isVisible: (options) => options.useTLS === true,
			tooltip: 'Password for TLS authentication'
		},
		{
			type: 'static-text',
			id: 'midi_info',
			width: 12,
			label: 'MIDI Configuration',
			value: 'Configure MIDI channel settings to match your dLive console configuration (Utility > Control > MIDI).'
		},
		{
			type: 'number',
			id: 'baseMidiChannel',
			label: 'Base MIDI Channel (N)',
			width: 6,
			default: 1,
			min: 1,
			max: 12,
			tooltip: 'Base MIDI channel configured in dLive (Utility > Control > MIDI). Channel range N to N+4 will be used.'
		},
		{
			type: 'number',
			id: 'dcaCount',
			label: 'DCA Count',
			width: 6,
			default: 24,
			min: 1,
			max: 24,
			tooltip: 'Number of DCA groups available on your console'
		},
		{
			type: 'static-text',
			id: 'legacy_info',
			width: 12,
			label: 'Legacy Support',
			value: 'Enable legacy TCP commands for older dLive firmware or specific applications that require non-MIDI control.'
		},
		{
			type: 'checkbox',
			id: 'enableLegacyTcp',
			label: 'Enable Legacy TCP Commands',
			width: 12,
			default: false,
			tooltip: 'Enable legacy TCP commands on port 51321 (talkback, VSC). Usually not needed with MIDI over TCP.'
		},
		{
			type: 'static-text',
			id: 'port_info',
			width: 12,
			label: 'Port Information',
			value: 'MixRack: 51325 (unencrypted) / 51327 (TLS) | Surface: 51328 (unencrypted) / 51329 (TLS) | Legacy TCP: 51321'
		},
		{
			type: 'number',
			id: 'reconnectInterval',
			label: 'Reconnect Interval (seconds)',
			width: 6,
			default: 5,
			min: 1,
			max: 60,
			tooltip: 'How often to attempt reconnection when connection is lost'
		}
	]
}

module.exports = {
	getConfigFields
}