/**
 * Utility functions for converting between snake_case (DB) and camelCase (TypeScript).
 *
 * Convention:
 * - Database columns use snake_case (e.g. pastor_name, birth_date)
 * - TypeScript/JavaScript code uses camelCase (e.g. pastorName, birthDate)
 * - API adapters should convert at the boundary (server adapters layer)
 */

/**
 * Convert a snake_case string to camelCase
 */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Convert a camelCase string to snake_case
 */
export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * Convert all keys in an object from snake_case to camelCase (shallow)
 */
export function keysToCamel<T extends Record<string, unknown>>(
  obj: T
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    result[snakeToCamel(key)] = obj[key];
  }
  return result;
}

/**
 * Convert all keys in an object from camelCase to snake_case (shallow)
 */
export function keysToSnake<T extends Record<string, unknown>>(
  obj: T
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    result[camelToSnake(key)] = obj[key];
  }
  return result;
}
