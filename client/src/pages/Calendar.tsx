import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Filter, Cake, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MonthlyCalendarView } from '@/components/calendar/MonthlyCalendarView';
import { EventModal } from '@/components/calendar/EventModal';
import { useEventFilterPermissions } from '@/hooks/useEventFilterPermissions';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { hasAdminAccess } from '@/lib/permissions';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { CalendarEvent, EVENT_TYPES } from '@/types/calendar';
import { notificationService } from '@/lib/notificationService';
import { toast as sonnerToast } from 'sonner';

// 🎯 CONFIGURAÇÃO DO GOOGLE SHEETS PARA EVENTOS
const GOOGLE_SHEETS_CONFIG = {
  proxyUrl: '/api/google-sheets/proxy',
  spreadsheetId: '1i-x-0KiciwACRztoKX-YHlXT4FsrAzaKwuH-hHkD8go',
  sheetName: 'Agenda', // Nome da aba para eventos
};

export default function Calendar() {
  const { toast } = useToast();
  const { user } = useAuth();
  const _queryClient = useQueryClient();
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [showBirthdays, setShowBirthdays] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const _isAdmin = hasAdminAccess(user);
  const {
    getAvailableEventTypes,
    canFilterEventType,
    permissions,
    isLoading: permissionsLoading,
  } = useEventFilterPermissions();

  // Cleanup ao desmontar o componente
  useEffect(() => {
    return () => {
      // Fechar qualquer modal/dropdown que possa estar aberto
      setShowEventModal(false);
    };
  }, []);

  // ========================================
  // BUSCAR EVENTOS COM CACHE OTIMIZADO
  // ========================================
  const {
    data: rawEvents,
    isLoading: _eventsLoading,
    refetch,
  } = useQuery<any[]>({
    // IMPORTANTE: user?.id na queryKey para cache separado por usuário
    queryKey: ['events', user?.id],
    queryFn: async () => {
      console.log('📡 [API] Buscando eventos do servidor...');
      const response = await fetch('/api/calendar/events', {
        headers: {
          'x-user-id': user?.id?.toString() || '',
          'x-user-role': user?.role || '',
        },
      });
      if (!response.ok) throw new Error('Erro ao buscar eventos');
      const rawEvents = await response.json();
      // A API pode retornar { data: [] } ou array diretamente
      const events = Array.isArray(rawEvents) ? rawEvents : rawEvents?.data || [];
      console.log(`✅ [API] ${events.length} eventos carregados da API`);

      // Remover duplicatas no frontend (proteção extra)
      const uniqueEvents = Array.from(
        new Map(events.map((e: any) => [`${e.title}_${e.date}_${e.type}`, e])).values()
      );

      if (uniqueEvents.length < events.length) {
        console.log(
          `⚠️ [API] Removidas ${events.length - uniqueEvents.length} duplicatas do frontend`
        );
      }

      return uniqueEvents;
    },
    enabled: !!user?.id,
    staleTime: 0, // Sempre buscar dados frescos
    gcTime: 5 * 60 * 1000, // 5 minutos - manter em cache
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  // Normalizar eventos (converter date/end_date para startDate/endDate)
  const allEvents = useMemo(() =>
    rawEvents?.map((event: any) => ({
      ...event,
      startDate: event.date || event.startDate,
      endDate: event.end_date || event.endDate || event.date,
    })) || []
  , [rawEvents]);

  // Extrair tipos de eventos dinâmicos dos eventos reais (incluindo novos do Google Sheets)
  const dynamicEventTypes = React.useMemo(() => {
    const uniqueTypes = new Map();

    // Primeiro adicionar os tipos predefinidos
    EVENT_TYPES.forEach(type => {
      uniqueTypes.set(type.id, type);
    });

    // Depois adicionar novos tipos dos eventos (sobrescrever se necessário)
    allEvents.forEach((event: any) => {
      if (event.type && !uniqueTypes.has(event.type)) {
        // Criar tipo dinâmico para novas categorias
        const hexColor = event.color || '#64748b'; // Usar cor do evento ou padrão
        uniqueTypes.set(event.type, {
          id: event.type,
          label: event.type
            .split('-')
            .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' '),
          hexColor: hexColor,
          color: 'dynamic', // Flag para saber que é cor dinâmica
          isDynamic: true,
        });
      }
    });

    return Array.from(uniqueTypes.values());
  }, [allEvents]);

  // ========================================
  // FUNÇÃO DE SINCRONIZAÇÃO DO GOOGLE SHEETS
  // ========================================

  /**
   * Sincronizar DO Google Sheets para o banco de dados (SIMPLIFICADO)
   */
  const syncFromGoogleSheets = async (showToast = false) => {
    try {
      console.log('⬅️ [SYNC] Sincronizando do Google Sheets...');
      if (showToast) sonnerToast.info('Sincronizando...');

      // Buscar config
      const configResponse = await fetch('/api/calendar/google-drive-config');
      const config = await configResponse.json();

      if (!config.spreadsheetUrl) {
        console.log('⚠️ Nenhuma planilha configurada');
        return;
      }

      // Sincronizar
      const syncResponse = await fetch('/api/calendar/sync-google-drive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spreadsheetUrl: config.spreadsheetUrl }),
      });

      if (syncResponse.ok) {
        const result = await syncResponse.json();
        const hasChanges =
          result.importedCount > 0 || result.updatedCount > 0 || result.deletedCount > 0;

        console.log(
          `✅ [SYNC] ${result.importedCount || 0} novos, ${result.updatedCount || 0} atualizados, ${result.deletedCount || 0} removidos`
        );

        // Atualizar APENAS se houver mudanças
        if (hasChanges) {
          await refetch();
          if (showToast) sonnerToast.success('Sincronizado!');
        }
      }
    } catch (error) {
      console.error('❌ Erro:', error);
      if (showToast) sonnerToast.error('Erro ao sincronizar');
    }
  };

  // Inicializar filtros UMA VEZ com todas as categorias (incluindo dinâmicas)
  const filtersInitialized = useRef(false);
  useEffect(() => {
    if (filtersInitialized.current) return;

    if (user?.role && permissions && !permissionsLoading && dynamicEventTypes.length > 0) {
      filtersInitialized.current = true;
      const allTypes = dynamicEventTypes.map(t => t.id);
      setActiveFilters(allTypes);
      console.log('🎯 Filtros inicializados com TODAS as categorias:', allTypes);
    }
  }, [user?.role, permissions, permissionsLoading, dynamicEventTypes]);

  // Effect para escutar eventos de importação bem-sucedida
  useEffect(() => {
    let isMounted = true;

    const handleImportSuccess = (event: CustomEvent) => {
      try {
        if (!isMounted) return;

        if (event.detail && event.detail.type === 'calendar-events') {
          console.log(
            `📅 Importação de eventos bem-sucedida: ${event.detail.count} eventos importados`
          );
          // A data da última importação será atualizada automaticamente pelo Settings
        }
      } catch (error) {
        console.error('❌ Erro no handleImportSuccess:', error);
      }
    };

    // Adicionar listener para o evento de importação bem-sucedida
    window.addEventListener('import-success', handleImportSuccess as EventListener);

    // Cleanup do listener
    return () => {
      isMounted = false;
      window.removeEventListener('import-success', handleImportSuccess as EventListener);
    };
  }, []);

  // ========================================
  // SINCRONIZAÇÃO COM GOOGLE SHEETS - MANUAL POR ENQUANTO
  // ========================================

  // DESABILITADO: Sincronização automática (estava causando duplicatas)
  // useEffect(() => {
  //   syncFromGoogleSheets(false);
  //   const autoSyncInterval = setInterval(() => {
  //     syncFromGoogleSheets(false);
  //   }, 15000);
  //   return () => clearInterval(autoSyncInterval);
  // }, []);

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsCreatingEvent(false);
    setShowEventModal(true);
  };

  const handleNewEvent = () => {
    setSelectedEvent(null);
    setIsCreatingEvent(true);
    setShowEventModal(true);
  };

  const handleSaveEvent = async (eventData: Partial<CalendarEvent>) => {
    try {
      if (isCreatingEvent) {
        // Criar novo evento no banco
        const response = await fetch('/api/calendar/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-user-id': user?.id?.toString() || '' },
          body: JSON.stringify({
            title: eventData.title,
            description: eventData.description || '',
            date: eventData.startDate,
            end_date: eventData.endDate || eventData.startDate,
            type: eventData.type || 'reunioes',
            location: eventData.location || '',
            created_by: user?.id || 1,
          }),
        });

        if (!response.ok) throw new Error('Erro ao criar evento');
        const result = await response.json();

        // Adicionar ao Google Sheets
        await addEventToGoogleSheets(result);

        sonnerToast.success('Evento criado!');

        // Notificação
        if (eventData.title && eventData.startDate) {
          try {
            await notificationService.notifyEventCreated(eventData.title, eventData.startDate);
          } catch (error) {
            console.error('Erro ao enviar notificação:', error);
          }
        }
      } else if (selectedEvent) {
        // Atualizar evento
        const response = await fetch(`/api/calendar/events/${selectedEvent.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'x-user-id': user?.id?.toString() || '' },
          body: JSON.stringify({
            title: eventData.title,
            description: eventData.description,
            date: eventData.startDate,
            end_date: eventData.endDate,
            type: eventData.type,
            location: eventData.location,
          }),
        });

        if (!response.ok) throw new Error('Erro ao atualizar evento');
        const result = await response.json();

        // Atualizar no Google Sheets
        await updateEventInGoogleSheets(result);

        sonnerToast.success('Evento atualizado!');
      }

      // Atualizar lista
      await refetch();
      setShowEventModal(false);
    } catch (error: any) {
      console.error('❌ Erro ao salvar evento:', error);
      sonnerToast.error(`Erro: ${error?.message || 'Erro desconhecido'}`);
    }
  };

  const handleDeleteEvent = async (eventId: number) => {
    try {
      // Deletar do banco
      const response = await fetch(`/api/calendar/events/${eventId}`, {
        method: 'DELETE',
        headers: { 'x-user-id': user?.id?.toString() || '' },
      });

      if (!response.ok) throw new Error('Erro ao deletar evento');

      // Deletar do Google Sheets
      await deleteEventFromGoogleSheets(eventId);

      sonnerToast.success('Evento deletado!');

      // Atualizar lista
      await refetch();
      setShowEventModal(false);
    } catch (error) {
      console.error('❌ Erro ao deletar:', error);
      sonnerToast.error('Erro ao deletar evento');
    }
  };

  // ========================================
  // FUNÇÕES DE GOOGLE SHEETS (seguindo padrão de Tasks)
  // ========================================

  /**
   * Adicionar evento ao Google Sheets
   */
  const addEventToGoogleSheets = async (event: any) => {
    try {
      const eventData = {
        id: event.id, // IMPORTANTE: incluir ID para poder deletar depois
        titulo: event.title,
        data_inicio: event.date || event.startDate,
        data_fim: event.end_date || event.endDate || event.date || event.startDate,
        categoria: event.type,
        descricao: event.description || '',
        local: event.location || '',
      };

      const response = await fetch(GOOGLE_SHEETS_CONFIG.proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id?.toString() || '',
        },
        body: JSON.stringify({
          action: 'addEvent',
          spreadsheetId: GOOGLE_SHEETS_CONFIG.spreadsheetId,
          sheetName: GOOGLE_SHEETS_CONFIG.sheetName,
          eventData,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          console.log(`✅ [ADD] Evento ${event.id} adicionado ao Google Sheets!`);
        }
      }
    } catch (error) {
      console.error(`❌ [ADD] Erro ao adicionar evento ao Google Sheets:`, error);
    }
  };

  /**
   * Atualizar evento no Google Sheets (deleta e adiciona novamente)
   */
  const updateEventInGoogleSheets = async (event: any) => {
    try {
      // Deletar linha antiga
      await fetch(GOOGLE_SHEETS_CONFIG.proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id?.toString() || '',
        },
        body: JSON.stringify({
          action: 'deleteEvent',
          spreadsheetId: GOOGLE_SHEETS_CONFIG.spreadsheetId,
          sheetName: GOOGLE_SHEETS_CONFIG.sheetName,
          eventId: event.id,
        }),
      });

      // Adicionar com dados atualizados
      await addEventToGoogleSheets(event);
      console.log(`✅ [UPDATE] Evento ${event.id} atualizado no Google Sheets!`);
    } catch (error) {
      console.error(`❌ [UPDATE] Erro ao atualizar evento no Google Sheets:`, error);
    }
  };

  /**
   * Deletar evento do Google Sheets
   */
  const deleteEventFromGoogleSheets = async (eventId: number) => {
    try {
      console.log(`🗑️ [DELETE] Deletando evento ${eventId} do Google Sheets...`);

      const response = await fetch(GOOGLE_SHEETS_CONFIG.proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id?.toString() || '',
        },
        body: JSON.stringify({
          action: 'deleteEvent',
          spreadsheetId: GOOGLE_SHEETS_CONFIG.spreadsheetId,
          sheetName: GOOGLE_SHEETS_CONFIG.sheetName,
          eventId: eventId,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          console.log(`✅ [DELETE] Evento ${eventId} deletado do Google Sheets`);
        }
      }
    } catch (error) {
      console.error(`❌ [DELETE] Erro ao deletar evento do Google Sheets:`, error);
    }
  };

  // Sincronização manual (botão)
  const handleSync = async () => {
    setIsSyncing(true);
    await syncFromGoogleSheets(true);
    setIsSyncing(false);
  };

  const handleFilterChange = (filterId: string, checked: boolean) => {
    // Verificar se o usuário tem permissão para filtrar este tipo de evento
    if (user?.role && !canFilterEventType(user.role, filterId)) {
      toast({
        title: 'Acesso negado',
        description: 'Você não tem permissão para filtrar este tipo de evento.',
        variant: 'destructive',
      });
      return;
    }

    if (checked) {
      setActiveFilters(prev => [...prev, filterId]);
    } else {
      setActiveFilters(prev => prev.filter(id => id !== filterId));
    }
  };

  const clearAllFilters = () => {
    setActiveFilters([]);
  };

  const _selectAllFilters = () => {
    if (user?.role) {
      const availableTypes = getAvailableEventTypes(user.role);
      setActiveFilters(availableTypes);
    } else {
      // Incluir todos os tipos, incluindo os dinâmicos
      setActiveFilters(dynamicEventTypes.map(type => type.id));
    }
  };

  return (
    <MobileLayout>
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Agenda</h1>
            <p className="text-muted-foreground">Sincronizada automaticamente com Google Sheets</p>
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="space-y-4">
          {/* Filtros Principais */}
          <div className="flex flex-wrap gap-3 items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 dark:text-gray-200 dark:border-slate-600 dark:hover:bg-slate-800"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filtros de Eventos
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <div className="flex items-center justify-between p-2">
                  <span className="text-sm font-medium">Tipos de Evento</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllFilters}
                    className="h-auto p-1 text-xs"
                  >
                    Limpar
                  </Button>
                </div>
                {dynamicEventTypes
                  .filter(type => !user?.role || canFilterEventType(user.role, type.id))
                  .map(type => (
                    <DropdownMenuCheckboxItem
                      key={type.id}
                      checked={activeFilters.includes(type.id)}
                      onCheckedChange={checked => handleFilterChange(type.id, checked)}
                      className="cursor-pointer"
                    >
                      <div className="flex items-center space-x-2">
                        <div
                          className={`w-4 h-4 rounded-full shadow-sm ${!type.isDynamic ? type.color : ''}`}
                          style={
                            type.isDynamic
                              ? {
                                  backgroundColor: type.hexColor || '#64748b',
                                }
                              : {}
                          }
                        />
                        <span>{type.label}</span>
                        {type.isDynamic && (
                          <span className="text-xs text-emerald-600 dark:text-emerald-400 ml-1">
                            ✨
                          </span>
                        )}
                      </div>
                    </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Botão de Aniversariantes */}
            <Button
              variant={showBirthdays ? 'default' : 'outline'}
              size="sm"
              className={
                showBirthdays
                  ? 'h-8 bg-pink-100 border-pink-300 text-pink-800 hover:bg-pink-200 dark:bg-pink-900/50 dark:border-pink-600/50 dark:text-pink-300 dark:hover:bg-pink-900/70'
                  : 'h-8 bg-pink-50 border-pink-200 text-pink-700 hover:bg-pink-100 dark:bg-pink-900/30 dark:border-pink-600/50 dark:text-pink-300 dark:hover:bg-pink-900/50'
              }
              onClick={() => setShowBirthdays(!showBirthdays)}
            >
              <Cake className="h-4 w-4 mr-2" />
              {showBirthdays ? 'Ocultar Aniversariantes' : 'Mostrar Aniversariantes'}
            </Button>

            {/* Botão de Sincronização com Google Sheets */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={isSyncing}
              className="h-8 flex items-center gap-2 bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:border-blue-600/50 dark:text-blue-300 dark:hover:bg-blue-900/50"
            >
              <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
            </Button>
          </div>
        </div>

        {/* Filtros Ativos */}
        {activeFilters.length > 0 && activeFilters.length < EVENT_TYPES.length && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-muted-foreground">Filtros ativos:</span>
            {activeFilters.map(filterId => {
              const type = EVENT_TYPES.find(t => t.id === filterId);
              return type ? (
                <Badge
                  key={filterId}
                  variant="secondary"
                  className={`${type.color} font-medium shadow-sm hover:shadow-md transition-shadow`}
                >
                  {type.label}
                </Badge>
              ) : null;
            })}
          </div>
        )}

        {/* Calendar Component */}
        <MonthlyCalendarView
          onEventClick={handleEventClick}
          onNewEvent={handleNewEvent}
          activeFilters={activeFilters}
          showBirthdays={showBirthdays}
        />

        {/* Event Modal */}
        <EventModal
          event={selectedEvent || undefined}
          isOpen={showEventModal}
          onClose={() => setShowEventModal(false)}
          onSave={handleSaveEvent}
          onDelete={handleDeleteEvent}
          isEditing={isCreatingEvent}
          eventTypes={EVENT_TYPES}
        />
      </div>
    </MobileLayout>
  );
}
