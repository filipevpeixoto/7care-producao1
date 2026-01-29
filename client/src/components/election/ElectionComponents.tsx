/**
 * Componentes reutilizáveis para sistema de eleições
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Vote,
  Users,
  CheckCircle,
  Play,
  Pause,
  Edit,
  Trash2,
  Eye,
  Loader2,
  Church,
  Calendar,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';

/**
 * Tipos de status de eleição
 */
export type ElectionStatus =
  | 'draft'
  | 'active'
  | 'paused'
  | 'finished'
  | 'cancelled'
  | 'pending'
  | 'closed';

/**
 * Interface base para eleição
 */
export interface ElectionBase {
  id: number;
  church_name?: string;
  title?: string;
  status: ElectionStatus | string;
  created_at: string;
  positions?: string[];
  voters?: number[];
}

/**
 * Props para badge de status
 */
interface ElectionStatusBadgeProps {
  status: ElectionStatus | string;
  className?: string;
}

/**
 * Badge colorido para status de eleição
 */
export function ElectionStatusBadge({ status, className = '' }: ElectionStatusBadgeProps) {
  const getVariant = (): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'default';
      case 'finished':
      case 'closed':
        return 'secondary';
      case 'paused':
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getLabel = (): string => {
    switch (status.toLowerCase()) {
      case 'draft':
        return 'Rascunho';
      case 'active':
        return 'Ativa';
      case 'paused':
        return 'Pausada';
      case 'finished':
        return 'Finalizada';
      case 'cancelled':
        return 'Cancelada';
      case 'pending':
        return 'Pendente';
      case 'closed':
        return 'Encerrada';
      default:
        return status;
    }
  };

  return (
    <Badge variant={getVariant()} className={className}>
      {getLabel()}
    </Badge>
  );
}

/**
 * Props para card de estatísticas
 */
interface ElectionStatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  description?: string;
  className?: string;
}

/**
 * Card de estatística de eleição
 */
export function ElectionStatCard({
  title,
  value,
  icon,
  description,
  className = '',
}: ElectionStatCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          <div className="text-muted-foreground">{icon}</div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </CardContent>
    </Card>
  );
}

/**
 * Props para loading de eleição
 */
interface ElectionLoadingProps {
  message?: string;
  className?: string;
}

/**
 * Componente de loading para páginas de eleição
 */
export function ElectionLoading({
  message = 'Carregando...',
  className = '',
}: ElectionLoadingProps) {
  return (
    <div className={`p-4 flex items-center justify-center min-h-[400px] ${className}`}>
      <Loader2 className="h-8 w-8 animate-spin" />
      <span className="ml-2">{message}</span>
    </div>
  );
}

/**
 * Props para mensagem de eleição vazia
 */
interface ElectionEmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

/**
 * Estado vazio para listas de eleição
 */
export function ElectionEmptyState({
  title,
  description,
  icon = <Vote className="h-12 w-12 text-muted-foreground" />,
  action,
  className = '',
}: ElectionEmptyStateProps) {
  return (
    <Card className={className}>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <div className="mb-4">{icon}</div>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground text-center mb-4">{description}</p>
        )}
        {action && <Button onClick={action.onClick}>{action.label}</Button>}
      </CardContent>
    </Card>
  );
}

/**
 * Props para item de lista de eleição
 */
interface ElectionListItemProps {
  election: ElectionBase;
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onStart?: () => void;
  onPause?: () => void;
  showActions?: boolean;
  className?: string;
}

/**
 * Item de lista de eleição
 */
export function ElectionListItem({
  election,
  onView,
  onEdit,
  onDelete,
  onStart,
  onPause,
  showActions = true,
  className = '',
}: ElectionListItemProps) {
  return (
    <Card className={`hover:shadow-md transition-shadow ${className}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Church className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">
              {election.title || election.church_name || 'Eleição'}
            </CardTitle>
          </div>
          <ElectionStatusBadge status={election.status} />
        </div>
        {election.church_name && election.title && (
          <CardDescription>{election.church_name}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>{formatDate(election.created_at)}</span>
          </div>
          {election.voters && (
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>{election.voters.length} eleitores</span>
            </div>
          )}
          {election.positions && (
            <div className="flex items-center gap-1">
              <Vote className="h-4 w-4" />
              <span>{election.positions.length} cargos</span>
            </div>
          )}
        </div>

        {showActions && (
          <div className="flex gap-2">
            {onView && (
              <Button variant="outline" size="sm" onClick={onView}>
                <Eye className="h-4 w-4 mr-1" />
                Ver
              </Button>
            )}
            {onEdit && (
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Edit className="h-4 w-4 mr-1" />
                Editar
              </Button>
            )}
            {onStart && election.status === 'draft' && (
              <Button variant="default" size="sm" onClick={onStart}>
                <Play className="h-4 w-4 mr-1" />
                Iniciar
              </Button>
            )}
            {onPause && election.status === 'active' && (
              <Button variant="secondary" size="sm" onClick={onPause}>
                <Pause className="h-4 w-4 mr-1" />
                Pausar
              </Button>
            )}
            {onDelete && (
              <Button variant="destructive" size="sm" onClick={onDelete}>
                <Trash2 className="h-4 w-4 mr-1" />
                Excluir
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Props para card de eleição ativa (para votação)
 */
interface ActiveElectionCardProps {
  election: {
    election_id: number;
    config_id: number;
    church_name: string;
    status: string;
    current_position?: number;
    positions?: string[];
    voters?: number[];
    created_at: string;
  };
  onVote: () => void;
  hasVoted?: boolean;
  className?: string;
}

/**
 * Card para eleição ativa na tela de votação
 */
export function ActiveElectionCard({
  election,
  onVote,
  hasVoted = false,
  className = '',
}: ActiveElectionCardProps) {
  return (
    <Card className={`border-2 border-primary/20 ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Church className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">{election.church_name}</CardTitle>
          </div>
          <Badge variant="default" className="bg-green-500">
            <Vote className="h-3 w-3 mr-1" />
            Ativa
          </Badge>
        </div>
        <CardDescription className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Iniciada em {formatDate(election.created_at)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {election.positions && election.positions.length > 0 && (
          <div className="mb-4">
            <p className="text-sm font-medium mb-2">Cargos em votação:</p>
            <div className="flex flex-wrap gap-2">
              {election.positions.map((position, index) => (
                <Badge key={index} variant="outline">
                  {position}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {hasVoted ? (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">Você já votou nesta eleição</span>
          </div>
        ) : (
          <Button onClick={onVote} className="w-full">
            <Vote className="h-4 w-4 mr-2" />
            Votar Agora
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Props para alerta de erro
 */
interface ElectionErrorAlertProps {
  message: string;
  onRetry?: () => void;
  className?: string;
}

/**
 * Alerta de erro para operações de eleição
 */
export function ElectionErrorAlert({ message, onRetry, className = '' }: ElectionErrorAlertProps) {
  return (
    <Card className={`border-destructive ${className}`}>
      <CardContent className="flex items-center justify-between py-4">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span>{message}</span>
        </div>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Tentar novamente
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Helper para formatar data
 */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Helper para formatar data curta
 */
export function formatShortDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
