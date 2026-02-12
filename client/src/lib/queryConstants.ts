/**
 * Standardized staleTime and gcTime constants for React Query.
 *
 * Use these constants instead of inline magic numbers to ensure
 * consistent cache behavior across the application.
 *
 * Guidelines:
 * - REALTIME: Data that must always be fresh (0)
 * - SHORT: Data that changes frequently (30s)
 * - MEDIUM: Normal data (2 min)
 * - LONG: Data that rarely changes (5 min)
 * - STATIC: Configuration/reference data (10 min)
 */

/** staleTime presets (when data is considered stale) */
export const STALE_TIME = {
  /** Always stale — forces refetch on every mount/focus */
  REALTIME: 0,
  /** 30 seconds — for rapidly changing data */
  SHORT: 30 * 1000,
  /** 2 minutes — default for most data */
  MEDIUM: 2 * 60 * 1000,
  /** 5 minutes — for data that changes infrequently */
  LONG: 5 * 60 * 1000,
  /** 10 minutes — for config/reference data */
  STATIC: 10 * 60 * 1000,
} as const;

/** gcTime presets (when inactive cache entries are garbage collected) */
export const GC_TIME = {
  /** 5 minutes */
  SHORT: 5 * 60 * 1000,
  /** 10 minutes — default */
  MEDIUM: 10 * 60 * 1000,
  /** 30 minutes — for rarely accessed data */
  LONG: 30 * 60 * 1000,
} as const;
