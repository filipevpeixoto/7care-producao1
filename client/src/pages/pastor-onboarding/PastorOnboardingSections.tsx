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

export const InvalidInviteState = ({ effectiveValidationError, onBackHome }: InvalidInviteStateProps) => (
  <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center relative overflow-hidden">
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
    </div>

    <div className="relative z-10 bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-12 max-w-md w-full mx-4 text-center shadow-2xl">
      <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
        <AlertCircle className="w-10 h-10 text-red-400" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-3">Convite Inválido</h2>
      <p className="text-red-200 mb-8">{effectiveValidationError}</p>
      <button
        onClick={onBackHome}
        className="inline-flex items-center gap-2 bg-white text-slate-900 px-8 py-3 rounded-full font-semibold hover:bg-blue-50 transition-all duration-300 hover:-translate-y-1 shadow-lg hover:shadow-xl"
      >
        <ArrowLeft className="w-5 h-5" />
        Voltar para Home
      </button>
    </div>
  </div>
);

type SuccessStateProps = {
  onGoToLogin: () => void;
};

export const SuccessState = ({ onGoToLogin }: SuccessStateProps) => (
  <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center relative overflow-hidden">
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
    </div>

    <div className="relative z-10 bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-12 max-w-lg w-full mx-4 text-center shadow-2xl">
      <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/30">
        <CheckCircle className="w-12 h-12 text-white" />
      </div>
      <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">Cadastro Concluído! 🎉</h2>
      <p className="text-blue-200 mb-8 text-base sm:text-lg px-4 sm:px-0">
        Seu cadastro foi concluído com sucesso! Você já pode fazer login e começar a usar o sistema
        imediatamente.
      </p>

      <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-8 px-4 sm:px-0">
        <div className="col-span-2 bg-gradient-to-r from-orange-500/20 to-amber-500/20 rounded-xl p-4 sm:p-5 border border-orange-400/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-orange-500 text-white text-[10px] sm:text-xs font-bold px-2 py-1 rounded-bl-lg">
            NOVO!
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-orange-400 to-amber-500 p-3 rounded-xl shadow-lg shadow-orange-500/30">
              <WifiOff className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </div>
            <div className="text-left">
              <h3 className="text-white font-bold text-sm sm:text-base">Modo Offline Completo</h3>
              <p className="text-orange-200/80 text-[10px] sm:text-xs">
                Trabalhe sem internet! Orações, reuniões, discipulado e mais
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white/5 rounded-xl p-3 sm:p-4 border border-white/10">
          <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-blue-400 mx-auto mb-2" />
          <p className="text-white/70 text-[10px] sm:text-xs">Acesso Seguro</p>
        </div>
        <div className="bg-white/5 rounded-xl p-3 sm:p-4 border border-white/10">
          <Users className="w-6 h-6 sm:w-8 sm:h-8 text-purple-400 mx-auto mb-2" />
          <p className="text-white/70 text-[10px] sm:text-xs">Gestão de Membros</p>
        </div>
      </div>

      <button
        onClick={onGoToLogin}
        className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white px-8 py-4 rounded-full font-semibold hover:from-blue-600 hover:to-purple-600 transition-all duration-300 hover:-translate-y-1 shadow-lg hover:shadow-xl hover:shadow-blue-500/25"
      >
        <Sparkles className="w-5 h-5" />
        Ir para Login
      </button>
    </div>
  </div>
);

type ProgressDialogProps = {
  isOpen: boolean;
  onRequestClose: (open: boolean) => void;
  progress: ProgressState;
  onClose: () => void;
};

export const ProgressDialog = ({ isOpen, onRequestClose, progress, onClose }: ProgressDialogProps) => {
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
