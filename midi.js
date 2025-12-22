const { EventEmitter } = require('events')

class MidiParser extends EventEmitter {
    constructor() {
        super()
        this.buffer = Buffer.alloc(0)
        this.lastStatusByte = null
        this.sysexBuffer = null
    }

    /**
     * Process incoming data from socket
     * @param {Buffer} data - Raw data buffer from socket
     */
    processData(data) {
        this.buffer = Buffer.concat([this.buffer, data])
        this.parseMessages()
    }

    /**
     * Parse MIDI messages from buffer
     */
    parseMessages() {
        while (this.buffer.length > 0) {
            let statusByte = this.buffer[0]
            
            // Handle SysEx messages
            if (statusByte === 0xf0) {
                this.parseSysEx()
                continue
            }
            
            // End of SysEx (shouldn't happen outside of SysEx parsing)
            if (statusByte === 0xf7) {
                this.buffer = this.buffer.slice(1)
                continue
            }
            
            let dataStartIndex = 1
            
            // Check if this is a data byte (running status)
            if ((statusByte & 0x80) === 0) {
                if (this.lastStatusByte === null) {
                    // No running status available, skip this byte
                    this.buffer = this.buffer.slice(1)
                    continue
                }
                // Use running status
                statusByte = this.lastStatusByte
                dataStartIndex = 0
            } else {
                // Store new status byte for running status (not for system messages)
                if ((statusByte & 0xf0) !== 0xf0) {
                    this.lastStatusByte = statusByte
                }
            }

            const messageType = statusByte & 0xf0
            const channel = statusByte & 0x0f

            let messageLength = this.getMessageLength(messageType)
            
            if (messageLength === 0) {
                this.buffer = this.buffer.slice(1)
                continue
            }

            // Adjust length for running status (no status byte in buffer)
            const requiredBytes = dataStartIndex === 0 ? messageLength - 1 : messageLength
            
            if (this.buffer.length < requiredBytes) {
                break // Wait for more data
            }

            // Reconstruct message with status byte
            let message
            if (dataStartIndex === 0) {
                // Running status: prepend status byte
                message = Buffer.concat([
                    Buffer.from([statusByte]),
                    this.buffer.slice(0, messageLength - 1)
                ])
                this.buffer = this.buffer.slice(messageLength - 1)
            } else {
                message = this.buffer.slice(0, messageLength)
                this.buffer = this.buffer.slice(messageLength)
            }

            this.emitMessage(messageType, channel, message)
        }
    }

    /**
     * Parse System Exclusive message
     */
    parseSysEx() {
        // Find end of SysEx (0xF7)
        const endIndex = this.buffer.indexOf(0xf7)
        
        if (endIndex === -1) {
            // SysEx not complete yet, wait for more data
            return
        }
        
        // Extract complete SysEx message including 0xF0 and 0xF7
        const sysexMessage = this.buffer.slice(0, endIndex + 1)
        this.buffer = this.buffer.slice(endIndex + 1)
        
        // Emit SysEx message
        this.emit('sysex', {
            type: 0xf0,
            raw: sysexMessage,
            data: sysexMessage.slice(1, -1) // Data without 0xF0 and 0xF7
        })
        
        this.emit('message', {
            type: 0xf0,
            raw: sysexMessage,
            data: sysexMessage.slice(1, -1)
        })
    }

    /**
     * Get expected message length based on status byte
     * @param {number} messageType - MIDI message type
     * @returns {number} Expected message length in bytes
     */
    getMessageLength(messageType) {
        switch (messageType) {
            case 0x80: // Note Off
            case 0x90: // Note On
            case 0xa0: // Polyphonic Aftertouch
            case 0xb0: // Control Change
            case 0xe0: // Pitch Bend
                return 3
            case 0xc0: // Program Change
            case 0xd0: // Channel Aftertouch
                return 2
            default:
                return 0
        }
    }

    /**
     * Emit parsed MIDI message
     * @param {number} messageType - MIDI message type
     * @param {number} channel - MIDI channel (0-15)
     * @param {Buffer} message - Complete MIDI message
     */
    emitMessage(messageType, channel, message) {
        const data = {
            type: messageType,
            channel: channel,
            raw: message
        }

        switch (messageType) {
            case 0x90: // Note On
            case 0x80: // Note Off
                data.note = message[1]
                data.velocity = message[2]
                this.emit(messageType === 0x90 ? 'noteOn' : 'noteOff', data)
                break
            case 0xb0: // Control Change
                data.controller = message[1]
                data.value = message[2]
                this.emit('controlChange', data)
                break
            case 0xe0: // Pitch Bend
                data.value = (message[2] << 7) | message[1]
                this.emit('pitchBend', data)
                break
            case 0xc0: // Program Change
                data.program = message[1]
                this.emit('programChange', data)
                break
        }

        this.emit('message', data)
    }

    /**
     * Clear internal buffer
     */
    clear() {
        this.buffer = Buffer.alloc(0)
        this.lastStatusByte = null
        this.sysexBuffer = null
    }
}

module.exports = MidiParser