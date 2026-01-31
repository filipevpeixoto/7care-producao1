/**
 * Zustand Store - Estado Global da Aplicação
 * Gerenciamento de estado centralizado para o 7Care
 *
 * @module stores/appStore
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// =====================================================
// Types
// =====================================================

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  church?: string;
  districtId?: number;
  isApproved?: boolean;
  status?: string;
  firstAccess?: boolean;
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  createdAt: Date;
}

export interface UIState {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  theme: 'light' | 'dark' | 'system';
  locale: string;
  isMobile: boolean;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
}

export interface AppState {
  // Auth
  auth: AuthState;

  // UI
  ui: UIState;

  // Notifications
  notifications: NotificationState;

  // Actions - Auth
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setAuthLoading: (loading: boolean) => void;
  setAuthError: (error: string | null) => void;
  login: (user: User, token: string) => void;
  logout: () => void;

  // Actions - UI
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setLocale: (locale: string) => void;
  setIsMobile: (isMobile: boolean) => void;

  // Actions - Notifications
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
}

// =====================================================
// Initial State
// =====================================================

const initialAuthState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

const initialUIState: UIState = {
  sidebarOpen: true,
  sidebarCollapsed: false,
  theme: 'system',
  locale: 'pt-BR',
  isMobile: false,
};

const initialNotificationState: NotificationState = {
  notifications: [],
  unreadCount: 0,
};

// =====================================================
// Store
// =====================================================

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      immer((set: (fn: (state: AppState) => void) => void) => ({
        // Initial state
        auth: initialAuthState,
        ui: initialUIState,
        notifications: initialNotificationState,

        // Auth actions
        setUser: (user: User | null) =>
          set((state: AppState) => {
            state.auth.user = user;
            state.auth.isAuthenticated = !!user;
          }),

        setToken: (token: string | null) =>
          set((state: AppState) => {
            state.auth.token = token;
          }),

        setAuthLoading: (loading: boolean) =>
          set((state: AppState) => {
            state.auth.isLoading = loading;
          }),

        setAuthError: (error: string | null) =>
          set((state: AppState) => {
            state.auth.error = error;
          }),

        login: (user: User, token: string) =>
          set((state: AppState) => {
            state.auth.user = user;
            state.auth.token = token;
            state.auth.isAuthenticated = true;
            state.auth.isLoading = false;
            state.auth.error = null;
          }),

        logout: () =>
          set((state: AppState) => {
            state.auth = initialAuthState;
          }),

        // UI actions
        toggleSidebar: () =>
          set((state: AppState) => {
            state.ui.sidebarOpen = !state.ui.sidebarOpen;
          }),

        setSidebarOpen: (open: boolean) =>
          set((state: AppState) => {
            state.ui.sidebarOpen = open;
          }),

        setSidebarCollapsed: (collapsed: boolean) =>
          set((state: AppState) => {
            state.ui.sidebarCollapsed = collapsed;
          }),

        setTheme: (theme: 'light' | 'dark' | 'system') =>
          set((state: AppState) => {
            state.ui.theme = theme;
          }),

        setLocale: (locale: string) =>
          set((state: AppState) => {
            state.ui.locale = locale;
          }),

        setIsMobile: (isMobile: boolean) =>
          set((state: AppState) => {
            state.ui.isMobile = isMobile;
          }),

        // Notification actions
        addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) =>
          set((state: AppState) => {
            const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            state.notifications.notifications.unshift({
              ...notification,
              id,
              createdAt: new Date(),
            });
            state.notifications.unreadCount += 1;
          }),

        removeNotification: (id: string) =>
          set((state: AppState) => {
            state.notifications.notifications = state.notifications.notifications.filter(
              (n: Notification) => n.id !== id
            );
          }),

        clearNotifications: () =>
          set((state: AppState) => {
            state.notifications.notifications = [];
            state.notifications.unreadCount = 0;
          }),

        markAsRead: (id: string) =>
          set((state: AppState) => {
            const notification = state.notifications.notifications.find(
              (n: Notification) => n.id === id
            );
            if (notification && state.notifications.unreadCount > 0) {
              state.notifications.unreadCount -= 1;
            }
          }),

        markAllAsRead: () =>
          set((state: AppState) => {
            state.notifications.unreadCount = 0;
          }),
      })),
      {
        name: '7care-store',
        partialize: state => ({
          auth: {
            user: state.auth.user,
            token: state.auth.token,
            isAuthenticated: state.auth.isAuthenticated,
          },
          ui: {
            theme: state.ui.theme,
            locale: state.ui.locale,
            sidebarCollapsed: state.ui.sidebarCollapsed,
          },
        }),
      }
    ),
    { name: '7Care Store' }
  )
);

// =====================================================
// Selectors (para otimização de re-renders)
// =====================================================

export const useAuth = () => useAppStore(state => state.auth);
export const useUser = () => useAppStore(state => state.auth.user);
export const useIsAuthenticated = () => useAppStore(state => state.auth.isAuthenticated);
export const useUI = () => useAppStore(state => state.ui);
export const useTheme = () => useAppStore(state => state.ui.theme);
export const useSidebarOpen = () => useAppStore(state => state.ui.sidebarOpen);
export const useNotifications = () => useAppStore(state => state.notifications);
export const useUnreadCount = () => useAppStore(state => state.notifications.unreadCount);

// =====================================================
// Actions (para uso fora de componentes React)
// =====================================================

export const appActions = {
  login: (user: User, token: string) => useAppStore.getState().login(user, token),
  logout: () => useAppStore.getState().logout(),
  setTheme: (theme: 'light' | 'dark' | 'system') => useAppStore.getState().setTheme(theme),
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) =>
    useAppStore.getState().addNotification(notification),
  removeNotification: (id: string) => useAppStore.getState().removeNotification(id),
};

export default useAppStore;
