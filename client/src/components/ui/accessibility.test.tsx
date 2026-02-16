import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SkipLink, LiveRegion, VisuallyHidden, FocusTrap } from './accessibility';

afterEach(() => {
  cleanup();
});

describe('SkipLink', () => {
  it('renders with default text', () => {
    render(<SkipLink />);
    const link = screen.getByText('Pular para o conteúdo principal');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '#main-content');
  });

  it('renders with custom text and target', () => {
    render(<SkipLink targetId="custom-content">Skip to content</SkipLink>);
    const link = screen.getByText('Skip to content');
    expect(link).toHaveAttribute('href', '#custom-content');
  });

  it('has correct aria-label', () => {
    render(<SkipLink>Skip Navigation</SkipLink>);
    const link = screen.getByText('Skip Navigation');
    expect(link).toHaveAttribute('aria-label', 'Skip Navigation');
  });

  it('focuses and scrolls to target element on click', () => {
    const targetEl = document.createElement('div');
    targetEl.id = 'main-content';
    targetEl.scrollIntoView = vi.fn();
    document.body.appendChild(targetEl);

    render(<SkipLink targetId="main-content">Skip</SkipLink>);
    const link = screen.getByText('Skip');
    fireEvent.click(link);

    expect(targetEl.tabIndex).toBe(-1);
    expect(targetEl.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });

    document.body.removeChild(targetEl);
  });

  it('applies sr-only styles for focus visibility pattern', () => {
    render(<SkipLink />);
    const link = screen.getByText('Pular para o conteúdo principal');
    // The link should have the translate class that hides it until focused
    expect(link.className).toContain('-translate-y-full');
    expect(link.className).toContain('focus:translate-y-0');
  });

  it('accepts custom className', () => {
    render(<SkipLink className="custom-class">Skip</SkipLink>);
    const link = screen.getByText('Skip');
    expect(link.className).toContain('custom-class');
  });
});

describe('LiveRegion', () => {
  it('renders with polite role by default', () => {
    render(<LiveRegion message="Item added" />);
    const region = screen.getByRole('status');
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(region).toHaveTextContent('Item added');
  });

  it('supports assertive politeness', () => {
    render(<LiveRegion message="Error occurred" politeness="assertive" />);
    const region = screen.getByRole('status');
    expect(region).toHaveAttribute('aria-live', 'assertive');
  });

  it('has sr-only class for screen reader only', () => {
    render(<LiveRegion message="Status update" />);
    const region = screen.getByRole('status');
    expect(region.className).toContain('sr-only');
  });

  it('sets aria-atomic by default', () => {
    render(<LiveRegion message="Updated" />);
    const region = screen.getByRole('status');
    expect(region).toHaveAttribute('aria-atomic', 'true');
  });
});

describe('VisuallyHidden', () => {
  it('renders children with sr-only class', () => {
    render(<VisuallyHidden>Hidden label</VisuallyHidden>);
    const el = screen.getByText('Hidden label');
    expect(el).toBeInTheDocument();
    expect(el.className).toContain('sr-only');
  });

  it('renders as span by default', () => {
    render(<VisuallyHidden>Text</VisuallyHidden>);
    const el = screen.getByText('Text');
    expect(el.tagName).toBe('SPAN');
  });

  it('renders as custom element', () => {
    render(<VisuallyHidden as="div">Text</VisuallyHidden>);
    const el = screen.getByText('Text');
    expect(el.tagName).toBe('DIV');
  });
});

describe('FocusTrap', () => {
  it('renders children', () => {
    render(
      <FocusTrap>
        <button>First</button>
        <button>Second</button>
      </FocusTrap>
    );
    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
  });

  it('renders when inactive', () => {
    render(
      <FocusTrap active={false}>
        <button>Content</button>
      </FocusTrap>
    );
    expect(screen.getByText('Content')).toBeInTheDocument();
  });
});

describe('Keyboard Navigation', () => {
  it('buttons are focusable via Tab key', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <button>First</button>
        <button>Second</button>
        <button>Third</button>
      </div>
    );

    await user.tab();
    expect(screen.getByText('First')).toHaveFocus();

    await user.tab();
    expect(screen.getByText('Second')).toHaveFocus();

    await user.tab();
    expect(screen.getByText('Third')).toHaveFocus();
  });

  it('links are focusable and activatable via keyboard', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(
      <a href="#test" onClick={handleClick}>
        Test Link
      </a>
    );

    await user.tab();
    expect(screen.getByText('Test Link')).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(handleClick).toHaveBeenCalled();
  });

  it('disabled buttons are not focusable', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <button>Enabled</button>
        <button disabled>Disabled</button>
        <button>Another</button>
      </div>
    );

    await user.tab();
    expect(screen.getByText('Enabled')).toHaveFocus();

    await user.tab();
    // Should skip disabled and go to Another  
    expect(screen.getByText('Another')).toHaveFocus();
  });

  it('elements with tabIndex=-1 are not in tab order', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <button>First</button>
        <button tabIndex={-1}>Skipped</button>
        <button>Last</button>
      </div>
    );

    await user.tab();
    expect(screen.getByText('First')).toHaveFocus();

    await user.tab();
    expect(screen.getByText('Last')).toHaveFocus();
  });
});

describe('ARIA Attributes', () => {
  it('buttons with aria-expanded toggle correctly', async () => {
    const user = userEvent.setup();

    function TestComponent() {
      const [expanded, setExpanded] = React.useState(false);
      return (
        <div>
          <button aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
            Toggle
          </button>
          {expanded && <div>Content</div>}
        </div>
      );
    }

    // Need React import for the component
    const React = await import('react');
    const { useState } = React;

    function ExpandableComponent() {
      const [expanded, setExpanded] = useState(false);
      return (
        <div>
          <button aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
            Toggle
          </button>
          {expanded && <div role="region">Expanded content</div>}
        </div>
      );
    }

    render(<ExpandableComponent />);

    const button = screen.getByText('Toggle');
    expect(button).toHaveAttribute('aria-expanded', 'false');

    await user.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('region')).toBeInTheDocument();
  });

  it('inputs with aria-required are marked correctly', () => {
    render(<input aria-required="true" aria-label="Required field" />);
    const input = screen.getByLabelText('Required field');
    expect(input).toHaveAttribute('aria-required', 'true');
  });

  it('elements with role="alert" are announced', () => {
    render(<div role="alert">Error message</div>);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Error message');
  });

  it('navigation landmarks are present', () => {
    render(
      <div>
        <nav aria-label="Main navigation">
          <a href="/">Home</a>
        </nav>
        <main id="main-content">
          <h1>Page Title</h1>
        </main>
      </div>
    );

    expect(screen.getByRole('navigation')).toHaveAttribute('aria-label', 'Main navigation');
    expect(screen.getByRole('main')).toBeInTheDocument();
  });
});
