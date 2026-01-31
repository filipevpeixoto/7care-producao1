/**
 * Stores Index
 * Re-exporta todas as stores Zustand
 */

export {
  useAppStore,
  useAuth,
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
