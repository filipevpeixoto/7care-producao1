import { Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { type PastorInvite } from '@/types/pastor-invite';
import { formatDate } from './inviteUtils';

interface DeleteInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invite: PastorInvite | null;
  onConfirm: () => void;
  isPending: boolean;
}

export function DeleteInviteDialog({
  open,
  onOpenChange,
  invite,
  onConfirm,
  isPending,
}: DeleteInviteDialogProps) {
  if (!invite) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir Convite</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja excluir este convite? Esta ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 bg-muted rounded-lg">
          <p className="font-medium">{invite.email}</p>
          <p className="text-sm text-muted-foreground">
            Status: {invite.status} • Criado em {formatDate(invite.createdAt)}
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
            Excluir Convite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
