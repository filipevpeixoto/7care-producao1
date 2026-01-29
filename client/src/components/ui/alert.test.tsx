import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Alert, AlertTitle, AlertDescription } from './alert';

describe('Alert Components', () => {
  describe('Alert', () => {
    it('renders with children', () => {
      render(<Alert>Alert content</Alert>);
      expect(screen.getByText('Alert content')).toBeInTheDocument();
    });

    it('has role="alert"', () => {
      render(<Alert>Test alert</Alert>);
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('applies default variant styles', () => {
      render(<Alert>Default alert</Alert>);
      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('bg-background');
    });

    it('applies destructive variant', () => {
      render(<Alert variant="destructive">Destructive alert</Alert>);
      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('text-destructive');
    });

    it('applies custom className', () => {
      render(<Alert className="custom-alert">Custom alert</Alert>);
      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('custom-alert');
    });

    it('applies base styles', () => {
      render(<Alert>Styled alert</Alert>);
      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('rounded-lg');
      expect(alert).toHaveClass('border');
      expect(alert).toHaveClass('p-4');
    });

    it('has correct display name', () => {
      expect(Alert.displayName).toBe('Alert');
    });
  });

  describe('AlertTitle', () => {
    it('renders with text content', () => {
      render(<AlertTitle>Alert Title</AlertTitle>);
      expect(screen.getByText('Alert Title')).toBeInTheDocument();
    });

    it('renders as h5 element', () => {
      render(<AlertTitle>Title</AlertTitle>);
      const title = screen.getByText('Title');
      expect(title.tagName).toBe('H5');
    });

    it('applies custom className', () => {
      render(<AlertTitle className="custom-title">Title</AlertTitle>);
      expect(screen.getByText('Title')).toHaveClass('custom-title');
    });

    it('applies default styles', () => {
      render(<AlertTitle>Styled Title</AlertTitle>);
      const title = screen.getByText('Styled Title');
      expect(title).toHaveClass('font-medium');
      expect(title).toHaveClass('mb-1');
    });

    it('has correct display name', () => {
      expect(AlertTitle.displayName).toBe('AlertTitle');
    });
  });

  describe('AlertDescription', () => {
    it('renders with text content', () => {
      render(<AlertDescription>Alert description text</AlertDescription>);
      expect(screen.getByText('Alert description text')).toBeInTheDocument();
    });

    it('renders as div element', () => {
      render(<AlertDescription>Description</AlertDescription>);
      const desc = screen.getByText('Description');
      expect(desc.tagName).toBe('DIV');
    });

    it('applies custom className', () => {
      render(<AlertDescription className="custom-desc">Desc</AlertDescription>);
      expect(screen.getByText('Desc')).toHaveClass('custom-desc');
    });

    it('applies default styles', () => {
      render(<AlertDescription>Styled desc</AlertDescription>);
      expect(screen.getByText('Styled desc')).toHaveClass('text-sm');
    });

    it('has correct display name', () => {
      expect(AlertDescription.displayName).toBe('AlertDescription');
    });
  });

  describe('Alert Composition', () => {
    it('renders complete alert with title and description', () => {
      render(
        <Alert>
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Something went wrong</AlertDescription>
        </Alert>
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('renders destructive alert composition', () => {
      render(
        <Alert variant="destructive">
          <AlertTitle>Warning</AlertTitle>
          <AlertDescription>This action cannot be undone</AlertDescription>
        </Alert>
      );

      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('text-destructive');
      expect(screen.getByText('Warning')).toBeInTheDocument();
      expect(screen.getByText('This action cannot be undone')).toBeInTheDocument();
    });
  });
});
