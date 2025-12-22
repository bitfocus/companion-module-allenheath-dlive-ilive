# Allen & Heath dLive/iLive Companion Module - Protocol V2.0 Updates

## New Actions Added (Protocol V2.0 Features)

The following new actions have been added while maintaining full backward compatibility with existing actions:

### Scene Navigation
- **Scene Go Next** - Navigate to the next scene
- **Scene Go Previous** - Navigate to the previous scene

### Solo Controls
- **Solo Input Channel** - Solo/unsolo input channels

### EQ Controls
- **EQ Enable/Disable Input Channel** - Enable or disable EQ on input channels

### Preamp Controls
- **Set Preamp Gain** - Control preamp gain levels (-10dB to +50dB range)
- **Toggle Preamp Pad** - Enable/disable -20dB pad on preamp

### Filter Controls
- **Set High Pass Filter** - Control HPF frequency (Off, 20Hz to 400Hz)

### Send Level Controls

#### dLive Systems:
- **Set Aux Mono Send Level** - Control mono aux send levels
- **Set Aux Stereo Send Level** - Control stereo aux send levels  
- **Set FX Mono Send Level** - Control mono FX send levels
- **Set FX Stereo Send Level** - Control stereo FX send levels
- **Set Matrix Mono Send Level** - Control mono matrix send levels
- **Set Matrix Stereo Send Level** - Control stereo matrix send levels
- **Input to Main Assign** - Assign/unassign inputs to main mix

#### iLive Systems:
- **Set Mix Send Level** - Control mix send levels
- **Set FX Send Level** - Control FX send levels

## Technical Implementation

### MIDI Message Types Used:
- **Control Change** - Scene navigation, solo controls
- **NRPN (Non-Registered Parameter Number)** - EQ enable, HPF control, input to main
- **Pitchbend** - Preamp gain control
- **SysEx** - Preamp pad, send levels

### Compatibility
- All existing actions remain unchanged and fully functional
- New actions are separate and don't interfere with existing functionality
- Protocol V1.x commands continue to work as before
- dLive and iLive specific features are properly separated

### Port Usage
- MIDI commands: Port 51325 (existing)
- TCP commands: Port 51321 (existing) 
- TLS/SSL support: Not implemented (would use port 51322)

## Testing Notes
- All new actions follow the same pattern as existing actions
- Error handling and logging maintained
- Debug output available for troubleshooting
- Backward compatibility preserved

## Future Enhancements
Potential additions for future versions:
- TLS/SSL authentication support
- Parametric EQ controls
- UFX parameter controls
- Name & Colour assignment
