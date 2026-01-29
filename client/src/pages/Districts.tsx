import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Plus, Edit, Trash2, Users, MapPin, Search, Link2, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { isSuperAdmin } from '@/lib/permissions';
import { useNavigate } from 'react-router-dom';

interface District {
  id: number;
  name: string;
  code: string;
  pastor_id: number | null;
  pastor_name?: string;
  pastor_email?: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  churchesCount?: number;
  churches?: any[];
}

export default function Districts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingDistrict, setEditingDistrict] = useState<District | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [districtToDelete, setDistrictToDelete] = useState<District | null>(null);
  const [linkChurchesDialogOpen, setLinkChurchesDialogOpen] = useState(false);
  const [selectedDistrictForLink, setSelectedDistrictForLink] = useState<District | null>(null);
  const [selectedChurchIds, setSelectedChurchIds] = useState<number[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    pastorId: '',
    description: '',
  });

  // Buscar distritos
  const {
    data: districtsData = [] as District[],
    isLoading,
    error: districtsError,
  } = useQuery<District[]>({
    queryKey: ['/api/districts', user?.id],
    queryFn: async () => {
      console.log('🔍 Districts: Buscando distritos para usuário:', user?.id);
      const userId = user?.id?.toString() || '';

      if (!userId) {
        console.warn('⚠️ Districts: Usuário não autenticado');
        throw new Error('Usuário não autenticado');
      }

      const response = await fetch('/api/districts', {
        headers: {
          'x-user-id': userId,
        },
      });

      console.log('🔍 Districts: Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Districts: Erro na resposta:', response.status, errorText);
        throw new Error(`Erro ao buscar distritos: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('🔍 Districts: Distritos recebidos:', data);

      if (!Array.isArray(data)) {
        console.error('❌ Districts: Resposta não é um array:', data);
        return [];
      }

      // Log detalhado de cada distrito para debug
      data.forEach((district: any) => {
        console.log(`🔍 Districts: Distrito "${district.name}":`, {
          id: district.id,
          pastor_id: district.pastor_id,
          pastor_name: district.pastor_name,
          pastor_email: district.pastor_email,
          hasPastor: !!district.pastor_id,
        });
      });

      // Buscar igrejas para cada distrito
      const districtsWithChurches = await Promise.all(
        data.map(async (district: District) => {
          try {
            const churchesResponse = await fetch(`/api/districts/${district.id}/churches`, {
              headers: {
                'x-user-id': userId,
              },
            });
            if (churchesResponse.ok) {
              const churches = await churchesResponse.json();
              console.log(`🔍 Districts: Distrito ${district.name} tem ${churches.length} igrejas`);
              return { ...district, churchesCount: churches.length, churches };
            }
          } catch (error) {
            console.error(`❌ Erro ao buscar igrejas do distrito ${district.id}:`, error);
          }
          return { ...district, churchesCount: 0, churches: [] };
        })
      );

      console.log('✅ Districts: Total de distritos processados:', districtsWithChurches.length);
      return districtsWithChurches;
    },
    enabled: !!user?.id, // Só executar se o usuário estiver autenticado
    retry: 2,
    staleTime: 30000, // 30 segundos
  });

  // Garantir que districts seja sempre um array tipado
  const districts: District[] = districtsData ?? [];

  // Buscar pastores (para seleção)
  const { data: pastors = [] } = useQuery({
    queryKey: ['/api/pastors'],
    queryFn: async () => {
      const response = await fetch('/api/pastors', {
        headers: {
          'x-user-id': user?.id?.toString() || '',
        },
      });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: isSuperAdmin(user),
  });

  // Buscar igrejas sem distrito
  const { data: unassignedChurches = [], refetch: refetchUnassignedChurches } = useQuery({
    queryKey: ['/api/churches/unassigned'],
    queryFn: async () => {
      const response = await fetch('/api/churches/unassigned', {
        headers: {
          'x-user-id': user?.id?.toString() || '',
        },
      });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: isSuperAdmin(user),
  });

  // Criar distrito
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/districts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id?.toString() || '',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao criar distrito');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/districts'] });
      toast({
        title: 'Distrito criado',
        description: 'O distrito foi criado com sucesso.',
      });
      setIsCreateDialogOpen(false);
      setFormData({ name: '', code: '', pastorId: '', description: '' });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível criar o distrito.',
        variant: 'destructive',
      });
    },
  });

  // Atualizar distrito
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await fetch(`/api/districts/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id?.toString() || '',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao atualizar distrito');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/districts'] });
      toast({
        title: 'Distrito atualizado',
        description: 'O distrito foi atualizado com sucesso.',
      });
      setIsEditDialogOpen(false);
      setEditingDistrict(null);
      setFormData({ name: '', code: '', pastorId: '', description: '' });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível atualizar o distrito.',
        variant: 'destructive',
      });
    },
  });

  // Deletar distrito
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/districts/${id}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': user?.id?.toString() || '',
        },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao deletar distrito');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/districts'] });
      toast({
        title: 'Distrito deletado',
        description: 'O distrito foi deletado com sucesso.',
      });
      setDeleteDialogOpen(false);
      setDistrictToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível deletar o distrito.',
        variant: 'destructive',
      });
    },
  });

  // Vincular igrejas ao distrito
  const linkChurchesMutation = useMutation({
    mutationFn: async ({ districtId, churchIds }: { districtId: number; churchIds: number[] }) => {
      const response = await fetch(`/api/districts/${districtId}/churches/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id?.toString() || '',
        },
        body: JSON.stringify({ churchIds }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao vincular igrejas');
      }
      return response.json();
    },
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: ['/api/districts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/churches/unassigned'] });
      toast({
        title: 'Igrejas vinculadas',
        description: data.message || 'As igrejas foram vinculadas ao distrito com sucesso.',
      });
      setLinkChurchesDialogOpen(false);
      setSelectedDistrictForLink(null);
      setSelectedChurchIds([]);
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível vincular as igrejas.',
        variant: 'destructive',
      });
    },
  });

  const handleCreate = () => {
    createMutation.mutate({
      name: formData.name,
      code: formData.code,
      pastorId: formData.pastorId ? parseInt(formData.pastorId) : null,
      description: formData.description || null,
    });
  };

  const handleEdit = (district: District) => {
    setEditingDistrict(district);
    setFormData({
      name: district.name,
      code: district.code,
      pastorId: district.pastor_id?.toString() || '',
      description: district.description || '',
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = () => {
    if (!editingDistrict) return;
    updateMutation.mutate({
      id: editingDistrict.id,
      data: {
        name: formData.name,
        code: formData.code,
        pastorId: formData.pastorId ? parseInt(formData.pastorId) : null,
        description: formData.description || null,
      },
    });
  };

  const handleDelete = (district: District) => {
    setDistrictToDelete(district);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (districtToDelete) {
      deleteMutation.mutate(districtToDelete.id);
    }
  };

  const handleOpenLinkChurches = (district: District) => {
    setSelectedDistrictForLink(district);
    setSelectedChurchIds([]);
    refetchUnassignedChurches();
    setLinkChurchesDialogOpen(true);
  };

  const handleToggleChurch = (churchId: number) => {
    setSelectedChurchIds(prev =>
      prev.includes(churchId) ? prev.filter(id => id !== churchId) : [...prev, churchId]
    );
  };

  const handleLinkChurches = () => {
    if (selectedDistrictForLink && selectedChurchIds.length > 0) {
      linkChurchesMutation.mutate({
        districtId: selectedDistrictForLink.id,
        churchIds: selectedChurchIds,
      });
    }
  };

  const handleViewAsPastor = async (district: District) => {
    // Tentar encontrar o pastor_id de diferentes formas
    const pastorId = district.pastor_id || (district as any).pastorId;

    if (!pastorId && !district.pastor_name) {
      toast({
        title: 'Aviso',
        description: 'Este distrito não tem um pastor associado.',
        variant: 'destructive',
      });
      return;
    }

    try {
      let pastor;

      // Se temos pastor_id, buscar dados completos do usuário (não necessariamente com role='pastor')
      if (pastorId) {
        const response = await fetch(`/api/users/${pastorId}`, {
          headers: {
            'x-user-id': user?.id?.toString() || '',
          },
        });

        if (!response.ok) {
          throw new Error('Erro ao buscar dados do responsável pelo distrito');
        }

        pastor = await response.json();
      } else {
        // Se não temos pastor_id mas temos pastor_name, tentar buscar por email ou nome
        // Por enquanto, vamos apenas mostrar erro
        toast({
          title: 'Aviso',
          description:
            'Não foi possível identificar o pastor. Edite o distrito para associar um pastor.',
          variant: 'destructive',
        });
        return;
      }

      // Salvar contexto de impersonação no localStorage
      const impersonationContext = {
        originalUser: user,
        impersonatingAs: {
          id: pastor.id,
          name: pastor.name,
          email: pastor.email,
          role: 'pastor',
          districtId: district.id,
          districtName: district.name,
        },
        isImpersonating: true,
        timestamp: Date.now(),
      };

      localStorage.setItem('7care_impersonation', JSON.stringify(impersonationContext));

      toast({
        title: 'Visualizando como Pastor',
        description: `Você está visualizando como ${pastor.name}. Use o botão "Voltar ao Superadmin" para retornar.`,
      });

      // Redirecionar para o dashboard
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Erro ao visualizar como pastor:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível visualizar como pastor.',
        variant: 'destructive',
      });
    }
  };

  const filteredDistricts = districts.filter(
    d =>
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isSuperAdmin(user)) {
    return (
      <MobileLayout>
        <div className="p-4 text-center">
          <h2 className="text-xl font-semibold mb-2">Acesso Restrito</h2>
          <p className="text-muted-foreground">Apenas superadmin pode gerenciar distritos.</p>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Distritos</h1>
            <p className="text-muted-foreground">Gerencie os distritos e suas igrejas</p>
          </div>
          <div className="flex gap-2">
            {unassignedChurches.length > 0 && (
              <Button
                variant="outline"
                onClick={() => setLinkChurchesDialogOpen(true)}
                className="text-orange-600 border-orange-300 hover:bg-orange-50"
              >
                <Link2 className="h-4 w-4 mr-2" />
                Igrejas sem Distrito ({unassignedChurches.length})
              </Button>
            )}
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Distrito
            </Button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar distritos..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {isLoading ? (
          <div className="text-center py-8">Carregando...</div>
        ) : districtsError ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-destructive font-medium">Erro ao carregar distritos</p>
              <p className="text-muted-foreground text-sm mt-2">
                {districtsError instanceof Error ? districtsError.message : 'Erro desconhecido'}
              </p>
              <p className="text-muted-foreground text-xs mt-2">
                Verifique o console para mais detalhes
              </p>
            </CardContent>
          </Card>
        ) : filteredDistricts.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">Nenhum distrito encontrado</p>
              {districts.length === 0 && (
                <p className="text-muted-foreground text-sm mt-2">
                  Verifique se você tem permissão de superadmin
                </p>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredDistricts.map(district => (
              <Card key={district.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        {district.name}
                      </CardTitle>
                      <CardDescription className="mt-1">Código: {district.code}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      {(district.pastor_id || district.pastor_name) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewAsPastor(district)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          title="Visualizar como pastor deste distrito"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          <span className="hidden sm:inline">Ver como Pastor</span>
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenLinkChurches(district)}
                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        title="Vincular igrejas a este distrito"
                      >
                        <Link2 className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleEdit(district)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(district)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {district.description && (
                    <p className="text-sm text-muted-foreground mb-3">{district.description}</p>
                  )}
                  <div className="space-y-2">
                    {district.pastor_name && (
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Pastor:</span>
                        <span>{district.pastor_name}</span>
                        {district.pastor_email && (
                          <span className="text-muted-foreground">({district.pastor_email})</span>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Igrejas:</span>
                      <Badge variant="secondary">
                        {district.churchesCount || 0}{' '}
                        {district.churchesCount === 1 ? 'igreja' : 'igrejas'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Dialog de Criação */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Distrito</DialogTitle>
              <DialogDescription>Crie um novo distrito para organizar igrejas</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nome do Distrito</Label>
                <Input
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Santana do Livramento"
                />
              </div>
              <div>
                <Label>Código</Label>
                <Input
                  value={formData.code}
                  onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="Ex: SLIV001"
                />
              </div>
              <div>
                <Label>Pastor (Opcional)</Label>
                <Select
                  value={formData.pastorId || 'none'}
                  onValueChange={value =>
                    setFormData({ ...formData, pastorId: value === 'none' ? '' : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um pastor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {pastors.map((pastor: any) => (
                      <SelectItem key={pastor.id} value={pastor.id.toString()}>
                        {pastor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Descrição (Opcional)</Label>
                <Textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrição do distrito"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreate} disabled={!formData.name || !formData.code}>
                Criar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog de Edição */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Distrito</DialogTitle>
              <DialogDescription>Atualize as informações do distrito</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nome do Distrito</Label>
                <Input
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Código</Label>
                <Input
                  value={formData.code}
                  onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                />
              </div>
              <div>
                <Label>Pastor (Opcional)</Label>
                <Select
                  value={formData.pastorId || 'none'}
                  onValueChange={value =>
                    setFormData({ ...formData, pastorId: value === 'none' ? '' : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um pastor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {pastors.map((pastor: any) => (
                      <SelectItem key={pastor.id} value={pastor.id.toString()}>
                        {pastor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Descrição (Opcional)</Label>
                <Textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleUpdate} disabled={!formData.name || !formData.code}>
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog de Confirmação de Exclusão */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar Exclusão</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja deletar o distrito "{districtToDelete?.name}"? Esta ação não
                pode ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={confirmDelete}>
                Deletar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog de Vincular Igrejas */}
        <Dialog
          open={linkChurchesDialogOpen}
          onOpenChange={open => {
            setLinkChurchesDialogOpen(open);
            if (!open) {
              setSelectedDistrictForLink(null);
              setSelectedChurchIds([]);
            }
          }}
        >
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5" />
                Vincular Igrejas{' '}
                {selectedDistrictForLink
                  ? `ao Distrito ${selectedDistrictForLink.name}`
                  : 'sem Distrito'}
              </DialogTitle>
              <DialogDescription>
                {selectedDistrictForLink
                  ? `Selecione as igrejas que deseja vincular ao distrito "${selectedDistrictForLink.name}".`
                  : 'Selecione um distrito e as igrejas que deseja vincular.'}
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto space-y-4 py-4">
              {!selectedDistrictForLink && districts.length > 0 && (
                <div>
                  <Label>Selecione o Distrito</Label>
                  <Select
                    value=""
                    onValueChange={value => {
                      // Type assertion para evitar inferência never
                      const districtList = districts as unknown as District[];
                      const found = districtList.find(d => d.id === parseInt(value));
                      setSelectedDistrictForLink(found || null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um distrito" />
                    </SelectTrigger>
                    <SelectContent>
                      {(districts as unknown as District[]).map(district => (
                        <SelectItem key={district.id} value={district.id.toString()}>
                          {district.name} ({district.churchesCount || 0} igrejas)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {unassignedChurches.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Não há igrejas sem distrito para vincular.</p>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label>Igrejas sem Distrito ({unassignedChurches.length})</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (selectedChurchIds.length === unassignedChurches.length) {
                          setSelectedChurchIds([]);
                        } else {
                          setSelectedChurchIds(unassignedChurches.map((c: any) => c.id));
                        }
                      }}
                    >
                      {selectedChurchIds.length === unassignedChurches.length
                        ? 'Desmarcar Todas'
                        : 'Selecionar Todas'}
                    </Button>
                  </div>
                  <div className="border rounded-lg max-h-[300px] overflow-y-auto">
                    {unassignedChurches.map((church: any) => (
                      <div
                        key={church.id}
                        className="flex items-center gap-3 p-3 border-b last:border-b-0 hover:bg-muted/50 cursor-pointer"
                        onClick={() => handleToggleChurch(church.id)}
                      >
                        <Checkbox
                          id={`church-${church.id}`}
                          checked={selectedChurchIds.includes(church.id)}
                          onCheckedChange={() => handleToggleChurch(church.id)}
                        />
                        <div className="flex-1">
                          <p className="font-medium">{church.name}</p>
                          {church.address && (
                            <p className="text-sm text-muted-foreground">{church.address}</p>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {church.code || 'Sem código'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="flex-shrink-0">
              <Button
                variant="outline"
                onClick={() => {
                  setLinkChurchesDialogOpen(false);
                  setSelectedDistrictForLink(null);
                  setSelectedChurchIds([]);
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleLinkChurches}
                disabled={
                  !selectedDistrictForLink ||
                  selectedChurchIds.length === 0 ||
                  linkChurchesMutation.isPending
                }
              >
                {linkChurchesMutation.isPending
                  ? 'Vinculando...'
                  : `Vincular ${selectedChurchIds.length} Igreja(s)`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MobileLayout>
  );
}
