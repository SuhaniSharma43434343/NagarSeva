import { prisma } from "../lib/prisma.js";

/**
 * Maximum acceptable distance in meters from a Route segment.
 * Potholes beyond this distance threshold will remain unassigned (routeId = null).
 */
export const MAX_ROUTE_MATCH_DISTANCE_METERS = 1000;

export interface RouteMatchResult {
  routeId: string;
  routeName: string;
  wardId: string;
  distanceMeters: number;
}

/**
 * Calculates the shortest distance in meters from a point (pLat, pLon)
 * to a straight line segment defined by (startLat, startLon) -> (endLat, endLon).
 */
export function pointToSegmentDistanceMeters(
  pLat: number,
  pLon: number,
  startLat: number,
  startLon: number,
  endLat: number,
  endLon: number
): number {
  const latToMeters = 111000;
  const lonToMeters = 111000 * Math.cos(pLat * (Math.PI / 180));

  const px = pLon * lonToMeters;
  const py = pLat * latToMeters;
  const ax = startLon * lonToMeters;
  const ay = startLat * latToMeters;
  const bx = endLon * lonToMeters;
  const by = endLat * latToMeters;

  const dx = bx - ax;
  const dy = by - ay;

  if (dx === 0 && dy === 0) {
    return Math.hypot(px - ax, py - ay);
  }

  let t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy);
  t = Math.max(0, Math.min(1, t));

  const projX = ax + t * dx;
  const projY = ay + t * dy;

  return Math.hypot(px - projX, py - projY);
}

/**
 * Finds the geographically closest Route for given coordinates and optional wardId.
 * Narrows candidate routes by wardId if provided, calculating minimum segment distance.
 */
export async function findRouteByCoordinates(
  latitude: number,
  longitude: number,
  wardId?: string | null
): Promise<RouteMatchResult | null> {
  console.log(`[ROUTE] Looking up route: lat = ${latitude}, lng = ${longitude}, wardId = ${wardId ?? 'N/A'}`);

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    console.warn(`[ROUTE] Invalid coordinates rejected: lat = ${latitude}, lng = ${longitude}`);
    return null;
  }

  // Filter routes by wardId if provided (excluding Ward #99 Outside Coverage Area)
  const whereClause: any = {
    ward: { number: { not: 99 } },
  };
  if (wardId) {
    whereClause.wardId = wardId;
  }

  let candidateRoutes = await prisma.route.findMany({
    where: whereClause,
    include: { ward: true },
  });

  // Fallback: If ward filter yields no routes within threshold, evaluate all registered routes
  if (candidateRoutes.length === 0 && wardId) {
    candidateRoutes = await prisma.route.findMany({
      where: { ward: { number: { not: 99 } } },
      include: { ward: true },
    });
  }

  let bestMatch: RouteMatchResult | null = null;
  let minDistanceMeters = Infinity;

  for (const route of candidateRoutes) {
    const dist = pointToSegmentDistanceMeters(
      latitude,
      longitude,
      route.startLat,
      route.startLon,
      route.endLat,
      route.endLon
    );

    console.log(
      `[ROUTE] Candidate: routeId = ${route.id}, routeName = ${route.name}, distanceMeters = ${Math.round(dist)}m`
    );

    if (dist < minDistanceMeters) {
      minDistanceMeters = dist;
      bestMatch = {
        routeId: route.id,
        routeName: route.name,
        wardId: route.wardId,
        distanceMeters: Math.round(dist),
      };
    }
  }

  if (bestMatch && minDistanceMeters <= MAX_ROUTE_MATCH_DISTANCE_METERS) {
    console.log(
      `[ROUTE] Matched: routeId = ${bestMatch.routeId}, routeName = ${bestMatch.routeName}, distanceMeters = ${bestMatch.distanceMeters}m`
    );
    return bestMatch;
  }

  console.warn(
    `[ROUTE] No matching route: lat = ${latitude}, lng = ${longitude}, wardId = ${wardId ?? 'N/A'} (closest distance: ${Math.round(
      minDistanceMeters
    )}m exceeds max threshold ${MAX_ROUTE_MATCH_DISTANCE_METERS}m)`
  );
  return null;
}

export default {
  findRouteByCoordinates,
  pointToSegmentDistanceMeters,
  MAX_ROUTE_MATCH_DISTANCE_METERS,
};
