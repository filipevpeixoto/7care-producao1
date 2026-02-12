/**
 * District Routes - Shared Helpers
 * Common utilities used across district sub-modules
 */

import { sql } from '../../neonConfig';

/**
 * Generate a unique district code from a name.
 * Normalizes the name to a URL-friendly slug, and appends a numeric suffix
 * if the code already exists in the database.
 */
export async function generateUniqueDistrictCode(name: string, baseCode?: string): Promise<string> {
  let finalCode = baseCode;

  if (!finalCode || finalCode.trim() === '') {
    finalCode = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '-')
      .substring(0, 20);
  }

  // Check if code already exists
  const existing = await sql`
    SELECT id FROM districts WHERE code = ${finalCode}
  `;

  if (existing.length > 0) {
    // If code exists, append a numeric suffix
    let counter = 1;
    let newCode = `${finalCode}-${counter}`;
    while (true) {
      const check = await sql`
        SELECT id FROM districts WHERE code = ${newCode}
      `;
      if (check.length === 0) {
        finalCode = newCode;
        break;
      }
      counter++;
      newCode = `${finalCode}-${counter}`;
    }
  }

  return finalCode;
}
