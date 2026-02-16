import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ModalProvider } from '@/contexts/ModalContext';

const mockTasks = [
  {
    id: 1,
    title: 'Tarefa de teste',
    description: 'Descrição de teste',
    status: 'pending',
    priority: 'high',
    assigned_to: 1,
    assigned_to_name: 'Admin User',
    church: 'Igreja Central',
    created_at: new Date().toISOString(),
    created_by: 1,
  },
];

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 1,
      name: 'Admin User',
      email: 'admin@test.com',
      role: 'admin',
      church: 'Igreja Central',
      districtId: 1,
    },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock('@/lib/notificationService', () => ({
  notificationService: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/lib/api', () => ({
  fetchWithAuth: vi.fn().mockImplementation((url: string) => {
    if (url === '/api/tasks') {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ tasks: mockTasks }),
      });
    }
    if (url.includes('/api/users/district') || url === '/api/tasks/users') {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve([{ id: 1, name: 'Admin User', church: 'Igreja Central' }]),
      });
    }
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({}),
    });
  }),
}));

vi.mock('@/components/layout/MobileLayout', () => ({
  MobileLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'pt-BR', changeLanguage: vi.fn() },
  }),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ModalProvider>{children}</ModalProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('Tasks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page heading after loading', async () => {
    const { default: Tasks } = await import('../Tasks');
    render(<Tasks />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('tasks.title')).toBeInTheDocument();
    });
  });

  it('renders search input after loading', async () => {
    const { default: Tasks } = await import('../Tasks');
    render(<Tasks />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText('tasks.searchPlaceholder')
      ).toBeInTheDocument();
    });
  });

  it('renders new task button', async () => {
    const { default: Tasks } = await import('../Tasks');
    render(<Tasks />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('tasks.newTask')).toBeInTheDocument();
    });
  });

});
