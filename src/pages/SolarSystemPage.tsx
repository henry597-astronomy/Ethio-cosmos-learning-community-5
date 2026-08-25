import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ChevronDown, ChevronRight, HelpCircle, X } from 'lucide-react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Capacitor } from '@capacitor/core';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { useNavigate } from 'react-router-dom';
import type { AppCopyKey } from '@/i18n/app-copy';
import { useAppLanguage } from '@/context/AppLanguageContext';

type TextureSet = {
  base?: string;
  clouds?: string;
  colorMap?: string;
};

type SourceSatellite = {
  id?: string;
  name?: string;
  diameter?: number;
  distanceFromParent?: number;
  orbitalPeriod?: number;
  orbitalInclination?: number;
  _3d?: { textures?: TextureSet };
};

type SourcePlanet = {
  id: number;
  name: string;
  diameter: number;
  distanceFromParent: number | null;
  rotationPeriod?: number | null;
  orbitalPeriod: number | null;
  orbitalInclination?: number | null;
  axialTilt?: number | null;
  orbitPositionOffset?: number;
  lengthOfDay?: number | null;
  surfaceTemps?: { mean?: number | null };
  satellites?: SourceSatellite[];
  rings?: false | {
    innerRadius: number;
    outerRadius: number;
    textures?: TextureSet;
  };
  _3d?: { textures?: TextureSet };
};

type SourceSystem = {
  parent: SourcePlanet;
  planets: SourcePlanet[];
  asteroidBelt?: {
    count?: number;
    distanceFromParent?: { min?: number; max?: number };
  };
  kuiperBelt?: { radius?: number; diameter?: number };
};

type BodyHandle = {
  id: string;
  name: string;
  mesh: THREE.Mesh;
  pivot: THREE.Object3D;
  orbitLine: THREE.LineLoop | null;
  radius: number;
  orbitRadius: number;
  period: number;
  angle: number;
  orbitOffset: number;
};

type FocusAnimation = {
  body: BodyHandle;
  fromPosition: THREE.Vector3;
  fromTarget: THREE.Vector3;
  offset: THREE.Vector3;
  elapsed: number;
};

type SceneHandle = {
  focus: (id: string) => void;
  reset: () => void;
  setOrbitEffects: (enabled: boolean) => void;
  dispose: () => void;
};

const UNIVERSE_SCALE = Math.pow(10, -4.2);
const CELESTIAL_SCALE = Math.pow(10, -3.8);
const ORBIT_SCALE = UNIVERSE_SCALE;
const DEGREES_TO_RADIANS = Math.PI / 180;
const PLANET_COPY_KEYS: Record<string, AppCopyKey> = {
  Sun: 'planetSun',
  Mercury: 'planetMercury',
  Venus: 'planetVenus',
  Earth: 'planetEarth',
  Mars: 'planetMars',
  Jupiter: 'planetJupiter',
  Saturn: 'planetSaturn',
  Uranus: 'planetUranus',
  Neptune: 'planetNeptune',
  Pluto: 'planetPluto',
};

function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - start.getTime()) / 86400000);
}

function localTexturePath(sourcePath?: string): string | null {
  if (!sourcePath) return null;
  const normalized = sourcePath.replace(/^\/?src\/assets\/textures\//, '');
  const basename = normalized.split('/').pop() || '';
  if (basename === 'jupiter_6k.jp2') return '/solar-system/textures/jupiter_4k.jpg';
  if (basename === 'sun_detailed.jpg' || basename === 'sun_detailed.psd') return '/solar-system/textures/sun_detailed.png';
  if (basename.endsWith('.psd') || basename.endsWith('.jp2')) return null;
  if (normalized.includes('earth_topo') || normalized.includes('ocean_reflectance')) return null;
  return `/solar-system/textures/${normalized}`;
}

function sourceCopyKey(name: string): AppCopyKey {
  return PLANET_COPY_KEYS[name] || 'solarSystem';
}

function scaledDiameter(diameter: number, isMoon = false): number {
  if (isMoon && diameter < 300) return diameter * 0.0007;
  return diameter * CELESTIAL_SCALE;
}

function createTexturedMaterial(
  loader: THREE.TextureLoader,
  textures: Map<string, THREE.Texture>,
  sourcePath: string | undefined,
  fallbackColor: number,
  transparent = false,
): THREE.MeshPhongMaterial {
  const path = localTexturePath(sourcePath);
  let map: THREE.Texture | null = null;
  if (path) {
    map = textures.get(path) || loader.load(path);
    textures.set(path, map);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 4;
  }
  return new THREE.MeshPhongMaterial({
    map: map || undefined,
    color: map ? 0xffffff : fallbackColor,
    transparent,
    opacity: transparent ? 0.9 : 1,
    shininess: 10,
  });
}

function disposeMaterial(material: THREE.Material | THREE.Material[]): void {
  if (Array.isArray(material)) {
    material.forEach((item) => item.dispose());
  } else {
    material.dispose();
  }
}

function seededRandom(seedRef: { value: number }): number {
  seedRef.value = (seedRef.value * 9301 + 49297) % 233280;
  return seedRef.value / 233280;
}

function createStarField(
  loader: THREE.TextureLoader,
  textures: Map<string, THREE.Texture>,
): THREE.Points {
  const count = 8000;
  const radius = 14959787070 * 40000 * ORBIT_SCALE;
  const positions = new Float32Array(count * 3);
  const seedRef = { value: 17 };
  for (let index = 0; index < count; index += 1) {
    const distance = Math.cbrt(seededRandom(seedRef)) * radius;
    const theta = seededRandom(seedRef) * Math.PI * 2;
    const phi = Math.acos(2 * seededRandom(seedRef) - 1);
    positions[index * 3] = distance * Math.sin(phi) * Math.cos(theta);
    positions[index * 3 + 1] = distance * Math.cos(phi);
    positions[index * 3 + 2] = distance * Math.sin(phi) * Math.sin(theta);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const path = '/solar-system/textures/star.jpg';
  const map = textures.get(path) || loader.load(path);
  textures.set(path, map);
  const material = new THREE.PointsMaterial({ size: 5, map, transparent: true, opacity: 0.9, depthWrite: false });
  return new THREE.Points(geometry, material);
}

function createParticleBelt(
  scene: THREE.Scene,
  loader: THREE.TextureLoader,
  textures: Map<string, THREE.Texture>,
  minDistance: number,
  maxDistance: number,
  count: number,
  path: string,
  size: number,
): THREE.Points {
  const positions = new Float32Array(count * 3);
  const seedRef = { value: count + 31 };
  const texture = textures.get(path) || loader.load(path);
  textures.set(path, texture);
  for (let index = 0; index < count; index += 1) {
    const radius = minDistance + seededRandom(seedRef) * (maxDistance - minDistance);
    const theta = seededRandom(seedRef) * Math.PI * 2;
    const thickness = (seededRandom(seedRef) - 0.5) * (maxDistance - minDistance) * 0.12;
    positions[index * 3] = Math.cos(theta) * radius;
    positions[index * 3 + 1] = Math.sin(theta) * radius;
    positions[index * 3 + 2] = thickness;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({ size, map: texture, transparent: true, opacity: 0.8, depthWrite: false });
  const points = new THREE.Points(geometry, material);
  scene.add(points);
  return points;
}

export default function SolarSystemPage() {
  const navigate = useNavigate();
  const { t } = useAppLanguage();
  const canvasRef = useRef<HTMLDivElement>(null);
  const sceneHandleRef = useRef<SceneHandle | null>(null);
  const pausedRef = useRef(false);
  const [system, setSystem] = useState<SourceSystem | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string>('solar-system');
  const [expandedPlanetId, setExpandedPlanetId] = useState<number | null>(null);
  const [orbitEffects, setOrbitEffects] = useState(true);
  const [isPortrait, setIsPortrait] = useState(false);
  const [showHelp, setShowHelp] = useState(true);
  const [menuOpen, setMenuOpen] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const loadSourceData = async () => {
      try {
        const response = await fetch('/solar-system/solarsystem.json', { cache: 'no-cache' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json() as SourceSystem;
        if (!cancelled) setSystem(data);
      } catch (error) {
        console.error('Unable to load source solar-system data:', error);
        if (!cancelled) setLoadError('Unable to load the solar-system data. Please try again.');
      }
    };
    void loadSourceData();
    return () => {
      cancelled = true;
    };
  }, []);

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
          if (orientation.lock) await orientation.lock('landscape');
        }
      } catch {
        // The responsive full-screen scene remains usable if a browser denies the lock.
      }
    };
    void requestLandscape();
    return () => {
      window.removeEventListener('resize', updateOrientationState);
      window.removeEventListener('orientationchange', updateOrientationState);
      if (Capacitor.isNativePlatform()) void ScreenOrientation.unlock();
    };
  }, []);

  useEffect(() => {
    pausedRef.current = false;
  }, [system]);

  useEffect(() => {
    const container = canvasRef.current;
    if (!container || !system) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    const camera = new THREE.PerspectiveCamera(45, 1, 0.05, 5 * Math.pow(10, 13));
    camera.up.set(0, 0, 1);
    camera.position.set(60000, 0, 15000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(Math.max(container.clientWidth, 1), Math.max(container.clientHeight, 1), false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.className = 'absolute inset-0 h-full w-full touch-none';
    renderer.domElement.setAttribute('aria-label', t('solarSystem'));
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minDistance = 0.1;
    controls.maxDistance = 5 * Math.pow(10, 13);
    controls.target.set(0, 0, 0);
    controls.update();

    const loader = new THREE.TextureLoader();
    const textures = new Map<string, THREE.Texture>();
    const bodies = new Map<string, BodyHandle>();
    const orbitLines: THREE.LineLoop[] = [];
    const beltPoints: THREE.Points[] = [];
    let focusAnimation: FocusAnimation | null = null;
    const simulationStart = performance.now();
    const initialDay = dayOfYear(new Date());

    scene.add(new THREE.AmbientLight(0xffffff, 0.22));
    const sunLight = new THREE.PointLight(0xffffff, 1, 14959787070 * ORBIT_SCALE, 0.6);
    scene.add(sunLight);
    scene.add(createStarField(loader, textures));

    const sunDiameter = scaledDiameter(system.parent.diameter);
    const sunRadius = sunDiameter / 2;
    const sunMesh = new THREE.Mesh(
      new THREE.SphereGeometry(sunRadius, 84, 42),
      createTexturedMaterial(loader, textures, system.parent._3d?.textures?.base, 0xffbf33, true),
    );
    sunMesh.rotation.x = 90 * DEGREES_TO_RADIANS;
    scene.add(sunMesh);
    const sunBody: BodyHandle = {
      id: 'sun',
      name: system.parent.name,
      mesh: sunMesh,
      pivot: scene,
      orbitLine: null,
      radius: sunRadius,
      orbitRadius: 0,
      period: system.parent.rotationPeriod || 609.12,
      angle: 0,
      orbitOffset: 0,
    };
    bodies.set('sun', sunBody);

    const addOrbitLine = (radius: number, color: number): THREE.LineLoop => {
      const segments = Math.min(720, Math.max(180, Math.round(radius / 18)));
      const points: THREE.Vector3[] = [];
      for (let index = 0; index < segments; index += 1) {
        const theta = (index / segments) * Math.PI * 2;
        points.push(new THREE.Vector3(Math.cos(theta) * radius, Math.sin(theta) * radius, 0));
      }
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.72, depthWrite: false });
      const line = new THREE.LineLoop(geometry, material);
      scene.add(line);
      orbitLines.push(line);
      return line;
    };

    const addPlanet = (data: SourcePlanet): BodyHandle => {
      const diameter = scaledDiameter(data.diameter);
      const radius = diameter / 2;
      const distance = (data.distanceFromParent || 0) * ORBIT_SCALE;
      const orbitRadius = sunRadius + distance;
      const pivot = new THREE.Object3D();
      pivot.rotation.x = (data.orbitalInclination || 0) * DEGREES_TO_RADIANS;
      const material = createTexturedMaterial(loader, textures, data._3d?.textures?.base, 0x8b9bb5);
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(radius, Math.min(128, Math.max(32, Math.round(diameter + 66))), Math.min(128, Math.max(24, Math.round(diameter / 2 + 40)))),
        material,
      );
      mesh.position.set(orbitRadius, 0, 0);
      mesh.rotation.y = (data.axialTilt || 0) * DEGREES_TO_RADIANS;
      pivot.add(mesh);
      const orbitLine = addOrbitLine(orbitRadius, 0x424242);
      const body: BodyHandle = {
        id: `planet-${data.id}`,
        name: data.name,
        mesh,
        pivot,
        orbitLine,
        radius,
        orbitRadius,
        period: data.orbitalPeriod || 365.2,
        angle: 0,
        orbitOffset: data.orbitPositionOffset || 0,
      };
      pivot.add(orbitLine);
      scene.add(pivot);
      bodies.set(body.id, body);

      if (data.rings) {
        const innerRadius = data.rings.innerRadius * CELESTIAL_SCALE;
        const outerRadius = data.rings.outerRadius * CELESTIAL_SCALE;
        const ringGeometry = new THREE.RingGeometry(innerRadius, outerRadius, 180);
        const ringMaterial = createTexturedMaterial(loader, textures, data.rings.textures?.colorMap, 0xd5bd8b, true);
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = 90 * DEGREES_TO_RADIANS;
        mesh.add(ring);
      }

      for (const satellite of data.satellites || []) {
        if (!satellite.name || !satellite.distanceFromParent || !satellite.orbitalPeriod) continue;
        const moonDiameter = scaledDiameter(satellite.diameter || 100, true);
        const moonRadius = Math.max(moonDiameter / 2, 0.004);
        const moonOrbitRadius = radius + satellite.distanceFromParent * ORBIT_SCALE;
        const moonPivot = new THREE.Object3D();
        moonPivot.rotation.x = (satellite.orbitalInclination || 0) * DEGREES_TO_RADIANS;
        const moonMesh = new THREE.Mesh(
          new THREE.SphereGeometry(moonRadius, 20, 14),
          createTexturedMaterial(loader, textures, satellite._3d?.textures?.base, 0x9da3ad),
        );
        moonMesh.position.set(moonOrbitRadius, 0, 0);
        const moonOrbitLine = addOrbitLine(moonOrbitRadius, 0x424242);
        moonPivot.add(moonMesh, moonOrbitLine);
        pivot.add(moonPivot);
        bodies.set(`moon-${satellite.id || `${data.id}-${satellite.name}`}`, {
          id: `moon-${satellite.id || `${data.id}-${satellite.name}`}`,
          name: satellite.name,
          mesh: moonMesh,
          pivot: moonPivot,
          orbitLine: moonOrbitLine,
          radius: moonRadius,
          orbitRadius: moonOrbitRadius,
          period: satellite.orbitalPeriod,
          angle: Math.random() * Math.PI * 2,
          orbitOffset: 0,
        });
      }
      return body;
    };

    for (const planet of system.planets) addPlanet(planet);

    const asteroidBelt = system.asteroidBelt;
    const asteroidMin = (asteroidBelt?.distanceFromParent?.min || 329000000) * ORBIT_SCALE + sunRadius;
    const asteroidMax = (asteroidBelt?.distanceFromParent?.max || 478000000) * ORBIT_SCALE + sunRadius;
    beltPoints.push(createParticleBelt(scene, loader, textures, asteroidMin, asteroidMax, Math.min(1400, asteroidBelt?.count || 1000), '/solar-system/textures/asteroid.jpg', 16));
    const kuiperRadius = (system.kuiperBelt?.radius || 7479893535) * ORBIT_SCALE;
    beltPoints.push(createParticleBelt(scene, loader, textures, kuiperRadius * 0.78, kuiperRadius, 1100, '/solar-system/textures/asteroid.jpg', 11));

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerDown: { x: number; y: number } | null = null;
    const pickBody = (event: PointerEvent) => {
      if (!pointerDown || Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y) > 12) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects([...bodies.values()].map((body) => body.mesh), false);
      const body = hits[0]?.object ? [...bodies.values()].find((item) => item.mesh === hits[0].object) : undefined;
      if (body) {
        setSelectedId(body.id);
        focusAnimation = {
          body,
          fromPosition: camera.position.clone(),
          fromTarget: controls.target.clone(),
          offset: camera.position.clone().sub(body.mesh.getWorldPosition(new THREE.Vector3())).normalize().multiplyScalar(Math.max(body.radius * 6, 80)),
          elapsed: 0,
        };
      }
      pointerDown = null;
    };
    const onPointerDown = (event: PointerEvent) => {
      pointerDown = { x: event.clientX, y: event.clientY };
    };
    const onPointerUp = (event: PointerEvent) => pickBody(event);
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    const setOrbitEffects = (enabled: boolean) => {
      const colors = [0x197eaa, 0x3beaf7, 0x9d7bff, 0xffbd00, 0x54d6a5];
      orbitLines.forEach((line, index) => {
        const material = line.material as THREE.LineBasicMaterial;
        material.color.setHex(enabled ? colors[index % colors.length] : 0x2b2b2b);
        material.opacity = enabled ? 0.72 : 0.42;
        material.needsUpdate = true;
      });
    };
    setOrbitEffects(true);

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

    let animationFrame = 0;
    let previousTime = performance.now();
    const animate = (time: number) => {
      const delta = Math.min((time - previousTime) / 1000, 0.05);
      previousTime = time;
      const elapsedMinutes = (time - simulationStart) / 60000;
      if (!pausedRef.current) {
        bodies.forEach((body) => {
          if (body.period > 0 && body.orbitRadius > 0) {
            body.angle = ((initialDay + elapsedMinutes) + body.orbitOffset) * (360 / body.period) * DEGREES_TO_RADIANS;
            body.pivot.rotation.z = body.angle;
          }
          body.mesh.rotation.z += delta * 0.25;
        });
        sunMesh.rotation.z += delta * 0.1;
        beltPoints.forEach((points, index) => {
          points.rotation.z += delta * (index === 0 ? 0.0009 : 0.00035);
        });
      }

      if (focusAnimation) {
        focusAnimation.elapsed += delta;
        const progress = Math.min(focusAnimation.elapsed / 1.4, 1);
        const eased = progress * progress * (3 - 2 * progress);
        const targetPosition = focusAnimation.body.mesh.getWorldPosition(new THREE.Vector3());
        const endPosition = targetPosition.clone().add(focusAnimation.offset);
        camera.position.lerpVectors(focusAnimation.fromPosition, endPosition, eased);
        controls.target.lerpVectors(focusAnimation.fromTarget, targetPosition, eased);
        if (progress >= 1) focusAnimation = null;
      }

      controls.update();
      renderer.render(scene, camera);
      animationFrame = requestAnimationFrame(animate);
    };
    animationFrame = requestAnimationFrame(animate);

    const reset = () => {
      focusAnimation = null;
      camera.position.set(60000, 0, 15000);
      controls.target.set(0, 0, 0);
      controls.update();
      setSelectedId('solar-system');
    };
    const focus = (id: string) => {
      const body = bodies.get(id);
      if (!body) return;
      setSelectedId(id);
      focusAnimation = {
        body,
        fromPosition: camera.position.clone(),
        fromTarget: controls.target.clone(),
        offset: camera.position.clone().sub(body.mesh.getWorldPosition(new THREE.Vector3())).normalize().multiplyScalar(Math.max(body.radius * 6, 80)),
        elapsed: 0,
      };
    };

    const dispose = () => {
      cancelAnimationFrame(animationFrame);
      resizeObserver?.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      controls.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.LineLoop || object instanceof THREE.Points) {
          object.geometry.dispose();
          disposeMaterial(object.material);
        }
      });
      textures.forEach((texture) => texture.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };

    const handle: SceneHandle = { focus, reset, setOrbitEffects, dispose };
    sceneHandleRef.current = handle;
    return () => {
      dispose();
      sceneHandleRef.current = null;
    };
  }, [system, t]);

  const selectedPlanet = useMemo(() => {
    if (!system || !selectedId.startsWith('planet-')) return null;
    const id = Number(selectedId.replace('planet-', ''));
    return system.planets.find((planet) => planet.id === id) || null;
  }, [selectedId, system]);

  const selectedMoon = useMemo(() => {
    if (!system || !selectedId.startsWith('moon-')) return null;
    for (const planet of system.planets) {
      const moon = (planet.satellites || []).find((satellite) => `moon-${satellite.id}` === selectedId);
      if (moon) return moon;
    }
    return null;
  }, [selectedId, system]);

  const selectedTitle = selectedPlanet ? t(sourceCopyKey(selectedPlanet.name)) : selectedMoon?.name || (selectedId === 'sun' ? t('planetSun') : t('solarSystem'));

  if (loadError) {
    return (
      <div className="fixed inset-0 z-10 flex items-center justify-center bg-black px-5 text-center text-white">
        <div className="max-w-sm rounded-2xl border border-red-400/30 bg-slate-950/90 p-5">
          <p className="text-sm text-red-200">{loadError}</p>
          <button type="button" onClick={() => window.location.reload()} className="mt-4 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold">{t('tryAgain')}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-10 overflow-hidden bg-black text-white">
      <div ref={canvasRef} className="absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_20%,rgba(0,0,0,0.35)_85%,rgba(0,0,0,0.85)_100%)]" />

      <div className="absolute left-3 top-3 z-30 flex items-center gap-2 sm:left-5 sm:top-5">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="pointer-events-auto inline-flex min-h-11 items-center gap-2 rounded-full border border-white/20 bg-black/70 px-3 text-xs font-semibold text-white shadow-xl backdrop-blur-md transition hover:bg-black/90 active:scale-[0.98]"
          aria-label={t('sourceBack')}
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="hidden sm:inline">{t('sourceBack')}</span>
        </button>
      </div>

      <div className="pointer-events-none absolute left-1/2 top-4 z-20 -translate-x-1/2 rounded-full border border-white/10 bg-black/50 px-4 py-1.5 text-center text-sm font-semibold tracking-wide text-white shadow-lg backdrop-blur-md sm:top-5 sm:text-lg">
        {selectedTitle}
      </div>

      <aside className={`absolute left-3 top-16 z-20 w-[min(15rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-white/15 bg-black/75 shadow-2xl backdrop-blur-md transition-transform sm:left-5 sm:top-20 ${menuOpen ? '' : '-translate-x-[calc(100%-2.8rem)]'}`}>
        <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
          <button type="button" onClick={() => setMenuOpen((value) => !value)} className="flex min-h-10 flex-1 items-center gap-2 text-left text-sm font-bold text-white">
            {menuOpen ? <ChevronDown className="h-4 w-4 text-orange-300" /> : <ChevronRight className="h-4 w-4 text-orange-300" />}
            {t('sourcePlanets')}
          </button>
          <span className="text-[10px] text-slate-400">{system ? system.planets.length + 1 : '…'}</span>
        </div>
        {menuOpen && system && (
          <div className="max-h-[calc(100dvh-10rem)] overflow-y-auto p-1.5 [scrollbar-width:thin]">
            {system.planets.map((planet) => {
              const bodyId = `planet-${planet.id}`;
              const active = selectedId === bodyId;
              const expanded = expandedPlanetId === planet.id;
              return (
                <div key={planet.id} className="border-b border-white/5 last:border-0">
                  <div className={`flex items-center rounded-lg ${active ? 'bg-cyan-400/15 text-cyan-100' : 'text-slate-200'}`}>
                    <button type="button" onClick={() => { setExpandedPlanetId(planet.id); sceneHandleRef.current?.focus(bodyId); }} className="flex min-h-10 min-w-0 flex-1 items-center gap-2 px-2 text-left text-xs font-semibold hover:text-white">
                      <span className="h-2 w-2 shrink-0 rounded-full bg-cyan-300" />
                      <span className="truncate">{t(sourceCopyKey(planet.name))}</span>
                    </button>
                    <button type="button" onClick={() => setExpandedPlanetId((value) => value === planet.id ? null : planet.id)} className="flex h-10 w-10 shrink-0 items-center justify-center text-slate-400 hover:text-white" aria-label={`${t(sourceCopyKey(planet.name))} details`}>
                      {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                  </div>
                  {expanded && (
                    <div className="space-y-1 px-3 pb-2 text-[10px] text-slate-400">
                      <div className="flex justify-between gap-3"><span>{t('diameter')}</span><span className="text-right text-slate-200">{planet.diameter.toLocaleString()} km</span></div>
                      <div className="flex justify-between gap-3"><span>{t('distanceFromSun')}</span><span className="text-right text-slate-200">{(planet.distanceFromParent || 0).toLocaleString()} km</span></div>
                      <div className="flex justify-between gap-3"><span>{t('orbitalPeriod')}</span><span className="text-right text-slate-200">{planet.orbitalPeriod || '—'} days</span></div>
                      <div className="flex justify-between gap-3"><span>Orbit inclination</span><span className="text-right text-slate-200">{planet.orbitalInclination || 0}°</span></div>
                    </div>
                  )}
                </div>
              );
            })}
            <button type="button" onClick={() => sceneHandleRef.current?.focus('sun')} className={`mt-1 flex min-h-10 w-full items-center gap-2 rounded-lg px-2 text-left text-xs font-semibold ${selectedId === 'sun' ? 'bg-orange-400/20 text-orange-100' : 'text-slate-200 hover:bg-white/10'}`}>
              <span className="h-2 w-2 rounded-full bg-orange-300" />
              {t('planetSun')}
            </button>
          </div>
        )}
      </aside>

      {selectedPlanet && (selectedPlanet.satellites || []).length > 0 && (
        <aside className="absolute bottom-16 left-3 z-20 max-h-36 w-[min(15rem,calc(100vw-1.5rem))] overflow-y-auto rounded-xl border border-white/15 bg-black/75 p-2 shadow-2xl backdrop-blur-md sm:bottom-20 sm:left-5">
          <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">{t('sourceMoons')}</p>
          <div className="grid grid-cols-2 gap-1">
            {(selectedPlanet.satellites || []).map((moon) => {
              const id = `moon-${moon.id}`;
              return <button key={id} type="button" onClick={() => sceneHandleRef.current?.focus(id)} className={`min-h-9 truncate rounded-lg px-2 text-left text-[10px] ${selectedId === id ? 'bg-cyan-400/15 text-cyan-100' : 'text-slate-300 hover:bg-white/10'}`}>{moon.name}</button>;
            })}
          </div>
        </aside>
      )}

      <div className="absolute bottom-3 left-3 right-3 z-20 flex items-end justify-between gap-2 sm:bottom-5 sm:left-5 sm:right-5">
        <label className="pointer-events-auto flex min-h-11 items-center gap-2 rounded-xl border border-white/15 bg-black/70 px-3 text-xs text-white shadow-xl backdrop-blur-md">
          <input type="checkbox" checked={orbitEffects} onChange={(event) => { setOrbitEffects(event.target.checked); sceneHandleRef.current?.setOrbitEffects(event.target.checked); }} className="h-4 w-4 accent-cyan-400" />
          <span className="hidden sm:inline">{t('orbitColorEffects')}</span>
          <span className="sm:hidden">{t('orbitColorEffects')}</span>
        </label>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => sceneHandleRef.current?.reset()} className="pointer-events-auto inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 bg-black/70 px-3 text-xs font-semibold text-white shadow-xl backdrop-blur-md hover:bg-black/90">Reset</button>
          <button type="button" onClick={() => setShowHelp(true)} className="pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/70 text-white shadow-xl backdrop-blur-md hover:bg-black/90" aria-label={t('simulationControls')}><HelpCircle className="h-5 w-5" /></button>
        </div>
      </div>

      {isPortrait && (
        <div className="pointer-events-none absolute right-3 top-16 z-20 max-w-[10rem] rounded-xl border border-orange-300/30 bg-orange-500/15 px-2 py-1.5 text-right text-[10px] text-orange-100 shadow-lg backdrop-blur-md sm:right-5 sm:top-20">
          Rotate your phone for the best view
        </div>
      )}

      {showHelp && system && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/35 px-4">
          <div className="pointer-events-auto relative w-full max-w-md rounded-2xl border border-white/20 bg-[#262626]/95 p-5 shadow-2xl backdrop-blur-md">
            <button type="button" onClick={() => setShowHelp(false)} className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full text-slate-300 hover:bg-white/10 hover:text-white" aria-label="Close"><X className="h-5 w-5" /></button>
            <h2 className="pr-10 text-xl font-semibold text-white">{t('simulationControls')}</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-200">{t('sourceControlsHint')}</p>
            <p className="mt-3 text-xs leading-relaxed text-slate-400">{t('sourceScale')}</p>
            <button type="button" onClick={() => setShowHelp(false)} className="mt-5 min-h-11 w-full rounded-xl bg-white/10 px-4 text-sm font-semibold text-white hover:bg-white/15">{t('tryAgain') === 'Try again' ? 'Got it' : 'ተረድቻለሁ'}</button>
          </div>
        </div>
      )}

      {!system && !loadError && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black px-5 text-center text-sm text-slate-200">{t('sourceLoading')}</div>
      )}
    </div>
  );
}
