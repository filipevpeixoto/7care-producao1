import { useState } from 'react';
import { Mail, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface CreateInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (email: string) => void;
  isPending: boolean;
}

export function CreateInviteDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: CreateInviteDialogProps) {
  const [email, setEmail] = useState('');

  const handleSubmit = () => {
    if (!email.trim()) return;
    onSubmit(email.trim());
    setEmail('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo Convite de Pastor</DialogTitle>
          <DialogDescription>
            Insira o email do pastor que deseja convidar. Um link único será gerado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="email">Email do Pastor</Label>
            <Input
              id="email"
              type="email"
              placeholder="pastor@exemplo.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!email.trim() || isPending}>
            {isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Mail className="w-4 h-4 mr-2" />
            )}
            Criar Convite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
