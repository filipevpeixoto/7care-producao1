import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Calendar as CalendarIcon,
  Plus,
  Clock,
  MapPin,
  Users,
  CalendarDays,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { type CalendarEvent } from '@/types/calendar';
import { formatTime, getMultiDayInfo } from './calendarDateHelpers';
import { eventTypeColors, eventTypeLabels, formatDateSafe } from './monthlyCalendarUtils';

interface SelectedDateEventsCardProps {
  selectedDate: string;
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  onNewEvent?: () => void;
}

export const SelectedDateEventsCard = memo(({
  selectedDate,
  events,
  onEventClick,
  onNewEvent,
}: SelectedDateEventsCardProps) => (
  <Card className="hidden sm:block">
    <CardHeader>
      <CardTitle className="text-lg">Eventos do dia {formatDateSafe(selectedDate)}</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        {events.length === 0 ? (
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
          events.map(event => {
            const { isMultiDay, isFirstDay, isLastDay, isMiddleDay } = getMultiDayInfo(event, selectedDate);

            return (
              <div
                key={event.id}
                className={cn(
                  'p-2 border rounded-lg hover:shadow-md transition-shadow cursor-pointer',
                  isMultiDay && 'border-2',
                  isFirstDay && 'border-l-4 border-l-green-500 rounded-l-lg',
                  isLastDay && 'border-r-4 border-r-red-500 rounded-r-lg',
                  isMiddleDay &&
                    'border-t-2 border-b-2 border-t-blue-500 border-b-blue-500 rounded-none'
                )}
                onClick={() => onEventClick?.(event)}
                data-testid={`detailed-event-${event.id}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm">
                        {isMultiDay
                          ? isFirstDay
                            ? `${event.title} (Início)`
                            : isLastDay
                              ? `${event.title} (Fim)`
                              : `${event.title} (Continua)`
                          : event.title}
                      </h3>
                      {isMultiDay && (
                        <Badge
                          variant="secondary"
                          className="bg-blue-100 text-blue-800 text-xs"
                        >
                          <CalendarDays className="h-3 w-3 mr-1" />
                          {isFirstDay ? 'Início' : isLastDay ? 'Fim' : 'Continua'}
                        </Badge>
                      )}
                    </div>
                    {event.description && (
                      <p className="text-muted-foreground mt-1 text-xs">
                        {event.description}
                      </p>
                    )}

                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span className="text-xs">
                          {event.time ? formatTime(event.time) : ''} ({event.duration || 60}
                          min)
                        </span>
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
                          <span className="text-xs">
                            {event.attendees}/{event.maxAttendees}
                          </span>
                        </div>
                      )}

                      {isMultiDay && (
                        <div className="flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          <span className="text-xs">
                            {isFirstDay && 'Início'}
                            {isLastDay && 'Fim'}
                            {isMiddleDay && 'Continua'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <Badge
                    className={`${eventTypeColors[event.type]} font-medium shadow-sm text-xs`}
                  >
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
));
