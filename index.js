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
		this.CHOICES_INPUT_CHANNEL = [
			{ label: '1', id: '0' },
			{ label: '2', id: '1' },
			{ label: '3', id: '2' },
			{ label: '4', id: '3' },
			{ label: '5', id: '4' },
			{ label: '6', id: '5' },
			{ label: '7', id: '6' },
			{ label: '8', id: '7' },
			{ label: '9', id: '8' },
			{ label: '10', id: '9' },
			{ label: '11', id: '10' },
			{ label: '12', id: '11' },
			{ label: '13', id: '12' },
			{ label: '14', id: '13' },
			{ label: '15', id: '14' },
			{ label: '16', id: '15' },
			{ label: '17', id: '16' },
			{ label: '18', id: '17' },
			{ label: '19', id: '18' },
			{ label: '20', id: '19' }
		];

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
		var cmd;

		switch (id) {

			case 'mute_input':
				var channel = parseInt(opt.inputChannel);

				if (opt.mute == 'mute_on') {
					cmd = new Buffer([ 0x90 + 0, channel, 0x7f, 0x90 + 0, channel, 0x00 ]);
				} else {
					cmd = new Buffer([ 0x90 + 0, channel, 0x3f, 0x90 + 0, channel, 0x00 ]);
				}
				break;
		}

		if (cmd !== undefined) {
			if (self.socket !== undefined) {
				debug('sending ', cmd, "to", this.config.host);
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
