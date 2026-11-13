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
  roads?: { id: string; name: string; type: 'avenue' | 'street'; coordinates: [number, number][] }[];
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
      const elev = getTerrainElevation(x, z);
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

    // 1. Scene, Camera, Renderer (Clean Crisp Diorama Look, NO foggy washout)
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#f5efe6');
    // NO scene.fog: clean crisp miniature diorama aesthetic

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
    renderer.toneMappingExposure = 1.18;
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

    // 3. Crisp High-Contrast Diorama Lighting
    // DirectionalLight (2.2) for bright sunlit surfaces + moderate ambient/hemi light (0.6) for deep clear shadows
    const ambientLight = new THREE.HemisphereLight('#ffffff', '#c7b9a5', 0.6);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight('#fff8eb', 2.2);
    sunLight.position.set(210, 280, 140);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 50;
    sunLight.shadow.camera.far = 750;
    const shadowD = 320;
    sunLight.shadow.camera.left = -shadowD;
    sunLight.shadow.camera.right = shadowD;
    sunLight.shadow.camera.top = shadowD;
    sunLight.shadow.camera.bottom = -shadowD;
    sunLight.shadow.bias = -0.0004;
    scene.add(sunLight);

    // River bounce / subtle sky fill light
    const riverBounceLight = new THREE.DirectionalLight('#60a5fa', 0.35);
    riverBounceLight.position.set(-200, 100, -150);
    scene.add(riverBounceLight);

    // 4. Artisanal Diorama Cutout Base (Layered physical geological strata)
    const baseGroup = new THREE.Group();

    // Layer 1: Barranca Clay Stratum (y = -3 to 0)
    const stratum1Geom = new THREE.BoxGeometry(700, 4, 580);
    const stratum1Mat = new THREE.MeshStandardMaterial({
      color: '#b77957', // Rich terracota clay
      roughness: 0.85,
      metalness: 0.05
    });
    const stratum1Mesh = new THREE.Mesh(stratum1Geom, stratum1Mat);
    stratum1Mesh.position.set(30, -2.0, 10);
    stratum1Mesh.receiveShadow = true;
    baseGroup.add(stratum1Mesh);

    // Layer 2: Deep Geological Rock / Sedimentary Stratum (y = -10 to -3)
    const stratum2Geom = new THREE.BoxGeometry(696, 7, 576);
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
    const plinthGeom = new THREE.BoxGeometry(704, 12, 584);
    const plinthMat = new THREE.MeshStandardMaterial({
      color: '#1e1b18', // Deep charcoal craftsman plinth
      roughness: 0.85,
      metalness: 0.15
    });
    const plinthMesh = new THREE.Mesh(plinthGeom, plinthMat);
    plinthMesh.position.set(30, -17.0, 10);
    plinthMesh.receiveShadow = true;
    baseGroup.add(plinthMesh);

    scene.add(baseGroup);

    // 5. River Water Plane (Y = 0) with Rich Vibrant Clean Blue (#2b6cb0 / #3182ce)
    const waterGeom = new THREE.PlaneGeometry(950, 800, 32, 32);
    const waterMat = new THREE.MeshStandardMaterial({
      color: '#2b6cb0', // Rich clean blue
      roughness: 0.25,
      metalness: 0.18,
      transparent: true,
      opacity: 0.94
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

        // 1. Build Spatial Index of Roads & Rails
        const roadIndex = buildRoadSpatialIndex(geoData);

        // 2. Build Landmarks with snapMonumentOffRoad
        const { dorado, exclusions } = buildAllPlaceLandmarks(scene, roadIndex);
        if (engineRef.current) {
          engineRef.current.doradoMesh = dorado;
        }

        // 3. Create Dynamic Canvas Ground Texture & Pixel Collision Map
        const { groundTexture, pixels } = createCityGroundTexture(geoData);

        // 4. Build Smooth Extruded Landmass draped with Texture
        buildExtrudedLandmass(scene, geoData, groundTexture);

        // 5. Build Urban Buildings via Pixel Collision Reading
        buildUrbanCityBlocks(scene, geoData, exclusions, pixels);

        // 6. Farolas along Av. Ramírez
        buildFarolasAlongRamirez(scene, geoData);

        // 7. Flora on Parks, Islands and Avenue Boulevards
        buildFlora(scene, geoData, pixels);

        // 8. Place Pin Badges
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
      const elev = getTerrainElevation(x, z);
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
        <div className="flex items-center gap-1 bg-[#faf6f0]/95 backdrop-blur-md border border-[#e2d9c8] p-1.5 rounded-2xl shadow-sm pointer-events-auto overflow-x-auto max-w-full [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
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

// ==========================================
// 3D Procedural Generators & Builder Helpers
// ==========================================

// Road segment definition for 2D Point-to-Segment Euclidean Distance
interface RoadSegment2D {
  x1: number;
  z1: number;
  x2: number;
  z2: number;
  halfWidth: number;
  type: 'avenue' | 'street' | 'rail';
}

/**
 * Calculates Euclidean distance squared from a point (px, pz) to a line segment [p1, p2]
 */
function distSqToSegment(px: number, pz: number, x1: number, z1: number, x2: number, z2: number): number {
  const dx = x2 - x1;
  const dz = z2 - z1;
  const lenSq = dx * dx + dz * dz;
  if (lenSq === 0) {
    const ex = px - x1;
    const ez = pz - z1;
    return ex * ex + ez * ez;
  }
  let t = ((px - x1) * dx + (pz - z1) * dz) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const projX = x1 + t * dx;
  const projZ = z1 + t * dz;
  const fx = px - projX;
  const fz = pz - projZ;
  return fx * fx + fz * fz;
}

/**
 * Spatial Hash Grid to quickly compute Euclidean distance to all real roads and railways
 */
class RoadNetworkSpatialIndex {
  private segments: RoadSegment2D[] = [];
  private grid: Map<string, number[]> = new Map();
  private cellSize: number;

  constructor(cellSize = 20.0) {
    this.cellSize = cellSize;
  }

  private cellKey(cx: number, cz: number): string {
    return `${cx},${cz}`;
  }

  public addSegment(x1: number, z1: number, x2: number, z2: number, halfWidth: number, type: 'avenue' | 'street' | 'rail'): void {
    const segIdx = this.segments.length;
    this.segments.push({ x1, z1, x2, z2, halfWidth, type });

    const minX = Math.floor(Math.min(x1, x2) / this.cellSize);
    const maxX = Math.floor(Math.max(x1, x2) / this.cellSize);
    const minZ = Math.floor(Math.min(z1, z2) / this.cellSize);
    const maxZ = Math.floor(Math.max(z1, z2) / this.cellSize);

    for (let cx = minX; cx <= maxX; cx++) {
      for (let cz = minZ; cz <= maxZ; cz++) {
        const key = this.cellKey(cx, cz);
        let list = this.grid.get(key);
        if (!list) {
          list = [];
          this.grid.set(key, list);
        }
        list.push(segIdx);
      }
    }
  }

  /**
   * Returns minimum distance from (px, pz) to any road or rail edge:
   * (dist to centerline - halfWidth). Negative if inside the road/rail.
   */
  public getMinDistanceToRoadOrRail(px: number, pz: number): number {
    const cx = Math.floor(px / this.cellSize);
    const cz = Math.floor(pz / this.cellSize);
    let minDist = 999999;

    // Search 3x3 neighboring cells
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const list = this.grid.get(this.cellKey(cx + dx, cz + dz));
        if (list) {
          for (const idx of list) {
            const seg = this.segments[idx];
            const d = Math.sqrt(distSqToSegment(px, pz, seg.x1, seg.z1, seg.x2, seg.z2));
            const clearance = d - seg.halfWidth;
            if (clearance < minDist) {
              minDist = clearance;
            }
          }
        }
      }
    }

    return minDist;
  }

  /**
   * Snaps a monument off the road if its footprint collides with a street or avenue.
   * If colliding, shifts it perpendicularly into the block by (footprintRadius + halfWidth + 1.2).
   */
  public snapMonumentOffRoad(x: number, z: number, footprintRadius: number): { x: number; z: number } {
    const cx = Math.floor(x / this.cellSize);
    const cz = Math.floor(z / this.cellSize);

    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const list = this.grid.get(this.cellKey(cx + dx, cz + dz));
        if (!list) continue;

        for (const idx of list) {
          const seg = this.segments[idx];
          const dist = Math.sqrt(distSqToSegment(x, z, seg.x1, seg.z1, seg.x2, seg.z2));
          const requiredClearance = seg.halfWidth + footprintRadius;

          if (dist < requiredClearance) {
            // Find direction vector of road segment
            const segDx = seg.x2 - seg.x1;
            const segDz = seg.z2 - seg.z1;
            const segLen = Math.hypot(segDx, segDz);
            if (segLen > 0.001) {
              // Perpendicular normal (-dz, dx)
              let nx = -segDz / segLen;
              let nz = segDx / segLen;

              // Choose the perpendicular direction that points away from road center
              const t = Math.max(0, Math.min(1, ((x - seg.x1) * segDx + (z - seg.z1) * segDz) / (segLen * segLen)));
              const projX = seg.x1 + t * segDx;
              const projZ = seg.z1 + t * segDz;
              const offX = x - projX;
              const offZ = z - projZ;

              if (offX * nx + offZ * nz < 0) {
                nx = -nx;
                nz = -nz;
              }

              const shift = (requiredClearance - dist) + 1.0;
              x += nx * shift;
              z += nz * shift;
            }
          }
        }
      }
    }

    return { x, z };
  }
}

/**
 * Extracts and populates all road and railway segments into the spatial index
 */
function buildRoadSpatialIndex(geoData: GeoFeatureData): RoadNetworkSpatialIndex {
  const spatialIndex = new RoadNetworkSpatialIndex(25.0);

  // 1. Process Roads & Avenues
  const allRoads = geoData.roads || geoData.arteries.map(a => ({
    name: a.name,
    type: (a.category === 'columna-vertebral' || a.category === 'avenida' || a.category === 'bulevar' || a.category === 'costanera' || a.name.toLowerCase().includes('ramírez')) ? 'avenue' as const : 'street' as const,
    coordinates: a.coordinates
  }));

  allRoads.forEach(road => {
    if (!road.coordinates || road.coordinates.length < 2) return;
    const isRamirez = road.name.toLowerCase().includes('ramírez') || road.name.toLowerCase().includes('ramirez');
    const halfWidth = isRamirez ? 3.75 : (road.type === 'avenue' ? 1.6 : 0.9);

    for (let i = 0; i < road.coordinates.length - 1; i++) {
      const [lat1, lng1] = road.coordinates[i];
      const [lat2, lng2] = road.coordinates[i + 1];
      const p1 = projectTo3D(lat1, lng1);
      const p2 = projectTo3D(lat2, lng2);
      spatialIndex.addSegment(p1.x, p1.z, p2.x, p2.z, halfWidth, road.type);
    }
  });

  // 2. Process Railways
  if (geoData.railways) {
    geoData.railways.forEach(track => {
      if (!track.coordinates || track.coordinates.length < 2) return;
      for (let i = 0; i < track.coordinates.length - 1; i++) {
        const [lat1, lng1] = track.coordinates[i];
        const [lat2, lng2] = track.coordinates[i + 1];
        const p1 = projectTo3D(lat1, lng1);
        const p2 = projectTo3D(lat2, lng2);
        spatialIndex.addSegment(p1.x, p1.z, p2.x, p2.z, 1.8, 'rail');
      }
    });
  }

  return spatialIndex;
}

/**
 * Helper to get exact terrain surface Y coordinate in diorama space:
 * - Costanera Baja / coastal shelf top: 1.84
 * - Meseta Alta Urbana top: 8.5
 * - Barranca slope: smooth interpolation between 1.84 and 8.5
 */
function getTerrainElevation(x: number, z: number): number {
  const lat = PARANA_ORIGIN.lat - z / (111139.0 / 10.0);
  const lng = PARANA_ORIGIN.lng + x / (111139.0 * Math.cos(-31.73305 * Math.PI / 180.0) / 10.0);
  const elev = getElevation(lat, lng);
  if (elev <= 2.0) return 1.84; // Costanera Baja shelf top
  if (elev >= 6.5) return 8.5;  // High city plateau top
  const t = (elev - 2.0) / (6.5 - 2.0);
  return 1.84 + t * (8.5 - 1.84);
}

// World UV Mapping & Procedural Ground Canvas Constants
const WORLD_X_MIN = -350;
const WORLD_X_MAX = 350;
const WORLD_Z_MIN = -320;
const WORLD_Z_MAX = 320;
const WORLD_WIDTH = WORLD_X_MAX - WORLD_X_MIN; // 700
const WORLD_HEIGHT = WORLD_Z_MAX - WORLD_Z_MIN; // 640
const CANVAS_SIZE = 2048;

function worldToPixel(x: number, z: number): { px: number; py: number } {
  const px = ((x - WORLD_X_MIN) / WORLD_WIDTH) * CANVAS_SIZE;
  const py = ((z - WORLD_Z_MIN) / WORLD_HEIGHT) * CANVAS_SIZE;
  return { px, py };
}

function latLngToPixel(lat: number, lng: number): { px: number; py: number } {
  const { x, z } = projectTo3D(lat, lng);
  return worldToPixel(x, z);
}

function applyWorldUVs(geom: THREE.BufferGeometry) {
  const pos = geom.attributes.position;
  const uvs = geom.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i);
    const vz = pos.getZ(i);
    const u = (vx - WORLD_X_MIN) / WORLD_WIDTH;
    const v = 1.0 - (vz - WORLD_Z_MIN) / WORLD_HEIGHT;
    uvs.setXY(i, u, v);
  }
  uvs.needsUpdate = true;
}

function classifyPixel(r: number, g: number, b: number): 'avenue' | 'street' | 'park' | 'block' {
  // Dark avenue #1e293b (r ~ 30, g ~ 41, b ~ 59)
  if (r < 50 && g < 60 && b < 80) return 'avenue';
  // Street asphalt #475569 (r ~ 71, g ~ 85, b ~ 105)
  if (r < 95 && g < 110 && b > 75 && Math.abs(r - g) < 30) return 'street';
  // Green park / boulevard #5da654 or #48bb78
  if (g > r + 25 && g > b + 15) return 'park';
  // Urban block #e8e0d5
  return 'block';
}

function getGroundTypeAtWorldPos(
  x: number,
  z: number,
  pixels: Uint8ClampedArray
): 'avenue' | 'street' | 'park' | 'block' {
  const { px, py } = worldToPixel(x, z);
  const ix = Math.floor(px);
  const iy = Math.floor(py);
  if (ix < 4 || ix >= CANVAS_SIZE - 4 || iy < 4 || iy >= CANVAS_SIZE - 4) return 'avenue';

  // 4px radius neighborhood test (9 samples)
  const sampleDeltas = [
    [0, 0], [-3, 0], [3, 0], [0, -3], [0, 3],
    [-2, -2], [2, -2], [-2, 2], [2, 2]
  ];

  let hasAvenue = false;
  let hasStreet = false;
  let parkCount = 0;

  for (let k = 0; k < sampleDeltas.length; k++) {
    const sx = ix + sampleDeltas[k][0];
    const sy = iy + sampleDeltas[k][1];
    const idx = (sy * CANVAS_SIZE + sx) * 4;
    const type = classifyPixel(pixels[idx], pixels[idx + 1], pixels[idx + 2]);
    if (type === 'avenue') hasAvenue = true;
    if (type === 'street') hasStreet = true;
    if (type === 'park') parkCount++;
  }

  if (hasAvenue) return 'avenue';
  if (hasStreet) return 'street';
  if (parkCount >= 3) return 'park';
  return 'block';
}

/**
 * Procedural 2D Ground Canvas Texture Generator (2048x2048)
 * Renders the entire urban damero, streets, avenues, boulevards and parks onto a high-res canvas texture.
 */
function createCityGroundTexture(geoData: GeoFeatureData): {
  groundTexture: THREE.CanvasTexture;
  pixels: Uint8ClampedArray;
} {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_SIZE;
  canvas.height = CANVAS_SIZE;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

  // A. Background base: warm urban block/sidewalk tone (#e8e0d5)
  ctx.fillStyle = '#e8e0d5';
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  // B. Coastal Barranca & Parque Urquiza slope green band (#5da654)
  if (geoData.coastline && geoData.coastline.length >= 2) {
    const ridgeCoords = geoData.coastline.map(([lat, lng]) => {
      return [lat - 0.0035, lng + 0.0018] as [number, number];
    });

    ctx.fillStyle = '#5da654';
    ctx.beginPath();
    const pFirst = projectTo3D(geoData.coastline[0][0], geoData.coastline[0][1]);
    const pixFirst = worldToPixel(pFirst.x, pFirst.z);
    ctx.moveTo(pixFirst.px, pixFirst.py);

    for (let i = 1; i < geoData.coastline.length; i++) {
      const p = projectTo3D(geoData.coastline[i][0], geoData.coastline[i][1]);
      const pix = worldToPixel(p.x, p.z);
      ctx.lineTo(pix.px, pix.py);
    }
    for (let i = ridgeCoords.length - 1; i >= 0; i--) {
      const p = projectTo3D(ridgeCoords[i][0], ridgeCoords[i][1]);
      const pix = worldToPixel(p.x, p.z);
      ctx.lineTo(pix.px, pix.py);
    }
    ctx.closePath();
    ctx.fill();
  }

  // C. Interior Parks & Plazas (#5da654)
  if (geoData.parks) {
    geoData.parks.forEach(park => {
      if (!park.polygon || park.polygon.length < 3) return;
      ctx.fillStyle = '#5da654';
      ctx.beginPath();
      const p0 = latLngToPixel(park.polygon[0][0], park.polygon[0][1]);
      ctx.moveTo(p0.px, p0.py);
      for (let i = 1; i < park.polygon.length; i++) {
        const pt = latLngToPixel(park.polygon[i][0], park.polygon[i][1]);
        ctx.lineTo(pt.px, pt.py);
      }
      ctx.closePath();
      ctx.fill();

      // Light concrete curb border
      ctx.strokeStyle = '#ded7cc';
      ctx.lineWidth = 3;
      ctx.stroke();
    });
  }

  // D. Continuous Secondary Street Grid (Damero #475569 every 12 units)
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (let x = -240; x <= 280; x += 12.0) {
    const pixTop = worldToPixel(x, -210);
    const pixBottom = worldToPixel(x, 240);
    ctx.beginPath();
    ctx.moveTo(pixTop.px, pixTop.py);
    ctx.lineTo(pixBottom.px, pixBottom.py);
    ctx.stroke();
  }

  for (let z = -200; z <= 240; z += 12.0) {
    const pixLeft = worldToPixel(-240, z);
    const pixRight = worldToPixel(280, z);
    ctx.beginPath();
    ctx.moveTo(pixLeft.px, pixLeft.py);
    ctx.lineTo(pixRight.px, pixRight.py);
    ctx.stroke();
  }

  // E. All OSM secondary streets from geoData.roads
  const allRoads = geoData.roads || geoData.arteries.map(a => ({
    name: a.name,
    type: (a.category === 'columna-vertebral' || a.category === 'avenida' || a.category === 'bulevar' || a.category === 'costanera' || a.name.toLowerCase().includes('ramírez')) ? 'avenue' as const : 'street' as const,
    coordinates: a.coordinates
  }));

  allRoads.forEach(road => {
    if (!road.coordinates || road.coordinates.length < 2) return;
    const isAvenue = road.type === 'avenue' || road.name.toLowerCase().includes('ramírez') || road.name.toLowerCase().includes('racedo');
    if (isAvenue) return; // Handled next

    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 7;
    ctx.beginPath();
    const p0 = latLngToPixel(road.coordinates[0][0], road.coordinates[0][1]);
    ctx.moveTo(p0.px, p0.py);
    for (let i = 1; i < road.coordinates.length; i++) {
      const pt = latLngToPixel(road.coordinates[i][0], road.coordinates[i][1]);
      ctx.lineTo(pt.px, pt.py);
    }
    ctx.stroke();
  });

  // F. Main Avenues (Av. Ramírez, Bv. Racedo, Almafuerte, Urquiza, Laurencena, Alameda)
  allRoads.forEach(road => {
    if (!road.coordinates || road.coordinates.length < 2) return;
    const isRamirez = road.name.toLowerCase().includes('ramírez') || road.name.toLowerCase().includes('ramirez');
    const isAvenue = road.type === 'avenue' || isRamirez;
    if (!isAvenue) return;

    // 1. Dark asphalt base
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = isRamirez ? 22 : 14;
    ctx.beginPath();
    const p0 = latLngToPixel(road.coordinates[0][0], road.coordinates[0][1]);
    ctx.moveTo(p0.px, p0.py);
    for (let i = 1; i < road.coordinates.length; i++) {
      const pt = latLngToPixel(road.coordinates[i][0], road.coordinates[i][1]);
      ctx.lineTo(pt.px, pt.py);
    }
    ctx.stroke();

    // 2. Central green boulevard median
    ctx.strokeStyle = '#48bb78';
    ctx.lineWidth = isRamirez ? 8 : 4;
    ctx.beginPath();
    ctx.moveTo(p0.px, p0.py);
    for (let i = 1; i < road.coordinates.length; i++) {
      const pt = latLngToPixel(road.coordinates[i][0], road.coordinates[i][1]);
      ctx.lineTo(pt.px, pt.py);
    }
    ctx.stroke();
  });

  // G. Railways
  if (geoData.railways) {
    geoData.railways.forEach(track => {
      if (!track.coordinates || track.coordinates.length < 2) return;
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 7;
      ctx.beginPath();
      const p0 = latLngToPixel(track.coordinates[0][0], track.coordinates[0][1]);
      ctx.moveTo(p0.px, p0.py);
      for (let i = 1; i < track.coordinates.length; i++) {
        const pt = latLngToPixel(track.coordinates[i][0], track.coordinates[i][1]);
        ctx.lineTo(pt.px, pt.py);
      }
      ctx.stroke();
    });
  }

  // Extract pixel collision map
  const pixels = ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE).data;

  // Create CanvasTexture
  const groundTexture = new THREE.CanvasTexture(canvas);
  groundTexture.anisotropy = 16;
  groundTexture.wrapS = THREE.ClampToEdgeWrapping;
  groundTexture.wrapT = THREE.ClampToEdgeWrapping;
  groundTexture.generateMipmaps = true;
  groundTexture.minFilter = THREE.LinearMipmapLinearFilter;
  groundTexture.magFilter = THREE.LinearFilter;
  groundTexture.needsUpdate = true;

  return { groundTexture, pixels };
}

/**
 * 2. Build Smooth Extruded Landmass draped with Texture
 */
function buildExtrudedLandmass(scene: THREE.Scene, geoData: GeoFeatureData, groundTexture: THREE.CanvasTexture) {
  const drapedGroundMat = new THREE.MeshStandardMaterial({
    map: groundTexture,
    roughness: 0.88,
    metalness: 0.04
  });

  const sideCliffMat = new THREE.MeshStandardMaterial({
    color: '#a36a4f', // Warm terracotta / clay exclusively for vertical cliffs and pedestal edges
    roughness: 0.88,
    metalness: 0.05
  });

  const promenadeRailingMat = new THREE.MeshStandardMaterial({
    color: '#cbd5e1',
    roughness: 0.7,
    metalness: 0.3
  });

  // A. River Islands (Curupí & Puente) with organic sand beach and lush delta plateau
  if (geoData.islands) {
    const islandSandMat = new THREE.MeshStandardMaterial({
      color: '#dfc48c',
      roughness: 0.92,
      metalness: 0.02
    });

    const islandGrassMat = new THREE.MeshStandardMaterial({
      color: '#5da654',
      roughness: 0.82,
      metalness: 0.03
    });

    geoData.islands.forEach(island => {
      if (!island.polygon || island.polygon.length < 3) return;
      const pts3D = island.polygon.map(([lat, lng]) => projectTo3D(lat, lng));

      // 1. Gently sloping golden sand beach base
      const sandShape = new THREE.Shape();
      sandShape.moveTo(pts3D[0].x, -pts3D[0].z);
      for (let i = 1; i < pts3D.length; i++) {
        sandShape.lineTo(pts3D[i].x, -pts3D[i].z);
      }
      sandShape.closePath();

      const sandGeom = new THREE.ExtrudeGeometry(sandShape, {
        depth: 0.6,
        bevelEnabled: true,
        bevelThickness: 0.6,
        bevelSize: 0.9,
        bevelSegments: 3
      });
      sandGeom.rotateX(-Math.PI / 2);

      const sandMesh = new THREE.Mesh(sandGeom, islandSandMat);
      sandMesh.position.y = 0.02;
      sandMesh.receiveShadow = true;
      sandMesh.castShadow = true;
      scene.add(sandMesh);

      // 2. Elevated Island Vegetation Plateau
      const grassShape = new THREE.Shape();
      grassShape.moveTo(pts3D[0].x, -pts3D[0].z);
      for (let i = 1; i < pts3D.length; i++) {
        grassShape.lineTo(pts3D[i].x, -pts3D[i].z);
      }
      grassShape.closePath();

      const grassGeom = new THREE.ExtrudeGeometry(grassShape, {
        depth: 0.85,
        bevelEnabled: true,
        bevelThickness: 0.3,
        bevelSize: 0.3,
        bevelSegments: 2
      });
      grassGeom.rotateX(-Math.PI / 2);

      const grassMesh = new THREE.Mesh(grassGeom, islandGrassMat);
      grassMesh.position.y = 0.32;
      grassMesh.receiveShadow = true;
      grassMesh.castShadow = true;
      scene.add(grassMesh);
    });
  }

  // B. Mainland Base Shelf (Costanera Baja & Continental Plinth: y = 0 to 1.84)
  if (geoData.coastline && geoData.coastline.length >= 2) {
    const coastShape = new THREE.Shape();
    const pFirst = projectTo3D(geoData.coastline[0][0], geoData.coastline[0][1]);
    const pLast = projectTo3D(geoData.coastline[geoData.coastline.length - 1][0], geoData.coastline[geoData.coastline.length - 1][1]);

    coastShape.moveTo(pFirst.x, -pFirst.z);
    for (let i = 1; i < geoData.coastline.length; i++) {
      const pt = projectTo3D(geoData.coastline[i][0], geoData.coastline[i][1]);
      coastShape.lineTo(pt.x, -pt.z);
    }
    coastShape.lineTo(340, -pLast.z);
    coastShape.lineTo(340, -pFirst.z);
    coastShape.closePath();

    const baseGeom = new THREE.ExtrudeGeometry(coastShape, {
      depth: 1.8,
      bevelEnabled: true,
      bevelThickness: 0.4,
      bevelSize: 0.4,
      bevelSegments: 2
    });
    baseGeom.rotateX(-Math.PI / 2);
    applyWorldUVs(baseGeom);

    const baseMesh = new THREE.Mesh(baseGeom, [drapedGroundMat, sideCliffMat]);
    baseMesh.position.y = 0.04;
    baseMesh.receiveShadow = true;
    baseMesh.castShadow = true;
    scene.add(baseMesh);

    // C. Ciudad Alta High Plateau & Parque Urquiza Barrancas (y = 1.8 to 8.5)
    const cliffShape = new THREE.Shape();
    const ridgeCoords = geoData.coastline.map(([lat, lng]) => {
      return [lat - 0.0035, lng + 0.0018] as [number, number];
    });

    const pRidgeFirst = projectTo3D(ridgeCoords[0][0], ridgeCoords[0][1]);
    const pRidgeLast = projectTo3D(ridgeCoords[ridgeCoords.length - 1][0], ridgeCoords[ridgeCoords.length - 1][1]);

    cliffShape.moveTo(pRidgeFirst.x, -pRidgeFirst.z);
    for (let i = 1; i < ridgeCoords.length; i++) {
      const pt = projectTo3D(ridgeCoords[i][0], ridgeCoords[i][1]);
      cliffShape.lineTo(pt.x, -pt.z);
    }
    cliffShape.lineTo(340, -pRidgeLast.z);
    cliffShape.lineTo(340, -pRidgeFirst.z);
    cliffShape.closePath();

    const cliffGeom = new THREE.ExtrudeGeometry(cliffShape, {
      depth: 6.7,
      bevelEnabled: true,
      bevelThickness: 0.85,
      bevelSize: 0.85,
      bevelSegments: 3
    });
    cliffGeom.rotateX(-Math.PI / 2);
    applyWorldUVs(cliffGeom);

    const cliffMesh = new THREE.Mesh(cliffGeom, [drapedGroundMat, sideCliffMat]);
    cliffMesh.position.y = 1.8;
    cliffMesh.receiveShadow = true;
    cliffMesh.castShadow = true;
    scene.add(cliffMesh);

    // D. Maritime Railing along the water edge
    for (let i = 0; i < geoData.coastline.length - 1; i++) {
      const [lat1, lng1] = geoData.coastline[i];
      const [lat2, lng2] = geoData.coastline[i + 1];
      const p1 = projectTo3D(lat1, lng1);
      const p2 = projectTo3D(lat2, lng2);
      const v1 = new THREE.Vector3(p1.x, 1.86, p1.z);
      const v2 = new THREE.Vector3(p2.x, 1.86, p2.z);
      const dist = v1.distanceTo(v2);
      if (dist < 0.4) continue;

      const mid = new THREE.Vector3().copy(v1).add(v2).multiplyScalar(0.5);
      const dir = new THREE.Vector3().subVectors(v2, v1).normalize();
      const perpWater = new THREE.Vector3(dir.z, 0, -dir.x).normalize();

      const railPos = new THREE.Vector3().copy(mid).add(new THREE.Vector3().copy(perpWater).multiplyScalar(3.5));
      const railGeom = new THREE.BoxGeometry(0.22, 0.28, dist);
      const railMesh = new THREE.Mesh(railGeom, promenadeRailingMat);
      railMesh.position.copy(railPos);
      railMesh.position.y += 0.10;
      railMesh.lookAt(new THREE.Vector3().copy(v2).add(new THREE.Vector3().copy(perpWater).multiplyScalar(3.5)));
      scene.add(railMesh);
    }
  }
}

/**
 * 2. Build Urban Buildings via Dynamic Pixel-Collision Sampling
 * - Strictly samples world coordinates against the 2048x2048 canvas ground texture.
 * - Buildings are placed ONLY where getGroundTypeAtWorldPos === 'block'.
 * - Any pixel marked as 'asphalt', 'median', 'rail', 'park', or 'river' is strictly forbidden.
 * - Distance to all 40 landmarks must be at least 12 units to keep monuments prominent.
 * - Elevation is matched smoothly using getTerrainElevation(x, z).
 */
function buildUrbanCityBlocks(
  scene: THREE.Scene,
  geoData: GeoFeatureData,
  exclusions: { x: number; z: number; r: number }[],
  pixels: Uint8ClampedArray
) {
  const maxBuildings = 10000;
  const maxRoofs = 10000;

  // Base 1x1x1 unit box scaled per instance for building bodies
  const bldgGeom = new THREE.BoxGeometry(1, 1, 1);
  const bldgMat = new THREE.MeshStandardMaterial({
    roughness: 0.82,
    metalness: 0.05
  });
  const bldgMesh = new THREE.InstancedMesh(bldgGeom, bldgMat, maxBuildings);
  bldgMesh.castShadow = true;
  bldgMesh.receiveShadow = true;

  // Upper roof blocks (pitched tejas, flat slabs with parapets, elevator penthouses)
  const roofGeom = new THREE.BoxGeometry(1, 1, 1);
  const roofMat = new THREE.MeshStandardMaterial({
    roughness: 0.75,
    metalness: 0.05
  });
  const roofMesh = new THREE.InstancedMesh(roofGeom, roofMat, maxRoofs);
  roofMesh.castShadow = true;
  roofMesh.receiveShadow = true;

  const dummy = new THREE.Object3D();
  const bldgColor = new THREE.Color();
  const roofColor = new THREE.Color();

  // Architectural palettes
  const wallPaletteDowntown = [
    '#ffffff', // Crisp white stucco
    '#f8fafc', // Modern light limestone
    '#e2e8f0', // Clean concrete
    '#f1f5f9', // Pale limestone
    '#fed7aa', // Light peach
    '#fef3c7', // Warm ivory
    '#334155'  // Contemporary slate accent
  ];

  const wallPaletteResidential = [
    '#ffffff', // Classic whitewash
    '#fef3c7', // Warm cream
    '#fed7aa', // Pale terracotta ochre
    '#b91c1c', // Exposed Argentine brick
    '#f8fafc', // Light stone
    '#fde047', // Warm colonial yellow
    '#e2e8f0'  // Light grey
  ];

  const roofPaletteTejas = [
    '#c05621', // Terracotta teja colonial
    '#9a3412', // Rich baked clay
    '#b45309', // Warm amber tile
    '#7c2d12'  // Deep burnt sienna
  ];

  const roofPaletteFlat = [
    '#94a3b8', // Weathered concrete slab
    '#cbd5e1', // Light zinc / cement
    '#64748b', // Grey terrace
    '#475569'  // Dark slate parapet
  ];

  let bldgCount = 0;
  let roofCount = 0;

  const step = 2.75; // Dense grid step (~27m spacing between houses/lots)
  const xMin = -240;
  const xMax = 280;
  const zMin = -200;
  const zMax = 220;

  // Procedural deterministic hash
  const pseudoRand = (x: number, z: number) => {
    const s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
    return s - Math.floor(s);
  };

  for (let x = xMin; x <= xMax; x += step) {
    for (let z = zMin; z <= zMax; z += step) {
      if (bldgCount >= maxBuildings) break;

      const r1 = pseudoRand(x, z);
      const r2 = pseudoRand(z, x);
      const r3 = pseudoRand(x + 3.7, z + 5.9);

      // Organic position jitter (+- 0.45)
      const candX = x + (r1 - 0.5) * 0.9;
      const candZ = z + (r2 - 0.5) * 0.9;

      // Inverse projection to GPS
      const lat = PARANA_ORIGIN.lat - candZ / (111139.0 / 10.0);
      const lng = PARANA_ORIGIN.lng + candX / (111139.0 * Math.cos(-31.73305 * Math.PI / 180.0) / 10.0);

      // Must be strictly on dry land
      if (!isLand(lat, lng)) continue;

      // Plateau elevation check (elev >= 6.0) - keeps river and costanera promenade clear
      const elev = getTerrainElevation(candX, candZ);
      if (elev < 6.0) continue;

      // Must NOT be inside any OSM park polygon
      let inPark = false;
      for (const park of geoData.parks) {
        if (isPointInPolygon([lat, lng], park.polygon)) {
          inPark = true;
          break;
        }
      }
      if (inPark) continue;

      // Strict but tight landmark exclusion (3.5 to 5.0 unit clearance to avoid empty craters)
      let tooCloseToLandmark = false;
      for (const e of exclusions) {
        const dx = candX - e.x;
        const dz = candZ - e.z;
        const clearance = Math.min(e.r, 4.5) + 0.8;
        if (dx * dx + dz * dz < clearance * clearance) {
          tooCloseToLandmark = true;
          break;
        }
      }
      if (tooCloseToLandmark) continue;

      // Pixel collision check on draped ground texture
      // Candidate center must be on 'block' (#e8e0d5)
      if (getGroundTypeAtWorldPos(candX, candZ, pixels) !== 'block') continue;

      // Check 4 footprint corners with 0.85 radius to ensure building does not overlap into street asphalt
      const cornerOffset = 0.85;
      if (getGroundTypeAtWorldPos(candX - cornerOffset, candZ - cornerOffset, pixels) !== 'block') continue;
      if (getGroundTypeAtWorldPos(candX + cornerOffset, candZ - cornerOffset, pixels) !== 'block') continue;
      if (getGroundTypeAtWorldPos(candX - cornerOffset, candZ + cornerOffset, pixels) !== 'block') continue;
      if (getGroundTypeAtWorldPos(candX + cornerOffset, candZ + cornerOffset, pixels) !== 'block') continue;

      // Zone determination
      const distFromCore = Math.hypot(candX, candZ);
      const isUrquizaFront = (candX < 45 && candZ < 40 && candZ > -110);
      const isDowntown = distFromCore < 75 || isUrquizaFront;

      let bldgW: number;
      let bldgD: number;
      let bldgH: number;
      let wallColHex: string;

      let hasRoofBlock = false;
      let roofW = 0;
      let roofD = 0;
      let roofH = 0;
      let roofColHex = '';

      if (isDowntown) {
        // Microcentro & Frente al Parque Urquiza
        if (r3 < 0.40) {
          // Towers & Mid-rises (6 to 14 floors)
          bldgH = 7.5 + r1 * 12.5; // 7.5 to 20 units
          bldgW = 2.2 + r1 * 0.6;
          bldgD = 2.2 + r2 * 0.6;
          wallColHex = wallPaletteDowntown[Math.floor(r2 * wallPaletteDowntown.length)];

          // Elevator machine room / water tank penthouse
          if (roofCount < maxRoofs) {
            hasRoofBlock = true;
            roofW = bldgW * 0.65;
            roofD = bldgD * 0.65;
            roofH = 1.2 + r1 * 0.8;
            roofColHex = (r1 < 0.5) ? '#94a3b8' : '#475569';
          }
        } else {
          // Commercial 2-4 floors forming continuous block fronts
          bldgH = 3.6 + r1 * 2.8; // 3.6 to 6.4 units
          bldgW = 2.1 + r1 * 0.5;
          bldgD = 2.1 + r2 * 0.5;
          wallColHex = wallPaletteDowntown[Math.floor(r2 * wallPaletteDowntown.length)];

          // Parapet / rooftop terrace room
          if (roofCount < maxRoofs && r2 > 0.25) {
            hasRoofBlock = true;
            roofW = bldgW * 0.75;
            roofD = bldgD * 0.75;
            roofH = 0.6;
            roofColHex = '#cbd5e1';
          }
        }
      } else {
        // Residential neighborhoods: low-rise houses (1-2 stories)
        bldgH = 1.8 + r1 * 1.4; // 1.8 to 3.2 units
        bldgW = 2.0 + r1 * 0.4;
        bldgD = 2.0 + r2 * 0.4;
        wallColHex = wallPaletteResidential[Math.floor(r2 * wallPaletteResidential.length)];

        if (roofCount < maxRoofs) {
          hasRoofBlock = true;
          if (r3 < 0.60) {
            // Pitched roof in terracotta teja (Techo a dos aguas)
            roofW = bldgW + 0.25; // slight eave overhang
            roofD = bldgD + 0.25;
            roofH = 0.65;
            roofColHex = roofPaletteTejas[Math.floor(r1 * roofPaletteTejas.length)];
          } else {
            // Flat roof with parapet / medianeras
            roofW = bldgW;
            roofD = bldgD;
            roofH = 0.35;
            roofColHex = roofPaletteFlat[Math.floor(r1 * roofPaletteFlat.length)];
          }
        }
      }

      // 1. Position Base Building
      dummy.position.set(candX, elev + bldgH / 2, candZ);
      dummy.scale.set(bldgW, bldgH, bldgD);
      dummy.rotation.set(0, (Math.floor(r1 * 4) * Math.PI) / 2, 0);
      dummy.updateMatrix();
      bldgMesh.setMatrixAt(bldgCount, dummy.matrix);

      bldgColor.set(wallColHex);
      bldgMesh.setColorAt(bldgCount, bldgColor);

      // 2. Position Roof Block
      if (hasRoofBlock) {
        dummy.position.set(candX, elev + bldgH + roofH / 2, candZ);
        dummy.scale.set(roofW, roofH, roofD);
        dummy.rotation.set(0, (Math.floor(r1 * 4) * Math.PI) / 2, 0);
        dummy.updateMatrix();
        roofMesh.setMatrixAt(roofCount, dummy.matrix);

        roofColor.set(roofColHex);
        roofMesh.setColorAt(roofCount, roofColor);
        roofCount++;
      }

      bldgCount++;
    }
  }

  if (bldgCount > 0) {
    bldgMesh.count = bldgCount;
    bldgMesh.instanceMatrix.needsUpdate = true;
    if (bldgMesh.instanceColor) bldgMesh.instanceColor.needsUpdate = true;
    scene.add(bldgMesh);
  }

  if (roofCount > 0) {
    roofMesh.count = roofCount;
    roofMesh.instanceMatrix.needsUpdate = true;
    if (roofMesh.instanceColor) roofMesh.instanceColor.needsUpdate = true;
    scene.add(roofMesh);
  }
}

/**
 * 3. Build Stylized 3D Farolas along Av. Francisco Ramírez (Spinal Avenue)
 */
function buildFarolasAlongRamirez(scene: THREE.Scene, geoData: GeoFeatureData) {
  const lampPostMat = new THREE.MeshStandardMaterial({
    color: '#334155',
    roughness: 0.7,
    metalness: 0.4
  });

  const lampBulbMat = new THREE.MeshBasicMaterial({
    color: '#fef3c7'
  });

  const allRoads = geoData.roads || geoData.arteries.map(a => ({
    name: a.name,
    type: (a.category === 'columna-vertebral' || a.category === 'avenida' || a.category === 'bulevar' || a.category === 'costanera' || a.name.toLowerCase().includes('ramírez')) ? 'avenue' as const : 'street' as const,
    coordinates: a.coordinates
  }));

  const ramirezRoad = allRoads.find(r => r.name.toLowerCase().includes('ramírez') || r.name.toLowerCase().includes('ramirez'));
  if (!ramirezRoad || !ramirezRoad.coordinates || ramirezRoad.coordinates.length < 2) return;

  const lampInterval = 18; // every 18 units along the spinal boulevard
  for (let i = 0; i < ramirezRoad.coordinates.length - 1; i++) {
    const [lat1, lng1] = ramirezRoad.coordinates[i];
    const [lat2, lng2] = ramirezRoad.coordinates[i + 1];
    if (!isLand(lat1, lng1) || !isLand(lat2, lng2)) continue;

    const p1 = projectTo3D(lat1, lng1);
    const p2 = projectTo3D(lat2, lng2);
    if (Math.abs(p1.x) > 330 || Math.abs(p1.z) > 260 || Math.abs(p2.x) > 330 || Math.abs(p2.z) > 260) continue;

    const elev1 = getTerrainElevation(p1.x, p1.z);
    const elev2 = getTerrainElevation(p2.x, p2.z);
    const v1 = new THREE.Vector3(p1.x, elev1, p1.z);
    const v2 = new THREE.Vector3(p2.x, elev2, p2.z);
    const dist = v1.distanceTo(v2);
    if (dist < 4) continue;

    const numLamps = Math.floor(dist / lampInterval);
    for (let l = 0; l < numLamps; l++) {
      const t = (l + 0.5) / Math.max(1, numLamps);
      const lampPos = new THREE.Vector3().lerpVectors(v1, v2, t);
      lampPos.y += 0.05;

      const poleGeom = new THREE.BoxGeometry(0.2, 3.2, 0.2);
      const poleMesh = new THREE.Mesh(poleGeom, lampPostMat);
      poleMesh.position.set(lampPos.x, lampPos.y + 1.6, lampPos.z);
      scene.add(poleMesh);

      const armGeom = new THREE.BoxGeometry(1.4, 0.15, 0.15);
      const armMesh = new THREE.Mesh(armGeom, lampPostMat);
      armMesh.position.set(lampPos.x, lampPos.y + 3.1, lampPos.z);
      scene.add(armMesh);

      [-0.6, 0.6].forEach(side => {
        const bulbGeom = new THREE.BoxGeometry(0.3, 0.25, 0.3);
        const bulbMesh = new THREE.Mesh(bulbGeom, lampBulbMat);
        bulbMesh.position.set(lampPos.x + side, lampPos.y + 2.9, lampPos.z);
        scene.add(bulbMesh);
      });
    }
  }
}

/**
 * 4. Build Stylized Proportional 3D Trees (Parks, River Islands & Avenue Boulevards)
 * - Organic spacing: 70% natural greens (#388e3c, #66bb6a), 15% Lapacho rosado (#ec4899), 15% Jacarandá lila (#9333ea).
 * - River Islands (Curupí & Puente) covered with weeping willows, ceibos and lush delta vegetation.
 * - Aligned boulevard trees along Av. Ramírez and major avenues.
 */
function buildFlora(scene: THREE.Scene, geoData: GeoFeatureData, pixels: Uint8ClampedArray) {
  const maxTrees = 1600;
  const trunkGeom = new THREE.BoxGeometry(0.28, 1.4, 0.28);
  const foliageGeom = new THREE.BoxGeometry(1.6, 1.6, 1.6);

  const trunkMat = new THREE.MeshStandardMaterial({ color: '#5c4033', roughness: 0.9 });
  const foliageMat = new THREE.MeshStandardMaterial({ roughness: 0.72, metalness: 0.04 });

  const trunkMesh = new THREE.InstancedMesh(trunkGeom, trunkMat, maxTrees);
  const foliageMesh = new THREE.InstancedMesh(foliageGeom, foliageMat, maxTrees);
  trunkMesh.castShadow = true;
  foliageMesh.castShadow = true;

  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  let treeCount = 0;

  // Stored tree positions for minimum-distance checks
  const treePositions: { x: number; z: number }[] = [];

  // A. Distribute trees in parks and plazas
  if (geoData.parks) {
    geoData.parks.forEach(park => {
      const isUrquiza = park.name.toLowerCase().includes('urquiza');
      const isPlaza = park.name.toLowerCase().includes('plaza');
      const parkTreeTarget = isUrquiza ? 220 : (isPlaza ? 35 : 60);

      let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
      park.polygon.forEach(([lat, lng]) => {
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
      });

      let attempts = 0;
      let placed = 0;
      while (placed < parkTreeTarget && attempts < parkTreeTarget * 5 && treeCount < maxTrees) {
        attempts++;
        const lat = minLat + Math.random() * (maxLat - minLat);
        const lng = minLng + Math.random() * (maxLng - minLng);

        if (!isPointInPolygon([lat, lng], park.polygon)) continue;
        const { x, z } = projectTo3D(lat, lng);

        const isTooClose = treePositions.some(p => {
          const dx = p.x - x;
          const dz = p.z - z;
          return dx * dx + dz * dz < 3.2 * 3.2;
        });
        if (isTooClose) continue;

        treePositions.push({ x, z });
        const elev = getTerrainElevation(x, z);

        dummy.position.set(x, elev + 0.7, z);
        dummy.scale.set(1.0, 1.0, 1.0);
        dummy.updateMatrix();
        trunkMesh.setMatrixAt(treeCount, dummy.matrix);

        dummy.position.set(x, elev + 2.0, z);
        dummy.scale.set(1.1, 1.1, 1.1);
        dummy.updateMatrix();
        foliageMesh.setMatrixAt(treeCount, dummy.matrix);

        const rand = Math.random();
        const treeColor = rand < 0.35 ? '#388e3c' : (rand < 0.70 ? '#66bb6a' : (rand < 0.85 ? '#ec4899' : '#9333ea'));
        color.set(treeColor);
        foliageMesh.setColorAt(treeCount, color);

        treeCount++;
        placed++;
      }
    });
  }

  // B. River Islands Flora (Isla Curupí & Isla Puente)
  if (geoData.islands) {
    geoData.islands.forEach(island => {
      let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
      island.polygon.forEach(([lat, lng]) => {
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
      });

      const islandTarget = island.name.toLowerCase().includes('curupí') ? 70 : 80;
      let attempts = 0;
      let placed = 0;

      while (placed < islandTarget && attempts < islandTarget * 6 && treeCount < maxTrees) {
        attempts++;
        const lat = minLat + Math.random() * (maxLat - minLat);
        const lng = minLng + Math.random() * (maxLng - minLng);

        if (!isPointInPolygon([lat, lng], island.polygon)) continue;
        const { x, z } = projectTo3D(lat, lng);

        const isTooClose = treePositions.some(p => {
          const dx = p.x - x;
          const dz = p.z - z;
          return dx * dx + dz * dz < 3.0 * 3.0;
        });
        if (isTooClose) continue;

        treePositions.push({ x, z });
        const elev = 0.55;

        dummy.position.set(x, elev + 0.65, z);
        dummy.scale.set(0.85, 0.9, 0.85);
        dummy.updateMatrix();
        trunkMesh.setMatrixAt(treeCount, dummy.matrix);

        dummy.position.set(x, elev + 1.85, z);
        dummy.scale.set(1.0, 1.0, 1.0);
        dummy.updateMatrix();
        foliageMesh.setMatrixAt(treeCount, dummy.matrix);

        const rand = Math.random();
        const islandColor = rand < 0.45 ? '#2f855a' : (rand < 0.75 ? '#48bb78' : (rand < 0.90 ? '#68d391' : '#dc2626'));
        color.set(islandColor);
        foliageMesh.setColorAt(treeCount, color);
        treeCount++;
        placed++;
      }
    });
  }

  // C. Boulevard Trees along Av. Ramírez & Major Avenues
  const allRoads = geoData.roads || geoData.arteries.map(a => ({
    name: a.name,
    type: (a.category === 'columna-vertebral' || a.category === 'avenida' || a.category === 'bulevar' || a.category === 'costanera' || a.name.toLowerCase().includes('ramírez')) ? 'avenue' as const : 'street' as const,
    coordinates: a.coordinates
  }));

  const majorAvenues = allRoads.filter(r => r.type === 'avenue' || r.name.toLowerCase().includes('ramírez') || r.name.toLowerCase().includes('racedo') || r.name.toLowerCase().includes('federación'));

  majorAvenues.forEach(avenue => {
    if (!avenue.coordinates || treeCount >= maxTrees) return;
    const isRamirez = avenue.name.toLowerCase().includes('ramírez') || avenue.name.toLowerCase().includes('ramirez');
    const interval = isRamirez ? 14.0 : 18.0;

    for (let i = 0; i < avenue.coordinates.length - 1; i++) {
      const [lat1, lng1] = avenue.coordinates[i];
      const [lat2, lng2] = avenue.coordinates[i + 1];
      if (!isLand(lat1, lng1) || !isLand(lat2, lng2)) continue;

      const p1 = projectTo3D(lat1, lng1);
      const p2 = projectTo3D(lat2, lng2);
      const dist = Math.hypot(p2.x - p1.x, p2.z - p1.z);
      const numTrees = Math.floor(dist / interval);

      for (let t = 0; t < numTrees && treeCount < maxTrees; t++) {
        const frac = (t + 0.5) / Math.max(1, numTrees);
        const lat = lat1 + (lat2 - lat1) * frac;
        const lng = lng1 + (lng2 - lng1) * frac;
        const { x, z } = projectTo3D(lat, lng);

        const isTooClose = treePositions.some(p => {
          const dx = p.x - x;
          const dz = p.z - z;
          return dx * dx + dz * dz < 4.0 * 4.0;
        });
        if (isTooClose) continue;

        treePositions.push({ x, z });
        const elev = getTerrainElevation(x, z);

        dummy.position.set(x, elev + 0.8, z);
        dummy.scale.set(0.9, 1.0, 0.9);
        dummy.updateMatrix();
        trunkMesh.setMatrixAt(treeCount, dummy.matrix);

        dummy.position.set(x, elev + 2.1, z);
        dummy.scale.set(0.95, 0.95, 0.95);
        dummy.updateMatrix();
        foliageMesh.setMatrixAt(treeCount, dummy.matrix);

        // Lapacho / Jacarandá along avenue boulevards
        const colorHex = (t % 3 === 0) ? '#ec4899' : ((t % 3 === 1) ? '#9333ea' : '#48bb78');
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
    let elev = getTerrainElevation(x, z);
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
 * Uses snapMonumentOffRoad to guarantee no monument encroaches on any road or rail
 */
function buildAllPlaceLandmarks(scene: THREE.Scene, roadIndex: RoadNetworkSpatialIndex) {
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

    let { x, z } = projectTo3D(place.coordinates.lat, place.coordinates.lng);

    // Dynamic footprint radius based on landmark architecture (compact to prevent empty craters)
    let r = 3.5;
    if (
      place.id === 'catedral_metropolitana' ||
      place.id === 'estadio_patronato' ||
      place.id === 'casa_de_gobierno'
    ) {
      r = 5.0;
    } else if (
      place.id === 'centro_cultural_juanele' ||
      place.id === 'la_vieja_usina' ||
      place.id === 'sala_mayo' ||
      place.id === 'estacion_ferrocarril' ||
      place.id === 'escuela_normal' ||
      place.id === 'teatro_3_febrero'
    ) {
      r = 4.5;
    } else if (
      place.id === 'plaza_1_de_mayo' ||
      place.id === 'parque_urquiza' ||
      place.id === 'parque_gazzano'
    ) {
      r = 4.5; // Parks are also protected by polygon
    }

    // Snap monument off any road or rail if footprint encroaches
    const snapped = roadIndex.snapMonumentOffRoad(x, z, r);
    x = snapped.x;
    z = snapped.z;

    const elev = getTerrainElevation(x, z);
    model.position.set(x, elev, z);
    scene.add(model);

    exclusions.push({ x, z, r });
  });

  return { dorado: doradoMesh, exclusions };
}
