import { useEffect, useState } from 'react';
import {
  DialogWithModalTracking,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, Users, User, Edit2, Save, X, Trash2 } from 'lucide-react';
import { type CalendarEvent, type EventType } from '@/types/calendar';
import { cn } from '@/lib/utils';

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
  onSave: (eventData: Partial<CalendarEvent>) => void | Promise<void>;
  onDelete?: (eventId: number) => void;
  isEditing?: boolean;
  eventTypes?: EventType[];
  initialDate?: string;
  variant?: 'classic' | 'v2';
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
  { value: 'regional-distrital', label: 'Regional/Distrital' },
];

const statusOptions = [
  { value: 'scheduled', label: 'Agendado' },
  { value: 'confirmed', label: 'Confirmado' },
  { value: 'cancelled', label: 'Cancelado' },
];

export const EventModal = ({
  event,
  isOpen,
  onClose,
  onSave,
  onDelete,
  isEditing: initialEditing = false,
  eventTypes: propEventTypes,
  initialDate,
  variant = 'classic',
}: EventModalProps) => {
  const isV2 = variant === 'v2';
  const eventTypeOptions = propEventTypes
    ? propEventTypes.map((t) => ({ value: t.id, label: t.label }))
    : defaultEventTypes;
  const [isEditing, setIsEditing] = useState(initialEditing || !event);
  const [isSaving, setIsSaving] = useState(false);
  const getEmptyEvent = (): Partial<CalendarEvent> => ({
    title: '',
    description: '',
    startDate: initialDate || new Date().toISOString().split('T')[0],
    endDate: initialDate || new Date().toISOString().split('T')[0],
    time: '09:00',
    duration: 60,
    location: '',
    type: 'igreja-local',
    maxAttendees: 50,
    status: 'scheduled',
    organizer: '',
  });
  const [formData, setFormData] = useState<Partial<CalendarEvent>>(event || getEmptyEvent());

  useEffect(() => {
    if (!isOpen) return;
    setIsEditing(initialEditing || !event);
    setFormData(event || getEmptyEvent());
    // getEmptyEvent intentionally depends on initialDate and is re-created each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, initialDate, initialEditing, isOpen]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(formData);
      setIsEditing(false);
      if (!event) {
        onClose();
      }
    } finally {
      setIsSaving(false);
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
      estudos: 'bg-blue-500 text-white border-blue-600',
      reunioes: 'bg-emerald-500 text-white border-emerald-600',
      visitas: 'bg-purple-500 text-white border-purple-600',
      oracao: 'bg-amber-500 text-white border-amber-600',
      chamadas: 'bg-rose-500 text-white border-rose-600',
      cultos: 'bg-indigo-500 text-white border-indigo-600',
      'igreja-local': 'bg-red-500 text-white border-red-600',
      'asr-geral': 'bg-orange-500 text-white border-orange-600',
      'asr-administrativo': 'bg-cyan-500 text-white border-cyan-600',
      'regional-distrital': 'bg-slate-500 text-white border-slate-600',
    };
    return colors[type as keyof typeof colors] || colors.estudos;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      scheduled: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
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

  const title = event ? (isEditing ? 'Editar evento' : 'Detalhes do evento') : 'Novo evento';
  const subtitle = isEditing
    ? 'Organize data, local e tipo do encontro pastoral.'
    : 'Veja os principais dados deste compromisso.';
  const fieldClassName = isV2
    ? 'mt-1.5 h-11 rounded-[14px] border-[var(--p7-border)] bg-[var(--p7-card)] px-3 text-sm text-[var(--p7-text)] shadow-none placeholder:text-[var(--p7-text-3)] focus-visible:border-[var(--v2-gold)] focus-visible:ring-[var(--v2-gold)] dark:bg-[var(--p7-surface-2)]'
    : 'mt-1 h-6 text-xs';
  const textareaClassName = isV2
    ? 'mt-1.5 min-h-[92px] rounded-[14px] border-[var(--p7-border)] bg-[var(--p7-card)] px-3 py-2.5 text-sm text-[var(--p7-text)] shadow-none placeholder:text-[var(--p7-text-3)] focus-visible:border-[var(--v2-gold)] focus-visible:ring-[var(--v2-gold)] dark:bg-[var(--p7-surface-2)]'
    : 'mt-1 text-xs min-h-[60px]';
  const labelClassName = isV2
    ? 'text-[0.72rem] font-bold uppercase tracking-[0.1em] text-[var(--p7-text-3)]'
    : 'text-xs';
  const readOnlyClassName = isV2
    ? 'mt-1.5 rounded-[14px] border border-[var(--p7-border)] bg-[color-mix(in_oklab,var(--v2-blue)_5%,var(--p7-card))] px-3 py-2.5 text-sm text-[var(--p7-text-2)]'
    : 'text-xs text-muted-foreground mt-1';

  return (
    <DialogWithModalTracking
      modalId="event-modal"
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
    >
      <DialogContent
        className={cn(
          isV2
            ? 'v2-event-modal w-[calc(100vw-1.5rem)] max-w-[560px] gap-0 overflow-hidden rounded-[28px] border-[var(--p7-border)] bg-[var(--p7-card)] p-0 shadow-[0_28px_90px_rgba(5,15,36,.28)] dark:bg-[var(--p7-card)] sm:p-0'
            : 'w-[90vw] max-w-md p-2 sm:p-2'
        )}
        style={{
          maxHeight: 'calc(100vh - 2rem)',
          transform: 'translate(-50%, -50%)',
        }}
        aria-describedby="event-modal-description"
      >
        <DialogHeader
          className={cn(
            'flex flex-row items-start justify-between border-b z-10',
            isV2
              ? 'sticky top-0 border-[var(--p7-border)] bg-[var(--p7-card)] px-5 py-4 text-left dark:bg-[var(--p7-card)]'
              : 'sticky top-0 bg-background pt-1 pb-1'
          )}
        >
          <div className={cn(isV2 ? 'min-w-0 pr-4' : '')}>
            {isV2 ? (
              <div className="mb-1 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-[var(--v2-gold)]">
                Agenda V2
              </div>
            ) : null}
            <DialogTitle
              className={cn(
                isV2
                  ? 'text-xl font-extrabold tracking-[-0.03em] text-[var(--p7-text)]'
                  : 'text-xs sm:text-sm'
              )}
            >
              {title}
            </DialogTitle>
            {isV2 ? (
              <p className="mt-1 max-w-[32ch] text-sm leading-snug text-[var(--p7-text-3)]">
                {subtitle}
              </p>
            ) : null}
          </div>
          <div id="event-modal-description" className="sr-only">
            {event
              ? isEditing
                ? 'Formulário para editar evento existente'
                : 'Visualização dos detalhes do evento'
              : 'Formulário para criar novo evento'}
          </div>
          <div className={cn('flex gap-1', isV2 ? 'shrink-0 pr-7' : '')}>
            {event && !isEditing ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                data-testid="button-edit-event"
                className={cn(
                  isV2
                    ? 'h-9 rounded-full border-[var(--p7-border)] bg-[var(--p7-surface-2)] px-3 text-xs font-bold text-[var(--p7-text)] hover:bg-[var(--p7-surface-3)]'
                    : 'h-6 px-2 text-xs'
                )}
              >
                <Edit2 className="h-3 w-3 mr-1" />
                Editar
              </Button>
            ) : (
              <div className={cn('flex gap-1', isV2 ? 'flex-col sm:flex-row' : '')}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  data-testid="button-cancel-edit"
                  className={cn(
                    isV2
                      ? 'h-9 rounded-full border-[var(--p7-border)] bg-transparent px-3 text-xs font-bold text-[var(--p7-text-2)] hover:bg-[var(--p7-surface-2)]'
                      : 'h-6 px-2 text-xs'
                  )}
                >
                  <X className="h-3 w-3 mr-1" />
                  Cancelar
                </Button>
                <Button
                  variant={isV2 ? 'ghost' : 'default'}
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving}
                  data-testid="button-save-event"
                  style={
                    isV2
                      ? { background: 'var(--grad-gold)', color: 'var(--v2-navy-strong)' }
                      : undefined
                  }
                  className={cn(
                    isV2
                      ? 'h-9 rounded-full bg-[var(--grad-gold)] px-4 text-xs font-extrabold text-[var(--v2-navy-strong)] shadow-[0_16px_30px_rgba(196,136,12,.2)] hover:opacity-95'
                      : 'h-6 px-2 text-xs'
                  )}
                >
                  <Save className="h-3 w-3 mr-1" />
                  {isSaving ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>

        <div className={cn(isV2 ? 'space-y-5 px-5 pb-5 pt-4' : 'space-y-2 pt-1 pb-2')}>
          {/* Event Header */}
          {!isEditing && event && (
            <div
              className={cn(
                isV2
                  ? 'rounded-[22px] border border-[var(--p7-border)] bg-[color-mix(in_oklab,var(--v2-blue)_5%,var(--p7-card))] p-4'
                  : 'flex items-start space-x-2'
              )}
            >
              <div className="flex-1">
                <h2
                  className={cn(
                    isV2
                      ? 'mb-2 text-xl font-extrabold tracking-[-0.03em] text-[var(--p7-text)]'
                      : 'text-base sm:text-lg font-semibold mb-1'
                  )}
                  data-testid="text-event-title"
                >
                  {event.title}
                </h2>
                <div className="flex flex-wrap gap-1 mb-2">
                  <Badge
                    className={cn(
                      `${getTypeColor(event.type)} text-xs`,
                      isV2 ? 'rounded-full px-2.5 py-1 font-bold' : ''
                    )}
                    data-testid="badge-event-type"
                  >
                    {eventTypeOptions.find((t) => t.value === event.type)?.label}
                  </Badge>
                  <Badge
                    className={cn(
                      `${getStatusColor(event.status)} text-xs`,
                      isV2 ? 'rounded-full px-2.5 py-1 font-bold' : ''
                    )}
                    data-testid="badge-event-status"
                  >
                    {statusOptions.find((s) => s.value === event.status)?.label}
                  </Badge>
                  {event.isRecurring && (
                    <Badge
                      variant="outline"
                      data-testid="badge-recurring"
                      className={cn('text-xs', isV2 ? 'rounded-full px-2.5 py-1 font-bold' : '')}
                    >
                      Recorrente
                    </Badge>
                  )}
                </div>
                {event.description && (
                  <p
                    className={cn(
                      isV2
                        ? 'mb-2 text-sm leading-relaxed text-[var(--p7-text-2)]'
                        : 'text-xs text-muted-foreground mb-2'
                    )}
                    data-testid="text-event-description"
                  >
                    {event.description}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Form Fields */}
          <div className={cn('grid grid-cols-1 sm:grid-cols-2', isV2 ? 'gap-4' : 'gap-2')}>
            <div className="sm:col-span-2">
              <Label htmlFor="title" className={labelClassName}>
                Título
              </Label>
              {isEditing ? (
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Culto da Manhã"
                  data-testid="input-event-title"
                  className={fieldClassName}
                />
              ) : (
                <p className={readOnlyClassName}>{event?.title}</p>
              )}
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="description" className={labelClassName}>
                Descrição
              </Label>
              {isEditing ? (
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrição opcional..."
                  rows={2}
                  data-testid="input-event-description"
                  className={textareaClassName}
                />
              ) : (
                <p className={readOnlyClassName}>{event?.description || 'Nenhuma descrição'}</p>
              )}
            </div>

            <div>
              <Label htmlFor="type" className={labelClassName}>
                Tipo
              </Label>
              {isEditing ? (
                <Select
                  value={formData.type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, type: value as CalendarEvent['type'] })
                  }
                >
                  <SelectTrigger data-testid="select-event-type" className={fieldClassName}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {eventTypeOptions.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className={readOnlyClassName}>
                  {eventTypeOptions.find((t) => t.value === event?.type)?.label}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="status" className={labelClassName}>
                Status
              </Label>
              {isEditing ? (
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    setFormData({ ...formData, status: value as CalendarEvent['status'] })
                  }
                >
                  <SelectTrigger data-testid="select-event-status" className={fieldClassName}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className={readOnlyClassName}>
                  {statusOptions.find((s) => s.value === event?.status)?.label}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="date" className={labelClassName}>
                Data de Início
              </Label>
              {isEditing ? (
                <Input
                  id="date"
                  type="date"
                  value={formData.startDate as string | undefined}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  data-testid="input-event-date"
                  className={fieldClassName}
                />
              ) : (
                <div className={cn('flex items-center gap-1', readOnlyClassName)}>
                  <Calendar
                    className={cn(
                      isV2 ? 'h-4 w-4 text-[var(--v2-gold)]' : 'h-3 w-3 text-muted-foreground'
                    )}
                  />
                  <span>
                    {event?.startDate ? formatDateSafe(event.startDate) : ''}
                    {event?.endDate && event.endDate !== event.startDate && (
                      <span className="text-muted-foreground">
                        {' - '}
                        {formatDateSafe(event.endDate)}
                      </span>
                    )}
                  </span>
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="endDate" className={labelClassName}>
                Data de Fim (opcional)
              </Label>
              {isEditing ? (
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate as string | undefined}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  data-testid="input-event-end-date"
                  className={fieldClassName}
                />
              ) : (
                <div className={cn('flex items-center gap-1', readOnlyClassName)}>
                  <Calendar
                    className={cn(
                      isV2 ? 'h-4 w-4 text-[var(--v2-gold)]' : 'h-3 w-3 text-muted-foreground'
                    )}
                  />
                  <span>{event?.endDate ? formatDateSafe(event.endDate) : 'Evento de um dia'}</span>
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="time" className={labelClassName}>
                Horário
              </Label>
              {isEditing ? (
                <Input
                  id="time"
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  data-testid="input-event-time"
                  className={fieldClassName}
                />
              ) : (
                <div className={cn('flex items-center gap-1', readOnlyClassName)}>
                  <Clock
                    className={cn(
                      isV2 ? 'h-4 w-4 text-[var(--v2-gold)]' : 'h-3 w-3 text-muted-foreground'
                    )}
                  />
                  <span>
                    {event?.time} ({formatDuration(event?.duration || 0)})
                  </span>
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="duration" className={labelClassName}>
                Duração
              </Label>
              {isEditing ? (
                <Input
                  id="duration"
                  type="number"
                  min="15"
                  step="15"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                  data-testid="input-event-duration"
                  className={fieldClassName}
                />
              ) : (
                <p className={readOnlyClassName}>{formatDuration(event?.duration || 0)}</p>
              )}
            </div>

            <div>
              <Label htmlFor="maxAttendees" className={labelClassName}>
                Capacidade
              </Label>
              {isEditing ? (
                <Input
                  id="maxAttendees"
                  type="number"
                  min="1"
                  value={formData.maxAttendees}
                  onChange={(e) =>
                    setFormData({ ...formData, maxAttendees: parseInt(e.target.value) })
                  }
                  data-testid="input-event-capacity"
                  className={fieldClassName}
                />
              ) : (
                <div className={cn('flex items-center gap-1', readOnlyClassName)}>
                  <Users
                    className={cn(
                      isV2 ? 'h-4 w-4 text-[var(--v2-gold)]' : 'h-3 w-3 text-muted-foreground'
                    )}
                  />
                  <span>
                    {event?.attendees || 0}/{event?.maxAttendees} pessoas
                  </span>
                </div>
              )}
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="location" className={labelClassName}>
                Local
              </Label>
              {isEditing ? (
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Ex: Igreja Central"
                  data-testid="input-event-location"
                  className={fieldClassName}
                />
              ) : (
                <div className={cn('flex items-center gap-1', readOnlyClassName)}>
                  <MapPin
                    className={cn(
                      isV2 ? 'h-4 w-4 text-[var(--v2-gold)]' : 'h-3 w-3 text-muted-foreground'
                    )}
                  />
                  <span>{event?.location || 'Local não informado'}</span>
                </div>
              )}
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="organizer" className={labelClassName}>
                Organizador
              </Label>
              {isEditing ? (
                <Input
                  id="organizer"
                  value={formData.organizer}
                  onChange={(e) => setFormData({ ...formData, organizer: e.target.value })}
                  placeholder="Nome do organizador"
                  data-testid="input-event-organizer"
                  className={fieldClassName}
                />
              ) : (
                <div className={cn('flex items-center gap-1', readOnlyClassName)}>
                  <User
                    className={cn(
                      isV2 ? 'h-4 w-4 text-[var(--v2-gold)]' : 'h-3 w-3 text-muted-foreground'
                    )}
                  />
                  <span>{event?.organizer || 'Organizador não informado'}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          {event && !isEditing && onDelete && (
            <div
              className={cn(
                'flex justify-end pt-3 border-t mt-4',
                isV2 ? 'border-[var(--p7-border)]' : ''
              )}
            >
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onDelete(event.id)}
                data-testid="button-delete-event"
                className={cn(
                  isV2 ? 'h-9 rounded-full px-4 text-xs font-bold' : 'h-7 px-2 text-xs'
                )}
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
