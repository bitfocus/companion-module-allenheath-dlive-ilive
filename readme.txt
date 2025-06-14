# Allen & Heath dLive Companion Module

A comprehensive Bitfocus Companion module for controlling Allen & Heath dLive mixing consoles using the official MIDI over TCP protocol.

## Features

- **Full dLive MIDI over TCP v2.0 support**
- **Bidirectional communication** with real-time feedback
- **MixRack and Surface connections** simultaneously
- **MIDI Running Status** for efficient transmission
- **TLS encryption support** for secure networks
- **Dynamic variable creation** for optimal performance
- **Complete channel mapping** (128 inputs, 24 DCAs, all buses)

## Installation

1. Copy module files to Companion's dev module directory
2. Run `npm install` in the module folder
3. Enable developer modules in Companion settings
4. Restart Companion and add the connection

## Configuration

### Required Settings
- **dLive IP Address**: IP of your MixRack or Surface
- **Base MIDI Channel**: Must match dLive setting (Utility > Control > MIDI)

### Connection Options
- **Connect to MixRack**: Scene recall, processing control (recommended)
- **Connect to Surface**: Cue lists, surface feedback

### Security Options
- **TLS Encryption**: Secure communication (requires dLive authentication)

## Network Ports

| Connection | Unencrypted | TLS Encrypted |
|------------|-------------|---------------|
| MixRack    | 51325       | 51327         |
| Surface    | 51328       | 51329         |
| Legacy TCP | 51321       | N/A           |

## MIDI Implementation

### Channel Mapping (per dLive specification)
- **Inputs 1-128**: MIDI Channel N, Notes 0x00-0x7F
- **Groups**: MIDI Channel N+1 (Mono: 0x00-0x3D, Stereo: 0x40-0x5E)
- **Aux**: MIDI Channel N+2 (Mono: 0x00-0x3D, Stereo: 0x40-0x5E)
- **Matrix**: MIDI Channel N+3 (Mono: 0x00-0x3D, Stereo: 0x40-0x5E)
- **DCA/FX/Mains**: MIDI Channel N+4 (DCA: 0x36-0x4D, Mute Groups: 0x4E-0x55)

### Supported MIDI Messages
- **Note On/Off**: Mute control with velocity ranges
- **Control Change**: NRPN, UFX parameters
- **Program Change**: Scene recall with bank select
- **Pitch Bend**: Preamp gain control
- **SysEx**: Channel names, colors, preamp settings

## Development

### File Structure
```
main.js          # Main module class
config.js        # Configuration fields
actions.js       # All available actions
feedbacks.js     # Visual feedback definitions
variables.js     # Dynamic variable system
presets.js       # Pre-configured buttons
manifest.json    # Module metadata
package.json     # NPM configuration
HELP.md         # User documentation
```

### Key Implementation Details

**MIDI Running Status**
```javascript
// Efficiently handles dLive's running status implementation
if (statusByte < 0x80) {
    statusByte = this.runningStatus[source]
}
```

**Dynamic Variables**
```javascript
// Only creates variables when actually used
if (channelNumber > 32) {
    createDynamicVariable(this, variableId, name)
}
```

**Bidirectional Communication**
```javascript
// Same socket handles both send and receive
this.sockets.mixrackMidi.on('data', (data) => {
    this.handleMidiData(data, 'mixrack')
})
```

## Testing

1. **Basic Connection**: Verify MixRack connection
2. **Mute Commands**: Test Input 1 mute toggle
3. **Feedback**: Monitor variables for real-time updates
4. **Scene Recall**: Test scene changes
5. **Advanced**: Test DCA assignments, preamp control

## Troubleshooting

### Common Issues

**Connection Failed**
- Check IP address and network connectivity
- Verify dLive MIDI over TCP is enabled
- Check firewall settings for ports 51325-51329

**Commands Don't Work**
- Verify Base MIDI Channel matches dLive
- Check dLive MIDI configuration
- Monitor debug logs for transmission

**No Feedback**
- Ensure dLive sends MIDI feedback
- Check correct connection target
- Verify MIDI channel range compatibility

## Contributing

1. Fork the repository
2. Create feature branch
3. Follow existing code style
4. Test with actual dLive hardware
5. Submit pull request

## License

MIT License - see LICENSE file for details

## Support

- [Companion Community](https://github.com/bitfocus/companion/discussions)
- [dLive MIDI Documentation](https://www.allen-heath.com/dlive)
- [Module Issues](https://github.com/bitfocus/companion-module-allenheath-dlive-ilive/issues)