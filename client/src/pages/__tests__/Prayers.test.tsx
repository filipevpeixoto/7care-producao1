import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@/contexts/ThemeContext';

const mockPrayers = [
  {
    id: 1,
    userId: 1,
    userName: 'Maria',
    userChurch: 'Igreja Central',
    emotionalScore: 3,
    prayerRequest: 'Oração pela família',
    isPrivate: false,
    allowChurchMembers: true,
    createdAt: new Date().toISOString(),
    isAnswered: false,
    isUserPraying: false,
  },
];

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 1,
      name: 'Test User',
      email: 'user@test.com',
      role: 'admin',
      church: 'Igreja Central',
    },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock('@/lib/permissions', () => ({
  hasAdminAccess: () => true,
}));

vi.mock('@/lib/api', () => ({
  fetchWithAuth: vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(mockPrayers),
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
      <ThemeProvider>
        <MemoryRouter>{children}</MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

describe('Prayers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the page heading after loading', async () => {
    const { default: Prayers } = await import('../Prayers');
    render(<Prayers />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('prayers.title')).toBeInTheDocument();
    });
  });

  it('renders search input and filter controls after loading', async () => {
    const { default: Prayers } = await import('../Prayers');
    render(<Prayers />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByPlaceholderText('prayers.searchPlaceholder')).toBeInTheDocument();
    });
    expect(screen.getAllByText(/prayers\.pendingFilter/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/prayers\.answered/).length).toBeGreaterThan(0);
  });

  it('loads prayers and displays them', async () => {
    const { default: Prayers } = await import('../Prayers');
    render(<Prayers />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Oração pela família')).toBeInTheDocument();
    });
  });
});
