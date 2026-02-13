/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { settingsLogger } from '@/lib/logger';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Database, Download, Upload, Trash2, Loader2, AlertTriangle, Building2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { fetchWithAuth } from '@/lib/api';
import { useLastImportDate } from '@/hooks/useLastImportDate';
import { useQueryClient } from '@tanstack/react-query';
import { ImportUsersModal } from '@/components/settings/ImportUsersModal';

interface DataManagementTabProps {
  user: any;
  userDistrictId: number | null;
  userDistrictName: string;
}

export function DataManagementTab({ user, userDistrictId, userDistrictName }: DataManagementTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { lastImportDate, updateLastImportDate } = useLastImportDate();

  const [showImportModal, setShowImportModal] = useState(false);
  const [showClearDataDialog, setShowClearDataDialog] = useState(false);
  const [clearDataCallback, setClearDataCallback] = useState<((value: boolean) => void) | null>(null);
  const [isClearingDistrict, setIsClearingDistrict] = useState(false);
  const [_isLoading, setIsLoading] = useState(false);

  const getFormattedLastImportDate = () => {
    if (!lastImportDate) return 'Nenhuma importação realizada';
    const date = new Date(lastImportDate);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDaysSinceLastImport = () => {
    if (!lastImportDate) return 0;
    const now = new Date();
    const last = new Date(lastImportDate);
    const diffTime = Math.abs(now.getTime() - last.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const handleClearDistrictData = async () => {
    if (!userDistrictId) return;
    setIsClearingDistrict(true);
    try {
      const response = await fetchWithAuth(`/api/districts/${userDistrictId}/data`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao limpar dados');

      queryClient.clear();

      toast({
        title: 'Dados limpos',
        description: data.message || 'Dados do distrito removidos com sucesso.',
      });
    } catch (error) {
      toast({
        title: 'Erro ao limpar dados',
        description: (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setIsClearingDistrict(false);
    }
  };

  const handleClearAllData = async () => {
    const confirmed = await new Promise<boolean>((resolve) => {
      setShowClearDataDialog(true);
      setClearDataCallback(() => resolve);
    });

    if (!confirmed) {
      toast({
        title: 'Operação cancelada',
        description: 'A limpeza dos dados foi cancelada.',
      });
      return;
    }

    try {
      setIsLoading(true);

      settingsLogger.debug('Iniciando limpeza completa do sistema...');

      // 1. Limpar banco de dados no servidor
      settingsLogger.debug('Limpando banco de dados...');
      const response = await fetch('/api/system/clear-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Falha ao limpar dados do servidor');
      }

      settingsLogger.debug('Banco de dados limpo');

      // 2. Limpar React Query Cache
      settingsLogger.debug('Limpando React Query cache...');
      queryClient.clear();
      settingsLogger.debug('React Query cache limpo');

      // 3. Limpar IndexedDB
      settingsLogger.debug('Limpando IndexedDB...');
      try {
        const databases = await indexedDB.databases();
        for (const db of databases) {
          if (db.name) {
            settingsLogger.debug(`  Deletando database: ${db.name}`);
            indexedDB.deleteDatabase(db.name);
          }
        }
        settingsLogger.debug('IndexedDB limpo');
      } catch (error) {
        settingsLogger.warn('Erro ao limpar IndexedDB:', error);
      }

      // 4. Limpar localStorage (exceto configurações essenciais)
      settingsLogger.debug('Limpando localStorage...');
      const keysToKeep = ['theme', 'language'];
      const keysToRemove: string[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && !keysToKeep.includes(key)) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach((key) => {
        settingsLogger.debug(`  Removendo: ${key}`);
        localStorage.removeItem(key);
      });
      settingsLogger.debug('localStorage limpo');

      // 5. Limpar sessionStorage
      settingsLogger.debug('Limpando sessionStorage...');
      sessionStorage.clear();
      settingsLogger.debug('sessionStorage limpo');

      // 6. Limpar Service Worker Cache
      settingsLogger.debug('Limpando Service Worker cache...');
      try {
        const cacheNames = await caches.keys();
        for (const cacheName of cacheNames) {
          settingsLogger.debug(`  Deletando cache: ${cacheName}`);
          await caches.delete(cacheName);
        }
        settingsLogger.debug('Service Worker cache limpo');
      } catch (error) {
        settingsLogger.warn('Erro ao limpar Service Worker cache:', error);
      }

      // 7. Desregistrar Service Worker
      settingsLogger.debug('Desregistrando Service Worker...');
      try {
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          settingsLogger.debug(`  Encontrados ${registrations.length} Service Workers registrados`);

          for (const registration of registrations) {
            settingsLogger.debug(`  Desregistrando SW: ${registration.scope}`);
            await registration.unregister();
          }

          settingsLogger.debug('Service Worker desregistrado');

          // Limpar controller atual
          if (navigator.serviceWorker.controller) {
            settingsLogger.debug('  Enviando mensagem de SKIP_WAITING para SW ativo');
            navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
          }
        }
      } catch (error) {
        settingsLogger.warn('Erro ao desregistrar Service Worker:', error);
      }

      settingsLogger.info('LIMPEZA COMPLETA CONCLUÍDA!');
      settingsLogger.info('A página será recarregada em 3 segundos...');

      toast({
        title: 'Sistema limpo com sucesso',
        description:
          'Todos os dados foram removidos: banco de dados, cache, localStorage, IndexedDB e Service Worker.',
        duration: 5000,
      });

      // Recarregar a página para refletir o estado limpo
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    } catch (error) {
      settingsLogger.error('Erro ao limpar dados:', error);
      toast({
        title: 'Erro ao limpar dados',
        description: error instanceof Error ? error.message : 'Ocorreu um erro inesperado.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Gestão de Dados
            {userDistrictId && user?.role !== 'superadmin' && (
              <Badge variant="outline" className="ml-2">
                {userDistrictName}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            {user?.role === 'superadmin'
              ? 'Backup e restauração de dados do sistema completo'
              : `Backup e restauração de dados do ${userDistrictName || 'seu distrito'}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Indicador de Filtro por Distrito */}
          {userDistrictId && user?.role !== 'superadmin' && (
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-purple-600" />
                <p className="text-sm text-purple-800">
                  Operações limitadas aos dados do <strong>{userDistrictName}</strong>
                </p>
              </div>
            </div>
          )}

          {/* Data da Última Importação */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Última Importação</p>
                <p className="text-xs text-muted-foreground">
                  {getFormattedLastImportDate()}
                </p>
              </div>
              {lastImportDate && (
                <Badge variant="secondary" className="text-xs">
                  {getDaysSinceLastImport()} dias atrás
                </Badge>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="outline" className="flex-1" data-testid="button-export">
              <Download className="h-4 w-4 mr-2" />
              Exportar Dados
            </Button>

            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowImportModal(true)}
              data-testid="button-import"
            >
              <Upload className="h-4 w-4 mr-2" />
              Importar Dados
            </Button>

            {/* Limpar dados - Superadmin: sistema inteiro */}
            {user?.role === 'superadmin' && (
              <Button
                variant="destructive"
                className="flex-1"
                data-testid="button-delete-data"
                onClick={handleClearAllData}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Limpar Dados
              </Button>
            )}

            {/* Limpar dados - Pastor: apenas seu distrito */}
            {user?.role === 'pastor' && userDistrictId && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    disabled={isClearingDistrict}
                  >
                    {isClearingDistrict ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 mr-2" />
                    )}
                    Limpar Dados do Distrito
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta acao vai remover permanentemente todos os membros,
                      relacionamentos, eventos, pedidos de oracao e demais dados do distrito{' '}
                      <strong>{userDistrictName}</strong>. Seu usuario de pastor e o
                      distrito nao serao afetados. Esta acao nao pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleClearDistrictData}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Sim, limpar tudo
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal de Importação */}
      <ImportUsersModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        user={user}
        onImportComplete={() => updateLastImportDate(new Date().toISOString())}
        loadChurches={async () => {}}
      />

      {/* Dialog de Confirmação para Limpeza de Dados */}
      <Dialog open={showClearDataDialog} onOpenChange={setShowClearDataDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirmar Limpeza de Dados
            </DialogTitle>
            <DialogDescription>
              Esta ação irá <strong>permanentemente</strong> remover todos os dados do sistema,
              incluindo:
              <br />• Usuários e perfis
              <br />• Eventos e reuniões
              <br />• Pontuações e conquistas
              <br />• <strong>Dados do visitômetro</strong> (contadores de visitas)
              <br />• Relacionamentos e discipulado
              <br />• Oração e mensagens
              <br />• Configurações do sistema
              <br />
              <br />
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setShowClearDataDialog(false);
                if (clearDataCallback) {
                  clearDataCallback(false);
                }
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setShowClearDataDialog(false);
                if (clearDataCallback) {
                  clearDataCallback(true);
                }
              }}
            >
              Confirmar Limpeza
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
