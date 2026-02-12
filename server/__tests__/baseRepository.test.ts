import { describe, it, expect } from 'vitest';
import {
  createPaginatedResult,
  paginateArray,
  type PaginatedResult,
} from '../repositories/BaseRepository';

describe('createPaginatedResult', () => {
  it('calculates pagination metadata correctly', () => {
    const result: PaginatedResult<string> = createPaginatedResult(
      ['a', 'b', 'c'],
      1,
      10,
      25
    );
    expect(result.data).toEqual(['a', 'b', 'c']);
    expect(result.pagination).toEqual({
      page: 1,
      limit: 10,
      total: 25,
      totalPages: 3,
      hasNext: true,
      hasPrev: false,
    });
  });

  it('last page has hasNext=false', () => {
    const result = createPaginatedResult([1, 2], 3, 10, 25);
    expect(result.pagination.hasNext).toBe(false);
    expect(result.pagination.hasPrev).toBe(true);
    expect(result.pagination.totalPages).toBe(3);
  });

  it('single page', () => {
    const result = createPaginatedResult([1, 2, 3], 1, 10, 3);
    expect(result.pagination.totalPages).toBe(1);
    expect(result.pagination.hasNext).toBe(false);
    expect(result.pagination.hasPrev).toBe(false);
  });

  it('handles zero results', () => {
    const result = createPaginatedResult([], 1, 10, 0);
    expect(result.data).toEqual([]);
    expect(result.pagination.totalPages).toBe(0);
    expect(result.pagination.hasNext).toBe(false);
    expect(result.pagination.hasPrev).toBe(false);
  });

  it('middle page has both hasNext and hasPrev', () => {
    const result = createPaginatedResult(['x'], 2, 1, 3);
    expect(result.pagination.hasNext).toBe(true);
    expect(result.pagination.hasPrev).toBe(true);
  });
});

describe('paginateArray', () => {
  const items = Array.from({ length: 55 }, (_, i) => i + 1);

  it('defaults to page 1, limit 50', () => {
    const result = paginateArray(items);
    expect(result.data.length).toBe(50);
    expect(result.data[0]).toBe(1);
    expect(result.data[49]).toBe(50);
    expect(result.pagination.page).toBe(1);
    expect(result.pagination.limit).toBe(50);
    expect(result.pagination.total).toBe(55);
  });

  it('respects page and limit', () => {
    const result = paginateArray(items, { page: 2, limit: 20 });
    expect(result.data.length).toBe(20);
    expect(result.data[0]).toBe(21);
    expect(result.data[19]).toBe(40);
    expect(result.pagination.page).toBe(2);
    expect(result.pagination.totalPages).toBe(3);
  });

  it('returns partial last page', () => {
    const result = paginateArray(items, { page: 3, limit: 20 });
    expect(result.data.length).toBe(15);
    expect(result.data[0]).toBe(41);
    expect(result.pagination.hasNext).toBe(false);
  });

  it('returns empty for out-of-range page', () => {
    const result = paginateArray(items, { page: 100, limit: 20 });
    expect(result.data).toEqual([]);
    expect(result.pagination.total).toBe(55);
  });

  it('handles empty array', () => {
    const result = paginateArray([], { page: 1, limit: 10 });
    expect(result.data).toEqual([]);
    expect(result.pagination.total).toBe(0);
  });
});
