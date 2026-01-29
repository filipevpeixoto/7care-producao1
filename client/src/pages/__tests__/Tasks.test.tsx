/**
 * Testes para Tasks.tsx
 * Cobertura completa de funcionalidades
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Tasks from '../Tasks';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock para useAuth
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 1, name: 'Test User', role: 'superadmin' },
    isAuthenticated: true,
  }),
}));

// Mock para useToast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock para TanStack Query
vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({
    data: [],
    isLoading: false,
    error: null,
  })),
  useMutation: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
}));

// Mock para Google Sheets API
const mockUpdateGoogleSheets = vi.fn();
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ success: true }),
  })
) as unknown as typeof fetch;

describe('Tasks Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Resetar fetch mock
    (global.fetch as any).mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Renderização inicial', () => {
    it('deve renderizar o componente sem erros', () => {
      render(<Tasks />);
      expect(screen.getByText('Gerenciamento de Tarefas')).toBeInTheDocument();
    });

    it('deve exibir o botão de sincronização com Google Sheets', () => {
      render(<Tasks />);
      expect(screen.getByText('Sincronizar com Google Sheets')).toBeInTheDocument();
    });

    it('deve exibir as colunas da tabela corretamente', () => {
      render(<Tasks />);
      expect(screen.getByText('Título')).toBeInTheDocument();
      expect(screen.getByText('Descrição')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Prioridade')).toBeInTheDocument();
      expect(screen.getByText('Responsável')).toBeInTheDocument();
      expect(screen.getByText('Igreja')).toBeInTheDocument();
      expect(screen.getByText('Data de Criação')).toBeInTheDocument();
      expect(screen.getByText('Ações')).toBeInTheDocument();
    });
  });

  describe('Sincronização com Google Sheets', () => {
    it('deve chamar a API de sincronização ao clicar no botão', async () => {
      const user = userEvent.setup();
      render(<Tasks />);

      const syncButton = screen.getByText('Sincronizar com Google Sheets');
      await user.click(syncButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/tasks/sync-google-sheets', {
          method: 'POST',
        });
      });
    });

    it('deve lidar com erro na sincronização', async () => {
      (global.fetch as any).mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: 'Erro ao sincronizar' }),
        })
      );

      const user = userEvent.setup();
      render(<Tasks />);

      const syncButton = screen.getByText('Sincronizar com Google Sheets');
      await user.click(syncButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });
  });

  describe('Interface de Tarefas', () => {
    it('deve renderizar tarefas da API', async () => {
      const mockTasks = [
        {
          id: 1,
          titulo: 'Tarefa Teste 1',
          descricao: 'Descrição da tarefa 1',
          status: 'pendente',
          prioridade: 'alta',
          responsavel: 'João Silva',
          criador: 'Maria Souza',
          igreja: 'Igreja Central',
          data_criacao: '2024-01-15T10:00:00Z',
          data_vencimento: '2024-01-20T10:00:00Z',
          data_conclusao: null,
          tags: 'urgente, importante',
        },
        {
          id: 2,
          titulo: 'Tarefa Teste 2',
          descricao: 'Descrição da tarefa 2',
          status: 'em_andamento',
          prioridade: 'media',
          responsavel: 'Pedro Santos',
          criador: 'Ana Costa',
          igreja: 'Igreja Filial',
          data_criacao: '2024-01-16T10:00:00Z',
          data_vencimento: null,
          data_conclusao: null,
          tags: null,
        },
      ];

      // Mock para retornar tarefas
      vi.mock('@tanstack/react-query', () => ({
        useQuery: vi.fn(() => ({
          data: mockTasks,
          isLoading: false,
          error: null,
        })),
      }));

      render(<Tasks />);

      await waitFor(() => {
        expect(screen.getByText('Tarefa Teste 1')).toBeInTheDocument();
        expect(screen.getByText('Tarefa Teste 2')).toBeInTheDocument();
      });
    });

    it('deve exibir indicador de loading', () => {
      vi.mock('@tanstack/react-query', () => ({
        useQuery: vi.fn(() => ({
          data: [],
          isLoading: true,
          error: null,
        })),
      }));

      render(<Tasks />);
      expect(screen.getByText('Carregando...')).toBeInTheDocument();
    });

    it('deve exibir mensagem de erro', () => {
      vi.mock('@tanstack/react-query', () => ({
        useQuery: vi.fn(() => ({
          data: [],
          isLoading: false,
          error: new Error('Erro ao carregar tarefas'),
        })),
      }));

      render(<Tasks />);
      expect(screen.getByText('Erro ao carregar tarefas')).toBeInTheDocument();
    });

    it('deve exibir mensagem quando não há tarefas', () => {
      vi.mock('@tanstack/react-query', () => ({
        useQuery: vi.fn(() => ({
          data: [],
          isLoading: false,
          error: null,
        })),
      }));

      render(<Tasks />);
      expect(screen.getByText('Nenhuma tarefa encontrada')).toBeInTheDocument();
    });
  });

  describe('Formatação de Dados', () => {
    it('deve formatar data de criação corretamente', async () => {
      const mockTasks = [
        {
          id: 1,
          titulo: 'Tarefa com Data',
          descricao: 'Descrição',
          status: 'pendente',
          prioridade: 'alta',
          responsavel: 'João Silva',
          criador: 'Maria Souza',
          igreja: 'Igreja Central',
          data_criacao: '2024-01-15T10:00:00Z',
          data_vencimento: null,
          data_conclusao: null,
          tags: null,
        },
      ];

      vi.mock('@tanstack/react-query', () => ({
        useQuery: vi.fn(() => ({
          data: mockTasks,
          isLoading: false,
          error: null,
        })),
      }));

      render(<Tasks />);

      await waitFor(() => {
        // Verificar se a data está formatada (deve mostrar 15/01/2024)
        expect(screen.getByText(/15\/01\/2024/)).toBeInTheDocument();
      });
    });

    it('deve exibir corretamente tarefas sem data de vencimento', async () => {
      const mockTasks = [
        {
          id: 1,
          titulo: 'Tarefa Sem Vencimento',
          descricao: 'Descrição',
          status: 'pendente',
          prioridade: 'alta',
          responsavel: 'João Silva',
          criador: 'Maria Souza',
          igreja: 'Igreja Central',
          data_criacao: '2024-01-15T10:00:00Z',
          data_vencimento: null,
          data_conclusao: null,
          tags: null,
        },
      ];

      vi.mock('@tanstack/react-query', () => ({
        useQuery: vi.fn(() => ({
          data: mockTasks,
          isLoading: false,
          error: null,
        })),
      }));

      render(<Tasks />);

      await waitFor(() => {
        expect(screen.getByText('Sem vencimento')).toBeInTheDocument();
      });
    });
  });

  describe('Cores de Prioridade', () => {
    it('deve aplicar cor vermelha para prioridade alta', async () => {
      const mockTasks = [
        {
          id: 1,
          titulo: 'Tarefa Alta Prioridade',
          descricao: 'Descrição',
          status: 'pendente',
          prioridade: 'alta',
          responsavel: 'João Silva',
          criador: 'Maria Souza',
          igreja: 'Igreja Central',
          data_criacao: '2024-01-15T10:00:00Z',
          data_vencimento: null,
          data_conclusao: null,
          tags: null,
        },
      ];

      vi.mock('@tanstack/react-query', () => ({
        useQuery: vi.fn(() => ({
          data: mockTasks,
          isLoading: false,
          error: null,
        })),
      }));

      const { container } = render(<Tasks />);

      await waitFor(() => {
        const priorityElement = container.querySelector('.text-red-600');
        expect(priorityElement).toBeInTheDocument();
        expect(priorityElement?.textContent).toBe('alta');
      });
    });

    it('deve aplicar cor amarela para prioridade média', async () => {
      const mockTasks = [
        {
          id: 1,
          titulo: 'Tarefa Média Prioridade',
          descricao: 'Descrição',
          status: 'pendente',
          prioridade: 'media',
          responsavel: 'João Silva',
          criador: 'Maria Souza',
          igreja: 'Igreja Central',
          data_criacao: '2024-01-15T10:00:00Z',
          data_vencimento: null,
          data_conclusao: null,
          tags: null,
        },
      ];

      vi.mock('@tanstack/react-query', () => ({
        useQuery: vi.fn(() => ({
          data: mockTasks,
          isLoading: false,
          error: null,
        })),
      }));

      const { container } = render(<Tasks />);

      await waitFor(() => {
        const priorityElement = container.querySelector('.text-yellow-600');
        expect(priorityElement).toBeInTheDocument();
        expect(priorityElement?.textContent).toBe('media');
      });
    });

    it('deve aplicar cor verde para prioridade baixa', async () => {
      const mockTasks = [
        {
          id: 1,
          titulo: 'Tarefa Baixa Prioridade',
          descricao: 'Descrição',
          status: 'pendente',
          prioridade: 'baixa',
          responsavel: 'João Silva',
          criador: 'Maria Souza',
          igreja: 'Igreja Central',
          data_criacao: '2024-01-15T10:00:00Z',
          data_vencimento: null,
          data_conclusao: null,
          tags: null,
        },
      ];

      vi.mock('@tanstack/react-query', () => ({
        useQuery: vi.fn(() => ({
          data: mockTasks,
          isLoading: false,
          error: null,
        })),
      }));

      const { container } = render(<Tasks />);

      await waitFor(() => {
        const priorityElement = container.querySelector('.text-green-600');
        expect(priorityElement).toBeInTheDocument();
        expect(priorityElement?.textContent).toBe('baixa');
      });
    });
  });

  describe('Ações de Tarefas', () => {
    it('deve ter botões de ação para cada tarefa', async () => {
      const mockTasks = [
        {
          id: 1,
          titulo: 'Tarefa com Ações',
          descricao: 'Descrição',
          status: 'pendente',
          prioridade: 'alta',
          responsavel: 'João Silva',
          criador: 'Maria Souza',
          igreja: 'Igreja Central',
          data_criacao: '2024-01-15T10:00:00Z',
          data_vencimento: null,
          data_conclusao: null,
          tags: null,
        },
      ];

      vi.mock('@tanstack/react-query', () => ({
        useQuery: vi.fn(() => ({
          data: mockTasks,
          isLoading: false,
          error: null,
        })),
      }));

      render(<Tasks />);

      await waitFor(() => {
        // Verificar se há botões de ação (ícones de lápis/lixeira)
        const actionButtons = screen.getByTestId('task-actions-1');
        expect(actionButtons).toBeInTheDocument();
      });
    });
  });

  describe('Responsividade', () => {
    it('deve ser responsivo em dispositivos móveis', () => {
      // Simular viewport mobile
      global.innerWidth = 375;
      global.dispatchEvent(new Event('resize'));

      render(<Tasks />);

      // Verificar se a tabela tem scroll horizontal em mobile
      const tableContainer = screen.getByTestId('tasks-table-container');
      expect(tableContainer).toHaveClass('overflow-x-auto');
    });

    it('deve ser responsivo em tablets', () => {
      // Simular viewport tablet
      global.innerWidth = 768;
      global.dispatchEvent(new Event('resize'));

      render(<Tasks />);

      // Verificar se os elementos se ajustam corretamente
      const container = screen.getByTestId('tasks-container');
      expect(container).toBeInTheDocument();
    });
  });

  describe('Integração com Google Sheets', () => {
    it('deve mapear corretamente dados para Google Sheets', async () => {
      const mockTasks = [
        {
          id: 1,
          titulo: 'Tarefa Google Sheets',
          descricao: 'Descrição para Sheets',
          status: 'concluida',
          prioridade: 'alta',
          responsavel: 'João Silva',
          criador: 'Maria Souza',
          igreja: 'Igreja Central',
          data_criacao: '2024-01-15T10:00:00Z',
          data_vencimento: '2024-01-20T10:00:00Z',
          data_conclusao: '2024-01-18T10:00:00Z',
          tags: 'urgente, teste',
        },
      ];

      vi.mock('@tanstack/react-query', () => ({
        useQuery: vi.fn(() => ({
          data: mockTasks,
          isLoading: false,
          error: null,
        })),
      }));

      render(<Tasks />);

      await waitFor(() => {
        // Verificar se os dados estão sendo exibidos corretamente
        expect(screen.getByText('Tarefa Google Sheets')).toBeInTheDocument();
        expect(screen.getByText('Descrição para Sheets')).toBeInTheDocument();
        expect(screen.getByText('concluida')).toBeInTheDocument();
        expect(screen.getByText('alta')).toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    it('deve renderizar lista grande de tarefas eficientemente', async () => {
      // Criar 100 tarefas para teste de performance
      const largeTaskList = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        titulo: `Tarefa ${i + 1}`,
        descricao: `Descrição da tarefa ${i + 1}`,
        status: ['pendente', 'em_andamento', 'concluida'][i % 3],
        prioridade: ['alta', 'media', 'baixa'][i % 3],
        responsavel: `Responsável ${i + 1}`,
        criador: `Criador ${i + 1}`,
        igreja: `Igreja ${i + 1}`,
        data_criacao: new Date(2024, 0, i + 1).toISOString(),
        data_vencimento: i % 2 === 0 ? new Date(2024, 0, i + 10).toISOString() : null,
        data_conclusao: i % 3 === 0 ? new Date(2024, 0, i + 5).toISOString() : null,
        tags: i % 4 === 0 ? 'tag1, tag2' : null,
      }));

      vi.mock('@tanstack/react-query', () => ({
        useQuery: vi.fn(() => ({
          data: largeTaskList,
          isLoading: false,
          error: null,
        })),
      }));

      const startTime = performance.now();
      render(<Tasks />);
      const endTime = performance.now();

      // Verificar se renderizou em menos de 1 segundo (performance aceitável)
      expect(endTime - startTime).toBeLessThan(1000);

      // Verificar se as tarefas estão visíveis
      await waitFor(() => {
        expect(screen.getByText('Tarefa 1')).toBeInTheDocument();
        expect(screen.getByText('Tarefa 100')).toBeInTheDocument();
      });
    });
  });
});
