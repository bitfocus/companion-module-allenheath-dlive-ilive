var tcp           = require('../../tcp');
var instance_skel = require('../../instance_skel');
var actions       = require('./actions');

var debug;
var log;

/**
 * Companion instance class for the Metus Ingets software.
 *
 * @extends instance_skel
 * @since 1.1.0
 * @author Jeffrey Davidsz <jeffrey.davidsz@vicreo.eu>
 */

class instance extends instance_skel {

	/**
	* Create an instance.
	*
	* @param {EventEmitter} system - the brains of the operation
	* @param {string} id - the instance ID
	* @param {Object} config - saved user configuration parameters
	* @since 1.1.0
	*/
	constructor(system, id, config) {
		super(system, id, config);

		this.stash        = [];
		this.command      = null;
		this.activeEncoders = [];
		this.encoders     = [];
		this.CHOICES_LIST = [];
		this.CHOICES_INPUT_CHANNEL = [];
		for (var i = 1; i < 129; i++) {
			this.CHOICES_INPUT_CHANNEL.push({ label: i, id: i-1 });
		}
		this.CHOICES_DCA_ON_CHANNEL = [];
		var j = 0x40;
		for (var i = 1; i < 25; i++) {
			this.CHOICES_DCA_ON_CHANNEL.push({ label: i, id: j });
			j++;
		}
		this.CHOICES_DCA_OFF_CHANNEL = [];
		var j = 0x00;
		for (var i = 1; i < 25; i++) {
			this.CHOICES_DCA_OFF_CHANNEL.push({ label: i, id: j });
			j++;
		}

		Object.assign(this, {
			...actions
		});

		this.actions(); // export actions
	}

	/**
	 * Setup the actions.
	 *
	 * @param {EventEmitter} system - the brains of the operation
	 * @access public
	 * @since 1.1.0
	 */
	actions(system) {

		this.setActions(this.getActions());
	}

	/**
	 * Executes the provided action.
	 *
	 * @param {Object} action - the action to be executed
	 * @access public
	 * @since 1.0.0
	 */
	action(action) {
		var self = this;
		var id = action.action;
		var opt = action.options;
		var channel = parseInt(opt.inputChannel);

		var cmd;

		switch (id) {

			case 'mute_input':


				if (opt.mute == 'mute_on') {
					cmd = new Buffer([ 0x90 + 0, channel, 0x7f, 0x90 + 0, channel, 0x00 ]);
				} else {
					cmd = new Buffer([ 0x90 + 0, channel, 0x3f, 0x90 + 0, channel, 0x00 ]);
				}
				break;
/*
			case 'channel_select':
				console.log(channel);
				cmd = new Buffer([ 0x00, channel ]);
				break;
*/
			case 'dca_assignment_on':
				cmd = new Buffer([ 0xB0 + 0, 0x63, channel, 0xB0 + 0, 0x62, 0x40, 0xB0 + 0, 0x06, opt.dcaChannel ]);
				break;

			case 'dca_assignment_off':
				cmd = new Buffer([ 0xB0 + 0, 0x63, channel, 0xB0 + 0, 0x62, 0x40, 0xB0 + 0, 0x06, opt.dcaChannel ]);
				break;
		}

		if (cmd !== undefined) {
			if (self.socket !== undefined) {
				debug('sending ', cmd, "to", this.config.host);
				console.log("command: " + cmd);
				self.socket.write(cmd);
			}
		}
	}

	/**
	 * Creates the configuration fields for web config.
	 *
	 * @returns {Array} the config fields
	 * @access public
	 * @since 1.1.0
	 */
	config_fields() {

		return [
			{
				type: 'text',
				id: 'info',
				width: 12,
				label: 'Information',
				value: 'This module is for dLive'
			},
			{
				type: 'textinput',
				id: 'host',
				label: 'Target IP',
				width: 6,
				default: '192.168.2.60',
				regex: this.REGEX_IP
			},
			{
				type: 'textinput',
				id: 'port',
				label: 'port number',
				width: 12,
				default: '51325',
				regex: this.REGEX_PORT
			}
		]
	}

	/**
	 * Clean up the instance before it is destroyed.
	 *
	 * @access public
	 * @since 1.1.0
	 */
	destroy() {
		if (this.socket !== undefined) {
			this.socket.destroy();
		}

		debug("destroy", this.id);
	}

	/**
	 * Main initialization function called once the module
	 * is OK to start doing things.
	 *
	 * @access public
	 * @since 1.1.0
	 */
	init() {
		debug = this.debug;
		log = this.log;

		this.init_tcp();
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

		if (this.config.port === undefined) {
			this.config.port = 51325;
		}

		if (this.config.host) {
			this.socket = new tcp(this.config.host, this.config.port);

			this.socket.on('status_change', (status, message) => {
				this.status(status, message);
			});

			this.socket.on('error', (err) => {
				this.debug("Network error", err);
				this.log('error',"Network error: " + err.message);
			});

			this.socket.on('connect', () => {
				this.debug("Connected");
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
				console.log('response: ' +line);
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
		var resetConnection = false;

		if (this.config.host != config.host)
		{
			resetConnection = true;
		}

		this.config = config;

		this.actions();

		if (resetConnection === true || this.socket === undefined) {
			this.init_tcp();
		}
	}

}

exports = module.exports = instance;
