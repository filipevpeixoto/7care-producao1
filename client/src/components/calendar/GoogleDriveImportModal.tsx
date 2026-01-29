import React, { useState, useEffect } from 'react';
import {
  DialogWithModalTracking,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RefreshCw, ExternalLink, Calendar, Settings, Clock } from 'lucide-react';
// import { useGoogleDriveSync } from '@/hooks/useGoogleDriveSync'; // Removido - usando implementação direta

interface GoogleDriveImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: () => void;
}

interface GoogleDriveConfig {
  spreadsheetUrl: string;
  autoSync: boolean;
  syncInterval: number; // em minutos
  realtimeSync: boolean; // sincronização em tempo real
  pollingInterval: number; // intervalo de verificação em segundos
  lastSync?: string;
  lastCheck?: string;
}

export function GoogleDriveImportModal({
  isOpen,
  onClose,
  onImportComplete,
}: GoogleDriveImportModalProps) {
  const [config, setConfig] = useState<GoogleDriveConfig>({
    spreadsheetUrl: '',
    autoSync: false,
    syncInterval: 60,
    realtimeSync: false,
    pollingInterval: 30, // 30 segundos
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [isPolling, setIsPolling] = useState(false);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [, setLastCheckResult] = useState<any>(null);

  // const { syncNow, loadConfig } = useGoogleDriveSync(); // Removido - usando implementação direta

  // Função para carregar configuração salva
  const loadConfig = async () => {
    try {
      const response = await fetch('/api/calendar/google-drive-config');
      if (response.ok) {
        const configData = await response.json();
        setConfig(prev => ({
          ...prev,
          ...configData,
        }));
      }
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
    }
  };

  // Função para verificar mudanças na planilha
  const checkForChanges = async () => {
    if (!config.spreadsheetUrl) return;

    try {
      console.log('🔍 [POLLING] Verificando mudanças...');

      const response = await fetch('/api/calendar/check-changes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          spreadsheetUrl: config.spreadsheetUrl,
          lastCheck: config.lastCheck,
        }),
      });

      const result = await response.json();
      setLastCheckResult(result);

      if (result.hasChanges) {
        console.log('🔄 [POLLING] Mudanças detectadas!', result.changeReason);
        setMessage(`🔄 Mudanças detectadas: ${result.changeReason}`);

        // Executar sincronização automática
        await handleSync();
      } else {
        console.log('✅ [POLLING] Nenhuma mudança detectada');
      }

      // Atualizar timestamp da última verificação
      setConfig(prev => ({
        ...prev,
        lastCheck: result.checkedAt,
      }));
    } catch (error) {
      console.error('❌ [POLLING] Erro ao verificar mudanças:', error);
      setMessage('❌ Erro ao verificar mudanças na planilha');
    }
  };

  // Iniciar polling inteligente
  const startPolling = () => {
    if (isPolling) return;

    setIsPolling(true);
    setMessage(`🔍 Monitorando mudanças a cada ${config.pollingInterval}s...`);

    // Verificação imediata
    checkForChanges();

    // Configurar intervalo
    const interval = setInterval(() => {
      checkForChanges();
    }, config.pollingInterval * 1000);

    setPollingInterval(interval);
    console.log('🚀 [POLLING] Iniciado com intervalo de', config.pollingInterval, 'segundos');
  };

  // Parar polling
  const stopPolling = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
    setIsPolling(false);
    setMessage('⏹️ Monitoramento parado');
    console.log('⏹️ [POLLING] Parado');
  };

  // Carregar configuração salva
  useEffect(() => {
    if (isOpen) {
      loadConfig();
    }
  }, [isOpen]);

  // Cleanup do polling quando o modal fechar
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  const validateGoogleDriveUrl = (url: string): boolean => {
    const patterns = [
      /^https:\/\/docs\.google\.com\/spreadsheets\/d\/[a-zA-Z0-9-_]+\/edit.*$/,
      /^https:\/\/docs\.google\.com\/spreadsheets\/d\/[a-zA-Z0-9-_]+.*$/,
      /^https:\/\/drive\.google\.com\/file\/d\/[a-zA-Z0-9-_]+\/.*$/,
    ];

    return patterns.some(pattern => pattern.test(url));
  };

  const convertToCsvUrl = (url: string): string => {
    // Extrair ID da planilha
    let spreadsheetId = '';
    let gid = '0'; // gid padrão

    // Padrão 1: docs.google.com/spreadsheets/d/ID/edit
    const match1 = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match1) {
      spreadsheetId = match1[1];
    }

    // Padrão 2: drive.google.com/file/d/ID/
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

    // Converter para URL de exportação CSV preservando o gid
    return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
  };

  const handleSaveConfig = async () => {
    if (!config.spreadsheetUrl.trim()) {
      setMessage('❌ Por favor, insira a URL da planilha do Google Drive');
      return;
    }

    if (!validateGoogleDriveUrl(config.spreadsheetUrl)) {
      setMessage('❌ URL inválida. Use uma URL do Google Sheets ou Google Drive');
      return;
    }

    setIsSaving(true);
    setMessage('Salvando configuração...');

    try {
      const response = await fetch('/api/calendar/google-drive-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      const result = await response.json();

      if (result.success) {
        setMessage('✅ Configuração salva com sucesso!');
        setTimeout(() => {
          setMessage('');
        }, 3000);
      } else {
        setMessage(`❌ Erro ao salvar: ${result.error}`);
      }
    } catch (error) {
      setMessage(`❌ Erro ao salvar configuração: ${(error as Error).message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSync = async () => {
    console.log('🚀 INÍCIO DA SINCRONIZAÇÃO');
    console.log('📋 Config atual:', config);

    if (!config.spreadsheetUrl || !config.spreadsheetUrl.trim()) {
      console.error('❌ URL não configurada');
      setMessage('❌ Por favor, configure a URL da planilha primeiro');
      return;
    }

    console.log('✅ URL válida, iniciando sincronização...');
    setIsLoading(true);
    setSyncStatus('syncing');
    setMessage('Sincronizando com Google Drive...');

    try {
      const url = config.spreadsheetUrl.trim();
      console.log('🔄 URL sendo processada:', url);

      // Extrair ID da planilha
      let spreadsheetId = '';
      let gid = '0';

      // Tentar extrair ID da planilha
      const match1 = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (match1) {
        spreadsheetId = match1[1];
        console.log('✅ ID da planilha extraído:', spreadsheetId);
      }

      // Extrair gid se presente
      const gidMatch = url.match(/[?&]gid=(\d+)/);
      if (gidMatch) {
        gid = gidMatch[1];
        console.log('✅ GID extraído:', gid);
      }

      if (!spreadsheetId) {
        throw new Error('Não foi possível extrair o ID da planilha da URL fornecida');
      }

      const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
      console.log('📊 CSV URL final:', csvUrl);

      // Fazer a chamada para a API
      console.log('🌐 Fazendo chamada para API...');
      const response = await fetch('/api/calendar/sync-google-drive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          csvUrl,
          spreadsheetUrl: url,
        }),
      });

      console.log('📡 Status da resposta:', response.status);
      console.log('📡 Headers da resposta:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('📊 Resultado da API:', result);

      if (result && result.success) {
        console.log('✅ Sincronização bem-sucedida!');
        setSyncStatus('success');
        setMessage(
          `✅ Sincronização concluída! ${result.importedCount || 0} eventos importados com sucesso`
        );

        // Disparar evento customizado
        window.dispatchEvent(
          new CustomEvent('calendar-sync-success', {
            detail: {
              source: 'google-drive',
              imported: result.importedCount || 0,
              total: result.totalEvents || 0,
            },
          })
        );

        setTimeout(() => {
          onImportComplete?.();
        }, 2000);
      } else {
        console.error('❌ API retornou erro:', result);
        setSyncStatus('error');
        setMessage(
          `❌ Erro na sincronização: ${result?.error || result?.message || 'Erro desconhecido'}`
        );
      }
    } catch (error) {
      console.error('💥 ERRO CRÍTICO na sincronização:', error);
      setSyncStatus('error');
      setMessage(`❌ Erro ao sincronizar: ${(error as Error).message}`);
    } finally {
      console.log('🏁 Finalizando sincronização...');
      setIsLoading(false);
    }
  };

  const handleTestConnection = async () => {
    if (!config.spreadsheetUrl.trim()) {
      setMessage('❌ Por favor, insira a URL da planilha primeiro');
      return;
    }

    setIsLoading(true);
    setMessage('Testando conexão...');

    try {
      const csvUrl = convertToCsvUrl(config.spreadsheetUrl);

      const response = await fetch('/api/calendar/test-google-drive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ csvUrl }),
      });

      const result = await response.json();

      if (result.success) {
        setMessage(
          `✅ Conexão testada com sucesso! Encontrados ${result.rowCount} registros na planilha`
        );
      } else {
        setMessage(`❌ Erro no teste: ${result.error}`);
      }
    } catch (error) {
      setMessage(`❌ Erro ao testar conexão: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DialogWithModalTracking
      modalId="google-drive-import-modal"
      open={isOpen}
      onOpenChange={onClose}
    >
      <DialogContent className="sm:max-w-lg w-[90vw]" style={{ maxHeight: 'calc(100vh - 2rem)' }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Google Drive
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* URL da Planilha */}
          <div className="space-y-2">
            <Label htmlFor="spreadsheetUrl">URL da Planilha</Label>
            <Input
              id="spreadsheetUrl"
              type="url"
              placeholder="https://docs.google.com/spreadsheets/d/..."
              value={config.spreadsheetUrl}
              onChange={e => setConfig(prev => ({ ...prev, spreadsheetUrl: e.target.value }))}
              disabled={isLoading || isSaving}
              className="text-sm"
            />
          </div>

          {/* Sincronização Automática */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="autoSync" className="text-sm">
                Sincronização Automática
              </Label>
              {config.autoSync && (
                <Input
                  type="number"
                  min="5"
                  max="1440"
                  value={config.syncInterval}
                  onChange={e =>
                    setConfig(prev => ({ ...prev, syncInterval: parseInt(e.target.value) || 60 }))
                  }
                  disabled={isLoading || isSaving}
                  className="mt-1 w-20 text-sm"
                  placeholder="60"
                />
              )}
            </div>
            <Switch
              id="autoSync"
              checked={config.autoSync}
              onCheckedChange={checked => setConfig(prev => ({ ...prev, autoSync: checked }))}
              disabled={isLoading || isSaving}
            />
          </div>

          {/* Sincronização em Tempo Real */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="realtimeSync" className="text-sm">
                Tempo Real (Polling)
              </Label>
              {config.realtimeSync && (
                <Input
                  type="number"
                  min="10"
                  max="300"
                  value={config.pollingInterval}
                  onChange={e =>
                    setConfig(prev => ({
                      ...prev,
                      pollingInterval: parseInt(e.target.value) || 30,
                    }))
                  }
                  disabled={isLoading || isSaving}
                  className="mt-1 w-20 text-sm"
                  placeholder="30"
                />
              )}
            </div>
            <Switch
              id="realtimeSync"
              checked={config.realtimeSync}
              onCheckedChange={checked => {
                setConfig(prev => ({ ...prev, realtimeSync: checked }));
                if (!checked && isPolling) {
                  stopPolling();
                }
              }}
              disabled={isLoading || isSaving}
            />
          </div>

          {/* Controles de Polling */}
          {config.realtimeSync && (
            <div className="flex gap-2">
              {!isPolling ? (
                <Button
                  onClick={startPolling}
                  disabled={isLoading || isSaving || !config.spreadsheetUrl}
                  size="sm"
                  variant="outline"
                  className="flex-1"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Iniciar Monitoramento
                </Button>
              ) : (
                <Button
                  onClick={stopPolling}
                  disabled={isLoading || isSaving}
                  size="sm"
                  variant="destructive"
                  className="flex-1"
                >
                  <Clock className="h-3 w-3 mr-1" />
                  Parar Monitoramento
                </Button>
              )}
            </div>
          )}

          {/* Status da Sincronização */}
          {message && (
            <div
              className={`p-2 rounded text-xs ${
                message.includes('✅')
                  ? 'bg-green-100 text-green-800'
                  : message.includes('❌')
                    ? 'bg-red-100 text-red-800'
                    : 'bg-blue-100 text-blue-800'
              }`}
            >
              {message}
            </div>
          )}

          {/* Instruções Compactas */}
          <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
            <p>
              <strong>Formato:</strong> Coluna A: Título | B: Data Início | C: Data Fim | D:
              Categoria | E: Descrição
            </p>
            <p>
              <strong>Compartilhe:</strong> "Qualquer pessoa com o link pode ver"
            </p>
          </div>

          {/* Botões de Ação */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestConnection}
              disabled={!config.spreadsheetUrl.trim() || isLoading || isSaving}
              className="flex items-center gap-1 text-xs"
            >
              <ExternalLink className="h-3 w-3" />
              Testar
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveConfig}
              disabled={!config.spreadsheetUrl.trim() || isLoading || isSaving}
              className="flex items-center gap-1 text-xs"
            >
              <Settings className="h-3 w-3" />
              Salvar
            </Button>

            <div className="flex-1" />

            <Button variant="outline" size="sm" onClick={onClose} disabled={isLoading || isSaving}>
              Fechar
            </Button>

            <Button
              size="sm"
              onClick={handleSync}
              disabled={!config.spreadsheetUrl.trim() || isLoading || isSaving}
              className="flex items-center gap-1"
            >
              <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Sincronizando...' : 'Sincronizar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </DialogWithModalTracking>
  );
}
