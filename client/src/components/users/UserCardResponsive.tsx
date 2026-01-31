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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface UserCardProps {
  user: any;
  onClick?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onView?: () => void;
  onScheduleVisit?: () => void;
  onDiscipleRequest?: () => void;
  showActions?: boolean;
  relationshipsData?: any[];
  potentialMissionaries?: any[];
  hasPendingDiscipleRequest?: boolean;
}

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
  const [localUser, setLocalUser] = useState(user);
  const [isMarkingVisit, setIsMarkingVisit] = useState(false);
  const [showMarkVisitModal, setShowMarkVisitModal] = useState(false);
  const [showPhotoPreview, setIsPhotoPreviewOpen] = useState(false);
  const [showVisitHistory, setShowVisitHistory] = useState(false);
  const [visitHistory, setVisitHistory] = useState<any[]>([]);
  const [openSituationPopover, setOpenSituationPopover] = useState(false);
  const [selectedSituation, setSelectedSituation] = useState(localUser.interestedSituation || '');
  const [userSpiritual, setUserSpiritual] = useState<any>(null);
  const [currentDiscipuladores, setCurrentDiscipuladores] = useState<any[]>([]);

  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  // Situações disponíveis para interessados
  const situations = [
    { value: 'new', label: 'Novo Amigo', description: 'Primeiro contato' },
    { value: 'contacted', label: 'Contatado', description: 'Já foi contatado' },
    { value: 'meeting_scheduled', label: 'Reunião Agendada', description: 'Reunião marcada' },
    { value: 'meeting_done', label: 'Reunião Realizada', description: 'Primeira reunião feita' },
    { value: 'follow_up', label: 'Acompanhamento', description: 'Em processo de discipulado' },
    { value: 'baptized', label: 'Batizado', description: 'Já foi batizado' },
    { value: 'member', label: 'Membro', description: 'Tornou-se membro da igreja' },
    { value: 'inactive', label: 'Inativo', description: 'Não responde mais' },
    { value: 'rejected', label: 'Rejeitou', description: 'Não tem interesse' },
  ];

  // Atualizar usuário local quando prop mudar
  useEffect(() => {
    setLocalUser(user);
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
            setUserSpiritual(checkIns[0]);
          }
        }
      } catch (error) {
        // Silenciar erro - não é crítico
      }
    };

    if (localUser?.id && hasAdminAccess(currentUser)) {
      loadSpiritualCheckIn();
    }
  }, [localUser?.id, currentUser?.role]);

  // Carregar discipuladores atuais
  useEffect(() => {
    console.log('🔍 UserCardResponsive - Carregando discipuladores:', {
      relationshipsData: relationshipsData?.length,
      localUserRole: localUser.role,
      localUserId: localUser.id,
      relationshipsDataSample: relationshipsData?.slice(0, 2),
    });

    if (relationshipsData && localUser.role === 'interested') {
      const userDiscipuladores = relationshipsData
        .filter(rel => rel.interestedId === localUser.id && rel.status === 'active')
        .map(rel => ({
          id: rel.missionaryId,
          name: rel.missionaryName || 'Usuário não encontrado',
          relationshipId: rel.id,
        }));

      console.log('🔍 UserCardResponsive - Discipuladores encontrados:', userDiscipuladores);
      setCurrentDiscipuladores(userDiscipuladores);
    }
  }, [relationshipsData, localUser.id, localUser.role]);

  const handleDiscipuladoresChange = (newDiscipuladores: any[]) => {
    setCurrentDiscipuladores(newDiscipuladores);
  };

  const getPhotoUrl = () => {
    if (!localUser.photo) return '';
    if (localUser.photo.startsWith('http')) return localUser.photo;
    return `/uploads/${localUser.photo}`;
  };

  const isValidWhatsAppNumber = (phone: string) => {
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
        setLocalUser((prev: typeof localUser) => ({
          ...prev,
          extraData: {
            ...prev.extraData,
            ...result.extraData,
          },
        }));
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
          visitDate: visitDate,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        // Atualizar o usuário local com os dados da resposta
        setLocalUser((prev: typeof localUser) => ({
          ...prev,
          extraData: {
            ...prev.extraData,
            ...result.extraData,
          },
        }));
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
    return localUser.extraData?.visited || false;
  };

  const getVisitCount = () => {
    return localUser.extraData?.visitCount || 0;
  };

  const getLastVisitDate = () => {
    return localUser.extraData?.lastVisitDate;
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
      const response = await fetch(`/api/users/${localUser.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          interestedSituation: newSituation,
        }),
      });

      if (response.ok) {
        setLocalUser((prev: typeof localUser) => ({ ...prev, interestedSituation: newSituation }));
        setSelectedSituation(newSituation);
        setOpenSituationPopover(false);
        toast({
          title: 'Situação atualizada!',
          description: `Situação do amigo atualizada para: ${situations.find(s => s.value === newSituation)?.label}`,
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

  return (
    <Card
      className={`cursor-pointer transition-all duration-200 hover:shadow-md dark:hover:shadow-slate-700/50 border-l-4 ${
        localUser.role === 'superadmin' || localUser.role === 'pastor'
          ? 'border-l-blue-500'
          : localUser.role.includes('missionary')
            ? 'border-l-purple-500'
            : localUser.role.includes('member')
              ? 'border-l-green-500'
              : 'border-l-orange-500'
      } ${isVisited() ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700/50' : 'bg-card'}`}
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
                onClick={e => {
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
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    {/* Botão de Marcar Visita */}
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={isMarkingVisit}
                      className={`h-7 transition-all duration-200 rounded-full ${
                        isVisited()
                          ? 'text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100 dark:bg-green-900/30 dark:hover:bg-green-800/40 dark:text-green-400 border border-green-200 dark:border-green-700/50'
                          : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 border border-blue-200 dark:border-blue-700/50'
                      } ${isMarkingVisit ? 'opacity-50 cursor-not-allowed' : ''} ${
                        isVisited() && getVisitCount() > 1 ? 'px-2' : 'w-7 px-0'
                      }`}
                      onClick={e => {
                        e.stopPropagation();
                        handleVisitButtonClick();
                      }}
                      title={
                        isVisited()
                          ? '🖱️ Clique: atualizar data da visita'
                          : 'Marcar visita como realizada'
                      }
                    >
                      {isMarkingVisit ? (
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current" />
                      ) : isVisited() ? (
                        <div className="flex items-center gap-1">
                          <CheckSquare className="h-3 w-3" />
                          {getVisitCount() > 1 && (
                            <span className="text-[10px] font-medium">{getVisitCount()}x</span>
                          )}
                        </div>
                      ) : (
                        <Square className="h-3 w-3" />
                      )}
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/30 rounded-full border border-green-200 dark:border-green-700/50"
                      onClick={e => {
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
                      onClick={e => {
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
                        onClick={e => {
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
                      onClick={e => {
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
                  className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 ${
                    localUser.status === 'approved'
                      ? 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/50 dark:text-green-300 dark:border-green-600/50'
                      : localUser.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-600/50'
                        : 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/50 dark:text-red-300 dark:border-red-600/50'
                  }`}
                >
                  {localUser.status === 'approved'
                    ? 'Aprovado'
                    : localUser.status === 'pending'
                      ? 'Pendente'
                      : 'Rejeitado'}
                </Badge>

                {/* Badge de autorização de discipulado - apenas para interessados com solicitação pendente */}
                {localUser.role === 'interested' && hasPendingDiscipleRequest && (
                  <Badge
                    variant="outline"
                    className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-600/50 cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-800/50 transition-colors"
                    onClick={e => {
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
                    onClick={e => {
                      e.stopPropagation();
                      setOpenSituationPopover(!openSituationPopover);
                    }}
                  >
                    {selectedSituation
                      ? situations.find(situation => situation.value === selectedSituation)?.label
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
                        {situations.map(situation => (
                          <CommandItem
                            key={situation.value}
                            value={situation.value}
                            onSelect={currentValue => {
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
                                {situation.description}
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
                className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-600/50"
              >
                {localUser.interestedSituation || 'Não definida'}
              </Badge>
            </div>
          )}

          {/* Informações de Gamificação - Monte e Pontuação */}
          {true && (
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
          )}

          {/* Indicador de Estado Espiritual - Apenas para admins */}
          {hasAdminAccess(currentUser) && (
            <div className="flex items-center gap-2 mt-1.5 pt-1.5 border-t border-gray-100 dark:border-slate-700">
              <div className="flex items-center gap-1">
                <Heart className="h-3 w-3 text-pink-500" />
                <span className="text-[10px] sm:text-xs font-medium">Check-in Espiritual:</span>
              </div>

              {userSpiritual && userSpiritual.checkIns && userSpiritual.checkIns.length > 0 ? (
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
