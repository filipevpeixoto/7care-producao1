import React, { useState, useDeferredValue, useMemo, startTransition, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { hasAdminAccess } from '@/lib/permissions';
import { fetchWithAuth } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { Heart, MessageCircle, Lock, Calendar, Search, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { createLogger } from '@/lib/logger';

const prayersLogger = createLogger('Prayers');

interface PrayerRequest {
  id: number;
  userId: number;
  userName: string;
  userChurch: string;
  userProfilePhoto?: string;
  emotionalScore: number; // Mantido para compatibilidade com API
  prayerRequest?: string;
  isPrivate: boolean;
  allowChurchMembers: boolean;
  createdAt: string;
  isAnswered: boolean;
  answeredAt?: string;
  answeredBy?: string;
  isUserPraying?: boolean;
}

interface Intercessor {
  id: number;
  intercessorName: string;
  intercessorProfilePhoto: string | null;
}

interface RawPrayerApi {
  id: number;
  requesterName?: string;
  requester_name?: string;
  requesterChurch?: string;
  church?: string;
  requesterPhoto?: string;
  requester_photo?: string;
  profilePhoto?: string;
  profile_photo?: string;
  userId?: number;
  user_id?: number;
  requester_id?: number;
  title?: string;
  prayerRequest?: string;
  description?: string;
  emotionalScore?: number;
  isAnswered?: boolean;
  is_answered?: boolean;
  isPrivate?: boolean;
  is_private?: boolean;
  allowChurchMembers?: boolean;
  allow_church_members?: boolean;
  createdAt?: string;
  created_at?: string;
  answeredAt?: string;
  answered_at?: string;
  answeredBy?: string;
  isUserPraying?: boolean;
}

const mapPrayer = (prayer: RawPrayerApi): PrayerRequest => ({
  id: prayer.id,
  userName: prayer.requesterName || prayer.requester_name || 'Usuário',
  userChurch: prayer.requesterChurch || prayer.church || 'Igreja',
  userProfilePhoto: prayer.requesterPhoto || prayer.requester_photo || prayer.profilePhoto || prayer.profile_photo || undefined,
  userId: prayer.userId || prayer.user_id || prayer.requester_id || 0,
  prayerRequest: prayer.title || prayer.prayerRequest || prayer.description || '',
  emotionalScore: prayer.emotionalScore || 0,
  isAnswered: prayer.isAnswered ?? prayer.is_answered ?? false,
  isPrivate: prayer.isPrivate ?? prayer.is_private ?? false,
  allowChurchMembers: prayer.allowChurchMembers ?? prayer.allow_church_members ?? true,
  createdAt: prayer.createdAt || prayer.created_at || '',
  answeredAt: prayer.answeredAt || prayer.answered_at,
  answeredBy: prayer.answeredBy,
  isUserPraying: prayer.isUserPraying,
});

const spiritualEmojis = {
  1: {
    emoji: '🍃',
    label: 'Distante',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
  },
  2: {
    emoji: '🔍',
    label: 'Buscando',
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300',
  },
  3: {
    emoji: '🌱',
    label: 'Enraizando',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
  },
  4: {
    emoji: '🍃',
    label: 'Frutificando',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
  },
  5: {
    emoji: '✨',
    label: 'Intimidade',
    color: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
  },
};

const Prayers = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'answered'>('all');
  const [intercessors, setIntercessors] = useState<Record<number, Intercessor[]>>({});
  const [loadingIntercessors, setLoadingIntercessors] = useState<Record<number, boolean>>({});

  // Helper function para gerar URL da foto
  const getPhotoUrl = (profilePhoto?: string) => {
    if (!profilePhoto) return undefined;
    return String(profilePhoto).startsWith('http') ? profilePhoto : `/uploads/${profilePhoto}`;
  };

  // ========================================
  // QUERIES
  // ========================================
  const {
    data: prayers = [],
    isLoading,
    refetch: _refetch,
  } = useQuery<PrayerRequest[]>({
    queryKey: ['prayers', user?.id],
    queryFn: async () => {
      const response = await fetchWithAuth('/api/prayers');
      if (!response.ok) throw new Error('Erro ao carregar orações');
      const rawData = await response.json();
      const data: RawPrayerApi[] = Array.isArray(rawData) ? rawData : rawData?.data || [];
      return data.map(mapPrayer);
    },
    enabled: !!user?.id,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  // Carregar intercessores quando os prayers mudam
  const loadIntercessors = useCallback(async (prayerId: number) => {
    setLoadingIntercessors(prev => ({ ...prev, [prayerId]: true }));
    try {
      const response = await fetchWithAuth(`/api/prayers/${prayerId}/intercessors`);
      if (response.ok) {
        const data = await response.json();
        const mappedData: Intercessor[] = data.map((i: { id: number; intercessor_name?: string; profile_photo?: string }) => ({
          id: i.id,
          intercessorName: i.intercessor_name || 'Usuário',
          intercessorProfilePhoto: i.profile_photo || null,
        }));
        setIntercessors(prev => ({ ...prev, [prayerId]: mappedData }));
      }
    } catch (error) {
      prayersLogger.error('Erro ao carregar intercessores:', error);
    } finally {
      setLoadingIntercessors(prev => ({ ...prev, [prayerId]: false }));
    }
  }, []);

  // Auto-load intercessors when prayers data changes
  React.useEffect(() => {
    prayers.filter(p => !p.isAnswered).forEach(p => loadIntercessors(p.id));
  }, [prayers, loadIntercessors]);

  // ========================================
  // DERIVED STATE (useMemo instead of useState+useEffect)
  // ========================================
  const filteredPrayers = useMemo(() => {
    let filtered = prayers;

    if (filterStatus === 'pending') {
      filtered = filtered.filter(prayer => !prayer.isAnswered);
    } else if (filterStatus === 'answered') {
      filtered = filtered.filter(prayer => prayer.isAnswered);
    }

    if (deferredSearchTerm) {
      const term = deferredSearchTerm.toLowerCase();
      filtered = filtered.filter(
        prayer =>
          prayer.userName.toLowerCase().includes(term) ||
          prayer.prayerRequest?.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [prayers, deferredSearchTerm, filterStatus]);

  // ========================================
  // MUTATIONS
  // ========================================
  const markAnsweredMutation = useMutation({
    mutationFn: async (prayerId: number) => {
      const response = await fetchWithAuth(`/api/prayers/${prayerId}/answer`, {
        method: 'POST',
        body: JSON.stringify({ answeredBy: user?.id }),
      });
      if (!response.ok) throw new Error('Erro ao marcar oração');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prayers'] });
      toast({ title: 'Oração marcada como respondida', description: 'O pedido foi marcado como atendido.' });
    },
    onError: () => {
      toast({ title: 'Erro ao marcar oração', description: 'Não foi possível marcar a oração como respondida.', variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (prayerId: number) => {
      const response = await fetchWithAuth(`/api/prayers/${prayerId}`, { method: 'DELETE' });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Não foi possível excluir a oração.');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prayers'] });
      toast({ title: 'Oração excluída', description: 'O pedido de oração foi removido com sucesso.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao excluir oração', description: error.message, variant: 'destructive' });
    },
  });

  const toggleIntercessorMutation = useMutation({
    mutationFn: async ({ prayerId, isPraying }: { prayerId: number; isPraying: boolean }) => {
      if (isPraying) {
        const response = await fetchWithAuth(`/api/prayers/${prayerId}/intercessor/${user?.id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Erro');
      } else {
        const response = await fetchWithAuth(`/api/prayers/${prayerId}/intercessor`, {
          method: 'POST',
          body: JSON.stringify({ intercessorId: user?.id }),
        });
        if (!response.ok) throw new Error('Erro');
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['prayers'] });
      loadIntercessors(variables.prayerId);
      toast({
        title: 'Sucesso',
        description: variables.isPraying ? 'Você não está mais orando por este pedido' : 'Você está orando por este pedido',
      });
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Erro ao gerenciar intercessor', variant: 'destructive' });
    },
  });

  // ========================================
  // HANDLERS (simplified)
  // ========================================
  const markAsAnswered = (prayerId: number) => {
    if (!user?.id) return;
    markAnsweredMutation.mutate(prayerId);
  };

  const deletePrayer = (prayerId: number) => {
    if (!user?.id) return;
    deleteMutation.mutate(prayerId);
  };

  const toggleIntercessor = (prayerId: number) => {
    if (!user?.id) return;
    const isPraying = prayers.find(p => p.id === prayerId)?.isUserPraying ?? false;
    toggleIntercessorMutation.mutate({ prayerId, isPraying });
  };

  const canViewPrayer = (prayer: PrayerRequest) => {
    // Administradores podem ver tudo
    if (hasAdminAccess(user)) return true;

    // Usuários podem ver suas próprias orações
    if (prayer.userId === (user?.id || 0)) return true;

    // Se a oração é privada, apenas o pastor pode ver
    if (prayer.isPrivate) return false;

    // Se permite membros da igreja e é da mesma igreja
    if (prayer.allowChurchMembers && prayer.userChurch === user?.church) return true;

    return false;
  };

  const getVisiblePrayers = () => {
    return filteredPrayers.filter(canViewPrayer);
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Data não disponível';

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Data inválida';
      }

      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      prayersLogger.error('Erro ao formatar data:', error, dateString);
      return 'Data inválida';
    }
  };

  if (isLoading) {
    return (
      <MobileLayout>
        <div className="p-4 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>{t('prayers.loadingPrayers')}</p>
        </div>
      </MobileLayout>
    );
  }

  const visiblePrayers = getVisiblePrayers();

  return (
    <MobileLayout>
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
            <MessageCircle className="h-6 w-6 text-blue-600" />
            {t('prayers.title')}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t('prayers.subtitle')}
          </p>
        </div>

        {/* Search and Filters */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('prayers.searchPlaceholder')}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant={filterStatus === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => startTransition(() => setFilterStatus('all'))}
            >
              {t('prayers.all')} ({visiblePrayers.length})
            </Button>
            <Button
              variant={filterStatus === 'pending' ? 'default' : 'outline'}
              size="sm"
              onClick={() => startTransition(() => setFilterStatus('pending'))}
            >
              {t('prayers.pendingFilter')} ({visiblePrayers.filter(p => !p.isAnswered).length})
            </Button>
            <Button
              variant={filterStatus === 'answered' ? 'default' : 'outline'}
              size="sm"
              onClick={() => startTransition(() => setFilterStatus('answered'))}
            >
              {t('prayers.answered')} ({visiblePrayers.filter(p => p.isAnswered).length})
            </Button>
          </div>
        </div>

        {/* Prayer Requests */}
        <div className="space-y-4">
          {visiblePrayers.length === 0 ? (
            <Card className="text-center py-8">
              <CardContent>
                <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm || filterStatus !== 'all'
                    ? t('prayers.noFiltered')
                    : t('prayers.noPrayers')}
                </p>
              </CardContent>
            </Card>
          ) : (
            visiblePrayers.map(prayer => (
              <Card key={prayer.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar
                        className="ring-2 ring-white shadow-md"
                        style={{ width: '52px', height: '52px' }}
                      >
                        <AvatarImage
                          src={getPhotoUrl(prayer.userProfilePhoto)}
                          alt={`Foto de ${prayer.userName}`}
                          className="object-cover object-center w-full h-full"
                          style={{
                            imageRendering: 'crisp-edges',
                            filter: 'contrast(1.1) brightness(1.05)',
                          }}
                        />
                        <AvatarFallback className="bg-blue-100 text-blue-600 text-lg font-semibold">
                          {prayer.userName?.charAt(0)?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-base">{prayer.userName}</CardTitle>
                        <p className="text-sm text-muted-foreground">{prayer.userChurch}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={prayer.isAnswered ? 'default' : 'secondary'}
                        className={prayer.isAnswered ? 'bg-green-100 text-green-800' : ''}
                      >
                        {prayer.isAnswered ? 'Respondida' : 'Pendente'}
                      </Badge>
                      {prayer.isPrivate && (
                        <Badge variant="outline" className="border-orange-200 text-orange-700">
                          <Lock className="h-3 w-3 mr-1" />
                          Privada
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {/* Estado Espiritual + Último Check-in */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-2xl">
                      {
                        spiritualEmojis[prayer.emotionalScore as keyof typeof spiritualEmojis]?.emoji
                      }
                    </span>
                    <Badge
                      className={
                        spiritualEmojis[prayer.emotionalScore as keyof typeof spiritualEmojis]?.color
                      }
                    >
                      {
                        spiritualEmojis[prayer.emotionalScore as keyof typeof spiritualEmojis]?.label
                      }
                    </Badge>
                    {/* Badge de último check-in */}
                    <Badge className="bg-gray-200 text-gray-700 dark:bg-gray-900 dark:text-gray-200 ml-2" variant="outline">
                      Último check-in: {formatDate(prayer.createdAt)}
                    </Badge>
                  </div>

                  {/* Prayer Request */}
                  {prayer.prayerRequest && (
                    <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {prayer.prayerRequest}
                      </p>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3" />
                      {formatDate(prayer.createdAt)}
                    </div>

                    {prayer.isAnswered && prayer.answeredBy && (
                      <div className="flex items-center gap-1">
                        <span>Respondida por {prayer.answeredBy}</span>
                        {prayer.answeredAt && <span>em {formatDate(prayer.answeredAt)}</span>}
                      </div>
                    )}
                  </div>

                  {/* Botão de Oração */}
                  {!prayer.isAnswered && prayer.userId !== (user?.id || 0) && (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => toggleIntercessor(prayer.id)}
                        size="sm"
                        variant={prayer.isUserPraying ? 'default' : 'outline'}
                        className={`flex-1 ${
                          prayer.isUserPraying
                            ? 'bg-blue-600 hover:bg-blue-700'
                            : 'bg-green-50 hover:bg-green-100 text-green-700 border-green-200'
                        }`}
                      >
                        <Heart className="h-4 w-4 mr-2" />
                        {prayer.isUserPraying
                          ? 'Você está orando por este pedido'
                          : 'Orar por este pedido'}
                      </Button>
                    </div>
                  )}

                  {/* Seção de Intercessores */}
                  {!prayer.isAnswered && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Quem está orando:
                        </span>
                        {loadingIntercessors[prayer.id] && (
                          <span className="text-xs text-gray-500">Carregando...</span>
                        )}
                      </div>

                      {intercessors[prayer.id] && intercessors[prayer.id].length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {intercessors[prayer.id].map(intercessor => (
                            <div
                              key={intercessor.id}
                              className="flex items-center gap-2 bg-blue-50 px-2 py-1 rounded-full"
                            >
                              <Avatar className="w-5 h-5">
                                <AvatarImage src={intercessor.intercessorProfilePhoto ?? undefined} />
                                <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                                  {intercessor.intercessorName?.charAt(0)?.toUpperCase() || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs text-blue-700">
                                {intercessor.intercessorName}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500 italic">
                          {prayer.userId === (user?.id || 0)
                            ? 'Ninguém está orando por este pedido ainda'
                            : 'Seja o primeiro a orar por este pedido'}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    {/* Botão Marcar como Respondida - para admin e usuário que criou a oração */}
                    {!prayer.isAnswered &&
                      (hasAdminAccess(user) || prayer.userId === (user?.id || 0)) && (
                        <Button
                          onClick={() => markAsAnswered(prayer.id)}
                          size="sm"
                          className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                          <MessageCircle className="h-4 w-4 mr-2" />
                          Marcar como Respondida
                        </Button>
                      )}

                    {/* Botão Excluir - para admin e usuário que criou a oração */}
                    {(hasAdminAccess(user) || prayer.userId === (user?.id || 0)) && (
                      <Button
                        onClick={() => deletePrayer(prayer.id)}
                        size="sm"
                        variant="destructive"
                        className="flex-1"
                        disabled={!prayers.find(p => p.id === prayer.id)}
                        title={
                          !prayers.find(p => p.id === prayer.id)
                            ? 'Oração já foi excluída'
                            : 'Excluir oração'
                        }
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {!prayers.find(p => p.id === prayer.id) ? 'Já Excluída' : 'Excluir'}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </MobileLayout>
  );
};

export default Prayers;
