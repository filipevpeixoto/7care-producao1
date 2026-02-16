import type { FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DialogWithModalTracking,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { DiscipleshipRequest } from '@shared/schema';
import type { UserWithDiscipleRequest } from '../usersTypes';

type CreateUserDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  createFormData: {
    name: string;
    email: string;
    phone: string;
    church: string;
    role: string;
    password: string;
  };
  handleCreateFormChange: (field: string, value: string) => void;
  userRole?: string;
  isSubmitting: boolean;
};

export const CreateUserDialog = ({
  isOpen,
  onOpenChange,
  onSubmit,
  onCancel,
  createFormData,
  handleCreateFormChange,
  userRole,
  isSubmitting,
}: CreateUserDialogProps) => (
  <DialogWithModalTracking
    modalId="create-user-modal"
    open={isOpen}
    onOpenChange={onOpenChange}
  >
    <DialogContent
      className="max-w-lg w-[95vw]"
      style={{ maxHeight: 'calc(100vh - 2rem)' }}
      aria-describedby="create-user-modal-description"
    >
      <div id="create-user-modal-description" className="sr-only">
        Formulário para criar novo usuário
      </div>
      <DialogHeader>
        <DialogTitle>Novo Usuário</DialogTitle>
      </DialogHeader>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="create-name">Nome Completo *</Label>
            <Input
              id="create-name"
              value={createFormData.name}
              onChange={(e) => handleCreateFormChange('name', e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-email">Email *</Label>
            <Input
              id="create-email"
              type="email"
              value={createFormData.email}
              onChange={(e) => handleCreateFormChange('email', e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-phone">Telefone</Label>
            <Input
              id="create-phone"
              value={createFormData.phone}
              onChange={(e) => handleCreateFormChange('phone', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-church">Igreja</Label>
            <Input
              id="create-church"
              value={createFormData.church}
              onChange={(e) => handleCreateFormChange('church', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-role">Perfil</Label>
            <Select value={createFormData.role} onValueChange={(value) => handleCreateFormChange('role', value)}>
              <SelectTrigger id="create-role">
                <SelectValue placeholder="Selecione o perfil" />
              </SelectTrigger>
              <SelectContent>
                {userRole === 'superadmin' ? (
                  <>
                    <SelectItem value="superadmin">Super Admin</SelectItem>
                    <SelectItem value="pastor">Pastor</SelectItem>
                    <SelectItem value="member">Membro</SelectItem>
                    <SelectItem value="missionary">Missionário</SelectItem>
                    <SelectItem value="interested">Amigo</SelectItem>
                    <SelectItem value="admin_readonly">Admin Leitura</SelectItem>
                  </>
                ) : (
                  <>
                    <SelectItem value="member">Membro</SelectItem>
                    <SelectItem value="missionary">Missionário</SelectItem>
                    <SelectItem value="interested">Amigo</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-password">Senha (opcional)</Label>
            <Input
              id="create-password"
              type="password"
              minLength={6}
              value={createFormData.password}
              onChange={(e) => handleCreateFormChange('password', e.target.value)}
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </DialogWithModalTracking>
);

type DeleteUserDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  userName?: string;
  onConfirm: () => void;
};

export const DeleteUserDialog = ({
  isOpen,
  onOpenChange,
  userName,
  onConfirm,
}: DeleteUserDialogProps) => (
  <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
        <AlertDialogDescription>
          Tem certeza que deseja excluir o usuário "{userName}"? Esta ação não pode ser desfeita.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancelar</AlertDialogCancel>
        <AlertDialogAction onClick={onConfirm} className="bg-red-600 hover:bg-red-700">
          Excluir
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

type DiscipleDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  userName?: string;
  discipleMessage: string;
  setDiscipleMessage: (value: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
};

export const DiscipleDialog = ({
  isOpen,
  onOpenChange,
  userName,
  discipleMessage,
  setDiscipleMessage,
  onSubmit,
  isSubmitting,
}: DiscipleDialogProps) => (
  <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Solicitar Discipulado</AlertDialogTitle>
        <AlertDialogDescription>
          Digite uma mensagem para solicitar o discipulado de "{userName}". Esta solicitação será
          enviada para aprovação do administrador.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <label htmlFor="disciple-message" className="text-right text-sm font-medium">
            Mensagem:
          </label>
          <textarea
            id="disciple-message"
            value={discipleMessage}
            onChange={(e) => setDiscipleMessage(e.target.value)}
            className="col-span-3 min-h-[100px] p-3 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Digite sua mensagem de solicitação..."
          />
        </div>
      </div>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancelar</AlertDialogCancel>
        <AlertDialogAction
          onClick={onSubmit}
          disabled={!discipleMessage.trim() || isSubmitting}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isSubmitting ? 'Enviando...' : 'Enviar Solicitação'}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

type AuthorizationModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedRequest: DiscipleshipRequest;
  usersWithDiscipleRequests: UserWithDiscipleRequest[];
  adminNotes: string;
  setAdminNotes: (value: string) => void;
  onReject: () => void;
  onApprove: () => void;
  onRemoveActive: (interestedId: number) => void;
};

export const AuthorizationModal = ({
  isOpen,
  onOpenChange,
  selectedRequest,
  usersWithDiscipleRequests,
  adminNotes,
  setAdminNotes,
  onReject,
  onApprove,
  onRemoveActive,
}: AuthorizationModalProps) => {
  const interestedId = selectedRequest.interestedId;
  const canRemove = selectedRequest.status === 'approved' && typeof interestedId === 'number';

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Autorizar Discipulado</AlertDialogTitle>
          <AlertDialogDescription>
            Aprove ou rejeite a solicitação de discipulado
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="font-medium text-muted-foreground">Missionário:</span>
                <div className="font-medium">
                  {usersWithDiscipleRequests.find(
                    (u) => u.id === selectedRequest.missionaryId
                  )?.name || `Usuário ${selectedRequest.missionaryId ?? ''}`}
                </div>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">Amigo:</span>
                <div className="font-medium">
                  {usersWithDiscipleRequests.find(
                    (u) => u.id === selectedRequest.interestedId
                  )?.name || `Usuário ${selectedRequest.interestedId ?? ''}`}
                </div>
              </div>
            </div>

            {selectedRequest.notes && (
              <div>
                <span className="font-medium text-muted-foreground">
                  Observações do Missionário:
                </span>
                <div className="text-sm bg-muted/50 p-2 rounded mt-1">
                  {selectedRequest.notes}
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-medium">Notas do Administrador:</label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className="w-full mt-1 p-2 border rounded-md"
                rows={3}
                placeholder="Adicione observações sobre sua decisão..."
              />
            </div>
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => onOpenChange(false)}>Cancelar</AlertDialogCancel>
          {canRemove && (
            <AlertDialogAction
              onClick={() => onRemoveActive(interestedId)}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Remover Discipulado
            </AlertDialogAction>
          )}
          <AlertDialogAction onClick={onReject} className="bg-red-600 hover:bg-red-700">
            Rejeitar
          </AlertDialogAction>
          <AlertDialogAction onClick={onApprove} className="bg-green-600 hover:bg-green-700">
            Aprovar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
