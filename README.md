# companion-module-allenheath-dlive-ilive

See [HELP.md](HELP.md) and [LICENSE](LICENSE) for more information about this module.

This module for the Allen & Heath dLive and iLive can control parameters of the console
via MIDI, TCP, and iLive AHNet commands over IP.

Current Version 2.0.4

## iLive AHNet support

iLive AHNet support adds live input/output meters, gain-reduction meters, input names, and input colours.

AHNet may also be usable on dLive systems, but dLive AHNet meter support has not been tested.

iLive AHNet support includes:

- input Post PreAmp/Trim, Post Gate/PEQ, Post Compressor, Post Limiter/De-Ess, and Post Delay meters
- input gate, compressor, and limiter gain-reduction meters
- Aux 1-6 and Main L/R meters, indexed from the configured iLive mix layout
- input channel names and colours
- automatic iLive mix configuration detection
- active-page meter subscriptions to reduce load

## Development History

- Original dLive module adapted for dLive/iLive by Andrew Broughton in 2020.
- iLive control functions by Matt Andrewartha.
- iLive AHNet protocol reverse engineering, meter mapping, and live iLive validation by Adrian Davis.
