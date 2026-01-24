/**
 * Componente indicador de status offline
 *
 * Melhorias:
 * - Acessibilidade completa (aria-labels, roles, live regions)
 * - Preparação para i18n (strings centralizadas)
 * - Suporte a conflitos
 * - Melhor UX com feedback visual
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useOffline } from '@/hooks/useOffline';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  CloudOff,
  CheckCircle,
  AlertCircle,
  Download,
  Database,
  Pause,
  Play,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  prepareForOffline,
  getOfflineDataStatus,
  type PrepareOfflineProgress,
} from '@/lib/offline/prepareOffline';
import { useToast } from '@/hooks/use-toast';

// ===== STRINGS PARA I18N =====
// Estas strings podem ser facilmente extraídas para um sistema de i18n
const strings = {
  // Status
  statusSyncing: 'Sincronizando...',
  statusOffline: 'Sem conexão',
  statusPending: (count: number) =>
    `${count} pendente${count > 1 ? 's' : ''}`,
  statusError: 'Erro',
  statusConnected: 'Conectado',
  statusPaused: 'Pausado',

  // Títulos
  titleConnectionStatus: 'Status da Conexão',
  titleSyncing: 'Sincronizando',
  titlePendingChanges: 'Alterações pendentes',
  titlePrepareOffline: 'Preparar para uso offline',
  titleLocalStorage: 'Armazenamento local',
  titleCachedData: 'Dados em cache:',
  titleConflicts: 'Conflitos detectados',

  // Descrições
  descPendingItems: (count: number) =>
    `${count} ${count === 1 ? 'item aguardando' : 'itens aguardando'} sincronização`,
  descOfflineMode:
    'Suas alterações serão salvas localmente e sincronizadas quando a conexão for restaurada.',
  descPrepareOffline: 'Baixa todos os dados para usar sem internet',
  descStorageAlmostFull:
    'Armazenamento quase cheio. Dados antigos serão removidos automaticamente.',
  descFullOfflineAccess: 'Acesso completo aos dados offline',
  descLimitedOfflineAccess: 'Acesso offline limitado',
  descConflicts: (count: number) =>
    `${count} ${count === 1 ? 'conflito precisa' : 'conflitos precisam'} de resolução`,
  descLastSync: (date: Date) =>
    `Última sync: ${date.toLocaleString('pt-BR')}`,

  // Botões
  btnSync: 'Sincronizar',
  btnPause: 'Pausar',
  btnResume: 'Retomar',
  btnPreparing: 'Preparando...',
  btnPrepareOffline: 'Preparar para offline',
  btnUpdateOfflineData: 'Atualizar dados offline',
  btnDownloading: (step: string) => `Baixando ${step}...`,

  // Contagens
  countUsers: (n: number) => `${n} usuários`,
  countEvents: (n: number) => `${n} eventos`,
  countTasks: (n: number) => `${n} tarefas`,

  // Toasts
  toastPrepareSuccess: 'Dados preparados para uso offline',
  toastPreparePartial: 'Alguns dados não foram salvos',
  toastPrepareError: 'Erro ao preparar offline',

  // Aria labels
  ariaOfflineStatus: 'Indicador de status de conexão',
  ariaOpenMenu: 'Abrir menu de status offline',
  ariaSyncButton: 'Sincronizar alterações pendentes',
  ariaPauseButton: 'Pausar sincronização',
  ariaResumeButton: 'Retomar sincronização',
  ariaPrepareButton: 'Preparar dados para uso offline',
  ariaStorageProgress: 'Uso de armazenamento local',
  ariaSyncProgress: 'Progresso da sincronização',
} as const;

// ===== TIPOS =====

interface OfflineIndicatorProps {
  userRole?: string;
  className?: string;
  /** Mostrar versão compacta (apenas ícone) */
  compact?: boolean;
}

interface OfflineDataStatus {
  users: number;
  events: number;
  tasks: number;
  lastSync: Date | null;
}

// ===== COMPONENTE =====

export function OfflineIndicator({
  userRole,
  className,
  compact = false,
}: OfflineIndicatorProps) {
  console.log('🔌 OfflineIndicator render - userRole:', userRole, 'compact:', compact);
  
  const { toast } = useToast();
  const {
    isOnline,
    isSyncing,
    isPaused,
    pendingCount,
    syncProgress,
    syncTotal,
    currentSyncItem,
    storageUsed,
    storageLimit,
    storagePercentage,
    lastError,
    unresolvedConflicts,
    sync,
    pause,
    resume,
    canAccessFullData,
  } = useOffline(userRole);

  // Estado local
  const [isPreparing, setIsPreparing] = useState(false);
  const [prepareProgress, setPrepareProgress] = useState<PrepareOfflineProgress | null>(null);
  const [offlineStatus, setOfflineStatus] = useState<OfflineDataStatus | null>(null);

  // Carregar status dos dados offline
  useEffect(() => {
    if (canAccessFullData) {
      getOfflineDataStatus().then(setOfflineStatus);
    }
  }, [canAccessFullData]);

  // Função para preparar offline
  const handlePrepareOffline = useCallback(async () => {
    if (!userRole || isPreparing) return;

    setIsPreparing(true);
    setPrepareProgress(null);

    try {
      const result = await prepareForOffline(userRole, (progress) => {
        setPrepareProgress(progress);
      });

      if (result.success) {
        toast({
          title: strings.toastPrepareSuccess,
          description: `${strings.countUsers(result.usersCount)}, ${strings.countEvents(result.eventsCount)}, ${strings.countTasks(result.tasksCount)}`,
        });
        getOfflineDataStatus().then(setOfflineStatus);
      } else {
        toast({
          title: strings.toastPreparePartial,
          description: result.errors.join(', '),
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: strings.toastPrepareError,
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setIsPreparing(false);
      setPrepareProgress(null);
    }
  }, [userRole, isPreparing, toast]);

  // Formatador de bytes
  const formatBytes = useCallback((bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }, []);

  // Determinar ícone de status
  const getStatusIcon = useCallback(() => {
    if (isSyncing) {
      return <RefreshCw className="h-4 w-4 animate-spin text-blue-500" aria-hidden="true" />;
    }
    if (isPaused) {
      return <Pause className="h-4 w-4 text-gray-500" aria-hidden="true" />;
    }
    if (!isOnline) {
      return <WifiOff className="h-4 w-4 text-orange-500" aria-hidden="true" />;
    }
    if (unresolvedConflicts > 0) {
      return <AlertTriangle className="h-4 w-4 text-yellow-500" aria-hidden="true" />;
    }
    if (pendingCount > 0) {
      return <CloudOff className="h-4 w-4 text-yellow-500" aria-hidden="true" />;
    }
    if (lastError) {
      return <AlertCircle className="h-4 w-4 text-red-500" aria-hidden="true" />;
    }
    return <Wifi className="h-4 w-4 text-green-500" aria-hidden="true" />;
  }, [isSyncing, isPaused, isOnline, unresolvedConflicts, pendingCount, lastError]);

  // Determinar texto de status
  const getStatusText = useCallback((): string => {
    if (isSyncing) return strings.statusSyncing;
    if (isPaused) return strings.statusPaused;
    if (!isOnline) return strings.statusOffline;
    if (pendingCount > 0) return strings.statusPending(pendingCount);
    if (lastError) return strings.statusError;
    return strings.statusConnected;
  }, [isSyncing, isPaused, isOnline, pendingCount, lastError]);

  // Status para screen readers
  const getAriaStatus = useCallback((): string => {
    const parts: string[] = [];

    if (!isOnline) {
      parts.push('Modo offline ativo');
    } else {
      parts.push('Conectado à internet');
    }

    if (isSyncing) {
      parts.push(`Sincronizando ${syncProgress} de ${syncTotal} itens`);
    } else if (pendingCount > 0) {
      parts.push(`${pendingCount} alterações pendentes`);
    }

    if (unresolvedConflicts > 0) {
      parts.push(`${unresolvedConflicts} conflitos não resolvidos`);
    }

    if (lastError) {
      parts.push(`Erro: ${lastError}`);
    }

    return parts.join('. ');
  }, [isOnline, isSyncing, syncProgress, syncTotal, pendingCount, unresolvedConflicts, lastError]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'flex items-center gap-2 px-2 py-1',
            compact && 'h-9 w-9 p-0 justify-center',
            !isOnline && 'bg-orange-50 hover:bg-orange-100 dark:bg-orange-900/20',
            lastError && 'bg-red-50 hover:bg-red-100 dark:bg-red-900/20',
            unresolvedConflicts > 0 && 'bg-yellow-50 hover:bg-yellow-100 dark:bg-yellow-900/20',
            className
          )}
          aria-label={strings.ariaOpenMenu}
          aria-describedby="offline-status-description"
        >
          <div className={cn('flex items-center gap-2', compact && 'relative')}>
            {getStatusIcon()}
            {!compact && (
              <span className="text-xs hidden sm:inline">{getStatusText()}</span>
            )}
            {pendingCount > 0 && (
              <span
                className={cn(
                  'bg-yellow-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center',
                  compact && 'absolute -top-1 -right-1 min-w-[16px] h-4 px-1 text-[10px] leading-4'
                )}
                aria-label={`${pendingCount} alterações pendentes`}
              >
                {pendingCount}
              </span>
            )}
            {unresolvedConflicts > 0 && !pendingCount && (
              <span
                className={cn(
                  'bg-orange-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center',
                  compact && 'absolute -top-1 -right-1 min-w-[16px] h-4 px-1 text-[10px] leading-4'
                )}
                aria-label={`${unresolvedConflicts} conflitos`}
              >
                {unresolvedConflicts}
              </span>
            )}
          </div>
        </Button>
      </PopoverTrigger>

      {/* Status para screen readers (hidden visually) */}
      <span id="offline-status-description" className="sr-only" aria-live="polite">
        {getAriaStatus()}
      </span>

      <PopoverContent
        className="w-80"
        align="end"
        role="dialog"
        aria-label={strings.titleConnectionStatus}
      >
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h4 className="font-medium" id="offline-popover-title">
              {strings.titleConnectionStatus}
            </h4>
            <div className="flex items-center gap-2" role="status" aria-live="polite">
              {getStatusIcon()}
              <span className="text-sm">{getStatusText()}</span>
            </div>
          </div>

          {/* Progresso de sincronização */}
          {isSyncing && syncTotal > 0 && (
            <div className="space-y-2" role="region" aria-label={strings.titleSyncing}>
              <div className="flex justify-between text-sm">
                <span>{currentSyncItem || strings.titleSyncing}</span>
                <span aria-label={`${syncProgress} de ${syncTotal}`}>
                  {syncProgress}/{syncTotal}
                </span>
              </div>
              <Progress
                value={(syncProgress / syncTotal) * 100}
                aria-label={strings.ariaSyncProgress}
                aria-valuenow={syncProgress}
                aria-valuemax={syncTotal}
              />
              {isPaused ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={resume}
                  aria-label={strings.ariaResumeButton}
                  className="w-full"
                >
                  <Play className="h-3 w-3 mr-1" aria-hidden="true" />
                  {strings.btnResume}
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={pause}
                  aria-label={strings.ariaPauseButton}
                  className="w-full"
                >
                  <Pause className="h-3 w-3 mr-1" aria-hidden="true" />
                  {strings.btnPause}
                </Button>
              )}
            </div>
          )}

          {/* Conflitos */}
          {unresolvedConflicts > 0 && (
            <div
              className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg"
              role="alert"
            >
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="text-sm font-medium">{strings.titleConflicts}</p>
                  <p className="text-xs text-gray-500">
                    {strings.descConflicts(unresolvedConflicts)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Itens pendentes */}
          {pendingCount > 0 && !isSyncing && (
            <div
              className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg"
              role="region"
              aria-label={strings.titlePendingChanges}
            >
              <div>
                <p className="text-sm font-medium">{strings.titlePendingChanges}</p>
                <p className="text-xs text-gray-500">
                  {strings.descPendingItems(pendingCount)}
                </p>
              </div>
              {isOnline && (
                <Button
                  size="sm"
                  onClick={sync}
                  disabled={isSyncing}
                  aria-label={strings.ariaSyncButton}
                >
                  <RefreshCw className="h-3 w-3 mr-1" aria-hidden="true" />
                  {strings.btnSync}
                </Button>
              )}
            </div>
          )}

          {/* Erro */}
          {lastError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg" role="alert">
              <p className="text-sm text-red-600 dark:text-red-400">{lastError}</p>
            </div>
          )}

          {/* Modo offline ativo */}
          {!isOnline && (
            <div
              className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg"
              role="status"
              aria-live="polite"
            >
              <div className="flex items-start gap-2">
                <WifiOff className="h-4 w-4 text-orange-500 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="text-sm font-medium">{strings.statusOffline}</p>
                  <p className="text-xs text-gray-500">{strings.descOfflineMode}</p>
                </div>
              </div>
            </div>
          )}

          {/* Armazenamento */}
          <div className="space-y-2 pt-2 border-t" role="region" aria-label={strings.titleLocalStorage}>
            <div className="flex justify-between text-sm">
              <span>{strings.titleLocalStorage}</span>
              <span>{formatBytes(storageUsed)} / {formatBytes(storageLimit)}</span>
            </div>
            <Progress
              value={storagePercentage}
              className={cn(storagePercentage > 80 && 'bg-red-100 dark:bg-red-900/20')}
              aria-label={strings.ariaStorageProgress}
              aria-valuenow={storagePercentage}
              aria-valuemax={100}
            />
            {storagePercentage > 80 && (
              <p className="text-xs text-red-500" role="alert">
                {strings.descStorageAlmostFull}
              </p>
            )}
          </div>

          {/* Status de acesso */}
          {canAccessFullData && (
            <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded text-sm">
              <CheckCircle className="h-4 w-4 text-green-500" aria-hidden="true" />
              <span>{strings.descFullOfflineAccess}</span>
            </div>
          )}
          {!canAccessFullData && userRole && (
            <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded text-sm">
              <CloudOff className="h-4 w-4 text-gray-400" aria-hidden="true" />
              <span>{strings.descLimitedOfflineAccess}</span>
            </div>
          )}

          {/* Botão Preparar para Offline */}
          {canAccessFullData && isOnline && (
            <div className="space-y-3 pt-2 border-t" role="region" aria-label={strings.titlePrepareOffline}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{strings.titlePrepareOffline}</p>
                  <p className="text-xs text-gray-500">{strings.descPrepareOffline}</p>
                </div>
              </div>

              {/* Status dos dados offline */}
              {offlineStatus &&
                (offlineStatus.users > 0 ||
                  offlineStatus.events > 0 ||
                  offlineStatus.tasks > 0) && (
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg space-y-1">
                    <div className="flex items-center gap-2 text-xs text-blue-700 dark:text-blue-300">
                      <Database className="h-3 w-3" aria-hidden="true" />
                      <span>{strings.titleCachedData}</span>
                    </div>
                    <div className="flex gap-3 text-xs text-blue-600 dark:text-blue-400">
                      <span>{strings.countUsers(offlineStatus.users)}</span>
                      <span>{strings.countEvents(offlineStatus.events)}</span>
                      <span>{strings.countTasks(offlineStatus.tasks)}</span>
                    </div>
                    {offlineStatus.lastSync && (
                      <p className="text-xs text-blue-500">
                        {strings.descLastSync(offlineStatus.lastSync)}
                      </p>
                    )}
                  </div>
                )}

              {/* Progresso da preparação */}
              {isPreparing && prepareProgress && (
                <div className="space-y-2" role="status" aria-live="polite">
                  <div className="flex justify-between text-sm">
                    <span>{strings.btnDownloading(prepareProgress.step)}</span>
                    <span>
                      {prepareProgress.current}/{prepareProgress.total}
                    </span>
                  </div>
                  <Progress
                    value={(prepareProgress.current / prepareProgress.total) * 100}
                    aria-label={`Baixando ${prepareProgress.step}`}
                  />
                </div>
              )}

              <Button
                size="sm"
                className="w-full"
                onClick={handlePrepareOffline}
                disabled={isPreparing || !isOnline}
                aria-label={strings.ariaPrepareButton}
              >
                {isPreparing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                    {strings.btnPreparing}
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" aria-hidden="true" />
                    {offlineStatus && offlineStatus.users > 0
                      ? strings.btnUpdateOfflineData
                      : strings.btnPrepareOffline}
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default OfflineIndicator;
