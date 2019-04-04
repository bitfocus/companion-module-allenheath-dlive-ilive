var instance_skel = require('../../instance_skel');
var tcp = require('../../tcp');
var debug;
var log;

function instance(system, id, config) {
		var self = this;

		// super-constructor
		instance_skel.apply(this, arguments);
		self.actions(); // export actions
		return self;
}

instance.prototype.init = function () {
		var self = this;

		debug = self.debug;
		log = self.log;

		self.status(self.STATUS_UNKNOWN);

		if (self.config.host !== undefined) {
			self.tcp = new tcp(self.config.host, 51325);

			self.tcp.on('status_change', function (status, message) {
				self.status(status, message);
			});

			self.tcp.on('error', function () {
				// Ignore
			});
		}
};

instance.prototype.updateConfig = function (config) {
		var self = this;
		self.config = config;

		if (self.tcp !== undefined) {
			self.tcp.destroy();
			delete self.tcp;
		}

		if (self.config.host !== undefined) {
			self.tcp = new tcp(self.config.host, 51325);

			self.tcp.on('status_change', function (status, message) {
				self.status(status, message);
			});

			self.tcp.on('error', function (message) {
				// ignore for now
			});
		}
};

// Return config fields for web config
instance.prototype.config_fields = function () {
		var self = this;
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
				regex: self.REGEX_IP
			}
		]
};

// When module gets deleted
instance.prototype.destroy = function () {
	var self = this;

		if (self.tcp !== undefined) {
			self.tcp.destroy();
		}
		debug("destroy", self.id);
};

instance.prototype.CHOICES_INPUT_CHANNEL = [
	{ label: '1', id: '\x00' },
	{ label: '2', id: '\x01' },
	{ label: '3', id: '\x02' },
	{ label: '4', id: '\x03' },
	{ label: '5', id: '\x04' },
	{ label: '6', id: '\x05' },
	{ label: '7', id: '\x06' },
	{ label: '8', id: '\x07' },
	{ label: '9', id: '\x08' },
	{ label: '10', id: '\x09' },
	{ label: '11', id: '\x0A' },
	{ label: '12', id: '\x0B' },
	{ label: '13', id: '\x0C' },
	{ label: '14', id: '\x0D' },
	{ label: '15', id: '\x0E' },
	{ label: '16', id: '\x0F' }
];

instance.prototype.actions = function (system) {
	var self = this;

	var actions = {
		'mute_input': {
			label: 'Mute input',
			options: [{
				type: 'dropdown',
				label: 'Input channel',
				id: 'inputChannel',
				default: '\x02',
				choices: self.CHOICES_INPUT_CHANNEL
			},{
				type: 'dropdown',
				label: 'Mute',
				id: 'mute',
				default: '\x7F',
				choices: [{ label: 'mute on', id: '\x7F' }, { label: 'mute off', id: '\x3F' }]
			}]
		}
	};
		self.setActions(actions);
};


instance.prototype.action = function (action) {
	var self = this;
	var id = action.action;
	var opt = action.options;
	var cmd;

	switch (id) {

		case 'mute_input':
			cmd = `9N, ${opt.inputChannel}, ${opt.mute}, 9N, ${opt.inputChannel}, 00\r`;
			console.log(cmd);
			break

	}

	if (cmd !== undefined) {
		if (self.tcp !== undefined) {
			debug('sending ', cmd, "to", self.tcp.host);
			self.tcp.send(cmd);
		}
	}
};

instance_skel.extendedBy(instance);
exports = module.exports = instance;
