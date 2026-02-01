import React, { useState, useEffect } from 'react';
import {
  DialogWithModalTracking,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { EVENT_TYPES } from '@/types/calendar';
import { Shield, Users, Heart, User, Eye, EyeOff, Cake } from 'lucide-react';

interface EventPermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ProfilePermissions {
  [profile: string]: {
    [eventType: string]: boolean;
  };
}

const USER_PROFILES = [
  { id: 'superadmin', label: 'Superadmin', icon: Shield, color: 'bg-red-500' },
  { id: 'pastor', label: 'Pastores', icon: Shield, color: 'bg-blue-500' },
  { id: 'missionary', label: 'Missionários', icon: Heart, color: 'bg-purple-500' },
  { id: 'member', label: 'Membros', icon: Users, color: 'bg-green-500' },
  { id: 'interested', label: 'Amigos', icon: User, color: 'bg-orange-500' },
];

export const EventPermissionsModal: React.FC<EventPermissionsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [permissions, setPermissions] = useState<ProfilePermissions>({});
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Carregar permissões salvas
  useEffect(() => {
    if (isOpen) {
      loadPermissions();
    }
  }, [isOpen]);

  const loadPermissions = async () => {
    try {
      const response = await fetch('/api/system/event-permissions');
      if (response.ok) {
        const data = await response.json();
        setPermissions(data.permissions || getDefaultPermissions());
      } else {
        setPermissions(getDefaultPermissions());
      }
    } catch (error) {
      console.error('Erro ao carregar permissões:', error);
      setPermissions(getDefaultPermissions());
    }
  };

  const getDefaultPermissions = (): ProfilePermissions => {
    const defaultPerms: ProfilePermissions = {};

    USER_PROFILES.forEach(profile => {
      defaultPerms[profile.id] = {};
      EVENT_TYPES.forEach(eventType => {
        // Por padrão, superadmin e pastores veem tudo, outros perfis veem eventos básicos
        if (profile.id === 'superadmin' || profile.id === 'pastor') {
          defaultPerms[profile.id][eventType.id] = true;
        } else if (profile.id === 'missionary') {
          // Missionários veem eventos relacionados ao trabalho missionário
          defaultPerms[profile.id][eventType.id] = [
            'visitas',
            'reunioes',
            'pregacoes',
            'igreja-local',
          ].includes(eventType.id);
        } else if (profile.id === 'member') {
          // Membros veem eventos da igreja
          defaultPerms[profile.id][eventType.id] = [
            'reunioes',
            'pregacoes',
            'igreja-local',
            'visitas',
          ].includes(eventType.id);
        } else {
          // Interessados veem eventos básicos
          defaultPerms[profile.id][eventType.id] = ['pregacoes', 'igreja-local'].includes(
            eventType.id
          );
        }
      });

      // Adicionar permissão para aniversários
      if (profile.id === 'superadmin' || profile.id === 'pastor') {
        defaultPerms[profile.id]['aniversarios'] = true;
      } else if (profile.id === 'missionary') {
        defaultPerms[profile.id]['aniversarios'] = true;
      } else if (profile.id === 'member') {
        defaultPerms[profile.id]['aniversarios'] = true;
      } else {
        defaultPerms[profile.id]['aniversarios'] = false;
      }
    });

    return defaultPerms;
  };

  const handlePermissionChange = (profileId: string, eventTypeId: string, value: boolean) => {
    setPermissions(prev => ({
      ...prev,
      [profileId]: {
        ...(prev[profileId] || {}),
        [eventTypeId]: value,
      },
    }));
    setHasChanges(true);
  };

  const handleProfileToggle = (profileId: string, value: boolean) => {
    // Verificar se as permissões foram carregadas
    if (!permissions || Object.keys(permissions).length === 0) {
      console.warn('Permissões ainda não foram carregadas');
      return;
    }

    const newPermissions = { ...permissions };

    // Garantir que o perfil existe no objeto de permissões
    if (!newPermissions[profileId]) {
      newPermissions[profileId] = {};
    }

    EVENT_TYPES.forEach(eventType => {
      newPermissions[profileId][eventType.id] = value;
    });
    // Incluir aniversários no controle global
    newPermissions[profileId]['aniversarios'] = value;
    setPermissions(newPermissions);
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/system/event-permissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ permissions }),
      });

      if (response.ok) {
        toast({
          title: '✅ Permissões salvas!',
          description: 'As configurações de visualização foram atualizadas com sucesso.',
        });
        setHasChanges(false);

        // Invalidar queries relacionadas para atualizar os filtros automaticamente
        queryClient.invalidateQueries({ queryKey: ['system', 'event-permissions'] });
        queryClient.invalidateQueries({ queryKey: ['events'] });

        onClose();
      } else {
        throw new Error('Erro ao salvar permissões');
      }
    } catch (error) {
      console.error('Erro ao salvar permissões:', error);
      toast({
        title: '❌ Erro ao salvar',
        description: 'Não foi possível salvar as permissões. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setPermissions(getDefaultPermissions());
    setHasChanges(true);
  };

  return (
    <DialogWithModalTracking modalId="event-permissions-modal" open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-5xl w-[95vw] overflow-y-auto -mt-8"
        style={{ maxHeight: 'calc(100vh - 2rem)' }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            Gerenciar Permissões de Visualização
          </DialogTitle>
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Eye className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-800">Filtros Automáticos</p>
                <p className="text-blue-700">
                  Os filtros de eventos na agenda serão automaticamente configurados baseados nas
                  permissões definidas aqui. Usuários só poderão filtrar pelos tipos de eventos que
                  têm permissão para visualizar.
                </p>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Grid de Permissões */}
        <div className="space-y-4">
          {/* Cabeçalho da Tabela */}
          <div className="grid grid-cols-12 gap-2 p-2 bg-gray-50 dark:bg-slate-800 rounded-lg border dark:border-slate-700">
            <div className="col-span-4">
              <Label className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                Tipos de Eventos
              </Label>
            </div>
            {USER_PROFILES.map(profile => (
              <div key={profile.id} className="col-span-2 text-center">
                <div className="flex items-center justify-center gap-2">
                  <div className={`p-1.5 rounded-full ${profile.color} text-white`}>
                    <profile.icon className="h-3 w-3" />
                  </div>
                  <Label className="text-xs font-medium text-gray-700 dark:text-gray-200">
                    {profile.label}
                  </Label>
                </div>
              </div>
            ))}
          </div>

          {/* Linhas dos Tipos de Eventos */}
          {EVENT_TYPES.map(eventType => (
            <div
              key={eventType.id}
              className="grid grid-cols-12 gap-2 p-2 rounded-lg border dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="col-span-4 flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${eventType.color}`} />
                <Label className="text-sm font-medium text-gray-800 dark:text-gray-100">
                  {eventType.label}
                </Label>
              </div>

              {USER_PROFILES.map(profile => {
                const profilePermissions = permissions[profile.id] || {};
                const isVisible = profilePermissions[eventType.id] || false;

                return (
                  <div key={profile.id} className="col-span-2 flex items-center justify-center">
                    <div className="flex items-center gap-2">
                      {isVisible ? (
                        <Eye className="h-4 w-4 text-green-600" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                      )}

                      <Switch
                        checked={isVisible}
                        onCheckedChange={value =>
                          handlePermissionChange(profile.id, eventType.id, value)
                        }
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

          {/* Linha de Aniversariantes do Mês */}
          <div className="grid grid-cols-12 gap-2 p-2 rounded-lg border dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors bg-pink-50 dark:bg-pink-950/30">
            <div className="col-span-4 flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-pink-500" />
              <div className="flex items-center gap-2">
                <Cake className="h-4 w-4 text-pink-600 dark:text-pink-400" />
                <Label className="text-sm font-medium text-gray-800 dark:text-gray-100">
                  Aniversariantes do Mês
                </Label>
              </div>
            </div>

            {USER_PROFILES.map(profile => {
              const profilePermissions = permissions[profile.id] || {};
              const isVisible = profilePermissions['aniversarios'] || false;

              return (
                <div key={profile.id} className="col-span-2 flex items-center justify-center">
                  <div className="flex items-center gap-2">
                    {isVisible ? (
                      <Eye className="h-4 w-4 text-green-600" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                    )}

                    <Switch
                      checked={isVisible}
                      onCheckedChange={value =>
                        handlePermissionChange(profile.id, 'aniversarios', value)
                      }
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Linha de Controles Globais */}
          <div className="grid grid-cols-12 gap-2 p-2 bg-blue-50 rounded-lg border">
            <div className="col-span-4 flex items-center gap-3">
              <Shield className="h-4 w-4 text-blue-600" />
              <Label className="text-sm font-semibold text-blue-800">Controle Global</Label>
            </div>

            {USER_PROFILES.map(profile => {
              const profilePermissions = permissions[profile.id] || {};
              const allVisible = Object.values(profilePermissions).every(Boolean);

              return (
                <div key={profile.id} className="col-span-2 flex items-center justify-center">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={allVisible}
                      onCheckedChange={value => handleProfileToggle(profile.id, value)}
                    />
                    <Label className="text-xs text-blue-700 font-medium">
                      {allVisible ? 'Ver tudo' : 'Ver selecionados'}
                    </Label>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Resumo das Configurações */}
        <Card className="bg-gray-50 dark:bg-slate-800">
          <CardHeader>
            <CardTitle className="text-base">Resumo das Configurações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {USER_PROFILES.map(profile => {
                const profilePermissions = permissions[profile.id] || {};
                const visibleCount = Object.values(profilePermissions).filter(Boolean).length;
                const totalCount = EVENT_TYPES.length + 1; // +1 para incluir aniversários

                return (
                  <div key={profile.id} className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{visibleCount}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      de {totalCount} tipos
                    </div>
                    <div className="text-xs font-medium text-gray-800 dark:text-gray-100">
                      {profile.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Ações */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleReset} disabled={isLoading}>
              Restaurar Padrões
            </Button>

            {hasChanges && (
              <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                Alterações não salvas
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasChanges || isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? 'Salvando...' : 'Salvar Permissões'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </DialogWithModalTracking>
  );
};
