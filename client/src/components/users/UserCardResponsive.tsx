import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  User,
  Phone,
  MapPin,
  CheckCircle,
  Clock,
  Trash2,
  Eye,
  MessageCircle,
  CheckSquare,
  Square,
  Star,
  Calendar,
  Heart,
  Check,
  ChevronsUpDown,
} from 'lucide-react';
import { getMountName, getLevelName, getLevelIcon } from '@/lib/gamification';
import { MountIcon } from '@/components/ui/mount-icon';

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DiscipuladoresManager } from './DiscipuladoresManager';
import { DiscipuladorButton } from './DiscipuladorButton';
import { cn } from '@/lib/utils';

import { useState, useEffect } from 'react';
import { MarkVisitModal } from './MarkVisitModal';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { hasAdminAccess } from '@/lib/permissions';
import { useSituationLevels } from '@/hooks/useSituationLevels';
import { fetchWithAuth } from '@/lib/api';
import { type Relationship, type User as UserType } from '@shared/schema';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type LocalUser = UserType & { photo?: string | null };

interface UserCardProps {
  user: LocalUser;
  onClick?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onView?: () => void;
  onScheduleVisit?: () => void;
  onDiscipleRequest?: () => void;
  showActions?: boolean;
  relationshipsData?: Array<Relationship & { missionaryName?: string | null }>;
  potentialMissionaries?: UserType[];
  hasPendingDiscipleRequest?: boolean;
}

type Discipulador = {
  id: number;
  name: string;
  relationshipId: number;
};

type VisitHistoryItem = {
  id?: number | string;
  visit_date: string;
};

type SpiritualCheckIn = {
  score: number;
  notes?: string | null;
};

type SpiritualData = {
  checkIns: SpiritualCheckIn[];
};

export function UserCardResponsive({
  user,
  onClick,
  onApprove: _onApprove,
  onReject: _onReject,
  onEdit: _onEdit,
  onDelete,
  onView,
  onScheduleVisit,
  onDiscipleRequest,
  showActions = true,
  relationshipsData = [],
  potentialMissionaries: _potentialMissionaries = [],
  hasPendingDiscipleRequest = false,
}: UserCardProps) {
  const [localUser, setLocalUser] = useState<LocalUser>(user);
  const [isMarkingVisit, setIsMarkingVisit] = useState(false);
  const [showMarkVisitModal, setShowMarkVisitModal] = useState(false);
  const [showPhotoPreview, setIsPhotoPreviewOpen] = useState(false);
  const [showVisitHistory, setShowVisitHistory] = useState(false);
  const [visitHistory, setVisitHistory] = useState<VisitHistoryItem[]>([]);
  const [openSituationPopover, setOpenSituationPopover] = useState(false);
  const [selectedSituation, setSelectedSituation] = useState(localUser.interestedSituation || '');
  const [userSpiritual, setUserSpiritual] = useState<SpiritualData | null>(null);
  const [currentDiscipuladores, setCurrentDiscipuladores] = useState<Discipulador[]>([]);

  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  const { levels: situationLevels } = useSituationLevels();

  // Atualizar usuário local quando prop mudar
  useEffect(() => {
    setLocalUser(user);
    setSelectedSituation(user.interestedSituation || '');
  }, [user]);

  // Carregar check-in espiritual do usuário
  useEffect(() => {
    const loadSpiritualCheckIn = async () => {
      try {
        const response = await fetch(`/api/emotional-checkins/user/${localUser.id}`);
        if (response.ok) {
          const data = await response.json();
          // A API retorna um array de check-ins, pegar o mais recente
          const checkIns = Array.isArray(data) ? data : [];
          if (checkIns.length > 0) {
            setUserSpiritual({ checkIns });
          }
        }
      } catch (_error) {
        // Silenciar erro - não é crítico
      }
    };

    if (localUser?.id && hasAdminAccess(currentUser)) {
      loadSpiritualCheckIn();
    }
  }, [localUser?.id, currentUser]);

  const getExtraDataObject = (value: LocalUser['extraData']): Record<string, unknown> => {
    if (value && typeof value === 'object') {
      return value as Record<string, unknown>;
    }
    return {};
  };

  useEffect(() => {
    if (relationshipsData && localUser.role === 'interested') {
      const userDiscipuladores: Discipulador[] = relationshipsData.flatMap((rel) => {
        if (
          rel.interestedId !== localUser.id ||
          rel.status !== 'active' ||
          typeof rel.missionaryId !== 'number'
        ) {
          return [];
        }
        const missionaryName = rel.missionaryName;
        return [
          {
            id: rel.missionaryId,
            name: typeof missionaryName === 'string' ? missionaryName : 'Usuário não encontrado',
            relationshipId: rel.id,
          },
        ];
      });

      setCurrentDiscipuladores(userDiscipuladores);
    }
  }, [relationshipsData, localUser.id, localUser.role]);

  // Escutar mudanças nas configurações de situação
  useEffect(() => {
    const handleSituationLevelsUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.warn('🔄 Configurações de situação atualizadas em UserCard, novas configurações:', customEvent.detail);
      // O hook useSituationLevels já vai receber os novos dados automaticamente via React Query
    };

    window.addEventListener('situation-levels-updated', handleSituationLevelsUpdate);
    
    return () => {
      window.removeEventListener('situation-levels-updated', handleSituationLevelsUpdate);
    };
  }, []);

  const handleDiscipuladoresChange = (newDiscipuladores: Discipulador[]) => {
    setCurrentDiscipuladores(newDiscipuladores);
  };

  const getPhotoUrl = () => {
    const photo =
      (localUser as LocalUser).photo || localUser.profilePhoto || localUser.avatarUrl || '';
    if (!photo) return '';
    if (photo.startsWith('http')) return photo;
    return `/uploads/${photo}`;
  };

  const isValidWhatsAppNumber = (phone?: string | null) => {
    if (!phone) return false;
    const cleanPhone = phone.replace(/\D/g, '');
    return cleanPhone.length >= 10 && cleanPhone.length <= 15;
  };

  const handleWhatsApp = () => {
    if (!localUser.phone) return;

    const cleanPhone = localUser.phone.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/55${cleanPhone}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleVisitButtonClick = () => {
    if (isVisited()) {
      // Se já foi visitado, abrir modal para atualizar data
      setShowMarkVisitModal(true);
    } else {
      // Se não foi visitado, marcar visita
      handleMarkVisit();
    }
  };

  const handleMarkVisit = async () => {
    if (isMarkingVisit) return;

    setIsMarkingVisit(true);
    try {
      const response = await fetch(`/api/users/${localUser.id}/visit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          visitDate: new Date().toISOString().split('T')[0],
        }),
      });

      if (response.ok) {
        const result = await response.json();
        // Atualizar o usuário local com os dados da resposta
        setLocalUser((prev: typeof localUser) => {
          const prevExtraData = getExtraDataObject(prev.extraData);
          const resultExtraData = getExtraDataObject(result.extraData);
          return {
            ...prev,
            extraData: {
              ...prevExtraData,
              ...resultExtraData,
            },
          };
        });
        toast({
          title: 'Visita marcada!',
          description: `Visita registrada para ${localUser.name}`,
        });
      } else {
        throw new Error('Erro ao marcar visita');
      }
    } catch (error) {
      console.error('Erro ao marcar visita:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível marcar a visita. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsMarkingVisit(false);
    }
  };

  const handleConfirmVisit = async (visitDate: string) => {
    try {
      const response = await fetch(`/api/users/${localUser.id}/visit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          visitDate,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        // Atualizar o usuário local com os dados da resposta
        setLocalUser((prev: typeof localUser) => {
          const prevExtraData = getExtraDataObject(prev.extraData);
          const resultExtraData = getExtraDataObject(result.extraData);
          return {
            ...prev,
            extraData: {
              ...prevExtraData,
              ...resultExtraData,
            },
          };
        });
        setShowMarkVisitModal(false);
        toast({
          title: 'Visita marcada!',
          description: `Visita registrada para ${localUser.name}`,
        });
      } else {
        throw new Error('Erro ao marcar visita');
      }
    } catch (error) {
      console.error('Erro ao marcar visita:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível marcar a visita. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const isVisited = () => {
    const extraData = getExtraDataObject(localUser.extraData);
    const visited = extraData.visited;
    return typeof visited === 'boolean' ? visited : Boolean(visited);
  };

  const getVisitCount = () => {
    const extraData = getExtraDataObject(localUser.extraData);
    const visitCount = extraData.visitCount;
    if (typeof visitCount === 'number') return visitCount;
    if (typeof visitCount === 'string') return Number(visitCount) || 0;
    return 0;
  };

  const getLastVisitDate = () => {
    const extraData = getExtraDataObject(localUser.extraData);
    const lastVisitDate = extraData.lastVisitDate;
    return typeof lastVisitDate === 'string' ? lastVisitDate : undefined;
  };

  const formatVisitDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const _loadVisitHistory = async (userId: number) => {
    try {
      const response = await fetch(`/api/visits/user/${userId}`);
      if (response.ok) {
        const history = await response.json();
        setVisitHistory(history);
      }
    } catch (error) {
      console.error('Erro ao carregar histórico de visitas:', error);
    }
  };

  const generateFirstAccessUsername = (name: string) => {
    if (!name) return 'usuario';

    const nameParts = name.trim().split(/\s+/);
    if (nameParts.length === 1) {
      return nameParts[0].toLowerCase();
    }

    // Pegar primeiro e último nome
    const firstName = nameParts[0].toLowerCase();
    const lastName = nameParts[nameParts.length - 1].toLowerCase();

    // Remover caracteres especiais e acentos
    const cleanFirstName = firstName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
    const cleanLastName = lastName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');

    return `${cleanFirstName}.${cleanLastName}`;
  };

  const getSpiritualLevel = (score: number) => {
    switch (score) {
      case 1:
        return {
          emoji: '🍃',
          label: 'Distante',
          color: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
        };
      case 2:
        return {
          emoji: '🔍',
          label: 'Buscando',
          color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300',
        };
      case 3:
        return {
          emoji: '🌱',
          label: 'Enraizando',
          color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300',
        };
      case 4:
        return {
          emoji: '🌳',
          label: 'Frutificando',
          color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
        };
      case 5:
        return {
          emoji: '✨',
          label: 'Intimidade',
          color: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
        };
      default:
        return {
          emoji: '❓',
          label: 'Sem check-in',
          color: 'bg-gray-100 text-gray-600 dark:bg-slate-700/50 dark:text-slate-300',
        };
    }
  };

  const handleSituationChange = async (newSituation: string) => {
    try {
      const response = await fetchWithAuth(`/api/users/${localUser.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          interestedSituation: newSituation,
        }),
      });

      if (response.ok) {
        setLocalUser((prev: typeof localUser) => ({ ...prev, interestedSituation: newSituation }));
        setSelectedSituation(newSituation);
        setOpenSituationPopover(false);
        const selected = situationLevels.find((s) => s.value === newSituation);
        toast({
          title: 'Situação atualizada!',
          description: `Situação do amigo atualizada para: ${selected?.label || newSituation}`,
        });
      } else {
        throw new Error('Erro ao atualizar situação');
      }
    } catch (error) {
      console.error('Erro ao atualizar situação:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a situação. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const isAdminRole = localUser.role === 'superadmin' || localUser.role === 'pastor';
  const isMissionaryRole = localUser.role.includes('missionary');
  const isMemberRole = localUser.role.includes('member');
  let roleBorderClass = 'border-l-orange-500';
  if (isAdminRole) {
    roleBorderClass = 'border-l-blue-500';
  } else if (isMissionaryRole) {
    roleBorderClass = 'border-l-purple-500';
  } else if (isMemberRole) {
    roleBorderClass = 'border-l-green-500';
  }

  const visitCount = getVisitCount();
  const hasBeenVisited = isVisited();
  const visitButtonVariantClass = hasBeenVisited
    ? 'text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100 dark:bg-green-900/30 dark:hover:bg-green-800/40 dark:text-green-400 border border-green-200 dark:border-green-700/50'
    : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 border border-blue-200 dark:border-blue-700/50';
  const visitButtonPaddingClass = hasBeenVisited && visitCount > 1 ? 'px-2' : 'w-7 px-0';
  const visitButtonTitle = hasBeenVisited
    ? '🖱️ Clique: atualizar data da visita'
    : 'Marcar visita como realizada';
  let visitButtonContent = <Square className="h-3 w-3" />;
  if (isMarkingVisit) {
    visitButtonContent = (
      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current" />
    );
  } else if (hasBeenVisited) {
    visitButtonContent = (
      <div className="flex items-center gap-1">
        <CheckSquare className="h-3 w-3" />
        {visitCount > 1 && <span className="text-[10px] font-medium">{visitCount}x</span>}
      </div>
    );
  }

  let statusBadgeClass =
    'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/50 dark:text-red-300 dark:border-red-600/50';
  let statusLabel = 'Rejeitado';
  if (localUser.status === 'active' || localUser.status === 'approved') {
    statusBadgeClass =
      'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/50 dark:text-green-300 dark:border-green-600/50';
    statusLabel = 'Ativo';
  } else if (localUser.status === 'pending') {
    statusBadgeClass =
      'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-600/50';
    statusLabel = 'Pendente';
  } else if (localUser.status === 'inactive') {
    statusBadgeClass =
      'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-900/50 dark:text-gray-300 dark:border-gray-600/50';
    statusLabel = 'Inativo';
  }

  return (
    <Card
      className={`cursor-pointer transition-all duration-200 hover:shadow-md dark:hover:shadow-slate-700/50 border-l-4 ${
        roleBorderClass
      } ${
        hasBeenVisited
          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700/50'
          : 'bg-card'
      }`}
      onClick={onClick}
    >
      <CardContent className="p-3 sm:p-4">
        {/* Layout Mobile: Stack vertical, Desktop: Flex horizontal */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
          {/* Avatar e informações básicas */}
          <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
            <div className="flex-shrink-0">
              <Avatar
                className="h-10 w-10 sm:h-12 sm:w-12 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all duration-200"
                onClick={(e) => {
                  e.stopPropagation();
                  if (hasAdminAccess(currentUser)) {
                    setIsPhotoPreviewOpen(true);
                  }
                }}
              >
                <AvatarImage src={getPhotoUrl()} alt={localUser.name} />
                <AvatarFallback className="text-sm sm:text-lg font-semibold">
                  {(() => {
                    if (!localUser.name || typeof localUser.name !== 'string') return 'U';
                    const nameParts = localUser.name.split(' ');
                    if (nameParts.length === 1) {
                      return nameParts[0][0].toUpperCase();
                    }
                    return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
                  })()}
                </AvatarFallback>
              </Avatar>
            </div>

            <div className="flex-1 min-w-0">
              {/* Nome e botões na mesma linha */}
              <div className="flex items-center justify-between gap-2">
                <h3
                  className="text-base sm:text-lg font-semibold text-foreground truncate flex-1"
                  data-testid={`text-name-${localUser.id}`}
                >
                  {localUser.name || 'Usuário sem nome'}
                </h3>

                {/* Botões de ação - Horizontal ao lado do nome */}
                {showActions && (
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    {/* Botão de Marcar Visita */}
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={isMarkingVisit}
                      className={`h-7 transition-all duration-200 rounded-full ${
                        visitButtonVariantClass
                      } ${isMarkingVisit ? 'opacity-50 cursor-not-allowed' : ''} ${visitButtonPaddingClass}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleVisitButtonClick();
                      }}
                      title={visitButtonTitle}
                    >
                      {visitButtonContent}
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/30 rounded-full border border-green-200 dark:border-green-700/50"
                      onClick={(e) => {
                        e.stopPropagation();
                        onView?.();
                      }}
                      title="Visualizar detalhes"
                    >
                      <Eye className="h-3 w-3" />
                    </Button>

                    {/* Botão de Discipuladores - Apenas para usuários interessados */}
                    {localUser.role === 'interested' && (
                      <DiscipuladorButton
                        interestedId={localUser.id}
                        currentDiscipuladores={currentDiscipuladores}
                        onDiscipuladoresChange={handleDiscipuladoresChange}
                      />
                    )}

                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-900/30 rounded-full border border-purple-200 dark:border-purple-700/50"
                      onClick={(e) => {
                        e.stopPropagation();
                        onScheduleVisit?.();
                      }}
                      title="Agendar visita futura"
                    >
                      <Calendar className="h-3 w-3" />
                    </Button>

                    {isValidWhatsAppNumber(localUser.phone) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/30 rounded-full border border-green-200 dark:border-green-700/50"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleWhatsApp();
                        }}
                        title="Enviar WhatsApp"
                      >
                        <MessageCircle className="h-3 w-3" />
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 rounded-full border border-red-200 dark:border-red-700/50"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete?.();
                      }}
                      title="Excluir usuário"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Badges em linha compacta para mobile */}
              <div className="flex flex-wrap gap-1 sm:gap-2 mt-2">
                {/* Badges de role */}
                {(localUser.role === 'superadmin' || localUser.role === 'pastor') && (
                  <Badge
                    variant="outline"
                    className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-600/50"
                  >
                    Admin
                  </Badge>
                )}
                {localUser.role.includes('member') && (
                  <Badge
                    variant="outline"
                    className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 bg-green-100 text-green-700 border-green-300 dark:bg-green-900/50 dark:text-green-300 dark:border-green-600/50"
                  >
                    Membro
                  </Badge>
                )}
                {localUser.role.includes('missionary') && (
                  <Badge
                    variant="outline"
                    className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/50 dark:text-purple-300 dark:border-purple-600/50"
                  >
                    Missionário
                  </Badge>
                )}
                {localUser.role === 'interested' && (
                  <Badge
                    variant="outline"
                    className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/50 dark:text-orange-300 dark:border-orange-600/50"
                  >
                    Amigo
                  </Badge>
                )}

                {/* Badge de status */}
                <Badge
                  variant="outline"
                  className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 ${statusBadgeClass}`}
                >
                  {statusLabel}
                </Badge>

                {/* Badge de autorização de discipulado - apenas para interessados com solicitação pendente */}
                {localUser.role === 'interested' && hasPendingDiscipleRequest && (
                  <Badge
                    variant="outline"
                    className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-600/50 cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-800/50 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDiscipleRequest?.();
                    }}
                    title="Clique para autorizar discipulado"
                  >
                    <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                    <span className="hidden sm:inline">Autorizar</span>
                    <span className="sm:hidden">Auth</span>
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Informações detalhadas - Mobile: coluna única, Desktop: mantém layout */}
        <div className="mt-2 space-y-1.5 sm:space-y-1 text-xs sm:text-sm text-muted-foreground">
          {/* Usuário para primeiro acesso */}
          <div className="flex items-center gap-1">
            <User className="h-3 w-3" />
            <span className="truncate" data-testid={`text-first-access-${localUser.id}`}>
              <strong>{generateFirstAccessUsername(localUser.name)}</strong>
            </span>
          </div>

          {/* Gerenciador de Discipuladores - Apenas para usuários interessados */}
          {localUser.role === 'interested' && (
            <div className="mt-1 flex items-center justify-start">
              <DiscipuladoresManager
                interestedId={localUser.id}
                interestedChurch={localUser.church || 'Igreja Principal'}
                currentDiscipuladores={currentDiscipuladores}
                onDiscipuladoresChange={handleDiscipuladoresChange}
              />
            </div>
          )}

          {/* Informações de contato */}
          <div className="space-y-1">
            {localUser.phone && (
              <div className="flex items-center gap-1">
                <Phone className="h-3 w-3 flex-shrink-0" />
                <span className="truncate" data-testid={`text-phone-${localUser.id}`}>
                  {localUser.phone}
                </span>
              </div>
            )}

            {localUser.church && (
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                <span className="truncate" data-testid={`text-church-${localUser.id}`}>
                  {localUser.church}
                </span>
              </div>
            )}

            {localUser.address && (
              <div className="flex items-start gap-1">
                <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div
                    className="text-xs sm:text-sm text-muted-foreground break-words"
                    data-testid={`text-address-${localUser.id}`}
                  >
                    {localUser.address}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Situação do Amigo - Apenas para usuários amigos */}
          {localUser.role === 'interested' && (
            <div className="flex items-center gap-2">
              <Popover open={openSituationPopover}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openSituationPopover}
                    className="w-[200px] justify-between text-xs h-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenSituationPopover(!openSituationPopover);
                    }}
                  >
                    {selectedSituation
                      ? situationLevels.find((situation) => situation.value === selectedSituation)
                          ?.label
                      : 'Selecionar situação...'}
                    <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-0 z-50" side="bottom" align="start">
                  <div className="flex justify-between items-center p-2 border-b">
                    <span className="text-sm font-medium">Selecionar Situação</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => setOpenSituationPopover(false)}
                    >
                      ✕
                    </Button>
                  </div>
                  <Command>
                    <CommandInput
                      placeholder="Buscar situação..."
                      className="h-8"
                      id="situation-search"
                      name="situation-search"
                    />
                    <CommandEmpty>Nenhuma situação encontrada.</CommandEmpty>
                    <CommandGroup>
                      <CommandList>
                        {situationLevels.map((situation) => (
                          <CommandItem
                            key={situation.value}
                            value={situation.value}
                            onSelect={(currentValue) => {
                              handleSituationChange(currentValue);
                            }}
                            className="text-xs"
                          >
                            <Check
                              className={cn(
                                'mr-2 h-3 w-3',
                                selectedSituation === situation.value ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            <div className="flex flex-col">
                              <span className="font-medium">{situation.label}</span>
                              <span className="text-xs text-muted-foreground">
                                {situation.value}
                              </span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandList>
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>

              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0.5"
                style={
                  selectedSituation
                    ? {
                        backgroundColor: `${
                          situationLevels.find((level) => level.value === selectedSituation)?.color
                        }20`,
                        color: situationLevels.find((level) => level.value === selectedSituation)
                          ?.color,
                        borderColor: situationLevels.find(
                          (level) => level.value === selectedSituation
                        )?.color,
                      }
                    : undefined
                }
              >
                {selectedSituation || 'Não definida'}
              </Badge>
            </div>
          )}

          {/* Informações de Gamificação - Monte e Pontuação */}
          <div className="flex items-center gap-2 mt-1.5 pt-1.5 border-t border-gray-100 dark:border-slate-700">
            <div className="flex items-center gap-1">
              <Star className="h-3 w-3 text-yellow-500" />
              <span className="text-[10px] sm:text-xs font-medium">
                {localUser.points || 0} pts
              </span>
            </div>

            <div className="flex items-center gap-1">
              <MountIcon iconType={getLevelIcon(localUser.points || 0)} className="h-3 w-3" />
              <span
                className="text-[10px] sm:text-xs font-medium"
                title={getLevelName(localUser.points || 0)}
              >
                {getMountName(localUser.points || 0)}
              </span>
            </div>
          </div>

          {/* Indicador de Estado Espiritual - Apenas para admins */}
          {hasAdminAccess(currentUser) && (
            <div className="flex items-center gap-2 mt-1.5 pt-1.5 border-t border-gray-100 dark:border-slate-700">
              <div className="flex items-center gap-1">
                <Heart className="h-3 w-3 text-pink-500" />
                <span className="text-[10px] sm:text-xs font-medium">Check-in Espiritual:</span>
              </div>

              {userSpiritual?.checkIns && userSpiritual.checkIns.length > 0 ? (
                <div className="flex items-center gap-1">
                  {(() => {
                    const latestCheckIn = userSpiritual.checkIns[0];
                    const spiritualLevel = getSpiritualLevel(latestCheckIn.score);
                    return (
                      <>
                        <span className="text-sm sm:text-lg">{spiritualLevel.emoji}</span>
                        <Badge
                          className={`${spiritualLevel.color} text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5`}
                        >
                          {spiritualLevel.label}
                        </Badge>

                        {latestCheckIn.notes && (
                          <div className="flex items-center gap-1 ml-1 sm:ml-2">
                            <MessageCircle className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-blue-500" />
                            <span className="text-[10px] sm:text-xs text-blue-600">
                              Com observações
                            </span>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              ) : (
                <Badge className="bg-gray-100 text-gray-600 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5">
                  Sem check-in
                </Badge>
              )}
            </div>
          )}

          {/* Informações de visita */}
          {isVisited() && (
            <div className="mt-1.5 flex items-center gap-2 text-[10px] sm:text-xs">
              <div className="flex items-center gap-1 text-green-600">
                <CheckCircle className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                <span>Visitado</span>
              </div>
              {getVisitCount() > 1 && (
                <Badge
                  variant="secondary"
                  className="text-[10px] sm:text-xs px-1 py-0 bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300"
                >
                  {getVisitCount()} visitas
                </Badge>
              )}
              {getLastVisitDate() && (
                <span className="text-muted-foreground">
                  Última: {formatVisitDate(getLastVisitDate()!)}
                </span>
              )}
            </div>
          )}
        </div>
      </CardContent>

      {/* Modal para marcar visita */}
      <MarkVisitModal
        isOpen={showMarkVisitModal}
        onClose={() => setShowMarkVisitModal(false)}
        onConfirm={handleConfirmVisit}
        userName={localUser.name}
        isLoading={isMarkingVisit}
        visitCount={getVisitCount()}
        lastVisitDate={getLastVisitDate()}
      />

      {/* Modal para visualizar foto */}
      <Dialog open={showPhotoPreview} onOpenChange={setIsPhotoPreviewOpen}>
        <DialogContent className="max-w-md w-[90vw]" style={{ maxHeight: 'calc(100vh - 7rem)' }}>
          <DialogHeader>
            <DialogTitle>Foto de Perfil</DialogTitle>
            <DialogDescription>Foto de perfil de {localUser.name}</DialogDescription>
          </DialogHeader>

          {getPhotoUrl() ? (
            <div className="flex justify-center">
              <img
                src={getPhotoUrl()}
                alt={localUser.name}
                className="max-w-full max-h-96 object-contain rounded-lg"
              />
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              Este usuário ainda não possui foto de perfil.
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal para histórico de visitas */}
      <Dialog open={showVisitHistory} onOpenChange={setShowVisitHistory}>
        <DialogContent className="max-w-md w-[90vw]" style={{ maxHeight: 'calc(100vh - 7rem)' }}>
          <DialogHeader>
            <DialogTitle>Histórico de Visitas</DialogTitle>
            <DialogDescription>Histórico de visitas para {localUser.name}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {visitHistory.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {visitHistory.map((visit, index) => (
                  <div
                    key={visit.id || index}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800/50 rounded-lg border dark:border-slate-700"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium">
                        Visita #{visitHistory.length - index}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatVisitDate(visit.visit_date)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground text-center py-4">
                Nenhuma visita registrada ainda.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
