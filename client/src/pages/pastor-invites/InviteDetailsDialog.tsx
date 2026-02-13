import { Check, X, Loader2, UserPlus, Building2, Users, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { type PastorInvite } from '@/types/pastor-invite';
import { getStatusBadge, formatDate } from './inviteUtils';

interface InviteDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invite: PastorInvite | null;
  onApprove: () => void;
  onReject: () => void;
  isApproving: boolean;
}

export function InviteDetailsDialog({
  open,
  onOpenChange,
  invite,
  onApprove,
  onReject,
  isApproving,
}: InviteDetailsDialogProps) {
  if (!invite) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Detalhes do Cadastro</DialogTitle>
          <DialogDescription>Revise as informações enviadas pelo pastor</DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              {getStatusBadge(invite.status)}
              <span className="text-sm text-muted-foreground">
                Enviado em {formatDate(invite.submittedAt || invite.createdAt)}
              </span>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                Dados Pessoais
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Nome</p>
                  <p className="font-medium">{invite.onboardingData?.personal?.name || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-medium">{invite.email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Telefone</p>
                  <p className="font-medium">{invite.onboardingData?.personal?.phone || '-'}</p>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Distrito
              </h3>
              <div className="text-sm">
                <div className="mb-2">
                  <p className="text-muted-foreground">Nome do Distrito</p>
                  <p className="font-medium">{invite.onboardingData?.district?.name || '-'}</p>
                </div>
                {invite.onboardingData?.district?.description && (
                  <div>
                    <p className="text-muted-foreground">Descrição</p>
                    <p>{invite.onboardingData.district.description}</p>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Igrejas ({invite.onboardingData?.churches?.length || 0})
              </h3>
              {invite.onboardingData?.churches && invite.onboardingData.churches.length > 0 ? (
                <div className="space-y-2">
                  {invite.onboardingData.churches.map((church, index) => (
                    <div key={index} className="p-3 bg-muted rounded-lg">
                      <p className="font-medium">{church.name}</p>
                      {church.address && (
                        <p className="text-sm text-muted-foreground">{church.address}</p>
                      )}
                      {church.isNew && (
                        <Badge variant="outline" className="mt-1 text-xs">
                          Nova igreja
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhuma igreja cadastrada</p>
              )}
            </div>

            {invite.onboardingData?.excelData && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Membros Importados
                  </h3>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium">{invite.onboardingData.excelData.fileName}</p>
                    <p className="text-sm text-muted-foreground">
                      {invite.onboardingData.excelData.totalRows} membros
                    </p>
                  </div>
                </div>
              </>
            )}

            {invite.status === 'rejected' && invite.rejectionReason && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2 text-red-600">
                    <AlertCircle className="w-4 h-4" />
                    Motivo da Rejeição
                  </h3>
                  <p className="text-sm bg-red-50 p-3 rounded-lg border border-red-200">
                    {invite.rejectionReason}
                  </p>
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="mt-4">
          {invite.status === 'submitted' && (
            <>
              <Button variant="destructive" onClick={onReject}>
                <X className="w-4 h-4 mr-2" />
                Rejeitar
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={onApprove}
                disabled={isApproving}
              >
                {isApproving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 mr-2" />
                )}
                Aprovar
              </Button>
            </>
          )}
          {(invite.status === 'approved' || invite.status === 'rejected') && (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
