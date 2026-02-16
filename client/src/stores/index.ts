/**
 * Stores Index
 * Re-exporta todas as stores Zustand
 */

export {
  useAppStore,
  useAuthState,
  useUser,
  useIsAuthenticated,
  useUI,
  useTheme,
  useSidebarOpen,
  useNotifications,
  useUnreadCount,
  appActions,
  type User,
  type Notification,
  type UIState,
  type AuthState,
  type NotificationState,
  type AppState,
} from './appStore';
