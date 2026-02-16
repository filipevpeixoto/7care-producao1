import { type CalendarEvent } from '@/types/calendar';

export const formatTime = (time: string): string => {
  return new Date(`2000-01-01T${time}`).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const getDaysInMonth = (date: Date): Array<string | null> => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDay = firstDay.getDay();

  const days: Array<string | null> = [];

  for (let i = 0; i < startDay; i++) {
    days.push(null);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    days.push(dateString);
  }

  return days;
};

export const isToday = (dateString: string | null): boolean => {
  if (!dateString) return false;
  const today = new Date();
  const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  const todayString = todayUTC.toISOString().split('T')[0];
  return dateString === todayString;
};

export const isMultiDayEvent = (event: CalendarEvent): boolean => {
  return !!(event.endDate && event.startDate !== event.endDate);
};

export const isFirstDayOfMultiDayEvent = (event: CalendarEvent, dateString: string): boolean => {
  return isMultiDayEvent(event) && event.startDate === dateString;
};

export const isLastDayOfMultiDayEvent = (event: CalendarEvent, dateString: string): boolean => {
  return isMultiDayEvent(event) && event.endDate === dateString;
};

export const isMiddleDayOfMultiDayEvent = (event: CalendarEvent, dateString: string): boolean => {
  return (
    isMultiDayEvent(event) &&
    !!event.endDate &&
    dateString > event.startDate &&
    dateString < event.endDate
  );
};

export const getMultiDayInfo = (event: CalendarEvent, dateString: string) => ({
  isMultiDay: isMultiDayEvent(event),
  isFirstDay: isFirstDayOfMultiDayEvent(event, dateString),
  isLastDay: isLastDayOfMultiDayEvent(event, dateString),
  isMiddleDay: isMiddleDayOfMultiDayEvent(event, dateString),
});
