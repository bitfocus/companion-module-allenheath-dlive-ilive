/**
 * 
 * Companion instance class for the A&H dLive.
 * @version 1.1.0
 * 
 */

var tcp           = require('../../tcp');
var instance_skel = require('../../instance_skel');
var actions       = require('./actions');
var upgrade       = require('./upgrade');

/**
 * @extends instance_skel
 * @since 1.0.0
 * @author Andrew Broughton <andy@checkcheckonetwo.com>
 */

class instance extends instance_skel {

	/**
	* Create an instance.
	*
	* @param {EventEmitter} system - the brains of the operation
	* @param {string} id - the instance ID
	* @param {Object} config - saved user configuration parameters
	* @since 1.0.0
	*/
	constructor(system, id, config) {
		super(system, id, config);

		Object.assign(this, {
			...actions, ...upgrade
		});

		this.addUpgradeScripts();
	}

	/**
	 * Setup the actions.
	 *
	 * @param {EventEmitter} system - the brains of the operation
	 * @access public
	 * @since 1.0.0
	 */
	actions(system) {

		this.setActions(this.getActions());
	
	}

	setRouting(ch, selArray, isMute) {
		let routingCmds = [];
		let start = isMute ? 24 : 0
		let qty = isMute ? 8 : 24
		for (let i = start; i < start + qty; i++) {
			if (this.MIDI) {
				let grpCode = i + (selArray.includes(`${i}`) ? 0x40 : 0);
				routingCmds.push(new Buffer([ 0xB0, 0x63, ch, 0xB0, 0x62, 0x40, 0xB0, 0x06, grpCode]));
			} else {
				let chCode = 0xC000 | ((0xF8 + ch) << 5)
				chCode |= i;
				routingCmds.push(new Buffer([ 0xF0, 0, 2, 0, 0x28, 0, 0x27, chCode >> 8, chCode & 0xFF, 0, 1, selArray.includes(`${i}`) ? 1 : 0, 0xF7 ]))
			}
		}
		
		return routingCmds;
	}

	/**
	 * Executes the provided action.
	 *
	 * @param {Object} action - the action to be executed
	 * @access public
	 * @since 1.0.0
	 */
	action(action) {
		var self    = this;
		var opt     = action.options;
		var channel = parseInt(opt.inputChannel);
		var cmd     = [];

		switch (action.action) { // Note that only available actions for the type (TCP or MIDI) will be processed

			case 'mute_input':
				if (this.MIDI) {
					cmd = [ new Buffer([ 0x90, channel, opt.mute ? 0x7f : 0x3f, 0x90, channel, 0 ]) ];
				} else {
					let chCode = 0x3180 | channel;
					cmd = [ new Buffer([ 0xF0, 0, 2, 0, 0x28, 0, 0x27, chCode >> 8, chCode & 0xFF, 0, 1, opt.mute ? 1 : 0, 0xF7 ]) ];
				}
				break;

			case 'mute_fx_bus':
				if (this.MIDI) {
					cmd = [ new Buffer([ 0x94, opt.fxBus, opt.mute ? 0x7f : 0x3f, 0x94, opt.fxBus, 0 ]) ];
				} else {
					let fxCode = 0x1010 | parseInt(opt.fxBus);
					cmd = [ new Buffer([ 0xF0, 0, 2, 0, 0x2b, 0, 0x2a, fxCode >> 8, fxCode & 0xFF, 0, 1, opt.mute ? 1 : 0, 0xF7 ]) ];
				}
				break;

			case 'mute_group':
			case 'mute_dca':
				if (this.MIDI) {
					cmd = [ new Buffer([ 0x94, parseInt(opt.group) + 0x36, opt.mute ? 0x7f : 0x3f, 0x94, parseInt(opt.group) + 0x36, 0 ]) ];
				} else {
					let grpCode = 0x1020 | parseInt(opt.group);
					cmd = [ new Buffer([ 0xF0, 0, 2, 0, 0x24, 0, 0x23, grpCode >> 8, grpCode & 0xFF, 0, 1, opt.mute ? 1 : 0, 0xF7 ]) ];
				}
				break;

			case 'dca_assign':
				cmd = this.setRouting(channel, opt.dcaGroup, false);
				break;

			case 'mute_assign':
				cmd = this.setRouting(channel, opt.muteGroup, true);
				break;

			case 'scene_recall':
				let sceneNumber = parseInt(opt.sceneNumber);
				if (this.MIDI) {
					cmd = [ new Buffer([ 0xB0, 0, (sceneNumber >> 7) & 0x0F, 0xC0, sceneNumber & 0x7F ]) ];
				} else {
					cmd = [ new Buffer([ 0xF0, 0, 2, 0, 0x0C, 0x22, 0x2E, 0x10, 0x1D, 0, 3, sceneNumber >> 8, sceneNumber & 0xFF, 0, 0xF7 ]) ];
				}
				break;

			case 'talkback_on':
				cmd = [ new Buffer([ 0xF0, 0, 2, 0 ,0x4B, 0, 0x4A, 0x10, 0xE7, 0, 1, opt.on ? 1 : 0, 0xF7 ]) ];
				break;

			case 'vsc':
				cmd = [ new Buffer([ 0xF0, 0, 2, 0, 0x4B, 0, 0x4A, 0x10, 0x8A, 0, 1, opt.vscMode, 0xF7 ]) ];

		}

		if (cmd !== undefined) {
			if (self.socket !== undefined) {
				for (let i = 0; i < cmd.length; i++) {
					this.log('debug', `sending ${cmd[i].toString('hex')} to ${this.config.host}`);
					self.socket.write(cmd[i]);
				}
			}
		}
	}

	/**
	 * Creates the configuration fields for web config.
	 *
	 * @returns {Array} the config fields
	 * @access public
	 * @since 1.0.0
	 */
	config_fields() {

		return [
			{
				type:  'text',
				id:    'info',
				width: 12,
				label: 'Information',
				value: 'dLive: This module is for the A&H dLive'
			},
			{
				type:    'textinput',
				id:      'host',
				label:   'Target IP',
				width:   6,
				default: '192.168.1.70',
				regex:   this.REGEX_IP
			},
			{
				type:    'dropdown',
				id:      'port',
				label:   'MIDI or TCP',
				width:   12,
				default: '51321',
				choices: [
					{id: '51321', label: 'TCP'},
					{id: '51325', label: 'MIDI'}
				]
			}
		]
	}

	/**
	 * Clean up the instance before it is destroyed.
	 *
	 * @access public
	 * @since 1.0.0
	 */
	destroy() {
		if (this.socket !== undefined) {
			this.socket.destroy();
		}

		this.log('debug', `destroyed ${this.id}`);
	}

	/**
	 * Main initialization function called once the module
	 * is OK to start doing things.
	 *
	 * @access public
	 * @since 1.0.0
	 */
	init() {

		this.updateConfig(this.config);

	}

	/**
	 * INTERNAL: use setup data to initalize the tcp socket object.
	 *
	 * @access protected
	 * @since 1.0.0
	 */
	init_tcp() {
		var receivebuffer = '';

		if (this.socket !== undefined) {
			this.socket.destroy();
			delete this.socket;
		}

		if (this.config.host) {
			this.socket = new tcp(this.config.host, this.config.port);

			this.socket.on('status_change', (status, message) => {
				this.status(status, message);
			});

			this.socket.on('error', (err) => {
				this.log('error', "Network error: " + err.message);
			});

			this.socket.on('connect', () => {
				this.log('debug', `Connected to ${this.config.host}`);
			});

			// separate buffered stream into lines with responses
			this.socket.on('data', (chunk) => {
				var i = 0, line = '', offset = 0;
				receivebuffer += chunk;

				while ( (i = receivebuffer.indexOf('\n', offset)) !== -1) {
					line = receivebuffer.substr(offset, i - offset);
					offset = i + 1;
					this.socket.emit('receiveline', line.toString());
				}

				receivebuffer = receivebuffer.substr(offset);
			});

			this.socket.on('receiveline', (line) => {
				console.log('Received: ' + line);
			});
		}
	}

	/**
	 * Process an updated configuration array.
	 *
	 * @param {Object} config - the new configuration
	 * @access public
	 * @since 1.1.0
	 */
	updateConfig(config) {
		
		this.config = config;
		this.MIDI   = (config.port == '51325');
		
		this.actions();
		this.init_tcp();

	}

}

exports = module.exports = instance;
