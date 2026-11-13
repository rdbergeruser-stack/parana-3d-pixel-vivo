'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PLACES, PLACE_CATEGORIES, Place, PlaceCategory } from '@/data/places';
import { ROUTES, TourRoute } from '@/data/routes';
import { projectTo3D, getElevation, PARANA_ORIGIN, isLand, isWater } from '@/lib/geo';
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
  EyeOff,
  Search,
  ExternalLink,
  MessageSquare,
  Send,
  CheckCircle2,
  BookOpen,
  Route as RouteIcon
} from 'lucide-react';
import { buildModelForPlace } from './VoxelLandmarks';

interface GeoFeatureData {
  coastline: [number, number][];
  islands: { name: string; polygon: [number, number][] }[];
  arteries: { name: string; category: string; coordinates: [number, number][] }[];
  parks: { name: string; polygon: [number, number][] }[];
  railways?: { id: string; name: string; coordinates: [number, number][] }[];
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

// Create a high-res minimalist circular badge texture for place pins (delicate ~20px diorama look)
function createPinBadgeTexture(numberStr: string, colorHex: string): THREE.CanvasTexture {
  const size = 96;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, size, size);

  // Soft subtle shadow
  ctx.shadowColor = 'rgba(28, 25, 23, 0.28)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 3;

  // Background circle
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 8, 0, Math.PI * 2);
  ctx.fillStyle = colorHex;
  ctx.fill();

  // Crisp fine white border (equivalent to 1.5px on screen)
  ctx.shadowColor = 'transparent';
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();

  // Monospace bold text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px "JetBrains Mono", "SF Mono", monospace, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(numberStr, size / 2, size / 2 + 1);

  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  return texture;
}

// Helper to determine the physical height of each building model
function getBuildingHeight(placeId: string): number {
  switch (placeId) {
    case 'palacio_municipal': return 21.0;
    case 'catedral_metropolitana': return 17.5;
    case 'casa_de_gobierno': return 17.0;
    case 'la_vieja_usina': return 18.5;
    case 'teatro_3_febrero': return 12.0;
    case 'estacion_ferrocarril': return 9.5;
    case 'centro_cultural_juanele': return 8.5;
    case 'estadio_patronato': return 11.5;
    case 'escuela_normal': return 10.5;
    case 'colegio_del_huerto': return 10.5;
    case 'monumento_urquiza': return 11.0;
    case 'patito_siriri': return 8.0;
    case 'sala_mayo': return 8.5;
    case 'tunel_subfluvial': return 7.5;
    case 'letras_parana': return 4.5;
    case 'monumento_al_mate': return 4.5;
    case 'puerto_sanchez': return 5.0;
    case 'balneario_municipal':
    case 'balneario_thompson':
    case 'bajada_grande': return 5.5;
    case 'plaza_1_de_mayo':
    case 'plaza_alvear':
    case 'parque_urquiza':
    case 'parque_nuevo':
    case 'parque_gazzano': return 5.0;
    default: return 6.5;
  }
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
  const [showPins, setShowPins] = useState(true);

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
    isAnimatingCamera: boolean;
    animStartTime: number;
    animDuration: number;
    startCameraPos: THREE.Vector3;
    endCameraPos: THREE.Vector3;
    startControlsTarget: THREE.Vector3;
    endControlsTarget: THREE.Vector3;
    doradoMesh: THREE.Group | null;
  } | null>(null);

  // Fly camera to specific 3D location smoothly with time-based cubic ease-out
  const flyToPlace = useCallback((place: Place) => {
    if (!engineRef.current) return;
    const { camera, controls } = engineRef.current;

    const targetPos = new THREE.Vector3();
    const cameraPos = new THREE.Vector3();

    if (place.id === 'easter_egg_mate_gigante') {
      targetPos.set(0, -18, 0);
      cameraPos.set(45, -34, 45);
    } else if (place.id === 'easter_egg_dorado_gigante') {
      targetPos.set(-170, 0.4, -140);
      cameraPos.set(-120, 35, -95);
    } else {
      const { x, z } = projectTo3D(place.coordinates.lat, place.coordinates.lng);
      const elev = getElevation(place.coordinates.lat, place.coordinates.lng);
      targetPos.set(x, elev, z);
      const offset = new THREE.Vector3(75, 85, 75);
      cameraPos.copy(targetPos).add(offset);
    }

    engineRef.current.startControlsTarget.copy(controls.target);
    engineRef.current.endControlsTarget.copy(targetPos);
    engineRef.current.startCameraPos.copy(camera.position);
    engineRef.current.endCameraPos.copy(cameraPos);
    engineRef.current.animStartTime = performance.now();
    engineRef.current.animDuration = 900;
    engineRef.current.isAnimatingCamera = true;

    setSelectedPlace(place);
  }, []);

  // Reset camera view to Plaza 1° de Mayo center
  const resetCameraView = useCallback(() => {
    if (!engineRef.current) return;
    const { camera, controls } = engineRef.current;

    engineRef.current.startControlsTarget.copy(controls.target);
    engineRef.current.endControlsTarget.set(0, 8.5, 0);
    engineRef.current.startCameraPos.copy(camera.position);
    engineRef.current.endCameraPos.set(190, 240, 190);
    engineRef.current.animStartTime = performance.now();
    engineRef.current.animDuration = 900;
    engineRef.current.isAnimatingCamera = true;

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
    scene.background = new THREE.Color('#f3ede2');
    scene.fog = new THREE.FogExp2('#f3ede2', 0.0015);

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
    controls.target.set(0, 8.5, 0); // Plaza 1° de Mayo (Urban Plateau Y = 8.5)
    controls.minDistance = 10;
    controls.maxDistance = 650;
    controls.maxPolarAngle = Math.PI * 0.72; // Allow tilting below horizon to view under the diorama
    controls.minPolarAngle = 0.05;

    // Immediately stop any auto-camera flying animation on manual user control/interaction
    const cancelCameraAnimation = () => {
      if (engineRef.current && engineRef.current.isAnimatingCamera) {
        engineRef.current.isAnimatingCamera = false;
      }
    };
    controls.addEventListener('start', cancelCameraAnimation);
    renderer.domElement.addEventListener('wheel', cancelCameraAnimation, { passive: true });
    renderer.domElement.addEventListener('pointerdown', cancelCameraAnimation);
    renderer.domElement.addEventListener('touchstart', cancelCameraAnimation, { passive: true });

    // 3. Warm Litoral Diorama Lighting (Warm sunny afternoon over the Paraná river)
    const ambientLight = new THREE.HemisphereLight('#fff7ed', '#d6c7b2', 0.85);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight('#fff1d6', 1.6);
    sunLight.position.set(190, 260, 130);
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

    // River bounce / ambient fill light (subtle sky blue warmth)
    const riverBounceLight = new THREE.DirectionalLight('#bae6fd', 0.3);
    riverBounceLight.position.set(-180, 90, -140);
    scene.add(riverBounceLight);

    // 4. Artisanal Diorama Cutout Base (Layered physical geological strata)
    const baseGroup = new THREE.Group();

    // Layer 1: Barranca Clay Stratum (y = -3 to 0)
    const stratum1Geom = new THREE.BoxGeometry(684, 4, 564);
    const stratum1Mat = new THREE.MeshStandardMaterial({
      color: '#b58d67', // Earthy clay
      roughness: 0.9,
      metalness: 0.05
    });
    const stratum1Mesh = new THREE.Mesh(stratum1Geom, stratum1Mat);
    stratum1Mesh.position.set(30, -2.0, 10);
    stratum1Mesh.receiveShadow = true;
    baseGroup.add(stratum1Mesh);

    // Layer 2: Deep Geological Rock / Sedimentary Stratum (y = -10 to -3)
    const stratum2Geom = new THREE.BoxGeometry(682, 7, 562);
    const stratum2Mat = new THREE.MeshStandardMaterial({
      color: '#785942', // Deep earth / rock
      roughness: 0.95,
      metalness: 0.05
    });
    const stratum2Mesh = new THREE.Mesh(stratum2Geom, stratum2Mat);
    stratum2Mesh.position.set(30, -7.5, 10);
    stratum2Mesh.receiveShadow = true;
    baseGroup.add(stratum2Mesh);

    // Layer 3: Craftsman Charcoal Plinth Pedestal (y = -22 to -10)
    const plinthGeom = new THREE.BoxGeometry(690, 12, 570);
    const plinthMat = new THREE.MeshStandardMaterial({
      color: '#292524', // Warm charcoal craftsman timber
      roughness: 0.85,
      metalness: 0.15
    });
    const plinthMesh = new THREE.Mesh(plinthGeom, plinthMat);
    plinthMesh.position.set(30, -17.0, 10);
    plinthMesh.receiveShadow = true;
    baseGroup.add(plinthMesh);

    scene.add(baseGroup);

    // 5. River Water Plane (Y = 0) with gentle pastel blue-green and foam rim
    const waterGeom = new THREE.PlaneGeometry(900, 750, 64, 64);
    const waterMat = new THREE.MeshStandardMaterial({
      color: '#3b82a6',
      roughness: 0.22,
      metalness: 0.15,
      transparent: true,
      opacity: 0.92
    });
    const waterMesh = new THREE.Mesh(waterGeom, waterMat);
    waterMesh.rotation.x = -Math.PI / 2;
    waterMesh.position.set(-100, 0.06, 0);
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
      isAnimatingCamera: false,
      animStartTime: 0,
      animDuration: 900,
      startCameraPos: new THREE.Vector3(),
      endCameraPos: new THREE.Vector3(),
      startControlsTarget: new THREE.Vector3(),
      endControlsTarget: new THREE.Vector3(),
      doradoMesh: null
    };

    // 6. Load OSM Geo Data & Build Terrain + Flora + Arteries + Railways + All 40 Place Models
    fetch('/data/parana-geo.json')
      .then(res => res.json())
      .then((geoData: GeoFeatureData) => {
        if (isDisposed) return;

        const { dorado, exclusions } = buildAllPlaceLandmarks(scene);
        if (engineRef.current) {
          engineRef.current.doradoMesh = dorado;
        }

        buildVoxelTerrain(scene, geoData, exclusions);
        buildArteries(scene, geoData);
        buildRailways(scene, geoData);
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
          return;
        }
      }

      setHoveredPlace(null);
      renderer.domElement.style.cursor = 'default';
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

      // Smooth time-based camera flying with cubic ease-out
      if (engineRef.current?.isAnimatingCamera) {
        const elapsed = performance.now() - engineRef.current.animStartTime;
        const progress = Math.min(1, Math.max(0, elapsed / engineRef.current.animDuration));
        const ease = 1 - Math.pow(1 - progress, 3);

        controls.target.lerpVectors(
          engineRef.current.startControlsTarget,
          engineRef.current.endControlsTarget,
          ease
        );
        camera.position.lerpVectors(
          engineRef.current.startCameraPos,
          engineRef.current.endCameraPos,
          ease
        );

        if (progress >= 1 || camera.position.distanceTo(engineRef.current.endCameraPos) < 0.1) {
          controls.target.copy(engineRef.current.endControlsTarget);
          camera.position.copy(engineRef.current.endCameraPos);
          engineRef.current.isAnimatingCamera = false;
        }
      }

      controls.update();

      // Dynamic zoom-based pin scaling & hover animation
      const camDist = camera.position.distanceTo(controls.target);
      const zoomFactor = THREE.MathUtils.clamp(1.12 - (camDist - 100) / 450, 0.72, 1.15);

      pinSprites.forEach(p => {
        const isSel = selectedPlace?.id === p.place.id;
        const isHov = hoveredPlace?.id === p.place.id;
        const hoverScale = isSel || isHov ? 1.35 : 1.0;
        const currentScale = 2.6 * zoomFactor * hoverScale;
        p.sprite.scale.set(currentScale, currentScale, 1);

        const bobOffset = isSel || isHov ? Math.sin(elapsedTime * 4 + p.index) * 0.25 : 0;
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
      controls.removeEventListener('start', cancelCameraAnimation);
      renderer.domElement.removeEventListener('wheel', cancelCameraAnimation);
      renderer.domElement.removeEventListener('pointerdown', cancelCameraAnimation);
      renderer.domElement.removeEventListener('touchstart', cancelCameraAnimation);
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

  // Toggle entire pin markers group on/off
  useEffect(() => {
    if (!engineRef.current) return;
    engineRef.current.pinGroup.visible = showPins;
  }, [showPins]);

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
    <div className="relative w-full h-screen overflow-hidden select-none bg-[#f3ede2] font-sans">
      {/* 3D WebGL Canvas Container */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Loading Overlay */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-[#f3ede2]/90 backdrop-blur-md flex flex-col items-center justify-center z-50 text-[#1c1917] space-y-3">
          <div className="w-10 h-10 border-3 border-[#c2410c] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold tracking-wider text-[#78716c] uppercase">
            Construyendo Terreno Voxel y Maqueta 3D de Paraná...
          </p>
        </div>
      )}

      {/* Top Floating Control Bar */}
      <div className="absolute top-4 left-4 right-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pointer-events-none z-20">
        {/* Left Section: Brand & Real-time Search */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Brand Pill */}
          <div className="flex items-center gap-2.5 bg-[#faf6f0]/95 backdrop-blur-md border border-[#e2d9c8] text-[#1c1917] px-3.5 py-2 rounded-2xl shadow-sm">
            <div className="w-7 h-7 rounded-lg bg-[#c2410c]/15 text-[#c2410c] border border-[#c2410c]/30 flex items-center justify-center font-bold text-sm">
              P
            </div>
            <div>
              <h1 className="text-sm font-bold leading-tight text-[#1c1917]">Paraná Pixelado</h1>
              <p className="text-[10px] text-[#78716c] leading-none">Entre Ríos, Argentina</p>
            </div>
          </div>

          {/* Real-time Search Input */}
          <div className="relative flex-1 md:w-64">
            <div className="flex items-center gap-2 bg-[#faf6f0]/95 backdrop-blur-md border border-[#e2d9c8] px-3 py-2 rounded-2xl shadow-sm text-[#1c1917]">
              <Search className="w-3.5 h-3.5 text-[#78716c] shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                placeholder="Buscar lugar o barrio..."
                className="bg-transparent border-none outline-none text-xs text-[#1c1917] placeholder-[#a8a29e] w-full"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="p-0.5 text-[#78716c] hover:text-[#1c1917]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Search Results Dropdown */}
            {isSearchFocused && searchResults.length > 0 && (
              <div
                onMouseLeave={() => setIsSearchFocused(false)}
                className="absolute left-0 right-0 top-full mt-1.5 bg-[#faf6f0]/98 backdrop-blur-xl border border-[#e2d9c8] rounded-2xl p-1.5 shadow-xl z-30 max-h-72 overflow-y-auto space-y-1"
              >
                {searchResults.map(place => (
                  <button
                    key={place.id}
                    onClick={() => {
                      flyToPlace(place);
                      setIsSearchFocused(false);
                      setSearchQuery('');
                    }}
                    className="w-full text-left p-2 rounded-xl text-xs hover:bg-[#ede3d4] transition-colors flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-[#1c1917] flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: PLACE_CATEGORIES[place.category].color }}
                        />
                        <span>{place.name}</span>
                      </div>
                      <div className="text-[10px] text-[#78716c] truncate max-w-[200px]">
                        {place.zone} • {place.subtitle}
                      </div>
                    </div>
                    <Compass className="w-3.5 h-3.5 text-[#c2410c] shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Center: Category Filter Pills */}
        <div className="flex items-center gap-1 bg-[#faf6f0]/95 backdrop-blur-md border border-[#e2d9c8] p-1.5 rounded-2xl shadow-sm pointer-events-auto overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveCategory('todas')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              activeCategory === 'todas'
                ? 'bg-[#1c1917] text-[#faf6f0] font-semibold shadow-sm'
                : 'text-[#78716c] hover:text-[#1c1917] hover:bg-[#ede3d4]'
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
                    : 'text-[#78716c] hover:text-[#1c1917] hover:bg-[#ede3d4]'
                }`}
                style={{
                  backgroundColor: isCatActive ? cat.color : undefined
                }}
              >
                <span>{cat.name}</span>
                <span className="text-[10px] opacity-80 font-mono">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Right Section: Routes Dropdown, Numbers Toggle & SSG Catalog Link */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Numbers Toggle Button */}
          <button
            onClick={() => setShowPins(!showPins)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-medium bg-[#faf6f0]/95 text-[#1c1917] border border-[#e2d9c8] hover:bg-[#ede3d4] transition-colors shadow-sm"
            title={showPins ? 'Ocultar números de lugares' : 'Ver números de lugares'}
          >
            {showPins ? <EyeOff className="w-3.5 h-3.5 text-[#78716c]" /> : <Eye className="w-3.5 h-3.5 text-[#c2410c]" />}
            <span className="hidden sm:inline">{showPins ? 'Ocultar números' : 'Ver números'}</span>
          </button>

          {/* Catalog Link */}
          <Link
            href="/lugares"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-medium bg-[#faf6f0]/95 text-[#1c1917] border border-[#e2d9c8] hover:bg-[#ede3d4] transition-colors shadow-sm"
          >
            <BookOpen className="w-3.5 h-3.5 text-[#c2410c]" />
            <span>Catálogo</span>
          </Link>

          {/* Routes Dropdown */}
          <div className="relative group">
            <button
              className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-medium shadow-sm border backdrop-blur-md transition-all ${
                activeRoute
                  ? 'bg-[#15803d] text-white border-[#15803d] font-semibold'
                  : 'bg-[#faf6f0]/95 text-[#1c1917] border-[#e2d9c8] hover:bg-[#ede3d4]'
              }`}
            >
              <Navigation className="w-3.5 h-3.5 text-[#c2410c]" />
              <span>{activeRoute ? activeRoute.name : 'Recorridos'}</span>
            </button>

            {/* Dropdown Menu */}
            <div className="absolute right-0 top-full mt-2 w-72 bg-[#faf6f0]/98 backdrop-blur-xl border border-[#e2d9c8] rounded-2xl p-2 shadow-xl hidden group-hover:block transition-all z-30">
              <div className="text-[11px] font-semibold text-[#78716c] uppercase tracking-wider px-2 py-1 mb-1">
                Circuitos Curados
              </div>
              {activeRoute && (
                <button
                  onClick={() => {
                    setActiveRoute(null);
                    setActiveRouteStep(0);
                  }}
                  className="w-full text-left px-2.5 py-2 rounded-xl text-xs text-rose-700 hover:bg-rose-50 flex items-center justify-between mb-1"
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
                      ? 'bg-[#c2410c]/10 text-[#c2410c] border border-[#c2410c]/25'
                      : 'text-[#1c1917] hover:bg-[#ede3d4]'
                  }`}
                >
                  <div>
                    <div className="font-semibold text-[#1c1917]">{route.name}</div>
                    <div className="text-[10px] text-[#78716c] font-mono">
                      {route.places.length} paradas • {route.distance} • {route.duration}
                    </div>
                  </div>
                  {activeRoute?.id === route.id && <Check className="w-4 h-4 text-[#c2410c]" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Active Route Step-by-Step Bottom Floating Bar */}
      {activeRoute && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 w-full max-w-lg px-4 pointer-events-auto animate-in slide-in-from-top duration-300">
          <div className="bg-[#faf6f0]/98 backdrop-blur-xl border border-[#15803d]/40 rounded-2xl p-3 shadow-xl text-[#1c1917] flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="space-y-0.5 text-left w-full sm:w-auto">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#15803d] animate-pulse" />
                <span className="text-xs font-bold text-[#1c1917]">{activeRoute.name}</span>
                <span className="text-[10px] text-[#15803d] font-mono px-2 py-0.5 rounded bg-[#15803d]/10 border border-[#15803d]/20 font-bold">
                  Parada {activeRouteStep + 1} de {activeRoute.places.length}
                </span>
              </div>
              <p className="text-[11px] text-[#78716c]">
                Transporte: <span className="text-[#1c1917] font-semibold">{activeRoute.transport}</span> ({activeRoute.distance} • {activeRoute.duration})
              </p>
            </div>

            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              <button
                onClick={() => handleRouteStep('prev')}
                className="px-2.5 py-1.5 rounded-xl bg-[#ede3d4] hover:bg-[#e4d6c2] text-xs font-medium flex items-center gap-1 text-[#1c1917]"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Anterior</span>
              </button>
              <button
                onClick={() => handleRouteStep('next')}
                className="px-2.5 py-1.5 rounded-xl bg-[#15803d] hover:bg-[#166534] text-xs font-bold flex items-center gap-1 text-white shadow"
              >
                <span className="hidden sm:inline">Siguiente</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setActiveRoute(null)}
                className="p-1.5 rounded-xl text-[#78716c] hover:text-[#1c1917] hover:bg-[#ede3d4]"
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
          <div className="bg-[#faf6f0]/95 backdrop-blur-md border border-[#e2d9c8] px-3.5 py-1.5 rounded-xl shadow-lg flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: PLACE_CATEGORIES[hoveredPlace.category].color }}
            />
            <span className="text-xs font-bold text-[#1c1917]">{hoveredPlace.name}</span>
            <span className="text-[10px] text-[#78716c]">({hoveredPlace.zone})</span>
          </div>
        </div>
      )}

      {/* Camera Navigation Control Bar & Collaboration Button (Bottom-Left) */}
      <div className="absolute bottom-6 left-6 z-20 flex flex-col gap-2 pointer-events-auto">
        <div className="flex items-center gap-2">
          {/* Zoom & Reset Controls */}
          <div className="bg-[#faf6f0]/95 backdrop-blur-md border border-[#e2d9c8] p-1.5 rounded-2xl shadow-sm flex items-center gap-1">
            <button
              onClick={resetCameraView}
              title="Centrar en Plaza 1° de Mayo"
              className="p-2 rounded-xl text-[#78716c] hover:text-[#1c1917] hover:bg-[#ede3d4] transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <div className="w-[1px] h-5 bg-[#e2d9c8]" />
            <button
              onClick={() => handleZoom('in')}
              title="Acercar (Zoom +)"
              className="p-2 rounded-xl text-[#78716c] hover:text-[#1c1917] hover:bg-[#ede3d4] transition-colors"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleZoom('out')}
              title="Alejar (Zoom -)"
              className="p-2 rounded-xl text-[#78716c] hover:text-[#1c1917] hover:bg-[#ede3d4] transition-colors"
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
            className="bg-[#faf6f0]/95 backdrop-blur-md border border-[#e2d9c8] hover:border-[#c2410c]/40 text-[#1c1917] hover:text-[#c2410c] px-3.5 py-2.5 rounded-2xl shadow-sm text-xs font-medium flex items-center gap-2 transition-all"
          >
            <MessageSquare className="w-3.5 h-3.5 text-[#c2410c]" />
            <span className="hidden sm:inline">¿Algo está mal o falta? Avisanos</span>
            <span className="sm:hidden">Avisanos</span>
          </button>
        </div>

        {/* Navigation Hint */}
        <div className="text-[10px] text-[#78716c] bg-[#faf6f0]/90 backdrop-blur px-2.5 py-1 rounded-lg border border-[#e2d9c8] inline-flex items-center gap-1.5 shadow-sm">
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
          <div className="bg-[#faf6f0]/98 backdrop-blur-xl border border-[#e2d9c8] rounded-2xl p-5 shadow-2xl text-[#1c1917] space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#1c1917]/5 border border-[#e2d9c8] text-[#1c1917]">
                    {String(PLACES.findIndex(p => p.id === selectedPlace.id) + 1).padStart(2, '0')}
                  </span>
                  <span
                    className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: `${PLACE_CATEGORIES[selectedPlace.category].color}18`,
                      color: PLACE_CATEGORIES[selectedPlace.category].color
                    }}
                  >
                    {PLACE_CATEGORIES[selectedPlace.category].name}
                  </span>
                </div>
                <h3 className="text-base font-bold text-[#1c1917] leading-tight">
                  {selectedPlace.name}
                </h3>
                <p className="text-xs text-[#c2410c] font-semibold">{selectedPlace.subtitle}</p>
              </div>
              <button
                onClick={() => setSelectedPlace(null)}
                className="p-1 rounded-lg text-[#78716c] hover:text-[#1c1917] hover:bg-[#ede3d4] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Metadata Badges */}
            <div className="flex items-center gap-2 text-[11px] text-[#78716c]">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-[#78716c]" />
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
            <p className="text-xs text-[#44403c] leading-relaxed">
              {selectedPlace.description}
            </p>

            {/* Curiosity Note */}
            {selectedPlace.curiosity && (
              <div className="bg-[#fffbeb] border border-[#fef3c7] rounded-xl p-2.5 text-xs text-[#92400e] flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-[#b45309] shrink-0 mt-0.5" />
                <p className="leading-snug">{selectedPlace.curiosity}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => flyToPlace(selectedPlace)}
                  className="flex-1 bg-[#c2410c] hover:bg-[#9a3412] text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shadow"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Centrar Vista</span>
                </button>

                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${selectedPlace.coordinates.lat},${selectedPlace.coordinates.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#ede3d4] hover:bg-[#e4d6c2] text-[#1c1917] py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-[#e2d9c8]"
                >
                  <span>Cómo llegar ↗</span>
                </a>
              </div>

              <Link
                href={`/lugar/${selectedPlace.id}`}
                className="w-full text-center text-xs text-[#c2410c] hover:underline py-1.5 rounded-lg font-semibold transition-colors"
              >
                Ficha completa en el catálogo →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Collaboration Feedback Modal */}
      {isFeedbackOpen && (
        <div className="fixed inset-0 z-50 bg-[#1c1917]/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#faf6f0] border border-[#e2d9c8] rounded-3xl p-6 max-w-md w-full shadow-2xl text-[#1c1917] space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-[#1c1917] flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[#c2410c]" />
                  Colaborá con Paraná Pixelado
                </h3>
                <p className="text-xs text-[#78716c]">
                  ¿Viste algún dato incorrecto o falta un hito emblemático?
                </p>
              </div>
              <button
                onClick={() => setIsFeedbackOpen(false)}
                className="p-1 rounded-lg text-[#78716c] hover:text-[#1c1917] hover:bg-[#ede3d4]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {feedbackSuccess ? (
              <div className="bg-[#15803d]/10 border border-[#15803d]/30 rounded-2xl p-5 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-[#15803d] mx-auto" />
                <h4 className="text-sm font-bold text-[#1c1917]">¡Aporte recibido con éxito!</h4>
                <p className="text-xs text-[#44403c] leading-relaxed">
                  Muchas gracias por colaborar para que Paraná Pixelado sea cada día más preciso y completo.
                </p>
                <button
                  onClick={() => setIsFeedbackOpen(false)}
                  className="mt-2 px-4 py-2 bg-[#15803d] hover:bg-[#166534] text-white rounded-xl text-xs font-bold"
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
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#ede3d4] rounded-xl border border-[#e2d9c8]">
                  {(['falta', 'error', 'sugerencia'] as const).map(type => (
                    <button
                      type="button"
                      key={type}
                      onClick={() => setFeedbackType(type)}
                      className={`py-1.5 text-xs font-medium rounded-lg capitalize transition-colors ${
                        feedbackType === type
                          ? 'bg-[#1c1917] text-[#faf6f0] font-bold'
                          : 'text-[#78716c] hover:text-[#1c1917]'
                      }`}
                    >
                      {type === 'falta' ? 'Falta lugar' : type === 'error' ? 'Dato erróneo' : 'Sugerencia'}
                    </button>
                  ))}
                </div>

                {/* Message */}
                <div>
                  <label className="text-[11px] text-[#78716c] block mb-1">
                    Detalles del reporte o sugerencia
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={feedbackMessage}
                    onChange={e => setFeedbackMessage(e.target.value)}
                    placeholder="Contanos qué edificio falta, la ubicación exacta o el dato a corregir..."
                    className="w-full bg-[#f5ebe0]/70 border border-[#e2d9c8] rounded-xl p-3 text-xs text-[#1c1917] placeholder-[#a8a29e] outline-none focus:border-[#c2410c]"
                  />
                </div>

                {/* Email (Optional) */}
                <div>
                  <label className="text-[11px] text-[#78716c] block mb-1">
                    Tu correo electrónico (opcional)
                  </label>
                  <input
                    type="email"
                    value={feedbackEmail}
                    onChange={e => setFeedbackEmail(e.target.value)}
                    placeholder="ejemplo@correo.com"
                    className="w-full bg-[#f5ebe0]/70 border border-[#e2d9c8] rounded-xl p-2.5 text-xs text-[#1c1917] placeholder-[#a8a29e] outline-none focus:border-[#c2410c]"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsFeedbackOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs text-[#78716c] hover:text-[#1c1917] hover:bg-[#ede3d4]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-[#c2410c] hover:bg-[#9a3412] text-white flex items-center gap-1.5 shadow"
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

// Cell types for the 2D Occupancy Grid
const CELL_EMPTY_LAND = 0;
const CELL_WATER = 1;
const CELL_ROAD = 2;
const CELL_AVENUE = 3;
const CELL_RAIL = 4;
const CELL_PARK = 5;
const CELL_LANDMARK = 6;

class OccupancyGrid {
  private cells: Map<string, number> = new Map();
  public step: number;

  constructor(step = 6.0) {
    this.step = step;
  }

  private key(gx: number, gz: number): string {
    return `${gx},${gz}`;
  }

  public toGrid(coord: number): number {
    return Math.round(coord / this.step);
  }

  public set(x: number, z: number, type: number): void {
    const gx = this.toGrid(x);
    const gz = this.toGrid(z);
    this.cells.set(this.key(gx, gz), type);
  }

  public get(x: number, z: number): number {
    const gx = this.toGrid(x);
    const gz = this.toGrid(z);
    return this.cells.get(this.key(gx, gz)) ?? CELL_EMPTY_LAND;
  }

  public markCircle(cx: number, cz: number, radius: number, type: number): void {
    const radCells = Math.ceil(radius / this.step);
    const cgx = this.toGrid(cx);
    const cgz = this.toGrid(cz);
    for (let dx = -radCells; dx <= radCells; dx++) {
      for (let dz = -radCells; dz <= radCells; dz++) {
        if (dx * dx + dz * dz <= (radius / this.step) * (radius / this.step)) {
          this.cells.set(this.key(cgx + dx, cgz + dz), type);
        }
      }
    }
  }

  public markSegment(x1: number, z1: number, x2: number, z2: number, width: number, type: number): void {
    const dist = Math.hypot(x2 - x1, z2 - z1);
    const steps = Math.max(1, Math.ceil(dist / (this.step * 0.5)));
    const rad = width / 2;
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const px = x1 + (x2 - x1) * t;
      const pz = z1 + (z2 - z1) * t;
      this.markCircle(px, pz, rad, type);
    }
  }
}

/**
 * 1. Build Quantized Voxel Terrain with stepped Parque Urquiza Barrancas & 2D Occupancy Grid
 */
function buildVoxelTerrain(
  scene: THREE.Scene,
  geoData: GeoFeatureData,
  exclusions: { x: number; z: number; r: number }[]
) {
  // Grid parameters (1 unit ≈ 10 meters)
  const step = 6.0; // 60m blocks
  const xMin = -280;
  const xMax = 320;
  const zMin = -240;
  const zMax = 240;

  const cols = Math.ceil((xMax - xMin) / step);
  const rows = Math.ceil((zMax - zMin) / step);
  const maxInstances = cols * rows;

  // Initialize Occupancy Grid
  const grid = new OccupancyGrid(step);

  // 1. Mark Water Cells
  for (let ix = 0; ix < cols; ix++) {
    for (let iz = 0; iz < rows; iz++) {
      const x = xMin + ix * step;
      const z = zMin + iz * step;
      const lat = PARANA_ORIGIN.lat - z / 11088.0;
      const lng = PARANA_ORIGIN.lng + x / 9468.0;
      if (isWater(lat, lng)) {
        grid.set(x, z, CELL_WATER);
      }
    }
  }

  // 2. Mark Landmarks with footprint safety radii
  exclusions.forEach(l => {
    grid.markCircle(l.x, l.z, l.r + 2.0, CELL_LANDMARK);
  });

  // 3. Mark Parks
  geoData.parks.forEach(park => {
    let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
    park.polygon.forEach(([lat, lng]) => {
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
    });

    const pMin = projectTo3D(maxLat, minLng);
    const pMax = projectTo3D(minLat, maxLng);
    const startX = Math.floor(Math.min(pMin.x, pMax.x) / step) * step;
    const endX = Math.ceil(Math.max(pMin.x, pMax.x) / step) * step;
    const startZ = Math.floor(Math.min(pMin.z, pMax.z) / step) * step;
    const endZ = Math.ceil(Math.max(pMin.z, pMax.z) / step) * step;

    for (let x = startX; x <= endX; x += step) {
      for (let z = startZ; z <= endZ; z += step) {
        const lat = PARANA_ORIGIN.lat - z / 11088.0;
        const lng = PARANA_ORIGIN.lng + x / 9468.0;
        if (isPointInPolygon([lat, lng], park.polygon)) {
          if (grid.get(x, z) === CELL_EMPTY_LAND) {
            grid.set(x, z, CELL_PARK);
          }
        }
      }
    }
  });

  // 4. Mark Arteries on Grid
  geoData.arteries.forEach(artery => {
    if (!artery.coordinates || artery.coordinates.length < 2) return;
    const isRamirez = artery.name.toLowerCase().includes('ramírez') || artery.name.toLowerCase().includes('ramirez');
    const width = isRamirez ? 8.5 : 5.5;
    const type = isRamirez ? CELL_AVENUE : CELL_ROAD;

    for (let i = 0; i < artery.coordinates.length - 1; i++) {
      const [lat1, lng1] = artery.coordinates[i];
      const [lat2, lng2] = artery.coordinates[i + 1];
      const p1 = projectTo3D(lat1, lng1);
      const p2 = projectTo3D(lat2, lng2);
      grid.markSegment(p1.x, p1.z, p2.x, p2.z, width, type);
    }
  });

  // 5. Mark Railways
  if (geoData.railways) {
    geoData.railways.forEach(track => {
      if (!track.coordinates || track.coordinates.length < 2) return;
      for (let i = 0; i < track.coordinates.length - 1; i++) {
        const [lat1, lng1] = track.coordinates[i];
        const [lat2, lng2] = track.coordinates[i + 1];
        const p1 = projectTo3D(lat1, lng1);
        const p2 = projectTo3D(lat2, lng2);
        grid.markSegment(p1.x, p1.z, p2.x, p2.z, 4.5, CELL_RAIL);
      }
    });
  }

  // 6. Mark Secondary City Grid
  const gridX = [-70, -45, -20, 5, 30, 55, 80, 105];
  const gridZ = [-50, -25, 0, 25, 50, 75, 100];
  gridX.forEach(x => {
    grid.markSegment(x, -50, x, 100, 3.5, CELL_ROAD);
  });
  gridZ.forEach(z => {
    grid.markSegment(-70, z, 105, z, 3.5, CELL_ROAD);
  });

  // Geometries for Terrain Voxels
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

  const color = new THREE.Color();
  const dummy = new THREE.Object3D();

  let terrainCount = 0;
  let bldgCount = 0;

  // Building color palette (warm diorama towns)
  const bldgColors = [
    '#f5ebe0',
    '#e3d5ca',
    '#d5a087',
    '#ebd8c8',
    '#f8f4ec',
    '#8d6e63',
    '#64748b'
  ];

  for (let ix = 0; ix < cols; ix++) {
    for (let iz = 0; iz < rows; iz++) {
      const x = xMin + ix * step;
      const z = zMin + iz * step;

      // Inverse projection to GPS coordinates
      const lat = PARANA_ORIGIN.lat - z / 11088.0;
      const lng = PARANA_ORIGIN.lng + x / 9468.0;

      // Strict Coastal Clipping Rule: Never render outside dry land
      if (!isLand(lat, lng)) {
        continue; // Strictly river water plane Y = 0
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

      // Determine voxel color based on topography & land use (Warm natural diorama palette)
      if (isIsland) {
        color.set('#a3b18a'); // Sand/vegetation island
      } else if (isPark) {
        color.set(elev > 5.0 ? '#5a9944' : '#65a34e'); // Warm natural greens on barrancas
      } else if (elev <= 1.4) {
        color.set('#d5bdaf'); // Costanera low stone / sand
      } else if (elev < 8.0) {
        color.set(elev > 4.5 ? '#b58d67' : '#9c7350'); // Barranca cliff transition clay/earth
      } else {
        color.set('#d6d3d1'); // Urban street asphalt / sidewalk base
      }

      instancedMesh.setColorAt(terrainCount, color);
      terrainCount++;

      // Place procedural urban filler buildings strictly on EMPTY_LAND (never on roads, avenues, rails, parks, or landmarks)
      const cellType = grid.get(x, z);
      if (elev >= 7.5 && cellType === CELL_EMPTY_LAND && !isPark && !isIsland) {
        // Pseudo-random deterministic hash based on coordinates
        const hash = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
        const rand = hash - Math.floor(hash);

        if (rand > 0.35) {
          const bldgHeight = 2.5 + rand * 5.0; // 2.5 to 7.5 units tall
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
 * 2. Build Main Arteries (Avenues) as warm graphite strips with dashed centerlines
 * Special treatment for Av. Francisco Ramírez (Vertebral Spine of Paraná):
 * - Double width (7.5 units)
 * - Dark asphalt (#292524)
 * - Central median divider strip (cantero central) with greenery & trees
 * - Voxel lamp posts (farolas) along the avenue
 */
function buildArteries(scene: THREE.Scene, geoData: GeoFeatureData) {
  const defaultRoadMat = new THREE.MeshStandardMaterial({
    color: '#475569', // Warm graphite grey
    roughness: 0.85,
    metalness: 0.1
  });

  const ramirezAsphaltMat = new THREE.MeshStandardMaterial({
    color: '#262626', // Deep charcoal asphalt
    roughness: 0.9,
    metalness: 0.05
  });

  const medianMat = new THREE.MeshStandardMaterial({
    color: '#15803d', // Median strip grass/cantero central
    roughness: 0.8,
    metalness: 0.05
  });

  const medianCurbMat = new THREE.MeshStandardMaterial({
    color: '#a8a29e', // Concrete curb
    roughness: 0.9
  });

  const lineMat = new THREE.MeshBasicMaterial({
    color: '#fef08a'
  });

  const secondaryMat = new THREE.MeshStandardMaterial({
    color: '#d6d3d1', // Light stone sidewalks & secondary streets
    roughness: 0.9,
    metalness: 0.05
  });

  const lampPostMat = new THREE.MeshStandardMaterial({
    color: '#44403c',
    roughness: 0.7,
    metalness: 0.4
  });

  const lampBulbMat = new THREE.MeshBasicMaterial({
    color: '#fef3c7'
  });

  // 1. Primary avenues from OSM geoData
  geoData.arteries.forEach(artery => {
    if (!artery.coordinates || artery.coordinates.length < 2) return;

    const isRamirez = artery.name.toLowerCase().includes('ramírez') || artery.name.toLowerCase().includes('ramirez');
    const roadWidth = isRamirez ? 7.5 : 4.4;
    const roadMat = isRamirez ? ramirezAsphaltMat : defaultRoadMat;

    for (let i = 0; i < artery.coordinates.length - 1; i++) {
      const [lat1, lng1] = artery.coordinates[i];
      const [lat2, lng2] = artery.coordinates[i + 1];

      // Strict check: if both points are outside land, skip
      if (!isLand(lat1, lng1) && !isLand(lat2, lng2)) continue;

      const p1 = projectTo3D(lat1, lng1);
      const p2 = projectTo3D(lat2, lng2);
      const elev1 = getElevation(lat1, lng1);
      const elev2 = getElevation(lat2, lng2);

      const v1 = new THREE.Vector3(p1.x, elev1 + 0.08, p1.z);
      const v2 = new THREE.Vector3(p2.x, elev2 + 0.08, p2.z);

      const distance = v1.distanceTo(v2);
      if (distance < 0.5) continue;

      const mid = new THREE.Vector3().copy(v1).add(v2).multiplyScalar(0.5);
      const dir = new THREE.Vector3().subVectors(v2, v1).normalize();
      const perp = new THREE.Vector3(-dir.z, 0, dir.x).normalize();

      // Main Road Bed
      const roadGeom = new THREE.BoxGeometry(roadWidth, 0.15, distance);
      const roadMesh = new THREE.Mesh(roadGeom, roadMat);
      roadMesh.position.copy(mid);
      roadMesh.lookAt(v2);
      roadMesh.receiveShadow = true;
      scene.add(roadMesh);

      if (isRamirez) {
        // Cantero Central (Raised Median Strip)
        const medianCurbGeom = new THREE.BoxGeometry(1.2, 0.22, distance);
        const medianCurb = new THREE.Mesh(medianCurbGeom, medianCurbMat);
        medianCurb.position.copy(mid);
        medianCurb.position.y += 0.04;
        medianCurb.lookAt(v2);
        scene.add(medianCurb);

        const medianGrassGeom = new THREE.BoxGeometry(0.9, 0.26, distance);
        const medianGrass = new THREE.Mesh(medianGrassGeom, medianMat);
        medianGrass.position.copy(mid);
        medianGrass.position.y += 0.06;
        medianGrass.lookAt(v2);
        scene.add(medianGrass);

        // Double yellow lane markings on both sides of median
        [-1.0, 1.0].forEach(offsetDist => {
          const numDashes = Math.max(1, Math.floor(distance / 5));
          for (let d = 0; d < numDashes; d++) {
            const t = (d + 0.5) / numDashes;
            const dashPos = new THREE.Vector3().lerpVectors(v1, v2, t).add(new THREE.Vector3().copy(perp).multiplyScalar(offsetDist));
            dashPos.y += 0.10;

            const dashGeom = new THREE.BoxGeometry(0.2, 0.02, Math.min(2.5, distance / numDashes * 0.7));
            const dashMesh = new THREE.Mesh(dashGeom, lineMat);
            dashMesh.position.copy(dashPos);
            dashMesh.lookAt(new THREE.Vector3().copy(v2).add(new THREE.Vector3().copy(perp).multiplyScalar(offsetDist)));
            scene.add(dashMesh);
          }
        });

        // Farolas (Voxel Street Lamps) along Ramirez every ~18 units
        const lampInterval = 18;
        const numLamps = Math.floor(distance / lampInterval);
        for (let l = 0; l < numLamps; l++) {
          const t = (l + 0.5) / Math.max(1, numLamps);
          const lampPos = new THREE.Vector3().lerpVectors(v1, v2, t);
          lampPos.y += 0.16;

          // Lamp post pole
          const poleGeom = new THREE.BoxGeometry(0.2, 3.2, 0.2);
          const poleMesh = new THREE.Mesh(poleGeom, lampPostMat);
          poleMesh.position.set(lampPos.x, lampPos.y + 1.6, lampPos.z);
          scene.add(poleMesh);

          // Horizontal arm
          const armGeom = new THREE.BoxGeometry(1.4, 0.15, 0.15);
          const armMesh = new THREE.Mesh(armGeom, lampPostMat);
          armMesh.position.set(lampPos.x, lampPos.y + 3.1, lampPos.z);
          scene.add(armMesh);

          // Dual lantern bulbs
          [-0.6, 0.6].forEach(side => {
            const bulbGeom = new THREE.BoxGeometry(0.3, 0.25, 0.3);
            const bulbMesh = new THREE.Mesh(bulbGeom, lampBulbMat);
            bulbMesh.position.set(lampPos.x + side, lampPos.y + 2.9, lampPos.z);
            scene.add(bulbMesh);
          });
        }
      } else {
        // Dashed yellow centerline for normal avenues
        const numDashes = Math.max(1, Math.floor(distance / 6));
        for (let d = 0; d < numDashes; d++) {
          const t = (d + 0.5) / numDashes;
          const dashPos = new THREE.Vector3().lerpVectors(v1, v2, t);
          dashPos.y += 0.09;

          const dashGeom = new THREE.BoxGeometry(0.25, 0.02, Math.min(2.5, distance / numDashes * 0.6));
          const dashMesh = new THREE.Mesh(dashGeom, lineMat);
          dashMesh.position.copy(dashPos);
          dashMesh.lookAt(v2);
          scene.add(dashMesh);
        }
      }
    }
  });

  // 2. Secondary urban grid for the historical city center (Damero Español)
  const gridX = [-70, -45, -20, 5, 30, 55, 80, 105];
  const gridZ = [-50, -25, 0, 25, 50, 75, 100];

  // North-South streets (check isLand before placing)
  gridX.forEach(x => {
    const latStart = PARANA_ORIGIN.lat - (-50) / 11088.0;
    const lngStart = PARANA_ORIGIN.lng + x / 9468.0;
    if (!isLand(latStart, lngStart)) return;

    const sGeom = new THREE.BoxGeometry(2.4, 0.12, 150);
    const sMesh = new THREE.Mesh(sGeom, secondaryMat);
    sMesh.position.set(x, 8.58, 25);
    sMesh.receiveShadow = true;
    scene.add(sMesh);
  });

  // East-West streets (check isLand before placing)
  gridZ.forEach(z => {
    const latZ = PARANA_ORIGIN.lat - z / 11088.0;
    const lngZ = PARANA_ORIGIN.lng + 17.5 / 9468.0;
    if (!isLand(latZ, lngZ)) return;

    const sGeom = new THREE.BoxGeometry(175, 0.12, 2.4);
    const sMesh = new THREE.Mesh(sGeom, secondaryMat);
    sMesh.position.set(17.5, 8.58, z);
    sMesh.receiveShadow = true;
    scene.add(sMesh);
  });
}

/**
 * 3. Build General Urquiza Railway Line (Ballast, Wooden Ties, Steel Rails)
 */
function buildRailways(scene: THREE.Scene, geoData: GeoFeatureData) {
  if (!geoData.railways || geoData.railways.length === 0) return;

  const ballastMat = new THREE.MeshStandardMaterial({
    color: '#334155',
    roughness: 0.95,
    metalness: 0.1
  });

  const tieMat = new THREE.MeshStandardMaterial({
    color: '#451a03',
    roughness: 0.85
  });

  const railMat = new THREE.MeshStandardMaterial({
    color: '#cbd5e1',
    roughness: 0.25,
    metalness: 0.85
  });

  const tieGeom = new THREE.BoxGeometry(2.6, 0.14, 0.45);

  geoData.railways.forEach(track => {
    if (!track.coordinates || track.coordinates.length < 2) return;

    for (let i = 0; i < track.coordinates.length - 1; i++) {
      const [lat1, lng1] = track.coordinates[i];
      const [lat2, lng2] = track.coordinates[i + 1];

      const p1 = projectTo3D(lat1, lng1);
      const p2 = projectTo3D(lat2, lng2);
      const elev1 = getElevation(lat1, lng1);
      const elev2 = getElevation(lat2, lng2);

      const v1 = new THREE.Vector3(p1.x, elev1 + 0.1, p1.z);
      const v2 = new THREE.Vector3(p2.x, elev2 + 0.1, p2.z);
      const dist = v1.distanceTo(v2);
      if (dist < 0.4) continue;

      const mid = new THREE.Vector3().copy(v1).add(v2).multiplyScalar(0.5);
      const dir = new THREE.Vector3().subVectors(v2, v1).normalize();

      // 1. Crushed stone ballast bed
      const ballastGeom = new THREE.BoxGeometry(3.0, 0.15, dist);
      const ballastMesh = new THREE.Mesh(ballastGeom, ballastMat);
      ballastMesh.position.copy(mid);
      ballastMesh.lookAt(v2);
      ballastMesh.receiveShadow = true;
      scene.add(ballastMesh);

      // 2. Wooden ties (durmientes) spaced evenly
      const tieSpacing = 1.35;
      const numTies = Math.max(1, Math.floor(dist / tieSpacing));
      for (let t = 0; t < numTies; t++) {
        const fraction = (t + 0.5) / numTies;
        const tiePos = new THREE.Vector3().lerpVectors(v1, v2, fraction);
        tiePos.y += 0.08;

        const tieMesh = new THREE.Mesh(tieGeom, tieMat);
        tieMesh.position.copy(tiePos);
        tieMesh.lookAt(v2);
        scene.add(tieMesh);
      }

      // 3. Twin metallic steel rails
      const perp = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(0.7);

      const leftRailGeom = new THREE.BoxGeometry(0.12, 0.16, dist);
      const leftRail = new THREE.Mesh(leftRailGeom, railMat);
      leftRail.position.copy(mid).add(perp);
      leftRail.position.y += 0.16;
      leftRail.lookAt(new THREE.Vector3().copy(v2).add(perp));
      scene.add(leftRail);

      const rightRailGeom = new THREE.BoxGeometry(0.12, 0.16, dist);
      const rightRail = new THREE.Mesh(rightRailGeom, railMat);
      rightRail.position.copy(mid).sub(perp);
      rightRail.position.y += 0.16;
      rightRail.lookAt(new THREE.Vector3().copy(v2).sub(perp));
      scene.add(rightRail);
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
 * 4. Build Place Pins for Iconic Places & Easter Eggs (Minimalist, Elevated Above Buildings)
 */
function buildPlacePins(
  pinGroup: THREE.Group,
  pinSprites: { sprite: THREE.Sprite; place: Place; index: number; basePos: THREE.Vector3 }[]
) {
  const pinStemMat = new THREE.MeshBasicMaterial({ color: '#78716c', transparent: true, opacity: 0.35 });
  const ringMat = new THREE.MeshBasicMaterial({ color: '#c2410c', transparent: true, opacity: 0.3, side: THREE.DoubleSide });
  const ringGeom = new THREE.RingGeometry(0.5, 0.9, 16);

  PLACES.forEach((place, index) => {
    let { x, z } = projectTo3D(place.coordinates.lat, place.coordinates.lng);
    let elev = getElevation(place.coordinates.lat, place.coordinates.lng);
    let colorHex = PLACE_CATEGORIES[place.category]?.color || '#c2410c';

    // Position above the highest point of each building: y = buildingHeight + 2.5
    let buildingH = getBuildingHeight(place.id);
    let pinHeight = buildingH + 2.5;
    let stemBottom = buildingH * 0.75;

    if (place.id === 'easter_egg_mate_gigante') {
      x = 0;
      z = 0;
      elev = -11.0;
      pinHeight = 0;
      colorHex = '#b45309';
    } else if (place.id === 'easter_egg_dorado_gigante') {
      x = -170;
      z = -140;
      elev = 0.4;
      pinHeight = 3.2;
      stemBottom = 0.5;
      colorHex = '#b45309';
    }

    // 1. Ultra-fine semitransparent vertical stem from roof to pin (leaves building 100% visible)
    if (place.id !== 'easter_egg_mate_gigante') {
      const stemLength = Math.max(1.0, pinHeight - stemBottom);
      const stemGeom = new THREE.CylinderGeometry(0.035, 0.035, stemLength, 6);
      const stemMesh = new THREE.Mesh(stemGeom, pinStemMat);
      stemMesh.position.set(x, elev + stemBottom + stemLength / 2, z);
      pinGroup.add(stemMesh);

      // Subtle ground ring marker
      const ringMesh = new THREE.Mesh(ringGeom, ringMat);
      ringMesh.rotation.x = -Math.PI / 2;
      ringMesh.position.set(x, elev + 0.06, z);
      pinGroup.add(ringMesh);
    }

    // 2. Minimalist numeric or star badge (Sprite)
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
    const basePos = new THREE.Vector3(x, elev + pinHeight, z);
    sprite.position.copy(basePos);
    sprite.scale.set(2.6, 2.6, 1);

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
 * 5. Build 3D Voxel Models for 100% of Places in places.ts and Easter Eggs
 */
function buildAllPlaceLandmarks(scene: THREE.Scene) {
  let doradoMesh: THREE.Group | null = null;
  const exclusions: { x: number; z: number; r: number }[] = [];

  PLACES.forEach(place => {
    const model = buildModelForPlace(place);
    if (!model) return;

    if (place.id === 'easter_egg_mate_gigante') {
      model.position.set(0, -26.0, 0);
      scene.add(model);
      return;
    }

    if (place.id === 'easter_egg_dorado_gigante') {
      model.position.set(-170.0, 0.4, -140.0);
      scene.add(model);
      doradoMesh = model;
      return;
    }

    const { x, z } = projectTo3D(place.coordinates.lat, place.coordinates.lng);
    const elev = getElevation(place.coordinates.lat, place.coordinates.lng);
    model.position.set(x, elev, z);
    scene.add(model);

    // Dynamic exclusion radius based on landmark footprint
    let r = 12;
    if (
      place.id === 'catedral_metropolitana' ||
      place.id === 'estadio_patronato' ||
      place.id === 'estacion_ferrocarril'
    ) {
      r = 20;
    } else if (
      place.id === 'centro_cultural_juanele' ||
      place.id === 'casa_de_gobierno' ||
      place.id === 'sala_mayo'
    ) {
      r = 18;
    } else if (
      place.id === 'plaza_1_de_mayo' ||
      place.id === 'parque_urquiza' ||
      place.id === 'parque_gazzano'
    ) {
      r = 24;
    } else if (
      place.id === 'la_vieja_usina' ||
      place.id === 'escuela_normal' ||
      place.id === 'colegio_del_huerto' ||
      place.id === 'teatro_3_febrero'
    ) {
      r = 15;
    }

    exclusions.push({ x, z, r });
  });

  return { dorado: doradoMesh, exclusions };
}
