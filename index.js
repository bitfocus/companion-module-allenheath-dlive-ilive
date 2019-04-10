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
	{ label: '1', id: '1' },
	{ label: '2', id: '2' },
	{ label: '3', id: '3' },
	{ label: '4', id: '4' },
	{ label: '5', id: '5' },
	{ label: '6', id: '6' },
	{ label: '7', id: '7' },
	{ label: '8', id: '8' },
	{ label: '9', id: '9' },
	{ label: '10', id: '10' },
	{ label: '11', id: '11' },
	{ label: '12', id: '12' },
	{ label: '13', id: '13' },
	{ label: '14', id: '14' },
	{ label: '15', id: '15' },
	{ label: '16', id: '16' },
	{ label: '17', id: '17' },
	{ label: '18', id: '18' },
	{ label: '19', id: '19' },
	{ label: '20', id: '20' }
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
				default: '1',
				choices: self.CHOICES_INPUT_CHANNEL
			},{
				type: 'dropdown',
				label: 'Mute',
				id: 'mute',
				default: 'mute_on',
				choices: [{ label: 'mute on', id: 'mute_on' }, { label: 'mute off', id: 'mute_off' }]
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
			var channel = Integer.parseInt(opt.inputChannel);

			if (opt.mute == 'mute_on') {
				cmd = new Buffer([ 0x90 + 0, channel, 0x7f, 0x90 + 0, channel, 0x00 ]);
			} else {
				cmd = new Buffer([ 0x90 + 0, channel, 0x3f, 0x90 + 0, channel, 0x00 ]);
			}

			console.log(cmd);
			break;
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
