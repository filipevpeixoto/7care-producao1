/**
 * Componente de Configurações por Distrito
 * Permite que pastores configurem settings específicos do seu distrito
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Building2,
  Save,
  RefreshCw,
  Bell,
  Users,
  Calendar,
  Star,
  Shield,
  Info,
  CheckCircle,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { fetchWithAuth } from '@/lib/api';

interface DistrictSettingsData {
  // Notificações
  notifications_enabled: boolean;
  meeting_reminders: boolean;
  prayer_alerts: boolean;
  weekly_report: boolean;

  // Gamificação
  gamification_enabled: boolean;
  points_multiplier: number;
  show_leaderboard: boolean;

  // Membros
  allow_self_registration: boolean;
  require_approval: boolean;
  default_member_role: string;

  // Calendário
  show_all_events: boolean;
  allow_member_events: boolean;

  // Privacidade
  show_member_contacts: boolean;
  show_attendance_reports: boolean;
}

const defaultSettings: DistrictSettingsData = {
  notifications_enabled: true,
  meeting_reminders: true,
  prayer_alerts: true,
  weekly_report: false,
  gamification_enabled: true,
  points_multiplier: 1,
  show_leaderboard: true,
  allow_self_registration: false,
  require_approval: true,
  default_member_role: 'member',
  show_all_events: true,
  allow_member_events: false,
  show_member_contacts: false,
  show_attendance_reports: true,
};

export function DistrictSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<DistrictSettingsData>(defaultSettings);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [districtId, setDistrictId] = useState<number | null>(null);
  const [districtName, setDistrictName] = useState<string>('');
  const [hasChanges, setHasChanges] = useState(false);

  // Carregar configurações do distrito
  useEffect(() => {
    loadDistrictSettings();
  }, []);

  const loadDistrictSettings = async () => {
    setIsLoading(true);
    try {
      const response = await fetchWithAuth('/api/settings/my-district');
      const data = await response.json();

      if (data.districtId) {
        setDistrictId(data.districtId);

        // Mesclar configurações salvas com defaults
        const loadedSettings = { ...defaultSettings };
        if (data.settings) {
          Object.keys(data.settings).forEach(key => {
            if (key in loadedSettings) {
              (loadedSettings as Record<string, unknown>)[key] = data.settings[key];
            }
          });
        }
        setSettings(loadedSettings);

        // Buscar nome do distrito
        try {
          const districtResponse = await fetchWithAuth(`/api/districts/${data.districtId}`);
          const districtData = await districtResponse.json();
          setDistrictName(districtData.name || `Distrito ${data.districtId}`);
        } catch {
          setDistrictName(`Distrito ${data.districtId}`);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as configurações do distrito',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!districtId) {
      toast({
        title: 'Erro',
        description: 'Você não está associado a um distrito',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetchWithAuth('/api/settings/my-district', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Sucesso',
          description: 'Configurações do distrito salvas com sucesso',
        });
        setHasChanges(false);
      } else {
        throw new Error(data.error || 'Erro ao salvar');
      }
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar as configurações',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(defaultSettings);
    setHasChanges(true);
  };

  const updateSetting = <K extends keyof DistrictSettingsData>(
    key: K,
    value: DistrictSettingsData[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  // Se não é pastor ou superadmin, mostrar mensagem
  if (user?.role !== 'pastor' && user?.role !== 'superadmin') {
    return (
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          Apenas pastores podem gerenciar as configurações do distrito.
        </AlertDescription>
      </Alert>
    );
  }

  // Se não tem distrito
  if (!isLoading && !districtId) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Você não está associado a um distrito. Entre em contato com o administrador.
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Carregando configurações...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building2 className="h-6 w-6 text-primary" />
          <div>
            <h3 className="text-lg font-semibold">Configurações do Distrito</h3>
            <p className="text-sm text-muted-foreground">{districtName}</p>
          </div>
        </div>
        {hasChanges && (
          <Badge variant="secondary" className="animate-pulse">
            Alterações não salvas
          </Badge>
        )}
      </div>

      <Tabs defaultValue="notifications" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="notifications" className="text-xs sm:text-sm">
            <Bell className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Notificações</span>
          </TabsTrigger>
          <TabsTrigger value="gamification" className="text-xs sm:text-sm">
            <Star className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Gamificação</span>
          </TabsTrigger>
          <TabsTrigger value="members" className="text-xs sm:text-sm">
            <Users className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Membros</span>
          </TabsTrigger>
          <TabsTrigger value="calendar" className="text-xs sm:text-sm">
            <Calendar className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Calendário</span>
          </TabsTrigger>
        </TabsList>

        {/* Notificações */}
        <TabsContent value="notifications" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Preferências de Notificação</CardTitle>
              <CardDescription>
                Configure como os membros do distrito recebem notificações
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notificações Habilitadas</Label>
                  <p className="text-sm text-muted-foreground">
                    Ativar sistema de notificações para o distrito
                  </p>
                </div>
                <Switch
                  checked={settings.notifications_enabled}
                  onCheckedChange={v => updateSetting('notifications_enabled', v)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Lembretes de Reunião</Label>
                  <p className="text-sm text-muted-foreground">
                    Enviar lembretes antes das reuniões
                  </p>
                </div>
                <Switch
                  checked={settings.meeting_reminders}
                  onCheckedChange={v => updateSetting('meeting_reminders', v)}
                  disabled={!settings.notifications_enabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Alertas de Oração</Label>
                  <p className="text-sm text-muted-foreground">
                    Notificar sobre novos pedidos de oração
                  </p>
                </div>
                <Switch
                  checked={settings.prayer_alerts}
                  onCheckedChange={v => updateSetting('prayer_alerts', v)}
                  disabled={!settings.notifications_enabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Relatório Semanal</Label>
                  <p className="text-sm text-muted-foreground">
                    Enviar resumo semanal de atividades
                  </p>
                </div>
                <Switch
                  checked={settings.weekly_report}
                  onCheckedChange={v => updateSetting('weekly_report', v)}
                  disabled={!settings.notifications_enabled}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Gamificação */}
        <TabsContent value="gamification" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sistema de Pontos</CardTitle>
              <CardDescription>
                Configure a gamificação para engajamento dos membros
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Gamificação Habilitada</Label>
                  <p className="text-sm text-muted-foreground">
                    Ativar sistema de pontos e conquistas
                  </p>
                </div>
                <Switch
                  checked={settings.gamification_enabled}
                  onCheckedChange={v => updateSetting('gamification_enabled', v)}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Multiplicador de Pontos</Label>
                <p className="text-sm text-muted-foreground">
                  Fator de multiplicação para pontos ganhos (1 = normal, 2 = dobro)
                </p>
                <Input
                  type="number"
                  min={0.5}
                  max={5}
                  step={0.5}
                  value={settings.points_multiplier}
                  onChange={e =>
                    updateSetting('points_multiplier', parseFloat(e.target.value) || 1)
                  }
                  disabled={!settings.gamification_enabled}
                  className="w-32"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Mostrar Ranking</Label>
                  <p className="text-sm text-muted-foreground">
                    Exibir placar de líderes para os membros
                  </p>
                </div>
                <Switch
                  checked={settings.show_leaderboard}
                  onCheckedChange={v => updateSetting('show_leaderboard', v)}
                  disabled={!settings.gamification_enabled}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Membros */}
        <TabsContent value="members" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Gestão de Membros</CardTitle>
              <CardDescription>Configure como novos membros entram no distrito</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-Registro</Label>
                  <p className="text-sm text-muted-foreground">
                    Permitir que pessoas se cadastrem sozinhas
                  </p>
                </div>
                <Switch
                  checked={settings.allow_self_registration}
                  onCheckedChange={v => updateSetting('allow_self_registration', v)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Requer Aprovação</Label>
                  <p className="text-sm text-muted-foreground">
                    Novos cadastros precisam de aprovação do pastor
                  </p>
                </div>
                <Switch
                  checked={settings.require_approval}
                  onCheckedChange={v => updateSetting('require_approval', v)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Mostrar Contatos</Label>
                  <p className="text-sm text-muted-foreground">
                    Membros podem ver contatos uns dos outros
                  </p>
                </div>
                <Switch
                  checked={settings.show_member_contacts}
                  onCheckedChange={v => updateSetting('show_member_contacts', v)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Relatórios de Presença</Label>
                  <p className="text-sm text-muted-foreground">
                    Membros podem ver seus relatórios de presença
                  </p>
                </div>
                <Switch
                  checked={settings.show_attendance_reports}
                  onCheckedChange={v => updateSetting('show_attendance_reports', v)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Calendário */}
        <TabsContent value="calendar" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Configurações de Eventos</CardTitle>
              <CardDescription>Configure a visibilidade e permissões do calendário</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Mostrar Todos os Eventos</Label>
                  <p className="text-sm text-muted-foreground">
                    Membros veem eventos de todas as igrejas do distrito
                  </p>
                </div>
                <Switch
                  checked={settings.show_all_events}
                  onCheckedChange={v => updateSetting('show_all_events', v)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Membros Criam Eventos</Label>
                  <p className="text-sm text-muted-foreground">
                    Permitir que membros criem eventos (requer aprovação)
                  </p>
                </div>
                <Switch
                  checked={settings.allow_member_events}
                  onCheckedChange={v => updateSetting('allow_member_events', v)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Botões de Ação */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button onClick={handleSave} disabled={isSaving || !hasChanges} className="flex-1">
          {isSaving ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Salvar Configurações
        </Button>

        <Button variant="outline" onClick={handleReset} className="flex-1">
          <RefreshCw className="h-4 w-4 mr-2" />
          Restaurar Padrão
        </Button>
      </div>

      {/* Indicador de Sucesso */}
      {!hasChanges && (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <CheckCircle className="h-4 w-4" />
          Todas as alterações estão salvas
        </div>
      )}
    </div>
  );
}
