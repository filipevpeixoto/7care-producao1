import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Calendar, Clock, MapPin } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface CalendarEvent {
  id: number;
  title: string;
  description?: string;
  date: string;
  endDate?: string;
  location?: string;
  type: string;
  capacity?: number;
  isRecurring?: boolean;
  recurrencePattern?: string;
  createdBy?: number;
  churchId?: number;
  createdAt?: string;
  updatedAt?: string;
}

interface SimpleCalendarViewProps {
  onEventClick?: (event: CalendarEvent) => void;
}

export function SimpleCalendarView({ onEventClick }: SimpleCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    date: '',
    endDate: '',
    location: '',
    type: 'igreja-local'
  });

  // Buscar eventos
  const fetchEvents = async () => {
    try {
      console.log('🔍 Buscando eventos...');
      const response = await fetch('/api/events');
      const data = await response.json();
      console.log('📅 Eventos recebidos:', data);
      setEvents(data || []);
    } catch (error) {
      console.error('Erro ao buscar eventos:', error);
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // Navegação do calendário
  const goToPreviousMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Gerar dias do mês
  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days: Date[] = [];
    const current = new Date(startDate);

    for (let i = 0; i < 42; i++) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return days;
  };

  // Verificar se é evento de múltiplos dias
  const isMultiDayEvent = (event: CalendarEvent) => {
    if (!event.endDate) return false;
    const startDate = new Date(event.date);
    const endDate = new Date(event.endDate);
    return startDate.toDateString() !== endDate.toDateString();
  };

  // Obter eventos para uma data específica
  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(event => {
      const eventStart = event.date.split('T')[0];
      const eventEnd = event.endDate ? event.endDate.split('T')[0] : eventStart;
      
      return dateStr >= eventStart && dateStr <= eventEnd;
    });
  };

  // Verificar se é hoje
  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Verificar se é o mês atual
  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth();
  };

  // Criar novo evento
  const createEvent = async () => {
    try {
      const eventData = {
        title: newEvent.title,
        description: newEvent.description,
        date: newEvent.date + 'T19:00:00Z',
        endDate: newEvent.endDate ? newEvent.endDate + 'T19:00:00Z' : null,
        location: newEvent.location,
        type: newEvent.type,
        capacity: 0,
        isRecurring: false,
        recurrencePattern: null,
        createdBy: 1,
        churchId: 1
      };

      console.log('🔧 Criando evento:', eventData);

      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      });

      if (response.ok) {
        console.log('✅ Evento criado com sucesso');
        setNewEvent({
          title: '',
          description: '',
          date: '',
          endDate: '',
          location: '',
          type: 'igreja-local'
        });
        setIsCreateModalOpen(false);
        fetchEvents();
      } else {
        console.error('Erro ao criar evento');
      }
    } catch (error) {
      console.error('Erro ao criar evento:', error);
    }
  };

  const days = generateCalendarDays();
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Carregando calendário...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-bold">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Evento
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Criar Novo Evento</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={newEvent.description}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date">Data Início</Label>
                  <Input
                    id="date"
                    type="date"
                    value={newEvent.date}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">Data Fim (opcional)</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={newEvent.endDate}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="location">Local</Label>
                <Input
                  id="location"
                  value={newEvent.location}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, location: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="type">Tipo</Label>
                <Select value={newEvent.type} onValueChange={(value) => setNewEvent(prev => ({ ...prev, type: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="igreja-local">Igreja Local</SelectItem>
                    <SelectItem value="conferencia">Conferência</SelectItem>
                    <SelectItem value="retiro">Retiro</SelectItem>
                    <SelectItem value="evento-especial">Evento Especial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={createEvent} className="w-full">
                Criar Evento
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Calendário */}
      <Card>
        <CardContent className="p-0">
          {/* Dias da semana */}
          <div className="grid grid-cols-7 border-b">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
              <div key={day} className="p-3 text-center font-medium text-gray-500 border-r last:border-r-0">
                {day}
              </div>
            ))}
          </div>

          {/* Dias do mês */}
          <div className="grid grid-cols-7">
            {days.map((day, index) => {
              const dayEvents = getEventsForDate(day);
              const isCurrentMonthDay = isCurrentMonth(day);
              const isTodayDay = isToday(day);
              
              return (
                <div
                  key={index}
                  className={`min-h-[120px] p-2 border-r border-b last:border-r-0 ${
                    isCurrentMonthDay ? 'bg-white' : 'bg-gray-50'
                  } ${isTodayDay ? 'bg-blue-50' : ''}`}
                  onClick={() => setSelectedDate((day as Date).toISOString().split('T')[0])}
                >
                  <div className={`text-sm font-medium mb-1 ${
                    isCurrentMonthDay ? 'text-gray-900' : 'text-gray-400'
                  } ${isTodayDay ? 'text-blue-600' : ''}`}>
                    {(day as Date).getDate()}
                  </div>
                  
                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map((event, eventIndex) => {
                      const isMultiDay = isMultiDayEvent(event);
                      const eventStart = new Date(event.date);
                      const eventEnd = event.endDate ? new Date(event.endDate) : eventStart;
                      const isStart = (day as Date).toDateString() === eventStart.toDateString();
                      const isEnd = (day as Date).toDateString() === eventEnd.toDateString();
                      const isMiddle = isMultiDay && !isStart && !isEnd;
                      
                      return (
                        <div
                          key={event.id}
                          className={`text-xs p-1 rounded cursor-pointer ${
                            isMultiDay
                              ? isStart
                                ? 'bg-blue-100 text-blue-800 border-l-2 border-blue-500'
                                : isEnd
                                ? 'bg-blue-100 text-blue-800 border-r-2 border-blue-500'
                                : 'bg-blue-50 text-blue-700 border-l-2 border-r-2 border-blue-300'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onEventClick?.(event);
                          }}
                        >
                          <div className="font-medium truncate">
                            {isMultiDay && isMiddle ? '...' : event.title}
                            {isMultiDay && isStart && ' (Início)'}
                            {isMultiDay && isEnd && ' (Fim)'}
                          </div>
                          {event.location && (
                            <div className="flex items-center text-xs text-gray-600">
                              <MapPin className="h-3 w-3 mr-1" />
                              {event.location}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {dayEvents.length > 3 && (
                      <div className="text-xs text-gray-500 text-center">
                        +{dayEvents.length - 3} mais
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Eventos do dia selecionado */}
      {selectedDate && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Eventos de {new Date(selectedDate).toLocaleDateString('pt-BR')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {getEventsForDate(new Date(selectedDate)).length === 0 ? (
              <p className="text-gray-500">Nenhum evento para este dia.</p>
            ) : (
              <div className="space-y-3">
                {getEventsForDate(new Date(selectedDate)).map(event => (
                  <div
                    key={event.id}
                    className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                    onClick={() => onEventClick?.(event)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium">{event.title}</h3>
                        {event.description && (
                          <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                        )}
                        <div className="flex items-center text-sm text-gray-500 mt-2 space-x-4">
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {new Date(event.date).toLocaleTimeString('pt-BR', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </div>
                          {event.location && (
                            <div className="flex items-center">
                              <MapPin className="h-4 w-4 mr-1" />
                              {event.location}
                            </div>
                          )}
                        </div>
                      </div>
                      <Badge variant="secondary">{event.type}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Debug Info */}
      <Card className="bg-gray-50">
        <CardHeader>
          <CardTitle className="text-sm">Debug - Eventos Carregados</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            Total de eventos: {events.length}
          </p>
          {events.length > 0 && (
            <div className="mt-2 space-y-1">
              {events.map(event => (
                <div key={event.id} className="text-xs text-gray-500">
                  {event.title} - {event.date}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
