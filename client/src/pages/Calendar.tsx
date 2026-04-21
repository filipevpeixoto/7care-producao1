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
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { useTheme } from '@/contexts/ThemeContext';
import { type CalendarEvent, EVENT_TYPES } from '@/types/calendar';
import { notificationService } from '@/lib/notificationService';
import { fetchWithAuth } from '@/lib/api';
import { toast as sonnerToast } from 'sonner';
import { calendarLogger } from '@/lib/logger';
import { CalendarV2 } from './v2/CalendarV2';

/** Raw event shape from the API before normalization */
interface RawApiEvent {
  id: number;
  title: string;
  date?: string;
  startDate?: string;
  end_date?: string;
  endDate?: string;
  time?: string;
  type: string;
  description?: string;
  location?: string;
  color?: string;
  status?: string;
  organizerId?: number;
  organizer?: string;
  isRecurring?: boolean;
  attendees?: number;
  maxAttendees?: number;
  capacity?: number;
}

// 🎯 CONFIGURAÇÃO DO GOOGLE SHEETS PARA EVENTOS
const GOOGLE_SHEETS_CONFIG = {
  proxyUrl: '/api/google-sheets/proxy',
  spreadsheetId: '1i-x-0KiciwACRztoKX-YHlXT4FsrAzaKwuH-hHkD8go',
  sheetName: 'Agenda', // Nome da aba para eventos
};

export default function Calendar() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useTranslation();
  const { skin } = useTheme();
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [newEventInitialDate, setNewEventInitialDate] = useState<string | undefined>();
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [showBirthdays, setShowBirthdays] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const {
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
  } = useQuery<RawApiEvent[]>({
    // IMPORTANTE: user?.id na queryKey para cache separado por usuário
    queryKey: ['events', user?.id],
    queryFn: async () => {
      calendarLogger.debug('Buscando eventos do servidor...');
      const response = await fetchWithAuth('/api/calendar/events');
      if (!response.ok) throw new Error(t('calendar.fetchError'));
      const rawEvents = await response.json();
      // A API pode retornar { data: [] } ou array diretamente
      const events: RawApiEvent[] = Array.isArray(rawEvents) ? rawEvents : rawEvents?.data || [];
      calendarLogger.debug(`${events.length} eventos carregados da API`);

      // Remover duplicatas no frontend (proteção extra)
      const uniqueEvents = Array.from(
        new Map(events.map((e: RawApiEvent) => [`${e.title}_${e.date}_${e.type}`, e])).values()
      );

      if (uniqueEvents.length < events.length) {
        calendarLogger.debug(
          `Removidas ${events.length - uniqueEvents.length} duplicatas do frontend`
        );
      }

      return uniqueEvents as RawApiEvent[];
    },
    enabled: !!user?.id,
    staleTime: 0, // Sempre buscar dados frescos
    gcTime: 5 * 60 * 1000, // 5 minutos - manter em cache
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  // Normalizar eventos (converter date/end_date para startDate/endDate)
  const allEvents = useMemo(
    () =>
      rawEvents?.map((event) => ({
        ...event,
        startDate: event.date || event.startDate,
        endDate: event.end_date || event.endDate || event.date,
      })) || [],
    [rawEvents]
  );

  // Extrair tipos de eventos dinâmicos dos eventos reais (incluindo novos do Google Sheets)
  const dynamicEventTypes = React.useMemo(() => {
    const uniqueTypes = new Map();

    // Primeiro adicionar os tipos predefinidos
    EVENT_TYPES.forEach((type) => {
      uniqueTypes.set(type.id, type);
    });

    // Depois adicionar novos tipos dos eventos (sobrescrever se necessário)
    allEvents.forEach((event) => {
      if (event.type && !uniqueTypes.has(event.type)) {
        // Criar tipo dinâmico para novas categorias
        const hexColor = event.color || '#64748b'; // Usar cor do evento ou padrão
        uniqueTypes.set(event.type, {
          id: event.type,
          label: event.type
            .split('-')
            .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' '),
          hexColor,
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
      calendarLogger.debug('Sincronizando do Google Sheets...');
      if (showToast) sonnerToast.info(t('calendar.syncing'));

      // Buscar config
      const configResponse = await fetch('/api/calendar/google-drive-config');
      const config = await configResponse.json();

      if (!config.spreadsheetUrl) {
        calendarLogger.debug('Nenhuma planilha configurada');
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

        calendarLogger.debug(
          `${result.importedCount || 0} novos, ${result.updatedCount || 0} atualizados, ${result.deletedCount || 0} removidos`
        );

        // Atualizar APENAS se houver mudanças
        if (hasChanges) {
          await refetch();
          if (showToast) sonnerToast.success(t('calendar.synced'));
        }
      }
    } catch (error) {
      calendarLogger.error('Erro:', error);
      if (showToast) sonnerToast.error(t('calendar.syncError'));
    }
  };

  // Inicializar filtros UMA VEZ com todas as categorias (incluindo dinâmicas)
  const filtersInitialized = useRef(false);
  useEffect(() => {
    if (filtersInitialized.current) return;

    if (user?.role && permissions && !permissionsLoading && dynamicEventTypes.length > 0) {
      filtersInitialized.current = true;
      const allTypes = dynamicEventTypes.map((t) => t.id);
      setActiveFilters(allTypes);
      calendarLogger.debug('Filtros inicializados com TODAS as categorias:', allTypes);
    }
  }, [user?.role, permissions, permissionsLoading, dynamicEventTypes]);

  // Effect para escutar eventos de importação bem-sucedida
  useEffect(() => {
    let isMounted = true;

    const handleImportSuccess = (event: CustomEvent) => {
      try {
        if (!isMounted) return;

        if (event.detail && event.detail.type === 'calendar-events') {
          calendarLogger.debug(
            `Importação de eventos bem-sucedida: ${event.detail.count} eventos importados`
          );
          // A data da última importação será atualizada automaticamente pelo Settings
        }
      } catch (error) {
        calendarLogger.error('Erro no handleImportSuccess:', error);
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
    setNewEventInitialDate(undefined);
    setShowEventModal(true);
  };

  const handleNewEvent = (date?: Date) => {
    setSelectedEvent(null);
    setIsCreatingEvent(true);
    setNewEventInitialDate(date ? date.toISOString().split('T')[0] : undefined);
    setShowEventModal(true);
  };

  const handleSaveEvent = async (eventData: Partial<CalendarEvent>) => {
    try {
      if (isCreatingEvent) {
        // Criar novo evento no banco
        const response = await fetchWithAuth('/api/calendar/events', {
          method: 'POST',
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

        if (!response.ok) throw new Error(t('calendar.createError'));
        const result = await response.json();

        // Adicionar ao Google Sheets
        await addEventToGoogleSheets(result);

        sonnerToast.success(t('calendar.eventCreated'));

        // Notificação
        if (eventData.title && eventData.startDate) {
          try {
            await notificationService.notifyEventCreated(eventData.title, eventData.startDate);
          } catch (error) {
            calendarLogger.error('Erro ao enviar notificação:', error);
          }
        }
      } else if (selectedEvent) {
        // Atualizar evento
        const response = await fetchWithAuth(`/api/calendar/events/${selectedEvent.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            title: eventData.title,
            description: eventData.description,
            date: eventData.startDate,
            end_date: eventData.endDate,
            type: eventData.type,
            location: eventData.location,
          }),
        });

        if (!response.ok) throw new Error(t('calendar.updateError'));
        const result = await response.json();

        // Atualizar no Google Sheets
        await updateEventInGoogleSheets(result);

        sonnerToast.success(t('calendar.eventUpdated'));
      }

      // Atualizar lista
      await refetch();
      setShowEventModal(false);
    } catch (error: unknown) {
      calendarLogger.error('Erro ao salvar evento:', error);
      sonnerToast.error(
        t('calendar.errorWithMessage', {
          message: error instanceof Error ? error.message : t('calendar.unknownError'),
        })
      );
    }
  };

  const handleDeleteEvent = async (eventId: number) => {
    try {
      // Deletar do banco
      const response = await fetchWithAuth(`/api/calendar/events/${eventId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error(t('calendar.deleteError'));

      // Deletar do Google Sheets
      await deleteEventFromGoogleSheets(eventId);

      sonnerToast.success(t('calendar.eventDeleted'));

      // Atualizar lista
      await refetch();
      setShowEventModal(false);
    } catch (error) {
      calendarLogger.error('Erro ao deletar:', error);
      sonnerToast.error(t('calendar.deleteError'));
    }
  };

  // ========================================
  // FUNÇÕES DE GOOGLE SHEETS (seguindo padrão de Tasks)
  // ========================================

  /**
   * Adicionar evento ao Google Sheets
   */
  const addEventToGoogleSheets = async (event: RawApiEvent) => {
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

      const response = await fetchWithAuth(GOOGLE_SHEETS_CONFIG.proxyUrl, {
        method: 'POST',
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
          calendarLogger.debug(`Evento ${event.id} adicionado ao Google Sheets!`);
        }
      }
    } catch (error) {
      calendarLogger.error(`Erro ao adicionar evento ao Google Sheets:`, error);
    }
  };

  /**
   * Atualizar evento no Google Sheets (deleta e adiciona novamente)
   */
  const updateEventInGoogleSheets = async (event: RawApiEvent) => {
    try {
      // Deletar linha antiga
      await fetchWithAuth(GOOGLE_SHEETS_CONFIG.proxyUrl, {
        method: 'POST',
        body: JSON.stringify({
          action: 'deleteEvent',
          spreadsheetId: GOOGLE_SHEETS_CONFIG.spreadsheetId,
          sheetName: GOOGLE_SHEETS_CONFIG.sheetName,
          eventId: event.id,
        }),
      });

      // Adicionar com dados atualizados
      await addEventToGoogleSheets(event);
      calendarLogger.debug(`Evento ${event.id} atualizado no Google Sheets!`);
    } catch (error) {
      calendarLogger.error(`Erro ao atualizar evento no Google Sheets:`, error);
    }
  };

  /**
   * Deletar evento do Google Sheets
   */
  const deleteEventFromGoogleSheets = async (eventId: number) => {
    try {
      calendarLogger.debug(`Deletando evento ${eventId} do Google Sheets...`);

      const response = await fetchWithAuth(GOOGLE_SHEETS_CONFIG.proxyUrl, {
        method: 'POST',
        body: JSON.stringify({
          action: 'deleteEvent',
          spreadsheetId: GOOGLE_SHEETS_CONFIG.spreadsheetId,
          sheetName: GOOGLE_SHEETS_CONFIG.sheetName,
          eventId,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          calendarLogger.debug(`Evento ${eventId} deletado do Google Sheets`);
        }
      }
    } catch (error) {
      calendarLogger.error(`Erro ao deletar evento do Google Sheets:`, error);
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
        title: t('calendar.accessDenied'),
        description: t('calendar.noFilterPermission'),
        variant: 'destructive',
      });
      return;
    }

    if (checked) {
      setActiveFilters((prev) => [...prev, filterId]);
    } else {
      setActiveFilters((prev) => prev.filter((id) => id !== filterId));
    }
  };

  const clearAllFilters = () => {
    setActiveFilters([]);
  };

  if (skin === 'v2') {
    return (
      <>
        <MobileLayout variant="prototype">
          <CalendarV2
            events={allEvents as CalendarEvent[]}
            onEventClick={handleEventClick}
            onCreateEvent={handleNewEvent}
          />
        </MobileLayout>

        <EventModal
          event={selectedEvent ?? undefined}
          isOpen={showEventModal}
          onClose={() => setShowEventModal(false)}
          onSave={handleSaveEvent}
          onDelete={handleDeleteEvent}
          isEditing={isCreatingEvent}
          eventTypes={dynamicEventTypes}
          initialDate={newEventInitialDate}
          variant="v2"
        />
      </>
    );
  }

  return (
    <MobileLayout>
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {t('calendar.agenda')}
            </h1>
            <p className="text-muted-foreground">{t('calendar.syncedWithGoogleSheets')}</p>
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
                  {t('calendar.eventFilters')}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <div className="flex items-center justify-between p-2">
                  <span className="text-sm font-medium">{t('calendar.eventTypes')}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllFilters}
                    className="h-auto p-1 text-xs"
                  >
                    {t('calendar.clear')}
                  </Button>
                </div>
                {dynamicEventTypes
                  .filter((type) => !user?.role || canFilterEventType(user.role, type.id))
                  .map((type) => (
                    <DropdownMenuCheckboxItem
                      key={type.id}
                      checked={activeFilters.includes(type.id)}
                      onCheckedChange={(checked) => handleFilterChange(type.id, checked)}
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
              {showBirthdays ? t('calendar.hideBirthdays') : t('calendar.showBirthdays')}
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
              {isSyncing ? t('calendar.syncing') : t('calendar.sync')}
            </Button>
          </div>
        </div>

        {/* Filtros Ativos */}
        {activeFilters.length > 0 && activeFilters.length < EVENT_TYPES.length && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-muted-foreground">{t('calendar.activeFilters')}</span>
            {activeFilters.map((filterId) => {
              const type = EVENT_TYPES.find((t) => t.id === filterId);
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
