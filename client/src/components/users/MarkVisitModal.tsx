import React, { useState, useEffect } from 'react';
import { DialogWithModalTracking, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar, CheckCircle, XCircle, Clock, Users } from 'lucide-react';

interface MarkVisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (visitDate: string) => void;
  userName: string;
  isLoading?: boolean;
  visitCount?: number;
  lastVisitDate?: string;
}

export const MarkVisitModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  userName, 
  isLoading = false,
  visitCount = 0,
  lastVisitDate
}: MarkVisitModalProps) => {
  const [visitDate, setVisitDate] = useState('');

  // Definir data atual quando o modal abrir (Brasil timezone)
  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const brazilTime = new Date(now.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
      const year = brazilTime.getFullYear();
      const month = String(brazilTime.getMonth() + 1).padStart(2, '0');
      const day = String(brazilTime.getDate()).padStart(2, '0');
      setVisitDate(`${year}-${month}-${day}`);
    }
  }, [isOpen]);

  const handleConfirm = () => {
    if (visitDate) {
      onConfirm(visitDate);
    }
  };

  const handleCancel = () => {
    setVisitDate('');
    onClose();
  };

  const formatVisitDate = (dateString: string) => {
    if (!dateString) return '';
    
    try {
      let date;
      
      // Se a data já tem timezone info (formato ISO), usa diretamente
      if (dateString.includes('T') || dateString.includes('Z')) {
        date = new Date(dateString);
      } else {
        // Se é apenas data (YYYY-MM-DD), adiciona timezone do Brasil
        date = new Date(dateString + 'T00:00:00-03:00');
      }
      
      // Verifica se a data é válida
      if (isNaN(date.getTime())) {
        console.warn('Data inválida:', dateString);
        return 'Data inválida';
      }
      
      return date.toLocaleDateString('pt-BR');
    } catch (error) {
      console.error('Erro ao formatar data:', dateString, error);
      return 'Data inválida';
    }
  };

  const isNewVisit = visitCount === 0;
  const isRevisit = visitCount > 0;

  return (
    <DialogWithModalTracking 
      modalId="mark-visit-modal"
      open={isOpen} 
      onOpenChange={(open) => !open && onClose()}
    >
      <DialogContent 
        className="sm:max-w-md w-[90vw]"
        style={{ maxHeight: 'calc(100vh - 2rem)' }}
        aria-describedby="mark-visit-modal-description"
      >
        <div id="mark-visit-modal-description" className="sr-only">
          {isNewVisit ? 'Formulário para registrar primeira visita realizada' : 'Formulário para registrar nova visita realizada'}
        </div>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            {isNewVisit ? 'Registrar Primeira Visita Realizada' : 'Registrar Nova Visita Realizada'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            {isNewVisit 
              ? `Confirmar que a primeira visita ao membro <strong>${userName}</strong> foi realizada.`
              : `Confirmar que uma nova visita ao membro <strong>${userName}</strong> foi realizada.`
            }
          </div>
          
          {/* Informações de visitas anteriores */}
          {isRevisit && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Histórico de Visitas</span>
              </div>
              <div className="space-y-1 text-xs text-blue-700">
                <div className="flex items-center justify-between">
                  <span>Total de visitas:</span>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                    {visitCount} visita{visitCount > 1 ? 's' : ''}
                  </Badge>
                </div>
                {lastVisitDate && (
                  <div className="flex items-center justify-between">
                    <span>Última visita:</span>
                    <span className="font-medium">{formatVisitDate(lastVisitDate)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="visit-date">
              {isNewVisit ? 'Data da Primeira Visita Realizada' : 'Data da Nova Visita Realizada'}
            </Label>
            <Input
              id="visit-date"
              type="date"
              value={visitDate}
              onChange={(e) => setVisitDate(e.target.value)}
              className="w-full"
              max={new Date().toISOString().split('T')[0]} // Não permite datas futuras
            />
            <p className="text-xs text-muted-foreground">
              {isNewVisit 
                ? 'Esta será a primeira visita realizada registrada para este membro.'
                : 'Esta visita realizada será adicionada ao histórico existente.'
              }
            </p>
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!visitDate || isLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {isLoading ? 'Confirmando...' : isNewVisit ? 'Confirmar Primeira Visita Realizada' : 'Confirmar Nova Visita Realizada'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </DialogWithModalTracking>
  );
}; 