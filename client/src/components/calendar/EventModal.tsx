import { useState } from "react";
import { DialogWithModalTracking, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar,
  Clock,
  MapPin,
  Users,
  User,
  Edit2,
  Save,
  X,
  Trash2
} from "lucide-react";
import { CalendarEvent, EventType } from "@/types/calendar";

// Função utilitária para formatar datas sem problemas de fuso horário
const formatDateSafe = (dateString: string): string => {
  const [year, month, day] = dateString.split('-');
  // CORRIGIDO: Usar data local em vez de UTC para evitar offset de um dia
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  return date.toLocaleDateString('pt-BR');
};

interface EventModalProps {
  event?: CalendarEvent;
  isOpen: boolean;
  onClose: () => void;
  onSave: (eventData: Partial<CalendarEvent>) => void;
  onDelete?: (eventId: number) => void;
  isEditing?: boolean;
  eventTypes?: EventType[];
}

const defaultEventTypes = [
  { value: 'estudos', label: 'Estudos' },
  { value: 'reunioes', label: 'Reuniões' },
  { value: 'visitas', label: 'Visitas' },
  { value: 'oracao', label: 'Oração' },
  { value: 'chamadas', label: 'Chamadas' },
  { value: 'cultos', label: 'Cultos' },
  { value: 'igreja-local', label: 'Igreja Local' },
  { value: 'asr-geral', label: 'ASR Geral' },
  { value: 'asr-administrativo', label: 'ASR Administrativo' },
  { value: 'regional-distrital', label: 'Regional/Distrital' }
];

const statusOptions = [
  { value: 'scheduled', label: 'Agendado' },
  { value: 'confirmed', label: 'Confirmado' },
  { value: 'cancelled', label: 'Cancelado' }
];

export const EventModal = ({ 
  event, 
  isOpen, 
  onClose, 
  onSave, 
  onDelete, 
  isEditing: initialEditing = false,
  eventTypes: propEventTypes
}: EventModalProps) => {
  const eventTypeOptions = propEventTypes ? 
    propEventTypes.map(t => ({ value: t.id, label: t.label })) : 
    defaultEventTypes;
  const [isEditing, setIsEditing] = useState(initialEditing || !event);
  const [formData, setFormData] = useState<Partial<CalendarEvent>>(event || {
    title: '',
    description: '',
    startDate: new Date().toISOString().split('T')[0],
    time: '09:00',
    duration: 60,
    location: '',
    type: 'igreja-local',
    maxAttendees: 50,
    status: 'scheduled',
    organizer: ''
  });


  const handleSave = () => {
    onSave(formData);
    setIsEditing(false);
    if (!event) {
      onClose();
    }
  };

  const handleCancel = () => {
    if (event) {
      setFormData(event);
      setIsEditing(false);
    } else {
      onClose();
    }
  };

  const getTypeColor = (type: string) => {
    const colors = {
      estudos: "bg-blue-500 text-white border-blue-600",
      reunioes: "bg-emerald-500 text-white border-emerald-600",
      visitas: "bg-purple-500 text-white border-purple-600",
      oracao: "bg-amber-500 text-white border-amber-600",
      chamadas: "bg-rose-500 text-white border-rose-600",
      cultos: "bg-indigo-500 text-white border-indigo-600",
      "igreja-local": "bg-red-500 text-white border-red-600",
      "asr-geral": "bg-orange-500 text-white border-orange-600",
      "asr-administrativo": "bg-cyan-500 text-white border-cyan-600",
      "regional-distrital": "bg-slate-500 text-white border-slate-600"
    };
    return colors[type as keyof typeof colors] || colors.estudos;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      scheduled: "bg-yellow-100 text-yellow-800",
      confirmed: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800"
    };
    return colors[status as keyof typeof colors] || colors.scheduled;
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}min`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}min`;
  };

  return (
    <DialogWithModalTracking 
      modalId="event-modal"
      open={isOpen} 
      onOpenChange={(open) => !open && onClose()}
    >
      <DialogContent 
        className="w-[90vw] max-w-md p-2 sm:p-2"
        style={{ 
          maxHeight: 'calc(100vh - 2rem)',
          transform: 'translate(-50%, -50%)'
        }}
        aria-describedby="event-modal-description"
      >
        <DialogHeader className="flex flex-row items-center justify-between sticky top-0 bg-background pt-1 pb-1 border-b z-10">
          <DialogTitle className="text-xs sm:text-sm">
            {event ? (isEditing ? 'Editar Evento' : 'Detalhes do Evento') : 'Novo Evento'}
          </DialogTitle>
          <div id="event-modal-description" className="sr-only">
            {event ? (isEditing ? 'Formulário para editar evento existente' : 'Visualização dos detalhes do evento') : 'Formulário para criar novo evento'}
          </div>
          <div className="flex gap-1">
            {event && !isEditing ? (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsEditing(true)}
                data-testid="button-edit-event"
                className="h-6 px-2 text-xs"
              >
                <Edit2 className="h-3 w-3 mr-1" />
                Editar
              </Button>
            ) : (
              <div className="flex gap-1">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleCancel}
                  data-testid="button-cancel-edit"
                  className="h-6 px-2 text-xs"
                >
                  <X className="h-3 w-3 mr-1" />
                  Cancelar
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleSave}
                  data-testid="button-save-event"
                  className="h-6 px-2 text-xs"
                >
                  <Save className="h-3 w-3 mr-1" />
                  Salvar
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-2 pt-1 pb-2">
          {/* Event Header */}
          {!isEditing && event && (
            <div className="flex items-start space-x-2">
              <div className="flex-1">
                <h2 className="text-base sm:text-lg font-semibold mb-1" data-testid="text-event-title">
                  {event.title}
                </h2>
                <div className="flex flex-wrap gap-1 mb-2">
                  <Badge className={`${getTypeColor(event.type)} text-xs`} data-testid="badge-event-type">
                    {eventTypeOptions.find(t => t.value === event.type)?.label}
                  </Badge>
                  <Badge className={`${getStatusColor(event.status)} text-xs`} data-testid="badge-event-status">
                    {statusOptions.find(s => s.value === event.status)?.label}
                  </Badge>
                  {event.isRecurring && (
                    <Badge variant="outline" data-testid="badge-recurring" className="text-xs">
                      Recorrente
                    </Badge>
                  )}
                </div>
                {event.description && (
                  <p className="text-xs text-muted-foreground mb-2" data-testid="text-event-description">
                    {event.description}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Form Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="sm:col-span-2">
              <Label htmlFor="title" className="text-xs">Título</Label>
              {isEditing ? (
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="Ex: Culto da Manhã"
                  data-testid="input-event-title"
                  className="mt-1 h-6 text-xs"
                />
              ) : (
                <p className="text-xs text-muted-foreground mt-1">{event?.title}</p>
              )}
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="description" className="text-xs">Descrição</Label>
              {isEditing ? (
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Descrição opcional..."
                  rows={2}
                  data-testid="input-event-description"
                  className="mt-1 text-xs min-h-[60px]"
                />
              ) : (
                <p className="text-xs text-muted-foreground mt-1">
                  {event?.description || 'Nenhuma descrição'}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="type" className="text-xs">Tipo</Label>
              {isEditing ? (
                <Select 
                  value={formData.type} 
                  onValueChange={(value) => setFormData({...formData, type: value as any})}
                >
                  <SelectTrigger data-testid="select-event-type" className="mt-1 h-6 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {eventTypeOptions.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-xs text-muted-foreground mt-1">
                  {eventTypeOptions.find(t => t.value === event?.type)?.label}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="status" className="text-xs">Status</Label>
              {isEditing ? (
                <Select 
                  value={formData.status} 
                  onValueChange={(value) => setFormData({...formData, status: value as any})}
                >
                  <SelectTrigger data-testid="select-event-status" className="mt-1 h-6 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(status => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-xs text-muted-foreground mt-1">
                  {statusOptions.find(s => s.value === event?.status)?.label}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="date" className="text-xs">Data de Início</Label>
              {isEditing ? (
                <Input
                  id="date"
                  type="date"
                  value={formData.startDate as string | undefined}
                  onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                  data-testid="input-event-date"
                  className="mt-1 h-6 text-xs"
                />
              ) : (
                <div className="flex items-center gap-1 mt-1">
                  <Calendar className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {event?.startDate ? formatDateSafe(event.startDate) : ''}
                    {event?.endDate && event.endDate !== event.startDate && (
                      <span className="text-muted-foreground">
                        {' - '}{formatDateSafe(event.endDate)}
                      </span>
                    )}
                  </span>
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="endDate" className="text-xs">Data de Fim (opcional)</Label>
              {isEditing ? (
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate as string | undefined}
                  onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                  data-testid="input-event-end-date"
                  className="mt-1 h-6 text-xs"
                />
              ) : (
                <div className="flex items-center gap-1 mt-1">
                  <Calendar className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {event?.endDate ? formatDateSafe(event.endDate) : 'Evento de um dia'}
                  </span>
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="time" className="text-xs">Horário</Label>
              {isEditing ? (
                <Input
                  id="time"
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({...formData, time: e.target.value})}
                  data-testid="input-event-time"
                  className="mt-1 h-6 text-xs"
                />
              ) : (
                <div className="flex items-center gap-1 mt-1">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {event?.time} ({formatDuration(event?.duration || 0)})
                  </span>
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="duration" className="text-xs">Duração</Label>
              {isEditing ? (
                <Input
                  id="duration"
                  type="number"
                  min="15"
                  step="15"
                  value={formData.duration}
                  onChange={(e) => setFormData({...formData, duration: parseInt(e.target.value)})}
                  data-testid="input-event-duration"
                  className="mt-1 h-6 text-xs"
                />
              ) : (
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDuration(event?.duration || 0)}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="maxAttendees" className="text-xs">Capacidade</Label>
              {isEditing ? (
                <Input
                  id="maxAttendees"
                  type="number"
                  min="1"
                  value={formData.maxAttendees}
                  onChange={(e) => setFormData({...formData, maxAttendees: parseInt(e.target.value)})}
                  data-testid="input-event-capacity"
                  className="mt-1 h-6 text-xs"
                />
              ) : (
                <div className="flex items-center gap-1 mt-1">
                  <Users className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {event?.attendees || 0}/{event?.maxAttendees} pessoas
                  </span>
                </div>
              )}
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="location" className="text-xs">Local</Label>
              {isEditing ? (
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  placeholder="Ex: Igreja Central"
                  data-testid="input-event-location"
                  className="mt-1 h-6 text-xs"
                />
              ) : (
                <div className="flex items-center gap-1 mt-1">
                  <MapPin className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {event?.location || 'Local não informado'}
                  </span>
                </div>
              )}
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="organizer" className="text-xs">Organizador</Label>
              {isEditing ? (
                <Input
                  id="organizer"
                  value={formData.organizer}
                  onChange={(e) => setFormData({...formData, organizer: e.target.value})}
                  placeholder="Nome do organizador"
                  data-testid="input-event-organizer"
                  className="mt-1 h-7 text-xs"
                />
              ) : (
                <div className="flex items-center gap-1 mt-1">
                  <User className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {event?.organizer || 'Organizador não informado'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          {event && !isEditing && onDelete && (
            <div className="flex justify-end pt-3 border-t mt-4">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onDelete(event.id)}
                data-testid="button-delete-event"
                className="h-7 px-2 text-xs"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Excluir
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </DialogWithModalTracking>
  );
};