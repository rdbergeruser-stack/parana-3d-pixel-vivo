/**
 * src/lib/geo.ts
 * GIS Projection & Topographic Elevation Engine for Paraná Pixelado
 * 
 * Geographic Center: Plaza 1° de Mayo (-31.7328, -60.5305) -> (0, 0)
 * Units: 1 unit ≈ 10 meters (1 city block ≈ 100m = 10 units)
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

/**
 * Returns the estimated longitude of the Paraná river shoreline at a given latitude.
 * Anything West of this longitude (lng < shoreLng) is the water of Río Paraná.
 */
export function getShorelineLng(lat: number): number {
  if (lat > -31.710) {
    // North of Túnel Subfluvial
    return -60.505;
  }
  if (lat > -31.717) {
    // Puerto Nuevo / Costanera Este (docks reach -60.532)
    const t = (lat - (-31.717)) / 0.007;
    return -60.532 + t * 0.027;
  }
  if (lat > -31.722) {
    // Costanera Baja / Parque Urquiza / Club Náutico
    return -60.542;
  }
  if (lat > -31.730) {
    // Bajada Grande
    return -60.562;
  }
  // South of Bajada Grande
  return -60.565;
}

/**
 * Checks if a given GPS point is in the river or on an island.
 */
export function isWater(lat: number, lng: number): boolean {
  // Islote Curupí & Isla Puente check
  const isCurupi = lat <= -31.717 && lat >= -31.724 && lng <= -60.545 && lng >= -60.552;
  const isPuente = lat <= -31.710 && lat >= -31.718 && lng <= -60.530 && lng >= -60.541;
  if (isCurupi || isPuente) return false;

  // River water is West/North of the shoreline
  return lng < getShorelineLng(lat);
}

/**
 * Calculates voxelized elevation Y for Paraná's real terrain:
 * - Río Paraná e islas: Y = 0
 * - Costanera Baja (Puerto Nuevo, Sala Mayo, Laurencena, Thompson, Bajada Grande): Y = 1
 * - Barrancas del Parque Urquiza (transición escalonada): Y = 2 a Y = 3.5
 * - Meseta urbana / Casco cívico (Plaza 1° de Mayo, centro, barrios altos): Y = 4
 */
export function getElevation(lat: number, lng: number): number {
  // 1. Río Paraná e islas
  const isCurupi = lat <= -31.717 && lat >= -31.724 && lng <= -60.545 && lng >= -60.552;
  const isPuente = lat <= -31.710 && lat >= -31.718 && lng <= -60.530 && lng >= -60.541;
  if (isCurupi || isPuente) {
    return 0.5; // Island sandbar elevation
  }

  const shoreLng = getShorelineLng(lat);
  if (lng < shoreLng) {
    return 0.0; // Water level
  }

  // Distance inland from the shoreline (in degrees of longitude)
  const distFromShore = lng - shoreLng;

  // High barranca bluffs (Patito Sirirí, Mirador de las Letras, Anfiteatro Alto)
  const isHighBarranca = lat >= -31.7225 && lat <= -31.7195 && lng >= -60.5415 && lng <= -60.5380;
  if (isHighBarranca) {
    return 3.5;
  }

  // 2. Costanera Baja (immediately adjacent to the river)
  // Specific coastal lowlands: Thompson, Puerto Nuevo, Balneario Municipal, Bajada Grande
  const isThompson = lat >= -31.720 && lat <= -31.716 && lng >= -60.515 && lng <= -60.505;
  const isPuertoNuevo = lat >= -31.718 && lat <= -31.715 && lng >= -60.532 && lng <= -60.525;
  const isCostaneraBaja = lat >= -31.719 && lat <= -31.717 && lng >= -60.542 && lng <= -60.534;
  const isBajadaGrande = lat >= -31.730 && lat <= -31.726 && lng >= -60.565 && lng <= -60.558;

  if (distFromShore < 0.0018 || isThompson || isPuertoNuevo || isCostaneraBaja || isBajadaGrande) {
    return 1.0;
  }

  // 3. Barrancas del Parque Urquiza (stepped cliff transition)
  const isParqueUrquizaSlope = lat >= -31.726 && lat <= -31.719 && lng >= -60.542 && lng <= -60.535;
  if (isParqueUrquizaSlope) {
    // Step progression from 2.0 to 3.5 based on inland distance
    const t = Math.min(1.0, Math.max(0.0, (lng - (-60.542)) / 0.007));
    if (t < 0.33) return 2.0;
    if (t < 0.66) return 2.75;
    return 3.5;
  }

  // General coastal bluff transition
  if (distFromShore < 0.006) {
    const t = distFromShore / 0.006;
    if (t < 0.35) return 2.0;
    if (t < 0.70) return 3.0;
    return 3.5;
  }

  // 4. Meseta urbana / Casco cívico (Plaza 1° de Mayo, centro, barrios altos)
  return 4.0;
}
