export interface CalendarEvent {
  id: number;
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  time?: string;
  duration?: number;
  location?: string;
  type: 'igreja-local' | 'asr-geral' | 'asr-administrativo' | 'asr-pastores' | 'visitas' | 'reunioes' | 'pregacoes';
  color?: string;
  attendees?: number;
  maxAttendees?: number;
  status: 'scheduled' | 'confirmed' | 'cancelled';
  isRecurring?: boolean;
  organizer?: string;
  organizerId?: number;
}

export interface EventType {
  id: string;
  label: string;
  color: string;
}

export const EVENT_TYPES: EventType[] = [
  { id: 'igreja-local', label: 'Igreja Local', color: 'bg-red-500 text-white border-red-600' },
  { id: 'asr-geral', label: 'ASR Geral', color: 'bg-orange-500 text-white border-orange-600' },
  { id: 'asr-administrativo', label: 'ASR Administrativo', color: 'bg-cyan-500 text-white border-cyan-600' },
  { id: 'asr-pastores', label: 'ASR Pastores', color: 'bg-purple-500 text-white border-purple-600' },
  { id: 'visitas', label: 'Visitas', color: 'bg-green-500 text-white border-green-600' },
  { id: 'reunioes', label: 'Reuniões', color: 'bg-blue-500 text-white border-blue-600' },
  { id: 'pregacoes', label: 'Pregações', color: 'bg-indigo-500 text-white border-indigo-600' }
];

