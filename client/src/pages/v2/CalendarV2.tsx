import { useMemo, useState } from 'react';
import { CalendarPlus, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import type { CalendarEvent } from '@/types/calendar';
import { PrototypeStatusBar } from './prototypeShared';
import { ThemeToggle } from '@/components/v2/ThemeToggle';

interface CalendarV2Props {
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onCreateEvent?: (date?: Date) => void;
}

const weekLabels = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const dayKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const parseEventDate = (value?: string | null) => {
  if (!value) return null;
  const [datePart] = value.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  if (year && month && day) return new Date(year, month - 1, day);
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getEventTone = (event: CalendarEvent) => {
  const type = String(event.type);
  if (type.includes('culto') || type.includes('igreja')) return 'navy';
  if (type.includes('oracao') || type.includes('pregacao') || type.includes('especial'))
    {return 'gold';}
  if (type.includes('visita')) return 'green';
  return 'soft';
};

export const CalendarV2 = ({ events, onEventClick, onCreateEvent }: CalendarV2Props) => {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  });

  const monthLabel = currentMonth.toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });

  const eventsByDate = useMemo(() => {
    const grouped = new Map<string, CalendarEvent[]>();

    events.forEach((event) => {
      const start = parseEventDate(event.startDate);
      if (!start) return;

      const end = parseEventDate(event.endDate) ?? start;
      const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());

      while (cursor <= last) {
        const key = dayKey(cursor);
        grouped.set(key, [...(grouped.get(key) ?? []), event]);
        cursor.setDate(cursor.getDate() + 1);
      }
    });

    grouped.forEach((dayEvents, key) => {
      grouped.set(
        key,
        [...dayEvents].sort((a, b) => {
          const timeA = a.time || '99:99';
          const timeB = b.time || '99:99';
          return timeA.localeCompare(timeB);
        })
      );
    });

    return grouped;
  }, [events]);

  const days = useMemo(() => {
    const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    const leading = start.getDay();
    const grid: Array<{
      key: string;
      label: number;
      date: Date;
      other?: boolean;
      today?: boolean;
      selected?: boolean;
      hasEvent?: boolean;
      eventCount: number;
    }> = [];
    const today = new Date();
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const selectedKey = dayKey(selectedDate);

    for (let i = 0; i < leading; i += 1) {
      const value = new Date(start);
      value.setDate(start.getDate() - (leading - i));
      const key = dayKey(value);
      grid.push({
        key: `prev-${key}`,
        label: value.getDate(),
        date: value,
        other: true,
        selected: key === selectedKey,
        hasEvent: eventsByDate.has(key),
        eventCount: eventsByDate.get(key)?.length ?? 0,
      });
    }

    for (let day = 1; day <= end.getDate(); day += 1) {
      const value = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      const key = dayKey(value);
      grid.push({
        key,
        label: day,
        date: value,
        today: key === dayKey(todayDate),
        selected: key === selectedKey,
        hasEvent: eventsByDate.has(key),
        eventCount: eventsByDate.get(key)?.length ?? 0,
      });
    }

    while (grid.length % 7 !== 0) {
      const day = grid.length - (leading + end.getDate()) + 1;
      const value = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, day);
      const key = dayKey(value);
      grid.push({
        key: `next-${key}`,
        label: value.getDate(),
        date: value,
        other: true,
        selected: key === selectedKey,
        hasEvent: eventsByDate.has(key),
        eventCount: eventsByDate.get(key)?.length ?? 0,
      });
    }

    return grid;
  }, [currentMonth, eventsByDate, selectedDate]);

  const selectedDateEvents = useMemo(
    () => eventsByDate.get(dayKey(selectedDate)) ?? [],
    [eventsByDate, selectedDate]
  );

  const upcomingEvents = useMemo(
    () =>
      [...events]
        .map((event) => ({
          ...event,
          normalizedDate: parseEventDate(event.startDate),
        }))
        .filter((event): event is CalendarEvent & { normalizedDate: Date } =>
          Boolean(event.normalizedDate)
        )
        .sort((a, b) => a.normalizedDate.getTime() - b.normalizedDate.getTime())
        .slice(0, 6),
    [events]
  );

  const selectedDateLabel = selectedDate.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });

  const handleSelectDay = (date: Date) => {
    const normalized = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    setSelectedDate(normalized);
    setCurrentMonth(new Date(normalized.getFullYear(), normalized.getMonth(), 1));
  };

  const handleMonthChange = (offset: number) => {
    setCurrentMonth((date) => {
      const next = new Date(date.getFullYear(), date.getMonth() + offset, 1);
      setSelectedDate(new Date(next.getFullYear(), next.getMonth(), 1));
      return next;
    });
  };

  const renderEventChip = (event: CalendarEvent, date: Date) => {
    const tone = getEventTone(event);
    return (
      <button
        key={event.id}
        type="button"
        className="p7-event-chip w-full text-left"
        onClick={() => onEventClick(event)}
        aria-label={`Abrir evento ${event.title} em ${date.toLocaleDateString('pt-BR')}`}
      >
        <div className={`p7-event-date ${tone === 'gold' ? 'gold' : ''}`}>
          <div className="p7-event-day">{date.getDate()}</div>
          <div className="p7-event-mon">
            {date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[0.85rem] font-bold text-[var(--p7-text)]">
            {event.title}
          </div>
          <div className="truncate text-[0.72rem] text-[var(--p7-text-3)]">
            {event.time || 'Horário a definir'} · {event.location || 'Sem local'}
          </div>
        </div>
        <span className={`p7-pill ${tone}`}>{event.type || 'Evento'}</span>
      </button>
    );
  };

  return (
    <div className="p7-shell">
      <div className="p7-screen">
        <PrototypeStatusBar />
        <div className="p7-grad-header" style={{ paddingBottom: '16px' }}>
          <div className="p7-header-row mb-3">
            <div>
              <div className="p7-header-label">Calendário</div>
              <div className="p7-header-title capitalize">{monthLabel}</div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              {onCreateEvent ? (
                <button
                  type="button"
                  onClick={() => onCreateEvent(selectedDate)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 text-white"
                  aria-label="Novo evento"
                >
                  <Plus className="h-4 w-4" />
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => handleMonthChange(-1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 text-white"
                aria-label="Ver mês anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => handleMonthChange(1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 text-white"
                aria-label="Ver próximo mês"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="rounded-[14px] bg-white/10 p-3 backdrop-blur-sm">
            <div className="p7-cal-grid">
              {weekLabels.map((label, index) => (
                <div key={`label-${index}`} className="p7-cal-day label">
                  {label}
                </div>
              ))}
              {days.map((day) => (
                <button
                  key={day.key}
                  type="button"
                  className={`p7-cal-day ${day.today ? 'today' : ''} ${day.selected ? 'selected' : ''} ${day.hasEvent ? 'has-event' : ''}`}
                  onClick={() => handleSelectDay(day.date)}
                  aria-pressed={day.selected}
                  aria-label={`${day.date.toLocaleDateString('pt-BR')}${day.eventCount ? `, ${day.eventCount} evento${day.eventCount > 1 ? 's' : ''}` : ', sem eventos'}`}
                  style={{ color: day.other ? 'rgba(255,255,255,.42)' : 'rgba(255,255,255,.88)' }}
                >
                  <div className="p7-cal-num">{day.label}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p7-scroll">
          <div className="p7-section">
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <div className="text-[0.7rem] font-bold uppercase tracking-[0.08em] text-[var(--v2-gold)]">
                  Eventos do dia
                </div>
                <div className="mt-1 text-[1rem] font-extrabold capitalize text-[var(--p7-text)]">
                  {selectedDateLabel}
                </div>
              </div>
              <span className="p7-pill soft">
                {selectedDateEvents.length} evento{selectedDateEvents.length === 1 ? '' : 's'}
              </span>
            </div>
            <div className="space-y-2">
              {selectedDateEvents.length > 0 ? (
                selectedDateEvents.map((event) => renderEventChip(event, selectedDate))
              ) : (
                <div className="p7-card p7-card-p text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-[16px] bg-[color-mix(in_oklab,var(--v2-gold)_14%,transparent)] text-[var(--v2-gold)]">
                    <CalendarPlus className="h-5 w-5" />
                  </div>
                  <div className="text-sm font-semibold text-[var(--p7-text)]">
                    Nenhum evento neste dia
                  </div>
                  <p className="mx-auto mt-1 max-w-[32ch] text-xs text-[var(--p7-text-3)]">
                    Se houver culto, reunião ou visita pastoral para esta data, você pode criar um
                    novo evento agora.
                  </p>
                  {onCreateEvent ? (
                    <button
                      type="button"
                      className="p7-card-link mt-3"
                      onClick={() => onCreateEvent(selectedDate)}
                    >
                      Criar evento nesta data
                    </button>
                  ) : null}
                </div>
              )}
            </div>

            {selectedDateEvents.length === 0 && upcomingEvents.length > 0 ? (
              <div className="mt-5">
                <div className="mb-2 text-[0.7rem] font-bold uppercase tracking-[0.08em] text-[var(--p7-text-3)]">
                  Próximos eventos
                </div>
                <div className="space-y-2">
                  {upcomingEvents
                    .slice(0, 3)
                    .map((event) => renderEventChip(event, event.normalizedDate))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
