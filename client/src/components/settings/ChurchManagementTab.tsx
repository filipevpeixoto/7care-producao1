/* eslint-disable @typescript-eslint/no-explicit-any, no-nested-ternary, react-hooks/exhaustive-deps */
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Globe,
  Plus,
  Star,
  Save,
  Trash2,
  Eye,
  EyeOff,
  Building2,
  Loader2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Church } from '@/types/domain';
import { EditableField } from '@/components/ui/EditableField';

interface ChurchManagementTabProps {
  user: any;
  userDistrictId: number | null;
  userDistrictName: string;
}

export function ChurchManagementTab({ user, userDistrictId, userDistrictName }: ChurchManagementTabProps) {
  const { toast } = useToast();

  const [churchesList, setChurchesList] = useState<any[]>([]);
  const [defaultChurchId, setDefaultChurchId] = useState<number | null>(null);
  const [defaultChurchName, setDefaultChurchName] = useState<string>('');
  const [isSavingDefault, setIsSavingDefault] = useState(false);

  const loadChurches = async () => {
    try {
      const churchesUrl =
        user?.role === 'superadmin'
          ? '/api/churches'
          : userDistrictId
            ? `/api/churches?districtId=${userDistrictId}`
            : '/api/churches';

      const response = await fetch(churchesUrl, {
        headers: { 'x-user-id': user?.id?.toString() || '' },
      });
      if (response.ok) {
        const rawChurches = await response.json();
        const churches = Array.isArray(rawChurches) ? rawChurches : rawChurches?.data || [];

        const filteredChurches =
          user?.role === 'superadmin'
            ? churches
            : userDistrictId
              ? churches.filter((c: Church) => c.districtId === userDistrictId || !c.districtId)
              : churches;

        const formattedChurches = filteredChurches.map((church: Church) => ({
          id: church.id,
          name: church.name,
          address: church.address || 'Endereço não informado',
          districtId: church.districtId,
          active: true,
        }));
        setChurchesList(formattedChurches);
      }
    } catch (error) {
      console.error('Error loading churches:', error);
    }
  };

  const loadDefaultChurch = async () => {
    try {
      const response = await fetch('/api/settings/default-church');
      if (response.ok) {
        const data = await response.json();
        if (data.defaultChurch) {
          setDefaultChurchId(data.defaultChurch.id);
          setDefaultChurchName(data.defaultChurch.name);
        }
      }
    } catch (error) {
      console.error('Error loading default church:', error);
    }
  };

  const saveDefaultChurch = async () => {
    if (!defaultChurchId) return;

    setIsSavingDefault(true);
    try {
      const response = await fetch('/api/settings/default-church', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ churchId: defaultChurchId }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const selectedChurch = (
            churchesList as Array<{ id: number | string; name: string; address: string; active: boolean }>
          ).find((c) => c.id === defaultChurchId);
          if (selectedChurch) {
            setDefaultChurchName(selectedChurch.name);
          }

          toast({
            title: 'Igreja padrão atualizada',
            description: 'A igreja padrão foi definida com sucesso.',
          });
        }
      } else {
        throw new Error('Failed to update default church');
      }
    } catch (error) {
      console.error('Error saving default church:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível definir a igreja padrão.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingDefault(false);
    }
  };

  const toggleChurchStatus = async (churchId: number) => {
    const church = churchesList.find((c) => c.id === churchId);
    if (!church) return;

    try {
      const response = await fetch(`/api/churches/${churchId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id?.toString() || '',
        },
        body: JSON.stringify({ isActive: !church.active }),
      });

      if (response.ok) {
        setChurchesList((prev) =>
          prev.map((c) => (c.id === churchId ? { ...c, active: !c.active } : c))
        );

        const newStatus = !church.active;
        const statusText = newStatus ? 'ativada' : 'desativada';

        toast({
          title: 'Igreja atualizada',
          description: `${church.name} foi ${statusText} com sucesso.${!newStatus ? ' Usuários associados podem ser afetados.' : ''}`,
        });
      }
    } catch (_error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o status da igreja.',
        variant: 'destructive',
      });
    }
  };

  const addNewChurch = async () => {
    try {
      const response = await fetch('/api/churches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id?.toString() || '',
        },
        body: JSON.stringify({ name: 'Nova Igreja', address: 'Endereço da igreja' }),
      });

      if (response.ok) {
        await loadChurches();
        toast({
          title: 'Igreja adicionada',
          description: 'Nova igreja foi criada. Clique nos campos para editar.',
        });
      }
    } catch (_error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível criar a igreja.',
        variant: 'destructive',
      });
    }
  };

  const updateChurchField = async (churchId: number, field: string, value: string) => {
    try {
      const response = await fetch(`/api/churches/${churchId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id?.toString() || '',
        },
        body: JSON.stringify({ [field]: value }),
      });

      if (response.ok) {
        setChurchesList((prev) =>
          prev.map((church) => (church.id === churchId ? { ...church, [field]: value } : church))
        );

        if (field === 'name') {
          const church = churchesList.find((c) => c.id === churchId);
          if (church) {
            toast({
              title: 'Igreja atualizada',
              description: `Nome da igreja alterado de "${church.name}" para "${value}". Todos os usuários associados serão atualizados.`,
            });
          } else {
            toast({
              title: 'Igreja atualizada',
              description: 'As informações da igreja foram salvas e todos os usuários associados serão atualizados.',
            });
          }
        } else {
          toast({
            title: 'Igreja atualizada',
            description: 'As informações da igreja foram salvas.',
          });
        }
      }
    } catch (_error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a igreja.',
        variant: 'destructive',
      });
    }
  };

  const deleteChurch = (churchId: number, churchName: string) => {
    if (
      window.confirm(
        `Tem certeza que deseja excluir a igreja "${churchName}"? Esta ação não pode ser desfeita.`
      )
    ) {
      setChurchesList((prev) => prev.filter((church) => church.id !== churchId));
      toast({
        title: 'Igreja excluída',
        description: `${churchName} foi removida do sistema.`,
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    loadChurches();
    loadDefaultChurch();
  }, [user, userDistrictId]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Gestão de Igrejas{' '}
              {userDistrictId && user?.role !== 'superadmin' ? `- ${userDistrictName}` : ''}
            </CardTitle>
            <CardDescription>
              {user?.role === 'superadmin'
                ? 'Gerencie todas as igrejas do sistema'
                : `Gerencie as igrejas do ${userDistrictName || 'seu distrito'}`}
            </CardDescription>
          </div>
          <Button onClick={addNewChurch} data-testid="add-church-button" className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Nova Igreja
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Indicador de Filtro por Distrito */}
        {userDistrictId && user?.role !== 'superadmin' && (
          <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-purple-600" />
              <p className="text-sm text-purple-800">
                Mostrando apenas igrejas do <strong>{userDistrictName}</strong>
              </p>
            </div>
          </div>
        )}

        {/* Default Church Configuration */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <Star className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-blue-900">Igreja Padrão</h3>
          </div>
          <p className="text-sm text-blue-700 mb-4">
            Esta igreja será usada como padrão para novos usuários e usuários sem igreja definida.
          </p>
          <div className="flex items-center gap-3">
            <Select
              value={defaultChurchId?.toString() || ''}
              onValueChange={(value) => setDefaultChurchId(parseInt(value))}
            >
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue placeholder="Selecione a igreja padrão" />
              </SelectTrigger>
              <SelectContent>
                {churchesList.map((church) => (
                  <SelectItem key={church.id} value={church.id.toString()}>
                    {church.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={saveDefaultChurch}
              disabled={!defaultChurchId || isSavingDefault}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSavingDefault ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar
            </Button>
          </div>
          {defaultChurchName && (
            <div className="mt-3 p-2 bg-blue-100 rounded text-sm text-blue-800">
              <strong>Igreja padrão atual:</strong> {defaultChurchName}
            </div>
          )}
        </div>

        {/* Tabela Responsiva */}
        <div className="space-y-2">
          {/* Header da Tabela - Apenas em Desktop */}
          <div className="hidden sm:grid sm:grid-cols-12 gap-2 px-3 py-2 bg-muted/50 rounded-lg text-sm font-medium">
            <div className="col-span-4">Nome da Igreja</div>
            <div className="col-span-5">Endereço</div>
            <div className="col-span-1 text-center">Status</div>
            <div className="col-span-2 text-center">Ações</div>
          </div>

          {/* Lista de Igrejas */}
          {churchesList.map((church) => (
            <div key={church.id} className="border rounded-lg p-3 hover:bg-muted/20 transition-colors">
              {/* Layout Mobile */}
              <div className="sm:hidden space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-muted-foreground">Nome:</label>
                    <Badge variant={church.active ? 'secondary' : 'destructive'}>
                      {church.active ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </div>
                  <EditableField
                    value={church.name}
                    onSave={(value) => updateChurchField(church.id, 'name', value)}
                    className="font-medium"
                    data-testid={`church-name-${church.id}`}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Endereço:</label>
                  <EditableField
                    value={church.address}
                    onSave={(value) => updateChurchField(church.id, 'address', value)}
                    className="text-sm"
                    data-testid={`church-address-${church.id}`}
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant={church.active ? 'secondary' : 'default'}
                    size="sm"
                    onClick={() => toggleChurchStatus(church.id)}
                    className="flex-1"
                    data-testid={`toggle-church-${church.id}`}
                  >
                    {church.active ? 'Desativar' : 'Ativar'}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteChurch(church.id, church.name)}
                    data-testid={`delete-church-${church.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Layout Desktop */}
              <div className="hidden sm:grid sm:grid-cols-12 gap-2 items-center">
                <div className="col-span-4">
                  <EditableField
                    value={church.name}
                    onSave={(value) => updateChurchField(church.id, 'name', value)}
                    className="font-medium"
                    data-testid={`church-name-${church.id}`}
                  />
                </div>

                <div className="col-span-5">
                  <EditableField
                    value={church.address}
                    onSave={(value) => updateChurchField(church.id, 'address', value)}
                    className="text-sm"
                    data-testid={`church-address-${church.id}`}
                  />
                </div>

                <div className="col-span-1 flex justify-center">
                  <Badge variant={church.active ? 'secondary' : 'destructive'}>
                    {church.active ? 'Ativa' : 'Inativa'}
                  </Badge>
                </div>

                <div className="col-span-2 flex gap-1 justify-center">
                  <Button
                    variant={church.active ? 'secondary' : 'default'}
                    size="sm"
                    onClick={() => toggleChurchStatus(church.id)}
                    data-testid={`toggle-church-${church.id}`}
                  >
                    {church.active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteChurch(church.id, church.name)}
                    data-testid={`delete-church-${church.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {churchesList.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Nenhuma igreja cadastrada</p>
              <p className="text-sm">Adicione a primeira igreja do sistema</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
