# Source simulation audit

Source inspected: https://sanderblue.github.io/solar-system-threejs/

Observed landing/scene structure:

- Heading: “Solar system” / “Our Solar System”.
- A left-side “Planets” menu contains Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune, and Pluto. Each planet is an expandable/selectable row with a plus affordance.
- A bottom “Orbit Color Effects” checkbox is enabled by default.
- A full-screen black WebGL scene renders a star field and orbital paths; the source page describes the Sun, eight planets, optional Pluto, moons, an asteroid belt, comets, and thousands of stars.
- A controls dialog states: use mouse or trackpad to navigate; use a scroll motion to zoom; when viewing a planet, use click + drag to move around the planet.
- The source provides a “View Solar System” entry point and an initial browser-compatibility notice.
- The source scene uses an immersive canvas-first layout rather than a card-based dashboard.

Faithful adaptation requirements for EthioCosmos:

1. Preserve the immersive full-screen WebGL scene as the primary surface.
2. Recreate the selectable planet list and the orbit-color-effects toggle.
3. Recreate source-style camera navigation: drag/orbit and pinch/scroll zoom; selecting a planet should focus the camera on that planet and permit click-drag viewing around it.
4. Keep the Sun, eight planets, Pluto option, orbital paths, star field, and available moon/asteroid/comet detail as closely as feasible within the existing mobile APK performance budget.
5. Keep the scene internal to the protected EthioCosmos route, add only compact mobile/landscape UI adaptations, and do not use an iframe or external browser.
6. Clearly distinguish source-faithful behavior from any performance-driven approximation; do not describe a simplified replacement as the exact source.
