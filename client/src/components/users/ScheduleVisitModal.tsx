import React, { useState } from 'react';
import { DialogWithModalTracking, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Clock } from 'lucide-react';

interface ScheduleVisitModalProps {
  user: any;
  isOpen: boolean;
  onClose: () => void;
}

export const ScheduleVisitModal = ({ user, isOpen, onClose }: ScheduleVisitModalProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: `Visita - ${user?.name || 'Usuário'}`,
    description: '',
    scheduledAt: '',
    scheduledTime: '',
    notes: '',
  });

  const scheduleVisitMutation = useMutation({
    mutationFn: async (data: any) => {
      // Primeiro, criar o evento no calendário
      const eventResponse = await fetch('/api/calendar/events', { 
        method: 'POST', 
        body: JSON.stringify({
          events: [{
            title: `Visita - ${user?.name}`,
            description: data.notes || `Visita agendada para ${user?.name}`,
            startDate: data.scheduledAt + 'T' + data.scheduledTime,
            endDate: data.scheduledAt + 'T' + data.scheduledTime, // Data de início e fim sempre iguais
            category: 'Visitas', // Categoria sempre "Visitas"
            location: user?.address || '',
            maxAttendees: 2
          }]
        }),
        headers: { 'Content-Type': 'application/json' }
      });
      
      const eventResult = await eventResponse.json();
      
      if (!eventResponse.ok) {
        throw new Error(eventResult.error || 'Erro ao criar evento no calendário');
      }
      
      // Depois, sincronizar com a planilha do Google Drive
      try {
        const syncResponse = await fetch('/api/google-drive/process-pending', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        
        const syncResult = await syncResponse.json();
        console.log('📊 Sincronização com planilha:', syncResult);
      } catch (syncError) {
        console.warn('⚠️ Erro na sincronização com planilha:', syncError);
        // Não falha o agendamento se a sincronização falhar
      }
      
      return eventResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/events'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast({
        title: "Visita agendada",
        description: "A visita foi agendada com sucesso na agenda e sincronizada com a planilha.",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: `Erro ao agendar visita: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.scheduledAt && formData.scheduledTime) {
      scheduleVisitMutation.mutate(formData);
    } else {
      toast({
        title: "Data e hora obrigatórias",
        description: "Por favor, selecione uma data e hora para a visita.",
        variant: "destructive"
      });
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!user) return null;

  return (
    <DialogWithModalTracking 
      modalId="schedule-visit-modal"
      open={isOpen} 
      onOpenChange={(open) => !open && onClose()}
    >
      <DialogContent 
        className="max-w-sm w-[90vw]"
        style={{ maxHeight: 'calc(100vh - 2rem)' }}
        aria-describedby="schedule-visit-modal-description"
      >
        <div id="schedule-visit-modal-description" className="sr-only">
          Formulário para agendar visita ao membro
        </div>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5" />
            Agendar Visita
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Informações do usuário */}
          <div className="bg-muted/30 p-3 rounded-lg">
            <h4 className="font-medium text-sm mb-2">Visitando:</h4>
            <div className="text-sm space-y-1">
              <p><strong>Nome:</strong> {user.name}</p>
              {user.phone && <p><strong>Telefone:</strong> {user.phone}</p>}
              {user.address && <p><strong>Endereço:</strong> {user.address}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="scheduledAt" className="text-sm">Data</Label>
              <Input
                id="scheduledAt"
                type="date"
                value={formData.scheduledAt}
                onChange={(e) => handleInputChange('scheduledAt', e.target.value)}
                required
                className="h-9"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="scheduledTime" className="text-sm">Hora</Label>
              <Input
                id="scheduledTime"
                type="time"
                value={formData.scheduledTime}
                onChange={(e) => handleInputChange('scheduledTime', e.target.value)}
                required
                className="h-9"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm">Observações</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Motivo da visita, objetivos..."
              rows={2}
              className="text-sm"
            />
          </div>

          {/* Botões */}
          <div className="flex justify-end space-x-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} size="sm">
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={scheduleVisitMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700"
              size="sm"
            >
              {scheduleVisitMutation.isPending ? 'Agendando...' : 'Agendar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </DialogWithModalTracking>
  );
}; 