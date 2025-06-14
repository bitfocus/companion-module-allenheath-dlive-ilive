# Allen & Heath dLive Companion Module

This module provides comprehensive control for Allen & Heath dLive and iLive mixing consoles using the official **MIDI over TCP protocol**. It supports bidirectional communication with dLive MixRack and Surface units according to the dLive MIDI over TCP specification v2.0.

## Configuration

### Basic Settings

- **dLive IP Address**: The IP address of your dLive MixRack or Surface
- **Console Type**: Select between dLive and iLive
- **Connect to MixRack**: Enable connection to dLive MixRack (recommended)
- **Connect to Surface**: Enable connection to dLive Surface (for cue lists)

### Security Settings

- **Use TLS Encryption**: Enable encrypted communication (requires authentication)
- **TLS Username/Password**: Credentials for TLS authentication (if enabled)

### MIDI Configuration

- **Base MIDI Channel (N)**: Must match dLive configuration (Utility > Control > MIDI)
- **DCA Count**: Number of DCA groups on your console

## Network Ports

The module uses the official dLive MIDI over TCP ports:

### MixRack Ports
- **Port 51325**: Unencrypted MIDI over TCP
- **Port 51327**: TLS encrypted MIDI over TCP

### Surface Ports  
- **Port 51328**: Unencrypted MIDI over TCP
- **Port 51329**: TLS encrypted MIDI over TCP

### Legacy Support
- **Port 51321**: Legacy TCP commands (if enabled)

## Features

### Bidirectional MIDI Communication

The module implements the complete dLive MIDI over TCP protocol including:

- **MIDI Running Status**: Efficient transmission as per dLive specification
- **Real-time Feedback**: Receive console state changes instantly
- **Multi-target Support**: Connect to both MixRack and Surface simultaneously

### Supported MIDI Functions

#### Control (Send to dLive)
- Mute/Unmute (Note On/Off with velocity ranges)
- Fader levels (NRPN parameter 0x17)
- DCA assignments (NRPN parameter 0x40)
- Mute group assignments (NRPN parameter 0x40)
- Scene recall (Program Change with Bank Select)
- Preamp gain (Pitch Bend)
- Preamp pad/phantom (SysEx)
- Channel names and colors (SysEx)

#### Feedback (Receive from dLive)
- Real-time mute status updates
- Fader position changes
- Scene recall notifications
- DCA assignment changes
- Preamp status updates
- UFX parameter changes
- Channel name/color changes

### dLive Channel Mapping

The module correctly implements dLive's MIDI channel offset system:

- **Inputs 1-128**: MIDI Channel N, Notes 0x00-0x7F
- **Mono Groups 1-62**: MIDI Channel N+1, Notes 0x00-0x3D
- **Stereo Groups 1-31**: MIDI Channel N+1, Notes 0x40-0x5E
- **Mono Aux 1-62**: MIDI Channel N+2, Notes 0x00-0x3D
- **Stereo Aux 1-31**: MIDI Channel N+2, Notes 0x40-0x5E
- **Mono Matrix 1-62**: MIDI Channel N+3, Notes 0x00-0x3D
- **Stereo Matrix 1-31**: MIDI Channel N+3, Notes 0x40-0x5E
- **DCA 1-24**: MIDI Channel N+4, Notes 0x36-0x4D
- **Mute Groups 1-8**: MIDI Channel N+4, Notes 0x4E-0x55

### Variables

The module provides comprehensive real-time variables:

#### Connection Status
- `$(dlive:connection_status)` - Overall connection state
- `$(dlive:mixrack_connected)` - MixRack connection status
- `$(dlive:surface_connected)` - Surface connection status

#### MIDI Activity
- `$(dlive:last_midi_activity)` - Timestamp of last MIDI message
- `$(dlive:last_midi_type)` - Type of last MIDI message
- `$(dlive:last_midi_source)` - Source (mixrack/surface)

#### Real-time Console State
- `$(dlive:mute_input_1)` through `$(dlive:mute_input_128)` - Input mute status
- `$(dlive:mute_dca_1)` through `$(dlive:mute_dca_24)` - DCA mute status
- `$(dlive:current_scene)` - Current scene number
- `$(dlive:ufx_global_key)` - UFX global key setting
- `$(dlive:ufx_global_scale)` - UFX global scale setting

#### Channel Properties
- `$(dlive:channel_1_name)` through `$(dlive:channel_128_name)` - Channel names
- `$(dlive:channel_1_color)` through `$(dlive:channel_128_color)` - Channel colors

#### Preamp Status
- `$(dlive:preamp_gain_socket1)` through `$(dlive:preamp_gain_socket128)` - Preamp gains
- `$(dlive:preamp_phantom_socket1)` through `$(dlive:preamp_phantom_socket128)` - Phantom power

### Actions

All actions are updated to use correct dLive MIDI commands:

#### Input Channels
- **Mute Input Channel**: Uses Note On/Off with correct velocity ranges
- **Input Channel Fader**: Uses NRPN with parameter ID 0x17

#### Mix Buses, Groups, Aux, Matrix
- **Mute/Fader controls**: Automatically calculates correct MIDI channel offsets

#### DCA Management
- **DCA Assignment**: Uses NRPN parameter 0x40 with correct value ranges
- **Mute Group Assignment**: Uses NRPN parameter 0x40 with mute group values

#### Scene Management
- **Scene Recall**: Uses Bank Select + Program Change for 500 scenes

#### Preamp Control
- **Phantom Power**: Uses dLive SysEx format
- **Preamp Gain**: Uses Pitch Bend messages

### Feedbacks

Real-time visual feedback based on received MIDI:

- **Connection Status**: Visual indication of dLive connectivity
- **MIDI Activity**: Shows recent MIDI message activity
- **Mute Status**: Real-time mute state feedback
- **Console Model**: Identifies dLive vs iLive configuration

## Setup Instructions

### 1. dLive Console Configuration

1. **Enable MIDI over TCP** in dLive network settings
2. **Configure Base MIDI Channel** (Utility > Control > MIDI)
3. **Note the IP address** of your MixRack/Surface
4. **Enable TLS authentication** (optional, for secure networks)

### 2. Module Configuration

1. **Enter dLive IP address**
2. **Select connection targets** (MixRack recommended)
3. **Set Base MIDI Channel** to match dLive configuration
4. **Configure TLS** if using encrypted connection
5. **Test connection** using status variables

### 3. Verification

1. **Check connection status** feedback
2. **Test basic mute commands**
3. **Monitor MIDI activity** variables
4. **Verify real-time feedback** with console changes

## Troubleshooting

### Connection Issues

**Cannot Connect to dLive**
- Verify IP address and network connectivity
- Check firewall settings (ports 51325/51327/51328/51329)
- Ensure dLive MIDI over TCP is enabled

**TLS Authentication Fails**
- Verify username/password credentials
- Check TLS is enabled on dLive
- Try unencrypted connection first

### MIDI Issues

**Commands Not Working**
- Verify Base MIDI Channel matches dLive configuration
- Check dLive MIDI settings (Utility > Control > MIDI)
- Monitor debug logs for MIDI transmission

**No Feedback Received**
- Ensure dLive is configured to send MIDI feedback
- Check connection to correct target (MixRack vs Surface)
- Verify MIDI channel range (N to N+4) is not conflicting

### Performance

**High CPU Usage**
- Reduce MIDI feedback rate on dLive if possible
- Monitor variable update frequency
- Check for excessive debug logging

## Technical Notes

- **MIDI Running Status**: Automatically handled for efficiency
- **Buffer Management**: Robust handling of incomplete MIDI messages
- **Automatic Reconnection**: Handles network interruptions gracefully
- **Zero Dependencies**: Uses only Node.js core modules for maximum compatibility

## Version History

- **2.0.0**: Complete rewrite using official dLive MIDI over TCP v2.0 specification
- **1.4.0**: Added basic MIDI receive support
- **1.3.x**: Original dLive/iLive support

## Compatibility

### dLive Series
- **Full MIDI over TCP support** (firmware v2.0+)
- **MixRack and Surface connections**
- **All documented MIDI functions**
- **Real-time bidirectional feedback**

### iLive Series  
- **Basic MIDI control support**
- **Limited to essential mixing functions**
- **No MIDI over TCP (uses legacy commands)**

For additional support, please visit the [Companion Community](https://github.com/bitfocus/companion/discussions).