import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Label } from './label';

describe('Label', () => {
  it('renders with text content', () => {
    render(<Label>Username</Label>);
    expect(screen.getByText('Username')).toBeInTheDocument();
  });

  it('renders as a label element', () => {
    render(<Label>Email</Label>);
    const label = screen.getByText('Email');
    expect(label.tagName).toBe('LABEL');
  });

  it('applies custom className', () => {
    render(<Label className="custom-label">Test</Label>);
    const label = screen.getByText('Test');
    expect(label).toHaveClass('custom-label');
  });

  it('applies default styles', () => {
    render(<Label>Styled Label</Label>);
    const label = screen.getByText('Styled Label');
    expect(label).toHaveClass('text-sm');
    expect(label).toHaveClass('font-medium');
  });

  it('supports htmlFor attribute', () => {
    render(<Label htmlFor="email-input">Email</Label>);
    const label = screen.getByText('Email');
    expect(label).toHaveAttribute('for', 'email-input');
  });

  it('renders with children elements', () => {
    render(
      <Label>
        <span data-testid="child-span">Required</span> Field
      </Label>
    );
    expect(screen.getByTestId('child-span')).toBeInTheDocument();
    expect(screen.getByText('Required')).toBeInTheDocument();
  });

  it('forwards additional props', () => {
    render(
      <Label id="custom-id" data-testid="label-test">
        Test
      </Label>
    );
    const label = screen.getByTestId('label-test');
    expect(label).toHaveAttribute('id', 'custom-id');
  });

  it('merges classNames correctly', () => {
    render(<Label className="text-red-500">Error Label</Label>);
    const label = screen.getByText('Error Label');
    expect(label).toHaveClass('text-sm');
    expect(label).toHaveClass('text-red-500');
  });

  it('has correct display name', () => {
    expect(Label.displayName).toBe('Label');
  });
});
