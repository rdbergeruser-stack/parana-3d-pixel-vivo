'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PLACES, PLACE_CATEGORIES, Place, PlaceCategory } from '@/data/places';
import { ROUTES, TourRoute } from '@/data/routes';
import { projectTo3D, getElevation, PARANA_ORIGIN, isWater } from '@/lib/geo';
import {
  Compass,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  X,
  MapPin,
  Sparkles,
  Info,
  Navigation,
  Check,
  ChevronRight,
  ChevronLeft,
  Eye,
  Search,
  ExternalLink,
  MessageSquare,
  Send,
  CheckCircle2,
  BookOpen,
  Route as RouteIcon
} from 'lucide-react';
import {
  buildCatedral,
  buildPalacioMunicipal,
  buildTeatro3DeFebrero,
  buildPatitoSiriri,
  buildMonumentoUrquiza,
  buildSalaMayo,
  buildTunelSubfluvial,
  buildEstadioGrella,
  buildEasterEggMate,
  buildEasterEggDorado
} from './VoxelLandmarks';

interface GeoFeatureData {
  coastline: [number, number][];
  islands: { name: string; polygon: [number, number][] }[];
  arteries: { name: string; category: string; coordinates: [number, number][] }[];
  parks: { name: string; polygon: [number, number][] }[];
}

// Point-in-polygon algorithm (ray-casting)
function isPointInPolygon(point: [number, number], polygon: [number, number][]): boolean {
  const [lat, lng] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const intersect = ((yi > lng) !== (yj > lng)) &&
      (lat < ((xj - xi) * (lng - yi)) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// Create a high-res numeric circular badge texture for place pins
function createPinBadgeTexture(numberStr: string, colorHex: string): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Clear
  ctx.clearRect(0, 0, size, size);

  // Outer glow / shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 4;

  // Background circle
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 10, 0, Math.PI * 2);
  ctx.fillStyle = colorHex;
  ctx.fill();

  // Reset shadow for crisp border
  ctx.shadowColor = 'transparent';
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();

  // Number text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 44px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(numberStr, size / 2, size / 2 + 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  return texture;
}

export default function ParanaMap3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();

  // UI state
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [hoveredPlace, setHoveredPlace] = useState<Place | null>(null);
  const [activeCategory, setActiveCategory] = useState<PlaceCategory | 'todas'>('todas');
  const [activeRoute, setActiveRoute] = useState<TourRoute | null>(null);
  const [activeRouteStep, setActiveRouteStep] = useState<number>(0);
  const [isLoaded, setIsLoaded] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Collaboration feedback modal
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'falta' | 'error' | 'sugerencia'>('falta');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackEmail, setFeedbackEmail] = useState('');
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);

  // References to 3D engine controls and objects
  const engineRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    pinGroup: THREE.Group;
    pinSprites: { sprite: THREE.Sprite; place: Place; index: number; basePos: THREE.Vector3 }[];
    routeLineGroup: THREE.Group;
    flyTarget: THREE.Vector3 | null;
    flyCameraTarget: THREE.Vector3 | null;
    doradoMesh: THREE.Group | null;
  } | null>(null);

  // Fly camera to specific 3D location smoothly
  const flyToPlace = useCallback((place: Place) => {
    if (!engineRef.current) return;

    if (place.id === 'easter_egg_mate_gigante') {
      // Underneath the diorama base
      engineRef.current.flyTarget = new THREE.Vector3(0, -18, 0);
      engineRef.current.flyCameraTarget = new THREE.Vector3(45, -34, 45);
      setSelectedPlace(place);
      return;
    }

    if (place.id === 'easter_egg_dorado_gigante') {
      // River channel
      engineRef.current.flyTarget = new THREE.Vector3(-170, 0.4, -140);
      engineRef.current.flyCameraTarget = new THREE.Vector3(-120, 35, -95);
      setSelectedPlace(place);
      return;
    }

    const { x, z } = projectTo3D(place.coordinates.lat, place.coordinates.lng);
    const elev = getElevation(place.coordinates.lat, place.coordinates.lng);

    const targetPos = new THREE.Vector3(x, elev, z);
    const cameraOffset = new THREE.Vector3(80, 95, 80);

    engineRef.current.flyTarget = targetPos.clone();
    engineRef.current.flyCameraTarget = targetPos.clone().add(cameraOffset);
    setSelectedPlace(place);
  }, []);

  // Reset camera view to Plaza 1° de Mayo center
  const resetCameraView = useCallback(() => {
    if (!engineRef.current) return;
    engineRef.current.flyTarget = new THREE.Vector3(0, 4, 0);
    engineRef.current.flyCameraTarget = new THREE.Vector3(180, 210, 180);
    setSelectedPlace(null);
  }, []);

  // Filtered search results for real-time search
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return PLACES.filter(
      p =>
        p.name.toLowerCase().includes(q) ||
        p.subtitle.toLowerCase().includes(q) ||
        p.zone.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [searchQuery]);

  // Navigate through active route step-by-step
  const handleRouteStep = useCallback((direction: 'next' | 'prev') => {
    if (!activeRoute) return;
    const placesInRoute = activeRoute.places
      .map(id => PLACES.find(p => p.id === id))
      .filter((p): p is Place => Boolean(p));

    if (placesInRoute.length === 0) return;

    let nextStep = direction === 'next' ? activeRouteStep + 1 : activeRouteStep - 1;
    if (nextStep < 0) nextStep = placesInRoute.length - 1;
    if (nextStep >= placesInRoute.length) nextStep = 0;

    setActiveRouteStep(nextStep);
    flyToPlace(placesInRoute[nextStep]);
  }, [activeRoute, activeRouteStep, flyToPlace]);

  // Handle URL query parameter ?lugar=slug
  useEffect(() => {
    if (!isLoaded) return;
    const lugarQuery = searchParams.get('lugar');
    if (!lugarQuery) return;

    const targetPlace = PLACES.find(
      p => p.id === lugarQuery || p.id.toLowerCase().includes(lugarQuery.toLowerCase())
    );
    if (targetPlace) {
      flyToPlace(targetPlace);
    }
  }, [isLoaded, searchParams, flyToPlace]);

  // Zoom helpers
  const handleZoom = (inOut: 'in' | 'out') => {
    if (!engineRef.current) return;
    const { camera, controls } = engineRef.current;
    const factor = inOut === 'in' ? 0.75 : 1.35;
    const dir = new THREE.Vector3().subVectors(camera.position, controls.target);
    camera.position.copy(controls.target).add(dir.multiplyScalar(factor));
    controls.update();
  };

  // Main 3D Initialization Effect
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let animationFrameId: number;
    let isDisposed = false;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0c192c');
    scene.fog = new THREE.FogExp2('#0c192c', 0.0016);

    const width = container.clientWidth;
    const height = container.clientHeight;

    // Low FOV perspective camera for miniature diorama aesthetic
    const camera = new THREE.PerspectiveCamera(26, width / height, 2, 2000);
    camera.position.set(220, 240, 220);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);

    // 2. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.target.set(0, 4, 0); // Plaza 1° de Mayo
    controls.minDistance = 25;
    controls.maxDistance = 650;
    controls.maxPolarAngle = Math.PI * 0.72; // Allow tilting below horizon to view under the diorama
    controls.minPolarAngle = 0.05;

    // 3. Diorama Lighting (Warm sunny afternoon over the Paraná river)
    const ambientLight = new THREE.HemisphereLight('#f1f5f9', '#475569', 0.95);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight('#fff7ed', 1.85);
    sunLight.position.set(180, 280, 140);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 50;
    sunLight.shadow.camera.far = 700;
    const shadowD = 280;
    sunLight.shadow.camera.left = -shadowD;
    sunLight.shadow.camera.right = shadowD;
    sunLight.shadow.camera.top = shadowD;
    sunLight.shadow.camera.bottom = -shadowD;
    sunLight.shadow.bias = -0.0004;
    scene.add(sunLight);

    // River bounce light (subtle cyan fill)
    const riverBounceLight = new THREE.DirectionalLight('#38bdf8', 0.45);
    riverBounceLight.position.set(-200, 100, -150);
    scene.add(riverBounceLight);

    // 4. Diorama Under-Base Slab
    const baseGeom = new THREE.BoxGeometry(680, 18, 560);
    const baseMat = new THREE.MeshStandardMaterial({
      color: '#0f172a',
      roughness: 0.8,
      metalness: 0.1
    });
    const baseMesh = new THREE.Mesh(baseGeom, baseMat);
    baseMesh.position.set(30, -9.5, 10);
    baseMesh.receiveShadow = true;
    scene.add(baseMesh);

    // 5. River Water Plane (Y = 0)
    const waterGeom = new THREE.PlaneGeometry(900, 750, 64, 64);
    const waterMat = new THREE.MeshStandardMaterial({
      color: '#13576b',
      roughness: 0.18,
      metalness: 0.25,
      transparent: true,
      opacity: 0.94
    });
    const waterMesh = new THREE.Mesh(waterGeom, waterMat);
    waterMesh.rotation.x = -Math.PI / 2;
    waterMesh.position.set(-100, 0.05, 0);
    waterMesh.receiveShadow = true;
    scene.add(waterMesh);

    // Groups for pins and routes
    const pinGroup = new THREE.Group();
    scene.add(pinGroup);

    const routeLineGroup = new THREE.Group();
    scene.add(routeLineGroup);

    const pinSprites: { sprite: THREE.Sprite; place: Place; index: number; basePos: THREE.Vector3 }[] = [];

    // Store engine reference
    engineRef.current = {
      scene,
      camera,
      renderer,
      controls,
      pinGroup,
      pinSprites,
      routeLineGroup,
      flyTarget: null,
      flyCameraTarget: null,
      doradoMesh: null
    };

    // 6. Load OSM Geo Data & Build Terrain + Flora + Arteries + Bespoke Landmarks
    fetch('/data/parana-geo.json')
      .then(res => res.json())
      .then((geoData: GeoFeatureData) => {
        if (isDisposed) return;

        buildVoxelTerrain(scene, geoData);
        buildArteries(scene, geoData);
        buildFlora(scene, geoData);
        const { dorado } = buildBespokeLandmarks(scene);
        if (engineRef.current) {
          engineRef.current.doradoMesh = dorado;
        }
        buildPlacePins(pinGroup, pinSprites);
        setIsLoaded(true);
      })
      .catch(err => {
        console.error('Error loading parana-geo.json:', err);
      });

    // 7. Raycasting for Interaction (Hover & Click)
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onPointerMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const interactiveSprites = pinSprites.map(p => p.sprite);
      const intersects = raycaster.intersectObjects(interactiveSprites, false);

      if (intersects.length > 0) {
        const hitSprite = intersects[0].object as THREE.Sprite;
        const entry = pinSprites.find(p => p.sprite === hitSprite);
        if (entry) {
          setHoveredPlace(entry.place);
          renderer.domElement.style.cursor = 'pointer';
          hitSprite.scale.set(8.5, 8.5, 1);
          return;
        }
      }

      setHoveredPlace(null);
      renderer.domElement.style.cursor = 'default';
      // Reset pin scales
      pinSprites.forEach(p => {
        if (selectedPlace?.id !== p.place.id) {
          p.sprite.scale.set(6.5, 6.5, 1);
        }
      });
    };

    const onClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const interactiveSprites = pinSprites.map(p => p.sprite);
      const intersects = raycaster.intersectObjects(interactiveSprites, false);

      if (intersects.length > 0) {
        const hitSprite = intersects[0].object as THREE.Sprite;
        const entry = pinSprites.find(p => p.sprite === hitSprite);
        if (entry) {
          flyToPlace(entry.place);
        }
      }
    };

    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('click', onClick);

    // 8. Animation & Render Loop
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsedTime = clock.getElapsedTime();

      // Smooth camera flying lerp
      if (engineRef.current?.flyTarget && engineRef.current?.flyCameraTarget) {
        controls.target.lerp(engineRef.current.flyTarget, 0.07);
        camera.position.lerp(engineRef.current.flyCameraTarget, 0.07);

        if (
          controls.target.distanceTo(engineRef.current.flyTarget) < 0.2 &&
          camera.position.distanceTo(engineRef.current.flyCameraTarget) < 0.5
        ) {
          engineRef.current.flyTarget = null;
          engineRef.current.flyCameraTarget = null;
        }
      }

      controls.update();

      // Bobbing animation for selected and hovered pins
      pinSprites.forEach(p => {
        const isSel = selectedPlace?.id === p.place.id;
        const isHov = hoveredPlace?.id === p.place.id;
        const bobOffset = isSel || isHov ? Math.sin(elapsedTime * 4 + p.index) * 0.4 : 0;
        p.sprite.position.y = p.basePos.y + bobOffset;
      });

      // Subtle pulse on active route
      if (routeLineGroup.children.length > 0) {
        routeLineGroup.children.forEach(child => {
          if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
            child.material.emissiveIntensity = 0.6 + Math.sin(elapsedTime * 3) * 0.3;
          }
        });
      }

      // Gentle swimming motion for the Dorado Easter Egg in the river
      if (engineRef.current?.doradoMesh) {
        engineRef.current.doradoMesh.position.y = 0.4 + Math.sin(elapsedTime * 2.8) * 0.35;
        engineRef.current.doradoMesh.rotation.y = Math.sin(elapsedTime * 1.8) * 0.15;
      }

      renderer.render(scene, camera);
    };

    animate();

    // 9. Resize Handling
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      isDisposed = true;
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('click', onClick);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [flyToPlace]);

  // Update pin visibility based on category filter
  useEffect(() => {
    if (!engineRef.current) return;
    const { pinSprites } = engineRef.current;
    pinSprites.forEach(p => {
      if (activeCategory === 'todas') {
        p.sprite.visible = true;
      } else {
        p.sprite.visible = p.place.category === activeCategory;
      }
    });
  }, [activeCategory]);

  // Update 3D luminous route line when activeRoute changes
  useEffect(() => {
    if (!engineRef.current) return;
    const { routeLineGroup, scene } = engineRef.current;

    // Clear existing route line
    while (routeLineGroup.children.length > 0) {
      const obj = routeLineGroup.children[0];
      routeLineGroup.remove(obj);
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    }

    if (!activeRoute) return;

    // Find places in route order
    const routePlaces = activeRoute.places
      .map(id => PLACES.find(p => p.id === id))
      .filter((p): p is Place => Boolean(p));

    if (routePlaces.length < 2) return;

    const points: THREE.Vector3[] = [];
    routePlaces.forEach(p => {
      const { x, z } = projectTo3D(p.coordinates.lat, p.coordinates.lng);
      const elev = getElevation(p.coordinates.lat, p.coordinates.lng);
      points.push(new THREE.Vector3(x, elev + 2.2, z));
    });

    // Create smooth Catmull-Rom 3D Spline Curve
    const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.25);
    const tubeGeom = new THREE.TubeGeometry(curve, 128, 0.7, 8, false);

    const tubeMat = new THREE.MeshStandardMaterial({
      color: activeRoute.color || '#38bdf8',
      emissive: activeRoute.color || '#38bdf8',
      emissiveIntensity: 0.8,
      roughness: 0.2,
      metalness: 0.5
    });

    const tubeMesh = new THREE.Mesh(tubeGeom, tubeMat);
    tubeMesh.castShadow = true;
    routeLineGroup.add(tubeMesh);

    // Auto-fly to first stop
    flyToPlace(routePlaces[0]);
  }, [activeRoute, flyToPlace]);

  return (
    <div className="relative w-full h-screen overflow-hidden select-none bg-slate-950 font-sans">
      {/* 3D WebGL Canvas Container */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Loading Overlay */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center z-50 text-white space-y-3">
          <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium tracking-wide text-slate-300">
            Construyendo Terreno Voxel y Maqueta 3D de Paraná...
          </p>
        </div>
      )}

      {/* Top Floating Control Bar */}
      <div className="absolute top-4 left-4 right-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pointer-events-none z-20">
        {/* Left Section: Brand & Real-time Search */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Brand Pill */}
          <div className="flex items-center gap-2.5 bg-slate-900/90 backdrop-blur-md border border-slate-800 text-white px-3.5 py-2 rounded-2xl shadow-xl">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold text-sm">
              P
            </div>
            <div>
              <h1 className="text-sm font-bold leading-tight">Paraná Pixelado</h1>
              <p className="text-[10px] text-slate-400 leading-none">Entre Ríos, Argentina</p>
            </div>
          </div>

          {/* Real-time Search Input */}
          <div className="relative flex-1 md:w-64">
            <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-md border border-slate-800 px-3 py-2 rounded-2xl shadow-xl text-white">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                placeholder="Buscar lugar o barrio..."
                className="bg-transparent border-none outline-none text-xs text-white placeholder-slate-500 w-full"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="p-0.5 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Search Results Dropdown */}
            {isSearchFocused && searchResults.length > 0 && (
              <div
                onMouseLeave={() => setIsSearchFocused(false)}
                className="absolute left-0 right-0 top-full mt-1.5 bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-2xl p-1.5 shadow-2xl z-30 max-h-72 overflow-y-auto space-y-1"
              >
                {searchResults.map(place => (
                  <button
                    key={place.id}
                    onClick={() => {
                      flyToPlace(place);
                      setIsSearchFocused(false);
                      setSearchQuery('');
                    }}
                    className="w-full text-left p-2 rounded-xl text-xs hover:bg-slate-800/80 transition-colors flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-white flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: PLACE_CATEGORIES[place.category].color }}
                        />
                        <span>{place.name}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[200px]">
                        {place.zone} • {place.subtitle}
                      </div>
                    </div>
                    <Compass className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Center: Category Filter Pills */}
        <div className="flex items-center gap-1 bg-slate-900/85 backdrop-blur-md border border-slate-800/80 p-1.5 rounded-2xl shadow-xl pointer-events-auto overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveCategory('todas')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              activeCategory === 'todas'
                ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            Todos ({PLACES.length})
          </button>

          {(Object.keys(PLACE_CATEGORIES) as PlaceCategory[]).map(catKey => {
            const cat = PLACE_CATEGORIES[catKey];
            const isCatActive = activeCategory === catKey;
            const count = PLACES.filter(p => p.category === catKey).length;
            return (
              <button
                key={catKey}
                onClick={() => setActiveCategory(catKey)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
                  isCatActive
                    ? 'text-white font-semibold shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
                style={{
                  backgroundColor: isCatActive ? cat.color : undefined
                }}
              >
                <span>{cat.name}</span>
                <span className="text-[10px] opacity-75 font-mono">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Right Section: Routes Dropdown & SSG Catalog Link */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Catalog Link */}
          <Link
            href="/lugares"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-medium bg-slate-900/90 text-slate-200 border border-slate-800 hover:bg-slate-800 transition-colors shadow-xl"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            <span>Catálogo</span>
          </Link>

          {/* Routes Dropdown */}
          <div className="relative group">
            <button
              className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-medium shadow-xl border backdrop-blur-md transition-all ${
                activeRoute
                  ? 'bg-emerald-600 text-white border-emerald-500 font-semibold'
                  : 'bg-slate-900/90 text-slate-200 border-slate-800 hover:bg-slate-800'
              }`}
            >
              <Navigation className="w-3.5 h-3.5 text-amber-400" />
              <span>{activeRoute ? activeRoute.name : 'Recorridos'}</span>
            </button>

            {/* Dropdown Menu */}
            <div className="absolute right-0 top-full mt-2 w-72 bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-2xl p-2 shadow-2xl hidden group-hover:block transition-all z-30">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2 py-1 mb-1">
                Circuitos Curados
              </div>
              {activeRoute && (
                <button
                  onClick={() => {
                    setActiveRoute(null);
                    setActiveRouteStep(0);
                  }}
                  className="w-full text-left px-2.5 py-2 rounded-xl text-xs text-rose-400 hover:bg-rose-500/10 flex items-center justify-between mb-1"
                >
                  <span>Desactivar recorrido</span>
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              {ROUTES.map(route => (
                <button
                  key={route.id}
                  onClick={() => {
                    setActiveRoute(route);
                    setActiveRouteStep(0);
                  }}
                  className={`w-full text-left px-2.5 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                    activeRoute?.id === route.id
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <div>
                    <div className="font-medium text-slate-100">{route.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {route.places.length} paradas • {route.distance} • {route.duration}
                    </div>
                  </div>
                  {activeRoute?.id === route.id && <Check className="w-4 h-4 text-amber-400" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Active Route Step-by-Step Bottom Floating Bar */}
      {activeRoute && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 w-full max-w-lg px-4 pointer-events-auto animate-in slide-in-from-top duration-300">
          <div className="bg-slate-900/95 backdrop-blur-xl border border-emerald-500/40 rounded-2xl p-3 shadow-2xl text-white flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="space-y-0.5 text-left w-full sm:w-auto">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-bold text-white">{activeRoute.name}</span>
                <span className="text-[10px] text-emerald-400 font-mono px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                  Parada {activeRouteStep + 1} de {activeRoute.places.length}
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Transporte: <span className="text-amber-300">{activeRoute.transport}</span> ({activeRoute.distance} • {activeRoute.duration})
              </p>
            </div>

            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              <button
                onClick={() => handleRouteStep('prev')}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium flex items-center gap-1 text-slate-200"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Anterior</span>
              </button>
              <button
                onClick={() => handleRouteStep('next')}
                className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold flex items-center gap-1 text-white shadow"
              >
                <span className="hidden sm:inline">Siguiente</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setActiveRoute(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
                title="Cerrar recorrido"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Hover Tooltip */}
      {hoveredPlace && !selectedPlace && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 pointer-events-none z-20 animate-fade-in">
          <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 px-4 py-2 rounded-xl shadow-2xl flex items-center gap-2.5">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: PLACE_CATEGORIES[hoveredPlace.category].color }}
            />
            <span className="text-xs font-bold text-white">{hoveredPlace.name}</span>
            <span className="text-[10px] text-slate-400">({hoveredPlace.zone})</span>
          </div>
        </div>
      )}

      {/* Camera Navigation Control Bar & Collaboration Button (Bottom-Left) */}
      <div className="absolute bottom-6 left-6 z-20 flex flex-col gap-2 pointer-events-auto">
        <div className="flex items-center gap-2">
          {/* Zoom & Reset Controls */}
          <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 p-1.5 rounded-2xl shadow-xl flex items-center gap-1">
            <button
              onClick={resetCameraView}
              title="Centrar en Plaza 1° de Mayo"
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <div className="w-[1px] h-5 bg-slate-800" />
            <button
              onClick={() => handleZoom('in')}
              title="Acercar (Zoom +)"
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleZoom('out')}
              title="Alejar (Zoom -)"
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
          </div>

          {/* Collaboration Feedback Trigger Button */}
          <button
            onClick={() => {
              setIsFeedbackOpen(true);
              setFeedbackSuccess(false);
            }}
            className="bg-slate-900/90 backdrop-blur-md border border-slate-800 hover:border-amber-500/50 hover:bg-slate-800 text-slate-300 hover:text-amber-300 px-3 py-2.5 rounded-2xl shadow-xl text-xs font-medium flex items-center gap-2 transition-all"
          >
            <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">¿Algo está mal o falta? Avisanos</span>
            <span className="sm:hidden">Avisanos</span>
          </button>
        </div>

        {/* Navigation Hint */}
        <div className="text-[10px] text-slate-400 bg-slate-950/80 backdrop-blur px-2.5 py-1 rounded-lg border border-slate-900 inline-flex items-center gap-1.5">
          <span>Arrastrar: Rotar</span>
          <span>•</span>
          <span>Click derecho: Mover</span>
          <span>•</span>
          <span>Rueda: Zoom</span>
        </div>
      </div>

      {/* Selected Place Card (Bottom-Right / Drawer) */}
      {selectedPlace && (
        <div className="absolute bottom-6 right-6 max-w-sm w-full z-30 animate-in slide-in-from-bottom duration-300 pointer-events-auto">
          <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl p-5 shadow-2xl text-white space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <span
                  className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mb-1"
                  style={{
                    backgroundColor: `${PLACE_CATEGORIES[selectedPlace.category].color}25`,
                    color: PLACE_CATEGORIES[selectedPlace.category].color
                  }}
                >
                  {PLACE_CATEGORIES[selectedPlace.category].name}
                </span>
                <h3 className="text-base font-bold text-white leading-tight">
                  {selectedPlace.name}
                </h3>
                <p className="text-xs text-amber-300 font-medium">{selectedPlace.subtitle}</p>
              </div>
              <button
                onClick={() => setSelectedPlace(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Metadata Badges */}
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-500" />
                {selectedPlace.zone}
              </span>
              {selectedPlace.year && (
                <>
                  <span>•</span>
                  <span>Año: {selectedPlace.year}</span>
                </>
              )}
            </div>

            {/* Description */}
            <p className="text-xs text-slate-300 leading-relaxed">
              {selectedPlace.description}
            </p>

            {/* Curiosity Note */}
            {selectedPlace.curiosity && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5 text-xs text-amber-200/90 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="leading-snug">{selectedPlace.curiosity}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => flyToPlace(selectedPlace)}
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shadow-lg"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Centrar Vista</span>
                </button>

                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${selectedPlace.coordinates.lat},${selectedPlace.coordinates.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-slate-700"
                >
                  <span>Cómo llegar ↗</span>
                </a>
              </div>

              <Link
                href={`/lugar/${selectedPlace.id}`}
                className="w-full text-center text-xs text-amber-400 hover:text-amber-300 py-1.5 rounded-lg font-medium transition-colors"
              >
                Ver ficha completa en el catálogo →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Collaboration Feedback Modal */}
      {isFeedbackOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-md w-full shadow-2xl text-white space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-amber-400" />
                  Colaborá con Paraná Pixelado
                </h3>
                <p className="text-xs text-slate-400">
                  ¿Viste algún dato incorrecto o falta un hito emblemático?
                </p>
              </div>
              <button
                onClick={() => setIsFeedbackOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {feedbackSuccess ? (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-5 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <h4 className="text-sm font-bold text-white">¡Aporte recibido con éxito!</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Muchas gracias por colaborar para que Paraná Pixelado sea cada día más preciso y completo.
                </p>
                <button
                  onClick={() => setIsFeedbackOpen(false)}
                  className="mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold"
                >
                  Cerrar
                </button>
              </div>
            ) : (
              <form
                onSubmit={e => {
                  e.preventDefault();
                  setFeedbackSuccess(true);
                  setFeedbackMessage('');
                  setFeedbackEmail('');
                }}
                className="space-y-3"
              >
                {/* Feedback Type Tabs */}
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
                  {(['falta', 'error', 'sugerencia'] as const).map(type => (
                    <button
                      type="button"
                      key={type}
                      onClick={() => setFeedbackType(type)}
                      className={`py-1.5 text-xs font-medium rounded-lg capitalize transition-colors ${
                        feedbackType === type
                          ? 'bg-amber-500 text-slate-950 font-bold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {type === 'falta' ? 'Falta lugar' : type === 'error' ? 'Dato erróneo' : 'Sugerencia'}
                    </button>
                  ))}
                </div>

                {/* Message */}
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">
                    Detalles del reporte o sugerencia
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={feedbackMessage}
                    onChange={e => setFeedbackMessage(e.target.value)}
                    placeholder="Contanos qué edificio falta, la ubicación exacta o el dato a corregir..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-500/50"
                  />
                </div>

                {/* Email (Optional) */}
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">
                    Tu correo electrónico (opcional)
                  </label>
                  <input
                    type="email"
                    value={feedbackEmail}
                    onChange={e => setFeedbackEmail(e.target.value)}
                    placeholder="ejemplo@correo.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-500/50"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsFeedbackOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-slate-800"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1.5 shadow"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Enviar Aporte</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 3D Procedural Generators & Builder Helpers
// ==========================================

/**
 * 1. Build Quantized Voxel Terrain with stepped Parque Urquiza Barrancas
 */
function buildVoxelTerrain(scene: THREE.Scene, geoData: GeoFeatureData) {
  // Grid parameters (1 unit ≈ 10 meters)
  const step = 6.0; // 60m blocks
  const xMin = -280;
  const xMax = 320;
  const zMin = -240;
  const zMax = 240;

  const cols = Math.ceil((xMax - xMin) / step);
  const rows = Math.ceil((zMax - zMin) / step);
  const maxInstances = cols * rows;

  const boxGeom = new THREE.BoxGeometry(step * 0.96, 1.0, step * 0.96);
  const terrainMat = new THREE.MeshStandardMaterial({
    roughness: 0.85,
    metalness: 0.05
  });

  const instancedMesh = new THREE.InstancedMesh(boxGeom, terrainMat, maxInstances);
  instancedMesh.castShadow = true;
  instancedMesh.receiveShadow = true;

  // Urban filler buildings mesh
  const bldgGeom = new THREE.BoxGeometry(step * 0.72, 1.0, step * 0.72);
  const bldgMat = new THREE.MeshStandardMaterial({
    roughness: 0.65,
    metalness: 0.1
  });
  const bldgMesh = new THREE.InstancedMesh(bldgGeom, bldgMat, maxInstances);
  bldgMesh.castShadow = true;
  bldgMesh.receiveShadow = true;

  const matrix = new THREE.Matrix4();
  const color = new THREE.Color();
  const dummy = new THREE.Object3D();

  let terrainCount = 0;
  let bldgCount = 0;

  // Building color palette (warm diorama towns)
  const bldgColors = [
    '#f8fafc',
    '#f1f5f9',
    '#fef3c7',
    '#fde68a',
    '#fed7aa',
    '#fca5a5',
    '#cbd5e1',
    '#e2e8f0'
  ];

  for (let ix = 0; ix < cols; ix++) {
    for (let iz = 0; iz < rows; iz++) {
      const x = xMin + ix * step;
      const z = zMin + iz * step;

      // Inverse projection to GPS coordinates
      const lat = PARANA_ORIGIN.lat - z / 11088.0;
      const lng = PARANA_ORIGIN.lng + x / 9468.0;

      // Check if coordinate is in the water
      if (isWater(lat, lng)) {
        continue; // River water plane shows through
      }

      const elev = getElevation(lat, lng);
      if (elev <= 0) continue;

      // Check if inside any park polygon
      let isPark = false;
      for (const park of geoData.parks) {
        if (isPointInPolygon([lat, lng], park.polygon)) {
          isPark = true;
          break;
        }
      }

      // Check if coordinate is on an island
      let isIsland = false;
      for (const island of geoData.islands) {
        if (isPointInPolygon([lat, lng], island.polygon)) {
          isIsland = true;
          break;
        }
      }

      // Determine voxel height and position
      const blockHeight = elev;
      dummy.position.set(x, blockHeight / 2, z);
      dummy.scale.set(1, blockHeight, 1);
      dummy.updateMatrix();

      instancedMesh.setMatrixAt(terrainCount, dummy.matrix);

      // Determine voxel color based on topography & land use
      if (isIsland) {
        color.set('#a3b18a'); // Sand/vegetation island
      } else if (isPark) {
        color.set(elev > 2.5 ? '#386641' : '#4f772d'); // Lush park greens
      } else if (elev <= 1.2) {
        color.set('#d5bdaf'); // Costanera low stone / sand
      } else if (elev < 3.8) {
        color.set('#6b705c'); // Barranca cliff transition rock
      } else {
        color.set('#cbd5e1'); // Urban street asphalt / sidewalk base
      }

      instancedMesh.setColorAt(terrainCount, color);
      terrainCount++;

      // Place procedural urban filler buildings on urban plateau (Y = 4)
      if (elev >= 3.8 && !isPark && !isIsland) {
        // Exclude footprint of bespoke landmarks so generic cubes don't clip them
        const isNearLandmark = [
          { x: 6.6, z: -5.5, r: 14 },     // Catedral Metropolitana
          { x: -6.6, z: -10.0, r: 12 },   // Palacio Municipal
          { x: -9.5, z: 15.5, r: 12 },    // Teatro 3 de Febrero
          { x: -97.5, z: -128.6, r: 12 }, // Patito Sirirí
          { x: -50.2, z: -102.0, r: 12 }, // Monumento Urquiza
          { x: 25.6, z: -185.2, r: 18 },  // Sala Mayo
          { x: 241.4, z: -289.4, r: 16 }, // Túnel Subfluvial
          { x: 208.3, z: 118.6, r: 24 },  // Estadio Grella
        ].some(l => (x - l.x) * (x - l.x) + (z - l.z) * (z - l.z) < l.r * l.r);

        if (!isNearLandmark) {
          // Pseudo-random deterministic hash based on coordinates
          const hash = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
          const rand = hash - Math.floor(hash);

          if (rand > 0.35) {
            const bldgHeight = 2.0 + rand * 5.0; // 2 to 7 units tall
            dummy.position.set(x, elev + bldgHeight / 2, z);
            dummy.scale.set(1, bldgHeight, 1);
            dummy.updateMatrix();

            bldgMesh.setMatrixAt(bldgCount, dummy.matrix);

            const colorIdx = Math.floor(rand * bldgColors.length);
            color.set(bldgColors[colorIdx]);
            bldgMesh.setColorAt(bldgCount, color);
            bldgCount++;
          }
        }
      }
    }
  }

  instancedMesh.count = terrainCount;
  instancedMesh.instanceMatrix.needsUpdate = true;
  if (instancedMesh.instanceColor) instancedMesh.instanceColor.needsUpdate = true;
  scene.add(instancedMesh);

  if (bldgCount > 0) {
    bldgMesh.count = bldgCount;
    bldgMesh.instanceMatrix.needsUpdate = true;
    if (bldgMesh.instanceColor) bldgMesh.instanceColor.needsUpdate = true;
    scene.add(bldgMesh);
  }
}

/**
 * 2. Build Main Arteries (Avenues) as dark asphalt strips
 */
function buildArteries(scene: THREE.Scene, geoData: GeoFeatureData) {
  const roadMat = new THREE.MeshStandardMaterial({
    color: '#334155',
    roughness: 0.9,
    metalness: 0.1
  });

  geoData.arteries.forEach(artery => {
    if (!artery.coordinates || artery.coordinates.length < 2) return;

    for (let i = 0; i < artery.coordinates.length - 1; i++) {
      const [lat1, lng1] = artery.coordinates[i];
      const [lat2, lng2] = artery.coordinates[i + 1];

      const p1 = projectTo3D(lat1, lng1);
      const p2 = projectTo3D(lat2, lng2);
      const elev1 = getElevation(lat1, lng1);
      const elev2 = getElevation(lat2, lng2);

      const v1 = new THREE.Vector3(p1.x, elev1 + 0.08, p1.z);
      const v2 = new THREE.Vector3(p2.x, elev2 + 0.08, p2.z);

      const distance = v1.distanceTo(v2);
      const roadGeom = new THREE.BoxGeometry(4.0, 0.15, distance);
      const roadMesh = new THREE.Mesh(roadGeom, roadMat);

      // Position at midpoint
      roadMesh.position.copy(v1).add(v2).multiplyScalar(0.5);
      roadMesh.lookAt(v2);
      roadMesh.receiveShadow = true;
      scene.add(roadMesh);
    }
  });
}

/**
 * 3. Build Voxel Flora (Lapachos, Jacarandás, Sauces y Ceibos)
 */
function buildFlora(scene: THREE.Scene, geoData: GeoFeatureData) {
  const maxTrees = 1500;
  const trunkGeom = new THREE.BoxGeometry(0.5, 1.8, 0.5);
  const foliageGeom = new THREE.BoxGeometry(2.0, 2.0, 2.0);

  const trunkMat = new THREE.MeshStandardMaterial({ color: '#543d2b', roughness: 0.9 });
  const foliageMat = new THREE.MeshStandardMaterial({ roughness: 0.75, metalness: 0.05 });

  const trunkMesh = new THREE.InstancedMesh(trunkGeom, trunkMat, maxTrees);
  const foliageMesh = new THREE.InstancedMesh(foliageGeom, foliageMat, maxTrees);
  trunkMesh.castShadow = true;
  foliageMesh.castShadow = true;

  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  let treeCount = 0;

  // Tree foliage color palette
  const floraColors = [
    '#ec4899', // Lapacho rosado
    '#f472b6', // Lapacho rosa claro
    '#a855f7', // Jacarandá violeta
    '#c084fc', // Jacarandá lila
    '#84cc16', // Sauce costeño
    '#ef4444'  // Flor del Ceibo
  ];

  // Distribute trees in parks, along costanera and boulevards
  geoData.parks.forEach(park => {
    const isUrquiza = park.name.toLowerCase().includes('urquiza');
    const parkTreeTarget = isUrquiza ? 450 : 150;

    // Approximate bounding box of park polygon
    let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
    park.polygon.forEach(([lat, lng]) => {
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
    });

    for (let i = 0; i < parkTreeTarget * 2 && treeCount < maxTrees; i++) {
      const lat = minLat + Math.random() * (maxLat - minLat);
      const lng = minLng + Math.random() * (maxLng - minLng);

      if (isPointInPolygon([lat, lng], park.polygon)) {
        const { x, z } = projectTo3D(lat, lng);
        const elev = getElevation(lat, lng);

        // Trunk
        dummy.position.set(x, elev + 0.9, z);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        trunkMesh.setMatrixAt(treeCount, dummy.matrix);

        // Foliage
        dummy.position.set(x, elev + 2.4, z);
        dummy.scale.set(0.9 + Math.random() * 0.4, 0.9 + Math.random() * 0.4, 0.9 + Math.random() * 0.4);
        dummy.updateMatrix();
        foliageMesh.setMatrixAt(treeCount, dummy.matrix);

        // Assign flora color
        const colorHex = floraColors[Math.floor(Math.random() * floraColors.length)];
        color.set(colorHex);
        foliageMesh.setColorAt(treeCount, color);

        treeCount++;
      }
    }
  });

  trunkMesh.count = treeCount;
  foliageMesh.count = treeCount;
  trunkMesh.instanceMatrix.needsUpdate = true;
  foliageMesh.instanceMatrix.needsUpdate = true;
  if (foliageMesh.instanceColor) foliageMesh.instanceColor.needsUpdate = true;

  scene.add(trunkMesh);
  scene.add(foliageMesh);
}

/**
 * 4. Build Place Pins for Iconic Places & Easter Eggs
 */
function buildPlacePins(
  pinGroup: THREE.Group,
  pinSprites: { sprite: THREE.Sprite; place: Place; index: number; basePos: THREE.Vector3 }[]
) {
  const pinStemMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.65 });
  const ringMat = new THREE.MeshBasicMaterial({ color: '#fbbf24', transparent: true, opacity: 0.5, side: THREE.DoubleSide });
  const ringGeom = new THREE.RingGeometry(0.8, 1.4, 16);

  PLACES.forEach((place, index) => {
    let { x, z } = projectTo3D(place.coordinates.lat, place.coordinates.lng);
    let elev = getElevation(place.coordinates.lat, place.coordinates.lng);
    let colorHex = PLACE_CATEGORIES[place.category]?.color || '#f59e0b';
    let pinHeight = 3.6;

    // Custom heights for tall bespoke landmarks to avoid clipping
    if (place.id === 'catedral_metropolitana') {
      pinHeight = 17.5;
    } else if (place.id === 'palacio_municipal') {
      pinHeight = 22.0;
    } else if (place.id === 'teatro_3_febrero') {
      pinHeight = 11.5;
    } else if (place.id === 'monumento_urquiza') {
      pinHeight = 12.0;
    } else if (place.id === 'estadio_patronato') {
      pinHeight = 11.5;
    } else if (place.id === 'easter_egg_mate_gigante') {
      // Under the diorama slab
      x = 0;
      z = 0;
      elev = -11.0;
      pinHeight = 0;
      colorHex = '#eab308';
    } else if (place.id === 'easter_egg_dorado_gigante') {
      x = -170;
      z = -140;
      elev = 0.4;
      pinHeight = 3.5;
      colorHex = '#f59e0b';
    }

    // 1. Slender anchor line from ground up to floating pin
    if (place.id !== 'easter_egg_mate_gigante') {
      const stemGeom = new THREE.CylinderGeometry(0.08, 0.08, pinHeight, 6);
      const stemMesh = new THREE.Mesh(stemGeom, pinStemMat);
      stemMesh.position.set(x, elev + pinHeight / 2, z);
      pinGroup.add(stemMesh);

      // 2. Glowing ground ring
      const ringMesh = new THREE.Mesh(ringGeom, ringMat);
      ringMesh.rotation.x = -Math.PI / 2;
      ringMesh.position.set(x, elev + 0.08, z);
      pinGroup.add(ringMesh);
    }

    // 3. Floating numeric or star badge (Sprite)
    let numberStr = String(index + 1).padStart(2, '0');
    if (place.id === 'easter_egg_mate_gigante') numberStr = '★';
    if (place.id === 'easter_egg_dorado_gigante') numberStr = '★';

    const badgeTexture = createPinBadgeTexture(numberStr, colorHex);
    const spriteMat = new THREE.SpriteMaterial({
      map: badgeTexture,
      transparent: true,
      depthTest: true
    });

    const sprite = new THREE.Sprite(spriteMat);
    const basePos = new THREE.Vector3(x, elev + pinHeight + 1.2, z);
    sprite.position.copy(basePos);
    sprite.scale.set(6.5, 6.5, 1);

    pinGroup.add(sprite);

    pinSprites.push({
      sprite,
      place,
      index,
      basePos
    });
  });
}

/**
 * 5. Build Bespoke Voxel Landmarks and Easter Eggs
 */
function buildBespokeLandmarks(scene: THREE.Scene) {
  // 1. Catedral Metropolitana
  const catedral = buildCatedral();
  catedral.position.set(6.6, 4.0, -5.5);
  scene.add(catedral);

  // 2. Palacio Municipal
  const palacio = buildPalacioMunicipal();
  palacio.position.set(-6.6, 4.0, -10.0);
  scene.add(palacio);

  // 3. Teatro Municipal 3 de Febrero
  const teatro = buildTeatro3DeFebrero();
  teatro.position.set(-9.5, 4.0, 15.5);
  scene.add(teatro);

  // 4. El Patito Sirirí
  const patito = buildPatitoSiriri();
  patito.position.set(-97.5, 3.5, -128.6);
  scene.add(patito);

  // 5. Monumento al Gral. Justo José de Urquiza
  const monumentoUrquiza = buildMonumentoUrquiza();
  monumentoUrquiza.position.set(-50.2, 3.5, -102.0);
  scene.add(monumentoUrquiza);

  // 6. Sala Mayo y Puerto Nuevo
  const salaMayo = buildSalaMayo();
  salaMayo.position.set(25.6, 1.0, -185.2);
  scene.add(salaMayo);

  // 7. Complejo del Túnel Subfluvial Hernandarias
  const tunel = buildTunelSubfluvial();
  tunel.position.set(241.4, 1.0, -289.4);
  scene.add(tunel);

  // 8. Estadio Presbítero Bartolomé Grella (Club Atlético Patronato)
  const estadio = buildEstadioGrella();
  estadio.position.set(208.3, 4.0, 118.6);
  scene.add(estadio);

  // 9. Easter Egg 1: El Gran Mate Cósmico debajo de la maqueta
  const mate = buildEasterEggMate();
  mate.position.set(0, -26.0, 0);
  scene.add(mate);

  // 10. Easter Egg 2: El Dorado Mítico en el Río Paraná
  const dorado = buildEasterEggDorado();
  dorado.position.set(-170.0, 0.4, -140.0);
  scene.add(dorado);

  return { dorado };
}
