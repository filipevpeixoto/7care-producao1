import { CheckCircle, XCircle, Loader2, Building2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { type ApprovalProgress } from './useApprovalProgress';

interface ApprovalProgressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  progress: ApprovalProgress;
  onClose: () => void;
}

export function ApprovalProgressDialog({
  open,
  onOpenChange,
  progress,
  onClose,
}: ApprovalProgressDialogProps) {
  const hasPendingMembers = (progress.result?.membersPending ?? 0) > 0;

  return (
    <Dialog
      open={open}
      onOpenChange={open => {
        if (!open && ((progress.isComplete && !hasPendingMembers) || progress.isError)) {
          onOpenChange(false);
        }
      }}
    >
      <DialogContent
        className="sm:max-w-md"
        onInteractOutside={e => {
          if ((!progress.isComplete && !progress.isError) || hasPendingMembers) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {progress.isComplete ? (
              <>
                <CheckCircle className="w-5 h-5 text-green-600" />
                Aprovação Concluída
              </>
            ) : progress.isError ? (
              <>
                <XCircle className="w-5 h-5 text-red-600" />
                Erro na Aprovação
              </>
            ) : (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                Processando Aprovação
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium">{progress.step}</span>
              <span className="text-muted-foreground">{progress.progress}%</span>
            </div>
            <Progress
              value={progress.progress}
              className={`h-2 ${
                progress.isError
                  ? '[&>div]:bg-red-500'
                  : progress.isComplete
                    ? '[&>div]:bg-green-500'
                    : ''
              }`}
            />
            <p className="text-sm text-muted-foreground">{progress.details}</p>
          </div>

          {progress.isComplete && progress.result && (
            <div className="space-y-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <h4 className="font-semibold text-green-800 dark:text-green-300 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Resumo da Importação
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
                    <span>{progress.result.membersImported} novos membros</span>
                  </div>
                )}
                {(progress.result.membersUpdated ?? 0) > 0 && (
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span>{progress.result.membersUpdated} atualizados</span>
                  </div>
                )}
                {(progress.result.membersPending ?? 0) > 0 && (
                  <div className="flex items-center gap-2 col-span-2">
                    <Loader2 className="w-4 h-4 text-amber-600 animate-spin" />
                    <span className="text-amber-700 dark:text-amber-400">
                      {progress.result.membersPending} membros sendo importados...
                    </span>
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
              disabled={hasPendingMembers}
              className={
                progress.isComplete && !hasPendingMembers ? 'bg-green-600 hover:bg-green-700' : ''
              }
            >
              {hasPendingMembers ? 'Importando...' : progress.isComplete ? 'Concluir' : 'Fechar'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
