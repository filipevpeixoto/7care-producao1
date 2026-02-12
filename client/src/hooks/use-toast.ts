/**
 * Unified Toast Hook — backed by Sonner
 *
 * This file provides backward-compatible `useToast()` and `toast()` APIs
 * that delegate to Sonner. This eliminates the dual toast system
 * (shadcn/radix Toaster + Sonner) by making everything go through Sonner.
 *
 * Consumers that import `useToast` or `toast` from this file continue
 * to work without any changes.
 */

import type React from 'react';
import { toast as sonnerToast } from 'sonner';

interface ToastProps {
  id?: string;
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
  action?: React.ReactNode;
  duration?: number;
}

/**
 * Show a toast notification via Sonner.
 * Accepts the same { title, description, variant } shape as the old shadcn toast.
 */
function toast(props: ToastProps) {
  const message = props.title || props.description || '';
  const opts = props.description && props.title ? { description: props.description } : {};

  if (props.variant === 'destructive') {
    sonnerToast.error(message, opts);
  } else {
    sonnerToast(message, opts);
  }

  return {
    id: String(Date.now()),
    dismiss: () => sonnerToast.dismiss(),
    update: () => {},
  };
}

/**
 * Hook that returns the toast function.
 * Drop-in replacement for the old shadcn useToast() hook.
 */
function useToast() {
  return {
    toast,
    toasts: [] as ToastProps[],
    dismiss: () => sonnerToast.dismiss(),
  };
}

export { useToast, toast };
