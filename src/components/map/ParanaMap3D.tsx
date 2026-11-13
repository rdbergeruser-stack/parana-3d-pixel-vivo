'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
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
  Eye
} from 'lucide-react';

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

  // UI state
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [hoveredPlace, setHoveredPlace] = useState<Place | null>(null);
  const [activeCategory, setActiveCategory] = useState<PlaceCategory | 'todas'>('todas');
  const [activeRoute, setActiveRoute] = useState<TourRoute | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

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
  } | null>(null);

  // Fly camera to specific 3D location smoothly
  const flyToPlace = useCallback((place: Place) => {
    if (!engineRef.current) return;
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
    controls.maxPolarAngle = Math.PI / 2 + 0.08; // Allow slight peek below the diorama rim
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
      flyCameraTarget: null
    };

    // 6. Load OSM Geo Data & Build Terrain + Flora + Arteries
    fetch('/data/parana-geo.json')
      .then(res => res.json())
      .then((geoData: GeoFeatureData) => {
        if (isDisposed) return;

        buildVoxelTerrain(scene, geoData);
        buildArteries(scene, geoData);
        buildFlora(scene, geoData);
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

      {/* Top Bar: Brand, Category Filter Pills & Routes Button */}
      <div className="absolute top-4 left-4 right-4 flex flex-wrap items-center justify-between gap-3 pointer-events-none z-20">
        {/* Brand Pill */}
        <div className="flex items-center gap-2.5 bg-slate-900/90 backdrop-blur-md border border-slate-800 text-white px-3.5 py-2 rounded-2xl shadow-xl pointer-events-auto">
          <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold text-sm">
            P
          </div>
          <div>
            <h1 className="text-sm font-bold leading-tight">Paraná Pixelado</h1>
            <p className="text-[10px] text-slate-400 leading-none">Entre Ríos, Argentina</p>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 bg-slate-900/85 backdrop-blur-md border border-slate-800/80 p-1.5 rounded-2xl shadow-xl pointer-events-auto overflow-x-auto max-w-full">
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
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  isCatActive
                    ? 'text-white font-semibold shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
                style={{
                  backgroundColor: isCatActive ? cat.color : undefined
                }}
              >
                <span>{cat.name}</span>
                <span className="text-[10px] opacity-75">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Routes Dropdown Pill */}
        <div className="pointer-events-auto">
          <div className="relative group">
            <button
              className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-medium shadow-xl border backdrop-blur-md transition-all ${
                activeRoute
                  ? 'bg-emerald-600 text-white border-emerald-500'
                  : 'bg-slate-900/90 text-slate-200 border-slate-800 hover:bg-slate-800'
              }`}
            >
              <Navigation className="w-3.5 h-3.5 text-amber-400" />
              <span>{activeRoute ? activeRoute.name : 'Recorridos Turísticos'}</span>
            </button>

            {/* Dropdown Menu */}
            <div className="absolute right-0 top-full mt-2 w-72 bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-2xl p-2 shadow-2xl hidden group-hover:block transition-all z-30">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2 py-1 mb-1">
                Circuitos Curados
              </div>
              {activeRoute && (
                <button
                  onClick={() => setActiveRoute(null)}
                  className="w-full text-left px-2.5 py-2 rounded-xl text-xs text-rose-400 hover:bg-rose-500/10 flex items-center justify-between mb-1"
                >
                  <span>Desactivar recorrido</span>
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              {ROUTES.map(route => (
                <button
                  key={route.id}
                  onClick={() => setActiveRoute(route)}
                  className={`w-full text-left px-2.5 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                    activeRoute?.id === route.id
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <div>
                    <div className="font-medium text-slate-100">{route.name}</div>
                    <div className="text-[10px] text-slate-400">{route.places.length} paradas • {route.duration}</div>
                  </div>
                  {activeRoute?.id === route.id && <Check className="w-4 h-4 text-amber-400" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Hover Tooltip */}
      {hoveredPlace && !selectedPlace && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 pointer-events-none z-20 animate-fade-in">
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

      {/* Camera Navigation Control Bar (Bottom-Left) */}
      <div className="absolute bottom-6 left-6 z-20 flex flex-col gap-2">
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

        {/* Small Navigation Hint */}
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
        <div className="absolute bottom-6 right-6 max-w-sm w-full z-30 animate-in slide-in-from-bottom duration-300">
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
            <div className="pt-1 flex items-center gap-2">
              <button
                onClick={() => flyToPlace(selectedPlace)}
                className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shadow-lg"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Centrar Vista</span>
              </button>
            </div>
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
 * 4. Build Place Pins for the 35 Iconic Places
 */
function buildPlacePins(
  pinGroup: THREE.Group,
  pinSprites: { sprite: THREE.Sprite; place: Place; index: number; basePos: THREE.Vector3 }[]
) {
  const pinStemMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.65 });
  const ringMat = new THREE.MeshBasicMaterial({ color: '#fbbf24', transparent: true, opacity: 0.5, side: THREE.DoubleSide });
  const ringGeom = new THREE.RingGeometry(0.8, 1.4, 16);

  PLACES.forEach((place, index) => {
    const { x, z } = projectTo3D(place.coordinates.lat, place.coordinates.lng);
    const elev = getElevation(place.coordinates.lat, place.coordinates.lng);
    const colorHex = PLACE_CATEGORIES[place.category]?.color || '#f59e0b';

    // 1. Slender anchor line from ground up to floating pin
    const stemGeom = new THREE.CylinderGeometry(0.08, 0.08, 3.2, 6);
    const stemMesh = new THREE.Mesh(stemGeom, pinStemMat);
    stemMesh.position.set(x, elev + 1.6, z);
    pinGroup.add(stemMesh);

    // 2. Glowing ground ring
    const ringMesh = new THREE.Mesh(ringGeom, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.set(x, elev + 0.08, z);
    pinGroup.add(ringMesh);

    // 3. Floating numeric circular badge (Sprite)
    const numberStr = String(index + 1).padStart(2, '0');
    const badgeTexture = createPinBadgeTexture(numberStr, colorHex);
    const spriteMat = new THREE.SpriteMaterial({
      map: badgeTexture,
      transparent: true,
      depthTest: true
    });

    const sprite = new THREE.Sprite(spriteMat);
    const basePos = new THREE.Vector3(x, elev + 3.4, z);
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
