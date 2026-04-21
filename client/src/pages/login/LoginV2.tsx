import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { usePrefetch } from '@/hooks/usePrefetch';
import { ariaLabels } from '@/lib/accessibility';
import { Download, Eye, EyeOff, Lock, Mail, Smartphone, X } from 'lucide-react';
import type { LoginShellProps } from './types';
import { PrototypeStatusBar } from '../v2/prototypeShared';

export const LoginV2 = ({
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
  const { login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { prefetchDashboardData, prefetchRoute } = usePrefetch();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoginError('');
    setIsSubmitting(true);

    try {
      const success = await login(email, password);

      if (success) {
        toast({
          title: 'Login realizado com sucesso!',
          description: 'Bem-vindo!',
        });

        const user = JSON.parse(localStorage.getItem('7care_auth') || '{}');
        const tutorialCompleted = user?.id
          ? localStorage.getItem(`tutorial_completed_${user.id}`)
          : null;
        const tutorialSkipped = user?.id
          ? localStorage.getItem(`tutorial_skipped_${user.id}`)
          : null;
        const needsFirstAccess =
          !tutorialCompleted && !tutorialSkipped && (user.usingDefaultPassword || user.firstAccess);

        if (needsFirstAccess) {
          navigate('/first-access');
        } else {
          prefetchRoute('/dashboard');
          prefetchDashboardData(user?.id, user?.role);
          navigate('/dashboard');
        }
      } else {
        setLoginError('Email ou senha incorretos. Verifique e tente novamente.');
      }
    } catch {
      setLoginError('Não foi possível conectar ao servidor. Tente novamente em alguns instantes.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p7-stage p7-stage--auth">
        <div className="p7-shell">
          <div className="p7-screen p7-login-screen">
            <PrototypeStatusBar />
            <div className="flex min-h-screen items-center justify-center">
              <div className="space-y-4 text-center">
                <div
                  className="mx-auto h-14 w-14 animate-spin rounded-full border-4 border-white/25 border-t-white"
                  aria-hidden="true"
                />
                <p className="text-sm text-white/75">{t('common.loading')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p7-stage p7-stage--auth relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="absolute inset-0 opacity-80" style={{ background: 'var(--gradient-soft)' }} />
      <div className="absolute inset-x-0 top-0 h-72 bg-primary/8 blur-3xl" aria-hidden="true" />

      {!isInstalled && showInstallPrompt && (
        <div className="fixed right-4 top-4 z-50 max-w-xs">
          <Alert className="border-border/80 bg-card/95 shadow-xl backdrop-blur-sm">
            <Smartphone className="h-4 w-4 text-primary" />
            <AlertDescription className="pr-6">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">{t('login.installApp')}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Abra o 7care com um toque e mantenha o acesso sempre por perto.
                  </p>
                  {isInstallable && (
                    <Button
                      onClick={onInstall}
                      size="sm"
                      className="mt-3 h-8 gap-1 rounded-full px-3"
                    >
                      <Download className="h-3.5 w-3.5" />
                      {t('login.installNow')}
                    </Button>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 shrink-0 p-0 hover:bg-muted"
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

      <div className="p7-shell relative z-10">
        <div className="p7-screen p7-login-screen">
          <PrototypeStatusBar />
          <div className="p7-login-body">
            <div className="p7-login-hero">
              <div className="mb-5 flex items-center gap-4 text-white">
                <div
                  className="flex h-[72px] w-[72px] items-center justify-center rounded-[22px] border border-white/18 bg-white/10 shadow-[0_18px_44px_rgba(5,15,36,0.28)]"
                  aria-hidden="true"
                >
                  <svg
                    width="42"
                    height="42"
                    viewBox="0 0 40 40"
                    fill="none"
                    className="text-white"
                  >
                    <path
                      d="M8 8h24L18 32"
                      stroke="currentColor"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle cx="18" cy="32" r="3" fill="currentColor" fillOpacity="0.38" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <div className="font-[var(--font-display)] text-[1.65rem] font-extrabold tracking-[-0.04em] text-white">
                    7care
                  </div>
                  <div className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-white/70">
                    Sistema de Gestão Eclesiástica
                  </div>
                </div>
              </div>

              <div className="text-[2rem] font-extrabold leading-[1.1] text-white md:text-[3.1rem]">
                Bem-vindo de volta
              </div>
              <div className="mb-9 mt-1 max-w-[38ch] text-[0.85rem] text-white/72 md:text-[0.98rem]">
                Organize agenda, cuidado espiritual e decisões do dia com uma base confiável para a
                rotina da igreja.
              </div>
            </div>

            <div className="p7-login-panel">
              {!isRegistering ? (
                <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                  {loginError ? (
                    <div id="login-error" className="p7-login-alert" role="alert">
                      {loginError}
                    </div>
                  ) : null}

                  <div className="relative">
                    <label htmlFor="login-identifier" className="sr-only">
                      Email ou usuário
                    </label>
                    <Mail className="p7-login-input-icon pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2" />
                    <Input
                      id="login-identifier"
                      type="text"
                      placeholder="Email ou usuário"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setLoginError('');
                      }}
                      autoComplete="username"
                      aria-invalid={Boolean(loginError)}
                      aria-describedby={loginError ? 'login-error' : undefined}
                      className="p7-login-input h-[50px] rounded-[14px] pl-11"
                      required
                    />
                  </div>

                  <div className="relative">
                    <label htmlFor="login-password" className="sr-only">
                      Senha
                    </label>
                    <Lock className="p7-login-input-icon pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2" />
                    <Input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Senha"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setLoginError('');
                      }}
                      autoComplete="current-password"
                      aria-invalid={Boolean(loginError)}
                      aria-describedby={loginError ? 'login-error' : undefined}
                      className="p7-login-input h-[50px] rounded-[14px] pl-11 pr-12"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="p7-login-input-toggle absolute right-3 top-1/2 -translate-y-1/2 transition"
                      aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                      aria-controls="login-password"
                      aria-pressed={showPassword}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="mt-2 h-[54px] rounded-[14px] bg-[var(--grad-gold)] text-[0.95rem] font-bold text-[var(--v2-navy-strong)] shadow-[0_12px_28px_rgba(5,15,36,0.24)] transition active:scale-[0.97]"
                  >
                    {isSubmitting ? 'Entrando...' : 'Entrar'}
                  </button>

                  <button
                    type="button"
                    onClick={onToggleRegistering}
                    className="mt-1 text-center text-[0.8rem] text-[var(--p7-text-3)]"
                  >
                    Não tem conta?{' '}
                    <span className="font-semibold text-[var(--p7-text)]">Criar agora</span>
                  </button>
                  <p className="text-center text-[0.8rem] text-[var(--p7-text-3)]">
                    Se perdeu o acesso, fale com a administração local para redefinir sua senha.
                  </p>
                </form>
              ) : (
                <div className="p7-login-register-card rounded-[18px] p-4 text-[var(--p7-text)] shadow-[0_8px_24px_rgba(0,0,0,.15)]">
                  <RegisterForm />
                  <button
                    type="button"
                    onClick={onToggleRegistering}
                    className="mt-3 w-full text-center text-sm font-semibold text-[hsl(var(--primary))]"
                  >
                    {t('login.hasAccount')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
