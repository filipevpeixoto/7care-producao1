import { memo } from 'react';
import { CalendarDays, Cake } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type CalendarEvent, EVENT_TYPES } from '@/types/calendar';
import { isToday, formatTime, getMultiDayInfo } from './calendarDateHelpers';
import { dayNames, getEventColor } from './monthlyCalendarUtils';
import type { BirthdayUser } from './calendar-types';

interface MobileCalendarGridProps {
  monthDays: Array<string | null>;
  selectedDate: string | null;
  getEventsForDay: (dateString: string | null) => CalendarEvent[];
  getBirthdaysForDate: (date: Date) => BirthdayUser[];
  onDateClick: (dateString: string | null) => void;
  onEventClick?: (event: CalendarEvent) => void;
}

export const MobileCalendarGrid = memo(({
  monthDays,
  selectedDate,
  getEventsForDay,
  getBirthdaysForDate,
  onDateClick,
  onEventClick,
}: MobileCalendarGridProps) => (
  <div className="block sm:hidden">
    <div className="grid grid-cols-7 gap-1 mb-4">
      {/* Day headers */}
      {dayNames.map(day => (
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
              'min-h-[50px] p-2 border border-border cursor-pointer hover:bg-muted/50 transition-colors flex flex-col items-center justify-center',
              isCurrentDay && 'bg-primary/10 border-primary text-primary font-bold',
              isSelected && 'bg-primary/20 border-primary',
              !dateString && 'bg-muted/20 cursor-not-allowed'
            )}
            onClick={() => onDateClick(dateString)}
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
                      const eventsByType = dayEvents.reduce(
                        (acc, event) => {
                          if (!acc[event.type]) {
                            acc[event.type] = [];
                          }
                          acc[event.type].push(event);
                          return acc;
                        },
                        {} as Record<string, CalendarEvent[]>
                      );

                      // Mostrar até 4 barras (uma por categoria)
                      const eventTypes = Object.keys(eventsByType).slice(0, 4);

                      return eventTypes.map((eventType, idx) => {
                        const eventTypeConfig = EVENT_TYPES.find(et => et.id === eventType);
                        const colorClass = eventTypeConfig?.color || 'bg-gray-500';

                        return (
                          <div
                            key={`${dateString}-${eventType}-${idx}`}
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
        {getEventsForDay(selectedDate).map(event => {
          const { isMultiDay, isFirstDay, isLastDay, isMiddleDay } = getMultiDayInfo(event, selectedDate);

          return (
            <div
              key={event.id}
              className={cn(
                'text-xs p-1.5 rounded-lg border-2 cursor-pointer hover:scale-105 hover:shadow-lg transition-all duration-200 shadow-md relative group overflow-hidden min-h-[2.5rem] flex flex-col',
                getEventColor(event),
                // Estilos especiais para eventos de múltiplos dias - barra contínua elegante
                isMultiDay && 'border-2 shadow-lg',
                isFirstDay && 'rounded-l-lg rounded-r-none border-l-4 border-r-0',
                isLastDay && 'rounded-r-lg rounded-l-none border-r-4 border-l-0',
                isMiddleDay && 'rounded-none border-l-0 border-r-0'
              )}
              onClick={() => onEventClick?.(event)}
              data-testid={`mobile-event-${event.id}`}
              title={
                isMultiDay
                  ? `${event.title} (${event.startDate} - ${event.endDate})`
                  : event.title
              }
            >
              {/* Efeito de brilho sutil */}
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg"></div>

              <div className="relative z-10">
                <div className="font-semibold flex items-start gap-1.5 text-xs leading-tight">
                  {isMultiDay && <CalendarDays className="h-3 w-3 flex-shrink-0 mt-0.5" />}
                  <span className="text-xs font-medium break-words leading-tight min-h-[1.2em]">
                    {isMultiDay
                      ? isFirstDay
                        ? `${event.title} (Início)`
                        : isLastDay
                          ? `${event.title} (Fim)`
                          : event.title
                      : event.title}
                  </span>
                </div>

                {event.time && (
                  <div className="mt-1">
                    <span className="text-xs opacity-90">{formatTime(event.time)}</span>
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

          return (
            dayBirthdays.length > 0 && (
              <div className="mt-4">
                <h4 className="text-md font-semibold mb-2">Aniversariantes</h4>
                {dayBirthdays.map(birthday => (
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
            )
          );
        })()}
      </div>
    )}
  </div>
));
