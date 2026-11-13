/**
 * src/components/map/VoxelLandmarks.ts
 * High-detail bespoke voxel composite sculptures and typological models for Paraná Pixelado
 * 100% of places receive a dedicated 3D voxel model
 */

import * as THREE from 'three';
import { Place } from '@/data/places';

// Shared flat-shaded materials for diorama performance and cohesion
export const materials = {
  // Architectural Stones & Bricks
  whiteStone: new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.7, flatShading: true }),
  creamStone: new THREE.MeshStandardMaterial({ color: '#fef3c7', roughness: 0.75, flatShading: true }),
  peachStone: new THREE.MeshStandardMaterial({ color: '#fed7aa', roughness: 0.75, flatShading: true }),
  granitePlinth: new THREE.MeshStandardMaterial({ color: '#94a3b8', roughness: 0.8, flatShading: true }),
  slateRoof: new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.6, flatShading: true }),
  zincRoof: new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.55, flatShading: true }),
  terracotta: new THREE.MeshStandardMaterial({ color: '#9a3412', roughness: 0.8, flatShading: true }),
  brickWall: new THREE.MeshStandardMaterial({ color: '#b91c1c', roughness: 0.85, flatShading: true }),
  industrialBrick: new THREE.MeshStandardMaterial({ color: '#991b1b', roughness: 0.85, flatShading: true }),
  darkWindows: new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.3, metalness: 0.2 }),
  goldAccent: new THREE.MeshStandardMaterial({ color: '#eab308', roughness: 0.3, metalness: 0.75 }),
  woodPlanks: new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.85, flatShading: true }),
  bronzeStatue: new THREE.MeshStandardMaterial({ color: '#3f2e1e', roughness: 0.5, metalness: 0.6, flatShading: true }),
  
  // Specific Landmark Colors
  duckYellow: new THREE.MeshStandardMaterial({ color: '#facc15', roughness: 0.6, flatShading: true }),
  duckOrange: new THREE.MeshStandardMaterial({ color: '#ea580c', roughness: 0.6, flatShading: true }),
  duckBlack: new THREE.MeshStandardMaterial({ color: '#18181b', roughness: 0.5 }),
  redCrane: new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.65, flatShading: true }),
  patronatoRed: new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.75, flatShading: true }),
  patronatoBlack: new THREE.MeshStandardMaterial({ color: '#09090b', roughness: 0.8, flatShading: true }),
  pitchGrass: new THREE.MeshStandardMaterial({ color: '#16a34a', roughness: 0.9, flatShading: true }),
  tennisClay: new THREE.MeshStandardMaterial({ color: '#ea580c', roughness: 0.9, flatShading: true }),
  courtBlue: new THREE.MeshStandardMaterial({ color: '#2563eb', roughness: 0.8, flatShading: true }),
  waterFountain: new THREE.MeshStandardMaterial({ color: '#38bdf8', roughness: 0.1, transparent: true, opacity: 0.8 }),
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

// ==========================================
// 1. Bespoke Hand-Crafted Landmark Models
// ==========================================

/**
 * 1. Catedral Metropolitana de Paraná
 */
export function buildCatedral(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'landmark_catedral_metropolitana';

  const podium = new THREE.Mesh(new THREE.BoxGeometry(18, 0.8, 22), materials.whiteStone);
  podium.position.y = 0.4;
  podium.receiveShadow = true;
  group.add(podium);

  const nave = new THREE.Mesh(new THREE.BoxGeometry(14, 8, 18), materials.creamStone);
  nave.position.set(0, 4.4, 0);
  nave.castShadow = true;
  nave.receiveShadow = true;
  group.add(nave);

  const pediment = new THREE.Mesh(new THREE.ConeGeometry(7, 2.5, 3), materials.whiteStone);
  pediment.rotation.y = Math.PI;
  pediment.rotation.z = Math.PI / 2;
  pediment.position.set(0, 9.2, 9.2);
  pediment.castShadow = true;
  group.add(pediment);

  for (let i = -2.5; i <= 2.5; i += 1.0) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.42, 7.2, 8), materials.whiteStone);
    col.position.set(i * 2.2, 4.0, 9.2);
    col.castShadow = true;
    group.add(col);
  }

  [-6.2, 6.2].forEach(tx => {
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(3.6, 13, 3.6), materials.whiteStone);
    shaft.position.set(tx, 7.0, 8.0);
    shaft.castShadow = true;
    group.add(shaft);

    const belfry = new THREE.Mesh(new THREE.BoxGeometry(3.0, 3.0, 3.0), materials.creamStone);
    belfry.position.set(tx, 14.5, 8.0);
    belfry.castShadow = true;
    group.add(belfry);

    const roof = new THREE.Mesh(new THREE.ConeGeometry(2.4, 4.0, 4), materials.slateRoof);
    roof.position.set(tx, 17.5, 8.0);
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    group.add(roof);

    const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.2, 0.18), materials.goldAccent);
    crossV.position.set(tx, 19.8, 8.0);
    const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.18, 0.18), materials.goldAccent);
    crossH.position.set(tx, 20.0, 8.0);
    group.add(crossV, crossH);
  });

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
 */
export function buildPalacioMunicipal(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'landmark_palacio_municipal';

  const base = new THREE.Mesh(new THREE.BoxGeometry(15, 7.5, 15), materials.creamStone);
  base.position.y = 3.75;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  const mansard = new THREE.Mesh(new THREE.BoxGeometry(14, 2.5, 14), materials.slateRoof);
  mansard.position.y = 8.5;
  mansard.castShadow = true;
  group.add(mansard);

  const towerShaft = new THREE.Mesh(new THREE.BoxGeometry(4.2, 14, 4.2), materials.whiteStone);
  towerShaft.position.set(0, 10.5, 5.5);
  towerShaft.castShadow = true;
  group.add(towerShaft);

  const clockGeom = new THREE.CylinderGeometry(1.2, 1.2, 0.15, 16);
  const clockMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });

  const clockF = new THREE.Mesh(clockGeom, clockMat);
  clockF.rotation.x = Math.PI / 2;
  clockF.position.set(0, 14.5, 7.65);
  group.add(clockF);

  const clockL = new THREE.Mesh(clockGeom, clockMat);
  clockL.rotation.z = Math.PI / 2;
  clockL.position.set(-2.15, 14.5, 5.5);
  const clockR = new THREE.Mesh(clockGeom, clockMat);
  clockR.rotation.z = Math.PI / 2;
  clockR.position.set(2.15, 14.5, 5.5);
  group.add(clockL, clockR);

  const spire = new THREE.Mesh(new THREE.ConeGeometry(2.0, 5.5, 4), materials.zincRoof);
  spire.position.set(0, 21.0, 5.5);
  spire.rotation.y = Math.PI / 4;
  spire.castShadow = true;
  group.add(spire);

  const flagpole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.5, 6), materials.whiteStone);
  flagpole.position.set(0, 24.5, 5.5);
  group.add(flagpole);

  const flagMesh = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.0, 0.08), materials.patronatoRed);
  flagMesh.position.set(0.9, 25.0, 5.5);
  group.add(flagMesh);

  return group;
}

/**
 * 3. Casa de Gobierno (Casa Gris)
 * Palacio neoclásico francés con reloj y mansarda sobre Plaza Alvear
 */
export function buildCasaDeGobierno(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'landmark_casa_de_gobierno';

  // Base building with classical stone facade
  const base = new THREE.Mesh(new THREE.BoxGeometry(26, 8.5, 18), materials.whiteStone);
  base.position.y = 4.25;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  // Mansard roof
  const mansard = new THREE.Mesh(new THREE.BoxGeometry(24.5, 3.0, 16.5), materials.slateRoof);
  mansard.position.y = 10.0;
  mansard.castShadow = true;
  group.add(mansard);

  // Front Loggia / Balcony with pillars
  for (let i = -3; i <= 3; i++) {
    const col = new THREE.Mesh(new THREE.BoxGeometry(0.6, 5.5, 0.6), materials.creamStone);
    col.position.set(i * 2.8, 3.5, 9.3);
    group.add(col);
  }

  // Clock Tower
  const tower = new THREE.Mesh(new THREE.BoxGeometry(4.5, 15, 4.5), materials.whiteStone);
  tower.position.set(0, 12, 0);
  tower.castShadow = true;
  group.add(tower);

  // Clock dial
  const clockDial = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 0.2, 16), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
  clockDial.rotation.x = Math.PI / 2;
  clockDial.position.set(0, 16.5, 2.3);
  group.add(clockDial);

  // Spire with Entre Ríos Flag
  const spire = new THREE.Mesh(new THREE.ConeGeometry(2.2, 5.0, 4), materials.zincRoof);
  spire.position.set(0, 21.5, 0);
  spire.rotation.y = Math.PI / 4;
  group.add(spire);

  const flag = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.1, 0.08), materials.courtBlue);
  flag.position.set(1.0, 25.0, 0);
  group.add(flag);

  return group;
}

/**
 * 4. Escuela Normal José María Torres
 * Edificio escolar monumental de dos plantas
 */
export function buildEscuelaNormal(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'landmark_escuela_normal';

  const mainBlock = new THREE.Mesh(new THREE.BoxGeometry(26, 8.0, 16), materials.creamStone);
  mainBlock.position.y = 4.0;
  mainBlock.castShadow = true;
  group.add(mainBlock);

  const pediment = new THREE.Mesh(new THREE.ConeGeometry(6.0, 2.2, 3), materials.whiteStone);
  pediment.rotation.y = Math.PI;
  pediment.rotation.z = Math.PI / 2;
  pediment.position.set(0, 9.1, 8.1);
  group.add(pediment);

  const centralCupola = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.0, 3.0, 8), materials.zincRoof);
  centralCupola.position.set(0, 9.8, 0);
  group.add(centralCupola);

  return group;
}

/**
 * 5. Colegio Nuestra Señora del Huerto
 */
export function buildColegioDelHuerto(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'landmark_colegio_del_huerto';

  const body = new THREE.Mesh(new THREE.BoxGeometry(18, 7.5, 14), materials.whiteStone);
  body.position.y = 3.75;
  body.castShadow = true;
  group.add(body);

  const belfry = new THREE.Mesh(new THREE.BoxGeometry(3.2, 7.0, 3.2), materials.creamStone);
  belfry.position.set(-6.0, 9.0, 5.0);
  group.add(belfry);

  const spire = new THREE.Mesh(new THREE.ConeGeometry(1.8, 3.5, 4), materials.slateRoof);
  spire.position.set(-6.0, 13.5, 5.0);
  group.add(spire);

  return group;
}

/**
 * 6. Centro Cultural Juan L. Ortiz (El "Juanele" en Bv. Racedo)
 * Galpones ferroviarios alargados de ladrillo visto, techos a dos aguas y andén
 */
export function buildCentroCulturalJuanele(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'landmark_centro_cultural_juanele';

  // Main Railway Shed in Red Brick
  const shed1 = new THREE.Mesh(new THREE.BoxGeometry(28, 5.8, 10), materials.brickWall);
  shed1.position.set(0, 2.9, 0);
  shed1.castShadow = true;
  shed1.receiveShadow = true;
  group.add(shed1);

  // Dual-pitch corrugated tin roof
  const roof1 = new THREE.Mesh(new THREE.BoxGeometry(29, 2.2, 11), materials.slateRoof);
  roof1.position.set(0, 6.5, 0);
  roof1.castShadow = true;
  group.add(roof1);

  // Secondary warehouse shed attached
  const shed2 = new THREE.Mesh(new THREE.BoxGeometry(18, 4.8, 7), materials.industrialBrick);
  shed2.position.set(-16.0, 2.4, -1.0);
  shed2.castShadow = true;
  group.add(shed2);

  const roof2 = new THREE.Mesh(new THREE.BoxGeometry(19, 1.8, 8), materials.zincRoof);
  roof2.position.set(-16.0, 5.4, -1.0);
  group.add(roof2);

  // Lateral Railway Passenger Platform (Andén)
  const platform = new THREE.Mesh(new THREE.BoxGeometry(34, 0.6, 4.0), materials.granitePlinth);
  platform.position.set(0, 0.3, 7.0);
  platform.receiveShadow = true;
  group.add(platform);

  // Wooden platform canopy posts & roof
  for (let p = -14; p <= 14; p += 7) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3.8, 0.3), materials.woodPlanks);
    post.position.set(p, 2.2, 7.0);
    group.add(post);
  }

  const canopy = new THREE.Mesh(new THREE.BoxGeometry(32, 0.3, 3.5), materials.zincRoof);
  canopy.position.set(0, 4.2, 7.0);
  group.add(canopy);

  // Historic Stationary Boxcar on the rail track
  const boxcar = new THREE.Mesh(new THREE.BoxGeometry(9.0, 3.2, 2.8), materials.darkWindows);
  boxcar.position.set(8.0, 1.8, 10.5);
  boxcar.castShadow = true;
  group.add(boxcar);

  return group;
}

/**
 * 7. Estación Central de Trenes (Ferrocarril General Urquiza)
 */
export function buildEstacionFerrocarril(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'landmark_estacion_ferrocarril';

  // British-style terminal building
  const terminal = new THREE.Mesh(new THREE.BoxGeometry(24, 6.5, 9), materials.brickWall);
  terminal.position.set(0, 3.25, 0);
  terminal.castShadow = true;
  group.add(terminal);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(25, 2.2, 10), materials.terracotta);
  roof.position.set(0, 7.2, 0);
  group.add(roof);

  // Clock Pediment
  const pediment = new THREE.Mesh(new THREE.BoxGeometry(6.0, 2.5, 1.0), materials.creamStone);
  pediment.position.set(0, 8.0, 4.6);
  group.add(pediment);

  const clock = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.15, 12), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
  clock.rotation.x = Math.PI / 2;
  clock.position.set(0, 8.2, 5.15);
  group.add(clock);

  // Platform (Andén)
  const platform = new THREE.Mesh(new THREE.BoxGeometry(30, 0.5, 4.5), materials.granitePlinth);
  platform.position.set(0, 0.25, -6.5);
  group.add(platform);

  return group;
}

/**
 * 8. Centro Cultural La Vieja Usina
 * Fábrica industrial de ladrillo con gran chimenea
 */
export function buildViejaUsina(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'landmark_la_vieja_usina';

  // Industrial hall
  const hall = new THREE.Mesh(new THREE.BoxGeometry(18, 7.5, 11), materials.industrialBrick);
  hall.position.set(0, 3.75, 0);
  hall.castShadow = true;
  group.add(hall);

  // Gabled industrial roof
  const roof = new THREE.Mesh(new THREE.BoxGeometry(19, 2.2, 12), materials.slateRoof);
  roof.position.set(0, 8.2, 0);
  group.add(roof);

  // Towering Circular Brick Chimney
  const chimney = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.8, 24, 12), materials.industrialBrick);
  chimney.position.set(11.0, 12.0, 3.0);
  chimney.castShadow = true;
  group.add(chimney);

  // Chimney top crown
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.2, 1.2, 12), materials.slateRoof);
  crown.position.set(11.0, 24.2, 3.0);
  group.add(crown);

  return group;
}

/**
 * 9. Teatro Municipal 3 de Febrero
 */
export function buildTeatro3DeFebrero(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'landmark_teatro_3_febrero';

  const foyer = new THREE.Mesh(new THREE.BoxGeometry(13, 7.5, 6), materials.peachStone);
  foyer.position.set(0, 3.75, 4.5);
  foyer.castShadow = true;
  group.add(foyer);

  const pediment = new THREE.Mesh(new THREE.ConeGeometry(6.5, 2.2, 3), materials.whiteStone);
  pediment.rotation.y = Math.PI;
  pediment.rotation.z = Math.PI / 2;
  pediment.position.set(0, 8.5, 7.4);
  pediment.castShadow = true;
  group.add(pediment);

  [-3.2, 0, 3.2].forEach(dx => {
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.8, 3.6, 0.3), materials.woodPlanks);
    door.position.set(dx, 1.8, 7.6);
    group.add(door);
  });

  const hall = new THREE.Mesh(new THREE.BoxGeometry(12, 7.0, 10), materials.creamStone);
  hall.position.set(0, 3.5, -2.5);
  hall.castShadow = true;
  group.add(hall);

  const stageTower = new THREE.Mesh(new THREE.BoxGeometry(11, 11.5, 6), materials.terracotta);
  stageTower.position.set(0, 5.75, -9.5);
  stageTower.castShadow = true;
  group.add(stageTower);

  return group;
}

/**
 * 10. El Patito Sirirí
 */
export function buildPatitoSiriri(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'landmark_patito_siriri';

  const mound = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 5.5, 1.6, 12), materials.pitchGrass);
  mound.position.y = 0.8;
  mound.receiveShadow = true;
  group.add(mound);

  const body = new THREE.Mesh(new THREE.BoxGeometry(3.6, 2.4, 4.4), materials.duckYellow);
  body.position.set(0, 2.5, 0);
  body.castShadow = true;
  group.add(body);

  const tail = new THREE.Mesh(new THREE.ConeGeometry(1.2, 2.0, 4), materials.duckYellow);
  tail.position.set(0, 3.2, 2.4);
  tail.rotation.x = -Math.PI / 4;
  tail.castShadow = true;
  group.add(tail);

  [-1.9, 1.9].forEach(wx => {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.6, 2.6), materials.duckYellow);
    wing.position.set(wx, 2.6, 0);
    wing.castShadow = true;
    group.add(wing);
  });

  const head = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.0, 2.2), materials.duckYellow);
  head.position.set(0, 4.4, -1.8);
  head.castShadow = true;
  group.add(head);

  const beak = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.5, 1.6), materials.duckOrange);
  beak.position.set(0, 4.0, -3.4);
  beak.castShadow = true;
  group.add(beak);

  [-1.05, 1.05].forEach(ex => {
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.5), materials.duckBlack);
    eye.position.set(ex, 4.6, -2.0);
    group.add(eye);
  });

  const scarf = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.4, 2.3), materials.patronatoRed);
  scarf.position.set(0, 3.4, -1.6);
  group.add(scarf);

  return group;
}

/**
 * 11. Monumento al Gral. Urquiza
 */
export function buildMonumentoUrquiza(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'landmark_monumento_urquiza';

  const step1 = new THREE.Mesh(new THREE.BoxGeometry(9.0, 0.8, 9.0), materials.granitePlinth);
  step1.position.y = 0.4;
  step1.receiveShadow = true;
  group.add(step1);

  const step2 = new THREE.Mesh(new THREE.BoxGeometry(7.0, 1.0, 7.0), materials.granitePlinth);
  step2.position.y = 1.3;
  step2.receiveShadow = true;
  group.add(step2);

  const pilar = new THREE.Mesh(new THREE.BoxGeometry(3.6, 6.5, 4.6), materials.whiteStone);
  pilar.position.set(0, 4.8, 0);
  pilar.castShadow = true;
  group.add(pilar);

  const plaque = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.4, 0.2), materials.bronzeStatue);
  plaque.position.set(0, 3.5, 2.4);
  group.add(plaque);

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

  [[-0.6, 7.6, -1.2], [0.6, 7.6, -1.2], [-0.6, 7.6, 1.4], [0.6, 7.6, 1.4]].forEach(([lx, ly, lz]) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.4, 2.2, 0.4), materials.bronzeStatue);
    leg.position.set(lx, ly, lz);
    leg.castShadow = true;
    group.add(leg);
  });

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
 * 12. Sala Mayo y Puerto Nuevo
 */
export function buildSalaMayo(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'landmark_sala_mayo';

  const wharf = new THREE.Mesh(new THREE.BoxGeometry(26, 0.8, 16), materials.granitePlinth);
  wharf.position.y = 0.4;
  wharf.receiveShadow = true;
  group.add(wharf);

  const warehouse = new THREE.Mesh(new THREE.BoxGeometry(18, 4.5, 9), materials.brickWall);
  warehouse.position.set(-2.0, 2.8, -1.5);
  warehouse.castShadow = true;
  group.add(warehouse);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(19, 1.8, 10), materials.zincRoof);
  roof.position.set(-2.0, 5.4, -1.5);
  group.add(roof);

  const craneGroup = new THREE.Group();
  craneGroup.position.set(9.0, 0.8, 4.0);

  const craneBase = new THREE.Mesh(new THREE.BoxGeometry(2.0, 4.5, 2.0), materials.redCrane);
  craneBase.position.y = 2.25;
  craneGroup.add(craneBase);

  const craneCabin = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.4, 3.0), materials.redCrane);
  craneCabin.position.set(0, 5.4, 0);
  craneGroup.add(craneCabin);

  const boom = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 9.5), materials.redCrane);
  boom.position.set(0, 8.2, 3.8);
  boom.rotation.x = -Math.PI / 5;
  craneGroup.add(boom);

  group.add(craneGroup);
  return group;
}

/**
 * 13. Complejo del Túnel Subfluvial Hernandarias
 */
export function buildTunelSubfluvial(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'landmark_tunel_subfluvial';

  const portalBuilding = new THREE.Mesh(new THREE.BoxGeometry(14, 4.5, 8), materials.whiteStone);
  portalBuilding.position.set(0, 2.25, 0);
  portalBuilding.castShadow = true;
  group.add(portalBuilding);

  const arch = new THREE.Mesh(new THREE.TorusGeometry(5.0, 0.9, 8, 16, Math.PI), materials.whiteStone);
  arch.position.set(0, 4.5, 3.5);
  arch.castShadow = true;
  group.add(arch);

  const tubeGeom = new THREE.CylinderGeometry(2.4, 2.4, 180, 16);
  const tubeMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.4, metalness: 0.1 });
  const tubeMesh = new THREE.Mesh(tubeGeom, tubeMat);
  tubeMesh.rotation.z = Math.PI / 2;
  tubeMesh.rotation.y = -Math.PI / 5;
  tubeMesh.position.set(-60, -2.6, -30);
  tubeMesh.castShadow = true;
  group.add(tubeMesh);

  return group;
}

/**
 * 14. Estadio Presbítero Bartolomé Grella (Patronato)
 */
export function buildEstadioGrella(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'landmark_estadio_grella';

  const pitch = new THREE.Mesh(new THREE.BoxGeometry(22, 0.4, 15), materials.pitchGrass);
  pitch.position.y = 0.2;
  pitch.receiveShadow = true;
  group.add(pitch);

  const centerCircle = new THREE.Mesh(new THREE.RingGeometry(1.8, 2.0, 16), materials.whiteLine);
  centerCircle.rotation.x = -Math.PI / 2;
  centerCircle.position.set(0, 0.42, 0);
  group.add(centerCircle);

  [-9.5, 9.5].forEach(gz => {
    for (let r = 0; r < 3; r++) {
      const standMat = r % 2 === 0 ? materials.patronatoRed : materials.patronatoBlack;
      const stand = new THREE.Mesh(new THREE.BoxGeometry(24, 1.2 + r * 1.0, 1.6), standMat);
      const sign = gz > 0 ? 1 : -1;
      stand.position.set(0, (1.2 + r * 1.0) / 2, gz + sign * r * 1.5);
      stand.castShadow = true;
      group.add(stand);
    }
  });

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

  [[-14, 10.5], [14, 10.5], [-14, -10.5], [14, -10.5]].forEach(([tx, tz]) => {
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.35, 11, 6), materials.whiteStone);
    mast.position.set(tx, 5.5, tz);
    mast.castShadow = true;
    group.add(mast);

    const panel = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.4, 0.6), materials.stadiumLight);
    panel.position.set(tx, 11.2, tz);
    group.add(panel);
  });

  return group;
}

/**
 * 15. Letras Corpóreas PARANÁ
 */
export function buildLetrasParana(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'landmark_letras_parana';

  const lawn = new THREE.Mesh(new THREE.BoxGeometry(14, 0.4, 4), materials.pitchGrass);
  lawn.position.y = 0.2;
  group.add(lawn);

  // 6 3D Voxel Letters "P A R A N A"
  const letterMat = materials.whiteStone;
  for (let i = -2.5; i <= 2.5; i += 1.0) {
    const letter = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.0, 0.6), letterMat);
    letter.position.set(i * 2.0, 1.4, 0);
    letter.castShadow = true;
    group.add(letter);
  }

  return group;
}

/**
 * 16. Monumento al Mate
 */
export function buildMonumentoAlMate(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'landmark_monumento_al_mate';

  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 3.0, 1.4, 8), materials.granitePlinth);
  plinth.position.y = 0.7;
  group.add(plinth);

  const mate = new THREE.Mesh(new THREE.SphereGeometry(1.6, 12, 10), materials.mateWood);
  mate.position.set(0, 2.5, 0);
  group.add(mate);

  const bombilla = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 4.0, 6), materials.mateSilver);
  bombilla.position.set(0.6, 4.0, 0);
  bombilla.rotation.z = -Math.PI / 8;
  group.add(bombilla);

  return group;
}

/**
 * 17. Puerto Sánchez (Pueblo costero de pescadores)
 */
export function buildPuertoSanchez(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'landmark_puerto_sanchez';

  const pier = new THREE.Mesh(new THREE.BoxGeometry(16, 0.6, 8), materials.woodPlanks);
  pier.position.y = 0.3;
  group.add(pier);

  // 3 colorful riverside huts
  const colors = [materials.courtBlue, materials.duckYellow, materials.patronatoRed];
  [-4.5, 0, 4.5].forEach((hx, idx) => {
    const hut = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.6, 3.2), colors[idx]);
    hut.position.set(hx, 1.9, -1.0);
    hut.castShadow = true;
    group.add(hut);

    const roof = new THREE.Mesh(new THREE.ConeGeometry(2.4, 1.4, 4), materials.zincRoof);
    roof.position.set(hx, 3.8, -1.0);
    roof.rotation.y = Math.PI / 4;
    group.add(roof);
  });

  return group;
}

/**
 * 18. Easter Egg 1: El Gran Mate Cósmico debajo de la maqueta
 */
export function buildEasterEggMate(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'easter_egg_mate_gigante';

  const mateBowl = new THREE.Mesh(
    new THREE.SphereGeometry(8.5, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.72),
    materials.mateWood
  );
  mateBowl.castShadow = true;
  group.add(mateBowl);

  const virola = new THREE.Mesh(new THREE.TorusGeometry(7.2, 0.75, 8, 24), materials.mateSilver);
  virola.rotation.x = Math.PI / 2;
  virola.position.y = 5.2;
  group.add(virola);

  const yerba = new THREE.Mesh(new THREE.CylinderGeometry(6.8, 6.8, 0.5, 16), materials.yerbaGreen);
  yerba.position.y = 4.8;
  group.add(yerba);

  const bombilla = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 22, 10), materials.mateSilver);
  bombilla.position.set(2.5, 13.0, 0);
  bombilla.rotation.z = -Math.PI / 9;
  bombilla.castShadow = true;
  group.add(bombilla);

  const mouthpiece = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 2.5, 8), materials.goldAccent);
  mouthpiece.position.set(5.8, 22.5, 0);
  mouthpiece.rotation.z = -Math.PI / 9;
  group.add(mouthpiece);

  const sunCenter = new THREE.Mesh(new THREE.CylinderGeometry(5.0, 5.0, 0.5, 20), materials.goldAccent);
  sunCenter.rotation.x = Math.PI / 2;
  sunCenter.position.set(0, 0, -4.0);
  group.add(sunCenter);

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
 * 19. Easter Egg 2: El Dorado Mítico en el Río Paraná
 */
export function buildEasterEggDorado(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'easter_egg_dorado_gigante';

  const body = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.4, 7.5, 10), materials.doradoGold);
  body.rotation.z = Math.PI / 2;
  body.position.set(0, 0.8, 0);
  body.castShadow = true;
  group.add(body);

  const head = new THREE.Mesh(new THREE.ConeGeometry(2.4, 3.8, 8), materials.doradoGold);
  head.rotation.z = Math.PI / 2;
  head.position.set(5.2, 0.8, 0);
  head.castShadow = true;
  group.add(head);

  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3.8, 2.4), materials.doradoRed);
  tail.position.set(-4.5, 1.2, 0);
  tail.castShadow = true;
  group.add(tail);

  const dorsal = new THREE.Mesh(new THREE.ConeGeometry(0.8, 2.6, 4), materials.doradoGold);
  dorsal.position.set(-0.5, 2.8, 0);
  dorsal.rotation.z = -Math.PI / 6;
  group.add(dorsal);

  [-1.6, 1.6].forEach(pz => {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.2, 1.4), materials.doradoRed);
    fin.position.set(2.0, 0.4, pz);
    fin.rotation.y = (pz > 0 ? 1 : -1) * Math.PI / 5;
    group.add(fin);
  });

  const ripple = new THREE.Mesh(new THREE.RingGeometry(3.0, 5.5, 16), materials.waterFoam);
  ripple.rotation.x = -Math.PI / 2;
  ripple.position.y = 0.15;
  group.add(ripple);

  return group;
}

// ==========================================
// 2. Typological Generators for Remaining Places
// ==========================================

/**
 * Typology A: Civic Plazas & Squares (Plaza 1° de Mayo, Plaza Alvear, etc.)
 */
export function buildPlazaVoxel(place: Place): THREE.Group {
  const group = new THREE.Group();
  group.name = `typology_plaza_${place.id}`;

  // Plaza tiled perimeter base
  const base = new THREE.Mesh(new THREE.BoxGeometry(22, 0.4, 22), materials.whiteStone);
  base.position.y = 0.2;
  base.receiveShadow = true;
  group.add(base);

  // 4 green lawn quadrants
  [-5.5, 5.5].forEach(qx => {
    [-5.5, 5.5].forEach(qz => {
      const lawn = new THREE.Mesh(new THREE.BoxGeometry(8, 0.3, 8), materials.pitchGrass);
      lawn.position.set(qx, 0.5, qz);
      group.add(lawn);

      // A park bench on each lawn
      const bench = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.4, 0.8), materials.woodPlanks);
      bench.position.set(qx, 0.8, qz + 2.5);
      group.add(bench);
    });
  });

  // Central Fountain
  const fountainBase = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.6, 0.8, 12), materials.whiteStone);
  fountainBase.position.y = 0.7;
  group.add(fountainBase);

  const water = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 2.8, 0.2, 12), materials.waterFountain);
  water.position.y = 1.1;
  group.add(water);

  const fountainCenter = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, 2.2, 8), materials.whiteStone);
  fountainCenter.position.y = 1.8;
  group.add(fountainCenter);

  return group;
}

/**
 * Typology B: Sports Clubs & Athletic Complexes
 */
export function buildClubDeportivoVoxel(place: Place): THREE.Group {
  const group = new THREE.Group();
  group.name = `typology_club_${place.id}`;

  // Clubhouse pavilion
  const pavilion = new THREE.Mesh(new THREE.BoxGeometry(14, 5.5, 8), materials.creamStone);
  pavilion.position.set(-4.0, 2.75, 4.0);
  pavilion.castShadow = true;
  group.add(pavilion);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(15, 1.4, 9), materials.terracotta);
  roof.position.set(-4.0, 6.2, 4.0);
  group.add(roof);

  // Painted sports court (Clay tennis or blue basketball court)
  const isTennis = place.id.includes('nautico') || place.id.includes('estudiantes');
  const courtMat = isTennis ? materials.tennisClay : materials.courtBlue;
  const court = new THREE.Mesh(new THREE.BoxGeometry(16, 0.2, 10), courtMat);
  court.position.set(4.0, 0.1, -4.0);
  court.receiveShadow = true;
  group.add(court);

  // Court perimeter fence posts
  for (let fx = -4; fx <= 12; fx += 8) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.5, 4), materials.whiteStone);
    post.position.set(fx, 1.8, -9.0);
    group.add(post);
  }

  return group;
}

/**
 * Typology C: Classical Museums & Libraries
 */
export function buildMuseoBibliotecaVoxel(place: Place): THREE.Group {
  const group = new THREE.Group();
  group.name = `typology_museo_${place.id}`;

  const podium = new THREE.Mesh(new THREE.BoxGeometry(18, 0.8, 14), materials.granitePlinth);
  podium.position.y = 0.4;
  group.add(podium);

  const hall = new THREE.Mesh(new THREE.BoxGeometry(16, 7.0, 12), materials.peachStone);
  hall.position.set(0, 4.3, 0);
  hall.castShadow = true;
  group.add(hall);

  const pediment = new THREE.Mesh(new THREE.ConeGeometry(5.0, 1.8, 3), materials.whiteStone);
  pediment.rotation.y = Math.PI;
  pediment.rotation.z = Math.PI / 2;
  pediment.position.set(0, 8.5, 6.1);
  group.add(pediment);

  // 4 Entrance Columns
  for (let c = -1.5; c <= 1.5; c += 1.0) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 6.0, 6), materials.whiteStone);
    col.position.set(c * 2.5, 3.8, 6.1);
    group.add(col);
  }

  const mansard = new THREE.Mesh(new THREE.BoxGeometry(15, 2.0, 11), materials.slateRoof);
  mansard.position.y = 8.5;
  group.add(mansard);

  return group;
}

/**
 * Typology D: Coastal Balnearios & Natural Parks
 */
export function buildParqueBalnearioVoxel(place: Place): THREE.Group {
  const group = new THREE.Group();
  group.name = `typology_balneario_${place.id}`;

  const base = new THREE.Mesh(new THREE.BoxGeometry(20, 0.4, 16), materials.creamStone);
  base.position.y = 0.2;
  group.add(base);

  // Wooden boardwalk
  const boardwalk = new THREE.Mesh(new THREE.BoxGeometry(18, 0.4, 3.5), materials.woodPlanks);
  boardwalk.position.set(0, 0.4, 4.0);
  group.add(boardwalk);

  // 3 Thatched beach quinchos / parasols
  [-5, 0, 5].forEach(qx => {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3.0, 6), materials.woodPlanks);
    pole.position.set(qx, 1.5, -2.0);
    group.add(pole);

    const quincho = new THREE.Mesh(new THREE.ConeGeometry(2.0, 1.2, 8), materials.woodPlanks);
    quincho.position.set(qx, 3.2, -2.0);
    group.add(quincho);
  });

  return group;
}

/**
 * Typology E: Commercial Walks, Markets & Ferias
 */
export function buildPaseoComercialVoxel(place: Place): THREE.Group {
  const group = new THREE.Group();
  group.name = `typology_comercio_${place.id}`;

  const marketHall = new THREE.Mesh(new THREE.BoxGeometry(16, 6.0, 10), materials.peachStone);
  marketHall.position.set(0, 3.0, 0);
  marketHall.castShadow = true;
  group.add(marketHall);

  // Barrel-vaulted or arched market roof
  const barrelRoof = new THREE.Mesh(new THREE.CylinderGeometry(5.2, 5.2, 16, 12, 1, false, 0, Math.PI), materials.zincRoof);
  barrelRoof.rotation.z = Math.PI / 2;
  barrelRoof.position.set(0, 6.0, 0);
  group.add(barrelRoof);

  // Striped market canopy awnings in front
  const awning = new THREE.Mesh(new THREE.BoxGeometry(14, 0.3, 2.5), materials.patronatoRed);
  awning.position.set(0, 3.2, 5.5);
  awning.rotation.x = Math.PI / 12;
  group.add(awning);

  return group;
}

// ==========================================
// 3. Master Dispatcher (100% Place Coverage)
// ==========================================

export function buildModelForPlace(place: Place): THREE.Group {
  // 1. Direct Bespoke Hand-Crafted Landmark Model Matches
  switch (place.id) {
    case 'catedral_metropolitana':
      return buildCatedral();
    case 'palacio_municipal':
      return buildPalacioMunicipal();
    case 'casa_de_gobierno':
      return buildCasaDeGobierno();
    case 'escuela_normal':
      return buildEscuelaNormal();
    case 'colegio_del_huerto':
      return buildColegioDelHuerto();
    case 'centro_cultural_juanele':
      return buildCentroCulturalJuanele();
    case 'estacion_ferrocarril':
      return buildEstacionFerrocarril();
    case 'la_vieja_usina':
      return buildViejaUsina();
    case 'teatro_3_febrero':
      return buildTeatro3DeFebrero();
    case 'patito_siriri':
      return buildPatitoSiriri();
    case 'monumento_urquiza':
      return buildMonumentoUrquiza();
    case 'sala_mayo':
      return buildSalaMayo();
    case 'tunel_subfluvial':
      return buildTunelSubfluvial();
    case 'estadio_patronato':
      return buildEstadioGrella();
    case 'letras_parana':
      return buildLetrasParana();
    case 'monumento_al_mate':
      return buildMonumentoAlMate();
    case 'puerto_sanchez':
      return buildPuertoSanchez();
    case 'easter_egg_mate_gigante':
      return buildEasterEggMate();
    case 'easter_egg_dorado_gigante':
      return buildEasterEggDorado();
    default:
      break;
  }

  // 2. High-Fidelity Typological Fallbacks
  const nameLower = place.name.toLowerCase();
  const idLower = place.id.toLowerCase();

  if (place.category === 'paseos-y-compras' && (nameLower.includes('plaza') || idLower.includes('plaza'))) {
    return buildPlazaVoxel(place);
  }

  if (place.category === 'deporte' || idLower.includes('club') || idLower.includes('estadio') || idLower.includes('golf')) {
    return buildClubDeportivoVoxel(place);
  }

  if (place.category === 'cultura' || nameLower.includes('museo') || nameLower.includes('biblioteca') || nameLower.includes('anfiteatro')) {
    return buildMuseoBibliotecaVoxel(place);
  }

  if (nameLower.includes('balneario') || nameLower.includes('parque') || nameLower.includes('toma') || nameLower.includes('bajada')) {
    return buildParqueBalnearioVoxel(place);
  }

  return buildPaseoComercialVoxel(place);
}
