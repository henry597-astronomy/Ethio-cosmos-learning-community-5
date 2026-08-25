import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Capacitor } from '@capacitor/core';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { Pause, Play, RotateCcw } from 'lucide-react';
import type { AppCopyKey } from '@/i18n/app-copy';
import { useAppLanguage } from '@/context/AppLanguageContext';

 type PlanetId = 'sun' | 'mercury' | 'venus' | 'earth' | 'mars' | 'jupiter' | 'saturn' | 'uranus' | 'neptune';

type PlanetSpec = {
  id: PlanetId;
  titleKey: AppCopyKey;
  color: number;
  distanceAu: string;
  diameterKm: string;
  orbitalPeriod: string;
  radius: number;
  orbitRadius: number;
  speed: number;
  ring?: boolean;
};

const PLANETS: PlanetSpec[] = [
  { id: 'sun', titleKey: 'planetSun', color: 0xffb82e, distanceAu: '0 AU', diameterKm: '1,392,700 km', orbitalPeriod: '—', radius: 2.35, orbitRadius: 0, speed: 0 },
  { id: 'mercury', titleKey: 'planetMercury', color: 0xaaa59d, distanceAu: '0.39 AU', diameterKm: '4,879 km', orbitalPeriod: '88 days', radius: 0.34, orbitRadius: 4.5, speed: 1.7 },
  { id: 'venus', titleKey: 'planetVenus', color: 0xd7a36f, distanceAu: '0.72 AU', diameterKm: '12,104 km', orbitalPeriod: '225 days', radius: 0.52, orbitRadius: 6.5, speed: 1.25 },
  { id: 'earth', titleKey: 'planetEarth', color: 0x3f83c9, distanceAu: '1 AU', diameterKm: '12,742 km', orbitalPeriod: '365 days', radius: 0.56, orbitRadius: 8.5, speed: 1.05 },
  { id: 'mars', titleKey: 'planetMars', color: 0xb7583f, distanceAu: '1.52 AU', diameterKm: '6,779 km', orbitalPeriod: '687 days', radius: 0.43, orbitRadius: 10.7, speed: 0.85 },
  { id: 'jupiter', titleKey: 'planetJupiter', color: 0xc7895a, distanceAu: '5.2 AU', diameterKm: '139,820 km', orbitalPeriod: '12 years', radius: 1.1, orbitRadius: 14.2, speed: 0.48 },
  { id: 'saturn', titleKey: 'planetSaturn', color: 0xd5b783, distanceAu: '9.58 AU', diameterKm: '116,460 km', orbitalPeriod: '29 years', radius: 0.92, orbitRadius: 18.0, speed: 0.35, ring: true },
  { id: 'uranus', titleKey: 'planetUranus', color: 0x75cbd1, distanceAu: '19.2 AU', diameterKm: '50,724 km', orbitalPeriod: '84 years', radius: 0.72, orbitRadius: 21.6, speed: 0.25 },
  { id: 'neptune', titleKey: 'planetNeptune', color: 0x4669c7, distanceAu: '30.05 AU', diameterKm: '49,244 km', orbitalPeriod: '165 years', radius: 0.7, orbitRadius: 25.0, speed: 0.19 },
];

type SimulationInstance = {
  renderer: THREE.WebGLRenderer;
  controls: { update: () => void; dispose: () => void };
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  planets: Map<PlanetId, { mesh: THREE.Mesh; angle: number; spec: PlanetSpec }>;
  animationFrame: number;
  dispose: () => void;
};

function makeOrbit(radius: number, color: number, visible: boolean): THREE.LineLoop {
  const points: THREE.Vector3[] = [];
  const segments = 96;
  for (let i = 0; i < segments; i += 1) {
    const angle = (i / segments) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: visible ? 0.62 : 0.28 });
  return new THREE.LineLoop(geometry, material);
}

function makeStarField(count: number): THREE.Points {
  const positions = new Float32Array(count * 3);
  let seed = 17;
  const next = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  for (let i = 0; i < count; i += 1) {
    const radius = 55 + next() * 75;
    const theta = next() * Math.PI * 2;
    const phi = Math.acos(2 * next() - 1);
    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.cos(phi);
    positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({ color: 0xb8c8ff, size: 0.18, sizeAttenuation: true, transparent: true, opacity: 0.78 });
  return new THREE.Points(geometry, material);
}

export default function SolarSystemPage() {
  const { t } = useAppLanguage();
  const canvasRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<SimulationInstance | null>(null);
  const pausedRef = useRef(false);
  const orbitGlowRef = useRef(true);
  const [selectedPlanetId, setSelectedPlanetId] = useState<PlanetId | null>(null);
  const [paused, setPaused] = useState(false);
  const [orbitGlow, setOrbitGlow] = useState(true);
  const [isPortrait, setIsPortrait] = useState(false);

  const selectedPlanet = useMemo(
    () => PLANETS.find((planet) => planet.id === selectedPlanetId) ?? null,
    [selectedPlanetId],
  );

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    orbitGlowRef.current = orbitGlow;
    const simulation = simulationRef.current;
    if (!simulation) return;
    simulation.scene.traverse((object) => {
      if (!(object instanceof THREE.LineLoop)) return;
      const material = object.material;
      if (material instanceof THREE.LineBasicMaterial) {
        material.opacity = orbitGlow ? 0.62 : 0.28;
      }
    });
  }, [orbitGlow]);

  useEffect(() => {
    const updateOrientationState = () => setIsPortrait(window.innerHeight > window.innerWidth);
    updateOrientationState();
    window.addEventListener('resize', updateOrientationState);
    window.addEventListener('orientationchange', updateOrientationState);

    const requestLandscape = async () => {
      try {
        if (Capacitor.isNativePlatform()) {
          await ScreenOrientation.lock({ orientation: 'landscape' });
        } else if (typeof screen !== 'undefined') {
          const orientation = screen.orientation as unknown as { lock?: (value: 'landscape') => Promise<void> };
          if (orientation.lock) {
            await orientation.lock('landscape');
          }
        }
      } catch {
        // Browser orientation locks can be denied unless the page is fullscreen.
        // The responsive portrait layout remains usable when that happens.
      }
    };
    void requestLandscape();

    return () => {
      window.removeEventListener('resize', updateOrientationState);
      window.removeEventListener('orientationchange', updateOrientationState);
      if (Capacitor.isNativePlatform()) {
        void ScreenOrientation.unlock();
      }
    };
  }, []);

  useEffect(() => {
    const container = canvasRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x030617);
    scene.fog = new THREE.Fog(0x030617, 70, 145);

    const camera = new THREE.PerspectiveCamera(44, 1, 0.1, 180);
    camera.position.set(0, 20, 42);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(Math.max(container.clientWidth, 1), Math.max(container.clientHeight, 1));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.className = 'block h-full w-full touch-none';
    renderer.domElement.setAttribute('aria-label', t('solarSystem'));
    container.appendChild(renderer.domElement);

    const controlsModule = new OrbitControls(camera, renderer.domElement);
    controlsModule.enableDamping = true;
    controlsModule.enablePan = false;
    controlsModule.minDistance = 12;
    controlsModule.maxDistance = 82;
    controlsModule.target.set(0, 0, 0);
    controlsModule.update();

    const ambientLight = new THREE.AmbientLight(0x6b7ca8, 0.45);
    scene.add(ambientLight);
    const sunLight = new THREE.PointLight(0xffd27d, 4.4, 110, 1.7);
    scene.add(sunLight);
    scene.add(makeStarField(window.innerWidth < 800 ? 450 : 900));

    const sunSpec = PLANETS[0];
    const sun = new THREE.Mesh(
      new THREE.SphereGeometry(sunSpec.radius, 28, 20),
      new THREE.MeshBasicMaterial({ color: sunSpec.color }),
    );
    scene.add(sun);

    const planets = new Map<PlanetId, { mesh: THREE.Mesh; angle: number; spec: PlanetSpec }>();
    PLANETS.slice(1).forEach((spec, index) => {
      const orbit = makeOrbit(spec.orbitRadius, spec.color, orbitGlowRef.current);
      scene.add(orbit);

      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(spec.radius, index < 4 ? 18 : 22, index < 4 ? 14 : 18),
        new THREE.MeshStandardMaterial({ color: spec.color, roughness: 0.72, metalness: 0.02 }),
      );
      mesh.userData.planetId = spec.id;
      mesh.position.set(spec.orbitRadius, 0, 0);
      scene.add(mesh);

      if (spec.ring) {
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(spec.radius * 1.35, spec.radius * 2.1, 48),
          new THREE.MeshBasicMaterial({ color: 0xe9d5a1, transparent: true, opacity: 0.72, side: THREE.DoubleSide }),
        );
        ring.rotation.x = Math.PI / 2.5;
        mesh.add(ring);
      }

      planets.set(spec.id, { mesh, angle: index * 0.78, spec });
    });

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerDown: { x: number; y: number } | null = null;
    const pickPlanet = (event: PointerEvent) => {
      if (!pointerDown || Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y) > 10) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects([...planets.values()].map(({ mesh }) => mesh), false);
      const id = hits[0]?.object.userData.planetId as PlanetId | undefined;
      setSelectedPlanetId(id ?? null);
    };
    const handlePointerDown = (event: PointerEvent) => {
      pointerDown = { x: event.clientX, y: event.clientY };
    };
    const handlePointerUp = (event: PointerEvent) => {
      pickPlanet(event);
      pointerDown = null;
    };
    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);

    const resize = () => {
      const width = Math.max(container.clientWidth, 1);
      const height = Math.max(container.clientHeight, 1);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    resizeObserver?.observe(container);
    resize();

    let lastTime = performance.now();
    let animationFrame = 0;
    const animate = (time: number) => {
      const delta = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;
      if (!pausedRef.current && document.visibilityState === 'visible') {
        planets.forEach((planet) => {
          planet.angle += delta * planet.spec.speed * 0.18;
          planet.mesh.position.x = Math.cos(planet.angle) * planet.spec.orbitRadius;
          planet.mesh.position.z = Math.sin(planet.angle) * planet.spec.orbitRadius;
          planet.mesh.rotation.y += delta * 0.35;
        });
        sun.rotation.y += delta * 0.1;
      }
      controlsModule.update();
      renderer.render(scene, camera);
      animationFrame = requestAnimationFrame(animate);
    };
    animationFrame = requestAnimationFrame(animate);

    const dispose = () => {
      cancelAnimationFrame(animationFrame);
      resizeObserver?.disconnect();
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      controlsModule.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.LineLoop || object instanceof THREE.Points) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
          else object.material.dispose();
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };

    simulationRef.current = { renderer, controls: controlsModule, scene, camera, planets, animationFrame, dispose };
    return () => {
      dispose();
      simulationRef.current = null;
    };
  }, [t]);

  const resetView = () => {
    const simulation = simulationRef.current;
    if (!simulation) return;
    simulation.camera.position.set(0, 20, 42);
    simulation.controls.update();
    setSelectedPlanetId(null);
  };

  const togglePaused = () => setPaused((value) => !value);

  return (
    <div className="min-h-full bg-[#050816] px-3 py-4 text-white sm:px-5 sm:py-5">
      <div className="mx-auto max-w-7xl">
        <header className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-300">EthioCosmos</p>
            <h1 className="truncate text-xl font-bold sm:text-2xl">{t('solarSystem')}</h1>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-300 sm:text-sm">{t('solarSystemIntro')}</p>
          </div>
          {isPortrait && (
            <div className="shrink-0 rounded-xl border border-orange-400/30 bg-orange-500/10 px-2.5 py-2 text-right text-[10px] leading-tight text-orange-100 sm:px-3 sm:text-xs">
              <span className="block font-semibold">Landscape view</span>
              <span className="text-orange-200/80">Rotate your phone for the best view</span>
            </div>
          )}
        </header>

        <div className="grid gap-3 landscape:grid-cols-[minmax(0,1fr)_18rem] landscape:items-stretch">
          <section className="relative min-h-[52vh] overflow-hidden rounded-3xl border border-indigo-300/20 bg-[#030617] shadow-2xl shadow-indigo-950/30 landscape:min-h-[calc(100vh-10rem)]">
            <div ref={canvasRef} className="absolute inset-0" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_25%,rgba(3,6,23,0.42)_100%)]" />
            <div className="absolute left-3 top-3 rounded-xl border border-white/10 bg-black/35 px-2.5 py-2 text-[10px] text-slate-300 backdrop-blur-sm sm:left-4 sm:top-4 sm:text-xs">
              <span className="block font-semibold text-white">{t('tapPlanet')}</span>
              <span className="mt-0.5 block">{t('dragToRotate')} · {t('pinchToZoom')}</span>
            </div>
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 sm:bottom-4 sm:left-4 sm:right-4">
              <div className="flex min-w-0 items-center gap-2 overflow-x-auto">
                <button
                  type="button"
                  onClick={resetView}
                  className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-white/15 bg-black/45 px-3 text-xs font-semibold text-white backdrop-blur-md transition hover:bg-black/65 active:scale-[0.98]"
                >
                  <RotateCcw className="h-4 w-4" />
                  {t('resetView')}
                </button>
                <button
                  type="button"
                  onClick={togglePaused}
                  className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-orange-300/30 bg-orange-500/80 px-3 text-xs font-semibold text-white shadow-lg shadow-orange-950/30 transition hover:bg-orange-500 active:scale-[0.98]"
                >
                  {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                  {paused ? t('playSimulation') : t('pauseSimulation')}
                </button>
              </div>
              <span className="hidden rounded-full border border-white/10 bg-black/40 px-2 py-1 text-[10px] text-slate-300 backdrop-blur-sm sm:inline-block">
                {paused ? t('pauseSimulation') : t('playSimulation')}
              </span>
            </div>
          </section>

          <aside className="space-y-3">
            <section className="rounded-2xl border border-white/10 bg-slate-900/80 p-3 shadow-xl backdrop-blur-md sm:p-4">
              <h2 className="mb-3 text-sm font-bold text-white">{t('simulationControls')}</h2>
              <label className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200">
                <span>{t('orbitColorEffects')}</span>
                <input
                  type="checkbox"
                  checked={orbitGlow}
                  onChange={(event) => setOrbitGlow(event.target.checked)}
                  className="h-5 w-5 accent-orange-500"
                />
              </label>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 landscape:grid-cols-2">
                {PLANETS.slice(1).map((planet) => (
                  <button
                    type="button"
                    key={planet.id}
                    onClick={() => setSelectedPlanetId(planet.id)}
                    className={`min-h-10 rounded-xl border px-2 py-2 text-left text-[11px] font-semibold transition active:scale-[0.98] ${selectedPlanetId === planet.id ? 'border-orange-300/70 bg-orange-500/20 text-orange-100' : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'}`}
                  >
                    <span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: `#${planet.color.toString(16).padStart(6, '0')}` }} />
                    {t(planet.titleKey)}
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-orange-300/20 bg-gradient-to-br from-orange-500/15 to-indigo-500/10 p-3 shadow-xl backdrop-blur-md sm:p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-orange-200">{t('selectedPlanet')}</p>
              {selectedPlanet ? (
                <>
                  <h2 className="mt-1 text-xl font-bold text-white">{t(selectedPlanet.titleKey)}</h2>
                  <dl className="mt-3 space-y-2 text-xs">
                    <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-2"><dt className="text-slate-300">{t('distanceFromSun')}</dt><dd className="font-semibold text-white">{selectedPlanet.distanceAu}</dd></div>
                    <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-2"><dt className="text-slate-300">{t('diameter')}</dt><dd className="font-semibold text-white">{selectedPlanet.diameterKm}</dd></div>
                    <div className="flex items-center justify-between gap-3"><dt className="text-slate-300">{t('orbitalPeriod')}</dt><dd className="font-semibold text-white">{selectedPlanet.orbitalPeriod}</dd></div>
                  </dl>
                </>
              ) : (
                <p className="mt-2 text-sm leading-relaxed text-slate-300">{t('noPlanetSelected')}</p>
              )}
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
