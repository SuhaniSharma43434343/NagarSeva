import { prisma } from "../lib/prisma.js";

/**
 * Maximum acceptable distance in kilometers from a Ward's reference point/routes.
 * Coordinates beyond this distance (e.g. Surat, Mumbai, or out-of-bounds) will return null.
 */
export const MAX_WARD_MATCH_DISTANCE_KM = 15;

/**
 * Primary reference points for Wards in Vadodara (VMC).
 * Note: These reference points represent geographic centers/landmarks for each Ward.
 * For production-grade boundary matching, official GeoJSON municipal ward polygons should be loaded.
 */
export interface WardReferencePoint {
  wardNumber: number;
  wardName: string;
  latitude: number;
  longitude: number;
}

export const WARD_REFERENCE_POINTS: WardReferencePoint[] = [
  { wardNumber: 1, wardName: "Alkapuri", latitude: 22.3085, longitude: 73.1732 },
  { wardNumber: 2, wardName: "Sayajigunj", latitude: 22.3110, longitude: 73.1875 },
  { wardNumber: 3, wardName: "Manjalpur", latitude: 22.2873, longitude: 73.3616 },
  { wardNumber: 4, wardName: "Karelibaug", latitude: 22.3245, longitude: 73.1950 },
  { wardNumber: 5, wardName: "Waghodia Road", latitude: 22.2965, longitude: 73.2185 },
];

export interface WardMatchResult {
  wardId: string;
  wardName: string;
  wardNumber: number;
  distanceKm: number;
}

/**
 * Calculates Haversine distance in kilometers between two GPS coordinates.
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Finds the matching Ward for given latitude and longitude using Haversine distance proximity.
 * Validates coordinate ranges (-90 <= lat <= 90, -180 <= lon <= 180) and checks against MAX_WARD_MATCH_DISTANCE_KM.
 */
export async function findWardByCoordinates(
  latitude: number,
  longitude: number
): Promise<WardMatchResult | null> {
  console.log(`[WARD] Looking up ward for: lat = ${latitude}, lng = ${longitude}`);

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    console.warn(`[WARD] Invalid coordinates rejected: lat = ${latitude}, lng = ${longitude}`);
    return null;
  }

  // Fetch all registered wards (excluding Ward #99 Outside Coverage Area) and their associated routes from PostgreSQL
  const dbWards = await prisma.ward.findMany({
    where: { number: { not: 99 } },
    include: { routes: true },
  });

  let bestMatch: WardMatchResult | null = null;
  let minDistance = Infinity;

  for (const ward of dbWards) {
    const refCoords: Array<{ lat: number; lon: number }> = [];

    // Collect start and end coordinates of all routes assigned to this ward
    if (ward.routes && ward.routes.length > 0) {
      for (const r of ward.routes) {
        if (Number.isFinite(r.startLat) && Number.isFinite(r.startLon)) {
          refCoords.push({ lat: r.startLat, lon: r.startLon });
        }
        if (Number.isFinite(r.endLat) && Number.isFinite(r.endLon)) {
          refCoords.push({ lat: r.endLat, lon: r.endLon });
        }
      }
    }

    // Add static reference point center for this ward
    const staticRef = WARD_REFERENCE_POINTS.find((ref) => ref.wardNumber === ward.number);
    if (staticRef) {
      refCoords.push({ lat: staticRef.latitude, lon: staticRef.longitude });
    }

    for (const coord of refCoords) {
      const dist = calculateHaversineDistanceKm(latitude, longitude, coord.lat, coord.lon);
      if (dist < minDistance) {
        minDistance = dist;
        bestMatch = {
          wardId: ward.id,
          wardName: ward.name,
          wardNumber: ward.number,
          distanceKm: Math.round(dist * 100) / 100,
        };
      }
    }
  }

  if (bestMatch && minDistance <= MAX_WARD_MATCH_DISTANCE_KM) {
    console.log(
      `[WARD] Matched: wardId = ${bestMatch.wardId}, wardName = ${bestMatch.wardName}, distanceKm = ${bestMatch.distanceKm}km`
    );
    return bestMatch;
  }

  console.warn(
    `[WARD] No matching ward for coordinates: lat = ${latitude}, lng = ${longitude} (closest distance: ${
      Math.round(minDistance * 100) / 100
    }km exceeds max threshold ${MAX_WARD_MATCH_DISTANCE_KM}km)`
  );
  return null;
}

export default {
  findWardByCoordinates,
  calculateHaversineDistanceKm,
  MAX_WARD_MATCH_DISTANCE_KM,
  WARD_REFERENCE_POINTS,
};
