import type { ReactNode } from 'react';
import {
  AlertCircle,
  CheckCircle,
  Loader2,
  ArrowLeft,
  Sparkles,
  Shield,
  Users,
  WifiOff,
  XCircle,
  Building2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useTheme } from '@/contexts/ThemeContext';
import { PublicPageV2 } from '@/components/layout/v2/PublicPageV2';

type ProgressState = {
  step: string;
  progress: number;
  details: string;
  isComplete: boolean;
  isError: boolean;
  result?: {
    districtId?: number;
    churchesCreated?: number;
    membersImported?: number;
  };
};

type InvalidInviteStateProps = {
  effectiveValidationError: string | null;
  onBackHome: () => void;
};

export const InvalidInviteState = ({
  effectiveValidationError,
  onBackHome,
}: InvalidInviteStateProps) => (
  <StateShellV2Aware
    title="Convite inválido"
    subtitle="Não foi possível validar este convite para o onboarding."
    icon={AlertCircle}
    tone="error"
    content={effectiveValidationError}
    actionLabel="Voltar para Home"
    onAction={onBackHome}
  />
);

type SuccessStateProps = {
  onGoToLogin: () => void;
};

export const SuccessState = ({ onGoToLogin }: SuccessStateProps) => (
  <StateShellV2Aware
    title="Cadastro concluído"
    subtitle="Seu ambiente já está pronto para o primeiro acesso."
    icon={CheckCircle}
    tone="success"
    content="Seu cadastro foi concluído com sucesso. Agora você já pode entrar e começar a usar o sistema."
    actionLabel="Ir para Login"
    onAction={onGoToLogin}
    extras={
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 rounded-[18px] border border-[rgba(196,136,12,.24)] bg-[rgba(196,136,12,.10)] p-4 text-left">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[var(--gradient-secondary)] text-white">
              <WifiOff className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--p7-text)]">Modo offline completo</h3>
              <p className="text-xs text-[var(--p7-text-2)]">
                Trabalhe sem internet com orações, reuniões e discipulado.
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-[18px] border border-[var(--p7-border)] bg-[rgba(27,80,212,.06)] p-4 text-center">
          <Shield className="mx-auto mb-2 h-7 w-7 text-[hsl(var(--primary))]" />
          <p className="text-xs font-medium text-[var(--p7-text-2)]">Acesso seguro</p>
        </div>
        <div className="rounded-[18px] border border-[var(--p7-border)] bg-[rgba(27,80,212,.06)] p-4 text-center">
          <Users className="mx-auto mb-2 h-7 w-7 text-[hsl(var(--primary))]" />
          <p className="text-xs font-medium text-[var(--p7-text-2)]">Gestão de membros</p>
        </div>
      </div>
    }
  />
);

const StateShellV2Aware = ({
  title,
  subtitle,
  icon: Icon,
  tone,
  content,
  actionLabel,
  onAction,
  extras,
}: {
  title: string;
  subtitle: string;
  icon: typeof AlertCircle;
  tone: 'error' | 'success';
  content: string | null;
  actionLabel: string;
  onAction: () => void;
  extras?: ReactNode;
}) => {
  const { skin } = useTheme();

  if (skin === 'v2') {
    return (
      <PublicPageV2 title={title} subtitle={subtitle} icon={Icon} backLabel={actionLabel}>
        <div className="rounded-[22px] border border-[var(--p7-border)] bg-[var(--p7-card)] p-8 text-center shadow-[0_8px_28px_rgba(13,34,72,.08)]">
          <div
            className={`mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full ${
              tone === 'error'
                ? 'bg-[rgba(220,38,38,.10)] text-[hsl(var(--destructive))]'
                : 'bg-[rgba(34,197,94,.12)] text-[#16a34a]'
            }`}
          >
            <Icon className="h-12 w-12" />
          </div>
          <h2 className="mb-3 text-3xl font-bold text-[var(--p7-text)]">{title}</h2>
          <p className="mx-auto mb-8 max-w-[46ch] text-[var(--p7-text-2)]">{content}</p>
          {extras ? <div className="mb-8">{extras}</div> : null}
          <Button onClick={onAction}>
            {tone === 'error' ? (
              <ArrowLeft className="h-4 w-4" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {actionLabel}
          </Button>
        </div>
      </PublicPageV2>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className={`absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl ${tone === 'error' ? 'bg-red-500/10' : 'bg-green-500/10'}`}
        />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-12 max-w-lg w-full mx-4 text-center shadow-2xl">
        <div
          className={`mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full ${
            tone === 'error'
              ? 'bg-red-500/20 text-red-400'
              : 'bg-gradient-to-br from-green-400 to-emerald-500 text-white shadow-lg shadow-green-500/30'
          }`}
        >
          <Icon className="h-12 w-12" />
        </div>
        <h2 className="mb-3 text-2xl font-bold text-white">{title}</h2>
        <p className="mb-8 text-blue-200">{content}</p>
        {extras ? <div className="mb-8">{extras}</div> : null}
        <button
          onClick={onAction}
          className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-3 font-semibold text-slate-900 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:bg-blue-50 hover:shadow-xl"
        >
          {tone === 'error' ? <ArrowLeft className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
          {actionLabel}
        </button>
      </div>
    </div>
  );
};

type ProgressDialogProps = {
  isOpen: boolean;
  onRequestClose: (open: boolean) => void;
  progress: ProgressState;
  onClose: () => void;
};

export const ProgressDialog = ({
  isOpen,
  onRequestClose,
  progress,
  onClose,
}: ProgressDialogProps) => {
  let titleIcon = <Loader2 className="w-5 h-5 animate-spin text-blue-600" />;
  let titleText = 'Processando Cadastro';
  if (progress.isComplete) {
    titleIcon = <CheckCircle className="w-5 h-5 text-green-600" />;
    titleText = 'Cadastro Concluído';
  } else if (progress.isError) {
    titleIcon = <XCircle className="w-5 h-5 text-red-600" />;
    titleText = 'Erro no Cadastro';
  }

  let progressClassName = 'h-2';
  if (progress.isError) {
    progressClassName = 'h-2 [&>div]:bg-red-500';
  } else if (progress.isComplete) {
    progressClassName = 'h-2 [&>div]:bg-green-500';
  }

  return (
    <Dialog open={isOpen} onOpenChange={onRequestClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {titleIcon}
            {titleText}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium">{progress.step}</span>
              <span className="text-muted-foreground">{progress.progress}%</span>
            </div>
            <Progress value={progress.progress} className={progressClassName} />
            <p className="text-sm text-muted-foreground">{progress.details}</p>
          </div>

          {progress.isComplete && progress.result && (
            <div className="space-y-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <h4 className="font-semibold text-green-800 dark:text-green-300 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Resumo do Cadastro
              </h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {progress.result.districtId && (
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-green-600" />
                    <span>Distrito criado</span>
                  </div>
                )}
                {(progress.result.churchesCreated ?? 0) > 0 && (
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-green-600" />
                    <span>{progress.result.churchesCreated} igreja(s)</span>
                  </div>
                )}
                {(progress.result.membersImported ?? 0) > 0 && (
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-green-600" />
                    <span>{progress.result.membersImported} membros</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {progress.isError && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-700 dark:text-red-300">{progress.details}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          {(progress.isComplete || progress.isError) && (
            <Button
              onClick={onClose}
              className={progress.isComplete ? 'bg-green-600 hover:bg-green-700' : ''}
            >
              {progress.isComplete ? 'Ir para Login' : 'Fechar'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
