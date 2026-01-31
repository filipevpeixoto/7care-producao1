import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { hasAdminAccess } from '@/lib/permissions';
import { useToast } from '@/hooks/use-toast';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { Heart, MessageCircle, Lock, Calendar, Search, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';

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
  const { user } = useAuth();
  const { toast } = useToast();
  const [prayers, setPrayers] = useState<PrayerRequest[]>([]);
  const [filteredPrayers, setFilteredPrayers] = useState<PrayerRequest[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'answered'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [intercessors, setIntercessors] = useState<{ [key: number]: any[] }>({});
  const [loadingIntercessors, setLoadingIntercessors] = useState<{ [key: number]: boolean }>({});

  // Helper function para gerar URL da foto
  const getPhotoUrl = (profilePhoto?: string) => {
    if (!profilePhoto) return undefined;
    return String(profilePhoto).startsWith('http') ? profilePhoto : `/uploads/${profilePhoto}`;
  };

  useEffect(() => {
    if (user?.id) {
      loadPrayers();
    }
  }, [user]);

  useEffect(() => {
    filterPrayers();
  }, [prayers, searchTerm, filterStatus]);

  const loadPrayers = async () => {
    try {
      if (!user?.id) {
        toast({
          title: 'Usuário não identificado',
          description: 'Por favor, faça login novamente.',
          variant: 'destructive',
        });
        return;
      }

      const url = `/api/prayers?userId=${user.id}&userRole=${user.role}&userChurch=${encodeURIComponent(String(user.church || ''))}`;
      const response = await fetch(url);

      if (response.ok) {
        const rawData = await response.json();
        // A API pode retornar { data: [] } ou array diretamente
        const data = Array.isArray(rawData) ? rawData : rawData?.data || [];
        // Mapear dados da API para o formato esperado pelo frontend
        const mappedData = data.map((prayer: any) => ({
          ...prayer,
          userName: prayer.requester_name || 'Usuário',
          userChurch: prayer.church || 'Igreja',
          userId: prayer.user_id,
          emotionalScore: 0, // Default value
          isAnswered: prayer.is_answered || false,
          isPrivate: prayer.is_private || false,
          allowChurchMembers: prayer.allow_church_members || true,
          createdAt: prayer.created_at,
          answeredAt: prayer.answered_at,
        }));
        setPrayers(mappedData);

        // Carregar intercessores automaticamente para todas as orações
        mappedData.forEach((prayer: PrayerRequest) => {
          if (!prayer.isAnswered) {
            loadIntercessors(prayer.id);
          }
        });
      }
    } catch (error) {
      console.error('Erro ao carregar orações:', error);
      toast({
        title: 'Erro ao carregar orações',
        description: 'Não foi possível carregar os pedidos de oração.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterPrayers = () => {
    let filtered = prayers;

    // Filter by status
    if (filterStatus === 'pending') {
      filtered = filtered.filter(prayer => !prayer.isAnswered);
    } else if (filterStatus === 'answered') {
      filtered = filtered.filter(prayer => prayer.isAnswered);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        prayer =>
          prayer.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          prayer.prayerRequest?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredPrayers(filtered);
  };

  const markAsAnswered = async (prayerId: number) => {
    try {
      if (!user?.id) {
        toast({
          title: 'Usuário não identificado',
          description: 'Por favor, faça login novamente.',
          variant: 'destructive',
        });
        return;
      }

      const response = await fetch(`/api/prayers/${prayerId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answeredBy: parseInt(user.id) }),
      });

      if (response.ok) {
        setPrayers(prev =>
          prev.map(prayer =>
            prayer.id === prayerId
              ? {
                  ...prayer,
                  isAnswered: true,
                  answeredAt: new Date().toISOString(),
                  answeredBy: user?.name,
                }
              : prayer
          )
        );

        toast({
          title: 'Oração marcada como respondida',
          description: 'O pedido foi marcado como atendido.',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro ao marcar oração',
        description: 'Não foi possível marcar a oração como respondida.',
        variant: 'destructive',
      });
    }
  };

  const deletePrayer = async (prayerId: number) => {
    try {
      if (!user?.id) {
        toast({
          title: 'Usuário não identificado',
          description: 'Por favor, faça login novamente.',
          variant: 'destructive',
        });
        return;
      }

      // Verificar se a oração ainda existe no estado local
      const prayerExists = prayers.find(prayer => prayer.id === prayerId);
      if (!prayerExists) {
        toast({
          title: 'Oração não encontrada',
          description: 'Esta oração já foi excluída ou não existe mais.',
          variant: 'destructive',
        });
        return;
      }

      console.log(`🗑️ Frontend: Tentando excluir oração ${prayerId}`);

      const response = await fetch(
        `/api/prayers/${prayerId}?userId=${user.id}&userRole=${user.role}`,
        {
          method: 'DELETE',
        }
      );

      if (response.ok) {
        setPrayers(prev => prev.filter(prayer => prayer.id !== prayerId));

        toast({
          title: 'Oração excluída',
          description: 'O pedido de oração foi removido com sucesso.',
        });
      } else {
        const errorData = await response.json();
        console.log(`❌ Frontend: Erro na resposta do servidor:`, errorData);

        toast({
          title: 'Erro ao excluir oração',
          description: errorData.error || 'Não foi possível excluir a oração.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('❌ Frontend: Erro na requisição:', error);
      toast({
        title: 'Erro ao excluir oração',
        description: 'Não foi possível excluir a oração.',
        variant: 'destructive',
      });
    }
  };

  // Função para adicionar/remover intercessor
  const toggleIntercessor = async (prayerId: number) => {
    if (!user?.id) return;

    try {
      if (prayers.find(p => p.id === prayerId)?.isUserPraying) {
        // Remover intercessor
        const response = await fetch(`/api/prayers/${prayerId}/intercessor/${user.id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          setPrayers(prev =>
            prev.map(p => (p.id === prayerId ? { ...p, isUserPraying: false } : p))
          );
          // Recarregar intercessores para atualizar a lista
          loadIntercessors(prayerId);
          toast({ title: 'Sucesso', description: 'Você não está mais orando por este pedido' });
        }
      } else {
        // Adicionar intercessor
        const response = await fetch(`/api/prayers/${prayerId}/intercessor`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ intercessorId: user.id }),
        });

        if (response.ok) {
          setPrayers(prev =>
            prev.map(p => (p.id === prayerId ? { ...p, isUserPraying: true } : p))
          );
          // Recarregar intercessores para atualizar a lista
          loadIntercessors(prayerId);
          toast({ title: 'Sucesso', description: 'Você está orando por este pedido' });
        }
      }
    } catch (error) {
      console.error('Erro ao gerenciar intercessor:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao gerenciar intercessor',
        variant: 'destructive',
      });
    }
  };

  // Função para carregar intercessores de uma oração
  const loadIntercessors = async (prayerId: number) => {
    // Sempre carregar, mesmo se já estiver carregado (para atualizações)
    setLoadingIntercessors(prev => ({ ...prev, [prayerId]: true }));
    try {
      const response = await fetch(`/api/prayers/${prayerId}/intercessors`);
      if (response.ok) {
        const data = await response.json();
        // Mapear dados da API para o formato esperado pelo frontend
        const mappedData = data.map((intercessor: any) => ({
          ...intercessor,
          intercessorName: intercessor.intercessor_name || 'Usuário',
          intercessorProfilePhoto: intercessor.profile_photo || null,
        }));
        setIntercessors(prev => ({ ...prev, [prayerId]: mappedData }));
      }
    } catch (error) {
      console.error('Erro ao carregar intercessores:', error);
    } finally {
      setLoadingIntercessors(prev => ({ ...prev, [prayerId]: false }));
    }
  };

  const canViewPrayer = (prayer: PrayerRequest) => {
    // Administradores podem ver tudo
    if (hasAdminAccess(user)) return true;

    // Usuários podem ver suas próprias orações
    if (prayer.userId === parseInt(user?.id || '0')) return true;

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
      console.error('Erro ao formatar data:', error, dateString);
      return 'Data inválida';
    }
  };

  if (isLoading) {
    return (
      <MobileLayout>
        <div className="p-4 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Carregando orações...</p>
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
            Pedidos de Oração
          </h1>
          <p className="text-muted-foreground mt-2">
            Compartilhe e acompanhe as necessidades da igreja
          </p>
        </div>

        {/* Search and Filters */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou pedido..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant={filterStatus === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('all')}
            >
              Todas ({visiblePrayers.length})
            </Button>
            <Button
              variant={filterStatus === 'pending' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('pending')}
            >
              Pendentes ({visiblePrayers.filter(p => !p.isAnswered).length})
            </Button>
            <Button
              variant={filterStatus === 'answered' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('answered')}
            >
              Respondidas ({visiblePrayers.filter(p => p.isAnswered).length})
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
                    ? 'Nenhuma oração encontrada com os filtros aplicados.'
                    : 'Nenhum pedido de oração ainda.'}
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
                  {/* Estado Espiritual */}
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">
                      {
                        spiritualEmojis[prayer.emotionalScore as keyof typeof spiritualEmojis]
                          ?.emoji
                      }
                    </span>
                    <Badge
                      className={
                        spiritualEmojis[prayer.emotionalScore as keyof typeof spiritualEmojis]
                          ?.color
                      }
                    >
                      {
                        spiritualEmojis[prayer.emotionalScore as keyof typeof spiritualEmojis]
                          ?.label
                      }
                    </Badge>
                  </div>

                  {/* Prayer Request */}
                  {prayer.prayerRequest && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-700">{prayer.prayerRequest}</p>
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
                  {!prayer.isAnswered && prayer.userId !== parseInt(user?.id || '0') && (
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
                        <span className="text-sm font-medium text-gray-700">Quem está orando:</span>
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
                                <AvatarImage src={intercessor.intercessorProfilePhoto} />
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
                          {prayer.userId === parseInt(user?.id || '0')
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
                      (hasAdminAccess(user) || prayer.userId === parseInt(user?.id || '0')) && (
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
                    {(hasAdminAccess(user) || prayer.userId === parseInt(user?.id || '0')) && (
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
