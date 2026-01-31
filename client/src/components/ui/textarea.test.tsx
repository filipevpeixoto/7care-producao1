import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Textarea } from './textarea';
import { createRef } from 'react';

describe('Textarea', () => {
  it('renders correctly', () => {
    render(<Textarea placeholder="Enter description" />);
    const textarea = screen.getByPlaceholderText('Enter description');
    expect(textarea).toBeInTheDocument();
  });

  it('renders as a textarea element', () => {
    render(<Textarea placeholder="Test" />);
    const textarea = screen.getByPlaceholderText('Test');
    expect(textarea.tagName).toBe('TEXTAREA');
  });

  it('handles value changes', async () => {
    const handleChange = vi.fn();
    render(<Textarea placeholder="Type here" onChange={handleChange} />);
    const textarea = screen.getByPlaceholderText('Type here');

    fireEvent.change(textarea, { target: { value: 'Hello World' } });
    expect(handleChange).toHaveBeenCalled();
  });

  it('displays controlled value', () => {
    render(<Textarea value="Controlled content" readOnly />);
    const textarea = screen.getByDisplayValue('Controlled content');
    expect(textarea).toBeInTheDocument();
  });

  it('renders disabled state', () => {
    render(<Textarea placeholder="Disabled" disabled />);
    const textarea = screen.getByPlaceholderText('Disabled');
    expect(textarea).toBeDisabled();
  });

  it('renders readonly state', () => {
    render(<Textarea placeholder="Readonly" readOnly />);
    const textarea = screen.getByPlaceholderText('Readonly');
    expect(textarea).toHaveAttribute('readonly');
  });

  it('applies custom className', () => {
    render(<Textarea placeholder="Custom" className="custom-textarea" />);
    const textarea = screen.getByPlaceholderText('Custom');
    expect(textarea).toHaveClass('custom-textarea');
  });

  it('applies default styles', () => {
    render(<Textarea placeholder="Styled" />);
    const textarea = screen.getByPlaceholderText('Styled');
    expect(textarea).toHaveClass('rounded-lg');
    expect(textarea).toHaveClass('border');
    expect(textarea).toHaveClass('min-h-[80px]');
  });

  it('forwards ref correctly', () => {
    const ref = createRef<HTMLTextAreaElement>();
    render(<Textarea ref={ref} placeholder="With ref" />);
    expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
    expect(ref.current?.placeholder).toBe('With ref');
  });

  it('handles focus and blur events', () => {
    const handleFocus = vi.fn();
    const handleBlur = vi.fn();
    render(<Textarea placeholder="Focus test" onFocus={handleFocus} onBlur={handleBlur} />);
    const textarea = screen.getByPlaceholderText('Focus test');

    fireEvent.focus(textarea);
    expect(handleFocus).toHaveBeenCalled();

    fireEvent.blur(textarea);
    expect(handleBlur).toHaveBeenCalled();
  });

  it('supports rows attribute', () => {
    render(<Textarea placeholder="Rows test" rows={5} />);
    const textarea = screen.getByPlaceholderText('Rows test');
    expect(textarea).toHaveAttribute('rows', '5');
  });

  it('supports maxLength attribute', () => {
    render(<Textarea placeholder="Max length" maxLength={100} />);
    const textarea = screen.getByPlaceholderText('Max length');
    expect(textarea).toHaveAttribute('maxLength', '100');
  });

  it('supports required attribute', () => {
    render(<Textarea placeholder="Required" required />);
    const textarea = screen.getByPlaceholderText('Required');
    expect(textarea).toBeRequired();
  });

  it('supports aria-label for accessibility', () => {
    render(<Textarea aria-label="Description field" placeholder="Accessible" />);
    const textarea = screen.getByPlaceholderText('Accessible');
    expect(textarea).toHaveAttribute('aria-label', 'Description field');
  });

  it('supports name attribute', () => {
    render(<Textarea placeholder="Named" name="description" />);
    const textarea = screen.getByPlaceholderText('Named');
    expect(textarea).toHaveAttribute('name', 'description');
  });

  it('has correct display name', () => {
    expect(Textarea.displayName).toBe('Textarea');
  });
});
