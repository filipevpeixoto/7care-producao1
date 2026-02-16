import { calendarLogger } from '@/lib/logger';
import { type CalendarEvent } from '@/types/calendar';

export const formatDateSafe = (dateString: string): string => {
  const [year, month, day] = dateString.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  return date.toLocaleDateString('pt-BR');
};

export const monthNames = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

export const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export const fetchEvents = async (userRole?: string): Promise<CalendarEvent[]> => {
  try {
    const meetings: Array<{ id: number; title?: string; requesterName?: string; description?: string; notes?: string; scheduledAt?: string; duration?: number; location?: string; status?: string; organizer?: string }> = [];
    const eventsResponse = await fetch(`/api/events?role=${userRole || 'interested'}`);
    const eventsApi = eventsResponse.ok ? await eventsResponse.json() : [];

    const eventsFromMeetings = meetings.map((meeting) => ({
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
      organizer: meeting.organizer || 'Sistema',
    }));

    const eventsFromApi = eventsApi.map((event: Record<string, unknown>) => {
      const eventDate = event.date || event.start_date || event.startDate;
      let startDate = '';

      if (eventDate) {
        if (typeof eventDate === 'string') {
          startDate = eventDate.split('T')[0];
        } else if (eventDate instanceof Date) {
          startDate = eventDate.toISOString().split('T')[0];
        }
      }

      let convertedEndDate = '';
      const eventEndDate = event.end_date || event.endDate;
      if (eventEndDate) {
        if (typeof eventEndDate === 'string') {
          convertedEndDate = eventEndDate.split('T')[0];
        } else if (eventEndDate instanceof Date) {
          convertedEndDate = eventEndDate.toISOString().split('T')[0];
        }
      }

      const convertedEvent = {
        id: event.id,
        title: event.title,
        description: event.description || '',
        startDate,
        time: event.time || event.start_time || '',
        duration: event.duration || 60,
        location: event.location || '',
        type: event.type || 'reunioes',
        status: event.status || 'scheduled',
        organizer: event.organizer || '',
        attendees: event.attendees || 0,
        maxAttendees: event.max_attendees || event.maxAttendees || 0,
        endDate: convertedEndDate,
        color: event.color || null,
      };

      return convertedEvent;
    });

    const allEvents = [...eventsFromMeetings, ...eventsFromApi];

    calendarLogger.debug('Resumo dos eventos:', {
      meetingsCount: eventsFromMeetings.length,
      apiEventsCount: eventsFromApi.length,
      totalEvents: allEvents.length,
      eventsResponse: eventsResponse.status,
      apiEvents: eventsApi.slice(0, 2),
      convertedEvents: eventsFromApi.slice(0, 2),
    });

    return allEvents;
  } catch (error) {
    calendarLogger.error('Erro ao buscar eventos:', error);
    return [];
  }
};

export const eventTypeColors = {
  'igreja-local':
    'bg-gradient-to-r from-red-500 to-red-600 text-white border-red-700 shadow-red-200',
  'asr-geral':
    'bg-gradient-to-r from-orange-500 to-orange-600 text-white border-orange-700 shadow-orange-200',
  'asr-administrativo':
    'bg-gradient-to-r from-cyan-500 to-cyan-600 text-white border-cyan-700 shadow-cyan-200',
  'asr-pastores':
    'bg-gradient-to-r from-purple-500 to-purple-600 text-white border-purple-700 shadow-purple-200',
  visitas:
    'bg-gradient-to-r from-green-500 to-green-600 text-white border-green-700 shadow-green-200',
  reunioes: 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-700 shadow-blue-200',
  pregacoes:
    'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white border-indigo-700 shadow-indigo-200',
};

export const getEventColor = (event: CalendarEvent) => {
  if (event.color) {
    const colorMap: { [key: string]: string } = {
      '#ef4444':
        'bg-gradient-to-r from-red-500 to-red-600 text-white border-red-700 shadow-red-200',
      '#f97316':
        'bg-gradient-to-r from-orange-500 to-orange-600 text-white border-orange-700 shadow-orange-200',
      '#06b6d4':
        'bg-gradient-to-r from-cyan-500 to-cyan-600 text-white border-cyan-700 shadow-cyan-200',
      '#8b5cf6':
        'bg-gradient-to-r from-purple-500 to-purple-600 text-white border-purple-700 shadow-purple-200',
      '#22c55e':
        'bg-gradient-to-r from-green-500 to-green-600 text-white border-green-700 shadow-green-200',
      '#3b82f6':
        'bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-700 shadow-blue-200',
      '#6366f1':
        'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white border-indigo-700 shadow-indigo-200',
    };

    if (colorMap[event.color]) {
      return colorMap[event.color];
    }
  }

  if (event.type && eventTypeColors[event.type]) {
    return eventTypeColors[event.type];
  }

  const title = event.title.toLowerCase();

  if (title.includes('igreja') && title.includes('local')) {
    return eventTypeColors['igreja-local'];
  } else if (title.includes('asr') && title.includes('geral')) {
    return eventTypeColors['asr-geral'];
  } else if (title.includes('asr') && title.includes('administrativo')) {
    return eventTypeColors['asr-administrativo'];
  } else if (title.includes('asr') && title.includes('pastores')) {
    return eventTypeColors['asr-pastores'];
  } else if (
    title.includes('visita') ||
    title.includes('evangelismo') ||
    title.includes('missao')
  ) {
    return eventTypeColors.visitas;
  } else if (title.includes('reuniao') || title.includes('reunião')) {
    return eventTypeColors.reunioes;
  } else if (title.includes('prega') || title.includes('sermao') || title.includes('culto')) {
    return eventTypeColors.pregacoes;
  }
  return eventTypeColors.reunioes;
};

export const eventTypeLabels = {
  'igreja-local': 'Igreja Local',
  'asr-geral': 'ASR Geral',
  'asr-administrativo': 'ASR Administrativo',
  'asr-pastores': 'ASR Pastores',
  visitas: 'Visitas',
  reunioes: 'Reuniões',
  pregacoes: 'Pregações',
};
