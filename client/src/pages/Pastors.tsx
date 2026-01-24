import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserCog, Plus, Edit, Trash2, Building2, Mail, Phone, Search } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { canManagePastors } from '@/lib/permissions';

interface Pastor {
  id: number;
  name: string;
  email: string;
  role: string;
  district_id: number | null;
  district_name?: string;
  district_code?: string;
  church?: string;
  phone?: string;
}

export default function Pastors() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingPastor, setEditingPastor] = useState<Pastor | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pastorToDelete, setPastorToDelete] = useState<Pastor | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    districtId: ''
  });

  // Buscar pastores
  const { data: pastors = [], isLoading } = useQuery<Pastor[]>({
    queryKey: ['/api/pastors'],
    queryFn: async () => {
      const response = await fetch('/api/pastors', {
        headers: {
          'x-user-id': user?.id?.toString() || ''
        }
      });
      if (!response.ok) throw new Error('Erro ao buscar pastores');
      return response.json();
    },
    enabled: canManagePastors(user)
  });

  // Buscar distritos (para seleção)
  const { data: districts = [] } = useQuery({
    queryKey: ['/api/districts'],
    queryFn: async () => {
      const response = await fetch('/api/districts', {
        headers: {
          'x-user-id': user?.id?.toString() || ''
        }
      });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: canManagePastors(user)
  });

  // Criar pastor
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/pastors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id?.toString() || ''
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao criar pastor');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pastors'] });
      queryClient.invalidateQueries({ queryKey: ['/api/districts'] });
      toast({
        title: "Pastor criado",
        description: "O pastor foi criado com sucesso.",
      });
      setIsCreateDialogOpen(false);
      setFormData({ name: '', email: '', password: '', districtId: '' });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível criar o pastor.",
        variant: "destructive",
      });
    }
  });

  // Atualizar pastor
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: any }) => {
      const response = await fetch(`/api/pastors/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id?.toString() || ''
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao atualizar pastor');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pastors'] });
      queryClient.invalidateQueries({ queryKey: ['/api/districts'] });
      toast({
        title: "Pastor atualizado",
        description: "O pastor foi atualizado com sucesso.",
      });
      setIsEditDialogOpen(false);
      setEditingPastor(null);
      setFormData({ name: '', email: '', password: '', districtId: '' });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível atualizar o pastor.",
        variant: "destructive",
      });
    }
  });

  // Deletar pastor
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/pastors/${id}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': user?.id?.toString() || ''
        }
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao deletar pastor');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pastors'] });
      toast({
        title: "Pastor removido",
        description: "O pastor foi removido com sucesso.",
      });
      setDeleteDialogOpen(false);
      setPastorToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível remover o pastor.",
        variant: "destructive",
      });
    }
  });

  const handleCreate = () => {
    createMutation.mutate({
      name: formData.name,
      email: formData.email,
      password: formData.password,
      districtId: formData.districtId ? parseInt(formData.districtId) : null
    });
  };

  const handleEdit = (pastor: Pastor) => {
    setEditingPastor(pastor);
    setFormData({
      name: pastor.name,
      email: pastor.email,
      password: '', // Não preencher senha
      districtId: pastor.district_id?.toString() || ''
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = () => {
    if (!editingPastor) return;
    const updateData: any = {
      name: formData.name,
      email: formData.email,
      districtId: formData.districtId ? parseInt(formData.districtId) : null
    };
    if (formData.password) {
      updateData.password = formData.password;
    }
    updateMutation.mutate({
      id: editingPastor.id,
      data: updateData
    });
  };

  const handleDelete = (pastor: Pastor) => {
    setPastorToDelete(pastor);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (pastorToDelete) {
      deleteMutation.mutate(pastorToDelete.id);
    }
  };

  const filteredPastors = pastors.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!canManagePastors(user)) {
    return (
      <MobileLayout>
        <div className="p-4 text-center">
          <h2 className="text-xl font-semibold mb-2">Acesso Restrito</h2>
          <p className="text-muted-foreground">Apenas superadmin pode gerenciar pastores.</p>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Pastores</h1>
            <p className="text-muted-foreground">Gerencie os pastores e seus distritos</p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Pastor
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar pastores..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {isLoading ? (
          <div className="text-center py-8">Carregando...</div>
        ) : filteredPastors.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">Nenhum pastor encontrado</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredPastors.map((pastor) => (
              <Card key={pastor.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        <UserCog className="h-5 w-5" />
                        {pastor.name}
                      </CardTitle>
                      <CardDescription className="mt-1 flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        {pastor.email}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(pastor)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(pastor)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {pastor.district_name && (
                    <div className="flex items-center gap-2 text-sm mb-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Distrito:</span>
                      <span>{pastor.district_name}</span>
                      {pastor.district_code && (
                        <Badge variant="outline" className="text-xs">
                          {pastor.district_code}
                        </Badge>
                      )}
                    </div>
                  )}
                  {!pastor.district_name && (
                    <Badge variant="outline" className="text-xs">
                      Sem distrito associado
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Dialog de Criação */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Pastor</DialogTitle>
              <DialogDescription>
                Crie um novo pastor e associe a um distrito
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nome</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nome do pastor"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div>
                <Label>Senha</Label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Senha inicial"
                />
              </div>
              <div>
                <Label>Distrito (Opcional)</Label>
                <Select
                  value={formData.districtId || "none"}
                  onValueChange={(value) => setFormData({ ...formData, districtId: value === "none" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um distrito" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {districts.map((district: any) => (
                      <SelectItem key={district.id} value={district.id.toString()}>
                        {district.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreate} disabled={!formData.name || !formData.email || !formData.password}>
                Criar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog de Edição */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Pastor</DialogTitle>
              <DialogDescription>
                Atualize as informações do pastor
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nome</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <Label>Nova Senha (Opcional - deixe em branco para manter)</Label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Deixe em branco para manter a senha atual"
                />
              </div>
              <div>
                <Label>Distrito</Label>
                <Select
                  value={formData.districtId || "none"}
                  onValueChange={(value) => setFormData({ ...formData, districtId: value === "none" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um distrito" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {districts.map((district: any) => (
                      <SelectItem key={district.id} value={district.id.toString()}>
                        {district.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleUpdate} disabled={!formData.name || !formData.email}>
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog de Confirmação de Exclusão */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar Remoção</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja remover o pastor "{pastorToDelete?.name}"?
                O pastor será convertido para membro e perderá acesso administrativo.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={confirmDelete}>
                Remover
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MobileLayout>
  );
}

