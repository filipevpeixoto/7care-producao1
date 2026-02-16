import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserCog, Plus, Edit, Trash2, Building2, Mail, Search } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { formatEmailDisplay } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { canManagePastors } from '@/lib/permissions';
import { fetchWithAuth } from '@/lib/api';
import type { District } from '@/types/domain';

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

interface CreatePastorData {
  name: string;
  email: string;
  password: string;
  districtId: number | null;
}

interface UpdatePastorData {
  name: string;
  email: string;
  districtId: number | null;
  password?: string;
}

export default function Pastors() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
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
    districtId: '',
  });

  // Buscar pastores
  const { data: pastors = [], isLoading } = useQuery<Pastor[]>({
    // IMPORTANTE: user?.id na queryKey para cache separado por usuário
    queryKey: ['/api/pastors', user?.id],
    queryFn: async () => {
      const response = await fetchWithAuth('/api/pastors');
      if (!response.ok) throw new Error(t('pastors.errorFetch'));
      return response.json();
    },
    enabled: !!user?.id && canManagePastors(user),
    staleTime: 0,
    refetchOnMount: 'always',
  });

  // Buscar distritos (para seleção)
  const { data: districts = [] } = useQuery<District[]>({
    // IMPORTANTE: user?.id na queryKey para cache separado por usuário
    queryKey: ['/api/districts', user?.id],
    queryFn: async () => {
      const response = await fetchWithAuth('/api/districts');
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!user?.id && canManagePastors(user),
    staleTime: 0,
    refetchOnMount: 'always',
  });

  // Criar pastor
  const createMutation = useMutation({
    mutationFn: async (data: CreatePastorData) => {
      const response = await fetchWithAuth('/api/pastors', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || t('pastors.errorCreateFallback'));
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pastors'] });
      queryClient.invalidateQueries({ queryKey: ['/api/districts'] });
      toast({
        title: t('pastors.toastCreatedTitle'),
        description: t('pastors.toastCreatedDescription'),
      });
      setIsCreateDialogOpen(false);
      setFormData({ name: '', email: '', password: '', districtId: '' });
    },
    onError: (error: Error) => {
      toast({
        title: t('pastors.toastErrorTitle'),
        description: error.message || t('pastors.errorCreateMessage'),
        variant: 'destructive',
      });
    },
  });

  // Atualizar pastor
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdatePastorData }) => {
      const response = await fetchWithAuth(`/api/pastors/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || t('pastors.errorUpdateFallback'));
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pastors'] });
      queryClient.invalidateQueries({ queryKey: ['/api/districts'] });
      toast({
        title: t('pastors.toastUpdatedTitle'),
        description: t('pastors.toastUpdatedDescription'),
      });
      setIsEditDialogOpen(false);
      setEditingPastor(null);
      setFormData({ name: '', email: '', password: '', districtId: '' });
    },
    onError: (error: Error) => {
      toast({
        title: t('pastors.toastErrorTitle'),
        description: error.message || t('pastors.errorUpdateMessage'),
        variant: 'destructive',
      });
    },
  });

  // Deletar pastor
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetchWithAuth(`/api/pastors/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || t('pastors.errorDeleteFallback'));
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pastors'] });
      toast({
        title: t('pastors.toastRemovedTitle'),
        description: t('pastors.toastRemovedDescription'),
      });
      setDeleteDialogOpen(false);
      setPastorToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: t('pastors.toastErrorTitle'),
        description: error.message || t('pastors.errorRemoveMessage'),
        variant: 'destructive',
      });
    },
  });

  const handleCreate = () => {
    createMutation.mutate({
      name: formData.name,
      email: formData.email,
      password: formData.password,
      districtId: formData.districtId ? parseInt(formData.districtId) : null,
    });
  };

  const handleEdit = (pastor: Pastor) => {
    setEditingPastor(pastor);
    setFormData({
      name: pastor.name,
      email: pastor.email,
      password: '', // Não preencher senha
      districtId: pastor.district_id?.toString() || '',
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = () => {
    if (!editingPastor) return;
    const updateData: UpdatePastorData = {
      name: formData.name,
      email: formData.email,
      districtId: formData.districtId ? parseInt(formData.districtId) : null,
    };
    if (formData.password) {
      updateData.password = formData.password;
    }
    updateMutation.mutate({
      id: editingPastor.id,
      data: updateData,
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

  const filteredPastors = pastors.filter(
    p =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!canManagePastors(user)) {
    return (
      <MobileLayout>
        <div className="p-4 text-center">
          <h2 className="text-xl font-semibold mb-2">{t('pastors.accessRestricted')}</h2>
          <p className="text-muted-foreground">{t('pastors.accessRestrictedMessage')}</p>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t('pastors.title')}</h1>
            <p className="text-muted-foreground">{t('pastors.subtitle')}</p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t('pastors.newPastor')}
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('pastors.searchPlaceholder')}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {isLoading ? (
          <div className="text-center py-8">{t('pastors.loading')}</div>
        ) : filteredPastors.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">{t('pastors.noPastorFound')}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredPastors.map(pastor => (
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
                        {formatEmailDisplay(pastor.email)}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(pastor)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(pastor)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {pastor.district_name && (
                    <div className="flex items-center gap-2 text-sm mb-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{t('pastors.districtColon')}</span>
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
                      {t('pastors.noDistrict')}
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
              <DialogTitle>{t('pastors.createTitle')}</DialogTitle>
              <DialogDescription>{t('pastors.createDescription')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>{t('pastors.nameLabel')}</Label>
                <Input
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('pastors.namePlaceholder')}
                />
              </div>
              <div>
                <Label>{t('pastors.emailLabel')}</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder={t('pastors.emailPlaceholder')}
                />
              </div>
              <div>
                <Label>{t('pastors.passwordLabel')}</Label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  placeholder={t('pastors.passwordPlaceholder')}
                />
              </div>
              <div>
                <Label>{t('pastors.districtOptional')}</Label>
                <Select
                  value={formData.districtId || 'none'}
                  onValueChange={value =>
                    setFormData({ ...formData, districtId: value === 'none' ? '' : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('pastors.selectDistrict')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('pastors.noneOption')}</SelectItem>
                    {districts.map((district) => (
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
                {t('pastors.cancel')}
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!formData.name || !formData.email || !formData.password}
              >
                {t('pastors.create')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog de Edição */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('pastors.editTitle')}</DialogTitle>
              <DialogDescription>{t('pastors.editDescription')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>{t('pastors.nameLabel')}</Label>
                <Input
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('pastors.emailLabel')}</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('pastors.newPasswordLabel')}</Label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  placeholder={t('pastors.newPasswordPlaceholder')}
                />
              </div>
              <div>
                <Label>{t('pastors.district')}</Label>
                <Select
                  value={formData.districtId || 'none'}
                  onValueChange={value =>
                    setFormData({ ...formData, districtId: value === 'none' ? '' : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('pastors.selectDistrict')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('pastors.noneOption')}</SelectItem>
                    {districts.map((district) => (
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
                {t('pastors.cancel')}
              </Button>
              <Button onClick={handleUpdate} disabled={!formData.name || !formData.email}>
                {t('pastors.save')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog de Confirmação de Exclusão */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('pastors.confirmRemovalTitle')}</DialogTitle>
              <DialogDescription>
                {t('pastors.confirmRemovalDescription', { name: pastorToDelete?.name })}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                {t('pastors.cancel')}
              </Button>
              <Button variant="destructive" onClick={confirmDelete}>
                {t('pastors.remove')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MobileLayout>
  );
}
