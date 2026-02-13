import { Trash2, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface DeleteAllInvitesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending: boolean;
  totalCount: number;
  counts: {
    pending: number;
    submitted: number;
    approved: number;
    rejected: number;
  };
}

export function DeleteAllInvitesDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending,
  totalCount,
  counts,
}: DeleteAllInvitesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Limpar Todos os Convites</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja excluir TODOS os {totalCount} convites? Esta ação não pode ser
            desfeita.
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5" />
            <p className="font-medium">Atenção!</p>
          </div>
          <p className="text-sm text-red-600 mt-1">
            Serão excluídos: {counts.pending} pendentes, {counts.submitted} enviados,{' '}
            {counts.approved} aprovados e {counts.rejected} rejeitados.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isPending}>
            {isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4 mr-2" />
            )}
            Excluir Todos ({totalCount})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
