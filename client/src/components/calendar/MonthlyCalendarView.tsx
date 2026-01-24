import { useState, useMemo, useCallback, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus,
  Clock,
  MapPin,
  Users,
  Download,
  CalendarDays,
  Cake
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useEventFilterPermissions } from "@/hooks/useEventFilterPermissions";
import { CalendarEvent, EventType, EVENT_TYPES } from "@/types/calendar";
import { useBirthdays } from "@/hooks/useBirthdays";

// Função utilitária para formatar datas sem problemas de fuso horário
const formatDateSafe = (dateString: string): string => {
  const [year, month, day] = dateString.split('-');
  // CORRIGIDO: Usar data local em vez de UTC para evitar offset de um dia
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  return date.toLocaleDateString('pt-BR');
};

// Constantes do calendário
const monthNames = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// Função para determinar o gênero pelo nome (baseado em nomes brasileiros comuns)
const getGenderByName = (name: string): 'male' | 'female' => {
  const firstName = name.split(' ')[0].toLowerCase();
  
  // Nomes masculinos comuns
  const maleNames = [
    'joão', 'joao', 'pedro', 'lucas', 'gabriel', 'rafael', 'daniel', 'matheus', 'mateus',
    'andré', 'andre', 'carlos', 'eduardo', 'felipe', 'filipe', 'guilherme', 'gustavo',
    'henrique', 'leonardo', 'marcelo', 'marcos', 'márcio', 'marcio', 'paulo', 'ricardo',
    'rodrigo', 'thiago', 'tiago', 'victor', 'vitor', 'wagner', 'vagner', 'anderson',
    'enzo', 'joaquim', 'gabriel', 'anderson', 'vagner', 'enzo', 'joaquim'
  ];
  
  // Nomes femininos comuns
  const femaleNames = [
    'maria', 'ana', 'júlia', 'julia', 'sophia', 'sofia', 'isabella', 'isabela',
    'valentina', 'giovanna', 'giovana', 'alice', 'laura', 'beatriz', 'beatris',
    'manuela', 'júlia', 'julia', 'sophia', 'sofia', 'isabella', 'isabela',
    'valentina', 'giovanna', 'giovana', 'alice', 'laura', 'beatriz', 'beatris',
    'manuela', 'keli', 'oli', 'ruth', 'vivian', 'nelcy', 'diane', 'olga',
    'beti', 'suzimar', 'esperança', 'esperanca', 'mercedes', 'izabela'
  ];
  
  if (maleNames.includes(firstName)) return 'male';
  if (femaleNames.includes(firstName)) return 'female';
  
  // Se não conseguir determinar, assume feminino (padrão mais comum em nomes brasileiros)
  return 'female';
};

// Função para buscar eventos da API
const fetchEvents = async (userRole?: string): Promise<CalendarEvent[]> => {
  try {
    // Buscar reuniões da API (removido - página não existe mais)
    const meetings: any[] = [];
    
    // Buscar eventos da API com role do usuário
    const eventsResponse = await fetch(`/api/events?role=${userRole || 'interested'}`);
    const eventsApi = eventsResponse.ok ? await eventsResponse.json() : [];

    // Converter reuniões para o formato de eventos da agenda
    const eventsFromMeetings = meetings.map((meeting: any) => ({
      id: meeting.id,
      title: meeting.title || `Visita - ${meeting.requesterName || 'Usuário'}`,
      description: meeting.description || meeting.notes,
      startDate: meeting.scheduledAt ? meeting.scheduledAt.split('T')[0] : '',
      time: meeting.scheduledAt ? meeting.scheduledAt.split('T')[1]?.substring(0, 5) : '',
      duration: meeting.duration || 60,
      location: meeting.location,
      type: 'visitas' as const,
      attendees: 1,
      maxAttendees: 5,
      status: meeting.status || 'scheduled',
      organizer: meeting.organizer || 'Sistema'
    }));

    // Converter eventos da API para o formato da agenda
    const eventsFromApi = eventsApi.map((event: any) => {
      // Converter a data para formato YYYY-MM-DD - CORRIGIDO para lidar com objetos Date
      const eventDate = event.date || event.start_date || event.startDate;
      let startDate = '';
      
      if (eventDate) {
        if (typeof eventDate === 'string') {
          startDate = eventDate.split('T')[0];
        } else if (eventDate instanceof Date) {
          // CORRIGIDO: Usar UTC para evitar problemas de fuso horário
          startDate = eventDate.toISOString().split('T')[0];
        }
      }
      
      // Converter endDate também para formato YYYY-MM-DD se existir
      let convertedEndDate = '';
      const eventEndDate = event.end_date || event.endDate;
      if (eventEndDate) {
        if (typeof eventEndDate === 'string') {
          convertedEndDate = eventEndDate.split('T')[0];
        } else if (eventEndDate instanceof Date) {
          convertedEndDate = eventEndDate.toISOString().split('T')[0];
        }
        // console.log(`🔍 Conversão de endDate para "${event.title}":`, {
        //   originalEndDate: eventEndDate,
        //   convertedEndDate,
        //   type: typeof eventEndDate
        // });
      }

      // console.log('🔄 Convertendo evento:', { 
      //   original: event, 
      //   eventDate, 
      //   startDate,
      //   eventDateType: typeof eventDate,
      //   endDate: eventEndDate,
      //   convertedEndDate: convertedEndDate,
      //   isMultiDay: convertedEndDate && startDate !== convertedEndDate,
      //   title: event.title
      // });

      const convertedEvent = {
        id: event.id,
        title: event.title,
        description: event.description,
        startDate: startDate,
        endDate: convertedEndDate || undefined,
        time: undefined,
        duration: undefined,
        location: event.location,
        type: event.type,
        attendees: undefined,
        maxAttendees: undefined,
        status: 'confirmed',
        organizer: event.organizerId ? `ID ${event.organizerId}` : 'Sistema'
      };
      
      return convertedEvent;
    });

    // Combinar todos os eventos (apenas dados reais do banco)
    const allEvents = [...eventsFromMeetings, ...eventsFromApi];
    
    console.log('📊 Resumo dos eventos:', {
      meetingsCount: eventsFromMeetings.length,
      apiEventsCount: eventsFromApi.length,
      totalEvents: allEvents.length,
      eventsResponse: eventsResponse.status,
      apiEvents: eventsApi.slice(0, 2), // Mostrar apenas os primeiros 2 eventos da API
      convertedEvents: eventsFromApi.slice(0, 2) // Mostrar apenas os primeiros 2 eventos convertidos
    });

    return allEvents;
  } catch (error) {
    console.error('❌ Erro ao buscar eventos:', error);
    return [];
  }
};

const eventTypeColors = {
  "igreja-local": "bg-gradient-to-r from-red-500 to-red-600 text-white border-red-700 shadow-red-200",
  "asr-geral": "bg-gradient-to-r from-orange-500 to-orange-600 text-white border-orange-700 shadow-orange-200",
  "asr-administrativo": "bg-gradient-to-r from-cyan-500 to-cyan-600 text-white border-cyan-700 shadow-cyan-200",
  "asr-pastores": "bg-gradient-to-r from-purple-500 to-purple-600 text-white border-purple-700 shadow-purple-200",
  "visitas": "bg-gradient-to-r from-green-500 to-green-600 text-white border-green-700 shadow-green-200",
  "reunioes": "bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-700 shadow-blue-200",
  "pregacoes": "bg-gradient-to-r from-indigo-500 to-indigo-600 text-white border-indigo-700 shadow-indigo-200"
};

// Função para determinar a cor baseada no tipo do evento
const getEventColor = (event: CalendarEvent) => {
  // Primeiro, tentar usar a cor salva no banco de dados
  if (event.color) {
    // Converter cor hexadecimal para classes Tailwind
    const colorMap: { [key: string]: string } = {
      '#ef4444': 'bg-gradient-to-r from-red-500 to-red-600 text-white border-red-700 shadow-red-200',
      '#f97316': 'bg-gradient-to-r from-orange-500 to-orange-600 text-white border-orange-700 shadow-orange-200',
      '#06b6d4': 'bg-gradient-to-r from-cyan-500 to-cyan-600 text-white border-cyan-700 shadow-cyan-200',
      '#8b5cf6': 'bg-gradient-to-r from-purple-500 to-purple-600 text-white border-purple-700 shadow-purple-200',
      '#22c55e': 'bg-gradient-to-r from-green-500 to-green-600 text-white border-green-700 shadow-green-200',
      '#3b82f6': 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-700 shadow-blue-200',
      '#6366f1': 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white border-indigo-700 shadow-indigo-200'
    };
    
    if (colorMap[event.color]) {
      return colorMap[event.color];
    }
  }
  
  // Segundo, tentar usar o tipo do evento se estiver disponível
  if (event.type && eventTypeColors[event.type]) {
    return eventTypeColors[event.type];
  }
  
  // Fallback: mapear cores baseado no conteúdo do título para as 7 categorias
  const title = event.title.toLowerCase();
  
  if (title.includes('igreja') && title.includes('local')) {
    return eventTypeColors['igreja-local'];
  } else if (title.includes('asr') && title.includes('geral')) {
    return eventTypeColors['asr-geral'];
  } else if (title.includes('asr') && title.includes('administrativo')) {
    return eventTypeColors['asr-administrativo'];
  } else if (title.includes('asr') && title.includes('pastores')) {
    return eventTypeColors['asr-pastores'];
  } else if (title.includes('visita') || title.includes('evangelismo') || title.includes('missao')) {
    return eventTypeColors.visitas;
  } else if (title.includes('reuniao') || title.includes('reunião')) {
    return eventTypeColors.reunioes;
  } else if (title.includes('prega') || title.includes('sermao') || title.includes('culto')) {
    return eventTypeColors.pregacoes;
  } else {
    // Cor padrão para reuniões genéricas
    return eventTypeColors.reunioes;
  }
};

const eventTypeLabels = {
  "igreja-local": "Igreja Local",
  "asr-geral": "ASR Geral",
  "asr-administrativo": "ASR Administrativo",
  "asr-pastores": "ASR Pastores",
  "visitas": "Visitas",
  "reunioes": "Reuniões",
  "pregacoes": "Pregações"
};

interface BirthdayUser {
  id: number;
  name: string;
  phone?: string;
  birthDate: string;
  profilePhoto?: string;
  church?: string | null;
}

interface MonthlyCalendarViewProps {
  onEventClick?: (event: CalendarEvent) => void;
  onNewEvent?: () => void;
  onDateClick?: (date: string) => void;
  activeFilters?: string[];
  eventTypes?: EventType[];
  showBirthdays?: boolean;
  events?: CalendarEvent[]; // Eventos passados via props
}

export const MonthlyCalendarView = memo(function MonthlyCalendarView({ 
  onEventClick, 
  onNewEvent, 
  onDateClick,
  events: propsEvents, 
  activeFilters = [],
  eventTypes = [],
  showBirthdays = false
}: MonthlyCalendarViewProps) {
  
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
  console.log('🎂 Estado dos aniversariantes:', { 
    showBirthdays, 
    birthdaysCount: birthdays.all?.length || 0,
    thisMonthCount: birthdays.thisMonth?.length || 0,
    isLoading: birthdaysLoading,
    currentMonth: currentDate.getMonth(),
    currentMonthName: monthNames[currentDate.getMonth()]
  });

  // Buscar eventos da API
  const { data: allEvents, isLoading, error } = useQuery<CalendarEvent[]>({
    queryKey: ['events', user?.role],
    queryFn: () => fetchEvents(user?.role),
    enabled: !!user?.role,
  });

  // Debug log para verificar os eventos carregados
  console.log('📅 [MonthlyCalendarView] Eventos:', { 
    source: propsEvents && propsEvents.length > 0 ? 'props' : 'api fetch',
    propsEventsCount: propsEvents?.length || 0,
    fetchedEventsCount: allEvents?.length || 0,
    finalEventsCount: allEvents?.length || 0,
    isLoading,
    error
  });

  const filteredEvents = allEvents?.filter(event => {
    // Verificar se o usuário tem permissão para ver este tipo de evento
    if (user?.role && !canFilterEventType(user.role, event.type)) {
      return false;
    }

    // Use activeFilters from props
    if (activeFilters.length > 0) {
      const isIncluded = activeFilters.includes(event.type);
      console.log(`🔍 Filtro de evento "${event.title}":`, {
        eventType: event.type,
        activeFilters,
        isIncluded
      });
      return isIncluded;
    }
    // If no filters are active, show all events
    return true;
  });

  console.log('🔍 Eventos filtrados:', {
    totalEvents: allEvents?.length || 0,
    filteredEvents: filteredEvents?.length || 0,
    activeFilters,
    filteredEventsData: filteredEvents
  });

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEventsByDate = (date: string) => {
    console.log(`🔍 getEventsByDate para ${date}:`, {
      filteredEventsCount: filteredEvents?.length || 0,
      filteredEvents: filteredEvents
    });
    
    const events = filteredEvents?.filter(event => {
      const eventStart = event.startDate;
      const eventEnd = event.endDate || event.startDate;
      
      // Converter strings de data para objetos Date para comparação mais precisa
      const currentDate = new Date(date + 'T00:00:00');
      const startDate = new Date(eventStart + 'T00:00:00');
      const endDate = new Date(eventEnd + 'T23:59:59'); // Incluir o dia inteiro
      
      const isInRange = currentDate >= startDate && currentDate <= endDate;
      const isMultiDay = event.endDate && event.startDate !== event.endDate;
      
      // Log específico para eventos de múltiplos dias
      // if (isMultiDay) {
      //   console.log(`🔍 EVENTO DE MÚLTIPLOS DIAS "${event.title}":`, {
      //     date,
      //     eventStart,
      //     eventEnd,
      //     currentDate: currentDate.toISOString(),
      //     startDate: startDate.toISOString(),
      //     endDate: endDate.toISOString(),
      //     isInRange,
      //     isMultiDay,
      //     comparison: {
      //       dateGreaterThanStart: currentDate >= startDate,
      //       dateLessThanEnd: currentDate <= endDate,
      //       startDateString: eventStart,
      //       endDateString: eventEnd
      //     }
      //   });
      // }
      
      // console.log(`🔍 Verificando evento "${event.title}":`, {
      //   date,
      //   eventStart,
      //   eventEnd,
      //   isInRange,
      //   isMultiDay
      // });
      
      return isInRange;
    }) || [];

    console.log(`🔍 Eventos encontrados para ${date}:`, events);
    
    // Ordenar eventos: eventos de múltiplos dias primeiro (maior duração = maior prioridade)
    return events.sort((a, b) => {
      const aIsMultiDay = isMultiDayEvent(a);
      const bIsMultiDay = isMultiDayEvent(b);
      
      // Se um é de múltiplos dias e outro não, o de múltiplos dias vem primeiro
      if (aIsMultiDay && !bIsMultiDay) return -1;
      if (!aIsMultiDay && bIsMultiDay) return 1;
      
      // Se ambos são de múltiplos dias, ordenar por duração (maior duração primeiro)
      if (aIsMultiDay && bIsMultiDay) {
        const aDuration = new Date(a.endDate || a.startDate).getTime() - new Date(a.startDate).getTime();
        const bDuration = new Date(b.endDate || b.startDate).getTime() - new Date(b.startDate).getTime();
        return bDuration - aDuration; // Maior duração primeiro
      }
      
      // Se ambos são de um dia, manter ordem original (por título)
      return a.title.localeCompare(b.title);
    });
  };

  const getBirthdaysForDate = (date: Date): BirthdayUser[] => {
    if (!showBirthdays) {
      console.log('🎂 showBirthdays está false, retornando array vazio');
      return [];
    }
    
    // Usar data local para consistência com o servidor
    const currentMonth = date.getMonth();
    const currentDay = date.getDate();
    
    console.log(`🎂 Verificando aniversariantes para ${currentDay}/${currentMonth + 1}`);
    console.log(`🎂 Total de aniversariantes disponíveis: ${birthdays.all?.length || 0}`);
    
    // Filtrar aniversariantes do mês atual do calendário (não do mês atual do sistema)
    const filteredBirthdays = (birthdays.all || []).filter(user => {
      if (!user.birthDate) return false;
      
      // Parse da data de nascimento - CORRIGIDO para lidar com datas ISO
      let datePart = user.birthDate;
      if (user.birthDate.includes('T') && user.birthDate.includes('Z')) {
        datePart = user.birthDate.split('T')[0]; // Pega apenas YYYY-MM-DD
      }
      
      const [year, month, day] = datePart.split('-');
      const birthMonth = parseInt(month) - 1; // Mês começa em 0
      const birthDay = parseInt(day);
      
      console.log(`🎂 ${user.name}: ${birthDay}/${birthMonth + 1} vs ${currentDay}/${currentMonth + 1}`);
      
      // Compara mês e dia - CORRIGIDO
      const matches = birthMonth === currentMonth && birthDay === currentDay;
      
      if (matches) {
        console.log(`🎂 ✅ MATCH: ${user.name} faz aniversário em ${birthDay}/${birthMonth + 1}`);
      }
      
      return matches;
    });
    
    console.log(`🎂 Total de aniversariantes para ${currentDay}/${currentMonth + 1}: ${filteredBirthdays.length}`);
    
    return filteredBirthdays;
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDay = firstDay.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    const days: Array<string | null> = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      days.push(dateString);
    }
    
    return days;
  };

  const monthDays: Array<string | null> = getDaysInMonth(currentDate);
  
  // Debug log para verificar os dias do mês
  // console.log('📅 Dias do mês gerados:', {
  //   currentMonth: currentDate.getMonth() + 1,
  //   currentYear: currentDate.getFullYear(),
  //   monthDays: monthDays.filter(day => day !== null)
  // });
  
  // Debug log para verificar a data atual
  console.log('📅 Data atual do calendário:', {
    currentMonth: currentDate.getMonth(),
    currentMonthName: monthNames[currentDate.getMonth()],
    currentYear: currentDate.getFullYear()
  });
  
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };
  
  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };
  

  
  const isToday = (dateString: string | null) => {
    if (!dateString) return false;
    // CORRIGIDO: Usar UTC para evitar problemas de fuso horário
    const today = new Date();
    const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
    const todayString = todayUTC.toISOString().split('T')[0];
    return dateString === todayString;
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

  // Função para verificar se um evento é de múltiplos dias
  const isMultiDayEvent = (event: CalendarEvent) => {
    const isMultiDay = event.endDate && event.startDate !== event.endDate;
      // console.log(`🔍 Verificando se "${event.title}" é de múltiplos dias:`, {
      //   startDate: event.startDate,
      //   endDate: event.endDate,
      //   hasEndDate: !!event.endDate,
      //   datesAreDifferent: event.startDate !== event.endDate,
      //   isMultiDay
      // });
    return isMultiDay;
  };

  // Função para verificar se um evento é o primeiro dia de um evento de múltiplos dias
  const isFirstDayOfMultiDayEvent = (event: CalendarEvent, dateString: string) => {
    return isMultiDayEvent(event) && event.startDate === dateString;
  };

  // Função para verificar se um evento é o último dia de um evento de múltiplos dias
  const isLastDayOfMultiDayEvent = (event: CalendarEvent, dateString: string) => {
    return isMultiDayEvent(event) && event.endDate === dateString;
  };

  // Função para verificar se um evento é um dia intermediário de um evento de múltiplos dias
  const isMiddleDayOfMultiDayEvent = (event: CalendarEvent, dateString: string) => {
    return isMultiDayEvent(event) && 
           event.endDate && 
           dateString > event.startDate && 
           dateString < event.endDate;
  };

  if (isLoading) {
    return <div className="text-center py-8">Carregando calendário...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">Erro ao carregar eventos: {error.message}</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </CardTitle>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={goToPreviousMonth}
                data-testid="previous-month"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={goToNextMonth}
                data-testid="next-month"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>

              <Button
                size="sm"
                onClick={onNewEvent}
                className="bg-primary hover:bg-primary-dark"
                data-testid="new-event"
              >
                <Plus className="h-4 w-4 mr-1" />
                Novo Evento
              </Button>
            </div>
          </div>

          {/* Filter */}
          {/* Removido: botões de filtro individuais - usando outro modo de filtro */}
        </CardHeader>

        {/* Calendar Grid */}
        <CardContent>
          {/* Mobile Layout - Calendário simplificado */}
          <div className="block sm:hidden">
            <div className="grid grid-cols-7 gap-1 mb-4">
              {/* Day headers */}
              {dayNames.map((day) => (
                <div
                  key={day}
                  className="p-2 text-center text-sm font-medium text-muted-foreground border-b"
                >
                  {day}
                </div>
              ))}

              {/* Calendar days - Mobile: apenas números */}
              {monthDays.map((dateString, index) => {
                const dayEvents = getEventsForDay(dateString);
                const isCurrentDay = isToday(dateString);
                const isSelected = selectedDate === dateString;
                
                return (
                  <div
                    key={index}
                    className={cn(
                      "min-h-[50px] p-2 border border-border cursor-pointer hover:bg-muted/50 transition-colors flex flex-col items-center justify-center",
                      isCurrentDay && "bg-primary/10 border-primary text-primary font-bold",
                      isSelected && "bg-primary/20 border-primary",
                      !dateString && "bg-muted/20 cursor-not-allowed"
                    )}
                    onClick={() => handleDateClick(dateString)}
                    data-testid={dateString ? `calendar-day-${dateString}` : `empty-day-${index}`}
                  >
                    {dateString && (
                      <>
                        <div className="text-base font-medium">
                          {parseInt(dateString.split('-')[2])}
                        </div>
                        {/* Indicador de eventos - barras coloridas por categoria */}
                        {dayEvents.length > 0 && (
                          <div className="flex gap-0.5 mt-1 justify-center">
                            {(() => {
                              // Agrupar eventos por tipo para mostrar uma barra por categoria
                              const eventsByType = dayEvents.reduce((acc, event) => {
                                if (!acc[event.type]) {
                                  acc[event.type] = [];
                                }
                                acc[event.type].push(event);
                                return acc;
                              }, {} as Record<string, CalendarEvent[]>);
                              
                              // Mostrar até 4 barras (uma por categoria)
                              const eventTypes = Object.keys(eventsByType).slice(0, 4);
                              
                              return eventTypes.map((eventType, index) => {
                                const eventTypeConfig = EVENT_TYPES.find(et => et.id === eventType);
                                const colorClass = eventTypeConfig?.color || 'bg-gray-500';
                                
                                return (
                                  <div
                                    key={`${dateString}-${eventType}-${index}`}
                                    className={`w-2 h-1 rounded-full ${colorClass}`}
                                    title={`${eventTypeConfig?.label || eventType}: ${eventsByType[eventType].length} evento(s)`}
                                  />
                                );
                              });
                            })()}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Lista de eventos do dia selecionado - Mobile */}
            {selectedDate && (
              <div className="mt-4 space-y-1">
                <h3 className="text-lg font-semibold text-center mb-3">
                  Eventos do dia {parseInt(selectedDate.split('-')[2])}
                </h3>
                {getEventsForDay(selectedDate).map((event) => {
                  const isMultiDay = isMultiDayEvent(event);
                  const isFirstDay = isFirstDayOfMultiDayEvent(event, selectedDate);
                  const isLastDay = isLastDayOfMultiDayEvent(event, selectedDate);
                  const isMiddleDay = isMiddleDayOfMultiDayEvent(event, selectedDate);
                  
                  return (
                    <div
                      key={event.id}
                      className={cn(
                        "text-xs p-1.5 rounded-lg border-2 cursor-pointer hover:scale-105 hover:shadow-lg transition-all duration-200 shadow-md relative group overflow-hidden min-h-[2.5rem] flex flex-col",
                        getEventColor(event),
                        // Estilos especiais para eventos de múltiplos dias - barra contínua elegante
                        isMultiDay && "border-2 shadow-lg",
                        isFirstDay && "rounded-l-lg rounded-r-none border-l-4 border-r-0",
                        isLastDay && "rounded-r-lg rounded-l-none border-r-4 border-l-0",
                        isMiddleDay && "rounded-none border-l-0 border-r-0"
                      )}
                      onClick={() => onEventClick?.(event)}
                      data-testid={`mobile-event-${event.id}`}
                      title={isMultiDay ? `${event.title} (${event.startDate} - ${event.endDate})` : event.title}
                    >
                      {/* Efeito de brilho sutil */}
                      <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg"></div>
                      
                      <div className="relative z-10">
                        <div className="font-semibold flex items-start gap-1.5 text-xs leading-tight">
                          {isMultiDay && <CalendarDays className="h-3 w-3 flex-shrink-0 mt-0.5" />}
                          <span className="text-xs font-medium break-words leading-tight min-h-[1.2em]">
                            {isMultiDay ? (
                              isFirstDay ? `${event.title} (Início)` :
                              isLastDay ? `${event.title} (Fim)` :
                              event.title // Mostra o nome completo do evento nos dias intermediários
                            ) : event.title}
                          </span>
                        </div>
                        
                        {event.time && (
                          <div className="mt-1">
                            <span className="text-xs opacity-90">
                              {formatTime(event.time)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                
                {/* Aniversariantes do dia selecionado */}
                {(() => {
                  const [year, month, day] = selectedDate.split('-');
                  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                  const dayBirthdays = getBirthdaysForDate(date);
                  
                  return dayBirthdays.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-md font-semibold mb-2">Aniversariantes</h4>
                      {dayBirthdays.map((birthday) => (
                        <div
                          key={`mobile-birthday-${birthday.id}`}
                          className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-pink-400 to-pink-500 text-white border-2 border-pink-600 cursor-pointer hover:shadow-lg transition-all duration-200 shadow-md"
                          data-testid={`mobile-birthday-${birthday.id}`}
                        >
                          <Cake className="h-5 w-5" />
                          <div className="flex-1">
                            <div className="font-medium">{birthday.name}</div>
                            <div className="text-sm opacity-90">Aniversário</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Desktop Layout - Calendário completo */}
          <div className="hidden sm:block">
            <div className="grid grid-cols-7 gap-1 mb-4">
            {/* Day headers */}
            {dayNames.map((day) => (
              <div
                key={day}
                className="p-2 sm:p-2 p-3 text-center text-sm font-medium text-muted-foreground border-b"
              >
                {day}
              </div>
            ))}

            {/* Calendar days */}
            {monthDays.map((dateString, index) => {
              const dayEvents = getEventsForDay(dateString);
              const isCurrentDay = isToday(dateString);
              const isSelected = selectedDate === dateString;
              
              // Obter aniversariantes para este dia
              let dayBirthdays: BirthdayUser[] = [];
              if (dateString) {
                // CORRIGIDO: Usar data local para evitar problemas de fuso horário
                const [year, month, day] = dateString.split('-');
                const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                
                dayBirthdays = getBirthdaysForDate(date);
                console.log(`🎂 Dia ${dateString} (${day}/${month}): ${dayBirthdays.length} aniversariantes encontrados`);
                
                // Debug adicional
                if (dayBirthdays.length > 0) {
                  console.log(`🎂 Aniversariantes para ${dateString}:`, dayBirthdays.map(b => b.name));
                }
              }

              return (
                <div
                  key={index}
                  className={cn(
                    "min-h-[120px] sm:min-h-[120px] min-h-[140px] p-1 sm:p-1 p-2 border border-border cursor-pointer hover:bg-muted/50 transition-colors",
                    isCurrentDay && "bg-primary/10 border-primary",
                    isSelected && "bg-primary/20",
                    !dateString && "bg-muted/20 cursor-not-allowed"
                  )}
                  onClick={() => handleDateClick(dateString)}
                  data-testid={dateString ? `calendar-day-${dateString}` : `empty-day-${index}`}
                >
                  {dateString && (
                    <>
                      {/* Day number */}
                      <div className={cn(
                        "text-base sm:text-sm font-medium mb-1",
                        isCurrentDay && "text-primary font-bold"
                      )}>
                        {parseInt(dateString.split('-')[2])}
                      </div>

                      {/* Events - Prioridade alta para manter na mesma linha */}
                      <div className="space-y-1 sm:space-y-0.5 mb-1 flex flex-col">
                        {(expandedDays.has(dateString) ? dayEvents : dayEvents.slice(0, 3)).map((event) => {
                          const isMultiDay = isMultiDayEvent(event);
                          const isFirstDay = isFirstDayOfMultiDayEvent(event, dateString);
                          const isLastDay = isLastDayOfMultiDayEvent(event, dateString);
                          const isMiddleDay = isMiddleDayOfMultiDayEvent(event, dateString);
                          
                          return (
                            <div
                              key={event.id}
                              className={cn(
                                "text-xs sm:text-xs text-sm p-2 sm:p-1.5 rounded-lg border-2 cursor-pointer hover:scale-105 hover:shadow-lg transition-all duration-200 shadow-md relative group overflow-hidden min-h-[3rem] sm:min-h-[2.5rem] flex flex-col",
                                getEventColor(event),
                                // Estilos especiais para eventos de múltiplos dias - barra contínua elegante
                                isMultiDay && "border-2 shadow-lg",
                                isFirstDay && "rounded-l-lg rounded-r-none border-l-4 border-r-0",
                                isLastDay && "rounded-r-lg rounded-l-none border-r-4 border-l-0",
                                isMiddleDay && "rounded-none border-l-0 border-r-0"
                              )}
                              onClick={(e) => {
                                e.stopPropagation();
                                onEventClick?.(event);
                              }}
                              data-testid={`event-${event.id}`}
                              title={isMultiDay ? `${event.title} (${event.startDate} - ${event.endDate})` : event.title}
                            >
                              {/* Efeito de brilho sutil */}
                              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg"></div>
                              
                              <div className="relative z-10">
                                <div className="font-semibold flex items-start gap-1.5 text-sm sm:text-xs leading-tight">
                                  {isMultiDay && <CalendarDays className="h-4 w-4 sm:h-3 sm:w-3 flex-shrink-0 mt-0.5" />}
                                  <span className="text-sm sm:text-xs font-medium break-words leading-tight min-h-[1.2em]">
                                    {isMultiDay ? (
                                      isFirstDay ? `${event.title} (Início)` :
                                      isLastDay ? `${event.title} (Fim)` :
                                      event.title // Mostra o nome completo do evento nos dias intermediários
                                    ) : event.title}
                                  </span>
                                </div>
                                
                                {event.time && (
                                  <div className="mt-1">
                                    <span className="text-sm sm:text-xs opacity-90">
                                      {formatTime(event.time)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        
                        {/* Show "+X more" if there are more events */}
                        {dayEvents.length > 3 && !expandedDays.has(dateString) && (
                          <div 
                            className="text-xs text-muted-foreground text-center py-1 px-2 bg-gray-100/80 rounded-md border border-gray-200 hover:bg-gray-200/80 transition-colors cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleDayExpansion(dateString);
                            }}
                          >
                            <span className="font-medium">+{dayEvents.length - 3} mais eventos</span>
                          </div>
                        )}
                        
                        {/* Show "Ver menos" if day is expanded */}
                        {dayEvents.length > 3 && expandedDays.has(dateString) && (
                          <div 
                            className="text-xs text-muted-foreground text-center py-1 px-2 bg-gray-100/80 rounded-md border border-gray-200 hover:bg-gray-200/80 transition-colors cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleDayExpansion(dateString);
                            }}
                          >
                            <span className="font-medium">Ver menos</span>
                          </div>
                        )}
                      </div>

                      {/* Aniversariantes - Posicionados abaixo dos eventos */}
                      <div className="flex flex-col space-y-1 sm:space-y-0.5">
                        {dayBirthdays.map((birthday) => (
                          <div
                            key={`birthday-${birthday.id}`}
                            className="p-2 sm:p-1.5 rounded-lg text-sm sm:text-xs cursor-pointer hover:scale-105 hover:shadow-lg transition-all duration-200 shadow-md bg-gradient-to-r from-pink-400 to-pink-500 text-white border-2 border-pink-600 flex-shrink-0 group relative overflow-hidden min-h-[2.5rem] sm:min-h-[2rem]"
                            data-testid={`birthday-${birthday.id}`}
                          >
                            {/* Efeito de brilho sutil */}
                            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg"></div>
                            
                            <div className="relative z-10">
                              <div className="flex items-center gap-1.5">
                                <Cake className="h-4 w-4 sm:h-3 sm:w-3 flex-shrink-0" />
                                <span className="font-semibold break-words text-sm sm:text-xs">{birthday.name}</span>
                              </div>
                              <div className="text-sm sm:text-xs opacity-90 mt-0.5 flex items-center gap-1">
                                <div className="w-1 h-1 bg-white/60 rounded-full"></div>
                                <span>Aniversário</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected Date Events - Desktop only */}
      {selectedDate && (
        <Card className="hidden sm:block">
          <CardHeader>
            <CardTitle className="text-lg">
              Eventos do dia {formatDateSafe(selectedDate)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {getEventsForDay(selectedDate).length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  <CalendarIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Nenhum evento neste dia</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={onNewEvent}
                    data-testid="add-event-selected-date"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar Evento
                  </Button>
                </div>
              ) : (
                getEventsForDay(selectedDate).map((event) => {
                  const isMultiDay = isMultiDayEvent(event);
                  const isFirstDay = isFirstDayOfMultiDayEvent(event, selectedDate);
                  const isLastDay = isLastDayOfMultiDayEvent(event, selectedDate);
                  const isMiddleDay = isMiddleDayOfMultiDayEvent(event, selectedDate);
                  
                  return (
                    <div
                      key={event.id}
                      className={cn(
                        "p-2 border rounded-lg hover:shadow-md transition-shadow cursor-pointer",
                        isMultiDay && "border-2",
                        isFirstDay && "border-l-4 border-l-green-500 rounded-l-lg",
                        isLastDay && "border-r-4 border-r-red-500 rounded-r-lg",
                        isMiddleDay && "border-t-2 border-b-2 border-t-blue-500 border-b-blue-500 rounded-none"
                      )}
                      onClick={() => onEventClick?.(event)}
                      data-testid={`detailed-event-${event.id}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-sm">
                              {isMultiDay ? (
                                isFirstDay ? `${event.title} (Início)` :
                                isLastDay ? `${event.title} (Fim)` :
                                `${event.title} (Continua)`
                              ) : event.title}
                            </h3>
                            {isMultiDay && (
                              <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                                <CalendarDays className="h-3 w-3 mr-1" />
                                {isFirstDay ? "Início" : isLastDay ? "Fim" : "Continua"}
                              </Badge>
                            )}
                          </div>
                          {event.description && (
                            <p className="text-muted-foreground mt-1 text-xs">{event.description}</p>
                          )}
                          
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span className="text-xs">{event.time ? formatTime(event.time) : ''} ({event.duration || 60}min)</span>
                            </div>
                            
                            {event.location && (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                <span className="text-xs">{event.location}</span>
                              </div>
                            )}
                            
                            {event.attendees && event.maxAttendees && (
                              <div className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                <span className="text-xs">{event.attendees}/{event.maxAttendees}</span>
                              </div>
                            )}
                            
                            {isMultiDay && (
                              <div className="flex items-center gap-1">
                                <CalendarDays className="h-3 w-3" />
                                <span className="text-xs">
                                  {isFirstDay && "Início"}
                                  {isLastDay && "Fim"}
                                  {isMiddleDay && "Continua"}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <Badge className={`${eventTypeColors[event.type]} font-medium shadow-sm text-xs`}>
                          {eventTypeLabels[event.type]}
                        </Badge>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      )}

              {/* Aniversariantes do Mês */}
        {showBirthdays && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-green-800">
                <Cake className="h-4 w-4 text-green-600" />
                Aniversariantes de {monthNames[currentDate.getMonth()]}
              </CardTitle>
            </CardHeader>
          <CardContent>
            {birthdaysLoading ? (
              <div className="text-center py-4 text-muted-foreground">
                Carregando aniversariantes...
              </div>
            ) : (() => {
              const currentMonthBirthdays = (birthdays.all || []).filter(birthday => {
                if (!birthday.birthDate) return false;
                const [year, month] = birthday.birthDate.split('-');
                const birthMonth = parseInt(month) - 1;
                // CORRIGIDO: Usar UTC para evitar problemas de fuso horário
                return birthMonth === currentDate.getUTCMonth();
              });
              
              return currentMonthBirthdays.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  Nenhum aniversariante em {monthNames[currentDate.getMonth()]}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {currentMonthBirthdays.map((birthday) => {
                  const birthDate = birthday.birthDate;
                  let day = '';
                  let month = '';
                  
                  // Parse da data usando data local para evitar problemas de fuso horário
                  if (birthDate.includes('-')) {
                    const [year, monthStr, dayStr] = birthDate.split('-');
                    day = dayStr;
                    month = monthStr;
                  } else if (birthDate.includes('/')) {
                    const [dayStr, monthStr, year] = birthDate.split('/');
                    day = dayStr;
                    month = monthStr;
                  }
                  
                  return (
                    <div
                      key={birthday.id}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-green-50 border-green-200"
                      data-testid={`birthday-card-${birthday.id}`}
                    >
                      <div className="text-center">
                        <div className="text-lg font-bold text-green-600">{day}</div>
                        <div className="text-xs text-green-500">{monthNames[parseInt(month) - 1]}</div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{birthday.name}</div>
                        {birthday.church && (
                          <div className="text-xs text-muted-foreground truncate">
                            {birthday.church}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              );
            })()}
          </CardContent>
        </Card>
      )}
    </div>
  );
});