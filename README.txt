# Allen & Heath dLive TCP MIDI Receiver

A Bitfocus Companion module for receiving TCP MIDI messages from Allen & Heath dLive mixing consoles.

## Overview

This module connects to dLive mixers via TCP and receives MIDI messages in real-time, creating Companion variables for:

- **Softkey commands** from dLive surface
- **Channel mute states** (inputs, DCAs, groups)
- **Scene recall notifications**
- **Connection and activity monitoring**

Perfect for integrating dLive surface controls with Companion workflows.

## Quick Start

1. **Install** the module in Companion 3.5.5+
2. **Configure** your dLive IP address and MIDI settings
3. **Enable** MIDI over TCP on your dLive (Utility > Control > MIDI)
4. **Start receiving** MIDI data and using variables in your buttons

## Key Features

- ✅ **Real-time TCP MIDI reception** from dLive
- ✅ **Dynamic variable creation** for all received MIDI
- ✅ **Softkey integration** for custom surface controls
- ✅ **Channel state monitoring** (mutes, scenes)
- ✅ **Auto-reconnection** with connection monitoring
- ✅ **Debug mode** for development and troubleshooting

## Configuration

### dLive Setup
```
Utility > Control > MIDI:
- Base MIDI Channel: 1 (or your preference)
- MIDI over TCP: Enabled
- Note your MixRack IP address
```

### Module Settings
- **dLive IP**: Your MixRack/Surface IP
- **Port**: 51325 (MixRack unencrypted - most common)
- **Base MIDI Channel**: Must match dLive setting
- **Reconnect**: Auto-reconnect interval in seconds

## Variables Available

### Connection Status
- `$(dlive:connection_status)` - Connected/Disconnected
- `$(dlive:tcp_connected)` - Yes/No
- `$(dlive:midi_messages_received)` - Message count

### Channel States (Real-time)
- `$(dlive:ch_1_mute)` through `$(dlive:ch_32_mute)` - ON/OFF
- `$(dlive:dca_1_mute)` through `$(dlive:dca_24_mute)` - ON/OFF

### Softkeys (Dynamic)
- `$(dlive:softkey_note_1_60_status)` - ACTIVE/INACTIVE
- `$(dlive:active_softkeys)` - Count of active softkeys
- `$(dlive:last_softkey_pressed)` - Last softkey ID

### MIDI Activity
- `$(dlive:last_midi_hex)` - Last message in hex
- `$(dlive:last_midi_type)` - Message type
- `$(dlive:current_scene)` - Current scene number

## Example Uses

### Softkey Integration
Configure dLive softkey to send MIDI Note On (Ch1, Note 60):
```
Button Condition: $(dlive:softkey_note_1_60_status) == "ACTIVE"
Action: Trigger your custom Companion action
```

### Mute Status Display
```
Button Text: "Ch1: $(dlive:ch_1_mute)"
Shows: "Ch1: ON" when muted, "Ch1: OFF" when unmuted
```

### Connection Monitor
```
Button Text: "dLive: $(dlive:connection_status)"
Button Color: Green when "Connected", Red when "Disconnected"
```

## Network Ports

| Port  | Description |
|-------|-------------|
| 51325 | MixRack MIDI (unencrypted) ⭐ **Recommended** |
| 51327 | MixRack MIDI (TLS encrypted) |
| 51328 | Surface MIDI (unencrypted) |
| 51329 | Surface MIDI (TLS encrypted) |

## Troubleshooting

### Connection Issues
- ✅ Verify dLive IP address
- ✅ Check MIDI over TCP is enabled on dLive
- ✅ Try port 51325 first (most common)
- ✅ Test network connectivity (ping dLive)

### No MIDI Messages
- ✅ Check Base MIDI Channel matches dLive
- ✅ Enable debug mode to see raw MIDI
- ✅ Test with simple channel mute on dLive
- ✅ Verify dLive sends MIDI feedback

### Softkey Issues
- ✅ Configure softkeys to send MIDI on dLive
- ✅ Check softkey MIDI channel/note settings
- ✅ Use debug mode to verify MIDI transmission

## Development

### Requirements
- Node.js 22+
- Companion 3.5.5+
- Allen & Heath dLive with MIDI over TCP

### File Structure
```
companion-module-allenheath-dlive/
├── main.js                 # Main module code
├── package.json           # NPM configuration
├── LICENSE               # MIT license
├── README.md            # This file
└── companion/
    ├── manifest.json    # Companion module manifest
    └── HELP.md         # User help documentation
```

### Installation for Development
```bash
# Clone repository
git clone https://github.com/jensen-user/companion-module-allenheath-dlive.git
cd companion-module-allenheath-dlive

# Install dependencies
npm install

# Link to Companion dev modules directory
# (Follow Companion development setup guide)
```

## Contributing

1. **Fork** the repository
2. **Create** a feature branch
3. **Test** with actual dLive hardware
4. **Submit** a pull request

## License

MIT License - see [LICENSE](LICENSE) for details.

## Support

- **Issues**: [GitHub Issues](https://github.com/jensen-user/companion-module-allenheath-dlive/issues)
- **Discussions**: [Companion Community](https://github.com/bitfocus/companion/discussions)
- **Documentation**: [dLive MIDI Protocol](https://www.allen-heath.com/dlive)

## Version

**Current Version**: 1.0.0

### Changelog
- **1.0.0** (2025): Initial release
  - TCP MIDI reception from dLive
  - Real-time variable creation
  - Softkey and channel tracking
  - Auto-reconnection

---

**Made for Bitfocus Companion** | **Allen & Heath dLive** | **TCP MIDI Integration**
