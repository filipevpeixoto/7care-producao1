/**
 * Testes para optimized-components
 * @module tests/components/optimized-components
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import userEvent from '@testing-library/user-event';
import {
  OptimizedCard,
  OptimizedAvatar,
  OptimizedListItem,
  OptimizedStatsCard,
  OptimizedSearchInput,
} from '../optimized-components';

// Mock dos componentes UI base
vi.mock('../card', () => ({
  Card: ({ children, className, onClick }: React.PropsWithChildren<{ className?: string; onClick?: () => void }>) => (
    <div data-testid="card" className={className} onClick={onClick}>
      {children}
    </div>
  ),
  CardContent: ({ children }: React.PropsWithChildren) => <div data-testid="card-content">{children}</div>,
  CardDescription: ({ children }: React.PropsWithChildren) => <p data-testid="card-description">{children}</p>,
  CardHeader: ({ children, className }: React.PropsWithChildren<{ className?: string }>) => (
    <div data-testid="card-header" className={className}>
      {children}
    </div>
  ),
  CardTitle: ({ children, className }: React.PropsWithChildren<{ className?: string }>) => (
    <h3 data-testid="card-title" className={className}>
      {children}
    </h3>
  ),
}));

vi.mock('../badge', () => ({
  Badge: ({ children, variant }: React.PropsWithChildren<{ variant?: string }>) => (
    <span data-testid="badge" data-variant={variant}>
      {children}
    </span>
  ),
}));

vi.mock('../avatar', () => ({
  Avatar: ({ children, className }: React.PropsWithChildren<{ className?: string }>) => (
    <div data-testid="avatar" className={className}>
      {children}
    </div>
  ),
  AvatarFallback: ({ children }: React.PropsWithChildren) => <span data-testid="avatar-fallback">{children}</span>,
  AvatarImage: ({ src, alt }: { src?: string; alt?: string }) => <img data-testid="avatar-image" src={src} alt={alt} />,
}));

vi.mock('../skeleton', () => ({
  Skeleton: ({ className }: { className?: string }) => <div data-testid="skeleton" className={className} />,
}));

afterEach(() => {
  cleanup();
});

describe('OptimizedCard', () => {
  it('deve renderizar título', () => {
    render(
      <OptimizedCard title="Test Title">
        <p>Content</p>
      </OptimizedCard>
    );

    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('deve renderizar descrição quando fornecida', () => {
    render(
      <OptimizedCard title="Title" description="Test Description">
        <p>Content</p>
      </OptimizedCard>
    );

    expect(screen.getByText('Test Description')).toBeInTheDocument();
  });

  it('deve renderizar badge quando fornecido', () => {
    render(
      <OptimizedCard title="Title" badge="New">
        <p>Content</p>
      </OptimizedCard>
    );

    expect(screen.getByTestId('badge')).toHaveTextContent('New');
  });

  it('deve chamar onClick quando clicado', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(
      <OptimizedCard title="Clickable" onClick={handleClick}>
        <p>Content</p>
      </OptimizedCard>
    );

    await user.click(screen.getByTestId('card'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('deve aplicar className customizada', () => {
    render(
      <OptimizedCard title="Title" className="custom-class">
        <p>Content</p>
      </OptimizedCard>
    );

    expect(screen.getByTestId('card')).toHaveClass('custom-class');
  });

  it('deve renderizar ícone quando fornecido', () => {
    render(
      <OptimizedCard title="Title" icon={<span data-testid="icon">📌</span>}>
        <p>Content</p>
      </OptimizedCard>
    );

    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });
});

describe('OptimizedAvatar', () => {
  it('deve renderizar iniciais do nome', () => {
    render(<OptimizedAvatar name="John Doe" />);

    expect(screen.getByTestId('avatar-fallback')).toHaveTextContent('JD');
  });

  it('deve lidar com nomes com uma palavra', () => {
    render(<OptimizedAvatar name="John" />);

    expect(screen.getByTestId('avatar-fallback')).toHaveTextContent('J');
  });

  it('deve lidar com nomes com múltiplas palavras', () => {
    render(<OptimizedAvatar name="John Michael Doe Smith" />);

    // Deve pegar apenas as duas primeiras iniciais
    expect(screen.getByTestId('avatar-fallback')).toHaveTextContent('JM');
  });

  it('deve renderizar imagem quando src é fornecido', () => {
    render(<OptimizedAvatar name="John Doe" src="https://example.com/avatar.jpg" />);

    const img = screen.getByTestId('avatar-image');
    expect(img).toHaveAttribute('src', 'https://example.com/avatar.jpg');
  });

  it('deve aplicar classe de tamanho correto', () => {
    const { rerender } = render(<OptimizedAvatar name="John" size="sm" />);
    expect(screen.getByTestId('avatar')).toHaveClass('h-8', 'w-8');

    rerender(<OptimizedAvatar name="John" size="lg" />);
    expect(screen.getByTestId('avatar')).toHaveClass('h-12', 'w-12');

    rerender(<OptimizedAvatar name="John" size="xl" />);
    expect(screen.getByTestId('avatar')).toHaveClass('h-16', 'w-16');
  });

  it('não deve mostrar status por padrão', () => {
    render(<OptimizedAvatar name="John" />);

    // Status indicator não deve existir
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});

describe('OptimizedListItem', () => {
  it('deve renderizar título', () => {
    render(<OptimizedListItem id="1" title="List Item Title" />);

    expect(screen.getByText('List Item Title')).toBeInTheDocument();
  });

  it('deve renderizar subtítulo quando fornecido', () => {
    render(<OptimizedListItem id="1" title="Title" subtitle="Subtitle text" />);

    expect(screen.getByText('Subtitle text')).toBeInTheDocument();
  });

  it('deve chamar onClick com id correto', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<OptimizedListItem id="item-123" title="Clickable Item" onClick={handleClick} />);

    await user.click(screen.getByText('Clickable Item'));

    expect(handleClick).toHaveBeenCalledWith('item-123');
  });

  it('deve renderizar avatar quando avatarName é fornecido', () => {
    render(<OptimizedListItem id="1" title="Item" avatarName="John Doe" />);

    expect(screen.getByTestId('avatar')).toBeInTheDocument();
  });

  it('deve aplicar estilo selecionado', () => {
    const { container } = render(<OptimizedListItem id="1" title="Selected" isSelected />);

    expect(container.firstChild).toHaveClass('bg-muted');
  });

  it('deve renderizar rightContent quando fornecido', () => {
    render(
      <OptimizedListItem
        id="1"
        title="Item"
        rightContent={<span data-testid="right">Right</span>}
      />
    );

    expect(screen.getByTestId('right')).toBeInTheDocument();
  });
});

describe('OptimizedStatsCard', () => {
  it('deve renderizar título e valor', () => {
    render(<OptimizedStatsCard title="Total Users" value={1234} />);

    expect(screen.getByText('Total Users')).toBeInTheDocument();
    expect(screen.getByText('1.234')).toBeInTheDocument(); // pt-BR format
  });

  it('deve formatar número em português brasileiro', () => {
    render(<OptimizedStatsCard title="Revenue" value={1234567} />);

    expect(screen.getByText('1.234.567')).toBeInTheDocument();
  });

  it('deve renderizar string sem formatação', () => {
    render(<OptimizedStatsCard title="Status" value="Active" />);

    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('deve renderizar trend positivo', () => {
    render(
      <OptimizedStatsCard title="Growth" value={100} trend={{ value: 15, isPositive: true }} />
    );

    expect(screen.getByText('+15%')).toBeInTheDocument();
    expect(screen.getByText('+15%')).toHaveClass('text-green-600');
  });

  it('deve renderizar trend negativo', () => {
    render(<OptimizedStatsCard title="Churn" value={50} trend={{ value: 5, isPositive: false }} />);

    expect(screen.getByText('5%')).toBeInTheDocument();
    expect(screen.getByText('5%')).toHaveClass('text-red-600');
  });

  it('deve mostrar skeleton quando isLoading', () => {
    render(<OptimizedStatsCard title="Loading" value={0} isLoading />);

    const skeletons = screen.getAllByTestId('skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('deve renderizar ícone quando fornecido', () => {
    render(
      <OptimizedStatsCard
        title="Users"
        value={100}
        icon={<span data-testid="stats-icon">👤</span>}
      />
    );

    expect(screen.getByTestId('stats-icon')).toBeInTheDocument();
  });

  it('deve renderizar descrição', () => {
    render(<OptimizedStatsCard title="Sales" value={500} description="this month" />);

    expect(screen.getByText('this month')).toBeInTheDocument();
  });
});

describe('OptimizedSearchInput', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('deve renderizar com valor inicial', () => {
    render(<OptimizedSearchInput value="initial" onChange={vi.fn()} />);

    expect(screen.getByDisplayValue('initial')).toBeInTheDocument();
  });

  it('deve renderizar placeholder', () => {
    render(<OptimizedSearchInput value="" onChange={vi.fn()} placeholder="Search..." />);

    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
  });

  it('deve atualizar valor local imediatamente', async () => {
    const handleChange = vi.fn();

    render(<OptimizedSearchInput value="" onChange={handleChange} />);

    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'test' } });

    expect(input).toHaveValue('test');
  });

  it('deve chamar onChange após debounce', async () => {
    const handleChange = vi.fn();

    render(<OptimizedSearchInput value="" onChange={handleChange} debounceMs={300} />);

    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'search term' } });

    // Antes do debounce
    expect(handleChange).not.toHaveBeenCalled();

    // Depois do debounce
    vi.advanceTimersByTime(300);

    expect(handleChange).toHaveBeenCalledWith('search term');
  });

  it('deve cancelar debounce anterior quando valor muda', async () => {
    const handleChange = vi.fn();

    render(<OptimizedSearchInput value="" onChange={handleChange} debounceMs={300} />);

    const input = screen.getByRole('searchbox');

    fireEvent.change(input, { target: { value: 'first' } });
    vi.advanceTimersByTime(150);

    fireEvent.change(input, { target: { value: 'second' } });
    vi.advanceTimersByTime(150);

    // Ainda não deve ter chamado (o primeiro foi cancelado, o segundo está esperando)
    expect(handleChange).not.toHaveBeenCalled();

    vi.advanceTimersByTime(150);

    // Agora deve chamar apenas com 'second'
    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange).toHaveBeenCalledWith('second');
  });
});

describe('React.memo optimization', () => {
  it('OptimizedCard deve ter displayName correto', () => {
    expect(OptimizedCard.displayName).toBe('OptimizedCard');
  });

  it('OptimizedAvatar deve ter displayName correto', () => {
    expect(OptimizedAvatar.displayName).toBe('OptimizedAvatar');
  });

  it('OptimizedListItem deve ter displayName correto', () => {
    expect(OptimizedListItem.displayName).toBe('OptimizedListItem');
  });

  it('OptimizedStatsCard deve ter displayName correto', () => {
    expect(OptimizedStatsCard.displayName).toBe('OptimizedStatsCard');
  });

  it('OptimizedSearchInput deve ter displayName correto', () => {
    expect(OptimizedSearchInput.displayName).toBe('OptimizedSearchInput');
  });
});
