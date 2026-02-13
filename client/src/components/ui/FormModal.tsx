/**
 * @fileoverview Reusable modal component for forms
 * @module components/ui/FormModal
 *
 * Wraps Dialog/Sheet with consistent form handling:
 * - Loading/submitting states with disabled buttons
 * - Double-submit protection
 * - Mobile-friendly Sheet on small screens
 * - Consistent header/footer layout
 *
 * @example
 * ```tsx
 * <FormModal
 *   open={isOpen}
 *   onClose={() => setOpen(false)}
 *   title="Criar Usuário"
 *   onSubmit={handleSubmit}
 *   isSubmitting={isPending}
 *   submitLabel="Salvar"
 * >
 *   <Input name="name" />
 * </FormModal>
 * ```
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export interface FormModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Called when the modal should close */
  onClose: () => void;
  /** Modal title */
  title: string;
  /** Optional description below the title */
  description?: string;
  /** Form submit handler */
  onSubmit?: (e: React.FormEvent) => void | Promise<void>;
  /** Whether the form is currently submitting */
  isSubmitting?: boolean;
  /** Whether the form is loading initial data */
  isLoading?: boolean;
  /** Submit button label */
  submitLabel?: string;
  /** Cancel button label */
  cancelLabel?: string;
  /** Submit button variant */
  submitVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  /** Whether to show the footer with submit/cancel buttons */
  showFooter?: boolean;
  /** Whether the submit button should be disabled */
  submitDisabled?: boolean;
  /** CSS class for the content container */
  className?: string;
  /** Content */
  children: React.ReactNode;
}

export function FormModal({
  open,
  onClose,
  title,
  description,
  onSubmit,
  isSubmitting = false,
  isLoading = false,
  submitLabel = 'Salvar',
  cancelLabel = 'Cancelar',
  submitVariant = 'default',
  showFooter = true,
  submitDisabled = false,
  className,
  children,
}: FormModalProps) {
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || isLoading) return; // Double-submit protection
    await onSubmit?.(e);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className={className}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="py-4">{children}</div>

          {showFooter && (
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                {cancelLabel}
              </Button>
              {onSubmit && (
                <Button
                  type="submit"
                  variant={submitVariant}
                  disabled={isSubmitting || isLoading || submitDisabled}
                >
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {submitLabel}
                </Button>
              )}
            </DialogFooter>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default FormModal;
