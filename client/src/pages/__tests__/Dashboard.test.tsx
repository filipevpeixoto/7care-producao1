import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

// Mock the dashboard data hook
const mockDashboardData = {
  user: {
    id: 1,
    name: 'Admin User',
    email: 'admin@test.com',
    role: 'admin',
    church: 'Igreja Central',
  },
  stats: {
    totalUsers: 42,
    totalTasks: 10,
    totalChurches: 3,
    totalRequests: 5,
  },
  isLoading: false,
  tasksLoading: false,
  birthdayData: [],
  visitData: [],
  userEvents: [],
  spiritualCheckIns: [],
  districtsCount: 2,
  pastorsCount: 1,
  churchInterested: [],
  userRelationships: [],
  userDetailedData: null,
};

vi.mock('../dashboard/useDashboardData', () => ({
  useDashboardData: () => mockDashboardData,
}));

vi.mock('@/hooks/useTransitionNavigate', () => ({
  useTransitionNavigate: () => vi.fn(),
}));

vi.mock('@/lib/permissions', () => ({
  hasAdminAccess: (user: any) =>
    user && ['admin', 'superadmin', 'pastor'].includes(user.role),
  isSuperAdmin: (user: any) => user && user.role === 'superadmin',
  isPastor: (user: any) => user && user.role === 'pastor',
}));

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock('@/hooks/useSystemLogo', () => ({
  useSystemLogo: () => ({ systemLogo: null }),
}));

vi.mock('@/hooks/useSituationLevels', () => ({
  useSituationLevels: () => ({ levels: [], getLevelByValue: vi.fn() }),
}));

// Mock heavy child components to isolate page test
vi.mock('@/components/dashboard/BirthdayCard', () => ({
  BirthdayCard: () => <div data-testid="birthday-card">BirthdayCard</div>,
}));

vi.mock('@/components/dashboard/Visitometer', () => ({
  Visitometer: () => <div data-testid="visitometer">Visitometer</div>,
}));

vi.mock('@/components/dashboard/QuickGamificationCard', () => ({
  QuickGamificationCard: () => <div data-testid="gamification-card">QuickGamificationCard</div>,
}));

vi.mock('@/components/dashboard/SpiritualCheckInModal', () => ({
  SpiritualCheckInModal: () => null,
}));

vi.mock('@/components/dashboard/NextEventDisplay', () => ({
  NextEventDisplay: () => <div data-testid="next-event">NextEventDisplay</div>,
}));

vi.mock('@/components/dashboard/BirthdayDisplay', () => ({
  BirthdayDisplay: () => <div data-testid="birthday-display">BirthdayDisplay</div>,
}));

vi.mock('@/components/layout/MobileLayout', () => ({
  MobileLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
};

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDashboardData.isLoading = false;
    mockDashboardData.user = {
      id: 1,
      name: 'Admin User',
      email: 'admin@test.com',
      role: 'admin',
      church: 'Igreja Central',
    };
  });

  it('renders admin dashboard for admin users', async () => {
    const Dashboard = (await import('../Dashboard')).default;
    const { container } = render(<Dashboard />, { wrapper: createWrapper() });

    // Dashboard should render meaningful content (stats, cards, headings)
    const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6, [role="heading"]');
    expect(headings.length).toBeGreaterThan(0);
  });

  it('shows loading state when data is loading', async () => {
    mockDashboardData.isLoading = true;
    mockDashboardData.user = null as any;
    const Dashboard = (await import('../Dashboard')).default;
    render(<Dashboard />, { wrapper: createWrapper() });

    // Should show loading spinner/state (may use i18n key or animation)
    const loadingEl = screen.queryByText(/carregando|loading/i) || document.querySelector('[class*="animate-spin"]');
    expect(loadingEl).toBeTruthy();
  });
});
