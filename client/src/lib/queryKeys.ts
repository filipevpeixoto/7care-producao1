/**
 * @fileoverview Centralized query key factories for React Query
 * @module lib/queryKeys
 *
 * Provides type-safe, consistent query key factories to avoid
 * string duplication and enable precise cache invalidation.
 *
 * @example
 * ```typescript
 * import { queryKeys } from '@/lib/queryKeys';
 *
 * // In a query:
 * useQuery({ queryKey: queryKeys.users.list(), ... })
 *
 * // Invalidate all user queries:
 * queryClient.invalidateQueries({ queryKey: queryKeys.users.all })
 *
 * // Invalidate a specific user:
 * queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(userId) })
 * ```
 */

export const queryKeys = {
  // ─── Users ───────────────────────────────────────────
  users: {
    all: ['users'] as const,
    list: (filters?: Record<string, unknown>) => ['users', 'list', filters] as const,
    detail: (id: number | string) => ['users', 'detail', id] as const,
    birthdays: () => ['users', 'birthdays'] as const,
    points: (id: number | string) => ['users', 'points', id] as const,
    allUsers: () => ['all-users'] as const,
  },

  // ─── Events / Calendar ──────────────────────────────
  events: {
    all: ['events'] as const,
    list: (filters?: Record<string, unknown>) => ['events', 'list', filters] as const,
    detail: (id: number | string) => ['events', 'detail', id] as const,
    birthdays: () => ['birthdays'] as const,
    permissions: () => ['system', 'event-permissions'] as const,
  },

  // ─── Activities ─────────────────────────────────────
  activities: {
    all: ['activities'] as const,
    list: () => ['activities'] as const,
  },

  // ─── Tasks ──────────────────────────────────────────
  tasks: {
    all: ['tasks'] as const,
    list: () => ['tasks'] as const,
  },

  // ─── Districts ─────────────────────────────────────
  districts: {
    all: ['districts'] as const,
    list: () => ['districts'] as const,
    detail: (id: number | string) => ['districts', 'detail', id] as const,
    churches: (districtId: number | string) => ['districts', districtId, 'churches'] as const,
  },

  // ─── Churches ──────────────────────────────────────
  churches: {
    all: ['churches'] as const,
    list: () => ['churches'] as const,
  },

  // ─── Elections ─────────────────────────────────────
  elections: {
    all: ['elections'] as const,
    list: () => ['elections'] as const,
    detail: (id: number | string) => ['elections', 'detail', id] as const,
    config: (id: number | string) => ['elections', 'config', id] as const,
    results: (id: number | string) => ['elections', 'results', id] as const,
    voting: (id: number | string) => ['elections', 'voting', id] as const,
  },

  // ─── Discipleship / Relationships ──────────────────
  relationships: {
    all: ['relationships'] as const,
    myRelationships: (userId?: number | string) => ['my-relationships', userId] as const,
    allRelationships: () => ['all-relationships'] as const,
    discipleshipRequests: () => ['discipleship-requests'] as const,
    allDiscipleshipRequests: () => ['all-discipleship-requests'] as const,
    myInterested: () => ['my-interested'] as const,
    churchInterested: (userId?: number | string) => ['church-interested', userId] as const,
    myDiscipleshipRequests: (userId?: number | string) =>
      ['my-discipleship-requests', userId] as const,
  },

  // ─── Messages / Chat ──────────────────────────────
  messages: {
    all: ['messages'] as const,
    conversation: (conversationId: string | number) => ['messages', conversationId] as const,
  },

  // ─── Reports ──────────────────────────────────────
  reports: {
    overview: (period: string, userId?: number | string) =>
      ['/api/reports/overview', period, userId] as const,
    spiritualFunnel: (period: string, userId?: number | string) =>
      ['/api/reports/spiritual-funnel', period, userId] as const,
    churchComparison: (period: string, userId?: number | string) =>
      ['/api/reports/church-comparison', period, userId] as const,
    engagementAnalysis: (period: string, userId?: number | string) =>
      ['/api/reports/engagement-analysis', period, userId] as const,
    growthTrends: (period: string, userId?: number | string) =>
      ['/api/reports/growth-trends', period, userId] as const,
    missionaryPerformance: (period: string, userId?: number | string) =>
      ['/api/reports/missionary-performance', period, userId] as const,
    districtComparison: (period: string, userId?: number | string) =>
      ['/api/reports/district-comparison', period, userId] as const,
    goals: (period: string, userId?: number | string) =>
      ['/api/reports/goals', period, userId] as const,
  },

  // ─── Dashboard ────────────────────────────────────
  dashboard: {
    all: ['dashboard'] as const,
    unified: (userId?: string) => ['dashboard', 'unified', userId] as const,
    stats: () => ['dashboard', 'stats'] as const,
    visits: () => ['dashboard', 'visits'] as const,
  },

  // ─── Prayers ──────────────────────────────────────
  prayers: {
    all: ['prayers'] as const,
    list: () => ['prayers'] as const,
  },

  // ─── Notifications ────────────────────────────────
  notifications: {
    all: ['notifications'] as const,
    list: () => ['notifications'] as const,
    history: () => ['notifications', 'history'] as const,
  },

  // ─── Pastors ──────────────────────────────────────
  pastors: {
    all: ['pastors'] as const,
    list: () => ['pastors'] as const,
    invites: () => ['pastor-invites'] as const,
  },

  // ─── System / Settings ────────────────────────────
  system: {
    settings: () => ['system', 'settings'] as const,
    pointsConfig: () => ['system', 'points-config'] as const,
  },

  // ─── Receipts ─────────────────────────────────────
  receipts: {
    all: ['receipts'] as const,
    list: (filters?: Record<string, unknown>) => ['receipts', 'list', filters] as const,
  },
} as const;
