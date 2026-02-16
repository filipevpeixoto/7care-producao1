/**
 * @fileoverview Componente para exibir o próximo evento
 * Extraído do Dashboard para manter SRP
 */

import React from 'react';
import { Calendar } from 'lucide-react';
import type { Event } from '@/types/domain';

interface NextEventDisplayProps {
  events: Event[];
}

/**
 * Parseia valor de data de forma segura, evitando problemas de timezone
 */
function parseDate(v: unknown): Date | null {
  if (!v) return null;

  // CRÍTICO: Se for string ISO (YYYY-MM-DD), parsear manualmente para evitar timezone
  if (typeof v === 'string') {
    const isoMatch = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      const [, year, month, day] = isoMatch;
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
  }

  const d = new Date(v as string | number | Date);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Componente auxiliar para exibir próximo evento (prioriza eventos de hoje)
 */
export const NextEventDisplay: React.FC<NextEventDisplayProps> = ({ events }) => {
  if (!events || !Array.isArray(events)) {
    return <p className="text-xs text-gray-500">Sem próximos eventos</p>;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Mapeia e filtra eventos válidos
  const validEvents = [...events]
    .filter(e => e && typeof e === 'object')
    .map(e => {
      const startDate = e.startDate || e.date;
      const endDate = e.endDate || e.end_date;
      return {
        ...e,
        _start: parseDate(startDate),
        _end: endDate ? parseDate(endDate) : null,
      };
    })
    .filter(e => e._start);

  // 1. PRIORIDADE: Buscar eventos de HOJE (incluindo eventos de múltiplos dias)
  const todayEvents = validEvents
    .filter(e => {
      const eventStartDate = new Date(e._start as Date);
      const eventEndDate = e._end ? new Date(e._end as Date) : eventStartDate;

      const startTimestamp = new Date(
        eventStartDate.getFullYear(),
        eventStartDate.getMonth(),
        eventStartDate.getDate()
      ).getTime();

      const endTimestamp = new Date(
        eventEndDate.getFullYear(),
        eventEndDate.getMonth(),
        eventEndDate.getDate()
      ).getTime();

      const todayTimestamp = today.getTime();

      return todayTimestamp >= startTimestamp && todayTimestamp <= endTimestamp;
    })
    .sort((a, b) => (a._start as Date).getTime() - (b._start as Date).getTime());

  // 2. Se não tem evento hoje, buscar próximos eventos futuros
  const upcomingEvents = validEvents
    .filter(e => {
      const eventDate = new Date(e._start as Date);
      const eventTimestamp = new Date(
        eventDate.getFullYear(),
        eventDate.getMonth(),
        eventDate.getDate()
      ).getTime();
      return eventTimestamp >= today.getTime();
    })
    .sort((a, b) => (a._start as Date).getTime() - (b._start as Date).getTime());

  const eventToShow = todayEvents.length > 0 ? todayEvents[0] : upcomingEvents[0];

  if (!eventToShow) {
    return <p className="text-xs text-gray-500">Sem próximos eventos</p>;
  }

  const ev = eventToShow;
  const dt = ev._start as Date;
  const isToday = todayEvents.length > 0;
  const eventTitle = ev.title || 'Sem título';

  // Verificar se é evento de múltiplos dias
  const isMultiDay = ev._end && ev._end !== ev._start;
  let dateText: string;

  if (isMultiDay) {
    const startDate = new Date(ev._start as Date);
    const endDate = new Date(ev._end as Date);
    const startTimestamp = new Date(
      startDate.getFullYear(),
      startDate.getMonth(),
      startDate.getDate()
    ).getTime();
    const endTimestamp = new Date(
      endDate.getFullYear(),
      endDate.getMonth(),
      endDate.getDate()
    ).getTime();

    if (startTimestamp !== endTimestamp) {
      const startFormatted = startDate.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
      });
      const endFormatted = endDate.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
      });
      dateText = `${startFormatted} a ${endFormatted}`;
    } else {
      dateText = dt.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
      });
    }
  } else {
    dateText = dt.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
    });
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-blue-100/60 bg-gradient-to-br from-white to-blue-50/40 p-3 shadow-sm">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-700">
        <Calendar className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] uppercase tracking-wide text-blue-700/70">
          {isToday ? 'Evento HOJE' : 'Próximo evento'}
        </div>
        <div className="relative group">
          <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate cursor-help">
            {eventTitle}
          </div>
          {eventTitle.length > 30 && (
            <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-50 animate-in fade-in-0 zoom-in-95 duration-200">
              <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 text-white text-xs px-3 py-2 rounded-lg shadow-2xl max-w-xs border border-gray-700/50 backdrop-blur-sm">
                <div className="font-medium leading-relaxed">{eventTitle}</div>
                <div className="absolute top-full left-6 -mt-1">
                  <div className="border-4 border-transparent border-t-gray-900"></div>
                </div>
                <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/10 to-transparent pointer-events-none"></div>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="text-right">
        <div className="text-[11px] text-gray-500">Data</div>
        <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">{dateText}</div>
      </div>
    </div>
  );
};
