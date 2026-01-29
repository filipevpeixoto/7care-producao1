import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn utility', () => {
  it('merges class names correctly', () => {
    const result = cn('p-4', 'bg-red-500');
    expect(result).toBe('p-4 bg-red-500');
  });

  it('handles conditional classes', () => {
    const isActive = true;
    const result = cn('base-class', isActive && 'active-class');
    expect(result).toContain('base-class');
    expect(result).toContain('active-class');
  });

  it('removes falsy values', () => {
    const result = cn('base', false, null, undefined, 'visible');
    expect(result).toBe('base visible');
  });

  it('merges tailwind classes correctly (last wins)', () => {
    const result = cn('p-4', 'p-8');
    expect(result).toBe('p-8');
  });

  it('handles array of classes', () => {
    const result = cn(['flex', 'items-center']);
    expect(result).toContain('flex');
    expect(result).toContain('items-center');
  });

  it('handles object syntax', () => {
    const result = cn({ 'bg-blue-500': true, 'text-white': true, hidden: false });
    expect(result).toContain('bg-blue-500');
    expect(result).toContain('text-white');
    expect(result).not.toContain('hidden');
  });

  it('handles empty inputs', () => {
    const result = cn();
    expect(result).toBe('');
  });

  it('handles mixed inputs', () => {
    const result = cn('base', ['array-class'], { 'object-class': true });
    expect(result).toContain('base');
    expect(result).toContain('array-class');
    expect(result).toContain('object-class');
  });

  it('handles conflicting tailwind modifiers', () => {
    const result = cn('hover:bg-red-500', 'hover:bg-blue-500');
    expect(result).toBe('hover:bg-blue-500');
  });

  it('preserves non-conflicting variants', () => {
    const result = cn('hover:bg-red-500', 'focus:bg-blue-500');
    expect(result).toContain('hover:bg-red-500');
    expect(result).toContain('focus:bg-blue-500');
  });
});
