import { useState, useEffect, useCallback } from 'react';

interface GoogleDriveConfig {
  spreadsheetUrl: string;
  autoSync: boolean;
  syncInterval: number;
  lastSync?: string;
}

interface SyncStatus {
  isEnabled: boolean;
  lastSync?: string;
  nextSync?: string;
  isRunning: boolean;
  error?: string;
}

export function useGoogleDriveSync() {
  const [config, setConfig] = useState<GoogleDriveConfig | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isEnabled: false,
    isRunning: false
  });

  // Carregar configuração
  const loadConfig = useCallback(async () => {
    try {
      const response = await fetch('/api/calendar/google-drive-config');
      if (response.ok) {
        const configData = await response.json();
        setConfig(configData);
        
        // Calcular próximo sync se autoSync estiver ativo
        if (configData.autoSync && configData.lastSync) {
          const lastSync = new Date(configData.lastSync);
          const nextSync = new Date(lastSync.getTime() + (configData.syncInterval * 60 * 1000));
          const now = new Date();
          
          setSyncStatus(prev => ({
            ...prev,
            isEnabled: true,
            lastSync: configData.lastSync,
            nextSync: nextSync.toISOString(),
            isRunning: nextSync <= now
          }));
        } else {
          setSyncStatus(prev => ({
            ...prev,
            isEnabled: configData.autoSync || false,
            lastSync: configData.lastSync,
            isRunning: false
          }));
        }
      }
    } catch (error) {
      console.error('Erro ao carregar configuração do Google Drive:', error);
      setSyncStatus(prev => ({
        ...prev,
        error: 'Erro ao carregar configuração'
      }));
    }
  }, []);

  // Executar sincronização
  const syncNow = useCallback(async () => {
    if (!config?.spreadsheetUrl) {
      setSyncStatus(prev => ({
        ...prev,
        error: 'URL da planilha não configurada'
      }));
      return false;
    }

    setSyncStatus(prev => ({ ...prev, isRunning: true, error: undefined }));

    try {
      console.log('🔄 Hook syncNow - URL configurada:', config.spreadsheetUrl);
      
      // Converter URL para CSV
      const convertToCsvUrl = (url: string): string => {
        let spreadsheetId = '';
        let gid = '0'; // gid padrão
        
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
        
        return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
      };

      const csvUrl = convertToCsvUrl(config.spreadsheetUrl);
      console.log('📊 Hook syncNow - CSV URL gerada:', csvUrl);
      
      const response = await fetch('/api/calendar/sync-google-drive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          csvUrl,
          spreadsheetUrl: config.spreadsheetUrl 
        }),
      });

      const result = await response.json();
      console.log('📊 Hook syncNow - Resposta da API:', result);

      if (result.success) {
        const now = new Date().toISOString();
        
        setSyncStatus(prev => ({
          ...prev,
          isRunning: false,
          lastSync: now,
          nextSync: config.autoSync ? new Date(Date.now() + (config.syncInterval * 60 * 1000)).toISOString() : undefined,
          error: undefined
        }));

        // Atualizar config com nova última sincronização
        setConfig(prev => prev ? { ...prev, lastSync: now } : null);

        // Disparar evento customizado
        window.dispatchEvent(new CustomEvent('google-drive-sync-success', { 
          detail: { 
            imported: result.importedCount,
            total: result.totalEvents,
            errors: result.errorCount || 0
          } 
        }));

        return true;
      } else {
        setSyncStatus(prev => ({
          ...prev,
          isRunning: false,
          error: result.error || 'Erro na sincronização'
        }));
        return false;
      }
    } catch (error) {
      setSyncStatus(prev => ({
        ...prev,
        isRunning: false,
        error: `Erro ao sincronizar: ${(error as Error).message}`
      }));
      return false;
    }
  }, [config]);

  // Verificar se precisa sincronizar automaticamente
  useEffect(() => {
    if (!config?.autoSync || !syncStatus.nextSync) return;

    const checkSync = () => {
      const now = new Date();
      const nextSync = new Date(syncStatus.nextSync!);
      
      if (nextSync <= now && !syncStatus.isRunning) {
        console.log('🔄 Executando sincronização automática com Google Drive...');
        syncNow();
      }
    };

    // Verificar imediatamente
    checkSync();

    // Verificar a cada minuto
    const interval = setInterval(checkSync, 60000);

    return () => clearInterval(interval);
  }, [config?.autoSync, syncStatus.nextSync, syncStatus.isRunning, syncNow]);

  // Carregar configuração na inicialização
  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Escutar mudanças na configuração
  useEffect(() => {
    const handleConfigChange = () => {
      loadConfig();
    };

    window.addEventListener('google-drive-config-changed', handleConfigChange);
    return () => window.removeEventListener('google-drive-config-changed', handleConfigChange);
  }, [loadConfig]);

  return {
    config,
    syncStatus,
    syncNow,
    loadConfig
  };
}
