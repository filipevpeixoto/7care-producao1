import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Checkbox } from './checkbox';

describe('Checkbox', () => {
  it('renders correctly', () => {
    render(<Checkbox aria-label="Test checkbox" />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeInTheDocument();
  });

  it('starts unchecked by default', () => {
    render(<Checkbox aria-label="Test checkbox" />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();
  });

  it('can be checked when clicked', () => {
    render(<Checkbox aria-label="Test checkbox" />);
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    expect(checkbox).toHaveAttribute('data-state', 'checked');
  });

  it('can be toggled off', () => {
    render(<Checkbox aria-label="Test checkbox" defaultChecked />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toHaveAttribute('data-state', 'checked');
    fireEvent.click(checkbox);
    expect(checkbox).toHaveAttribute('data-state', 'unchecked');
  });

  it('renders disabled state', () => {
    render(<Checkbox aria-label="Test checkbox" disabled />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeDisabled();
  });

  it('does not toggle when disabled', () => {
    render(<Checkbox aria-label="Test checkbox" disabled />);
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });

  it('applies custom className', () => {
    render(<Checkbox aria-label="Test checkbox" className="custom-class" />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toHaveClass('custom-class');
  });

  it('calls onCheckedChange when toggled', () => {
    const handleChange = vi.fn();
    render(<Checkbox aria-label="Test checkbox" onCheckedChange={handleChange} />);
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    expect(handleChange).toHaveBeenCalledWith(true);
  });

  it('can be controlled with checked prop', () => {
    const { rerender } = render(<Checkbox aria-label="Test checkbox" checked={false} />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toHaveAttribute('data-state', 'unchecked');

    rerender(<Checkbox aria-label="Test checkbox" checked={true} />);
    expect(checkbox).toHaveAttribute('data-state', 'checked');
  });

  it('supports defaultChecked prop', () => {
    render(<Checkbox aria-label="Test checkbox" defaultChecked />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toHaveAttribute('data-state', 'checked');
  });

  it('has correct accessibility attributes', () => {
    render(<Checkbox aria-label="Accept terms" id="terms" />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toHaveAttribute('aria-label', 'Accept terms');
    expect(checkbox).toHaveAttribute('id', 'terms');
  });

  it('supports required attribute', () => {
    render(<Checkbox aria-label="Required checkbox" required />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toHaveAttribute('aria-required', 'true');
  });

  it('has correct display name', () => {
    expect(Checkbox.displayName).toBe('Checkbox');
  });
});
