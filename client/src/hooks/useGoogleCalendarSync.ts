/**
 * Hook para sincronização com Google Calendar
 * Gerencia autenticação OAuth2, listagem de calendários e sincronização de eventos
 */

import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { fetchWithAuth } from '@/lib/api';

// ============================================
// TYPES
// ============================================

export interface GoogleCalendarConfig {
  userId?: number;
  calendarId: string;
  autoSync: boolean;
  syncInterval: number; // minutos
  lastSync?: string;
}

export interface CalendarInfo {
  id: string;
  name: string;
  description?: string;
  primary: boolean;
}

export interface SyncResult {
  imported: number;
  updated: number;
  skipped: number;
  errors?: string[];
}

export interface ConnectionStatus {
  connected: boolean;
  email?: string;
  lastSync?: string;
}

type ConnectionState = 'disconnected' | 'connecting' | 'connected';

// ============================================
// HOOK
// ============================================

export function useGoogleCalendarSync() {
  const queryClient = useQueryClient();

  const [connectionStatus, setConnectionStatus] = useState<ConnectionState>('disconnected');
  const [userEmail, setUserEmail] = useState<string | undefined>();
  const [config, setConfig] = useState<GoogleCalendarConfig>({
    calendarId: 'primary',
    autoSync: false,
    syncInterval: 60,
  });
  const [calendars, setCalendars] = useState<CalendarInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ============================================
  // LOAD STATUS & CONFIG
  // ============================================

  /**
   * Carrega status de conexão do backend
   */
  const loadStatus = useCallback(async () => {
    try {
      const response = await fetchWithAuth('/api/calendar/google/status');

      if (!response.ok) {
        throw new Error('Erro ao carregar status');
      }

      const data: ConnectionStatus = await response.json();

      setConnectionStatus(data.connected ? 'connected' : 'disconnected');
      setUserEmail(data.email);

      return data;
    } catch (err) {
      console.error('Erro ao carregar status:', err);
      setConnectionStatus('disconnected');
      return { connected: false };
    }
  }, []);

  /**
   * Carrega configuração salva do backend
   */
  const loadConfig = useCallback(async () => {
    try {
      const response = await fetchWithAuth('/api/calendar/google/config');

      if (!response.ok) {
        throw new Error('Erro ao carregar configuração');
      }

      const data = await response.json();

      if (data && data.calendarId) {
        setConfig(data);
      }
    } catch (err) {
      console.error('Erro ao carregar config:', err);
    }
  }, []);

  /**
   * Carrega status e config ao montar
   */
  useEffect(() => {
    loadStatus();
    loadConfig();
  }, [loadStatus, loadConfig]);

  // ============================================
  // OAUTH2 CONNECTION
  // ============================================

  /**
   * Inicia fluxo OAuth2 com Google
   */
  const connect = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // 1. Solicitar URL de autorização ao backend
      const response = await fetchWithAuth('/api/calendar/google/auth-url', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Erro ao gerar URL de autorização');
      }

      const { authUrl } = await response.json();

      // 2. Abrir popup OAuth
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        authUrl,
        'Google OAuth',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      if (!popup) {
        throw new Error('Popup bloqueado. Permita popups para este site.');
      }

      // 3. Aguardar callback (popup vai redirecionar para /settings com query params)
      setConnectionStatus('connecting');

      // Escutar mudança de URL (via polling)
      const checkInterval = setInterval(async () => {
        try {
          // Se popup foi fechado
          if (popup.closed) {
            clearInterval(checkInterval);
            setConnectionStatus('disconnected');

            // Verificar se foi bem-sucedido checando status
            const status = await loadStatus();
            if (status.connected) {
              setConnectionStatus('connected');
              setUserEmail(status.email);

              // Carregar calendários automaticamente
              await loadCalendars();
            }
            setIsLoading(false);
          }
        } catch (err) {
          console.error('Erro no polling:', err);
        }
      }, 500);
    } catch (err) {
      console.error('Erro ao conectar:', err);
      setError((err as Error).message);
      setIsLoading(false);
      setConnectionStatus('disconnected');
    }
  }, [loadStatus]);

  /**
   * Desconecta conta Google Calendar
   */
  const disconnect = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetchWithAuth('/api/calendar/google/disconnect', {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Erro ao desconectar');
      }

      setConnectionStatus('disconnected');
      setUserEmail(undefined);
      setCalendars([]);
      setConfig({
        calendarId: 'primary',
        autoSync: false,
        syncInterval: 60,
      });
    } catch (err) {
      console.error('Erro ao desconectar:', err);
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ============================================
  // CALENDAR OPERATIONS
  // ============================================

  /**
   * Lista calendários disponíveis do usuário
   */
  const loadCalendars = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetchWithAuth('/api/calendar/google/calendars');

      if (!response.ok) {
        throw new Error('Erro ao carregar calendários');
      }

      const data: CalendarInfo[] = await response.json();
      setCalendars(data);

      return data;
    } catch (err) {
      console.error('Erro ao carregar calendários:', err);
      setError((err as Error).message);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Sincroniza eventos do calendário selecionado
   */
  const syncNow = useCallback(
    async (calendarId?: string): Promise<SyncResult | null> => {
      try {
        setIsSyncing(true);
        setError(null);

        const targetCalendarId = calendarId || config.calendarId;

        if (!targetCalendarId) {
          throw new Error('Nenhum calendário selecionado');
        }

        const response = await fetchWithAuth('/api/calendar/google/sync', {
          method: 'POST',
          body: JSON.stringify({ calendarId: targetCalendarId }),
        });

        if (!response.ok) {
          throw new Error('Erro ao sincronizar eventos');
        }

        const result: SyncResult = await response.json();

        // Invalidar cache do React Query para atualizar eventos
        await queryClient.invalidateQueries({ queryKey: ['events'] });
        await queryClient.invalidateQueries({ queryKey: ['birthdays'] });

        // Atualizar lastSync
        await loadConfig();

        return result;
      } catch (err) {
        console.error('Erro ao sincronizar:', err);
        setError((err as Error).message);
        return null;
      } finally {
        setIsSyncing(false);
      }
    },
    [config.calendarId, queryClient, loadConfig]
  );

  /**
   * Salva configuração de sincronização
   */
  const saveConfig = useCallback(async (newConfig: Partial<GoogleCalendarConfig>) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetchWithAuth('/api/calendar/google/config', {
        method: 'POST',
        body: JSON.stringify(newConfig),
      });

      if (!response.ok) {
        throw new Error('Erro ao salvar configuração');
      }

      setConfig(prev => ({ ...prev, ...newConfig }));

      return true;
    } catch (err) {
      console.error('Erro ao salvar config:', err);
      setError((err as Error).message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ============================================
  // RETURN
  // ============================================

  return {
    // Estado
    connectionStatus,
    userEmail,
    config,
    calendars,
    isLoading,
    isSyncing,
    error,

    // Métodos
    connect,
    disconnect,
    loadStatus,
    loadConfig,
    loadCalendars,
    syncNow,
    saveConfig,
  };
}

export default useGoogleCalendarSync;
