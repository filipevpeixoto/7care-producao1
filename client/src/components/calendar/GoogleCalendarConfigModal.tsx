/**
 * Modal de Configuração do Google Calendar
 * Permite conectar/desconectar conta Google, selecionar calendário e configurar sincronização
 */

import React, { useState, useEffect } from 'react';
import {
  DialogWithModalTracking,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Calendar, LogIn, LogOut, Check, X, Settings, Clock } from 'lucide-react';
import { useGoogleCalendarSync } from '@/hooks/useGoogleCalendarSync';
import { toast } from 'sonner';

interface GoogleCalendarConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncComplete?: () => void;
}

export function GoogleCalendarConfigModal({
  isOpen,
  onClose,
  onSyncComplete,
}: GoogleCalendarConfigModalProps) {
  const {
    connectionStatus,
    userEmail,
    config,
    calendars,
    isLoading,
    isSyncing,
    error,
    connect,
    disconnect,
    loadCalendars,
    syncNow,
    saveConfig,
  } = useGoogleCalendarSync();

  const [localConfig, setLocalConfig] = useState(config);

  // Atualizar config local quando o config do hook mudar
  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  // Carregar calendários quando conectar
  useEffect(() => {
    if (connectionStatus === 'connected' && calendars.length === 0) {
      loadCalendars();
    }
  }, [connectionStatus, calendars.length, loadCalendars]);

  // Mostrar erro via toast
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  /**
   * Handler para conectar
   */
  const handleConnect = async () => {
    try {
      await connect();
    } catch {
      toast.error('Erro ao conectar com Google Calendar');
    }
  };

  /**
   * Handler para desconectar
   */
  const handleDisconnect = async () => {
    if (confirm('Tem certeza que deseja desconectar do Google Calendar?')) {
      try {
        await disconnect();
        toast.success('Desconectado com sucesso');
      } catch {
        toast.error('Erro ao desconectar');
      }
    }
  };

  /**
   * Handler para sincronizar
   */
  const handleSync = async () => {
    try {
      const result = await syncNow();

      if (result) {
        const message = `Sincronização concluída: ${result.imported} importados, ${result.updated} atualizados, ${result.skipped} ignorados`;
        toast.success(message);

        if (result.errors && result.errors.length > 0) {
          toast.warning(`${result.errors.length} erros encontrados`);
        }

        if (onSyncComplete) {
          onSyncComplete();
        }
      }
    } catch {
      toast.error('Erro ao sincronizar eventos');
    }
  };

  /**
   * Handler para salvar configuração
   */
  const handleSaveConfig = async () => {
    try {
      const success = await saveConfig(localConfig);

      if (success) {
        toast.success('Configuração salva com sucesso');
      }
    } catch {
      toast.error('Erro ao salvar configuração');
    }
  };

  return (
    <DialogWithModalTracking
      modalId="google-calendar-config"
      open={isOpen}
      onOpenChange={(open: boolean) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Google Calendar
          </DialogTitle>
          <DialogDescription>
            Conecte sua conta Google para sincronizar eventos automaticamente
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* STATUS DE CONEXÃO */}
          <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
            <div className="flex items-center gap-3">
              {connectionStatus === 'connected' ? (
                <>
                  <Badge variant="default" className="bg-green-500">
                    <Check className="h-3 w-3 mr-1" />
                    Conectado
                  </Badge>
                  {userEmail && <span className="text-sm text-muted-foreground">{userEmail}</span>}
                </>
              ) : connectionStatus === 'connecting' ? (
                <Badge variant="secondary">
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                  Conectando...
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <X className="h-3 w-3 mr-1" />
                  Desconectado
                </Badge>
              )}
            </div>

            {connectionStatus === 'connected' ? (
              <Button variant="ghost" size="sm" onClick={handleDisconnect} disabled={isLoading}>
                <LogOut className="h-4 w-4 mr-2" />
                Desconectar
              </Button>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={handleConnect}
                disabled={isLoading || connectionStatus === 'connecting'}
              >
                <LogIn className="h-4 w-4 mr-2" />
                {connectionStatus === 'connecting' ? 'Conectando...' : 'Conectar'}
              </Button>
            )}
          </div>

          {/* SELEÇÃO DE CALENDÁRIO */}
          {connectionStatus === 'connected' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="calendar-select">
                  <Calendar className="h-4 w-4 inline mr-2" />
                  Calendário
                </Label>
                <Select
                  value={localConfig.calendarId}
                  onValueChange={(value) =>
                    setLocalConfig((prev) => ({ ...prev, calendarId: value }))
                  }
                  disabled={isLoading || calendars.length === 0}
                >
                  <SelectTrigger id="calendar-select">
                    <SelectValue placeholder="Selecione um calendário" />
                  </SelectTrigger>
                  <SelectContent>
                    {calendars.map((cal) => (
                      <SelectItem key={cal.id} value={cal.id}>
                        {cal.name} {cal.primary && '(Principal)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {calendars.length === 0 && !isLoading && (
                  <p className="text-sm text-muted-foreground">Nenhum calendário encontrado</p>
                )}
              </div>

              {/* CONFIGURAÇÕES DE SINCRONIZAÇÃO */}
              <div className="space-y-4 p-4 rounded-lg border bg-muted/50">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="auto-sync">
                      <Settings className="h-4 w-4 inline mr-2" />
                      Sincronização Automática
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Sincronizar eventos periodicamente
                    </p>
                  </div>
                  <Switch
                    id="auto-sync"
                    checked={localConfig.autoSync}
                    onCheckedChange={(checked) =>
                      setLocalConfig((prev) => ({ ...prev, autoSync: checked }))
                    }
                  />
                </div>

                {localConfig.autoSync && (
                  <div className="space-y-2">
                    <Label htmlFor="sync-interval">
                      <Clock className="h-4 w-4 inline mr-2" />
                      Intervalo (minutos)
                    </Label>
                    <Input
                      id="sync-interval"
                      type="number"
                      min={5}
                      max={1440}
                      value={localConfig.syncInterval}
                      onChange={(e) =>
                        setLocalConfig((prev) => ({
                          ...prev,
                          syncInterval: parseInt(e.target.value, 10) || 60,
                        }))
                      }
                      className="max-w-[150px]"
                    />
                    <p className="text-xs text-muted-foreground">Recomendado: 60 minutos</p>
                  </div>
                )}
              </div>

              {/* ÚLTIMA SINCRONIZAÇÃO */}
              {config.lastSync && (
                <div className="text-sm text-muted-foreground">
                  Última sincronização: {new Date(config.lastSync).toLocaleString('pt-BR')}
                </div>
              )}
            </>
          )}
        </div>

        {/* BOTÕES DE AÇÃO */}
        <div className="flex justify-between gap-2">
          <div className="flex gap-2">
            {connectionStatus === 'connected' && (
              <Button
                variant="outline"
                onClick={handleSync}
                disabled={isSyncing || !localConfig.calendarId}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Sincronizando...' : 'Sincronizar Agora'}
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Fechar
            </Button>
            {connectionStatus === 'connected' && (
              <Button onClick={handleSaveConfig} disabled={isLoading}>
                Salvar Configurações
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </DialogWithModalTracking>
  );
}

export default GoogleCalendarConfigModal;
