import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Plus, Edit, Trash2, Users, MapPin, Search, Link2, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { isSuperAdmin } from '@/lib/permissions';
import { fetchWithAuth } from '@/lib/api';
import { createLogger } from '@/lib/logger';
import type { Church } from '@/types/domain';
import {
  CreateDistrictDialog,
  DeleteDistrictDialog,
  EditDistrictDialog,
  LinkChurchesDialog,
} from './districts/DistrictDialogs';

const districtsLogger = createLogger('Districts');

interface District {
  id: number;
  name: string;
  code: string;
  pastor_id: number | null;
  pastorId?: number | null;
  pastor_name?: string;
  pastor_email?: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  churchesCount?: number;
  churches?: Church[];
}

type PastorOption = {
  id: number;
  name: string;
  email?: string | null;
};

type DistrictPayload = {
  name: string;
  code: string;
  pastorId: number | null;
  description: string | null;
};

type ApiSuccessResponse<T> = {
  success: boolean;
  data?: T;
};

export default function Districts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
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
      districtsLogger.debug('Buscando distritos para usuário:', user?.id);
      const userId = user?.id?.toString() || '';

      if (!userId) {
        districtsLogger.warn('Usuário não autenticado');
        throw new Error('Usuário não autenticado');
      }

      const response = await fetchWithAuth('/api/districts');

      districtsLogger.debug('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        districtsLogger.error('Erro na resposta:', response.status, errorText);
        throw new Error(`Erro ao buscar distritos: ${response.status} - ${errorText}`);
      }

      const data = (await response.json()) as District[];
      districtsLogger.debug('Distritos recebidos:', data);

      if (!Array.isArray(data)) {
        districtsLogger.error('Resposta não é um array:', data);
        return [];
      }

      // Log detalhado de cada distrito para debug
      data.forEach((district: District) => {
        districtsLogger.debug(`Distrito "${district.name}":`, {
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
            const churchesResponse = await fetchWithAuth(`/api/districts/${district.id}/churches`);
            if (churchesResponse.ok) {
              const churches = await churchesResponse.json();
              districtsLogger.debug(`Distrito ${district.name} tem ${churches.length} igrejas`);
              return { ...district, churchesCount: churches.length, churches };
            }
          } catch (error) {
            districtsLogger.error(`Erro ao buscar igrejas do distrito ${district.id}:`, error);
          }
          return { ...district, churchesCount: 0, churches: [] };
        })
      );

      districtsLogger.debug('Total de distritos processados:', districtsWithChurches.length);
      return districtsWithChurches;
    },
    enabled: !!user?.id, // Só executar se o usuário estiver autenticado
    retry: 2,
    staleTime: 30000, // 30 segundos
  });

  // Garantir que districts seja sempre um array tipado
  const districts: District[] = districtsData ?? [];

  // Buscar pastores (para seleção)
  const { data: pastors = [] as PastorOption[] } = useQuery<PastorOption[]>({
    // IMPORTANTE: user?.id na queryKey para cache separado por usuário
    queryKey: ['/api/pastors', user?.id],
    queryFn: async () => {
      const response = await fetchWithAuth('/api/pastors');
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!user?.id && isSuperAdmin(user),
    staleTime: 0,
    refetchOnMount: 'always',
  });

  // Buscar igrejas sem distrito
  const { data: unassignedChurches = [] as Church[], refetch: refetchUnassignedChurches } =
    useQuery<Church[]>({
      // IMPORTANTE: user?.id na queryKey para cache separado por usuário
      queryKey: ['/api/churches/unassigned', user?.id],
      queryFn: async () => {
        const response = await fetchWithAuth('/api/churches/unassigned');
        if (!response.ok) return [];
        return response.json();
      },
      enabled: !!user?.id && isSuperAdmin(user),
      staleTime: 0,
      refetchOnMount: 'always',
    });

  // Criar distrito
  const createMutation = useMutation({
    mutationFn: async (data: DistrictPayload) => {
      const response = await fetchWithAuth('/api/districts', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || t('districts.createError'));
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/districts'] });
      toast({
        title: t('districts.districtCreated'),
        description: t('districts.districtCreatedDesc'),
      });
      setIsCreateDialogOpen(false);
      setFormData({ name: '', code: '', pastorId: '', description: '' });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : undefined;
      toast({
        title: t('common.error'),
        description: message || t('districts.createFailed'),
        variant: 'destructive',
      });
    },
  });

  // Atualizar distrito
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: DistrictPayload }) => {
      const response = await fetchWithAuth(`/api/districts/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || t('districts.updateError'));
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/districts'] });
      toast({
        title: t('districts.districtUpdated'),
        description: t('districts.districtUpdatedDesc'),
      });
      setIsEditDialogOpen(false);
      setEditingDistrict(null);
      setFormData({ name: '', code: '', pastorId: '', description: '' });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : undefined;
      toast({
        title: t('common.error'),
        description: message || t('districts.updateFailed'),
        variant: 'destructive',
      });
    },
  });

  // Deletar distrito
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetchWithAuth(`/api/districts/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || t('districts.deleteError'));
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/districts'] });
      toast({
        title: t('districts.districtDeleted'),
        description: t('districts.districtDeletedDesc'),
      });
      setDeleteDialogOpen(false);
      setDistrictToDelete(null);
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : undefined;
      toast({
        title: t('common.error'),
        description: message || t('districts.deleteFailed'),
        variant: 'destructive',
      });
    },
  });

  // Vincular igrejas ao distrito
  const linkChurchesMutation = useMutation({
    mutationFn: async ({ districtId, churchIds }: { districtId: number; churchIds: number[] }) => {
      const response = await fetchWithAuth(`/api/districts/${districtId}/churches/bulk`, {
        method: 'POST',
        body: JSON.stringify({ churchIds }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || t('districts.linkError'));
      }
      return response.json();
    },
    onSuccess: (data: { message?: string }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/districts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/churches/unassigned'] });
      toast({
        title: t('districts.churchesLinked'),
        description: data.message || t('districts.churchesLinkedDesc'),
      });
      setLinkChurchesDialogOpen(false);
      setSelectedDistrictForLink(null);
      setSelectedChurchIds([]);
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : undefined;
      toast({
        title: t('common.error'),
        description: message || t('districts.linkFailed'),
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
    setSelectedChurchIds((prev) =>
      prev.includes(churchId) ? prev.filter((id) => id !== churchId) : [...prev, churchId]
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
    const pastorId = district.pastor_id ?? district.pastorId ?? null;

    if (!pastorId && !district.pastor_name) {
      toast({
        title: t('districts.warning'),
        description: t('districts.noPastorAssociated'),
        variant: 'destructive',
      });
      return;
    }

    try {
      let pastor: PastorOption | null = null;

      // Se temos pastor_id, buscar dados completos do usuário (não necessariamente com role='pastor')
      if (pastorId) {
        const response = await fetchWithAuth(`/api/users/${pastorId}`);

        if (!response.ok) {
          throw new Error(t('districts.fetchPastorError'));
        }

        const payload = (await response.json()) as
          | PastorOption
          | ApiSuccessResponse<PastorOption>
          | null;

        if (payload && typeof payload === 'object' && 'success' in payload) {
          pastor = payload.data ?? null;
        } else {
          pastor = payload as PastorOption | null;
        }

        if (!pastor?.id || !pastor?.name) {
          throw new Error(t('districts.cannotIdentifyPastor'));
        }
      } else {
        // Se não temos pastor_id mas temos pastor_name, tentar buscar por email ou nome
        // Por enquanto, vamos apenas mostrar erro
        toast({
          title: t('districts.warning'),
          description: t('districts.cannotIdentifyPastor'),
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
      queryClient.clear();

      toast({
        title: t('districts.viewingAsPastor'),
        description: t('districts.viewingAsPastorDesc', { name: pastor.name }),
      });

      // Forçar reidratação da autenticação para aplicar impersonação imediatamente
      window.location.assign('/dashboard');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : undefined;
      districtsLogger.error('Erro ao visualizar como pastor:', error);
      toast({
        title: t('common.error'),
        description: message || t('districts.viewAsPastorFailed'),
        variant: 'destructive',
      });
    }
  };

  const toChurchId = (id: Church['id']) => (typeof id === 'string' ? Number(id) : id);

  const filteredDistricts = districts.filter(
    (d) =>
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  let districtsContent: React.ReactNode;
  if (isLoading) {
    districtsContent = <div className="text-center py-8">{t('common.loading')}</div>;
  } else if (districtsError) {
    districtsContent = (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-destructive font-medium">{t('districts.errorLoading')}</p>
          <p className="text-muted-foreground text-sm mt-2">
            {districtsError instanceof Error ? districtsError.message : t('districts.unknownError')}
          </p>
          <p className="text-muted-foreground text-xs mt-2">{t('districts.checkConsole')}</p>
        </CardContent>
      </Card>
    );
  } else if (filteredDistricts.length === 0) {
    districtsContent = (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">{t('districts.noDistrictsFound')}</p>
          {districts.length === 0 && (
            <p className="text-muted-foreground text-sm mt-2">
              {t('districts.checkSuperadminPermission')}
            </p>
          )}
        </CardContent>
      </Card>
    );
  } else {
    districtsContent = (
      <div className="grid gap-4">
        {filteredDistricts.map((district) => (
          <Card key={district.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    {district.name}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {t('districts.codeLabel', { code: district.code })}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {(district.pastor_id || district.pastor_name) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewAsPastor(district)}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/30"
                      title={t('districts.viewAsPastorTooltip')}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      <span className="hidden sm:inline">{t('districts.viewAsPastor')}</span>
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenLinkChurches(district)}
                    className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:text-green-300 dark:hover:bg-green-900/30"
                    title={t('districts.linkChurchesTooltip')}
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
                    <span className="font-medium">{t('districts.pastorLabel')}</span>
                    <span>{district.pastor_name}</span>
                    {district.pastor_email && (
                      <span className="text-muted-foreground">({district.pastor_email})</span>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{t('districts.churchesLabel')}</span>
                  <Badge variant="secondary">
                    {district.churchesCount || 0}{' '}
                    {district.churchesCount === 1
                      ? t('districts.churchSingular')
                      : t('districts.churchPlural')}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }
  if (!isSuperAdmin(user)) {
    return (
      <MobileLayout>
        <div className="p-4 text-center">
          <h2 className="text-xl font-semibold mb-2">{t('districts.restrictedAccess')}</h2>
          <p className="text-muted-foreground">{t('districts.restrictedMessage')}</p>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="p-3 sm:p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">{t('districts.title')}</h1>
            <p className="text-sm text-muted-foreground">{t('districts.subtitle')}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {unassignedChurches.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLinkChurchesDialogOpen(true)}
                className="text-orange-600 border-orange-300 hover:bg-orange-50 dark:text-orange-400 dark:border-orange-600/50 dark:hover:bg-orange-900/30"
              >
                <Link2 className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">{t('districts.unassignedChurches')}</span>
                <span className="sm:hidden">{t('districts.unassignedChurchesMobile')}</span>
                <span className="ml-1">({unassignedChurches.length})</span>
              </Button>
            )}
            <Button size="sm" onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">{t('districts.newDistrict')}</span>
              <span className="sm:hidden">{t('districts.newMobile')}</span>
            </Button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('districts.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {districtsContent}

        <CreateDistrictDialog
          isOpen={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          formData={formData}
          setFormData={setFormData}
          pastors={pastors}
          onCreate={handleCreate}
        />
        <EditDistrictDialog
          isOpen={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          formData={formData}
          setFormData={setFormData}
          pastors={pastors}
          onUpdate={handleUpdate}
        />
        <DeleteDistrictDialog
          isOpen={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          districtToDelete={districtToDelete}
          onConfirm={confirmDelete}
        />
        <LinkChurchesDialog
          isOpen={linkChurchesDialogOpen}
          onOpenChange={setLinkChurchesDialogOpen}
          selectedDistrictForLink={selectedDistrictForLink}
          setSelectedDistrictForLink={setSelectedDistrictForLink}
          selectedChurchIds={selectedChurchIds}
          setSelectedChurchIds={setSelectedChurchIds}
          districts={districts}
          unassignedChurches={unassignedChurches}
          toChurchId={toChurchId}
          handleToggleChurch={handleToggleChurch}
          onLinkChurches={handleLinkChurches}
          isLinking={linkChurchesMutation.isPending}
        />
      </div>
    </MobileLayout>
  );
}
