// Routing & dispatch engine.
//
// Uses a static distance-lookup table indexed by route prefix (the alphabetic
// part of the route identifier) to find the nearest depot zone. The table is
// clearly demonstration data — not real GPS distances.
//
// Algorithm:
//   1. Extract the routing key from a validated route identifier.
//   2. Look up the zone in the distance table.
//   3. If unknown zone → central fallback queue.
//   4. Rank depots by distance for that route prefix.
//   5. For each candidate depot (nearest first):
//        - check remaining capacity (total_capacity - assigned vehicles)
//        - pick an available handler with spare vehicle capacity
//   6. If the nearest depot is full, move to the next nearest.
//   7. If no depot has capacity → waiting queue + escalation.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface DepotDistances {
  // route prefix -> ordered list of [depotId, distance]
  [prefix: string]: Array<{ depotId: string; distance: number }>;
}

export const DISTANCE_TABLE: DepotDistances = {
  // Route prefixes A, B → North zone closest
  A: [
    { depotId: 'D-NORTH', distance: 3 },
    { depotId: 'D-CENTRAL', distance: 7 },
    { depotId: 'D-EAST', distance: 12 },
    { depotId: 'D-WEST', distance: 15 },
    { depotId: 'D-SOUTH', distance: 18 },
  ],
  B: [
    { depotId: 'D-NORTH', distance: 4 },
    { depotId: 'D-CENTRAL', distance: 8 },
    { depotId: 'D-WEST', distance: 13 },
    { depotId: 'D-SOUTH', distance: 16 },
    { depotId: 'D-EAST', distance: 20 },
  ],
  C: [
    { depotId: 'D-SOUTH', distance: 2 },
    { depotId: 'D-CENTRAL', distance: 6 },
    { depotId: 'D-WEST', distance: 10 },
    { depotId: 'D-EAST', distance: 14 },
    { depotId: 'D-NORTH', distance: 19 },
  ],
  D: [
    { depotId: 'D-SOUTH', distance: 5 },
    { depotId: 'D-CENTRAL', distance: 9 },
    { depotId: 'D-EAST', distance: 11 },
    { depotId: 'D-NORTH', distance: 17 },
    { depotId: 'D-WEST', distance: 21 },
  ],
  E: [
    { depotId: 'D-EAST', distance: 3 },
    { depotId: 'D-CENTRAL', distance: 7 },
    { depotId: 'D-NORTH', distance: 11 },
    { depotId: 'D-SOUTH', distance: 15 },
    { depotId: 'D-WEST', distance: 18 },
  ],
  F: [
    { depotId: 'D-EAST', distance: 4 },
    { depotId: 'D-CENTRAL', distance: 8 },
    { depotId: 'D-SOUTH', distance: 12 },
    { depotId: 'D-WEST', distance: 16 },
    { depotId: 'D-NORTH', distance: 20 },
  ],
  G: [
    { depotId: 'D-WEST', distance: 2 },
    { depotId: 'D-CENTRAL', distance: 6 },
    { depotId: 'D-NORTH', distance: 10 },
    { depotId: 'D-SOUTH', distance: 14 },
    { depotId: 'D-EAST', distance: 17 },
  ],
  H: [
    { depotId: 'D-WEST', distance: 5 },
    { depotId: 'D-CENTRAL', distance: 9 },
    { depotId: 'D-SOUTH', distance: 13 },
    { depotId: 'D-NORTH', distance: 16 },
    { depotId: 'D-EAST', distance: 19 },
  ],
};

export const ZONE_OF_DEPOT: Record<string, string> = {
  'D-NORTH': 'North',
  'D-SOUTH': 'South',
  'D-EAST': 'East',
  'D-WEST': 'West',
  'D-CENTRAL': 'Central',
};

export interface RoutingResult {
  success: boolean;
  routePrefix: string;
  zone: string | null;
  rankedDepots: Array<{ depotId: string; distance: number }>;
  selectedDepotId: string | null;
  selectedHandlerId: string | null;
  assignmentType: 'primary' | 'backup' | 'fallback' | null;
  queued: boolean;
  queueReason: string | null;
  steps: string[];
}

export function extractRoutePrefix(routeId: string): string {
  // ROUTEA12 → A,  ROUTEAB01 → AB
  const match = routeId.match(/^ROUTE([A-Z]+)\d{2}$/);
  return match ? match[1] : '';
}

export function getRankedDepots(prefix: string): Array<{ depotId: string; distance: number }> {
  return DISTANCE_TABLE[prefix] ?? [];
}

export function getZoneForPrefix(prefix: string): string | null {
  const ranked = getRankedDepots(prefix);
  if (ranked.length === 0) return null;
  return ZONE_OF_DEPOT[ranked[0].depotId] ?? null;
}
