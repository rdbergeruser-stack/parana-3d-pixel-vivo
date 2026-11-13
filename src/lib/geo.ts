/**
 * src/lib/geo.ts
 * GIS Projection & Topographic Elevation Engine for Paraná Pixelado
 * 
 * Geographic Center: Plaza 1° de Mayo (-31.7328, -60.5305) -> (0, 0)
 * Units: 1 unit ≈ 10 meters (1 city block ≈ 100m = 10 units)
 * Topography: 3x Vertical Exaggeration for Dramatic Paraná Barrancas
 */

export interface Point2D {
  x: number;
  z: number;
}

export interface LatLng {
  lat: number;
  lng: number;
}

// Paraná geographic anchor point (Plaza 1° de Mayo)
export const PARANA_ORIGIN: LatLng = {
  lat: -31.7328,
  lng: -60.5305
};

// Scale conversions (units per degree)
const LAT_SCALE = 11088.0; // 1° lat ≈ 110.88 km -> 11,088 units (0.1 units/m)
const LNG_SCALE = 9468.0;  // 1° lng at 31.73°S ≈ 94.68 km -> 9,468 units (0.1 units/m)

/**
 * Converts real-world GPS coordinates (lat, lng) to 3D world (x, z) coordinates.
 * - +X is East, -X is West (towards the river)
 * - +Z is South, -Z is North (towards the river bend and tunnel)
 */
export function projectTo3D(lat: number, lng: number): Point2D {
  const x = (lng - PARANA_ORIGIN.lng) * LNG_SCALE;
  const z = -(lat - PARANA_ORIGIN.lat) * LAT_SCALE;
  return {
    x: Math.round(x * 10) / 10,
    z: Math.round(z * 10) / 10
  };
}

/**
 * Converts 3D world coordinates (x, z) back to real GPS (lat, lng).
 */
export function unprojectFrom3D(x: number, z: number): LatLng {
  const lng = PARANA_ORIGIN.lng + x / LNG_SCALE;
  const lat = PARANA_ORIGIN.lat - z / LAT_SCALE;
  return {
    lat: Number(lat.toFixed(6)),
    lng: Number(lng.toFixed(6))
  };
}

// ==========================================
// 1. Real Coastal Geometries & Island Masks
// ==========================================

export const ISLOTE_CURUPI_POLYGON: [number, number][] = [
  [-31.7170, -60.5480],
  [-31.7190, -60.5450],
  [-31.7220, -60.5460],
  [-31.7240, -60.5500],
  [-31.7210, -60.5520],
  [-31.7170, -60.5480]
];

export const ISLA_PUENTE_POLYGON: [number, number][] = [
  [-31.7100, -60.5350],
  [-31.7130, -60.5300],
  [-31.7180, -60.5320],
  [-31.7170, -60.5400],
  [-31.7120, -60.5410],
  [-31.7100, -60.5350]
];

/**
 * Strict Mainland Polygon of Paraná
 * Traces the real shoreline from Túnel Subfluvial to Bajada Grande and encloses the city.
 * Any point outside this polygon (and not on Curupí/Puente) is STRICTLY Río Paraná water.
 */
export const PARANA_MAINLAND_POLYGON: [number, number][] = [
  [-31.7067, -60.5050], // Boca Túnel Subfluvial
  [-31.7100, -60.5130], // Punta Thompson norte
  [-31.7135, -60.5180], // Complejo y Playa Thompson
  [-31.7161, -60.5278], // Dársena Puerto Nuevo / Sala Mayo
  [-31.7175, -60.5340], // Monumento al Mate / Costanera Baja
  [-31.7178, -60.5392], // Balneario Municipal
  [-31.7195, -60.5422], // Club Náutico / pie de barranca
  [-31.7225, -60.5450], // Curva Costanera Oeste
  [-31.7250, -60.5530], // Punta Parque Nuevo Varisco
  [-31.7280, -60.5620], // Puerto Histórico Bajada Grande
  [-31.7380, -60.5670], // Bajada Grande sur / Barranca baja
  [-31.7500, -60.5700], // Suroeste río
  [-31.7850, -60.5700], // Límite sur profundo
  [-31.7850, -60.4500], // Límite sureste rural
  [-31.7067, -60.4500], // Límite noreste Acceso Norte
  [-31.7067, -60.5050]  // Cierre en Túnel Subfluvial
];

/**
 * Standard Ray-Casting algorithm for point-in-polygon check
 */
export function isPointInPolygon(point: [number, number], polygon: [number, number][]): boolean {
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

/**
 * Checks if a coordinate is real dry land (mainland or islands).
 */
export function isLand(lat: number, lng: number): boolean {
  // Check islands first
  if (isPointInPolygon([lat, lng], ISLOTE_CURUPI_POLYGON)) return true;
  if (isPointInPolygon([lat, lng], ISLA_PUENTE_POLYGON)) return true;
  // Check mainland
  return isPointInPolygon([lat, lng], PARANA_MAINLAND_POLYGON);
}

/**
 * Checks if a coordinate is strictly in the river water.
 */
export function isWater(lat: number, lng: number): boolean {
  return !isLand(lat, lng);
}

/**
 * Shoreline longitude reference for distance-from-coast interpolation
 */
export function getShorelineLng(lat: number): number {
  if (lat >= -31.7100) return -60.5050;
  if (lat >= -31.7135) {
    const t = (lat - (-31.7135)) / 0.0035;
    return -60.5180 + t * 0.0130;
  }
  if (lat >= -31.7161) {
    const t = (lat - (-31.7161)) / 0.0026;
    return -60.5278 + t * 0.0098;
  }
  if (lat >= -31.7178) {
    const t = (lat - (-31.7178)) / 0.0017;
    return -60.5392 + t * 0.0114;
  }
  if (lat >= -31.7225) {
    const t = (lat - (-31.7225)) / 0.0047;
    return -60.5450 + t * 0.0058;
  }
  if (lat >= -31.7280) {
    const t = (lat - (-31.7280)) / 0.0055;
    return -60.5620 + t * 0.0170;
  }
  return -60.5670;
}

// ==============================================================
// 2. Sculpted Topography with 3x Vertical Exaggeration (Barrancas)
// ==============================================================

/**
 * Calculates voxelized elevation Y for Paraná's real terrain with 3x Vertical Exaggeration:
 * - Río Paraná: Y = 0
 * - Islas (Islote Curupí e Isla Puente): Y = 0.8
 * - Costanera Baja (Puerto Nuevo, Sala Mayo, Laurencena, Thompson, Bajada Grande playa): Y = 1.2
 * - Paredón de la Barranca (Parque Urquiza, Colinas, Bajada Grande): abrupt stepped climb Y = 2.4 -> 4.2 -> 6.0 -> 7.2 -> 8.0
 * - Meseta Alta Urbana (Plaza 1° de Mayo, Catedral, Casa de Gobierno, Av. Ramírez): Y = 8.5 a Y = 9.2
 * - Depresiones de arroyos (Antoñico, Las Viejas): Y = 7.0 a 7.5
 */
export function getElevation(lat: number, lng: number): number {
  // 1. Water check: strictly Y = 0 if not on land
  if (!isLand(lat, lng)) {
    return 0.0;
  }

  // 2. Islands (Curupí & Puente)
  if (isPointInPolygon([lat, lng], ISLOTE_CURUPI_POLYGON) || isPointInPolygon([lat, lng], ISLA_PUENTE_POLYGON)) {
    return 0.8;
  }

  const shoreLng = getShorelineLng(lat);
  const distFromShore = Math.max(0, lng - shoreLng);

  // 3. Costanera Baja Strip (Immediate riverfront promenade & beaches)
  const isThompsonBeach = lat >= -31.7170 && lat <= -31.7125 && lng >= -60.5185 && lng <= -60.5080;
  const isPuertoNuevo = lat >= -31.7175 && lat <= -31.7150 && lng >= -60.5310 && lng <= -60.5260;
  const isCostaneraLaurencena = lat >= -31.7190 && lat <= -31.7170 && lng >= -60.5430 && lng <= -60.5320;
  const isBajadaGrandePort = lat >= -31.7320 && lat <= -31.7270 && lng >= -60.5660 && lng <= -60.5600;

  if (distFromShore < 0.0016 || isThompsonBeach || isPuertoNuevo || isCostaneraLaurencena || isBajadaGrandePort) {
    return 1.2;
  }

  // 4. Dramatic Stepped Cliff Walls (El Paredón de la Barranca)
  // Main Parque Urquiza & Costanera Alta Cliff Corridor
  const isParqueUrquizaCliff = lat >= -31.7265 && lat <= -31.7180 && lng >= -60.5440 && lng <= -60.5335;
  if (isParqueUrquizaCliff) {
    const t = THREE_MathUtils_clamp((lng - (-60.5440)) / 0.0085, 0, 1);
    if (t < 0.20) return 2.4;  // Tier 1 (Costanera Media lower terrace)
    if (t < 0.40) return 4.2;  // Tier 2 (Cascadas / Escalinatas intermedias)
    if (t < 0.65) return 6.0;  // Tier 3 (Rosedal medio)
    if (t < 0.85) return 7.2;  // Tier 4 (Costanera Alta balcón)
    return 8.0;                // Cliff crest (Patito Sirirí / Monumento Urquiza / Anfiteatro)
  }

  // Bajada Grande Cliff Face
  const isBajadaGrandeCliff = lat >= -31.7360 && lat <= -31.7260 && lng >= -60.5660 && lng <= -60.5520;
  if (isBajadaGrandeCliff) {
    const t = THREE_MathUtils_clamp((lng - (-60.5660)) / 0.011, 0, 1);
    if (t < 0.25) return 2.4;
    if (t < 0.50) return 4.5;
    if (t < 0.75) return 6.2;
    return 7.8;
  }

  // Thompson Bluffs
  const isThompsonCliff = lat >= -31.7190 && lat <= -31.7120 && lng >= -60.5180 && lng <= -60.5080;
  if (isThompsonCliff) {
    const t = THREE_MathUtils_clamp((lng - (-60.5180)) / 0.008, 0, 1);
    if (t < 0.35) return 2.4;
    if (t < 0.70) return 5.0;
    return 7.5;
  }

  // General coastal buffer step
  if (distFromShore < 0.0055) {
    const t = distFromShore / 0.0055;
    if (t < 0.30) return 2.4;
    if (t < 0.60) return 4.8;
    if (t < 0.85) return 6.8;
    return 8.0;
  }

  // 5. High Urban Plateau (Meseta Alta Urbana)
  // Arroyo Antoñico natural basin (southwest valley)
  const isArroyoAntonico = lat >= -31.7480 && lat <= -31.7350 && lng >= -60.5500 && lng <= -60.5360;
  if (isArroyoAntonico) {
    return 7.2;
  }

  // Arroyo Las Viejas natural basin (northeast valley)
  const isArroyoLasViejas = lat >= -31.7250 && lat <= -31.7150 && lng >= -60.5120 && lng <= -60.4950;
  if (isArroyoLasViejas) {
    return 7.0;
  }

  // Avenida Ramírez spinal crest & Cinco Esquinas
  const isRamirezRidge = lng >= -60.5240 && lng <= -60.5195;
  if (isRamirezRidge) {
    return 8.8;
  }

  // Southern high plateau (Bv. Racedo, Estación Central, C.C. Juanele, Gazzano)
  if (lat <= -31.7420) {
    return 9.2;
  }

  // Casco Cívico (Plaza 1° de Mayo, Catedral, Casa de Gobierno, Peatonal)
  return 8.5;
}

function THREE_MathUtils_clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
