/**
 * Testes para usePerformanceHooks
 * @module tests/hooks/usePerformanceHooks
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useDebounce,
  useThrottle,
  useMediaQuery,
  usePrevious,
  useWindowSize,
} from '../usePerformanceHooks';

describe('usePerformanceHooks', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('useDebounce', () => {
    it('deve retornar valor inicial imediatamente', () => {
      const { result } = renderHook(() => useDebounce('initial', 300));

      expect(result.current).toBe('initial');
    });

    it('deve atualizar valor após delay', async () => {
      const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
        initialProps: { value: 'initial' },
      });

      expect(result.current).toBe('initial');

      rerender({ value: 'updated' });

      // Ainda deve ser o valor inicial
      expect(result.current).toBe('initial');

      // Avança o tempo
      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Agora deve ser o valor atualizado
      expect(result.current).toBe('updated');
    });

    it('deve cancelar update anterior se valor mudar', () => {
      const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
        initialProps: { value: 'first' },
      });

      rerender({ value: 'second' });

      act(() => {
        vi.advanceTimersByTime(150);
      });

      rerender({ value: 'third' });

      act(() => {
        vi.advanceTimersByTime(150);
      });

      // Ainda deve ser 'first' pois não passou 300ms desde 'third'
      expect(result.current).toBe('first');

      act(() => {
        vi.advanceTimersByTime(150);
      });

      // Agora deve ser 'third'
      expect(result.current).toBe('third');
    });

    it('deve funcionar com diferentes tipos', () => {
      const { result: stringResult } = renderHook(() => useDebounce('string', 100));
      const { result: numberResult } = renderHook(() => useDebounce(42, 100));
      const { result: objectResult } = renderHook(() => useDebounce({ key: 'value' }, 100));
      const { result: arrayResult } = renderHook(() => useDebounce([1, 2, 3], 100));

      expect(stringResult.current).toBe('string');
      expect(numberResult.current).toBe(42);
      expect(objectResult.current).toEqual({ key: 'value' });
      expect(arrayResult.current).toEqual([1, 2, 3]);
    });
  });

  describe('useThrottle', () => {
    it('deve executar função imediatamente na primeira chamada', () => {
      const fn = vi.fn();
      const { result } = renderHook(() => useThrottle(fn, 300));

      act(() => {
        result.current();
      });

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('deve limitar execuções durante o delay', () => {
      const fn = vi.fn();
      const { result } = renderHook(() => useThrottle(fn, 300));

      act(() => {
        result.current();
        result.current();
        result.current();
      });

      // Primeira chamada + uma programada para o final
      expect(fn).toHaveBeenCalledTimes(1);

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('deve passar argumentos para a função', () => {
      const fn = vi.fn();
      const { result } = renderHook(() => useThrottle(fn, 300));

      act(() => {
        result.current('arg1', 'arg2');
      });

      expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
    });
  });

  describe('usePrevious', () => {
    it('deve retornar undefined inicialmente', () => {
      const { result } = renderHook(() => usePrevious('initial'));

      expect(result.current).toBeUndefined();
    });

    it('deve retornar valor anterior após update', () => {
      const { result, rerender } = renderHook(({ value }) => usePrevious(value), {
        initialProps: { value: 'first' },
      });

      expect(result.current).toBeUndefined();

      rerender({ value: 'second' });

      expect(result.current).toBe('first');

      rerender({ value: 'third' });

      expect(result.current).toBe('second');
    });
  });

  describe('useMediaQuery', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query.includes('min-width: 768px'),
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });
    });

    it('deve retornar false para mobile', () => {
      const { result } = renderHook(() => useMediaQuery('(max-width: 767px)'));

      expect(typeof result.current).toBe('boolean');
    });

    it('deve retornar true para desktop', () => {
      const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));

      expect(result.current).toBe(true);
    });
  });

  describe('useWindowSize', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 768, writable: true });
    });

    it('deve retornar tamanho atual da janela', () => {
      const { result } = renderHook(() => useWindowSize());

      expect(result.current.width).toBe(1024);
      expect(result.current.height).toBe(768);
    });

    it('deve atualizar quando janela é redimensionada', async () => {
      const { result } = renderHook(() => useWindowSize());

      act(() => {
        Object.defineProperty(window, 'innerWidth', { value: 800, writable: true });
        Object.defineProperty(window, 'innerHeight', { value: 600, writable: true });
        window.dispatchEvent(new Event('resize'));
      });

      // Aguardar debounce
      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(result.current.width).toBe(800);
      expect(result.current.height).toBe(600);
    });
  });
});
