import { useState } from 'react';
import { settingsLogger } from '@/lib/logger';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users, Download, Upload, Trash2, Calendar, Cloud, Filter, Building2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Event } from '@/types/domain';
import { useLastImportDate } from '@/hooks/useLastImportDate';
import { ImportExcelModal } from '@/components/calendar/ImportExcelModal';
import { GoogleDriveImportModal } from '@/components/calendar/GoogleDriveImportModal';
import { GoogleCalendarConfigModal } from '@/components/calendar/GoogleCalendarConfigModal';
import { EventPermissionsModal } from '@/components/calendar/EventPermissionsModal';
import { useQueryClient } from '@tanstack/react-query';
import { exportToExcel } from '@/lib/excel';
import { fetchWithAuth } from '@/lib/api';

interface CalendarManagementTabProps {
  user: Pick<import('@/types/domain').UserMember, 'id' | 'role' | 'church' | 'districtId'>;
  userDistrictId: number | null;
  userDistrictName: string;
}

export function CalendarManagementTab({
  user,
  userDistrictId,
  userDistrictName,
}: CalendarManagementTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { updateLastImportDate } = useLastImportDate();

  const [showImportExcelModal, setShowImportExcelModal] = useState(false);
  const [showGoogleDriveModal, setShowGoogleDriveModal] = useState(false);
  const [showGoogleCalendarModal, setShowGoogleCalendarModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  // TODO: Implement Power BI user data import modal (placeholder state)
  const [_showUserDataImportModal, setShowUserDataImportModal] = useState(false);

  const handleImportComplete = () => {
    queryClient.invalidateQueries({ queryKey: ['events'] });
    updateLastImportDate(new Date().toISOString());
    toast({
      title: 'Agenda atualizada',
      description: 'Os eventos foram importados e a agenda foi atualizada.',
    });
  };

  const handleClearAllEvents = async () => {
    const confirmed = window.confirm(
      '⚠️ ATENÇÃO: Esta ação irá excluir TODOS os eventos da agenda permanentemente!\n\n' +
        'Isso inclui:\n' +
        '• Todos os eventos criados\n' +
        '• Todos os eventos importados\n' +
        '• Todos os tipos de eventos\n\n' +
        'Esta ação NÃO PODE SER DESFEITA!\n\n' +
        'Tem certeza que deseja continuar?'
    );

    if (!confirmed) return;

    const doubleConfirm = window.confirm(
      'ÚLTIMA CONFIRMAÇÃO:\n\n' +
        'Você tem ABSOLUTA CERTEZA que deseja excluir TODOS os eventos da agenda?\n\n' +
        "Digite 'CONFIRMAR' no próximo prompt para prosseguir."
    );

    if (!doubleConfirm) return;

    const finalConfirm = prompt(
      'Para confirmar a exclusão de TODOS os eventos, digite exatamente: CONFIRMAR'
    );

    if (finalConfirm !== 'CONFIRMAR') {
      toast({
        title: 'Operação cancelada',
        description: 'A limpeza dos eventos foi cancelada.',
      });
      return;
    }

    try {
      const response = await fetchWithAuth('/api/events', {
        method: 'DELETE',
      });

      const result = await response.json();

      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ['events'] });
        queryClient.invalidateQueries({ queryKey: ['events', user?.role] });
        queryClient.removeQueries({ queryKey: ['events'] });
        queryClient.removeQueries({ queryKey: ['events', user?.role] });
        queryClient.refetchQueries({ queryKey: ['events'] });
        queryClient.refetchQueries({ queryKey: ['events', user?.role] });

        toast({
          title: 'Eventos removidos',
          description: result.message || 'Todos os eventos foram removidos com sucesso.',
        });
      } else {
        throw new Error(result.error || 'Falha ao limpar eventos');
      }
    } catch (error) {
      settingsLogger.error('Clear events error:', error);
      toast({
        title: 'Erro ao limpar eventos',
        description: error instanceof Error ? error.message : 'Ocorreu um erro inesperado.',
        variant: 'destructive',
      });
    }
  };

  const handleExportCalendar = async () => {
    try {
      const response = await fetchWithAuth('/api/events');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao buscar eventos');
      }

      const events = Array.isArray(result) ? result : result.events || [];

      settingsLogger.debug('🔍 Debug Export - Total eventos encontrados:', events.length);
      settingsLogger.debug('🔍 Debug Export - Primeiro evento:', events[0]);

      if (events.length === 0) {
        toast({
          title: 'Agenda vazia',
          description: 'Não há eventos para exportar.',
          variant: 'destructive',
        });
        return;
      }

      const exportData = events.map(
        (event: Event & { startDate?: string; end_date?: string; endDate?: string }) => {
          const eventDate = event.date || event.startDate;
          const month = eventDate
            ? new Date(eventDate).toLocaleDateString('pt-BR', { month: 'long' })
            : '';

          const category = event.type || '';

          let formattedDate = '';
          if (eventDate) {
            const startDate = new Date(eventDate);
            const startDay = String(startDate.getDate()).padStart(2, '0');
            const startMonth = String(startDate.getMonth() + 1).padStart(2, '0');
            const startYear = startDate.getFullYear();

            const endDateValue = event.end_date || event.endDate;
            if (endDateValue && endDateValue !== eventDate) {
              const endDate = new Date(endDateValue);
              const endDay = String(endDate.getDate()).padStart(2, '0');
              const endMonth = String(endDate.getMonth() + 1).padStart(2, '0');
              const endYear = endDate.getFullYear();

              if (startYear === endYear && startMonth === endMonth) {
                formattedDate = `${startDay}/${startMonth} - ${endDay}/${endMonth}`;
              } else if (startYear === endYear) {
                formattedDate = `${startDay}/${startMonth} - ${endDay}/${endMonth}`;
              } else {
                formattedDate = `${startDay}/${startMonth}/${startYear} - ${endDay}/${endMonth}/${endYear}`;
              }
            } else {
              formattedDate = `${startDay}/${startMonth}/${startYear}`;
            }
          }

          const eventTitle = event.title || '';

          return {
            Mês: month,
            Categoria: category,
            Data: formattedDate,
            Evento: eventTitle,
          };
        }
      );

      settingsLogger.debug(
        '🔍 Debug Export - Dados processados para Excel:',
        exportData.slice(0, 3)
      );

      const now = new Date();
      const dateStr = now.toLocaleDateString('pt-BR').replace(/\//g, '-');
      const fileName = `agenda-${dateStr}.xlsx`;

      await exportToExcel(exportData, fileName, 'Agenda');

      toast({
        title: 'Exportação concluída',
        description: `${events.length} eventos exportados com sucesso para ${fileName}`,
      });
    } catch (error) {
      settingsLogger.error('Erro ao exportar agenda:', error);
      toast({
        title: 'Erro na exportação',
        description: 'Não foi possível exportar a agenda. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Gerenciamento do Calendário
            {userDistrictId && user?.role !== 'superadmin' && (
              <Badge variant="outline" className="ml-2">
                {userDistrictName}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            {user?.role === 'superadmin'
              ? 'Importar, exportar e gerenciar eventos da agenda (Sistema completo)'
              : `Importar, exportar e gerenciar eventos da agenda do ${userDistrictName || 'seu distrito'}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Indicador de Filtro por Distrito */}
          {userDistrictId && user?.role !== 'superadmin' && (
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-purple-600" />
                <p className="text-sm text-purple-800">
                  Operações limitadas aos eventos do <strong>{userDistrictName}</strong>
                </p>
              </div>
            </div>
          )}

          {/* Ações de Importação */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-3">Importação de Dados</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Button
                  onClick={() => setShowUserDataImportModal(true)}
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-start gap-2 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 hover:border-blue-300"
                >
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-blue-900">Importar Dados de Usuários</span>
                  </div>
                  <span className="text-sm text-blue-700 text-left">
                    Importar dados de pontuação do Power BI (.xlsx)
                  </span>
                </Button>

                <Button
                  onClick={() => setShowImportExcelModal(true)}
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-start gap-2"
                >
                  <div className="flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    <span className="font-medium">Importar Eventos</span>
                  </div>
                  <span className="text-sm text-muted-foreground text-left">
                    Importar eventos de um arquivo Excel (.xlsx)
                  </span>
                </Button>

                <Button
                  onClick={() => setShowGoogleDriveModal(true)}
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-start gap-2"
                >
                  <div className="flex items-center gap-2">
                    <Cloud className="h-4 w-4" />
                    <span className="font-medium">Google Drive</span>
                  </div>
                  <span className="text-sm text-muted-foreground text-left">
                    Sincronizar com planilha do Google Drive
                  </span>
                </Button>

                <Button
                  onClick={() => setShowGoogleCalendarModal(true)}
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-start gap-2"
                >
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span className="font-medium">Google Calendar</span>
                  </div>
                  <span className="text-sm text-muted-foreground text-left">
                    Sincronizar eventos do Google Calendar
                  </span>
                </Button>
              </div>
            </div>

            {/* Ações de Gerenciamento */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Gerenciamento</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Permissões - Apenas superadmin pode modificar (configuração global) */}
                {user?.role === 'superadmin' && (
                  <Button
                    onClick={() => setShowPermissionsModal(true)}
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-start gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      <span className="font-medium">Permissões de Visualização</span>
                    </div>
                    <span className="text-sm text-muted-foreground text-left">
                      Configuração global de quem pode ver cada tipo de evento
                    </span>
                  </Button>
                )}

                <Button
                  onClick={handleExportCalendar}
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-start gap-2"
                >
                  <div className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    <span className="font-medium">Exportar Agenda</span>
                  </div>
                  <span className="text-sm text-muted-foreground text-left">
                    {user?.role === 'superadmin'
                      ? 'Baixar todos os eventos em formato Excel'
                      : `Baixar eventos do ${userDistrictName || 'seu distrito'}`}
                  </span>
                </Button>
              </div>
            </div>

            {/* Ações de Limpeza - Apenas superadmin */}
            {user?.role === 'superadmin' && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Limpeza de Dados</h3>
                <div className="flex flex-col gap-3">
                  <Button
                    onClick={handleClearAllEvents}
                    variant="destructive"
                    className="h-auto p-4 flex flex-col items-start gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <Trash2 className="h-4 w-4" />
                      <span className="font-medium">Limpar Todos os Eventos</span>
                    </div>
                    <span className="text-sm text-muted-foreground text-left">
                      ⚠️ Remove permanentemente todos os eventos da agenda
                    </span>
                  </Button>
                </div>
              </div>
            )}

            {/* Informações */}
            <Alert>
              <Calendar className="h-4 w-4" />
              <AlertDescription>
                <strong>Dica:</strong> Use o Google Drive para sincronização em tempo real com uma
                planilha online. As alterações na planilha serão automaticamente refletidas no
                calendário.
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>

      {/* Modais do Calendário */}
      <ImportExcelModal
        isOpen={showImportExcelModal}
        onClose={() => setShowImportExcelModal(false)}
        onImportComplete={handleImportComplete}
      />

      <GoogleDriveImportModal
        isOpen={showGoogleDriveModal}
        onClose={() => setShowGoogleDriveModal(false)}
        onImportComplete={handleImportComplete}
      />

      <GoogleCalendarConfigModal
        isOpen={showGoogleCalendarModal}
        onClose={() => setShowGoogleCalendarModal(false)}
        onSyncComplete={handleImportComplete}
      />

      <EventPermissionsModal
        isOpen={showPermissionsModal}
        onClose={() => setShowPermissionsModal(false)}
      />
    </>
  );
}
