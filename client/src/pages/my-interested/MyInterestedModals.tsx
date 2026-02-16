import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CheckCircle, Clock, UserPlus, XCircle, Send } from 'lucide-react';
import type { DiscipleshipRequest, InterestedPerson } from './myInterestedTypes';
import type { UserMember } from '@/types/domain';

type DiscipleDialogProps = {
  isOpen: boolean;
  selectedInterested: InterestedPerson | null;
  discipleMessage: string;
  setDiscipleMessage: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  isSubmitting: boolean;
};

export const DiscipleDialog = ({
  isOpen,
  selectedInterested,
  discipleMessage,
  setDiscipleMessage,
  onCancel,
  onConfirm,
  isSubmitting,
}: DiscipleDialogProps) =>
  isOpen && selectedInterested ? (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Solicitar Discipulado</CardTitle>
          <CardDescription>
            Solicite permissão para discipular {selectedInterested.name}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Mensagem para o administrador:</label>
            <textarea
              aria-label="Mensagem para o administrador"
              className="w-full mt-1 p-2 border rounded-md bg-background text-foreground"
              rows={3}
              placeholder="Explique por que você gostaria de discipular esta pessoa..."
              value={discipleMessage}
              onChange={(e) => setDiscipleMessage(e.target.value)}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button onClick={onConfirm} disabled={!discipleMessage.trim() || isSubmitting}>
              {isSubmitting ? 'Enviando...' : 'Enviar Solicitação'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  ) : null;

type AuthorizationModalProps = {
  isOpen: boolean;
  selectedRequest: DiscipleshipRequest | null;
  adminNotes: string;
  setAdminNotes: (value: string) => void;
  getUserInfo: (userId: number) => string;
  onCancel: () => void;
  onProcess: (status: 'approved' | 'rejected') => void;
  isProcessing: boolean;
};

export const AuthorizationModal = ({
  isOpen,
  selectedRequest,
  adminNotes,
  setAdminNotes,
  getUserInfo,
  onCancel,
  onProcess,
  isProcessing,
}: AuthorizationModalProps) =>
  isOpen && selectedRequest ? (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            Autorizar Discipulado
          </CardTitle>
          <CardDescription>Aprove ou rejeite a solicitação de discipulado</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="font-medium text-muted-foreground">Missionário:</span>
                <div className="font-medium">{getUserInfo(selectedRequest.missionaryId)}</div>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">Amigo:</span>
                <div className="font-medium">{getUserInfo(selectedRequest.interestedId)}</div>
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
                aria-label="Notas do administrador"
                className="w-full mt-1 p-2 border rounded-md bg-background text-foreground"
                rows={3}
                placeholder="Adicione observações sobre sua decisão..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onCancel}>
              Cancelar
            </Button>

            <Button
              variant="destructive"
              onClick={() => onProcess('rejected')}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processando...
                </div>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-1" />
                  Rejeitar
                </>
              )}
            </Button>

            <Button
              onClick={() => onProcess('approved')}
              disabled={isProcessing}
              className="bg-green-600 hover:bg-green-700"
            >
              {isProcessing ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processando...
                </div>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Aprovar
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  ) : null;

type InviteModalProps = {
  isOpen: boolean;
  inviteInterested: InterestedPerson | null;
  selectedMissionaryId: string;
  setSelectedMissionaryId: (value: string) => void;
  availableMissionaries: UserMember[];
  onCancel: () => void;
  onConfirm: () => void;
  isSubmitting: boolean;
};

export const InviteModal = ({
  isOpen,
  inviteInterested,
  selectedMissionaryId,
  setSelectedMissionaryId,
  availableMissionaries,
  onCancel,
  onConfirm,
  isSubmitting,
}: InviteModalProps) =>
  isOpen && inviteInterested ? (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Convidar Discipulador
          </CardTitle>
          <CardDescription>
            Convide um membro para discipular <strong>{inviteInterested.name}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Selecione o membro:</label>
            <Select aria-label="Selecionar membro" value={selectedMissionaryId} onValueChange={setSelectedMissionaryId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Escolha um membro..." />
              </SelectTrigger>
              <SelectContent>
                {availableMissionaries.map((m: UserMember) => (
                  <SelectItem key={m.id} value={m.id.toString()}>
                    {m.name} {m.church ? `(${m.church})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <p className="text-xs text-muted-foreground">
            O membro receberá um convite e poderá aceitar ou recusar.
          </p>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button
              onClick={onConfirm}
              disabled={!selectedMissionaryId || isSubmitting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Enviando...
                </div>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-1" />
                  Enviar Convite
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  ) : null;
