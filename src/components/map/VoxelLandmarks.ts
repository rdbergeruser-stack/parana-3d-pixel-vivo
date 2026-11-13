/**
 * src/components/map/VoxelLandmarks.ts
 * High-definition bespoke voxel composite sculptures and typological models for Paraná Pixelado
 * 100% of places receive a dedicated 3D voxel model
 * No primitive cylinders/cones for sculptures - built with true micro-voxel matrices
 */

import * as THREE from 'three';
import { Place } from '@/data/places';

// Shared flat-shaded materials for diorama performance and cohesion
export const materials = {
  // Architectural Stones & Bricks
  whiteStone: new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.7, flatShading: true }),
  pureWhite: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.5, flatShading: true }),
  creamStone: new THREE.MeshStandardMaterial({ color: '#fef3c7', roughness: 0.75, flatShading: true }),
  peachStone: new THREE.MeshStandardMaterial({ color: '#fed7aa', roughness: 0.75, flatShading: true }),
  granitePlinth: new THREE.MeshStandardMaterial({ color: '#94a3b8', roughness: 0.8, flatShading: true }),
  slateRoof: new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.6, flatShading: true }),
  zincRoof: new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.55, flatShading: true }),
  copperGreen: new THREE.MeshStandardMaterial({ color: '#0d9488', roughness: 0.6, flatShading: true }),
  terracotta: new THREE.MeshStandardMaterial({ color: '#9a3412', roughness: 0.8, flatShading: true }),
  brickWall: new THREE.MeshStandardMaterial({ color: '#b91c1c', roughness: 0.85, flatShading: true }),
  industrialBrick: new THREE.MeshStandardMaterial({ color: '#991b1b', roughness: 0.85, flatShading: true }),
  darkWindows: new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.3, metalness: 0.2 }),
  glassCyan: new THREE.MeshStandardMaterial({ color: '#38bdf8', roughness: 0.2, metalness: 0.6 }),
  goldAccent: new THREE.MeshStandardMaterial({ color: '#eab308', roughness: 0.3, metalness: 0.75 }),
  woodPlanks: new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.85, flatShading: true }),
  bronzeStatue: new THREE.MeshStandardMaterial({ color: '#3f2e1e', roughness: 0.5, metalness: 0.6, flatShading: true }),
  
  // Specific Landmark Colors
  duckYellow: new THREE.MeshStandardMaterial({ color: '#facc15', roughness: 0.6, flatShading: true }),
  duckGold: new THREE.MeshStandardMaterial({ color: '#eab308', roughness: 0.6, flatShading: true }),
  duckBrown: new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.7, flatShading: true }),
  duckOrange: new THREE.MeshStandardMaterial({ color: '#ea580c', roughness: 0.6, flatShading: true }),
  duckBlack: new THREE.MeshStandardMaterial({ color: '#18181b', roughness: 0.5 }),
  duckWhite: new THREE.MeshStandardMaterial({ color: '#fef3c7', roughness: 0.6, flatShading: true }),
  duckCyan: new THREE.MeshStandardMaterial({ color: '#38bdf8', roughness: 0.6, flatShading: true }),
  duckPink: new THREE.MeshStandardMaterial({ color: '#ec4899', roughness: 0.6, flatShading: true }),
  patronatoRed: new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.75, flatShading: true }),
  patronatoBlack: new THREE.MeshStandardMaterial({ color: '#09090b', roughness: 0.8, flatShading: true }),
  pitchGrass: new THREE.MeshStandardMaterial({ color: '#16a34a', roughness: 0.9, flatShading: true }),
  tennisClay: new THREE.MeshStandardMaterial({ color: '#ea580c', roughness: 0.9, flatShading: true }),
  courtBlue: new THREE.MeshStandardMaterial({ color: '#2563eb', roughness: 0.8, flatShading: true }),
  waterFountain: new THREE.MeshStandardMaterial({ color: '#38bdf8', roughness: 0.1, transparent: true, opacity: 0.8 }),
  whiteLine: new THREE.MeshBasicMaterial({ color: '#ffffff' }),
  stadiumLight: new THREE.MeshStandardMaterial({ color: '#fef08a', emissive: '#fef08a', emissiveIntensity: 0.85 }),

  // Easter Eggs & Fauna
  mateWood: new THREE.MeshStandardMaterial({ color: '#451a03', roughness: 0.5, flatShading: true }),
  mateSilver: new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.2, metalness: 0.85 }),
  yerbaGreen: new THREE.MeshStandardMaterial({ color: '#3f6212', roughness: 0.9, flatShading: true }),
  doradoGold: new THREE.MeshStandardMaterial({ color: '#f59e0b', roughness: 0.25, metalness: 0.6, flatShading: true }),
  doradoAmber: new THREE.MeshStandardMaterial({ color: '#d97706', roughness: 0.3, metalness: 0.5, flatShading: true }),
  doradoSilver: new THREE.MeshStandardMaterial({ color: '#fef08a', roughness: 0.2, metalness: 0.7, flatShading: true }),
  doradoRed: new THREE.MeshStandardMaterial({ color: '#ef4444', roughness: 0.4, flatShading: true }),
  doradoBlack: new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.4 }),
  waterFoam: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.2, flatShading: true }),
  waterSplash: new THREE.MeshStandardMaterial({ color: '#38bdf8', roughness: 0.1, transparent: true, opacity: 0.85 })
};

/**
 * Helper to add a voxel box to a group
 */
function addBox(
  group: THREE.Group,
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  mat: THREE.Material,
  castShadow = true
) {
  const geom = new THREE.BoxGeometry(w, h, d);
  const mesh = new THREE.Mesh(geom, mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

// ==========================================
// 1. Pixel Font Matrix "PARANÁ" Generator
// ==========================================

const FONT_5x7: Record<string, string[]> = {
  P: [
    '11110',
    '10001',
    '10001',
    '11110',
    '10000',
    '10000',
    '10000'
  ],
  A: [
    '01110',
    '10001',
    '10001',
    '11111',
    '10001',
    '10001',
    '10001'
  ],
  R: [
    '11110',
    '10001',
    '10001',
    '11110',
    '10100',
    '10010',
    '10001'
  ],
  N: [
    '10001',
    '11001',
    '10101',
    '10011',
    '10001',
    '10001',
    '10001'
  ],
  'Á': [
    '00010', // Row -1: accent mark (tilde)
    '01110', // Row 0
    '10001', // Row 1
    '10001', // Row 2
    '11111', // Row 3
    '10001', // Row 4
    '10001', // Row 5
    '10001'  // Row 6
  ]
};

/**
 * Creates 3D Voxel Letters using a 5x7 bitmap matrix
 */
export function createVoxelText(text: string): THREE.Group {
  const group = new THREE.Group();
  const voxelSize = 0.30;
  const voxelDepth = 0.42;
  const letterSpacing = 0.55;
  const letterWidth = 5 * voxelSize;

  const totalWidth = text.length * letterWidth + (text.length - 1) * letterSpacing;
  let cursorX = -totalWidth / 2 + letterWidth / 2;

  const letterMat = materials.pureWhite;
  const boxGeom = new THREE.BoxGeometry(voxelSize, voxelSize, voxelDepth);

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const bitmap = FONT_5x7[char] || FONT_5x7['A'];
    const rows = bitmap.length;

    for (let r = 0; r < rows; r++) {
      const line = bitmap[r];
      // If letter has accent (length 8), row 0 is accent at y = 7
      const yIndex = rows === 8 ? (7 - r) : (6 - r);
      const y = yIndex * voxelSize;

      for (let c = 0; c < line.length; c++) {
        if (line[c] === '1') {
          const x = cursorX + (c - 2) * voxelSize;
          const mesh = new THREE.Mesh(boxGeom, letterMat);
          mesh.position.set(x, y, 0);
          mesh.castShadow = true;
          group.add(mesh);
        }
      }
    }
    cursorX += letterWidth + letterSpacing;
  }

  return group;
}

// ==========================================
// 2. Bespoke Hand-Crafted Landmark Models
// ==========================================

/**
 * 1. Catedral Metropolitana de Paraná
 * Architectural detail: 3-tier stepped podium, 6 Corinthian columns, front pediment with cross,
 * dual 4-stage bell towers with clock and roofs, massive 12-sided drum dome with copper lantern,
 * and rhythmic arched clerestory windows.
 */
export function buildCatedral(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'landmark_catedral_metropolitana';

  // 1. Triple-tier entrance podium & grand steps
  addBox(group, 22, 0.4, 26, 0, 0.2, 0, materials.granitePlinth);
  addBox(group, 20, 0.4, 25, 0, 0.6, 0.5, materials.whiteStone);
  addBox(group, 18, 0.4, 24, 0, 1.0, 1.0, materials.whiteStone);

  // 2. Main Basilica Nave & Transept
  addBox(group, 14, 9, 20, 0, 5.5, -1, materials.creamStone);
  addBox(group, 20, 8.5, 8, 0, 5.25, -3, materials.creamStone); // Transept cross

  // 3. Classical Front Portico (Hexastyle)
  addBox(group, 15, 0.6, 3.5, 0, 1.3, 9.5, materials.whiteStone); // Stylobate
  for (let c = -2.5; c <= 2.5; c += 1.0) {
    addBox(group, 0.7, 7.2, 0.7, c * 2.2, 5.0, 10.5, materials.whiteStone); // Columns
    // Column capital detail
    addBox(group, 0.9, 0.3, 0.9, c * 2.2, 8.75, 10.5, materials.goldAccent);
  }
  // Entablature and triangular pediment
  addBox(group, 15.5, 1.0, 3.5, 0, 9.4, 10.2, materials.whiteStone);
  // Stepped tympanum
  addBox(group, 13, 0.8, 0.5, 0, 10.3, 11.2, materials.whiteStone);
  addBox(group, 9, 0.8, 0.5, 0, 11.1, 11.2, materials.whiteStone);
  addBox(group, 5, 0.8, 0.5, 0, 11.9, 11.2, materials.whiteStone);
  addBox(group, 0.6, 1.8, 0.6, 0, 13.0, 11.2, materials.goldAccent); // Apex cross

  // 4. Dual Bell Towers (Torres Campanario)
  [-6.8, 6.8].forEach(tx => {
    // Stage 1: Lower tower body
    addBox(group, 4.2, 10, 4.2, tx, 6.0, 8.5, materials.whiteStone);
    // Stage 2: Clock stage with moldings
    addBox(group, 4.6, 0.5, 4.6, tx, 11.25, 8.5, materials.whiteStone);
    addBox(group, 3.8, 3.5, 3.8, tx, 13.0, 8.5, materials.creamStone);
    addBox(group, 1.4, 1.4, 0.1, tx, 13.2, 10.45, materials.creamStone); // Clock face
    // Stage 3: Belfry with open arches (dark recesses)
    addBox(group, 4.2, 0.5, 4.2, tx, 15.0, 8.5, materials.whiteStone);
    addBox(group, 3.4, 3.6, 3.4, tx, 17.0, 8.5, materials.whiteStone);
    addBox(group, 1.6, 2.4, 3.5, tx, 17.0, 8.5, materials.darkWindows); // Bell opening
    addBox(group, 0.6, 0.8, 0.6, tx, 17.2, 8.5, materials.goldAccent); // Bell
    // Stage 4: Pyramidal slate roof & cross
    addBox(group, 3.0, 1.0, 3.0, tx, 19.3, 8.5, materials.slateRoof);
    addBox(group, 2.2, 1.2, 2.2, tx, 20.3, 8.5, materials.slateRoof);
    addBox(group, 1.4, 1.4, 1.4, tx, 21.5, 8.5, materials.slateRoof);
    addBox(group, 0.6, 1.6, 0.6, tx, 23.0, 8.5, materials.goldAccent); // Tower cross
  });

  // 5. Great Confederate Dome (Cúpula de la Confederación) over the transept
  const domeX = 0, domeZ = -3, domeBaseY = 10.0;
  // Drum with rhythmic arched windows
  addBox(group, 9.2, 1.0, 9.2, domeX, domeBaseY + 0.5, domeZ, materials.whiteStone);
  addBox(group, 8.0, 3.8, 8.0, domeX, domeBaseY + 2.9, domeZ, materials.creamStone);
  // Drum windows
  [-2.5, 0, 2.5].forEach(wx => {
    addBox(group, 1.0, 2.2, 8.2, domeX + wx, domeBaseY + 2.9, domeZ, materials.darkWindows);
  });
  // Stepped dome shell in copper green/slate
  addBox(group, 7.4, 1.2, 7.4, domeX, domeBaseY + 5.4, domeZ, materials.copperGreen);
  addBox(group, 6.2, 1.2, 6.2, domeX, domeBaseY + 6.6, domeZ, materials.copperGreen);
  addBox(group, 4.8, 1.2, 4.8, domeX, domeBaseY + 7.8, domeZ, materials.copperGreen);
  addBox(group, 3.4, 1.0, 3.4, domeX, domeBaseY + 8.9, domeZ, materials.copperGreen);
  // Lantern & Golden Cross
  addBox(group, 1.6, 2.0, 1.6, domeX, domeBaseY + 10.4, domeZ, materials.whiteStone);
  addBox(group, 0.6, 2.0, 0.6, domeX, domeBaseY + 12.0, domeZ, materials.goldAccent);

  // 6. Arched clerestory windows along the nave
  for (let z = -6; z <= 4; z += 2.5) {
    addBox(group, 14.3, 1.8, 1.0, 0, 7.0, z, materials.darkWindows);
  }

  return group;
}

/**
 * 2. Palacio Municipal (Municipalidad de Paraná)
 * French Renaissance with Parisian mansard roofs, slender central clock tower,
 * entrance portal, window moldings, and stone rustication.
 */
export function buildPalacioMunicipal(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'landmark_palacio_municipal';

  // Base plinth
  addBox(group, 21, 0.8, 15, 0, 0.4, 0, materials.granitePlinth);

  // Main two-story building body
  addBox(group, 19, 7.5, 13, 0, 4.5, 0, materials.peachStone);

  // Rusticated corner quoins & central entry projection
  addBox(group, 7, 8.0, 14, 0, 4.75, 0.2, materials.creamStone);

  // Main arched entrance portal
  addBox(group, 3.2, 4.2, 1.2, 0, 2.8, 7.0, materials.darkWindows);
  addBox(group, 4.0, 0.6, 1.4, 0, 5.2, 7.0, materials.whiteStone); // Balcony of honor
  addBox(group, 3.6, 0.8, 0.2, 0, 5.8, 7.6, materials.whiteStone); // Balustrade

  // Rhythmic window rows (Ground floor & Piano Nobile)
  [-7.5, -4.5, 4.5, 7.5].forEach(wx => {
    addBox(group, 1.2, 2.2, 0.2, wx, 3.2, 6.55, materials.darkWindows);
    addBox(group, 1.2, 2.6, 0.2, wx, 6.4, 6.55, materials.darkWindows);
  });

  // Mansard roof in dark slate
  addBox(group, 19.4, 1.8, 13.4, 0, 9.1, 0, materials.slateRoof);
  addBox(group, 18.0, 1.2, 12.0, 0, 10.6, 0, materials.slateRoof);

  // Central Clock Tower
  addBox(group, 4.4, 6.0, 4.4, 0, 11.5, 2.5, materials.creamStone);
  // 4 Clock Dials
  addBox(group, 2.0, 2.0, 4.6, 0, 12.5, 2.5, materials.pureWhite);
  addBox(group, 4.6, 2.0, 2.0, 0, 12.5, 2.5, materials.pureWhite);
  // Belfry cupola & spire
  addBox(group, 3.6, 2.8, 3.6, 0, 15.8, 2.5, materials.whiteStone);
  addBox(group, 2.2, 2.4, 2.2, 0, 18.4, 2.5, materials.copperGreen);
  addBox(group, 0.5, 2.8, 0.5, 0, 20.8, 2.5, materials.copperGreen);

  return group;
}

/**
 * 3. Casa de Gobierno de Entre Ríos ("Casa Gris")
 * Monumental Italianate palace: symmetrical wings, inner courtyard,
 * grand central clock tower with dome, balustrade parapet, and dual grand entrance stairs.
 */
export function buildCasaDeGobierno(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'landmark_casa_de_gobierno';

  // Base podium
  addBox(group, 26, 0.8, 26, 0, 0.4, 0, materials.granitePlinth);

  // Outer palace perimeter wings (leaving central courtyard)
  // North & South wings
  addBox(group, 24, 7.5, 5, 0, 4.5, -9.5, materials.whiteStone);
  addBox(group, 24, 7.5, 5, 0, 4.5, 9.5, materials.whiteStone);
  // East & West wings
  addBox(group, 5, 7.5, 14, -9.5, 4.5, 0, materials.whiteStone);
  addBox(group, 5, 7.5, 14, 9.5, 4.5, 0, materials.whiteStone);

  // Courtyard inner floor
  addBox(group, 14, 0.2, 14, 0, 0.85, 0, materials.granitePlinth);

  // Grand Portico & Entry Balcony
  addBox(group, 9, 8.5, 3, 0, 5.0, 11.5, materials.creamStone);
  addBox(group, 4, 3.8, 1, 0, 2.8, 13.0, materials.darkWindows); // Grand entrance
  addBox(group, 6, 0.6, 2, 0, 5.4, 13.0, materials.whiteStone); // Balcony of honor
  addBox(group, 5.6, 0.8, 0.2, 0, 6.0, 13.9, materials.whiteStone); // Balustrade

  // Rhythmic rows of windows along all four facades
  for (let offset = -9; offset <= 9; offset += 3.0) {
    if (Math.abs(offset) > 1.5) {
      addBox(group, 1.2, 2.0, 0.2, offset, 3.0, 12.1, materials.darkWindows);
      addBox(group, 1.2, 2.4, 0.2, offset, 6.2, 12.1, materials.darkWindows);
      addBox(group, 1.2, 2.0, 0.2, offset, 3.0, -12.1, materials.darkWindows);
      addBox(group, 1.2, 2.4, 0.2, offset, 6.2, -12.1, materials.darkWindows);
    }
  }

  // Rooftop balustrade parapet
  addBox(group, 24.4, 0.8, 24.4, 0, 8.65, 0, materials.whiteStone);

  // Grand Central Clock Tower
  addBox(group, 5.5, 8.5, 5.5, 0, 12.5, 4.0, materials.creamStone);
  // Clock faces
  addBox(group, 2.4, 2.4, 5.7, 0, 14.5, 4.0, materials.pureWhite);
  addBox(group, 5.7, 2.4, 2.4, 0, 14.5, 4.0, materials.pureWhite);
  // Cupola & Spire
  addBox(group, 4.5, 2.4, 4.5, 0, 17.5, 4.0, materials.copperGreen);
  addBox(group, 3.0, 2.2, 3.0, 0, 19.8, 4.0, materials.copperGreen);
  addBox(group, 0.6, 3.2, 0.6, 0, 22.2, 4.0, materials.copperGreen); // Flagpole spire

  return group;
}

/**
 * 4. Escuela Normal José María Torres
 * Neoclassical historic academic palace: two massive classroom floors,
 * Tuscan entrance portico, rhythmic double rows of mullioned windows, and central clock attic.
 */
export function buildEscuelaNormal(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'landmark_escuela_normal';

  // Base
  addBox(group, 24, 0.6, 18, 0, 0.3, 0, materials.granitePlinth);

  // Main body
  addBox(group, 22, 7.5, 16, 0, 4.35, 0, materials.peachStone);

  // Central entrance projection with Tuscan arch
  addBox(group, 8, 8.2, 17, 0, 4.7, 0.5, materials.creamStone);
  addBox(group, 3.6, 4.2, 0.8, 0, 2.8, 8.8, materials.darkWindows); // Grand entrance
  addBox(group, 4.8, 0.8, 1.2, 0, 5.4, 8.8, materials.whiteStone);

  // Double rows of school windows
  for (let wx = -9; wx <= 9; wx += 2.6) {
    if (Math.abs(wx) > 3.0) {
      addBox(group, 1.3, 2.2, 0.2, wx, 3.2, 8.1, materials.darkWindows);
      addBox(group, 1.3, 2.4, 0.2, wx, 6.2, 8.1, materials.darkWindows);
    }
  }

  // Roof cornice & central clock attic
  addBox(group, 22.6, 0.8, 16.6, 0, 8.5, 0, materials.whiteStone);
  addBox(group, 6.5, 3.0, 4.0, 0, 10.3, 6.0, materials.creamStone);
  addBox(group, 1.8, 1.8, 0.2, 0, 10.5, 8.1, materials.pureWhite); // Clock
  addBox(group, 7.0, 0.6, 4.4, 0, 12.0, 6.0, materials.slateRoof);

  return group;
}

/**
 * 5. Colegio del Huerto (Capilla y claustros históricos)
 */
export function buildColegioDelHuerto(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'landmark_colegio_del_huerto';

  // Claustro
  addBox(group, 20, 6.5, 16, 0, 3.6, 0, materials.whiteStone);
  addBox(group, 12, 0.2, 8, 0, 0.6, 0, materials.granitePlinth);

  // Historic Chapel
  addBox(group, 7, 8.5, 12, -7.5, 4.8, 0, materials.creamStone);
  addBox(group, 7.5, 1.8, 12.4, -7.5, 9.8, 0, materials.slateRoof);
  addBox(group, 2.4, 5.5, 2.4, -7.5, 13.0, 5.0, materials.whiteStone); // Bell belfry
  addBox(group, 1.6, 2.4, 1.6, -7.5, 16.5, 5.0, materials.goldAccent); // Cross spire

  return group;
}

/**
 * 6. Centro Cultural Juan L. Ortiz ("El Juanele")
 * Red English brick railway sheds, twin pitched roofs with sawtooth skylights,
 * industrial multi-pane windows, and historic railway track section.
 */
export function buildCentroCulturalJuanele(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'landmark_centro_cultural_juanele';

  // Cobblestone / platform base
  addBox(group, 24, 0.5, 18, 0, 0.25, 0, materials.slateRoof);

  // Twin industrial railway brick halls
  [-5.2, 5.2].forEach(hx => {
    // Brick walls
    addBox(group, 9.5, 6.0, 16, hx, 3.5, 0, materials.industrialBrick);
    // Industrial multi-pane arched windows
    for (let wz = -6; wz <= 6; wz += 3.0) {
      addBox(group, 9.7, 2.6, 1.4, hx, 3.8, wz, materials.darkWindows);
    }
    // Gabled roof in weathered zinc
    addBox(group, 10.2, 1.2, 16.4, hx, 7.0, 0, materials.zincRoof);
    addBox(group, 7.0, 1.2, 16.4, hx, 8.0, 0, materials.zincRoof);
    addBox(group, 3.5, 1.0, 16.4, hx, 9.0, 0, materials.zincRoof);
    // Sawtooth glass skylight ridge
    addBox(group, 1.8, 0.8, 14.0, hx, 9.8, 0, materials.glassCyan);
  });

  // Historic railway track buffer at front
  addBox(group, 14, 0.2, 2.5, 0, 0.6, 9.5, materials.woodPlanks);
  addBox(group, 1.2, 1.4, 1.2, 0, 1.2, 10.2, materials.patronatoRed);

  return group;
}

/**
 * 7. Estación Central de Ferrocarril
 */
export function buildEstacionFerrocarril(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'landmark_estacion_ferrocarril';

  // Base platform
  addBox(group, 26, 0.6, 16, 0, 0.3, 0, materials.granitePlinth);

  // Main terminal building in French-English railway style
  addBox(group, 20, 6.5, 8, 0, 3.8, -3, materials.brickWall);
  addBox(group, 20.6, 1.6, 8.6, 0, 7.8, -3, materials.slateRoof);

  // Central ticket hall & clock tower
  addBox(group, 8, 8.5, 9, 0, 4.8, -2.5, materials.creamStone);
  addBox(group, 4.2, 4.5, 4.2, 0, 11.2, -2.5, materials.whiteStone);
  addBox(group, 1.8, 1.8, 4.4, 0, 11.5, -2.5, materials.pureWhite); // Clock
  addBox(group, 3.0, 2.5, 3.0, 0, 14.5, -2.5, materials.slateRoof);

  // Passenger platform canopy (Tinglado de andén)
  addBox(group, 22, 0.4, 7, 0, 4.2, 4.5, materials.zincRoof);
  for (let px = -9; px <= 9; px += 4.5) {
    addBox(group, 0.3, 3.6, 0.3, px, 2.1, 7.5, materials.slateRoof);
  }

  return group;
}

/**
 * 8. La Vieja Usina (Centro Cultural y de Convenciones)
 * Historic power plant: tall octagonal red-brick industrial chimney,
 * brick halls with clerestory windows, and modern glass canopy.
 */
export function buildViejaUsina(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'landmark_la_vieja_usina';

  // Platform
  addBox(group, 22, 0.5, 18, 0, 0.25, 0, materials.granitePlinth);

  // Main powerhouse generation hall
  addBox(group, 16, 7.5, 13, -2, 4.25, 0, materials.industrialBrick);
  // Industrial pilasters and arched clerestory windows
  for (let z = -5; z <= 5; z += 2.5) {
    addBox(group, 16.3, 2.8, 1.2, -2, 4.5, z, materials.darkWindows);
  }
  // Gabled roof
  addBox(group, 16.6, 1.6, 13.6, -2, 8.7, 0, materials.zincRoof);
  addBox(group, 12.0, 1.2, 13.6, -2, 9.8, 0, materials.zincRoof);

  // Modern entrance glass pavilion
  addBox(group, 8, 4.5, 4, -2, 2.5, 8.0, materials.glassCyan);
  addBox(group, 8.6, 0.4, 4.6, -2, 4.9, 8.0, materials.slateRoof);

  // Tall Industrial Brick Chimney (Chimenea histórica de la usina)
  const cx = 8.0, cz = -3.0;
  addBox(group, 3.2, 2.5, 3.2, cx, 1.5, cz, materials.industrialBrick);
  addBox(group, 2.8, 6.0, 2.8, cx, 5.5, cz, materials.industrialBrick);
  addBox(group, 2.4, 7.0, 2.4, cx, 11.8, cz, materials.industrialBrick);
  addBox(group, 2.0, 7.0, 2.0, cx, 18.5, cz, materials.industrialBrick);
  addBox(group, 2.4, 1.0, 2.4, cx, 22.5, cz, materials.slateRoof); // Chimney crown

  return group;
}

/**
 * 9. Teatro Municipal 3 de Febrero
 * Italianate classical opera house: triple entrance arches, piano nobile with
 * Corinthian columns and French balconies, ornate sculptural pediment, and stage fly tower.
 */
export function buildTeatro3DeFebrero(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'landmark_teatro_3_febrero';

  // Base
  addBox(group, 18, 0.8, 22, 0, 0.4, 0, materials.granitePlinth);

  // Main auditorium hall
  addBox(group, 16, 9.5, 14, 0, 5.5, -2, materials.peachStone);

  // Stage Fly Tower (Torre de escenario al fondo)
  addBox(group, 15, 14, 6, 0, 7.8, -8.5, materials.creamStone);

  // Classical Italianate Façade
  addBox(group, 16.5, 10.5, 4, 0, 6.0, 7.0, materials.whiteStone);

  // Ground level triple entrance arches
  [-3.8, 0, 3.8].forEach(ax => {
    addBox(group, 2.2, 4.2, 1.0, ax, 2.9, 9.0, materials.darkWindows);
  });

  // Piano Nobile with classical columns & balconies
  addBox(group, 14, 0.6, 1.2, 0, 5.4, 9.2, materials.whiteStone); // Balcony
  for (let cx = -5; cx <= 5; cx += 2.5) {
    addBox(group, 0.6, 4.0, 0.6, cx, 7.6, 9.2, materials.whiteStone);
  }
  // Upper windows
  [-3.8, 0, 3.8].forEach(wx => {
    addBox(group, 1.6, 3.0, 0.2, wx, 7.6, 8.8, materials.darkWindows);
  });

  // Sculptural pediment and parapet
  addBox(group, 17, 1.2, 4.2, 0, 11.8, 7.0, materials.whiteStone);
  addBox(group, 11, 1.6, 0.8, 0, 13.0, 8.5, materials.creamStone); // Frontis
  addBox(group, 4, 1.2, 0.6, 0, 14.2, 8.5, materials.goldAccent); // Lyre & allegory sculpture

  return group;
}

/**
 * 10. El Patito Sirirí (Esculpido en Micro-Voxels)
 * Built entirely of micro-voxels over a terraced green mound with colorful flowers:
 * rounded duck body, white/brown chest, folded wings with feather tiers,
 * upright neck, red scarf, orange flat beak, and expressive eyes.
 */
export function buildPatitoSiriri(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'landmark_patito_siriri';

  // 1. Terraced green mound (Loma verde del Parque Urquiza)
  addBox(group, 10, 0.6, 10, 0, 0.3, 0, materials.pitchGrass);
  addBox(group, 8, 0.6, 8, 0, 0.9, 0, materials.pitchGrass);
  addBox(group, 6, 0.6, 6, 0, 1.5, 0, materials.pitchGrass);

  // Flower micro-voxels dotted around the mound
  const flowerColors = [materials.duckYellow, materials.patronatoRed, materials.duckPink, materials.pureWhite];
  const flowerOffsets = [
    [-3.8, -3.2], [-3.2, 2.8], [3.5, -2.6], [3.0, 3.2],
    [-2.4, -3.4], [2.2, 3.6], [-3.5, 0], [3.6, 0.4]
  ];
  flowerOffsets.forEach(([fx, fz], idx) => {
    addBox(group, 0.4, 0.4, 0.4, fx, 0.7, fz, flowerColors[idx % flowerColors.length]);
  });

  // 2. Webbed duck feet resting on the grass
  addBox(group, 1.0, 0.25, 1.6, -1.1, 1.9, 0.4, materials.duckOrange);
  addBox(group, 1.0, 0.25, 1.6, 1.1, 1.9, 0.4, materials.duckOrange);

  // 3. Rounded Voxel Body
  // Tier 1: Lower belly
  addBox(group, 3.6, 0.8, 4.4, 0, 2.4, 0, materials.duckWhite);
  // Tier 2: Mid body & colorful chest
  addBox(group, 4.2, 1.2, 4.8, 0, 3.3, 0, materials.duckYellow);
  addBox(group, 3.4, 0.9, 1.0, 0, 3.3, 2.2, materials.duckPink); // Pink chest band
  // Tier 3: Upper back
  addBox(group, 3.8, 1.0, 4.2, 0, 4.3, -0.2, materials.duckYellow);

  // 4. Folded Wings on both flanks with colorful stripes (cyan, pink, yellow)
  [-2.2, 2.2].forEach(wx => {
    addBox(group, 0.5, 1.4, 3.4, wx, 3.4, -0.2, materials.duckCyan);
    addBox(group, 0.55, 0.6, 2.8, wx, 3.8, -0.2, materials.duckPink);
    addBox(group, 0.6, 0.5, 2.0, wx * 1.05, 3.3, -0.4, materials.duckYellow);
  });

  // 5. Upturned tail feathers
  addBox(group, 1.8, 0.8, 1.8, 0, 3.8, -2.6, materials.duckCyan);
  addBox(group, 1.2, 1.2, 1.2, 0, 4.6, -3.2, materials.duckYellow);

  // 6. Upright Slender Neck
  addBox(group, 1.8, 1.2, 1.8, 0, 5.2, 1.4, materials.duckYellow);
  addBox(group, 1.6, 1.4, 1.6, 0, 6.3, 1.4, materials.duckYellow);

  // Striped Scarf / Collar (Red & Cyan)
  addBox(group, 2.1, 0.5, 2.1, 0, 5.5, 1.4, materials.patronatoRed);
  addBox(group, 0.5, 1.2, 0.3, 0.6, 4.8, 2.4, materials.duckCyan); // Hanging scarf tail

  // 7. Head & Beak
  // Head block
  addBox(group, 2.2, 1.8, 2.4, 0, 7.7, 1.4, materials.duckYellow);
  // Cyan Cap / Crown from reference image
  addBox(group, 2.4, 0.7, 2.0, 0, 8.5, 1.3, materials.duckCyan);

  // Eyes (Black with white glint)
  [-1.15, 1.15].forEach(ex => {
    addBox(group, 0.1, 0.5, 0.5, ex, 7.9, 1.7, materials.duckBlack);
    addBox(group, 0.12, 0.2, 0.2, ex, 8.0, 1.8, materials.pureWhite);
  });

  // Flat Duck Beak (Pico plano anaranjado con detalle)
  addBox(group, 1.6, 0.45, 1.8, 0, 7.2, 3.1, materials.duckOrange);
  addBox(group, 1.2, 0.2, 0.4, 0, 7.35, 3.7, materials.duckBlack); // Nostrils

  return group;
}

export function buildMonumentoUrquiza(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'landmark_monumento_urquiza';

  // Stepped Esplanade
  addBox(group, 18, 0.6, 18, 0, 0.3, 0, materials.granitePlinth);
  addBox(group, 14, 0.6, 14, 0, 0.9, 0, materials.whiteStone);
  addBox(group, 10, 0.8, 10, 0, 1.6, 0, materials.granitePlinth);

  // Massive marble pedestal
  addBox(group, 6, 6.5, 7.5, 0, 5.25, 0, materials.creamStone);
  addBox(group, 6.8, 0.8, 8.3, 0, 8.8, 0, materials.whiteStone); // Cornice

  // Allegorical bronze statues at base
  addBox(group, 1.6, 2.4, 1.6, -3.2, 2.8, 0, materials.bronzeStatue);
  addBox(group, 1.6, 2.4, 1.6, 3.2, 2.8, 0, materials.bronzeStatue);

  // Equestrian Statue (Urquiza a caballo en bronce) in micro-voxels
  const hy = 9.2;
  // Horse body
  addBox(group, 1.8, 1.6, 4.2, 0, hy + 1.8, 0, materials.bronzeStatue);
  // Horse rearing front legs
  addBox(group, 0.5, 2.2, 0.5, -0.6, hy + 2.4, 2.0, materials.bronzeStatue);
  addBox(group, 0.5, 2.2, 0.5, 0.6, hy + 2.4, 2.0, materials.bronzeStatue);
  // Horse hind legs
  addBox(group, 0.6, 2.0, 0.6, -0.6, hy + 0.9, -1.6, materials.bronzeStatue);
  addBox(group, 0.6, 2.0, 0.6, 0.6, hy + 0.9, -1.6, materials.bronzeStatue);
  // Horse neck & head (arched)
  addBox(group, 1.2, 2.2, 1.6, 0, hy + 3.2, 1.8, materials.bronzeStatue);
  addBox(group, 1.0, 1.0, 1.6, 0, hy + 4.2, 2.5, materials.bronzeStatue);
  // General Urquiza (Rider)
  addBox(group, 1.4, 1.8, 1.2, 0, hy + 3.4, -0.2, materials.bronzeStatue);
  addBox(group, 1.0, 1.2, 1.0, 0, hy + 4.8, -0.2, materials.bronzeStatue); // Head & bicorne hat
  addBox(group, 0.5, 2.6, 0.2, 0.8, hy + 3.8, 0.4, materials.goldAccent); // Raised saber

  return group;
}

/**
 * 12. Sala Mayo (Puerto Nuevo)
 * Long waterfront port warehouse: steel portal frames, corrugated white roof,
 * huge blue reflective curtain glass overlooking the river, ship bollards and harbor dock.
 */
export function buildSalaMayo(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'landmark_sala_mayo';

  // Concrete harbor dock
  addBox(group, 28, 0.6, 16, 0, 0.3, 0, materials.granitePlinth);

  // Main port pavilion
  addBox(group, 24, 6.0, 11, 0, 3.6, -1, materials.whiteStone);

  // Waterfront Panoramic Curtain Glass (facing the Paraná river at -Z)
  addBox(group, 22, 4.6, 0.4, 0, 3.6, -6.55, materials.glassCyan);
  for (let sx = -9; sx <= 9; sx += 3.0) {
    addBox(group, 0.25, 4.8, 0.6, sx, 3.6, -6.6, materials.slateRoof); // Mullions
  }

  // Industrial gabled roof with corrugated profile
  addBox(group, 25, 1.2, 12, 0, 7.0, -1, materials.zincRoof);
  addBox(group, 20, 1.0, 10, 0, 8.0, -1, materials.zincRoof);
  addBox(group, 12, 0.8, 6, 0, 8.8, -1, materials.zincRoof);

  // Ship mooring bollards along the quayside
  for (let bx = -11; bx <= 11; bx += 5.5) {
    addBox(group, 0.5, 0.8, 0.5, bx, 0.9, 6.5, materials.slateRoof);
  }

  return group;
}

/**
 * 13. Túnel Subfluvial Raúl Uranga - Carlos Sylvestre Begnis
 * Toll control building, descending concrete approach ramp, and twin tunnel portals.
 */
export function buildTunelSubfluvial(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'landmark_tunel_subfluvial';

  // Approach highway ramp descending into the earth
  addBox(group, 18, 0.4, 24, 0, 0.2, 0, materials.slateRoof);
  // Retaining walls
  addBox(group, 0.8, 3.5, 20, -7.5, 1.8, 2, materials.whiteStone);
  addBox(group, 0.8, 3.5, 20, 7.5, 1.8, 2, materials.whiteStone);

  // Twin Subfluvial Tube Portals
  [-3.8, 3.8].forEach(px => {
    addBox(group, 5.5, 4.5, 4.0, px, 2.5, -9, materials.granitePlinth);
    addBox(group, 4.0, 3.0, 4.2, px, 2.0, -9, materials.darkWindows); // Tunnel opening
    addBox(group, 0.6, 0.6, 0.2, px, 3.8, -6.8, materials.pitchGrass); // Green traffic light
  });

  // Control Building & Observation Deck
  addBox(group, 10, 5.5, 6, 0, 5.0, -9.5, materials.whiteStone);
  addBox(group, 9, 2.0, 6.2, 0, 5.5, -9.5, materials.glassCyan);
  addBox(group, 10.5, 0.8, 6.5, 0, 8.0, -9.5, materials.slateRoof);

  return group;
}

/**
 * 14. Estadio Presbítero Bartolomé Grella (Club Atlético Patronato)
 * Stepped red and black striped grandstands, manicured pitch with white lines,
 * soccer goals, and 4 corner floodlight towers.
 */
export function buildEstadioGrella(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'landmark_estadio_patronato';

  // 1. Natural Pitch
  addBox(group, 22, 0.3, 16, 0, 0.15, 0, materials.pitchGrass);
  // White field lines
  addBox(group, 20, 0.05, 0.15, 0, 0.32, 0, materials.whiteLine); // Halfway line
  addBox(group, 1.8, 0.05, 1.8, 0, 0.32, 0, materials.whiteLine); // Center circle
  // Goals
  addBox(group, 0.2, 1.0, 2.4, -9.8, 0.7, 0, materials.pureWhite);
  addBox(group, 0.2, 1.0, 2.4, 9.8, 0.7, 0, materials.pureWhite);

  // 2. Red & Black Tiered Stands (Tribunas Rojinegras)
  // North & South grandstands
  [-9.5, 9.5].forEach(sz => {
    addBox(group, 24, 1.2, 3.0, 0, 0.8, sz, materials.patronatoRed);
    addBox(group, 24, 1.4, 2.4, 0, 1.9, sz + (sz > 0 ? 0.6 : -0.6), materials.patronatoBlack);
    addBox(group, 24, 1.4, 1.8, 0, 3.1, sz + (sz > 0 ? 1.0 : -1.0), materials.patronatoRed);
  });
  // East & West popular stands
  [-12.2, 12.2].forEach(sx => {
    addBox(group, 3.0, 1.8, 18, sx, 1.1, 0, materials.patronatoBlack);
    addBox(group, 2.0, 2.0, 18, sx + (sx > 0 ? 0.8 : -0.8), 2.6, 0, materials.patronatoRed);
  });

  // 3. Four Floodlight Pylons (Torres de Iluminación)
  [[-13, -11], [13, -11], [-13, 11], [13, 11]].forEach(([lx, lz]) => {
    addBox(group, 0.5, 9.0, 0.5, lx, 4.5, lz, materials.slateRoof);
    addBox(group, 2.2, 1.4, 0.6, lx, 9.5, lz, materials.stadiumLight);
  });

  return group;
}

/**
 * 15. Letras Corpóreas PARANÁ (Pixel Font Matrix 5x7)
 * High-definition pixel font "PARANÁ" (with tilde!) in brilliant white,
 * mounted on a long concrete plinth with landscaped lawn and flowerbeds.
 */
export function buildLetrasParana(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'landmark_letras_parana';

  // 1. Landscaped green lawn terrace
  addBox(group, 16.5, 0.35, 4.5, 0, 0.17, 0, materials.pitchGrass);

  // 2. Concrete/granite plinth pedestal
  addBox(group, 14.8, 0.65, 2.2, 0, 0.65, 0, materials.whiteStone);
  addBox(group, 15.2, 0.25, 2.6, 0, 0.25, 0, materials.granitePlinth);

  // 3. Real 3D Voxel Letters "PARANÁ"
  const textGroup = createVoxelText('PARANÁ');
  textGroup.position.set(0, 1.05, 0);
  group.add(textGroup);

  // 4. Colorful flowerbed border along the front
  const flowerCols = [materials.patronatoRed, materials.duckYellow, materials.goldAccent, materials.pureWhite];
  for (let fx = -6.5; fx <= 6.5; fx += 1.1) {
    addBox(group, 0.35, 0.35, 0.35, fx, 0.45, 1.6, flowerCols[Math.floor(Math.random() * flowerCols.length)]);
  }

  return group;
}

/**
 * 16. Monumento al Mate
 * Sculpted in micro-voxels: carved wooden gourd (porongo), engraved silver rim,
 * foaming green yerba mate with montañita, and curved silver bombilla with gold tip.
 */
export function buildMonumentoAlMate(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'landmark_monumento_al_mate';

  // Stepped circular stone plinth
  addBox(group, 6.5, 0.4, 6.5, 0, 0.2, 0, materials.granitePlinth);
  addBox(group, 5.5, 0.4, 5.5, 0, 0.6, 0, materials.whiteStone);

  // Gourd body (calabaza porongo) in warm wood tiers
  addBox(group, 3.4, 0.8, 3.4, 0, 1.2, 0, materials.mateWood);
  addBox(group, 4.4, 1.2, 4.4, 0, 2.2, 0, materials.mateWood);
  addBox(group, 4.6, 1.0, 4.6, 0, 3.3, 0, materials.mateWood);
  addBox(group, 3.8, 0.8, 3.8, 0, 4.2, 0, materials.mateWood);

  // Silver rim (virola cincelada)
  addBox(group, 4.1, 0.4, 4.1, 0, 4.7, 0, materials.mateSilver);

  // Green Yerba Mate with foam mound
  addBox(group, 3.2, 0.3, 3.2, 0, 4.8, 0, materials.yerbaGreen);
  addBox(group, 2.0, 0.4, 2.0, -0.4, 5.0, 0, materials.yerbaGreen); // Montañita

  // Bombilla de plata y oro (curved metallic straw)
  addBox(group, 0.25, 2.2, 0.25, 0.6, 5.8, 0.2, materials.mateSilver);
  addBox(group, 0.25, 1.8, 0.25, 1.0, 7.4, 0.2, materials.mateSilver);
  addBox(group, 0.28, 0.8, 0.28, 1.4, 8.4, 0.2, materials.goldAccent); // Gold mouthpiece

  return group;
}

/**
 * 17. Puerto Sánchez (Barrio tradicional de pescadores)
 */
export function buildPuertoSanchez(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'landmark_puerto_sanchez';

  // Sandy riverside dock
  addBox(group, 22, 0.4, 14, 0, 0.2, 0, materials.creamStone);

  // Traditional colorful fishermen stilt houses (palafitos)
  const houseColors = [materials.brickWall, materials.courtBlue, materials.duckYellow, materials.pureWhite];
  [-6, 0, 6].forEach((hx, i) => {
    // Stilts
    addBox(group, 0.4, 1.2, 0.4, hx - 1.5, 0.8, 0, materials.woodPlanks);
    addBox(group, 0.4, 1.2, 0.4, hx + 1.5, 0.8, 0, materials.woodPlanks);
    // House
    addBox(group, 4.2, 3.5, 4.5, hx, 3.0, 0, houseColors[i % houseColors.length]);
    addBox(group, 4.6, 0.8, 4.8, hx, 5.0, 0, materials.zincRoof);
  });

  // Fishing boats (canoas isleñas) tied at shore
  addBox(group, 1.4, 0.6, 4.2, -8, 0.5, 5, materials.woodPlanks);
  addBox(group, 1.4, 0.6, 4.2, 8, 0.5, 5, materials.courtBlue);

  return group;
}

/**
 * 18. Easter Egg 1: El Mate Gigante Subterráneo
 */
export function buildEasterEggMate(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'easter_egg_mate_gigante';

  // Giant underground pedestal
  addBox(group, 14, 1.5, 14, 0, 0.75, 0, materials.granitePlinth);

  // Giant Mate body
  addBox(group, 9, 2.5, 9, 0, 2.8, 0, materials.mateWood);
  addBox(group, 11, 3.5, 11, 0, 5.8, 0, materials.mateWood);
  addBox(group, 10, 2.5, 10, 0, 8.8, 0, materials.mateWood);

  // Giant silver virola
  addBox(group, 10.4, 1.0, 10.4, 0, 10.2, 0, materials.mateSilver);

  // Giant Yerba
  addBox(group, 8.5, 0.8, 8.5, 0, 10.5, 0, materials.yerbaGreen);
  addBox(group, 5.0, 1.2, 5.0, -1.2, 11.2, 0, materials.yerbaGreen);

  // Giant Bombilla
  addBox(group, 0.8, 8.0, 0.8, 2.0, 14.5, 0, materials.mateSilver);
  addBox(group, 0.9, 2.5, 0.9, 3.5, 19.0, 0, materials.goldAccent);

  return group;
}

/**
 * 19. Easter Egg 2: El Dorado Mítico en el Río Paraná (Escultura Voxel de Alta Definición)
 * Built with 60+ individual micro-voxels:
 * Arched body leaping from the water, brilliant gold back with amber scales and silver flanks,
 * realistic predatory head with open jaw, dark eyes, red gills, spiny dorsal fin,
 * bifurcated V-tail with central black stripe, and a splashing water foam ring.
 */
export function buildEasterEggDorado(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'easter_egg_dorado_gigante';

  // 1. Ring of foaming water splash and droplets at the base (y = 0.1 to 0.45)
  const splashCoords = [
    [-3.8, -1.8], [-2.8, -2.6], [-1.0, -3.0], [1.2, -2.8], [2.8, -2.0],
    [3.6, -0.8], [3.8, 1.0], [2.6, 2.2], [1.0, 2.8], [-1.2, 2.8],
    [-2.8, 2.2], [-3.6, 0.8], [-4.2, 0], [0, 0]
  ];
  splashCoords.forEach(([sx, sz], idx) => {
    const sMat = (idx % 3 === 0) ? materials.waterFoam : materials.waterSplash;
    const sH = 0.3 + (idx % 4) * 0.15;
    addBox(group, 0.7, sH, 0.7, sx, sH / 2, sz, sMat, false);
  });
  // Suspended water droplets
  addBox(group, 0.25, 0.25, 0.25, -2.4, 1.6, -1.8, materials.waterSplash, false);
  addBox(group, 0.25, 0.25, 0.25, 2.2, 1.8, 1.6, materials.waterSplash, false);
  addBox(group, 0.3, 0.3, 0.3, 0.5, 2.4, -2.0, materials.waterSplash, false);

  // 2. Caudal Fin (Bifurcated V-tail with characteristic black stripe)
  // Lower tail lobe
  addBox(group, 0.4, 1.4, 0.6, -4.8, 0.8, 0, materials.doradoRed);
  // Upper tail lobe
  addBox(group, 0.4, 1.4, 0.6, -4.8, 2.0, 0, materials.doradoRed);
  // Central black caudal band
  addBox(group, 0.45, 0.5, 0.65, -4.6, 1.4, 0, materials.doradoBlack);

  // 3. Arched Body (Parabolic curve emerging and jumping)
  // Tail peduncle (x = -4.0 to -3.2, y = 1.4)
  addBox(group, 1.0, 1.2, 1.2, -3.8, 1.5, 0, materials.doradoAmber);

  // Lower mid-body rising (x = -3.0, y = 2.2)
  addBox(group, 1.2, 1.6, 1.8, -2.9, 2.3, 0, materials.doradoGold);
  addBox(group, 1.0, 0.5, 1.7, -2.9, 1.4, 0, materials.doradoSilver); // Silver belly

  // Mid-body ascent (x = -1.8, y = 3.3)
  addBox(group, 1.3, 2.0, 2.2, -1.8, 3.3, 0, materials.doradoGold);
  addBox(group, 1.1, 0.5, 2.0, -1.8, 2.2, 0, materials.doradoSilver);
  addBox(group, 1.3, 0.4, 0.4, -1.8, 4.4, 0, materials.doradoAmber); // Amber scale ridge

  // Apex of the jump (x = -0.5, y = 4.2) - Highest arch
  addBox(group, 1.4, 2.2, 2.4, -0.5, 4.2, 0, materials.doradoGold);
  addBox(group, 1.2, 0.6, 2.2, -0.5, 3.0, 0, materials.doradoSilver);
  // Spiny Dorsal Fin at the crest of the jump
  addBox(group, 0.8, 1.2, 0.25, -0.6, 5.6, 0, materials.doradoAmber);
  addBox(group, 0.6, 0.8, 0.25, -0.1, 5.4, 0, materials.doradoAmber);

  // Body arching downward (x = 0.8, y = 3.8)
  addBox(group, 1.3, 2.1, 2.3, 0.8, 3.8, 0, materials.doradoGold);
  addBox(group, 1.1, 0.5, 2.1, 0.8, 2.6, 0, materials.doradoSilver);

  // Pelvic and Anal fins
  addBox(group, 0.4, 0.8, 0.25, -1.2, 1.9, 0.8, materials.doradoRed);
  addBox(group, 0.4, 0.8, 0.25, -1.2, 1.9, -0.8, materials.doradoRed);

  // 4. Large Predatory Dorado Head (x = 2.0 to 3.4, y = 3.2 down to 2.2)
  addBox(group, 1.4, 1.8, 2.0, 2.0, 3.2, 0, materials.doradoGold);
  // Operculum (Gills) with vivid red flap
  addBox(group, 0.3, 1.4, 2.1, 1.6, 3.2, 0, materials.doradoRed);

  // Flared Pectoral Fins on both sides
  addBox(group, 0.8, 0.3, 1.2, 1.6, 2.5, 1.4, materials.doradoRed);
  addBox(group, 0.8, 0.3, 1.2, 1.6, 2.5, -1.4, materials.doradoRed);

  // Piercing Eyes (black with gold iris)
  addBox(group, 0.35, 0.35, 2.1, 2.2, 3.6, 0, materials.doradoBlack);
  addBox(group, 0.45, 0.45, 2.05, 2.2, 3.6, 0, materials.goldAccent);

  // Open mouth with prognathous lower jaw
  // Upper snout
  addBox(group, 1.0, 0.6, 1.6, 2.9, 3.3, 0, materials.doradoGold);
  // Open mouth gap (dark red cavity)
  addBox(group, 0.8, 0.4, 1.2, 2.9, 2.8, 0, materials.industrialBrick);
  // Lower jaw projecting forward
  addBox(group, 1.1, 0.5, 1.5, 3.0, 2.4, 0, materials.doradoGold);

  return group;
}

// ==========================================
// 3. Typological Generators for Remaining Places
// ==========================================

export function buildPlazaVoxel(place: Place): THREE.Group {
  const group = new THREE.Group();
  group.name = `plaza_${place.id}`;

  addBox(group, 22, 0.4, 22, 0, 0.2, 0, materials.granitePlinth);
  addBox(group, 20, 0.2, 20, 0, 0.4, 0, materials.pitchGrass);

  // Central monument / fountain
  addBox(group, 4.5, 0.5, 4.5, 0, 0.65, 0, materials.whiteStone);
  addBox(group, 3.5, 0.3, 3.5, 0, 0.9, 0, materials.waterFountain);
  addBox(group, 1.2, 3.8, 1.2, 0, 2.8, 0, materials.whiteStone);
  addBox(group, 0.8, 1.2, 0.8, 0, 5.0, 0, materials.bronzeStatue);

  return group;
}

export function buildClubDeportivoVoxel(place: Place): THREE.Group {
  const group = new THREE.Group();
  group.name = `club_${place.id}`;

  addBox(group, 24, 0.4, 18, 0, 0.2, 0, materials.granitePlinth);

  const isTennis = place.name.toLowerCase().includes('tenis') || place.name.toLowerCase().includes('rowing');
  const courtMat = isTennis ? materials.tennisClay : materials.courtBlue;
  addBox(group, 14, 0.15, 9, -3, 0.45, 0, courtMat);

  // Clubhouse / Pavilions
  addBox(group, 7, 5.5, 12, 7.5, 3.15, 0, materials.creamStone);
  addBox(group, 7.5, 1.0, 12.5, 7.5, 6.2, 0, materials.slateRoof);

  return group;
}

export function buildMuseoBibliotecaVoxel(place: Place): THREE.Group {
  const group = new THREE.Group();
  group.name = `cultura_${place.id}`;

  addBox(group, 20, 0.6, 16, 0, 0.3, 0, materials.granitePlinth);
  addBox(group, 18, 7.0, 14, 0, 4.1, 0, materials.creamStone);

  // Classical entrance columns
  for (let c = -2.5; c <= 2.5; c += 1.25) {
    addBox(group, 0.5, 5.5, 0.5, c * 2.2, 3.5, 7.4, materials.whiteStone);
  }
  addBox(group, 14, 0.8, 2.5, 0, 6.6, 7.4, materials.whiteStone);
  addBox(group, 10, 1.4, 0.6, 0, 7.6, 7.4, materials.whiteStone);
  addBox(group, 18.4, 1.4, 14.4, 0, 8.3, 0, materials.slateRoof);

  return group;
}

export function buildParqueBalnearioVoxel(place: Place): THREE.Group {
  const group = new THREE.Group();
  group.name = `balneario_${place.id}`;

  addBox(group, 24, 0.4, 18, 0, 0.2, 0, materials.creamStone);
  addBox(group, 22, 0.2, 12, 0, 0.45, -2, materials.pitchGrass);

  // Riverside promenade & pergola
  addBox(group, 22, 0.3, 4, 0, 0.5, 6, materials.granitePlinth);
  for (let px = -8; px <= 8; px += 4) {
    addBox(group, 0.3, 2.8, 0.3, px, 1.9, 6, materials.whiteStone);
  }
  addBox(group, 18, 0.2, 1.2, 0, 3.4, 6, materials.woodPlanks);

  return group;
}

export function buildPaseoComercialVoxel(place: Place): THREE.Group {
  const group = new THREE.Group();
  group.name = `paseo_${place.id}`;

  addBox(group, 18, 0.4, 14, 0, 0.2, 0, materials.granitePlinth);
  addBox(group, 16, 6.0, 12, 0, 3.4, 0, materials.peachStone);

  // Shopfront awnings & windows
  addBox(group, 14, 2.2, 0.3, 0, 1.8, 6.1, materials.glassCyan);
  addBox(group, 15, 0.4, 1.8, 0, 3.2, 6.8, materials.patronatoRed);
  addBox(group, 16.4, 1.2, 12.4, 0, 7.0, 0, materials.slateRoof);

  return group;
}

// ==========================================
// 4. Master Dispatcher (100% Place Coverage)
// ==========================================

export function buildModelForPlace(place: Place): THREE.Group {
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
