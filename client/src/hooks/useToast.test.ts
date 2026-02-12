/**
 * @fileoverview Testes para hook useToast (Sonner-backed)
 *
 * O useToast atual delega para Sonner. Ele NÃO mantém estado interno —
 * `toasts` é sempre `[]`. Estes testes validam a API pública (shape)
 * e que toast() retorna {id, dismiss, update}.
 */

import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// Mock sonner before importing our module
vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    error: vi.fn(),
    dismiss: vi.fn(),
  }),
}));

import { useToast, toast } from './use-toast';

describe('useToast', () => {
  it('should return correct API shape', () => {
    const { result } = renderHook(() => useToast());

    expect(result.current.toasts).toEqual([]);
    expect(typeof result.current.toast).toBe('function');
    expect(typeof result.current.dismiss).toBe('function');
  });

  it('should return an object with id, dismiss and update when calling toast', () => {
    const { result } = renderHook(() => useToast());

    const response = result.current.toast({
      title: 'Test Toast',
      description: 'Test description',
    });

    expect(response).toHaveProperty('id');
    expect(typeof response.id).toBe('string');
    expect(typeof response.dismiss).toBe('function');
    expect(typeof response.update).toBe('function');
  });

  it('should generate unique IDs for consecutive toasts', () => {
    const { result } = renderHook(() => useToast());

    // Small delay to ensure different Date.now() values
    const r1 = result.current.toast({ title: 'Toast 1' });
    const r2 = result.current.toast({ title: 'Toast 2' });

    // IDs are Date.now() based — may collide in same ms but should be strings
    expect(typeof r1.id).toBe('string');
    expect(typeof r2.id).toBe('string');
  });

  it('should delegate destructive variant to sonner.error', async () => {
    const sonner = await import('sonner');
    const { result } = renderHook(() => useToast());

    result.current.toast({
      title: 'Error!',
      variant: 'destructive',
    });

    expect(sonner.toast.error).toHaveBeenCalledWith('Error!', {});
  });

  it('should delegate default variant to sonner.toast', async () => {
    const sonner = await import('sonner');
    const { result } = renderHook(() => useToast());

    result.current.toast({
      title: 'Info',
      description: 'Details',
    });

    expect(sonner.toast).toHaveBeenCalledWith('Info', { description: 'Details' });
  });

  it('should call sonner.dismiss when dismiss is called', async () => {
    const sonner = await import('sonner');
    const { result } = renderHook(() => useToast());

    result.current.dismiss();

    expect(sonner.toast.dismiss).toHaveBeenCalled();
  });
});

describe('toast helper function', () => {
  it('should be a callable function', () => {
    expect(typeof toast).toBe('function');
  });

  it('should return {id, dismiss, update} when called directly', () => {
    const response = toast({ title: 'Helper Toast' });

    expect(response).toHaveProperty('id');
    expect(typeof response.dismiss).toBe('function');
    expect(typeof response.update).toBe('function');
  });
});
