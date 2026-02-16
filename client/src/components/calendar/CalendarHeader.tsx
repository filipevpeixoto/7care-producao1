import { memo } from 'react';
import { CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
} from 'lucide-react';
import { ariaLabels } from '@/lib/accessibility';
import { monthNames } from './monthlyCalendarUtils';

interface CalendarHeaderProps {
  currentDate: Date;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onNewEvent?: () => void;
}

export const CalendarHeader = memo(({
  currentDate,
  onPreviousMonth,
  onNextMonth,
  onNewEvent,
}: CalendarHeaderProps) => (
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
          onClick={onPreviousMonth}
          data-testid="previous-month"
          aria-label={ariaLabels.previousMonth}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onNextMonth}
          data-testid="next-month"
          aria-label={ariaLabels.nextMonth}
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
  </CardHeader>
));
