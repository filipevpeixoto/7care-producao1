import { Mail, UserPlus, Building2, Copy, Eye, Check, X, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { type PastorInvite } from '@/types/pastor-invite';
import { getStatusBadge, formatDate } from './inviteUtils';

interface InviteCardProps {
  invite: PastorInvite;
  onCopyLink: (token: string) => void;
  onViewDetails: (invite: PastorInvite) => void;
  onApprove: (invite: PastorInvite) => void;
  onReject: (invite: PastorInvite) => void;
  onDelete: (invite: PastorInvite) => void;
}

export function InviteCard({
  invite,
  onCopyLink,
  onViewDetails,
  onApprove,
  onReject,
  onDelete,
}: InviteCardProps) {
  const isExpired =
    invite.status === 'pending' && new Date(invite.expiresAt) < new Date();

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {getStatusBadge(invite.status)}
              {isExpired && (
                <Badge variant="destructive" className="text-xs">
                  Expirado
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2 mb-1">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{invite.email}</span>
            </div>

            {invite.onboardingData?.personal?.name && (
              <div className="flex items-center gap-2 mb-1 text-sm text-muted-foreground">
                <UserPlus className="w-4 h-4" />
                <span>{invite.onboardingData.personal.name}</span>
              </div>
            )}

            {invite.onboardingData?.district?.name && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Building2 className="w-4 h-4" />
                <span>{invite.onboardingData.district.name}</span>
                {invite.onboardingData.churches && (
                  <span className="text-xs">
                    ({invite.onboardingData.churches.length} igrejas)
                  </span>
                )}
              </div>
            )}

            <p className="text-xs text-muted-foreground mt-2">
              Criado em {formatDate(invite.createdAt)}
            </p>
          </div>

          <div className="flex gap-2">
            {invite.status === 'pending' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onCopyLink(invite.token)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => onDelete(invite)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </>
            )}

            {invite.status === 'submitted' && (
              <>
                <Button variant="outline" size="sm" onClick={() => onViewDetails(invite)}>
                  <Eye className="w-4 h-4" />
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => onApprove(invite)}
                >
                  <Check className="w-4 h-4" />
                </Button>
                <Button variant="destructive" size="sm" onClick={() => onReject(invite)}>
                  <X className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => onDelete(invite)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </>
            )}

            {(invite.status === 'approved' || invite.status === 'rejected') && (
              <>
                <Button variant="ghost" size="sm" onClick={() => onViewDetails(invite)}>
                  <Eye className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => onDelete(invite)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
