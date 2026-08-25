# Solar-system simulation reference notes

Source: https://sanderblue.github.io/solar-system-threejs/

The reference is a Three.js/WebGL solar-system visualization with a dark presentation page, a “Our Solar System” explanatory section, an “Orbit Color Effects” toggle, and a “View Solar System” entry point. Its content describes the Sun, eight planets, moons, dwarf planets, asteroid belt, comets, and thousands of stars. The visible scene is built for a large screen and has a browser-compatibility modal that explicitly says the original project is not currently viewable from a mobile device.

The safe EthioCosmos adaptation should preserve the high-level educational idea rather than copy the desktop-only limitation. It should use a responsive Three.js canvas with touch orbit/drag, pinch zoom, tap-to-select planets, a reset-camera control, and a compact information panel. For phone performance, it should use a bounded star count, device-pixel-ratio limits, adaptive rendering quality, lazy loading, and pause rendering when the simulation is not visible. The desktop web version can expose richer controls while the Android/mobile view prioritizes touch targets and readable panels.

The simulation will be implemented as an EthioCosmos-owned feature inside the existing app, not by embedding the external site or depending on its runtime. Existing navigation, authentication, live/community features, official-content localization boundaries, and offline-library boundaries must remain unchanged.
