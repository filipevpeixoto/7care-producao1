import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoginForm } from '@/components/auth/LoginForm';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { useSystemLogo } from '@/hooks/useSystemLogo';
import { ariaLabels } from '@/lib/accessibility';
import { Download, Smartphone, X } from 'lucide-react';
import type { LoginShellProps } from './types';

export const LoginClassic = ({
  isLoading = false,
  isRegistering = false,
  showInstallPrompt = true,
  isInstallable = false,
  isInstalled = false,
  onInstall,
  onToggleRegistering,
  onDismissInstallPrompt,
}: LoginShellProps) => {
  const { t } = useTranslation();
  const { systemLogo } = useSystemLogo();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
        <div className="text-center space-y-4">
          <div className="mx-auto h-16 w-16 animate-spin rounded-full border-4 border-white border-t-transparent" />
          <p className="text-white">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 p-4">
      {!isInstalled && showInstallPrompt && (
        <div className="fixed bottom-4 right-4 z-50 max-w-xs">
          <Alert className="border-primary/20 bg-white/95 shadow-lg backdrop-blur-sm">
            <Smartphone className="h-4 w-4" />
            <AlertDescription className="pr-6">
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1">
                  <p className="text-sm font-medium text-primary">{t('login.installApp')}</p>
                  {isInstallable && (
                    <Button
                      onClick={onInstall}
                      size="sm"
                      className="mt-1 h-7 bg-primary px-3 text-xs text-white hover:bg-primary/90"
                    >
                      <Download className="mr-1 h-3 w-3" />
                      {t('login.installNow')}
                    </Button>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 shrink-0 p-0 hover:bg-primary/10"
                  onClick={onDismissInstallPrompt}
                  aria-label={ariaLabels.closeInstallPrompt}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )}

      <div className="w-full max-w-md space-y-8">
        <div className="space-y-6 text-center">
          <div className="flex justify-center">
            <div className="flex h-40 w-40 items-center justify-center rounded-full bg-background shadow-[0_0_30px_rgba(59,130,246,0.3)] backdrop-blur-sm">
              {systemLogo && (
                <img
                  src={systemLogo}
                  alt="7Care — Sistema de Gestão Eclesiástica"
                  className="h-24 w-24 object-contain"
                />
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {isRegistering ? <RegisterForm /> : <LoginForm />}

          <div className="text-center">
            <Button
              variant="ghost"
              onClick={onToggleRegistering}
              className="text-white hover:bg-white/10 hover:text-white"
            >
              {isRegistering ? t('login.hasAccount') : t('login.noAccount')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
