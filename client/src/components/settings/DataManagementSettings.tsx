/**
 * Data Import/Export Settings Component
 * Gerenciamento de importação e exportação de dados
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Database,
  Upload,
  Download,
  FileSpreadsheet,
  Cloud,
  Loader2,
  CheckCircle,
  Trash2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { fetchWithAuth } from '@/lib/api';
import { useLastImportDate } from '@/hooks/useLastImportDate';
import { ImportExcelModal } from '@/components/calendar/ImportExcelModal';
import { GoogleDriveImportModal } from '@/components/calendar/GoogleDriveImportModal';
import { exportToExcel } from '@/lib/excel';

interface DataManagementProps {
  onImportComplete?: () => void;
}

export function DataManagementSettings({ onImportComplete }: DataManagementProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { lastImportDate, updateLastImportDate } = useLastImportDate();

  const [isExporting, setIsExporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDriveModal, setShowDriveModal] = useState(false);
  const [importProgress, _setImportProgress] = useState(0);

  const isPastor = user?.role === 'pastor' && user?.districtId;

  const exportData = async (format: 'json' | 'xlsx') => {
    setIsExporting(true);
    try {
      const response = await fetchWithAuth('/api/users');
      if (!response.ok) throw new Error('Erro ao buscar dados');

      const users = await response.json();

      if (format === 'json') {
        const blob = new Blob([JSON.stringify(users, null, 2)], {
          type: 'application/json',
        });
        downloadBlob(blob, `7care-export-${getDateString()}.json`);
      } else {
        await exportToExcel(users, `7care-export-${getDateString()}.xlsx`, 'Membros');
      }

      toast({
        title: 'Exportação concluída',
        description: `Dados exportados em formato ${format.toUpperCase()}`,
      });
    } catch (error) {
      toast({
        title: 'Erro na exportação',
        description: (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getDateString = () => {
    return new Date().toISOString().split('T')[0];
  };

  const clearDistrictData = async () => {
    if (!user?.districtId) return;
    setIsClearing(true);
    try {
      const response = await fetchWithAuth(`/api/districts/${user.districtId}/data`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao limpar dados');

      toast({
        title: 'Dados limpos',
        description: data.message || 'Dados do distrito removidos com sucesso.',
      });
      onImportComplete?.();
    } catch (error) {
      toast({
        title: 'Erro ao limpar dados',
        description: (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setIsClearing(false);
    }
  };

  const handleImportSuccess = () => {
    // Atualiza data da última importação
    updateLastImportDate(new Date().toISOString());
    onImportComplete?.();
    toast({
      title: 'Importação concluída',
      description: 'Os dados foram importados com sucesso.',
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Gerenciamento de Dados
          </CardTitle>
          <CardDescription>Importe e exporte dados do sistema</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Última importação */}
          {lastImportDate && (
            <Alert>
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertDescription>
                Última importação: {new Date(lastImportDate).toLocaleString('pt-BR')}
              </AlertDescription>
            </Alert>
          )}

          {/* Importação */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Importar Dados
            </h4>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                variant="outline"
                onClick={() => setShowImportModal(true)}
                className="justify-start"
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Importar Excel
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowDriveModal(true)}
                className="justify-start"
              >
                <Cloud className="h-4 w-4 mr-2" />
                Google Drive
              </Button>
            </div>
          </div>

          {/* Exportação */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <Download className="h-4 w-4" />
              Exportar Dados
            </h4>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                variant="outline"
                onClick={() => exportData('xlsx')}
                disabled={isExporting}
                className="justify-start"
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                )}
                Exportar Excel
              </Button>
              <Button
                variant="outline"
                onClick={() => exportData('json')}
                disabled={isExporting}
                className="justify-start"
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Database className="h-4 w-4 mr-2" />
                )}
                Exportar JSON
              </Button>
            </div>
          </div>

          {/* Limpar dados do distrito (apenas pastores) */}
          {isPastor && (
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2 text-destructive">
                <Trash2 className="h-4 w-4" />
                Limpar Dados do Distrito
              </h4>
              <p className="text-sm text-muted-foreground">
                Remove todos os dados do seu distrito: membros, relacionamentos, eventos, pedidos
                de oracao e demais registros. Seu acesso de pastor e o distrito permanecem intactos.
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={isClearing}>
                    {isClearing ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 mr-2" />
                    )}
                    Limpar todos os dados do distrito
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta acao vai remover permanentemente todos os membros, relacionamentos,
                      eventos, pedidos de oracao e demais dados do seu distrito. Seu usuario de
                      pastor e o distrito nao serao afetados. Esta acao nao pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={clearDistrictData}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Sim, limpar tudo
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}

          {/* Progresso de importação */}
          {importProgress > 0 && importProgress < 100 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Importando...</span>
                <span>{importProgress}%</span>
              </div>
              <Progress value={importProgress} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modais */}
      <ImportExcelModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportComplete={handleImportSuccess}
      />

      <GoogleDriveImportModal
        isOpen={showDriveModal}
        onClose={() => setShowDriveModal(false)}
        onImportComplete={handleImportSuccess}
      />
    </>
  );
}

export default DataManagementSettings;
