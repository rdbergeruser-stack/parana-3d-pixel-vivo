/**
 * src/components/map/VoxelLandmarks.ts
 * High-detail bespoke voxel composite sculptures and easter eggs for Paraná Pixelado
 */

import * as THREE from 'three';
import { projectTo3D, getElevation } from '@/lib/geo';

// Shared flat-shaded materials for diorama performance
const materials = {
  // Architectural
  whiteStone: new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.7, flatShading: true }),
  creamStone: new THREE.MeshStandardMaterial({ color: '#fef3c7', roughness: 0.75, flatShading: true }),
  peachStone: new THREE.MeshStandardMaterial({ color: '#fed7aa', roughness: 0.75, flatShading: true }),
  granitePlinth: new THREE.MeshStandardMaterial({ color: '#94a3b8', roughness: 0.8, flatShading: true }),
  slateRoof: new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.6, flatShading: true }),
  zincRoof: new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.55, flatShading: true }),
  terracotta: new THREE.MeshStandardMaterial({ color: '#9a3412', roughness: 0.8, flatShading: true }),
  brickWall: new THREE.MeshStandardMaterial({ color: '#b91c1c', roughness: 0.85, flatShading: true }),
  darkWindows: new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.3, metalness: 0.2 }),
  goldAccent: new THREE.MeshStandardMaterial({ color: '#eab308', roughness: 0.3, metalness: 0.75 }),
  woodPlanks: new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.85, flatShading: true }),
  bronzeStatue: new THREE.MeshStandardMaterial({ color: '#3f2e1e', roughness: 0.5, metalness: 0.6, flatShading: true }),
  
  // Specific Colors
  duckYellow: new THREE.MeshStandardMaterial({ color: '#facc15', roughness: 0.6, flatShading: true }),
  duckOrange: new THREE.MeshStandardMaterial({ color: '#ea580c', roughness: 0.6, flatShading: true }),
  duckBlack: new THREE.MeshStandardMaterial({ color: '#18181b', roughness: 0.5 }),
  redCrane: new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.65, flatShading: true }),
  patronatoRed: new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.75, flatShading: true }),
  patronatoBlack: new THREE.MeshStandardMaterial({ color: '#09090b', roughness: 0.8, flatShading: true }),
  pitchGrass: new THREE.MeshStandardMaterial({ color: '#16a34a', roughness: 0.9, flatShading: true }),
  whiteLine: new THREE.MeshBasicMaterial({ color: '#ffffff' }),
  stadiumLight: new THREE.MeshStandardMaterial({ color: '#fef08a', emissive: '#fef08a', emissiveIntensity: 0.85 }),

  // Easter Eggs
  mateWood: new THREE.MeshStandardMaterial({ color: '#451a03', roughness: 0.5, flatShading: true }),
  mateSilver: new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.2, metalness: 0.85 }),
  yerbaGreen: new THREE.MeshStandardMaterial({ color: '#3f6212', roughness: 0.9, flatShading: true }),
  doradoGold: new THREE.MeshStandardMaterial({ color: '#f59e0b', roughness: 0.3, metalness: 0.4, flatShading: true }),
  doradoRed: new THREE.MeshStandardMaterial({ color: '#ef4444', roughness: 0.4, flatShading: true }),
  waterFoam: new THREE.MeshStandardMaterial({ color: '#e0f2fe', transparent: true, opacity: 0.75, roughness: 0.2 })
};

/**
 * 1. Catedral Metropolitana de Paraná
 * Fachada blanca/crema, dos campanarios simétricos, pórtico con columnas y cúpula central
 */
export function buildCatedral(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'landmark_catedral_metropolitana';

  // Base podium & steps
  const podium = new THREE.Mesh(new THREE.BoxGeometry(18, 0.8, 22), materials.whiteStone);
  podium.position.y = 0.4;
  podium.receiveShadow = true;
  group.add(podium);

  // Main nave
  const nave = new THREE.Mesh(new THREE.BoxGeometry(14, 8, 18), materials.creamStone);
  nave.position.set(0, 4.4, 0);
  nave.castShadow = true;
  nave.receiveShadow = true;
  group.add(nave);

  // Front portico with triangular pediment
  const pediment = new THREE.Mesh(new THREE.ConeGeometry(7, 2.5, 3), materials.whiteStone);
  pediment.rotation.y = Math.PI;
  pediment.rotation.z = Math.PI / 2;
  pediment.position.set(0, 9.2, 9.2);
  pediment.castShadow = true;
  group.add(pediment);

  // 6 Front Columns
  for (let i = -2.5; i <= 2.5; i += 1.0) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.42, 7.2, 8), materials.whiteStone);
    col.position.set(i * 2.2, 4.0, 9.2);
    col.castShadow = true;
    group.add(col);
  }

  // Twin bell towers (Left & Right)
  [-6.2, 6.2].forEach(tx => {
    // Tower shaft
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(3.6, 13, 3.6), materials.whiteStone);
    shaft.position.set(tx, 7.0, 8.0);
    shaft.castShadow = true;
    group.add(shaft);

    // Belfry chamber
    const belfry = new THREE.Mesh(new THREE.BoxGeometry(3.0, 3.0, 3.0), materials.creamStone);
    belfry.position.set(tx, 14.5, 8.0);
    belfry.castShadow = true;
    group.add(belfry);

    // Pyramidal tower roof
    const roof = new THREE.Mesh(new THREE.ConeGeometry(2.4, 4.0, 4), materials.slateRoof);
    roof.position.set(tx, 17.5, 8.0);
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    group.add(roof);

    // Golden cross on tower
    const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.2, 0.18), materials.goldAccent);
    crossV.position.set(tx, 19.8, 8.0);
    const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.18, 0.18), materials.goldAccent);
    crossH.position.set(tx, 20.0, 8.0);
    group.add(crossV, crossH);
  });

  // Central Renaissance Dome
  const domeDrum = new THREE.Mesh(new THREE.CylinderGeometry(4.0, 4.0, 3.0, 10), materials.whiteStone);
  domeDrum.position.set(0, 9.5, -2.0);
  domeDrum.castShadow = true;
  group.add(domeDrum);

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(4.2, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    materials.zincRoof
  );
  dome.position.set(0, 11.0, -2.0);
  dome.castShadow = true;
  group.add(dome);

  // Dome lantern & golden cross
  const lantern = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 2.0, 8), materials.whiteStone);
  lantern.position.set(0, 15.8, -2.0);
  lantern.castShadow = true;
  group.add(lantern);

  const domeCross = new THREE.Mesh(new THREE.BoxGeometry(0.25, 1.5, 0.25), materials.goldAccent);
  domeCross.position.set(0, 17.2, -2.0);
  group.add(domeCross);

  return group;
}

/**
 * 2. Palacio Municipal de Paraná
 * Esquina histórica con torre reloj central, mansarda francesa y balcón
 */
export function buildPalacioMunicipal(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'landmark_palacio_municipal';

  // Base building
  const base = new THREE.Mesh(new THREE.BoxGeometry(15, 7.5, 15), materials.creamStone);
  base.position.y = 3.75;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  // Mansard roof
  const mansard = new THREE.Mesh(new THREE.BoxGeometry(14, 2.5, 14), materials.slateRoof);
  mansard.position.y = 8.5;
  mansard.castShadow = true;
  group.add(mansard);

  // Iconic central clock tower
  const towerShaft = new THREE.Mesh(new THREE.BoxGeometry(4.2, 14, 4.2), materials.whiteStone);
  towerShaft.position.set(0, 10.5, 5.5);
  towerShaft.castShadow = true;
  group.add(towerShaft);

  // 4 Round Clock Faces
  const clockGeom = new THREE.CylinderGeometry(1.2, 1.2, 0.15, 16);
  const clockMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });

  // Front clock
  const clockF = new THREE.Mesh(clockGeom, clockMat);
  clockF.rotation.x = Math.PI / 2;
  clockF.position.set(0, 14.5, 7.65);
  group.add(clockF);

  // Left & Right clocks
  const clockL = new THREE.Mesh(clockGeom, clockMat);
  clockL.rotation.z = Math.PI / 2;
  clockL.position.set(-2.15, 14.5, 5.5);
  const clockR = new THREE.Mesh(clockGeom, clockMat);
  clockR.rotation.z = Math.PI / 2;
  clockR.position.set(2.15, 14.5, 5.5);
  group.add(clockL, clockR);

  // Tower belfry & spire
  const spireBase = new THREE.Mesh(new THREE.BoxGeometry(3.5, 2.0, 3.5), materials.slateRoof);
  spireBase.position.set(0, 18.0, 5.5);
  group.add(spireBase);

  const spire = new THREE.Mesh(new THREE.ConeGeometry(2.0, 5.5, 4), materials.zincRoof);
  spire.position.set(0, 21.0, 5.5);
  spire.rotation.y = Math.PI / 4;
  spire.castShadow = true;
  group.add(spire);

  // Flagpole with Entre Ríos Flag
  const flagpole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.5, 6), materials.whiteStone);
  flagpole.position.set(0, 24.5, 5.5);
  group.add(flagpole);

  // Entre Ríos diagonal flag (red diagonal across blue/white)
  const flagMesh = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.0, 0.08), materials.patronatoRed);
  flagMesh.position.set(0.9, 25.0, 5.5);
  group.add(flagMesh);

  return group;
}

/**
 * 3. Teatro Municipal 3 de Febrero
 * Frontis neoclásico, triple puerta monumental y caja escénica
 */
export function buildTeatro3DeFebrero(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'landmark_teatro_3_febrero';

  // Front foyer & facade
  const foyer = new THREE.Mesh(new THREE.BoxGeometry(13, 7.5, 6), materials.peachStone);
  foyer.position.set(0, 3.75, 4.5);
  foyer.castShadow = true;
  foyer.receiveShadow = true;
  group.add(foyer);

  // Neoclassical pediment
  const pediment = new THREE.Mesh(new THREE.ConeGeometry(6.5, 2.2, 3), materials.whiteStone);
  pediment.rotation.y = Math.PI;
  pediment.rotation.z = Math.PI / 2;
  pediment.position.set(0, 8.5, 7.4);
  pediment.castShadow = true;
  group.add(pediment);

  // Triple monumental entrance doors
  [-3.2, 0, 3.2].forEach(dx => {
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.8, 3.6, 0.3), materials.woodPlanks);
    door.position.set(dx, 1.8, 7.6);
    group.add(door);
  });

  // Main auditorium hall
  const hall = new THREE.Mesh(new THREE.BoxGeometry(12, 7.0, 10), materials.creamStone);
  hall.position.set(0, 3.5, -2.5);
  hall.castShadow = true;
  group.add(hall);

  // High fly-tower (caja escénica)
  const stageTower = new THREE.Mesh(new THREE.BoxGeometry(11, 11.5, 6), materials.terracotta);
  stageTower.position.set(0, 5.75, -9.5);
  stageTower.castShadow = true;
  group.add(stageTower);

  return group;
}

/**
 * 4. El Patito Sirirí
 * La entrañable escultura del pato amarillo sobre la barranca mirando hacia el río
 */
export function buildPatitoSiriri(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'landmark_patito_siriri';

  // Grassy mound on the bluff
  const mound = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 5.5, 1.6, 12), materials.pitchGrass);
  mound.position.y = 0.8;
  mound.receiveShadow = true;
  group.add(mound);

  // Yellow Duck Body
  const body = new THREE.Mesh(new THREE.BoxGeometry(3.6, 2.4, 4.4), materials.duckYellow);
  body.position.set(0, 2.5, 0);
  body.castShadow = true;
  group.add(body);

  // Tail
  const tail = new THREE.Mesh(new THREE.ConeGeometry(1.2, 2.0, 4), materials.duckYellow);
  tail.position.set(0, 3.2, 2.4);
  tail.rotation.x = -Math.PI / 4;
  tail.castShadow = true;
  group.add(tail);

  // Wings (Left & Right)
  [-1.9, 1.9].forEach(wx => {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.6, 2.6), materials.duckYellow);
    wing.position.set(wx, 2.6, 0);
    wing.castShadow = true;
    group.add(wing);
  });

  // Neck and Head (tilted towards the river NW)
  const head = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.0, 2.2), materials.duckYellow);
  head.position.set(0, 4.4, -1.8);
  head.castShadow = true;
  group.add(head);

  // Orange Beak
  const beak = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.5, 1.6), materials.duckOrange);
  beak.position.set(0, 4.0, -3.4);
  beak.castShadow = true;
  group.add(beak);

  // Eyes (Left & Right)
  [-1.05, 1.05].forEach(ex => {
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.5), materials.duckBlack);
    eye.position.set(ex, 4.6, -2.0);
    group.add(eye);
  });

  // Red neck scarf
  const scarf = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.4, 2.3), materials.patronatoRed);
  scarf.position.set(0, 3.4, -1.6);
  group.add(scarf);

  return group;
}

/**
 * 5. Monumento al General Urquiza
 * Basamento escalonado de granito, columnas y estatua ecuestre de bronce
 */
export function buildMonumentoUrquiza(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'landmark_monumento_urquiza';

  // Tiered Granite Pedestal
  const step1 = new THREE.Mesh(new THREE.BoxGeometry(9.0, 0.8, 9.0), materials.granitePlinth);
  step1.position.y = 0.4;
  step1.receiveShadow = true;
  group.add(step1);

  const step2 = new THREE.Mesh(new THREE.BoxGeometry(7.0, 1.0, 7.0), materials.granitePlinth);
  step2.position.y = 1.3;
  step2.receiveShadow = true;
  group.add(step2);

  // Central column pedestal
  const pilar = new THREE.Mesh(new THREE.BoxGeometry(3.6, 6.5, 4.6), materials.whiteStone);
  pilar.position.set(0, 4.8, 0);
  pilar.castShadow = true;
  group.add(pilar);

  // Bronze plaques on base
  const plaque = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.4, 0.2), materials.bronzeStatue);
  plaque.position.set(0, 3.5, 2.4);
  group.add(plaque);

  // Bronze Horse
  const horseBody = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, 3.8), materials.bronzeStatue);
  horseBody.position.set(0, 9.0, 0);
  horseBody.castShadow = true;
  group.add(horseBody);

  const horseNeck = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.2, 1.4), materials.bronzeStatue);
  horseNeck.position.set(0, 10.4, -1.6);
  horseNeck.rotation.x = -Math.PI / 6;
  horseNeck.castShadow = true;
  group.add(horseNeck);

  const horseHead = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.0, 1.6), materials.bronzeStatue);
  horseHead.position.set(0, 11.2, -2.4);
  horseHead.castShadow = true;
  group.add(horseHead);

  // 4 Horse Legs
  [[-0.6, 7.6, -1.2], [0.6, 7.6, -1.2], [-0.6, 7.6, 1.4], [0.6, 7.6, 1.4]].forEach(([lx, ly, lz]) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.4, 2.2, 0.4), materials.bronzeStatue);
    leg.position.set(lx, ly, lz);
    leg.castShadow = true;
    group.add(leg);
  });

  // General Urquiza Figure (with bicorne hat and cape)
  const riderTorso = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.6, 0.9), materials.bronzeStatue);
  riderTorso.position.set(0, 10.6, 0.2);
  riderTorso.castShadow = true;
  group.add(riderTorso);

  const riderHead = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), materials.bronzeStatue);
  riderHead.position.set(0, 11.8, 0.2);
  riderHead.castShadow = true;
  group.add(riderHead);

  const hat = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.4, 0.8), materials.bronzeStatue);
  hat.position.set(0, 12.3, 0.2);
  group.add(hat);

  return group;
}

/**
 * 6. Sala Mayo y Puerto Nuevo
 * Galpones aduaneros históricos de ladrillo y la gran grúa roja portuaria
 */
export function buildSalaMayo(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'landmark_sala_mayo';

  // Concrete Wharf Docks
  const wharf = new THREE.Mesh(new THREE.BoxGeometry(26, 0.8, 16), materials.granitePlinth);
  wharf.position.y = 0.4;
  wharf.receiveShadow = true;
  group.add(wharf);

  // Sala Mayo Historic Brick Warehouse
  const warehouse = new THREE.Mesh(new THREE.BoxGeometry(18, 4.5, 9), materials.brickWall);
  warehouse.position.set(-2.0, 2.8, -1.5);
  warehouse.castShadow = true;
  warehouse.receiveShadow = true;
  group.add(warehouse);

  // Dual-pitch industrial metal roof
  const roof = new THREE.Mesh(new THREE.BoxGeometry(19, 1.8, 10), materials.zincRoof);
  roof.position.set(-2.0, 5.4, -1.5);
  roof.castShadow = true;
  group.add(roof);

  // Glass event front
  const glassFront = new THREE.Mesh(new THREE.BoxGeometry(16, 3.2, 0.2), materials.darkWindows);
  glassFront.position.set(-2.0, 2.5, 3.1);
  group.add(glassFront);

  // Historic Red Iron Port Crane ("Grúa de Puerto Nuevo")
  const craneGroup = new THREE.Group();
  craneGroup.position.set(9.0, 0.8, 4.0);

  // Crane base
  const craneBase = new THREE.Mesh(new THREE.BoxGeometry(2.0, 4.5, 2.0), materials.redCrane);
  craneBase.position.y = 2.25;
  craneBase.castShadow = true;
  craneGroup.add(craneBase);

  // Crane cabin
  const craneCabin = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.4, 3.0), materials.redCrane);
  craneCabin.position.set(0, 5.4, 0);
  craneCabin.castShadow = true;
  craneGroup.add(craneCabin);

  // Long crane boom arm pointing over the water
  const boom = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 9.5), materials.redCrane);
  boom.position.set(0, 8.2, 3.8);
  boom.rotation.x = -Math.PI / 5;
  boom.castShadow = true;
  craneGroup.add(boom);

  group.add(craneGroup);

  return group;
}

/**
 * 7. Complejo del Túnel Subfluvial Hernandarias
 * Portal de acceso en tierra y conducto tubular subfluvial sumergido bajo el río
 */
export function buildTunelSubfluvial(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'landmark_tunel_subfluvial';

  // Onshore toll plaza & portal
  const portalBuilding = new THREE.Mesh(new THREE.BoxGeometry(14, 4.5, 8), materials.whiteStone);
  portalBuilding.position.set(0, 2.25, 0);
  portalBuilding.castShadow = true;
  group.add(portalBuilding);

  // Iconic parabolic control / ventilation arch
  const arch = new THREE.Mesh(new THREE.TorusGeometry(5.0, 0.9, 8, 16, Math.PI), materials.whiteStone);
  arch.position.set(0, 4.5, 3.5);
  arch.castShadow = true;
  group.add(arch);

  // Underwater Subfluvial Concrete Tube (crosses river depths towards Santa Fe)
  // Positioned at Y = -2.6 (clearly beneath the water plane Y = 0)
  const tubeGeom = new THREE.CylinderGeometry(2.4, 2.4, 180, 16);
  const tubeMat = new THREE.MeshStandardMaterial({
    color: '#f8fafc',
    roughness: 0.4,
    metalness: 0.1
  });
  const tubeMesh = new THREE.Mesh(tubeGeom, tubeMat);
  tubeMesh.rotation.z = Math.PI / 2; // Horizontal across river
  tubeMesh.rotation.y = -Math.PI / 5; // Angle towards Santa Fe
  tubeMesh.position.set(-60, -2.6, -30);
  tubeMesh.castShadow = true;
  group.add(tubeMesh);

  // Segment joints on the subfluvial tube
  for (let s = -70; s <= 70; s += 20) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.55, 0.2, 6, 16), materials.zincRoof);
    ring.rotation.y = Math.PI / 2;
    ring.rotation.x = -Math.PI / 5;
    ring.position.set(-60 + s * 0.8, -2.6, -30 + s * 0.5);
    group.add(ring);
  }

  return group;
}

/**
 * 8. Estadio Presbítero Bartolomé Grella (Club Atlético Patronato)
 * Tribunas rojinegras oficiales, cancha de fútbol con líneas de cal y 4 torres de iluminación
 */
export function buildEstadioGrella(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'landmark_estadio_grella';

  // Green football pitch
  const pitch = new THREE.Mesh(new THREE.BoxGeometry(22, 0.4, 15), materials.pitchGrass);
  pitch.position.y = 0.2;
  pitch.receiveShadow = true;
  group.add(pitch);

  // White center circle & markings
  const centerCircle = new THREE.Mesh(new THREE.RingGeometry(1.8, 2.0, 16), materials.whiteLine);
  centerCircle.rotation.x = -Math.PI / 2;
  centerCircle.position.set(0, 0.42, 0);
  group.add(centerCircle);

  // 4 Grandstands (Tribunas Rojinegras de Patronato)
  // North & South grandstands (along length)
  [-9.5, 9.5].forEach(gz => {
    // 3 stepped rows alternating red and black
    for (let r = 0; r < 3; r++) {
      const standMat = r % 2 === 0 ? materials.patronatoRed : materials.patronatoBlack;
      const stand = new THREE.Mesh(new THREE.BoxGeometry(24, 1.2 + r * 1.0, 1.6), standMat);
      const sign = gz > 0 ? 1 : -1;
      stand.position.set(0, (1.2 + r * 1.0) / 2, gz + sign * r * 1.5);
      stand.castShadow = true;
      group.add(stand);
    }
  });

  // East & West grandstands (behind goals)
  [-13.0, 13.0].forEach(gx => {
    for (let r = 0; r < 3; r++) {
      const standMat = r % 2 === 0 ? materials.patronatoBlack : materials.patronatoRed;
      const stand = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.2 + r * 1.0, 15), standMat);
      const sign = gx > 0 ? 1 : -1;
      stand.position.set(gx + sign * r * 1.5, (1.2 + r * 1.0) / 2, 0);
      stand.castShadow = true;
      group.add(stand);
    }
  });

  // 4 High Steel Floodlight Towers
  [
    [-14, 10.5],
    [14, 10.5],
    [-14, -10.5],
    [14, -10.5]
  ].forEach(([tx, tz]) => {
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.35, 11, 6), materials.whiteStone);
    mast.position.set(tx, 5.5, tz);
    mast.castShadow = true;
    group.add(mast);

    // Light panel on top
    const panel = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.4, 0.6), materials.stadiumLight);
    panel.position.set(tx, 11.2, tz);
    group.add(panel);
  });

  return group;
}

/**
 * 9. Easter Egg 1 (Debajo de la maqueta):
 * El Gran Mate Cósmico de Urquiza sosteniendo la ciudad con el Sol de Entre Ríos
 */
export function buildEasterEggMate(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'easter_egg_mate_gigante';

  // Giant polished calabash / porongo mate bowl
  const mateBowl = new THREE.Mesh(
    new THREE.SphereGeometry(8.5, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.72),
    materials.mateWood
  );
  mateBowl.position.y = 0;
  mateBowl.castShadow = true;
  group.add(mateBowl);

  // Silver engraved virola ring at the rim
  const virola = new THREE.Mesh(new THREE.TorusGeometry(7.2, 0.75, 8, 24), materials.mateSilver);
  virola.rotation.x = Math.PI / 2;
  virola.position.y = 5.2;
  group.add(virola);

  // Fresh green yerba mate bed with foam
  const yerba = new THREE.Mesh(new THREE.CylinderGeometry(6.8, 6.8, 0.5, 16), materials.yerbaGreen);
  yerba.position.y = 4.8;
  group.add(yerba);

  // Silver bombilla pointing upwards to hold the city above
  const bombilla = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 22, 10), materials.mateSilver);
  bombilla.position.set(2.5, 13.0, 0);
  bombilla.rotation.z = -Math.PI / 9;
  bombilla.castShadow = true;
  group.add(bombilla);

  // Golden mouthpiece
  const mouthpiece = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 2.5, 8), materials.goldAccent);
  mouthpiece.position.set(5.8, 22.5, 0);
  mouthpiece.rotation.z = -Math.PI / 9;
  group.add(mouthpiece);

  // Radiant Golden Entre Ríos Sun behind the mate
  const sunCenter = new THREE.Mesh(new THREE.CylinderGeometry(5.0, 5.0, 0.5, 20), materials.goldAccent);
  sunCenter.rotation.x = Math.PI / 2;
  sunCenter.position.set(0, 0, -4.0);
  group.add(sunCenter);

  // 16 radiating solar rays
  for (let a = 0; a < 16; a++) {
    const angle = (a / 16) * Math.PI * 2;
    const ray = new THREE.Mesh(new THREE.ConeGeometry(0.8, 4.5, 3), materials.goldAccent);
    ray.position.set(Math.cos(angle) * 7.5, Math.sin(angle) * 7.5, -4.0);
    ray.rotation.z = angle - Math.PI / 2;
    group.add(ray);
  }

  return group;
}

/**
 * 10. Easter Egg 2 (En el Río Paraná):
 * La Raya Gigante / El Dorado Mítico del Paraná asomando entre las aguas
 */
export function buildEasterEggDorado(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'easter_egg_dorado_gigante';

  // Streamlined golden body
  const body = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.4, 7.5, 10), materials.doradoGold);
  body.rotation.z = Math.PI / 2;
  body.position.set(0, 0.8, 0);
  body.castShadow = true;
  group.add(body);

  // Head and fierce mouth
  const head = new THREE.Mesh(new THREE.ConeGeometry(2.4, 3.8, 8), materials.doradoGold);
  head.rotation.z = Math.PI / 2;
  head.position.set(5.2, 0.8, 0);
  head.castShadow = true;
  group.add(head);

  // Red caudal fin (tail)
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3.8, 2.4), materials.doradoRed);
  tail.position.set(-4.5, 1.2, 0);
  tail.castShadow = true;
  group.add(tail);

  // Spined dorsal fin
  const dorsal = new THREE.Mesh(new THREE.ConeGeometry(0.8, 2.6, 4), materials.doradoGold);
  dorsal.position.set(-0.5, 2.8, 0);
  dorsal.rotation.z = -Math.PI / 6;
  group.add(dorsal);

  // Pectoral fins (Left & Right)
  [-1.6, 1.6].forEach(pz => {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.2, 1.4), materials.doradoRed);
    fin.position.set(2.0, 0.4, pz);
    fin.rotation.y = (pz > 0 ? 1 : -1) * Math.PI / 5;
    group.add(fin);
  });

  // Frothing water ripple ring around the fish
  const ripple = new THREE.Mesh(new THREE.RingGeometry(3.0, 5.5, 16), materials.waterFoam);
  ripple.rotation.x = -Math.PI / 2;
  ripple.position.y = 0.15;
  group.add(ripple);

  return group;
}
