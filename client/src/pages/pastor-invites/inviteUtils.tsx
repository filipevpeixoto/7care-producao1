import { Clock, Send, CheckCircle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { type InviteStatus } from '@/types/pastor-invite';

export function getStatusBadge(status: InviteStatus) {
  switch (status) {
    case 'pending':
      return (
        <Badge
          variant="secondary"
          className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300"
        >
          <Clock className="w-3 h-3 mr-1" />
          Pendente
        </Badge>
      );
    case 'submitted':
      return (
        <Badge
          variant="secondary"
          className="bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300"
        >
          <Send className="w-3 h-3 mr-1" />
          Enviado
        </Badge>
      );
    case 'approved':
      return (
        <Badge
          variant="secondary"
          className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300"
        >
          <CheckCircle className="w-3 h-3 mr-1" />
          Aprovado
        </Badge>
      );
    case 'rejected':
      return (
        <Badge
          variant="secondary"
          className="bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300"
        >
          <XCircle className="w-3 h-3 mr-1" />
          Rejeitado
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

export function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getInviteLink(token: string) {
  return `${window.location.origin}/convite-pastor.html?token=${token}`;
}
