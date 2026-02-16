import { memo } from 'react';
import { CalendarDays, Cake } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type CalendarEvent } from '@/types/calendar';
import { isToday, formatTime, getMultiDayInfo } from './calendarDateHelpers';
import { dayNames, getEventColor } from './monthlyCalendarUtils';
import { calendarLogger } from '@/lib/logger';
import type { BirthdayUser } from './calendar-types';

interface DesktopCalendarGridProps {
  monthDays: Array<string | null>;
  selectedDate: string | null;
  expandedDays: Set<string>;
  getEventsForDay: (dateString: string | null) => CalendarEvent[];
  getBirthdaysForDate: (date: Date) => BirthdayUser[];
  onDateClick: (dateString: string | null) => void;
  onEventClick?: (event: CalendarEvent) => void;
  onToggleDayExpansion: (dateString: string) => void;
}

export const DesktopCalendarGrid = memo(({
  monthDays,
  selectedDate,
  expandedDays,
  getEventsForDay,
  getBirthdaysForDate,
  onDateClick,
  onEventClick,
  onToggleDayExpansion,
}: DesktopCalendarGridProps) => (
  <div className="hidden sm:block">
    <div className="grid grid-cols-7 gap-1 mb-4">
      {/* Day headers */}
      {dayNames.map(day => (
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
          calendarLogger.debug(
            `Dia ${dateString} (${day}/${month}): ${dayBirthdays.length} aniversariantes encontrados`
          );

          // Debug adicional
          if (dayBirthdays.length > 0) {
            calendarLogger.debug(
              `Aniversariantes para ${dateString}:`,
              dayBirthdays.map(b => b.name)
            );
          }
        }

        return (
          <div
            key={index}
            className={cn(
              'min-h-[120px] sm:min-h-[120px] min-h-[140px] p-1 sm:p-1 p-2 border border-border cursor-pointer hover:bg-muted/50 transition-colors',
              isCurrentDay && 'bg-primary/10 border-primary',
              isSelected && 'bg-primary/20',
              !dateString && 'bg-muted/20 cursor-not-allowed'
            )}
            onClick={() => onDateClick(dateString)}
            data-testid={dateString ? `calendar-day-${dateString}` : `empty-day-${index}`}
          >
            {dateString && (
              <>
                {/* Day number */}
                <div
                  className={cn(
                    'text-base sm:text-sm font-medium mb-1',
                    isCurrentDay && 'text-primary font-bold'
                  )}
                >
                  {parseInt(dateString.split('-')[2])}
                </div>

                {/* Events - Prioridade alta para manter na mesma linha */}
                <div className="space-y-1 sm:space-y-0.5 mb-1 flex flex-col">
                  {(expandedDays.has(dateString) ? dayEvents : dayEvents.slice(0, 3)).map(
                    event => {
                      const { isMultiDay, isFirstDay, isLastDay, isMiddleDay } = getMultiDayInfo(event, dateString);

                      return (
                        <div
                          key={event.id}
                          className={cn(
                            'text-xs sm:text-xs text-sm p-2 sm:p-1.5 rounded-lg border-2 cursor-pointer hover:scale-105 hover:shadow-lg transition-all duration-200 shadow-md relative group overflow-hidden min-h-[3rem] sm:min-h-[2.5rem] flex flex-col',
                            getEventColor(event),
                            // Estilos especiais para eventos de múltiplos dias - barra contínua elegante
                            isMultiDay && 'border-2 shadow-lg',
                            isFirstDay &&
                              'rounded-l-lg rounded-r-none border-l-4 border-r-0',
                            isLastDay &&
                              'rounded-r-lg rounded-l-none border-r-4 border-l-0',
                            isMiddleDay && 'rounded-none border-l-0 border-r-0'
                          )}
                          onClick={e => {
                            e.stopPropagation();
                            onEventClick?.(event);
                          }}
                          data-testid={`event-${event.id}`}
                          title={
                            isMultiDay
                              ? `${event.title} (${event.startDate} - ${event.endDate})`
                              : event.title
                          }
                        >
                          {/* Efeito de brilho sutil */}
                          <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg"></div>

                          <div className="relative z-10">
                            <div className="font-semibold flex items-start gap-1.5 text-sm sm:text-xs leading-tight">
                              {isMultiDay && (
                                <CalendarDays className="h-4 w-4 sm:h-3 sm:w-3 flex-shrink-0 mt-0.5" />
                              )}
                              <span className="text-sm sm:text-xs font-medium break-words leading-tight min-h-[1.2em]">
                                {isMultiDay
                                  ? isFirstDay
                                    ? `${event.title} (Início)`
                                    : isLastDay
                                      ? `${event.title} (Fim)`
                                      : event.title // Mostra o nome completo do evento nos dias intermediários
                                  : event.title}
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
                    }
                  )}

                  {/* Show "+X more" if there are more events */}
                  {dayEvents.length > 3 && !expandedDays.has(dateString) && (
                    <div
                      className="text-xs text-muted-foreground text-center py-1 px-2 bg-gray-100/80 rounded-md border border-gray-200 hover:bg-gray-200/80 transition-colors cursor-pointer"
                      onClick={e => {
                        e.stopPropagation();
                        onToggleDayExpansion(dateString);
                      }}
                    >
                      <span className="font-medium">
                        +{dayEvents.length - 3} mais eventos
                      </span>
                    </div>
                  )}

                  {/* Show "Ver menos" if day is expanded */}
                  {dayEvents.length > 3 && expandedDays.has(dateString) && (
                    <div
                      className="text-xs text-muted-foreground text-center py-1 px-2 bg-gray-100/80 rounded-md border border-gray-200 hover:bg-gray-200/80 transition-colors cursor-pointer"
                      onClick={e => {
                        e.stopPropagation();
                        onToggleDayExpansion(dateString);
                      }}
                    >
                      <span className="font-medium">Ver menos</span>
                    </div>
                  )}
                </div>

                {/* Aniversariantes - Posicionados abaixo dos eventos */}
                <div className="flex flex-col space-y-1 sm:space-y-0.5">
                  {dayBirthdays.map(birthday => (
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
                          <span className="font-semibold break-words text-sm sm:text-xs">
                            {birthday.name}
                          </span>
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
));
