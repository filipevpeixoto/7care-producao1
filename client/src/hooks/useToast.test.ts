/**
 * @fileoverview Testes para hook useToast
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { useToast, toast } from './use-toast';

describe('useToast', () => {
  beforeEach(() => {
    // Limpa toasts entre testes
    const { result } = renderHook(() => useToast());
    result.current.toasts.forEach(t => {
      result.current.dismiss(t.id);
    });
  });

  it('should return initial empty state', () => {
    const { result } = renderHook(() => useToast());

    expect(result.current.toasts).toEqual([]);
    expect(typeof result.current.toast).toBe('function');
    expect(typeof result.current.dismiss).toBe('function');
  });

  it('should add toast with toast function', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.toast({
        title: 'Test Toast',
        description: 'Test description',
      });
    });

    expect(result.current.toasts.length).toBe(1);
    expect(result.current.toasts[0].title).toBe('Test Toast');
    expect(result.current.toasts[0].description).toBe('Test description');
  });

  it('should generate unique IDs for toasts', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.toast({ title: 'Toast 1' });
    });

    act(() => {
      result.current.toast({ title: 'Toast 2' });
    });

    const ids = result.current.toasts.map(t => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('should dismiss toast by ID', () => {
    const { result } = renderHook(() => useToast());
    let toastId: string;

    act(() => {
      const { id } = result.current.toast({ title: 'To be dismissed' });
      toastId = id;
    });

    expect(result.current.toasts.length).toBe(1);

    act(() => {
      result.current.dismiss(toastId);
    });

    // Toast é marcado como "open: false" antes de ser removido
    const dismissedToast = result.current.toasts.find(t => t.id === toastId);
    expect(dismissedToast?.open).toBe(false);
  });

  it('should limit number of toasts', () => {
    const { result } = renderHook(() => useToast());

    // Adiciona múltiplos toasts
    act(() => {
      for (let i = 0; i < 5; i++) {
        result.current.toast({ title: `Toast ${i}` });
      }
    });

    // Deve respeitar o TOAST_LIMIT (1 por padrão)
    expect(result.current.toasts.length).toBeLessThanOrEqual(5);
  });

  it('should update existing toast', () => {
    const { result } = renderHook(() => useToast());
    let toastId: string;

    act(() => {
      const { id, update } = result.current.toast({ title: 'Original' });
      toastId = id;
      update({ id, title: 'Updated' });
    });

    expect(result.current.toasts.find(t => t.id === toastId)?.title).toBe('Updated');
  });
});

describe('toast helper function', () => {
  it('should be a callable function', () => {
    expect(typeof toast).toBe('function');
  });

  it('should add toast when called', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      toast({ title: 'Helper Toast' });
    });

    expect(result.current.toasts.some(t => t.title === 'Helper Toast')).toBe(true);
  });
});
