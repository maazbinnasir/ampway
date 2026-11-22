# AmpWay · Prototype v1

**Never arrive on 1%.** AmpWay puts power bank stations at the train station: tap your bank card, take a sodium-ion power bank with its cables built in, charge on the train, and return it at any AmpWay station.

Live prototype: https://maazbinnasir.github.io/ampway/

This is an interactive 3D concept prototype made for the *Entrepreneurship & Innovation* seminar at FH Südwestfalen (Gate 2: Prototype Pitch). It is a concept design, not a real product.

## What you can do
- Rotate and zoom the station (drag, pinch, scroll)
- Run the four-step demo: tap card → take the power bank → travel from Hamm Hbf to Düsseldorf Hbf → return
- Keyboard: → or Space for the next step, R to restart

## Tech
Plain HTML, CSS and JavaScript with [three.js](https://threejs.org) r160 (MIT, bundled in `vendor/`). The pencil sketches of the two stations are drawn in code with [rough.js](https://roughjs.com) 4.6.6 (MIT, bundled in `vendor/`); they are simplified illustrations, not exact drawings of the real buildings. No build step. Fonts: Schibsted Grotesk, Inter Tight, JetBrains Mono (SIL Open Font License, self-hosted).
