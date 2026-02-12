import { useState, useEffect, useCallback } from 'react';
import { useGoogleDriveSync } from './useGoogleDriveSync';
import { fetchWithAuth } from '@/lib/api';

interface TasksSyncStatus {
  isEnabled: boolean;
  lastSync?: string;
  nextSync?: string;
  isRunning: boolean;
  error?: string;
}

export function useTasksGoogleDriveSync() {
  // Reutilizar o hook existente do calendário
  const { config, syncStatus } = useGoogleDriveSync();

  const [tasksSyncStatus, setTasksSyncStatus] = useState<TasksSyncStatus>({
    isEnabled: false,
    isRunning: false,
  });

  // Converter URL da planilha para CSV da aba "tarefas"
  const convertToTasksCsvUrl = useCallback((url: string): string => {
    let spreadsheetId = '';
    let gid = '0'; // gid padrão para a primeira aba

    const match1 = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match1) {
      spreadsheetId = match1[1];
    }

    const match2 = url.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
    if (match2) {
      spreadsheetId = match2[1];
    }

    // Extrair gid específico se presente
    const gidMatch = url.match(/[?&]gid=(\d+)/);
    if (gidMatch) {
      gid = gidMatch[1];
    }

    if (!spreadsheetId) {
      throw new Error('Não foi possível extrair o ID da planilha da URL fornecida');
    }

    // Para tarefas, vamos usar a aba "tarefas" (gid específico ou 0)
    // Se não tiver gid específico, assumir que é a aba "tarefas"
    return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
  }, []);

  // Sincronizar tarefas usando a mesma configuração do calendário
  const syncTasksNow = useCallback(async () => {
    if (!config?.spreadsheetUrl) {
      setTasksSyncStatus(prev => ({
        ...prev,
        error: 'URL da planilha não configurada',
      }));
      return false;
    }

    setTasksSyncStatus(prev => ({ ...prev, isRunning: true, error: undefined }));

    try {
      console.log('🔄 Hook syncTasksNow - URL configurada:', config.spreadsheetUrl);

      // Converter URL para CSV da aba "tarefas"
      const csvUrl = convertToTasksCsvUrl(config.spreadsheetUrl);
      console.log('📊 Hook syncTasksNow - CSV URL gerada:', csvUrl);

      const response = await fetchWithAuth('/api/tasks/sync-google-drive', {
        method: 'POST',
        body: JSON.stringify({
          csvUrl,
          spreadsheetUrl: config.spreadsheetUrl,
        }),
      });

      const result = await response.json();
      console.log('📊 Hook syncTasksNow - Resposta da API:', result);

      if (result.success) {
        const now = new Date().toISOString();

        setTasksSyncStatus(prev => ({
          ...prev,
          isRunning: false,
          lastSync: now,
          error: undefined,
        }));

        // Disparar evento customizado
        window.dispatchEvent(
          new CustomEvent('tasks-google-drive-sync-success', {
            detail: {
              imported: result.importedTasks,
              total: result.totalTasks,
              errors: result.errorCount || 0,
            },
          })
        );

        return true;
      } else {
        setTasksSyncStatus(prev => ({
          ...prev,
          isRunning: false,
          error: result.error || 'Erro na sincronização',
        }));
        return false;
      }
    } catch (error) {
      setTasksSyncStatus(prev => ({
        ...prev,
        isRunning: false,
        error: `Erro ao sincronizar: ${(error as Error).message}`,
      }));
      return false;
    }
  }, [config, convertToTasksCsvUrl]);

  // Adicionar tarefas à planilha usando a mesma configuração
  const addTasksToSheet = useCallback(
    async (tasks: any[]) => {
      if (!config?.spreadsheetUrl) {
        setTasksSyncStatus(prev => ({
          ...prev,
          error: 'URL da planilha não configurada',
        }));
        return false;
      }

      try {
        const response = await fetchWithAuth('/api/tasks/add-to-google-drive', {
          method: 'POST',
          body: JSON.stringify({ tasks }),
        });

        const result = await response.json();

        if (result.success) {
          // Disparar evento customizado
          window.dispatchEvent(
            new CustomEvent('tasks-added-to-sheet', {
              detail: {
                added: result.addedCount,
                total: result.totalTasks,
              },
            })
          );

          return true;
        } else {
          setTasksSyncStatus(prev => ({
            ...prev,
            error: result.message || 'Erro ao adicionar tarefas à planilha',
          }));
          return false;
        }
      } catch (error) {
        setTasksSyncStatus(prev => ({
          ...prev,
          error: `Erro ao adicionar tarefas: ${(error as Error).message}`,
        }));
        return false;
      }
    },
    [config]
  );

  // Configurar sincronização automática (reutilizar configuração do calendário)
  const configureSync = useCallback(async (_autoSync: boolean, _syncInterval: number) => {
    // Usar a mesma configuração do calendário
    return true; // A configuração já existe no calendário
  }, []);

  // Atualizar status baseado na configuração do calendário
  useEffect(() => {
    setTasksSyncStatus(prev => ({
      ...prev,
      isEnabled: !!config?.spreadsheetUrl,
      lastSync: config?.lastSync,
      isRunning: syncStatus.isRunning,
    }));
  }, [config, syncStatus]);

  return {
    config,
    syncStatus: tasksSyncStatus,
    syncTasksNow,
    addTasksToSheet,
    configureSync,
    loadConfig: () => {}, // Reutilizar do calendário
  };
}
