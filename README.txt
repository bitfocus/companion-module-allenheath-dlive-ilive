# Allen & Heath dLive TCP MIDI Receiver

A Bitfocus Companion module for receiving TCP MIDI softkey commands from Allen & Heath dLive mixing consoles.

## Overview

This module connects to dLive mixers via TCP and receives MIDI messages in real-time, creating Companion variables specifically for:

- **Softkey commands** from dLive surface (Note On/Off messages only)
- **Connection monitoring** and status tracking
- **Basic MIDI activity** logging

Perfect for integrating dLive softkey controls with Companion workflows while ignoring fader spam and other unnecessary MIDI traffic.

## Quick Start

1. **Install** the module in Companion 3.5.5+
2. **Configure** your dLive IP address (default port 51325)
3. **Enable** MIDI over TCP on your dLive (Utility > Control > MIDI)
4. **Configure softkeys** on dLive to send MIDI Note On/Off messages
5. **Use variables** in your Companion buttons and conditions

## Key Features

- ✅ **TCP MIDI reception** from dLive with persistent connection
- ✅ **Softkey-focused** - Only processes Note On/Off messages
- ✅ **Ignores fader spam** - No Control Change or other MIDI clutter
- ✅ **Auto-reconnection** with 15-second keep-alive
- ✅ **Rate limiting** prevents overload (50 messages/second max)
- ✅ **1-second reset** for display variables

## Configuration

### dLive Setup
```
Utility > Control > MIDI:
- Base MIDI Channel: 1 (or your preference)
- MIDI over TCP: Enabled
- Configure softkeys to send Note On/Off messages
- Note your MixRack IP address
```

### Module Settings
- **dLive IP**: Your MixRack/Surface IP address
- **Port**: 51325 (MixRack unencrypted - most common)
- **Base MIDI Channel**: Must match dLive setting (currently not used for softkey detection)
- **Reconnect Interval**: Auto-reconnect delay in seconds (0 = disable)
- **Debug MIDI**: Enable detailed MIDI logging

## Variables Available

### Connection Status
- `$(dlive:connection_status)` - "Connected" or "Disconnected"
- `$(dlive:tcp_connected)` - "Yes" or "No"
- `$(dlive:last_connection_time)` - Connection timestamp

### MIDI Activity
- `$(dlive:midi_messages_received)` - Total message count
- `$(dlive:last_midi_time)` - Last message timestamp  
- `$(dlive:last_midi_hex)` - Last message in hex format (resets after 1s)

### Softkey States
- `$(dlive:active_softkeys)` - Count of currently pressed softkeys
- `$(dlive:last_softkey_pressed)` - Last softkey ID (resets after 1s)

### Dynamic Softkey Variables (Created automatically)
- `$(dlive:softkey_note_1_127_status)` - "PRESSED" or "RELEASED"
- `$(dlive:softkey_note_1_127_velocity)` - MIDI velocity value
- `$(dlive:softkey_note_1_127_time)` - Press/release timestamp

## Example Uses

### Softkey Integration
Configure dLive softkey to send MIDI Note On (Ch1, Note 127):
```
Button Condition: $(dlive:softkey_note_1_127_status) == "PRESSED"
Action: Trigger your custom Companion action
```

### Connection Monitor
```
Button Text: "dLive: $(dlive:connection_status)"
Button Color: Green when "Connected", Red when "Disconnected"
```

### Activity Display
```
Button Text: "MIDI: $(dlive:midi_messages_received)"
Shows total count of received softkey messages
```

### Last Command Display
```
Button Text: "Last: $(dlive:last_softkey_pressed)"
Shows: "note_1_127" when softkey pressed, "None" after 1 second
```

## Network Ports

| Port  | Description |
|-------|-------------|
| 51325 | MixRack MIDI (unencrypted) ⭐ **Recommended** |
| 51327 | MixRack MIDI (TLS encrypted) |
| 51328 | Surface MIDI (unencrypted) |
| 51329 | Surface MIDI (TLS encrypted) |

## MIDI Implementation

### Processed Messages
- **Note On (0x90)** - Softkey press detection
  - Velocity > 0: Creates "PRESSED" status
  - Velocity = 0: Creates "RELEASED" status
- **Note Off (0x80)** - Softkey release detection

### Ignored Messages (Performance Optimization)
- **Control Change (0xB0)** - Fader movements, encoders
- **Program Change (0xC0)** - Scene recalls
- **Pitch Bend (0xE0)** - Preamp controls
- **System Exclusive** - Name changes, colors

### Rate Limiting
- **Maximum 50 messages/second** processed
- **100ms throttle** for identical messages
- **Automatic cleanup** of old message timestamps

## Troubleshooting

### Connection Issues
- ✅ Verify dLive IP address is correct
- ✅ Check MIDI over TCP is enabled on dLive
- ✅ Try port 51325 first (most common)
- ✅ Test network connectivity (ping dLive)
- ✅ Restart Companion if module stops responding

### No Softkey Detection
- ✅ Configure dLive softkeys to send MIDI Note On/Off
- ✅ Check softkey MIDI channel/note settings
- ✅ Enable debug mode to see raw MIDI data
- ✅ Verify softkey sends Note messages (not CC)

### Module Stops Working
- ✅ **Try**: Disable/re-enable module in Companion
- ✅ **Try**: Change any config setting to trigger reconnection
- ✅ **Last resort**: Restart Companion completely

### Debug Mode Output
Enable debug to see detailed logging:
```
=== TCP DATA RECEIVED: 90 7F 7F (3 bytes) ===
=== PROCESSING MESSAGE 1 ===
Softkey pressed: Channel 1, Note 127, Velocity 127
```

## Safe Test Commands

For testing without interfering with dLive operations:
- **Note 127**: `90 7F 7F` (Note On, Channel 1, Note 127, Velocity 127)
- **Note 126**: `90 7E 7F` (Note On, Channel 1, Note 126, Velocity 127)

These high note numbers are typically unused by dLive's internal MIDI mapping.

## Technical Details

### Connection Management
- **TCP keep-alive**: 15-second intervals
- **No timeout**: Connection stays open indefinitely
- **Auto-reconnect**: Configurable interval (default 5 seconds)
- **Clean disconnect**: Proper socket cleanup on module disable

### Variable Reset Behavior
- **Display variables** (`last_midi_hex`, `last_softkey_pressed`) reset after 1 second
- **Status variables** (`connection_status`, `midi_messages_received`) persist
- **Softkey variables** (`softkey_note_X_X_status`) update immediately

## Development

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

### Performance Optimizations
- **Softkey-only processing** - Ignores 90%+ of dLive MIDI traffic
- **Rate limiting** - Prevents overload from rapid messages
- **Efficient buffering** - Minimal memory usage
- **Smart reconnection** - Only reconnects when actually needed

## Version History

- **1.0.0** (2025): Initial release
  - TCP MIDI reception for softkeys only
  - Connection monitoring and auto-reconnect
  - Rate limiting and performance optimization
  - Real-time variable updates with 1-second reset

## Support

- **Issues**: [GitHub Issues](https://github.com/jensen-user/companion-module-allenheath-dlive/issues)
- **Discussions**: [Companion Community](https://github.com/bitfocus/companion/discussions)
- **Documentation**: [dLive MIDI Protocol](https://www.allen-heath.com/dlive)

---

**Focused on Softkeys** | **Optimized for Performance** | **Allen & Heath dLive Integration**