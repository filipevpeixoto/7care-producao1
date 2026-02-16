import { useState, useCallback, memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useEventFilterPermissions } from '@/hooks/useEventFilterPermissions';
import { type CalendarEvent } from '@/types/calendar';
import { useBirthdays } from '@/hooks/useBirthdays';
import { calendarLogger } from '@/lib/logger';
import { fetchEvents, monthNames } from './monthlyCalendarUtils';
import { getDaysInMonth, isMultiDayEvent } from './calendarDateHelpers';
import type { BirthdayUser } from './calendar-types';
import { CalendarHeader } from './CalendarHeader';
import { MobileCalendarGrid } from './MobileCalendarGrid';
import { DesktopCalendarGrid } from './DesktopCalendarGrid';
import { SelectedDateEventsCard } from './SelectedDateEventsCard';
import { MonthBirthdaysCard } from './MonthBirthdaysCard';

interface MonthlyCalendarViewProps {
  onEventClick?: (event: CalendarEvent) => void;
  onNewEvent?: () => void;
  onDateClick?: (date: string) => void;
  activeFilters?: string[];
  showBirthdays?: boolean;
  events?: CalendarEvent[]; // Eventos passados via props
}

export const MonthlyCalendarView = memo(({
  onEventClick,
  onNewEvent,
  onDateClick,
  events: propsEvents,
  activeFilters = [],
  showBirthdays = false,
}: MonthlyCalendarViewProps) => {
  const { user } = useAuth();
  const { canFilterEventType } = useEventFilterPermissions();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const { birthdays, isLoading: birthdaysLoading } = useBirthdays();

  // Função para alternar a expansão de um dia
  const toggleDayExpansion = useCallback((dateString: string) => {
    setExpandedDays(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dateString)) {
        newSet.delete(dateString);
      } else {
        newSet.add(dateString);
      }
      return newSet;
    });
  }, []);

  // Debug log para verificar o estado
  calendarLogger.debug('Estado dos aniversariantes:', {
    showBirthdays,
    birthdaysCount: birthdays.all?.length || 0,
    thisMonthCount: birthdays.thisMonth?.length || 0,
    isLoading: birthdaysLoading,
    currentMonth: currentDate.getMonth(),
    currentMonthName: monthNames[currentDate.getMonth()],
  });

  // Buscar eventos da API
  const {
    data: allEvents,
    isLoading,
    error,
  } = useQuery<CalendarEvent[]>({
    queryKey: ['events', user?.role],
    queryFn: () => fetchEvents(user?.role),
    enabled: !!user?.role,
  });

  // Debug log para verificar os eventos carregados
  calendarLogger.debug('[MonthlyCalendarView] Eventos:', {
    source: propsEvents && propsEvents.length > 0 ? 'props' : 'api fetch',
    propsEventsCount: propsEvents?.length || 0,
    fetchedEventsCount: allEvents?.length || 0,
    finalEventsCount: allEvents?.length || 0,
    isLoading,
    error,
  });

  const filteredEvents = allEvents?.filter(event => {
    // Verificar se o usuário tem permissão para ver este tipo de evento
    if (user?.role && !canFilterEventType(user.role, event.type)) {
      return false;
    }

    // Use activeFilters from props
    if (activeFilters.length > 0) {
      const isIncluded = activeFilters.includes(event.type);
      calendarLogger.debug(`Filtro de evento "${event.title}":`, {
        eventType: event.type,
        activeFilters,
        isIncluded,
      });
      return isIncluded;
    }
    // If no filters are active, show all events
    return true;
  });

  calendarLogger.debug('Eventos filtrados:', {
    totalEvents: allEvents?.length || 0,
    filteredEvents: filteredEvents?.length || 0,
    activeFilters,
    filteredEventsData: filteredEvents,
  });

  const getEventsByDate = (date: string) => {
    const events =
      filteredEvents?.filter(event => {
        const eventStart = event.startDate;
        const eventEnd = event.endDate || event.startDate;
        const currentDate = new Date(`${date}T00:00:00`);
        const startDate = new Date(`${eventStart}T00:00:00`);
        const endDate = new Date(`${eventEnd}T23:59:59`);
        return currentDate >= startDate && currentDate <= endDate;
      }) || [];

    // Ordenar eventos: eventos de múltiplos dias primeiro (maior duração = maior prioridade)
    return events.sort((a, b) => {
      const aIsMultiDay = isMultiDayEvent(a);
      const bIsMultiDay = isMultiDayEvent(b);

      if (aIsMultiDay && !bIsMultiDay) return -1;
      if (!aIsMultiDay && bIsMultiDay) return 1;

      if (aIsMultiDay && bIsMultiDay) {
        const aDuration =
          new Date(a.endDate || a.startDate).getTime() - new Date(a.startDate).getTime();
        const bDuration =
          new Date(b.endDate || b.startDate).getTime() - new Date(b.startDate).getTime();
        return bDuration - aDuration;
      }

      return a.title.localeCompare(b.title);
    });
  };

  const getBirthdaysForDate = (date: Date): BirthdayUser[] => {
    if (!showBirthdays) return [];

    const currentMonth = date.getMonth();
    const currentDay = date.getDate();

    return (birthdays.all || []).filter(user => {
      if (!user.birthDate) return false;

      let datePart = user.birthDate;
      if (user.birthDate.includes('T') && user.birthDate.includes('Z')) {
        datePart = user.birthDate.split('T')[0];
      }

      const [_year, month, day] = datePart.split('-');
      const birthMonth = parseInt(month) - 1;
      const birthDay = parseInt(day);

      return birthMonth === currentMonth && birthDay === currentDay;
    });
  };

  const monthDays = getDaysInMonth(currentDate);

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleDateClick = (dateString: string | null) => {
    if (!dateString) return;
    setSelectedDate(dateString);
    onDateClick?.(dateString);
  };

  const getEventsForDay = (dateString: string | null) => {
    if (!dateString) return [];
    return getEventsByDate(dateString);
  };

  if (isLoading) {
    return <div className="text-center py-8">Carregando calendário...</div>;
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-500">Erro ao carregar eventos: {error.message}</div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CalendarHeader
          currentDate={currentDate}
          onPreviousMonth={goToPreviousMonth}
          onNextMonth={goToNextMonth}
          onNewEvent={onNewEvent}
        />

        <CardContent>
          <MobileCalendarGrid
            monthDays={monthDays}
            selectedDate={selectedDate}
            getEventsForDay={getEventsForDay}
            getBirthdaysForDate={getBirthdaysForDate}
            onDateClick={handleDateClick}
            onEventClick={onEventClick}
          />

          <DesktopCalendarGrid
            monthDays={monthDays}
            selectedDate={selectedDate}
            expandedDays={expandedDays}
            getEventsForDay={getEventsForDay}
            getBirthdaysForDate={getBirthdaysForDate}
            onDateClick={handleDateClick}
            onEventClick={onEventClick}
            onToggleDayExpansion={toggleDayExpansion}
          />
        </CardContent>
      </Card>

      {selectedDate && (
        <SelectedDateEventsCard
          selectedDate={selectedDate}
          events={getEventsForDay(selectedDate)}
          onEventClick={onEventClick}
          onNewEvent={onNewEvent}
        />
      )}

      {showBirthdays && (
        <MonthBirthdaysCard
          currentDate={currentDate}
          birthdaysLoading={birthdaysLoading}
          allBirthdays={birthdays.all || []}
        />
      )}
    </div>
  );
});
