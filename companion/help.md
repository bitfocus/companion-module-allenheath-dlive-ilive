# Allen & Heath dLive TCP MIDI Receiver

This Companion module receives TCP MIDI messages from Allen & Heath dLive mixing consoles and creates variables for use in button conditions, feedbacks, and text displays.

## Purpose

This module is specifically designed to **receive** MIDI messages from dLive surfaces, making it perfect for:
- **Softkey integration** - Capture custom MIDI commands from dLive softkeys
- **Real-time feedback** - Monitor channel mutes, scene changes, and surface activity
- **Status monitoring** - Track connection state and MIDI activity
- **Custom workflows** - Use dLive surface controls to trigger Companion actions

## Configuration

### Basic Settings

- **dLive IP Address**: The IP address of your dLive MixRack or Surface
- **MIDI Port**: Select the appropriate TCP MIDI port:
  - `51325` - MixRack (unencrypted) - **Most common**
  - `51327` - MixRack (TLS encrypted)
  - `51328` - Surface (unencrypted)
  - `51329` - Surface (TLS encrypted)
- **Base MIDI Channel**: Must match your dLive MIDI configuration (Utility > Control > MIDI)
- **Reconnect Interval**: How often to retry connection when lost (1-60 seconds)
- **Debug MIDI Messages**: Enable to see all received MIDI in the log

### dLive Configuration Required

On your dLive console:
1. Go to **Utility > Control > MIDI**
2. Set **Base MIDI Channel** (remember this number)
3. Enable **MIDI over TCP**
4. Note the **MixRack IP address**
5. Configure **Softkeys** to send MIDI commands (if using softkeys)

## Network Ports

The module connects TO your dLive using these official ports:
- **Port 51325**: MixRack MIDI (unencrypted) - **Recommended**
- **Port 51327**: MixRack MIDI (TLS encrypted)
- **Port 51328**: Surface MIDI (unencrypted)
- **Port 51329**: Surface MIDI (TLS encrypted)

## Variables Created

### Connection Status
- `$(dlive:connection_status)` - "Connected" or "Disconnected"
- `$(dlive:tcp_connected)` - "Yes" or "No"
- `$(dlive:last_connection_time)` - Timestamp of last successful connection

### MIDI Activity
- `$(dlive:midi_messages_received)` - Total count of MIDI messages
- `$(dlive:last_midi_time)` - Timestamp of last MIDI message
- `$(dlive:last_midi_hex)` - Last MIDI message in hex format (e.g., "90 3C 7F")
- `$(dlive:last_midi_type)` - Type of last message (Note On, Control Change, etc.)

### Channel States (Real-time)
- `$(dlive:ch_1_mute)` through `$(dlive:ch_32_mute)` - "ON" or "OFF"
- `$(dlive:dca_1_mute)` through `$(dlive:dca_24_mute)` - "ON" or "OFF"

### Scene Information
- `$(dlive:current_scene)` - Current scene number
- `$(dlive:last_scene_recall)` - Timestamp and scene number of last recall

### Softkey Tracking (Dynamic)
- `$(dlive:active_softkeys)` - Count of currently active softkeys
- `$(dlive:last_softkey_pressed)` - ID of last softkey pressed
- `$(dlive:softkey_[type]_[channel]_[note]_status)` - "ACTIVE" or "INACTIVE"
- `$(dlive:softkey_[type]_[channel]_[note]_velocity)` - MIDI velocity value
- `$(dlive:softkey_[type]_[channel]_[note]_time)` - Timestamp

## Example Use Cases

### 1. Softkey Integration
Configure a dLive softkey to send MIDI Note On (channel 1, note 60):
- Variable `$(dlive:softkey_note_1_60_status)` will show "ACTIVE"/"INACTIVE"
- Use this variable in button conditions to trigger Companion actions

### 2. Mute Status Display
Display real-time channel mute status:
- Text: "Channel 1: $(dlive:ch_1_mute)"
- Shows "Channel 1: ON" when muted, "Channel 1: OFF" when unmuted

### 3. Connection Monitoring
Show connection status on a button:
- Text: "dLive: $(dlive:connection_status)"
- Background color changes based on connection state

### 4. MIDI Activity Monitor
Create a "MIDI Activity" button:
- Text: "MIDI: $(dlive:midi_messages_received)"
- Shows total count of received messages

## MIDI Implementation

### Supported Message Types

**Note On/Off (0x9n/0x8n)**
- Channel mutes (Input channels, DCAs, Groups, etc.)
- Softkey triggers
- Any custom Note commands from dLive

**Control Change (0xBn)**
- Surface controls (faders, rotary encoders)
- Softkey CC commands
- UFX parameters

**Program Change (0xCn)**
- Scene recalls
- Cue list changes

### Channel Mapping (per dLive specification)
- **Input Channels 1-128**: Base MIDI Channel, Notes 0x00-0x7F
- **DCA 1-24**: Base MIDI Channel + 4, Notes 0x36-0x4D
- **Groups/Aux/Matrix**: Base MIDI Channel + 1/2/3

## Troubleshooting

### Connection Issues

**"Connection Failed" Status**
- Verify dLive IP address is correct
- Check network connectivity (ping the dLive)
- Ensure MIDI over TCP is enabled on dLive
- Try different port (51325 is most common)

**"Connected" but No MIDI Messages**
- Check Base MIDI Channel matches dLive
- Verify dLive is configured to send MIDI feedback
- Enable debug mode to see raw MIDI traffic
- Test with a simple channel mute on dLive

### MIDI Issues

**No Softkey Variables Created**
- Softkeys must be configured to send MIDI on dLive
- Check softkey MIDI channel/note configuration
- Enable debug mode to verify MIDI is being sent

**Incorrect Channel Mute Status**
- Verify Base MIDI Channel setting
- Check dLive MIDI channel offset configuration
- Some dLive firmware versions have different MIDI implementations

### Debug Mode

Enable "Debug MIDI Messages" to see all traffic:
```
MIDI RX: 90 3C 7F (Ch1) - Note On, Channel 1, Note 60, Velocity 127
MIDI RX: B0 07 40 (Ch1) - Control Change, Channel 1, Controller 7, Value 64
```

## Technical Notes

- **Connection**: TCP client connecting TO dLive (not a server)
- **MIDI Parsing**: Full MIDI message parsing with proper status byte handling
- **Buffer Management**: Handles partial messages and MIDI running status
- **Auto-Reconnect**: Automatically reconnects when connection is lost
- **Variable Updates**: Real-time variable updates for immediate feedback

## Version History

- **1.0.0**: Initial release
  - TCP MIDI reception from dLive
  - Real-time variable creation
  - Softkey and channel state tracking
  - Connection monitoring and auto-reconnect

## Support

For issues and feature requests:
- GitHub: https://github.com/jensen-user/companion-module-allenheath-dlive
- Companion Community: https://github.com/bitfocus/companion/discussions

## Related Documentation

- [dLive MIDI over TCP Protocol v2.0](https://www.allen-heath.com/dlive)
- [Companion Module Development](https://github.com/bitfocus/companion-module-base)