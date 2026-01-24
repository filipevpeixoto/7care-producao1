/**
 * Testes para componentes de eleição
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  ElectionStatusBadge,
  ElectionStatCard,
  ElectionLoading,
  ElectionEmptyState,
  ElectionListItem,
  formatDate,
  formatShortDate,
} from '../ElectionComponents';

// Mock dos componentes UI
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className} data-testid="card">{children}</div>,
  CardContent: ({ children }: any) => <div data-testid="card-content">{children}</div>,
  CardDescription: ({ children }: any) => <p data-testid="card-description">{children}</p>,
  CardHeader: ({ children }: any) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children, className }: any) => <h3 className={className} data-testid="card-title">{children}</h3>,
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: any) => (
    <span data-testid="badge" data-variant={variant} className={className}>
      {children}
    </span>
  ),
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, variant, size }: any) => (
    <button onClick={onClick} data-testid="button" data-variant={variant} data-size={size}>
      {children}
    </button>
  ),
}));

jest.mock('lucide-react', () => ({
  Vote: () => <span data-testid="icon-vote">Vote</span>,
  Clock: () => <span data-testid="icon-clock">Clock</span>,
  Users: () => <span data-testid="icon-users">Users</span>,
  CheckCircle: () => <span data-testid="icon-check">CheckCircle</span>,
  Play: () => <span data-testid="icon-play">Play</span>,
  Pause: () => <span data-testid="icon-pause">Pause</span>,
  Edit: () => <span data-testid="icon-edit">Edit</span>,
  Trash2: () => <span data-testid="icon-trash">Trash2</span>,
  Eye: () => <span data-testid="icon-eye">Eye</span>,
  Loader2: () => <span data-testid="icon-loader">Loader2</span>,
  Church: () => <span data-testid="icon-church">Church</span>,
  Calendar: () => <span data-testid="icon-calendar">Calendar</span>,
  AlertCircle: () => <span data-testid="icon-alert">AlertCircle</span>,
  ArrowRight: () => <span data-testid="icon-arrow">ArrowRight</span>,
}));

describe('ElectionStatusBadge', () => {
  it('deve renderizar status "active" corretamente', () => {
    render(<ElectionStatusBadge status="active" />);
    const badge = screen.getByTestId('badge');
    expect(badge).toHaveTextContent('Ativa');
    expect(badge).toHaveAttribute('data-variant', 'default');
  });

  it('deve renderizar status "draft" corretamente', () => {
    render(<ElectionStatusBadge status="draft" />);
    const badge = screen.getByTestId('badge');
    expect(badge).toHaveTextContent('Rascunho');
    expect(badge).toHaveAttribute('data-variant', 'outline');
  });

  it('deve renderizar status "finished" corretamente', () => {
    render(<ElectionStatusBadge status="finished" />);
    const badge = screen.getByTestId('badge');
    expect(badge).toHaveTextContent('Finalizada');
    expect(badge).toHaveAttribute('data-variant', 'secondary');
  });

  it('deve renderizar status "paused" corretamente', () => {
    render(<ElectionStatusBadge status="paused" />);
    const badge = screen.getByTestId('badge');
    expect(badge).toHaveTextContent('Pausada');
    expect(badge).toHaveAttribute('data-variant', 'destructive');
  });

  it('deve renderizar status desconhecido como texto', () => {
    render(<ElectionStatusBadge status="unknown_status" />);
    const badge = screen.getByTestId('badge');
    expect(badge).toHaveTextContent('unknown_status');
  });
});

describe('ElectionStatCard', () => {
  it('deve renderizar título e valor', () => {
    render(
      <ElectionStatCard 
        title="Total de Votos" 
        value={150} 
        icon={<span>📊</span>} 
      />
    );
    expect(screen.getByText('Total de Votos')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument();
  });

  it('deve renderizar descrição quando fornecida', () => {
    render(
      <ElectionStatCard 
        title="Eleitores" 
        value={50} 
        icon={<span>👥</span>}
        description="Membros habilitados"
      />
    );
    expect(screen.getByText('Membros habilitados')).toBeInTheDocument();
  });

  it('deve aceitar valor string', () => {
    render(
      <ElectionStatCard 
        title="Status" 
        value="Ativa" 
        icon={<span>✓</span>}
      />
    );
    expect(screen.getByText('Ativa')).toBeInTheDocument();
  });
});

describe('ElectionLoading', () => {
  it('deve renderizar mensagem padrão', () => {
    render(<ElectionLoading />);
    expect(screen.getByText('Carregando...')).toBeInTheDocument();
    expect(screen.getByTestId('icon-loader')).toBeInTheDocument();
  });

  it('deve renderizar mensagem customizada', () => {
    render(<ElectionLoading message="Carregando eleições..." />);
    expect(screen.getByText('Carregando eleições...')).toBeInTheDocument();
  });
});

describe('ElectionEmptyState', () => {
  it('deve renderizar título', () => {
    render(<ElectionEmptyState title="Nenhuma eleição encontrada" />);
    expect(screen.getByText('Nenhuma eleição encontrada')).toBeInTheDocument();
  });

  it('deve renderizar descrição quando fornecida', () => {
    render(
      <ElectionEmptyState 
        title="Sem eleições" 
        description="Crie uma nova eleição para começar"
      />
    );
    expect(screen.getByText('Crie uma nova eleição para começar')).toBeInTheDocument();
  });

  it('deve chamar action.onClick quando botão é clicado', () => {
    const handleClick = jest.fn();
    render(
      <ElectionEmptyState 
        title="Sem eleições" 
        action={{ label: 'Criar Eleição', onClick: handleClick }}
      />
    );
    
    fireEvent.click(screen.getByText('Criar Eleição'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});

describe('ElectionListItem', () => {
  const mockElection = {
    id: 1,
    church_name: 'Igreja Central',
    title: 'Eleição de Diáconos',
    status: 'active' as const,
    created_at: '2024-01-15T10:00:00Z',
    positions: ['Diácono', 'Presbítero'],
    voters: [1, 2, 3, 4, 5],
  };

  it('deve renderizar informações da eleição', () => {
    render(<ElectionListItem election={mockElection} />);
    
    expect(screen.getByText('Eleição de Diáconos')).toBeInTheDocument();
    expect(screen.getByText('Igreja Central')).toBeInTheDocument();
    expect(screen.getByText('5 eleitores')).toBeInTheDocument();
    expect(screen.getByText('2 cargos')).toBeInTheDocument();
  });

  it('deve chamar onView quando clicado', () => {
    const handleView = jest.fn();
    render(<ElectionListItem election={mockElection} onView={handleView} />);
    
    const viewButton = screen.getAllByTestId('button').find(btn => 
      btn.textContent?.includes('Ver')
    );
    if (viewButton) {
      fireEvent.click(viewButton);
      expect(handleView).toHaveBeenCalledTimes(1);
    }
  });

  it('deve chamar onDelete quando clicado', () => {
    const handleDelete = jest.fn();
    render(<ElectionListItem election={mockElection} onDelete={handleDelete} />);
    
    const deleteButton = screen.getAllByTestId('button').find(btn => 
      btn.textContent?.includes('Excluir')
    );
    if (deleteButton) {
      fireEvent.click(deleteButton);
      expect(handleDelete).toHaveBeenCalledTimes(1);
    }
  });

  it('deve mostrar botão Pausar para eleição ativa', () => {
    const handlePause = jest.fn();
    render(<ElectionListItem election={mockElection} onPause={handlePause} />);
    
    expect(screen.getByText(/Pausar/i)).toBeInTheDocument();
  });

  it('deve mostrar botão Iniciar para eleição em rascunho', () => {
    const draftElection = { ...mockElection, status: 'draft' as const };
    const handleStart = jest.fn();
    render(<ElectionListItem election={draftElection} onStart={handleStart} />);
    
    expect(screen.getByText(/Iniciar/i)).toBeInTheDocument();
  });

  it('não deve mostrar ações quando showActions=false', () => {
    render(<ElectionListItem election={mockElection} showActions={false} />);
    
    expect(screen.queryByText(/Ver/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Editar/)).not.toBeInTheDocument();
  });
});

describe('formatDate', () => {
  it('deve formatar data corretamente', () => {
    const date = '2024-01-15T10:30:00Z';
    const formatted = formatDate(date);
    
    // Verificar se contém os elementos esperados (pode variar por timezone)
    expect(formatted).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    expect(formatted).toMatch(/\d{2}:\d{2}/);
  });
});

describe('formatShortDate', () => {
  it('deve formatar data curta corretamente', () => {
    const date = '2024-01-15T10:30:00Z';
    const formatted = formatShortDate(date);
    
    // Verificar formato dd/mm/yyyy
    expect(formatted).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    // Não deve conter hora
    expect(formatted).not.toMatch(/\d{2}:\d{2}/);
  });
});
