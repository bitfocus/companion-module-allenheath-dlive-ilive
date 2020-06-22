/**
 * 
 * Companion instance class for the A&H dLive.
 * @version 1.2.0
 * 
 */

let tcp           = require('../../tcp');
let instance_skel = require('../../instance_skel');
let actions       = require('./actions');
let upgrade       = require('./upgrade');
const MIDI = 51325;
const TCP  = 51321;

/**
 * @extends instance_skel
 * @since 1.2.0
 * @author Andrew Broughton <andy@checkcheckonetwo.com>
 */

class instance extends instance_skel {

	/**
	* Create an instance.
	*
	* @param {EventEmitter} system - the brains of the operation
	* @param {string} id - the instance ID
	* @param {Object} config - saved user configuration parameters
	* @since 1.2.0
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
	 * @since 1.2.0
	 */
	actions(system) {

		this.setActions(this.getActions());
	
	}

	setRouting(ch, selArray, isMute) {

		let routingCmds = [];
		let start = isMute ? 24 : 0;
		let qty = isMute ? 8 : 24;
		for (let i = start; i < start + qty; i++) {
			let grpCode = i + (selArray.includes(`${i - start}`) ? 0x40 : 0);
			routingCmds.push(new Buffer([ 0xB0, 0x63, ch, 0xB0, 0x62, 0x40, 0xB0, 0x06, grpCode]));
		}
		
		return routingCmds;
	}

	/**
	 * Executes the provided action.
	 *
	 * @param {Object} action - the action to be executed
	 * @access public
	 * @since 1.2.0
	 */
	action(action) {

		let opt     = action.options;
		let channel = parseInt(opt.inputChannel);
		let strip   = parseInt(opt.strip);
		let cmd     = {port: MIDI, buffers:[]};

		switch (action.action) { // Note that only available actions for the type (TCP or MIDI) will be processed

			case 'mute_input':
				this.ch = 0;
				break;

			case 'mute_mono_group':
			case 'mute_stereo_group':
				this.ch = 1;
				break;

			case 'mute_mono_aux':
			case 'mute_stereo_aux':
				this.ch = 2;
				break;

			case 'mute_mono_matrix':
			case 'mute_stereo_matrix':
				this.ch = 3;
				break;

			case 'mute_mono_fx_send':
			case 'mute_stereo_fx_send':
			case 'mute_fx_return':
			case 'mute_dca':
			case 'mute_master':
				this.ch = 4;
				break;

			case 'dca_assign':
				cmd.buffers = this.setRouting(channel, opt.dcaGroup, false);
				break;

			case 'mute_assign':
				cmd.buffers = this.setRouting(channel, opt.muteGroup, true);
				break;

			case 'scene_recall':
				let sceneNumber = parseInt(opt.sceneNumber);
				cmd.buffers = [ new Buffer([ 0xB0, 0, (sceneNumber >> 7) & 0x0F, 0xC0, sceneNumber & 0x7F ]) ]
				break;

			case 'talkback_on':
				cmd = {
					port: TCP,
					buffers: [ new Buffer([ 0xF0, 0, 2, 0 ,0x4B, 0, 0x4A, 0x10, 0xE7, 0, 1, opt.on ? 1 : 0, 0xF7 ]) ]
				};
				break;

			case 'vsc':
				cmd = {
					port: TCP,
					buffers:  [ new Buffer([ 0xF0, 0, 2, 0, 0x4B, 0, 0x4A, 0x10, 0x8A, 0, 1, opt.vscMode, 0xF7 ]) ]
				};

		}

		if (cmd.buffers.length == 0) {
			cmd.buffers = [ new Buffer([ 0x90 + this.ch, strip, opt.mute ? 0x7f : 0x3f, 0x90 + this.ch, strip, 0 ]) ];
		}

//console.log(cmd);

		if (this.tcpSocket !== undefined) {
			for (let i = 0; i < cmd.buffers.length; i++) {
				this.log('debug', `sending ${cmd.buffers[i].toString('hex')} to ${this.config.host}`);
				if (cmd.port === MIDI) {
					this.midiSocket.write(cmd.buffers[i]);
				} else {
					this.tcpSocket.write(cmd.buffers[i]);
				}
			}
		}
	}

	/**
	 * Creates the configuration fields for web config.
	 *
	 * @returns {Array} the config fields
	 * @access public
	 * @since 1.2.0
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
			}
		]
	}

	/**
	 * Clean up the instance before it is destroyed.
	 *
	 * @access public
	 * @since 1.2.0
	 */
	destroy() {

		if (this.tcpSocket !== undefined) {
			this.tcpSocket.destroy();
		}

		if (this.midiSocket !== undefined) {
			this.midiSocket.destroy();
		}

		this.log('debug', `destroyed ${this.id}`);
	}

	/**
	 * Main initialization function called once the module
	 * is OK to start doing things.
	 *
	 * @access public
	 * @since 1.2.0
	 */
	init() {

		this.updateConfig(this.config);

	}

	/**
	 * INTERNAL: use setup data to initalize the tcp tcpSocket object.
	 *
	 * @access protected
	 * @since 1.2.0
	 */
	init_tcp() {

		if (this.tcpSocket !== undefined) {
			this.tcpSocket.destroy();
			delete this.tcpSocket;
		}

		if (this.midiSocket !== undefined) {
			this.midiSocket.destroy();
			delete this.midiSocket;
		}

		if (this.config.host) {
			this.tcpSocket = new tcp(this.config.host, TCP);
			this.midiSocket = new tcp(this.config.host, MIDI);

			this.tcpSocket.on('status_change', (status, message) => {
				this.status(status, message);
			});

			this.tcpSocket.on('error', (err) => {
				this.log('error', "TCP error: " + err.message);
			});

			this.midiSocket.on('error', (err) => {
				this.log('error', "MIDI error: " + err.message);
			});

			this.tcpSocket.on('connect', () => {
				this.log('debug', `TCP Connected to ${this.config.host}`);
			});

			this.midiSocket.on('connect', () => {
				this.log('debug', `MIDI Connected to ${this.config.host}`);
			});

		}
	}

	/**
	 * Process an updated configuration array.
	 *
	 * @param {Object} config - the new configuration
	 * @access public
	 * @since 1.2.0
	 */
	updateConfig(config) {

		this.config = config;
		
		this.actions();
		this.init_tcp();

	}

}

exports = module.exports = instance;
