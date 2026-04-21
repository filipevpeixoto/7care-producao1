export interface LoginShellProps {
  isLoading?: boolean;
  isRegistering?: boolean;
  showInstallPrompt?: boolean;
  isInstallable?: boolean;
  isInstalled?: boolean;
  onInstall?: () => void | Promise<void>;
  onToggleRegistering?: () => void;
  onDismissInstallPrompt?: () => void;
}
