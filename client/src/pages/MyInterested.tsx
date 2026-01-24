import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Heart, 
  Search, 
  Plus, 
  Phone, 
  Mail, 
  Calendar,
  MessageCircle,
  CheckCircle,
  Clock,
  User,
  MapPin,
  Star,
  TrendingUp,
  Users,
  BookOpen,
  Target,
  AlertCircle,
  MessageSquare,
  XCircle,
  X,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { hasAdminAccess } from '@/lib/permissions';
import { useToast } from '@/hooks/use-toast';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getMountName, getLevelIcon } from '@/lib/gamification';
import { MountIcon } from '@/components/ui/mount-icon';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface InterestedPerson {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  church: string;
  status: 'novo' | 'contato-inicial' | 'estudando' | 'batizado' | 'inativo';
  assignedDate?: string;
  lastContact?: string;
  nextStudy?: string;
  studiesCompleted: number;
  totalStudies: number;
  notes: string;
  source: 'evento' | 'indicacao' | 'online' | 'visita' | 'outro';
  interestedSituation?: string;
  interests?: string[];
}

interface Relationship {
  id: number;
  missionaryId: number;
  interestedId: number;
  status: 'active' | 'inactive' | 'completed';
  assignedAt: string;
  notes: string;
}

interface DiscipleshipRequest {
  id: number;
  missionaryId: number;
  interestedId: number;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  notes: string;
  adminNotes?: string;
}

export default function MyInterested() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedTab, setSelectedTab] = useState<'my' | 'church'>('my');
  const [showDiscipleDialog, setShowDiscipleDialog] = useState(false);
  const [selectedInterested, setSelectedInterested] = useState<InterestedPerson | null>(null);
  const [discipleMessage, setDiscipleMessage] = useState('');
  const [selectedChurch, setSelectedChurch] = useState<string>('all');
  
  // Estados para autorização de discipulado (admin)
  const [showAuthorizationModal, setShowAuthorizationModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<DiscipleshipRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState('');

  // Buscar interessados da igreja do usuário logado
  const { data: churchInterested = [], isLoading: loadingChurch } = useQuery({
    queryKey: ['church-interested', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const response = await fetch('/api/my-interested', {
        headers: {
          'x-user-id': user.id.toString()
        }
      });
      if (!response.ok) throw new Error('Erro ao buscar interessados da igreja');
      return response.json();
    },
    // Admin não usa esta rota; evita 403 e chamadas desnecessárias
    enabled: !!user?.id && !hasAdminAccess(user)
  });

  // Buscar relacionamentos do usuário logado (como missionário)
  const { data: myRelationships = [], isLoading: loadingRelationships } = useQuery({
    queryKey: ['my-relationships', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const response = await fetch(`/api/relationships?missionaryId=${user.id}`, {
        headers: {
          'x-user-id': user.id.toString(),
          'x-user-role': user.role || 'member'
        }
      });
      if (!response.ok) throw new Error('Erro ao buscar relacionamentos');
      return response.json();
    },
    enabled: !!user?.id
  });

  // Buscar solicitações de discipulado do usuário logado
  const { data: myRequests = [], isLoading: loadingRequests } = useQuery({
    queryKey: ['my-discipleship-requests', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const response = await fetch(`/api/discipleship-requests?missionaryId=${user.id}`, {
        headers: {
          'x-user-id': user.id.toString(),
          'x-user-role': user.role || 'member'
        }
      });
      if (!response.ok) throw new Error('Erro ao buscar solicitações');
      return response.json();
    },
    enabled: !!user?.id
  });

  // Buscar todas as solicitações de discipulado (para ver status)
  const { data: allRequests = [], isLoading: loadingAllRequests } = useQuery({
    queryKey: ['all-discipleship-requests', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await fetch('/api/discipleship-requests', {
        headers: {
          'x-user-id': user.id.toString(),
          'x-user-role': user.role || 'member'
        }
      });
      if (!response.ok) throw new Error('Erro ao buscar solicitações');
      return response.json();
    },
    enabled: !!user?.id
  });

  // Buscar TODOS os relacionamentos (para mostrar quem está discipulando cada interessado)
  const { data: allRelationships = [], isLoading: loadingAllRelationships } = useQuery({
    queryKey: ['all-relationships', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await fetch('/api/relationships', {
        headers: {
          'x-user-id': user.id.toString(),
          'x-user-role': user.role || 'member'
        }
      });
      if (!response.ok) throw new Error('Erro ao buscar relacionamentos');
      return response.json();
    },
    enabled: !!user?.id
  });

  // Buscar TODOS os usuários (para mostrar nomes dos missionários)
  const { data: allUsers = [], isLoading: loadingAllUsers } = useQuery({
    queryKey: ['all-users', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await fetch('/api/users', {
        headers: {
          'x-user-id': user.id.toString(),
          'x-user-role': user.role || 'member'
        }
      });
      if (!response.ok) throw new Error('Erro ao buscar usuários');
      return response.json();
    },
    enabled: !!user?.id
  });

  // Base de interessados conforme perfil: admin vê TODOS (de todas as igrejas)
  const isAdmin = hasAdminAccess(user);
  const interestedBase: any[] = isAdmin
    ? (allUsers || []).filter((u: any) => u.role === 'interested')
    : (churchInterested || []);

  // Lista de igrejas disponíveis (para admin)
  const availableChurches: string[] = Array.from(
    new Set((interestedBase || []).map((p: any) => p.church).filter(Boolean))
  ).sort((a, b) => String(a).localeCompare(String(b), 'pt-BR', { sensitivity: 'base' }));

  // Mutation para criar solicitação de discipulado
  const createDiscipleRequestMutation = useMutation({
    mutationFn: async (data: { missionaryId: number; interestedId: number; status: string; notes: string }) => {
      const response = await fetch('/api/discipleship-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) throw new Error('Erro ao criar solicitação');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discipleship-requests'] });
      queryClient.invalidateQueries({ queryKey: ['all-discipleship-requests'] });
      toast({
        title: "✅ Solicitação enviada!",
        description: "Aguarde a aprovação do administrador.",
      });
      setShowDiscipleDialog(false);
      setSelectedInterested(null);
      setDiscipleMessage('');
    },
    onError: (error: any) => {
      toast({
        title: "❌ Erro ao enviar solicitação",
        description: error.message || "Não foi possível enviar a solicitação.",
        variant: "destructive",
      });
    }
  });

  // Mutation para autorizar/rejeitar solicitação (admin)
  const updateRequestMutation = useMutation({
    mutationFn: async ({ 
      requestId, 
      status, 
      adminNotes 
    }: { 
      requestId: number; 
      status: 'approved' | 'rejected'; 
      adminNotes: string; 
    }) => {
      const response = await fetch(`/api/discipleship-requests/${requestId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status, 
          adminNotes, 
          processedBy: user?.id || 1
        })
      });
      
      if (!response.ok) throw new Error('Erro ao atualizar solicitação');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discipleship-requests'] });
      queryClient.invalidateQueries({ queryKey: ['relationships'] });
      queryClient.invalidateQueries({ queryKey: ['church-interested'] });
      queryClient.invalidateQueries({ queryKey: ['my-interested'] });
      toast({
        title: "✅ Solicitação processada!",
        description: "A solicitação foi processada com sucesso.",
      });
      setShowAuthorizationModal(false);
      setSelectedRequest(null);
      setAdminNotes('');
    },
    onError: (error: any) => {
      toast({
        title: "❌ Erro ao processar",
        description: error.message || "Não foi possível processar a solicitação.",
        variant: "destructive",
      });
    }
  });

  // Filtrar interessados baseado na busca e status
  const filteredChurchInterested = interestedBase.filter((person: InterestedPerson) => {
    const matchesSearch = person.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         person.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || person.status === selectedStatus;
    const matchesChurch = !isAdmin || selectedChurch === 'all' || person.church === selectedChurch;
    
    return matchesSearch && matchesStatus && matchesChurch;
  });

  // Obter interessados vinculados ao usuário logado
  const myInterested = isAdmin
    ? []
    : myRelationships.map((rel: Relationship) => {
        const interested = interestedBase.find((p: InterestedPerson) => p.id === rel.interestedId);
        return interested ? { ...interested, relationship: rel } : null;
      }).filter(Boolean);

  // Ordenar interessados por nome (ordem alfabética)
  const sortedMyInterested = myInterested.sort((a: any, b: any) => 
    a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })
  );

  // Ordenar interessados da igreja por nome (ordem alfabética)
  const sortedFilteredChurchInterested = filteredChurchInterested.sort((a: any, b: any) => 
    a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })
  );

  // Verificar se um interessado já tem solicitação pendente
  const hasPendingRequest = (interestedId: number) => {
    return allRequests.some((req: DiscipleshipRequest) => 
      req.interestedId === interestedId && 
      req.missionaryId === Number(user?.id) && 
      req.status === 'pending'
    );
  };

  // Verificar se um interessado já tem solicitação aprovada
  const hasApprovedRequest = (interestedId: number) => {
    return allRequests.some((req: DiscipleshipRequest) => 
      req.interestedId === interestedId && 
      req.missionaryId === Number(user?.id) && 
      req.status === 'approved'
    );
  };

  // Verificar se um interessado já tem relacionamento ativo
  const hasActiveRelationship = (interestedId: number) => {
    return myRelationships.some((rel: Relationship) => 
      rel.interestedId === interestedId && 
      rel.status === 'active'
    );
  };

  // Verificar se um interessado tem solicitação pendente (para administradores)
  const hasPendingRequestForAdmin = (interestedId: number) => {
    return allRequests.some((req: DiscipleshipRequest) => 
      req.interestedId === interestedId && 
      req.status === 'pending'
    );
  };

  const handleDiscipleRequest = (person: InterestedPerson) => {
    setSelectedInterested(person);
    setShowDiscipleDialog(true);
  };

  // Funções para autorização de discipulado (admin)
  const openAuthorizationModal = (request: DiscipleshipRequest) => {
    setSelectedRequest(request);
    setAdminNotes(request.adminNotes || '');
    setShowAuthorizationModal(true);
  };

  const handleProcessRequest = (status: 'approved' | 'rejected') => {
    if (!selectedRequest) return;
    
    updateRequestMutation.mutate({
      requestId: selectedRequest.id,
      status,
      adminNotes: adminNotes.trim()
    });
  };

  // Função para obter informações do usuário
  const getUserInfo = (userId: number) => {
    const userInfo = interestedBase.find((u: any) => u.id === userId) || allUsers.find((u: any) => u.id === userId);
    return userInfo ? userInfo.name : `Usuário ${userId}`;
  };

  // Função para obter o nome do missionário que está discipulando
  const getMissionaryName = (missionaryId: number) => {
    // Buscar em todos os usuários da igreja
    const missionary = churchInterested.find((u: any) => u.id === missionaryId);
    if (missionary) return missionary.name;
    
    // Se não encontrar na igreja, retornar ID do usuário
    return `Usuário ${missionaryId}`;
  };

  // Função para obter o nome do missionário que está discipulando a partir do relacionamento
  const getMissionaryNameFromRelationship = (interestedId: number) => {
    // Buscar em todos os relacionamentos ativos (não apenas do usuário atual)
    const activeRelationship = allRelationships.find((rel: any) => 
      rel.interestedId === interestedId && rel.status === 'active'
    );
    
    if (activeRelationship) {
      // Usar o nome do missionário que já vem do backend
      if (activeRelationship.missionaryName) {
        // Extrair apenas o primeiro nome
        const firstName = activeRelationship.missionaryName.split(' ')[0];
        return firstName;
      }
      
      // Fallback para casos onde o nome não está disponível
      return `Usuário ${activeRelationship.missionaryId}`;
    }
    
    return 'Desconhecido';
  };

  // Função para obter primeiros nomes de TODOS os discipuladores ativos de um interessado
  const getMissionaryFirstNames = (interestedId: number): string[] => {
    const activeRelationships = allRelationships.filter((rel: any) =>
      rel.interestedId === interestedId && rel.status === 'active'
    );

    const firstNames = activeRelationships.map((rel: any) => {
      // Usar o nome do missionário que já vem do backend
      if (rel.missionaryName) {
        return rel.missionaryName.split(' ')[0];
      }

      // Fallback para casos onde o nome não está disponível
      return `Usuário ${rel.missionaryId}`;
    });

    // Remover duplicados mantendo a ordem
    return Array.from(new Set(firstNames));
  };

  // Função para desvincular relacionamento de discipulado
  const handleUnlinkDisciple = async (interestedId: number) => {
    try {
      // Encontrar o relacionamento ativo
      const activeRelationship = myRelationships.find((rel: Relationship) => 
        rel.interestedId === interestedId && rel.status === 'active'
      );
      
      if (!activeRelationship) {
        toast({
          title: "❌ Erro",
          description: "Relacionamento não encontrado.",
          variant: "destructive",
        });
        return;
      }

      // Confirmar a ação
      if (!confirm('Tem certeza que deseja desvincular este amigo? Esta ação não pode ser desfeita.')) {
        return;
      }

      // Fazer a requisição para remover o relacionamento
      const response = await fetch(`/api/relationships/${activeRelationship.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Erro ao desvincular relacionamento');
      }

      // Atualizar o cache
      queryClient.invalidateQueries({ queryKey: ['relationships'] });
      queryClient.invalidateQueries({ queryKey: ['my-interested'] });
      queryClient.invalidateQueries({ queryKey: ['church-interested'] });
      queryClient.invalidateQueries({ queryKey: ['all-discipleship-requests'] });

      toast({
        title: "✅ Desvinculado com sucesso!",
        description: "O amigo foi desvinculado do seu discipulado.",
      });
    } catch (error: any) {
      toast({
        title: "❌ Erro ao desvincular",
        description: error.message || "Não foi possível desvincular o relacionamento.",
        variant: "destructive",
      });
    }
  };

  const confirmDiscipleRequest = () => {
    if (!selectedInterested || !user?.id || !discipleMessage.trim()) return;
    
    // Log para debug
    console.log("🔍 Dados para envio:", {
      missionaryId: Number(user.id),
      interestedId: selectedInterested.id,
      notes: discipleMessage,
      userType: typeof user.id,
      interestedType: typeof selectedInterested.id,
      messageType: typeof discipleMessage
    });
    
    createDiscipleRequestMutation.mutate({
      missionaryId: Number(user.id),
      interestedId: selectedInterested.id,
      status: 'pending',
      notes: discipleMessage
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'novo':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'contato-inicial':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'estudando':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'batizado':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'inativo':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'novo':
        return 'Novo';
      case 'contato-inicial':
        return 'Contato Inicial';
      case 'estudando':
        return 'Estudando';
      case 'batizado':
        return 'Batizado';
      case 'inativo':
        return 'Inativo';
      default:
        return status;
    }
  };

  const getDiscipleStatus = (interestedId: number) => {
    // Verificar se há relacionamento ativo com o usuário atual
    const myActiveRelationship = myRelationships.find((rel: Relationship) => 
      rel.interestedId === interestedId && rel.status === 'active'
    );
    
    if (myActiveRelationship) {
      return { 
        label: 'Discipulando', 
        color: 'bg-green-100 text-green-800', 
        icon: CheckCircle,
        missionaryId: myActiveRelationship.missionaryId,
        type: 'active',
        isMyRelationship: true
      };
    }
    
    // Verificar se há solicitação aprovada com o usuário atual
    const myApprovedRequest = allRequests.find((req: DiscipleshipRequest) => 
      req.interestedId === interestedId && req.status === 'approved' && req.missionaryId === Number(user?.id)
    );
    
    if (myApprovedRequest) {
      return { 
        label: 'Aprovado', 
        color: 'bg-blue-100 text-blue-800', 
        icon: CheckCircle,
        missionaryId: myApprovedRequest.missionaryId,
        type: 'approved',
        isMyRelationship: true
      };
    }
    
    // Verificar se há solicitação pendente com o usuário atual
    const myPendingRequest = allRequests.find((req: DiscipleshipRequest) => 
      req.interestedId === interestedId && req.status === 'pending' && req.missionaryId === Number(user?.id)
    );
    
    if (myPendingRequest) {
      return { 
        label: 'Solicitado', 
        color: 'bg-yellow-100 text-yellow-800', 
        icon: Clock,
        missionaryId: myPendingRequest.missionaryId,
        type: 'pending',
        isMyRelationship: true
      };
    }
    
    // Se não há relacionamento com o usuário atual, retornar null para permitir novo discipulado
    return null;
  };

  // Função para verificar se o interessado já tem algum relacionamento ativo (para exibição na aba Da Igreja)
  const hasAnyActiveRelationship = (interestedId: number) => {
    return allRelationships.some((rel: Relationship) =>
      rel.interestedId === interestedId && rel.status === 'active'
    );
  };

  // Função para verificar se o interessado já tem alguma solicitação aprovada (para exibição na aba Da Igreja)
  const hasAnyApprovedRequest = (interestedId: number) => {
    return allRequests.some((req: DiscipleshipRequest) =>
      req.interestedId === interestedId && req.status === 'approved'
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  // Estatísticas
  const stats = {
    totalMy: sortedMyInterested.length,
    totalChurch: sortedFilteredChurchInterested.length,
    pendingRequests: myRequests.filter((req: DiscipleshipRequest) => req.status === 'pending').length,
    approvedRequests: myRequests.filter((req: DiscipleshipRequest) => req.status === 'approved').length
  };

  // Força aba "Da Igreja" para administradores
  useEffect(() => {
    if (isAdmin && selectedTab !== 'church') {
      setSelectedTab('church');
    }
  }, [isAdmin, selectedTab]);

  // Função para abrir WhatsApp
  const handleWhatsApp = (phone: string, name: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/55${cleanPhone}?text=Olá ${name}! Tudo bem?`;
    window.open(whatsappUrl, '_blank');
  };

  // Função para abrir chat interno
  const handleOpenChat = (interestedId: number, interestedName: string) => {
    // Navegar para o chat com o interessado selecionado
    navigate(`/chat?user=${interestedId}&name=${encodeURIComponent(interestedName)}`);
  };

  // Função para obter pontos do interessado (busca real da API)
  const getInterestedPoints = async (interestedId: number): Promise<number> => {
    try {
      const response = await fetch(`/api/users/${interestedId}/points-details`);
      if (response.ok) {
        const data = await response.json();
        return data.points || 0;
      }
    } catch (error) {
      console.error('Erro ao buscar pontos do interessado:', error);
    }
    return 0;
  };

  // Hook para buscar pontos de múltiplos interessados
  const { data: interestedPoints = {}, isLoading: loadingPoints } = useQuery({
    queryKey: ['interested-points', myInterested.map((p: any) => p?.id).filter(Boolean)],
    queryFn: async () => {
      const pointsMap: Record<number, number> = {};
      
      for (const interested of myInterested) {
        if (interested) {
          const points = await getInterestedPoints(interested.id);
          pointsMap[interested.id] = points;
        }
      }
      
      return pointsMap;
    },
    enabled: myInterested.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  if (!user) {
    return (
      <MobileLayout>
        <div className="container mx-auto p-4 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">Faça login para acessar esta página</h3>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="container mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Meus Amigos</h1>
            <p className="text-muted-foreground">
              Gerencie seus relacionamentos de discipulado
            </p>
          </div>
          
          {/* Botão de refresh manual */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['discipleship-requests'] });
              queryClient.invalidateQueries({ queryKey: ['all-discipleship-requests'] });
              queryClient.invalidateQueries({ queryKey: ['relationships'] });
              queryClient.invalidateQueries({ queryKey: ['all-relationships'] });
              queryClient.invalidateQueries({ queryKey: ['my-interested'] });
              queryClient.invalidateQueries({ queryKey: ['church-interested'] });
              queryClient.invalidateQueries({ queryKey: ['all-users'] });
            }}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.totalMy}</div>
              <div className="text-sm text-muted-foreground">Meus</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.totalChurch}</div>
              <div className="text-sm text-muted-foreground">Da Igreja</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.pendingRequests}</div>
              <div className="text-sm text-muted-foreground">Pendentes</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.approvedRequests}</div>
              <div className="text-sm text-muted-foreground">Aprovados</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b">
          <Button
            variant={selectedTab === 'my' ? 'default' : 'ghost'}
            onClick={() => setSelectedTab('my')}
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
          >
            <Users className="h-4 w-4 mr-2" />
            Meus Amigos ({stats.totalMy})
          </Button>
          <Button
            variant={selectedTab === 'church' ? 'default' : 'ghost'}
            onClick={() => setSelectedTab('church')}
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
          >
            <BookOpen className="h-4 w-4 mr-2" />
            Da Igreja ({stats.totalChurch})
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar amigos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Status Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <Button
            variant={selectedStatus === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedStatus('all')}
          >
            Todos
          </Button>
          <Button
            variant={selectedStatus === 'novo' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedStatus('novo')}
          >
            Novos
          </Button>
          <Button
            variant={selectedStatus === 'estudando' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedStatus('estudando')}
          >
            Estudando
          </Button>
          <Button
            variant={selectedStatus === 'batizado' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedStatus('batizado')}
          >
            Batizados
          </Button>
        </div>

        {/* Church Filter (Admin) */}
        {isAdmin && (
          <div className="w-full md:w-80">
            <Select value={selectedChurch} onValueChange={setSelectedChurch}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por igreja" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as igrejas</SelectItem>
                {availableChurches.map((church) => (
                  <SelectItem key={church} value={church}>{church}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Loading States */}
        {(loadingChurch || loadingRelationships || loadingRequests || loadingPoints) && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Carregando...</p>
          </div>
        )}

        {/* Interested List */}
        {!loadingChurch && !loadingRelationships && !loadingRequests && !loadingPoints && (
          <div className="space-y-4">
            {(selectedTab === 'my' ? sortedMyInterested : sortedFilteredChurchInterested).map((person: InterestedPerson) => {
              const discipleStatus = getDiscipleStatus(person.id);
              const canRequestDisciple = !hasPendingRequest(person.id) && !hasApprovedRequest(person.id) && !hasActiveRelationship(person.id);
              const isMyInterested = selectedTab === 'my';
              
              return (
                <Card key={person.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="space-y-4">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src="" />
                            <AvatarFallback className="bg-primary text-white">
                              {person.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div>
                            <h3 className="font-semibold">{person.name}</h3>
                            {isMyInterested && (
                              <p className="text-sm text-muted-foreground">{person.email}</p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-2 items-end">
                          {isMyInterested && (
                            <Badge className={getStatusColor(person.status)}>
                              {getStatusLabel(person.status)}
                            </Badge>
                          )}
                          
                          {discipleStatus && (
                            <Badge className={discipleStatus.color}>
                              <discipleStatus.icon className="h-3 w-3 mr-1" />
                              {discipleStatus.label}
                            </Badge>
                          )}

                          {/* Informação de quem está discipulando (apenas na aba Da Igreja) */}
                          {selectedTab === 'church' && (
                            <div className="text-xs text-muted-foreground text-right">
                              {/* Mostrar se há relacionamento ativo */}
                              {hasAnyActiveRelationship(person.id) && (
                                <div className="mb-1 flex items-center gap-1 justify-end">
                                  <span className="font-medium mr-1">Discipulado por:</span>
                                  {getMissionaryFirstNames(person.id).map((name, idx) => (
                                    <Badge key={idx} className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                      {name}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                              
                              {/* Mostrar se há solicitação aprovada */}
                              {hasAnyApprovedRequest(person.id) && !hasAnyActiveRelationship(person.id) && (
                                <div className="mb-1">
                                  <span className="font-medium">Aprovado para discipulado</span>
                                </div>
                              )}
                              
                              {/* Mostrar se há solicitação pendente */}
                              {allRequests.some((req: DiscipleshipRequest) => 
                                req.interestedId === person.id && req.status === 'pending'
                              ) && (
                                <div className="mb-1">
                                  <span className="font-medium">Solicitação pendente</span>
                                </div>
                              )}
                              
                              {/* Mostrar se não há nenhum status */}
                              {!hasAnyActiveRelationship(person.id) && !hasAnyApprovedRequest(person.id) && 
                               !allRequests.some((req: DiscipleshipRequest) => 
                                 req.interestedId === person.id && req.status === 'pending'
                               ) && (
                                <div className="mb-1">
                                  <span className="font-medium">Disponível para discipulado</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Badge de autorização para administradores */}
                          {hasAdminAccess(user) && hasPendingRequestForAdmin(person.id) && (
                            <Badge
                              className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 cursor-pointer"
                              onClick={() => {
                                const request = allRequests.find((r: any) => r.interestedId === person.id);
                                if (request) openAuthorizationModal(request);
                              }}
                            >
                              <Clock className="h-3 w-3 mr-1" />
                              Autorizar
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Contact Info - Apenas para interessados vinculados */}
                      {isMyInterested && (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4" />
                              <span>{person.phone}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              <span>{person.address}</span>
                            </div>
                          </div>

                          {/* Church */}
                          <div className="text-sm text-muted-foreground">
                            <strong>Igreja:</strong> {person.church}
                          </div>

                          {/* Study Progress */}
                          {person.studiesCompleted > 0 && (
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span>Progresso dos Estudos</span>
                                <span>{person.studiesCompleted}/{person.totalStudies}</span>
                              </div>
                              <div className="bg-muted rounded-full h-2">
                                <div 
                                  className="bg-green-600 h-2 rounded-full"
                                  style={{ width: `${(person.studiesCompleted / person.totalStudies) * 100}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Interests */}
                          <div className="flex flex-wrap gap-1">
                            {person.interests?.map((interest, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {interest}
                              </Badge>
                            ))}
                          </div>

                          {/* Notes */}
                          {person.notes && (
                            <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
                              <strong>Observações:</strong> {person.notes}
                            </div>
                          )}

                          {/* Last Contact */}
                          {person.lastContact && (
                            <div className="text-xs text-muted-foreground border-t pt-2">
                              Último contato: {formatDate(person.lastContact)}
                            </div>
                          )}
                        </>
                      )}

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2">
                        {/* Botão "Discipular" - sempre disponível se não há nenhum status de discipulado */}
                        {!discipleStatus && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleDiscipleRequest(person)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Target className="h-3 w-3 mr-1" />
                            Discipular
                          </Button>
                        )}
                        
                        {/* Botão "Solicitado" quando há solicitação pendente com o usuário atual */}
                        {discipleStatus?.type === 'pending' && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled
                            className="bg-yellow-50 border-yellow-200 text-yellow-700 cursor-not-allowed"
                          >
                            <Clock className="h-3 w-3 mr-1" />
                            Solicitado
                          </Button>
                        )}
                        
                        {/* Botão "Aprovado" quando a solicitação foi aprovada com o usuário atual */}
                        {discipleStatus?.type === 'approved' && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled
                            className="bg-blue-50 border-blue-200 text-blue-700 cursor-not-allowed"
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Aprovado
                          </Button>
                        )}
                        
                        {/* Botão "Discipulando" quando há relacionamento ativo com o usuário atual */}
                        {discipleStatus?.type === 'active' && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled
                            className="bg-green-50 border-green-200 text-green-700 cursor-not-allowed"
                          >
                            <Users className="h-3 w-3 mr-1" />
                            Discipulando
                          </Button>
                        )}
                        
                        {/* Botões adicionais apenas para interessados vinculados */}
                        {isMyInterested && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleWhatsApp(person.phone, person.name)}
                              className="bg-green-50 hover:bg-green-100 border-green-200 text-green-700"
                            >
                              <MessageSquare className="h-3 w-3 mr-1" />
                              WhatsApp
                            </Button>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenChat(person.id, person.name)}
                              className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
                            >
                              <MessageCircle className="h-3 w-3 mr-1" />
                              Mensagem
                            </Button>

                            {/* Botão "Desvincular" apenas para interessados que estão sendo discipulados */}
                            {discipleStatus?.type === 'active' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleUnlinkDisciple(person.id)}
                                className="bg-red-50 hover:bg-red-100 border-red-200 text-red-700"
                              >
                                <X className="h-3 w-3 mr-1" />
                                Desvincular
                              </Button>
                            )}
                          </>
                        )}
                      </div>

                      {/* Mountain Progress - Apenas para interessados vinculados */}
                      {isMyInterested && (
                        <div className="mt-4 p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
                          {loadingPoints ? (
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 bg-purple-200 rounded animate-pulse" />
                              <div className="flex-1">
                                <div className="h-4 bg-purple-200 rounded animate-pulse mb-1" />
                                <div className="h-3 bg-purple-200 rounded animate-pulse w-20" />
                              </div>
                              <div className="h-5 w-12 bg-purple-200 rounded animate-pulse" />
                            </div>
                          ) : (
                            <div className="flex items-center gap-3">
                              <MountIcon 
                                iconType={getLevelIcon(interestedPoints[person.id] || 0)} 
                                className="h-8 w-8 text-purple-600" 
                              />
                              <div className="flex-1">
                                <div className="text-sm font-medium text-purple-700">
                                  {getMountName(interestedPoints[person.id] || 0)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {interestedPoints[person.id] || 0} pontos
                                </div>
                              </div>
                              <Badge variant="outline" className="text-xs border-purple-300 text-purple-700">
                                Monte
                              </Badge>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {!loadingChurch && !loadingRelationships && !loadingRequests && !loadingPoints && 
         (selectedTab === 'my' ? sortedMyInterested : sortedFilteredChurchInterested).length === 0 && (
          <div className="text-center py-8">
            <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              {selectedTab === 'my' ? 'Nenhum amigo vinculado' : 'Nenhum amigo encontrado'}
            </h3>
            <p className="text-muted-foreground">
              {selectedTab === 'my' 
                ? 'Você ainda não tem amigos vinculados. Solicite discipulado de amigos da igreja.'
                : 'Tente ajustar os filtros de busca.'
              }
            </p>
          </div>
        )}
      </div>

      {/* Disciple Request Dialog */}
      {showDiscipleDialog && selectedInterested && (
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
                  className="w-full mt-1 p-2 border rounded-md"
                  rows={3}
                  placeholder="Explique por que você gostaria de discipular esta pessoa..."
                  value={discipleMessage}
                  onChange={(e) => setDiscipleMessage(e.target.value)}
                />
              </div>
              
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowDiscipleDialog(false)}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={confirmDiscipleRequest}
                  disabled={!discipleMessage.trim() || createDiscipleRequestMutation.isPending}
                >
                  {createDiscipleRequestMutation.isPending ? 'Enviando...' : 'Enviar Solicitação'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Authorization Modal for Admins */}
      {showAuthorizationModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-600" />
                Autorizar Discipulado
              </CardTitle>
              <CardDescription>
                Aprove ou rejeite a solicitação de discipulado
              </CardDescription>
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
                    <span className="font-medium text-muted-foreground">Observações do Missionário:</span>
                    <div className="text-sm bg-muted/50 p-2 rounded mt-1">
                      {selectedRequest.notes}
                    </div>
                  </div>
                )}
                
                <div>
                  <label className="text-sm font-medium">Notas do Administrador:</label>
                  <textarea
                    className="w-full mt-1 p-2 border rounded-md"
                    rows={3}
                    placeholder="Adicione observações sobre sua decisão..."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowAuthorizationModal(false)}
                >
                  Cancelar
                </Button>
                
                <Button
                  variant="destructive"
                  onClick={() => handleProcessRequest('rejected')}
                  disabled={updateRequestMutation.isPending}
                >
                  {updateRequestMutation.isPending ? (
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
                  onClick={() => handleProcessRequest('approved')}
                  disabled={updateRequestMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {updateRequestMutation.isPending ? (
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
      )}
    </MobileLayout>
  );
}