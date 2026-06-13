const { TCPHelper } = require('@companion-module/base')

const TCP_CLIENT_ID = 0x0001
const DEFAULT_TCP_PORT = 51321
const DEFAULT_UDP_PORT = 51324

const NAME_MANAGERS = [
	{ key: 'input', root: 'Input Channel Name Colour Manager', max: 64, param: 0x0020 },
	{ key: 'monoGroup', root: 'Mono Group Channel Name Colour Manager', max: 32 },
	{ key: 'stereoGroup', root: 'Stereo Group Channel Name Colour Manager', max: 16 },
	{ key: 'monoAux', root: 'Mono Aux Channel Name Colour Manager', max: 32 },
	{ key: 'stereoAux', root: 'Stereo Aux Channel Name Colour Manager', max: 16 },
	{ key: 'monoFx', root: 'Mono FX Send Channel Name Colour Manager', max: 8 },
	{ key: 'stereoFx', root: 'Stereo FX Send Channel Name Colour Manager', max: 8 },
	{ key: 'monoMatrix', root: 'Mono Matrix Channel Name Colour Manager', max: 16 },
	{ key: 'stereoMatrix', root: 'Stereo Matrix Channel Name Colour Manager', max: 16 },
	{ key: 'main', root: 'Main Channel Name Colour Manager', max: 2 },
]

function word(value) {
	return Buffer.from([(value >> 8) & 0xff, value & 0xff])
}

function frame(type, body) {
	return Buffer.concat([Buffer.from([type]), body, Buffer.from([type === 0xe0 ? 0xe7 : 0xf7])])
}

function hexToBuffer(hex) {
	return Buffer.from(hex.replace(/\s+/g, ''), 'hex')
}

function rootLookup(name) {
	const nameBytes = Buffer.from(`${name}\0`, 'ascii')
	return frame(
		0xf0,
		Buffer.concat([
			word(TCP_CLIENT_ID),
			word(0x0000),
			word(0x0002),
			word(0x0004),
			word(nameBytes.length),
			nameBytes,
		])
	)
}

function tcpHelloAck() {
	return hexToBuffer('e0 00 04 02 02 00 01 e7')
}

function udpHello(token) {
	return hexToBuffer(`e0 00 04 01 01 00 ${token.toString(16).padStart(2, '0')} e7`)
}

function keepalive() {
	return hexToBuffer('e0 00 01 03 e7')
}

function objectOpen(handle, param) {
	return frame(
		0xf0,
		Buffer.concat([
			word(TCP_CLIENT_ID),
			word(handle),
			word(param),
			word(0x0008),
			word(0x0000),
		])
	)
}

function subscribeBank(handle, param, bank) {
	return frame(
		0xf0,
		Buffer.concat([
			word(TCP_CLIENT_ID),
			word(handle),
			word(0x0002),
			word(0x0006),
			Buffer.from([
				0x00, 0x0a,
				0x00, 0x00,
				(param >> 8) & 0xff, param & 0xff,
				0x80, bank & 0xff,
				0x80, bank & 0xff,
				0xff, 0x00,
			]),
		])
	)
}

function requestParam(handle, param, index = 1) {
	return frame(
		0xf0,
		Buffer.concat([
			word(TCP_CLIENT_ID),
			word(handle),
			word(0x0002),
			word(0x0006),
			Buffer.from([
				0x00, 0x0a,
				0x00, 0x00,
				(param >> 8) & 0xff, param & 0xff,
				0x80, index & 0xff,
				0x80, index & 0xff,
				0x00, 0xff,
			]),
		])
	)
}

function subscribeLinkedParam(objectHandle, sourceParam, sourceIndex, destinationParam) {
	return frame(
		0xf0,
		Buffer.concat([
			word(TCP_CLIENT_ID),
			word(objectHandle),
			word(0x0002),
			word(0x0006),
			Buffer.from([
				0x00, 0x0a,
				0x00, 0x00,
				(sourceParam >> 8) & 0xff, sourceParam & 0xff,
				(sourceIndex >> 8) & 0xff, sourceIndex & 0xff,
				(destinationParam >> 8) & 0xff, destinationParam & 0xff,
				0x00, 0xff,
			]),
		])
	)
}

function splitTcpFrames(buffer) {
	const frames = []
	let start = -1
	let endByte = -1

	for (let i = 0; i < buffer.length; i++) {
		const value = buffer[i]
		if (start < 0 && (value === 0xe0 || value === 0xf0)) {
			start = i
			endByte = value === 0xe0 ? 0xe7 : 0xf7
		}

		if (start >= 0 && value === endByte) {
			frames.push(buffer.subarray(start, i + 1))
			start = -1
			endByte = -1
		}
	}

	return { frames, remainder: start >= 0 ? buffer.subarray(start) : Buffer.alloc(0) }
}

function splitUdpFrames(buffer, handle, param, serverId) {
	const frames = []
	let offset = 0

	while (offset < buffer.length) {
		const start = buffer.indexOf(0xf0, offset)
		if (start < 0) break

		if (
			buffer.length >= start + 12 &&
			handle != null &&
			(serverId == null || buffer.readUInt16BE(start + 1) === serverId) &&
			buffer.readUInt16BE(start + 3) === param &&
			buffer.readUInt16BE(start + 5) === handle &&
			buffer[start + 7] === 0x80
		) {
			const declaredLength = buffer.readUInt16BE(start + 9)
			const end = start + 11 + declaredLength + 1
			if (buffer.length >= end) {
				frames.push(buffer.subarray(start, end))
				offset = end
				continue
			}
		}

		const end = buffer.indexOf(0xf7, start + 1)
		if (end < 0) break

		frames.push(buffer.subarray(start, end + 1))
		offset = end + 1
	}

	return frames
}

function getRootHandleAssignment(data, serverId) {
	if (data.length !== 14 || data[0] !== 0xf0 || data[data.length - 1] !== 0xf7) return null
	if (serverId != null && data.readUInt16BE(1) !== serverId) return null
	if (data.readUInt16BE(3) !== 0x0002) return null
	if (data.readUInt16BE(5) !== 0x0000) return null
	if (data.readUInt16BE(7) !== 0x0002) return null
	if (data.readUInt16BE(9) !== 0x0002) return null
	return data.readUInt16BE(11)
}

function decodeMeter(data, handle, param, serverId) {
	if (handle == null) return null
	if (data.length < 12 || data[0] !== 0xf0 || data[data.length - 1] !== 0xf7) return null
	if (serverId != null && data.readUInt16BE(1) !== serverId) return null
	if (data.readUInt16BE(3) !== param) return null
	if (data.readUInt16BE(5) !== handle) return null
	if (data[7] !== 0x80) return null

	const bank = data[8]
	const payload = data.subarray(11, data.length - 1)
	const values = []

	for (let i = 0; i + 1 < payload.length; i += 2) {
		values.push(payload.readUInt16BE(i))
	}

	return { bank, values }
}

class AhnetMeterClient {
	constructor(instance, options) {
		this.instance = instance
		this.options = {
			tcpPort: DEFAULT_TCP_PORT,
			udpPort: DEFAULT_UDP_PORT,
			localUdpPort: 51326,
			param: 0x001d,
			banks: 10,
			...options,
		}
		this.serverId = null
		this.handle = null
		this.nameManagers = new Map()
		this.nameManagerQueue = []
		this.tcpBuffer = Buffer.alloc(0)
		this.udpPeerPort = null
		this.rootLookupPending = null
		this.rootLookupTimer = null
		this.subscribed = false
		this.subscribedBanks = new Set()
		this.activeBanks = new Set()
		this.activeNameEntries = new Map()
		this.meterValues = new Map()
		this.udpReady = false
		this.sentUdpHello = false
		this.loggedFirstMeter = false
		this.loggedFirstName = false
		this.loggedNameFrames = 0
		this.loggedNameCandidates = 0
		this.loggedUdpMessages = 0
	}

	start() {
		this.stop()
		if (!this.options.host) return
		this.instance.log('info', `AHNet meter starting host=${this.options.host} tcp=${this.options.tcpPort} udp=${this.options.udpPort} localUdp=${this.options.localUdpPort}`)

		if (typeof this.instance.createSharedUdpSocket !== 'function') {
			throw new Error('Companion shared UDP socket API is not available in this runtime')
		}

		this.udp = this.instance.createSharedUdpSocket('udp4', (message, rinfo) => this.handleUdpMessage(message, rinfo))
		this.udp.on('error', (error) => this.instance.log('error', `AHNet meter UDP error: ${error.message}`))
		this.udp.on('listening', () => {
			this.udpReady = true
			this.instance.log('info', `AHNet meter UDP listening on ${this.options.localUdpPort}`)
			this.startKeepalive()
			this.sendUdpHello()
		})
		this.udp.bind(this.options.localUdpPort)

		this.tcp = new TCPHelper(this.options.host, this.options.tcpPort, { reconnect: false })
		this.tcp.on('connect', () => {
			this.instance.log('info', `AHNet meter connected to ${this.options.host}:${this.options.tcpPort}`)
		})
		this.tcp.on('data', (data) => this.handleTcpData(data))
		this.tcp.on('error', (error) => this.instance.log('error', `AHNet meter TCP error: ${error.message}`))
		this.tcp.on('close', () => {
			this.instance.log('debug', 'AHNet meter TCP closed')
		})

	}

	setActiveSubscriptions(subscriptions = {}) {
		this.activeBanks = new Set((subscriptions.banks || []).map((bank) => parseInt(bank)).filter((bank) => Number.isFinite(bank)))
		this.activeNameEntries = new Map()
		for (const [key, entries] of Object.entries(subscriptions.nameEntries || {})) {
			this.activeNameEntries.set(
				key,
				new Set(
					(entries || [])
						.map((entry) => Math.min(Math.max(parseInt(entry), 1), 128) - 1)
						.filter((entry) => Number.isFinite(entry))
				)
			)
		}

		const subscriptionKey = `banks=${[...this.activeBanks].sort((a, b) => a - b).join(',') || 'none'} inputNames=${
			[...(this.activeNameEntries.get('input') || [])].map((entry) => entry + 1).sort((a, b) => a - b).join(',') || 'none'
		}`
		if (this.lastSubscriptionLogKey !== subscriptionKey) {
			this.lastSubscriptionLogKey = subscriptionKey
			this.instance.log('info', `AHNet active subscriptions ${subscriptionKey}`)
		}

		this.syncMeterSubscriptions()
		for (const manager of this.nameManagers.values()) {
			this.syncNameManagerSubscriptions(manager)
		}
	}

	startKeepalive() {
		if (this.keepaliveTimer) return
		this.keepaliveTimer = setInterval(() => {
			if (this.udpPeerPort) this.sendUdp(keepalive(), this.udpPeerPort)
		}, 1000)
	}

	stop() {
		if (this.keepaliveTimer) {
			clearInterval(this.keepaliveTimer)
			delete this.keepaliveTimer
		}
		if (this.rootLookupTimer) {
			clearTimeout(this.rootLookupTimer)
			delete this.rootLookupTimer
		}
		if (this.tcp) {
			this.tcp.destroy()
			delete this.tcp
		}
		if (this.udp) {
			try {
				if (this.udpReady) this.udp.close()
			} catch (error) {
				this.instance.log('debug', `AHNet meter UDP close ignored: ${error.message}`)
			}
			delete this.udp
		}
		this.udpReady = false
		this.sentUdpHello = false
		this.serverId = null
		this.handle = null
		this.nameManagers = new Map()
		this.nameManagerQueue = []
		this.tcpBuffer = Buffer.alloc(0)
		this.rootLookupPending = null
		this.subscribed = false
		this.subscribedBanks = new Set()
		this.loggedFirstMeter = false
		this.loggedFirstName = false
		this.loggedNameFrames = 0
		this.loggedNameCandidates = 0
		this.loggedUdpMessages = 0
	}

	sendUdpHello() {
		if (!this.udpReady || this.serverId == null || this.sentUdpHello) return
		const token = this.serverId & 0xff
		this.sendUdp(udpHello(token), this.options.udpPort)
		this.sentUdpHello = true
		this.instance.log('info', `AHNet meter UDP hello sent token=0x${token.toString(16).padStart(2, '0')}`)
	}

	sendUdp(buffer, port) {
		if (!this.udp || !this.udpReady) return
		try {
			this.udp.send(buffer, port, this.options.host)
		} catch (error) {
			this.instance.log('error', `AHNet meter UDP send error: ${error.message}`)
		}
	}

	sendTcp(buffer) {
		if (!this.tcp || this.tcp.isDestroyed) return
		this.tcp.send(buffer).catch((error) => {
			this.instance.log('error', `AHNet meter TCP send error: ${error.message}`)
		})
	}

	handleTcpData(data) {
		this.tcpBuffer = Buffer.concat([this.tcpBuffer, data])
		const result = splitTcpFrames(this.tcpBuffer)
		this.tcpBuffer = result.remainder

		for (const item of result.frames) {
			if (item.length >= 10 && item[0] === 0xf0 && item[item.length - 1] === 0xf7) {
				const object = item.readUInt16BE(3)
				const method = item.readUInt16BE(5)
				if (this.handleInputNameColourObjectFrame(item, object, method)) continue
			}
			if (this.handleAhnetNameFrame(item)) continue
			if (this.handleNameOpenAck(item)) continue
			this.logNameCandidate(item, 'tcp')

			const assignedHandle = getRootHandleAssignment(item, this.serverId)
			if (assignedHandle != null && this.rootLookupPending === 'meters') {
				this.rootLookupPending = null
				this.handle = assignedHandle
				this.instance.log('info', `AHNet meter root handle 0x${assignedHandle.toString(16).padStart(4, '0')}`)
				this.subscribeMeters()
			} else if (assignedHandle != null && this.rootLookupPending?.type === 'nameManager') {
				const manager = this.rootLookupPending.manager
				this.rootLookupPending = null
				if (this.rootLookupTimer) {
					clearTimeout(this.rootLookupTimer)
					delete this.rootLookupTimer
				}
				manager.handle = assignedHandle
				manager.count = 0
			this.nameManagers.set(assignedHandle, manager)
			this.instance.log('info', `AHNet ${manager.key} name root handle 0x${assignedHandle.toString(16).padStart(4, '0')}`)
			this.subscribeNameManager(manager)
			this.syncNameManagerSubscriptions(manager)
			setTimeout(() => this.lookupNextNameManager(), 50)
			}

			if (item.equals(hexToBuffer('e0 00 02 01 02 e7'))) {
				this.sendTcp(item)
			} else if (item[0] === 0xe0 && item[1] === 0x00 && item[2] === 0x04 && item[3] === 0x02 && item[4] === 0x02) {
				this.serverId = item.readUInt16BE(5)
				this.instance.log('info', `AHNet meter session id 0x${this.serverId.toString(16).padStart(4, '0')}`)
				this.sendUdpHello()
				this.sendTcp(tcpHelloAck())
				setTimeout(() => this.lookupMeteringSources(), 1000)
			}
		}
	}

	lookupMeteringSources() {
		if (this.subscribed || this.rootLookupPending) return
		this.rootLookupPending = 'meters'
		this.instance.log('info', 'AHNet meter root lookup "Metering Sources"')
		this.sendTcp(rootLookup('Metering Sources'))
	}

	subscribeMeters() {
		if (this.subscribed || this.handle == null) return
		this.subscribed = true
		this.instance.log('info', `AHNet meter subscribe handle=0x${this.handle.toString(16).padStart(4, '0')} active banks=${[...this.activeBanks].sort((a, b) => a - b).join(',') || 'none'}`)
		this.sendTcp(objectOpen(this.handle, this.options.param))
		this.syncMeterSubscriptions()
		this.lookupNameManagers()
	}

	syncMeterSubscriptions() {
		if (!this.subscribed || this.handle == null) return
		for (const bank of [...this.activeBanks].sort((a, b) => a - b)) {
			if (bank < 0 || bank > this.options.banks || this.subscribedBanks.has(bank)) continue
			this.subscribedBanks.add(bank)
			this.instance.log('debug', `AHNet meter bank subscribe ${bank}`)
			this.sendTcp(subscribeBank(this.handle, this.options.param, bank))
		}
	}

	lookupNameManagers() {
		if (this.nameManagerQueue.length > 0 || this.rootLookupPending) return
		this.nameManagerQueue = NAME_MANAGERS.map((manager) => ({
			...manager,
			handle: null,
			count: 0,
		}))
		this.instance.log('info', `AHNet name manager lookup queue=${this.nameManagerQueue.map((manager) => manager.key).join(',') || 'none'}`)
		this.lookupNextNameManager()
	}

	lookupNextNameManager() {
		if (this.rootLookupPending || this.nameManagerQueue.length === 0) return
		const manager = this.nameManagerQueue.shift()
		this.rootLookupPending = { type: 'nameManager', manager }
		this.instance.log('info', `AHNet root lookup "${manager.root}"`)
		this.sendTcp(rootLookup(manager.root))

		this.rootLookupTimer = setTimeout(() => {
			if (this.rootLookupPending?.type !== 'nameManager' || this.rootLookupPending.manager.key !== manager.key) return
			this.instance.handleAhnetMixConfig(manager.key, 0)
			this.rootLookupPending = null
			delete this.rootLookupTimer
			this.lookupNextNameManager()
		}, 1500)
	}

	subscribeNameManager(manager) {
		if (manager.subscribed || manager.handle == null) return
		manager.subscribed = true
		manager.opened = false
		manager.subscribedEntries = new Set()
		this.instance.log(
			'info',
			`AHNet ${manager.key} name subscribe handle=0x${manager.handle.toString(16).padStart(4, '0')} param=0x${(manager.param || 0x0020).toString(16).padStart(4, '0')} active entries only`
		)
		this.sendTcp(objectOpen(manager.handle, manager.param || 0x0020))
		manager.openTimer = setTimeout(() => this.markNameManagerOpened(manager, 'fallback'), 250)
	}

	syncNameManagerSubscriptions(manager) {
		if (!manager?.subscribed || !manager.opened || manager.handle == null) return
		const entries = manager.key == 'input' ? this.activeNameEntries.get(manager.key) || new Set() : new Set(Array.from({ length: manager.max }, (_, index) => index))
		if (manager.key == 'input') {
			this.instance.log(
				'info',
				`AHNet input name active entries=${[...entries].map((entry) => entry + 1).sort((a, b) => a - b).join(',') || 'none'}`
			)
		} else if (!manager.loggedConfigScan) {
			manager.loggedConfigScan = true
			this.instance.log('info', `AHNet ${manager.key} config scan max=${manager.max}`)
		}
		for (const index of [...entries].sort((a, b) => a - b)) {
			if (index < 0 || index >= manager.max || manager.subscribedEntries?.has(index)) continue
			if (!manager.subscribedEntries) manager.subscribedEntries = new Set()
			manager.subscribedEntries.add(index)
			this.instance.log('info', `AHNet ${manager.key} name entry subscribe ${index + 1}`)
			const request = requestParam(manager.handle, manager.param || 0x0020, index)
			this.instance.log('info', `AHNet ${manager.key} name request ${request.toString('hex')}`)
			this.sendTcp(request)
			this.sendTcp(objectOpen(manager.handle, manager.param || 0x0020))
			this.subscribeNameColourEntry(manager, index)
			setTimeout(() => {
				if (!this.nameManagers.has(manager.handle) || this.loggedFirstName) return
				this.instance.log('info', `AHNet ${manager.key} name request retry ${request.toString('hex')}`)
				this.sendTcp(request)
				this.sendTcp(objectOpen(manager.handle, manager.param || 0x0020))
				this.subscribeNameColourEntry(manager, index)
			}, 750)
		}
	}

	subscribeNameColourEntry(manager, index) {
		if (manager.key !== 'input') return
		const objectHandle = 0x0131 + index
		this.sendTcp(objectOpen(objectHandle, manager.handle))
		this.sendTcp(subscribeLinkedParam(manager.handle, objectHandle, 0x8020, 0x8000 + index))
		this.sendTcp(subscribeLinkedParam(manager.handle, objectHandle, 0x8021, 0x8040 + index))
	}

	handleNameOpenAck(data) {
		if (data.length !== 12 || data[0] !== 0xf0 || data[data.length - 1] !== 0xf7) return false
		if (this.serverId != null && data.readUInt16BE(1) !== this.serverId) return false
		if (data.readUInt16BE(7) !== 0x0008) return false

		const object = data.readUInt16BE(3)
		const method = data.readUInt16BE(5)
		if (this.handleInputNameColourObjectFrame(data, object, method)) return true
		const manager = this.nameManagers.get(method)
		if (!manager || object !== (manager.param || 0x0020)) return false

		this.markNameManagerOpened(manager, 'acknowledged')
		return true
	}

	handleInputNameColourObjectFrame(data, object, method) {
		const manager = [...this.nameManagers.values()].find((item) => item.key === 'input' && item.handle === method)
		if (!manager || object < 0x0131 || object > 0x0170) return false
		const channel = object - 0x0131 + 1
		if ((data.readUInt16BE(7) & 0x7fff) === 0x0020) {
			const payload = data.subarray(9, data.length - 1)
			const length = payload[1] || 0
			const name = payload.subarray(2, 2 + length).toString('ascii').trim()
			if (name) {
				this.instance.handleAhnetChannelName('input', channel, name)
				this.instance.log('info', `AHNet input name ${channel}: "${name}"`)
			}
			return true
		}
		if ((data.readUInt16BE(7) & 0x7fff) === 0x0021) {
			const payload = data.subarray(9, data.length - 1)
			const colourIndex = payload[payload.length - 1]
			const colour = this.getAhnetColour(colourIndex)
			this.instance.handleAhnetChannelName('input', channel, undefined, colour)
			this.instance.log('info', `AHNet input colour ${channel}: ${colourIndex}`)
			return true
		}
		return false
	}

	getAhnetColour(index) {
		const colours = {
			0: { r: 0, g: 0, b: 0 },
			1: { r: 220, g: 40, b: 40 },
			2: { r: 0, g: 190, b: 80 },
			3: { r: 245, g: 200, b: 0 },
			4: { r: 150, g: 80, b: 220 },
			5: { r: 190, g: 80, b: 220 },
			6: { r: 0, g: 120, b: 255 },
		}
		return colours[index] || { r: 80, g: 80, b: 80 }
	}

	markNameManagerOpened(manager, reason) {
		if (!manager || manager.opened) return
		manager.opened = true
		if (manager.openTimer) {
			clearTimeout(manager.openTimer)
			delete manager.openTimer
		}
		this.instance.log('info', `AHNet ${manager.key} name open ${reason}`)
		this.syncNameManagerSubscriptions(manager)
	}

	handleUdpMessage(message, rinfo) {
		const packet = Buffer.isBuffer(message) ? message : Buffer.from(message)
		if (this.loggedUdpMessages < 12) {
			this.loggedUdpMessages++
			this.instance.log('info', `AHNet meter UDP rx ${rinfo.address}:${rinfo.port} ${packet.length} ${packet.toString('hex').slice(0, 96)}`)
		}
		if (rinfo.address === this.options.host && rinfo.port !== this.options.udpPort) this.udpPeerPort = rinfo.port

		const frames = splitUdpFrames(packet, this.handle, this.options.param, this.serverId)
		if (frames.length > 0 && !this.loggedFirstMeter && this.loggedUdpMessages <= 12) {
			this.instance.log('info', `AHNet meter UDP split frames=${frames.length}`)
		}
		for (const item of frames) {
			const meter = decodeMeter(item, this.handle, this.options.param, this.serverId)
			if (!meter) continue
			if (!this.loggedFirstMeter) {
				this.loggedFirstMeter = true
				this.instance.log('info', `AHNet meter first bank=${meter.bank} values=${meter.values.length}`)
			}

			for (let index = 0; index < meter.values.length; index++) {
				this.meterValues.set(`${meter.bank}:${index}`, meter.values[index])
			}
			this.instance.handleAhnetMeterBank(meter.bank, meter.values)
		}

		for (const manager of this.nameManagers.values()) {
			const nameFrames = splitUdpFrames(packet, manager.handle, manager.param || 0x0020, this.serverId)
			for (const item of nameFrames) {
				this.handleAhnetNameFrame(item)
			}
		}
	}

	handleAhnetNameFrame(data) {
		if (data.length < 13 || data[0] !== 0xf0 || data[data.length - 1] !== 0xf7) return false
		if (this.serverId != null && data.readUInt16BE(1) !== this.serverId) return false
		const object = data.readUInt16BE(3)
		const method = data.readUInt16BE(5)
		const manager = this.nameManagers.get(method)
		if (!manager) return false
		if (object !== (manager.param || 0x0020)) return false

		const payload = data.subarray(9, data.length - 1)
		if (payload.length < 4) return true

		const startIndex = data[8] || 0
		let offset = 2
		let entry = startIndex
		while (offset < payload.length && entry < manager.max) {
			const next = payload.indexOf(0x00, offset)
			if (next < 0) break
			const name = payload.subarray(offset, next).toString('ascii').trim()
			offset = next + 1

			if (!name) continue

			manager.count = Math.max(manager.count || 0, entry + 1)
			this.instance.handleAhnetChannelName(manager.key, entry + 1, name)
			if (!this.loggedFirstName || this.loggedNameFrames < 12) {
				this.loggedFirstName = true
				this.loggedNameFrames++
				this.instance.log('info', `AHNet ${manager.key} name ${entry + 1}: "${name}"`)
			}
			entry++
		}
		if (manager.key !== 'input') this.instance.handleAhnetMixConfig(manager.key, manager.count)
		return true
	}

	logNameCandidate(data, source) {
		if (this.loggedNameCandidates >= 12 || data.length < 10 || data[0] !== 0xf0) return
		const object = data.readUInt16BE(3)
		const method = data.readUInt16BE(5)
		const manager = this.nameManagers.get(method) || this.nameManagers.get(object)
		if (!manager && object !== 0x0020 && method !== 0x0020) return
		this.loggedNameCandidates++
		this.instance.log(
			'info',
			`AHNet name candidate ${source} obj=0x${object.toString(16).padStart(4, '0')} meth=0x${method.toString(16).padStart(4, '0')} len=0x${data.readUInt16BE(7).toString(16)} hex=${data.toString('hex').slice(0, 160)}`
		)
	}
}

module.exports = { AhnetMeterClient }
