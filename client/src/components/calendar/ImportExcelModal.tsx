import React, { useState } from 'react';
import { calendarLogger } from '@/lib/logger';
import {
  DialogWithModalTracking,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { readExcelAsRawData } from '@/lib/excel';

interface ImportExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: () => void;
}

type ParsedEvent = {
  title: string;
  type: string;
  date: string;
  endDate: string | null;
  description: string;
  originalData: Record<string, unknown>;
};

export function ImportExcelModal({ isOpen, onClose, onImportComplete }: ImportExcelModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setMessage('');
    }
  };

  const parseBrazilianDate = (
    dateStr: string | number | Date | null | undefined
  ): string | { startDate: string; endDate: string } | null => {
    if (!dateStr) return null;

    calendarLogger.debug(`Parsing date: "${dateStr}"`);

    // Se já é uma data válida, retornar
    if (dateStr instanceof Date) {
      return dateStr.toISOString();
    }

    // Se é string, tentar diferentes formatos
    if (typeof dateStr === 'string') {
      dateStr = dateStr.toString().trim();

      // Formato DD/MM/YYYY
      const ddmmyyyy = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (ddmmyyyy) {
        const [, day, month, year] = ddmmyyyy;
        const date = new Date(Number(year), Number(month) - 1, Number(day));
        calendarLogger.debug(`Parsed DD/MM/YYYY: ${date.toISOString()}`);
        return date.toISOString();
      }

      // Formato DD/MM/YYYY - DD/MM/YYYY (período completo)
      const fullPeriod = dateStr.match(
        /^(\d{1,2}\/\d{1,2}\/\d{4})\s*-\s*(\d{1,2}\/\d{1,2}\/\d{4})$/
      );
      if (fullPeriod) {
        const [, startStr, endStr] = fullPeriod;
        const startParts = startStr.split('/');
        const endParts = endStr.split('/');
        const result = {
          startDate: new Date(
            Number(startParts[2]),
            Number(startParts[1]) - 1,
            Number(startParts[0])
          ).toISOString(),
          endDate: new Date(
            Number(endParts[2]),
            Number(endParts[1]) - 1,
            Number(endParts[0])
          ).toISOString(),
        };
        calendarLogger.debug(`Parsed full period: ${result.startDate} - ${result.endDate}`);
        return result;
      }

      // Formato DD/MM - DD/MM (período sem ano)
      const period = dateStr.match(/^(\d{1,2})\/(\d{1,2})\s*-\s*(\d{1,2})\/(\d{1,2})$/);
      if (period) {
        const [, startDay, startMonth, endDay, endMonth] = period;
        const currentYear = new Date().getFullYear();
        const result = {
          startDate: new Date(currentYear, Number(startMonth) - 1, Number(startDay)).toISOString(),
          endDate: new Date(currentYear, Number(endMonth) - 1, Number(endDay)).toISOString(),
        };
        calendarLogger.debug(`Parsed period: ${result.startDate} - ${result.endDate}`);
        return result;
      }

      // Formato DD/MM
      const ddmm = dateStr.match(/^(\d{1,2})\/(\d{1,2})$/);
      if (ddmm) {
        const [, day, month] = ddmm;
        const currentYear = new Date().getFullYear();
        const date = new Date(currentYear, Number(month) - 1, Number(day));
        calendarLogger.debug(`Parsed DD/MM: ${date.toISOString()}`);
        return date.toISOString();
      }

      // Tentar parsear como número de data Excel
      if (!isNaN(Number(dateStr)) && !isNaN(parseFloat(dateStr))) {
        try {
          const excelDate = parseFloat(dateStr);
          const date = new Date((excelDate - 25569) * 86400 * 1000);
          calendarLogger.debug(`Parsed Excel date: ${date.toISOString()}`);
          return date.toISOString();
        } catch (e) {
          calendarLogger.warn(`Erro ao converter data Excel: ${(e as Error).message}`);
        }
      }
    }

    // Tentar parsear como data normal
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      calendarLogger.debug(`Parsed as Date: ${date.toISOString()}`);
      return date.toISOString();
    }

    calendarLogger.warn(`Could not parse date: ${dateStr}`);
    return null;
  };

  const mapEventType = (categoria: string): string => {
    const lowerCategory = categoria ? categoria.toLowerCase() : '';
    if (lowerCategory.includes('igreja local')) return 'igreja-local';
    if (lowerCategory.includes('asr administrativo')) return 'asr-administrativo';
    if (lowerCategory.includes('asr geral')) return 'asr-geral';
    if (lowerCategory.includes('asr pastores')) return 'asr-pastores';
    if (lowerCategory.includes('visitas')) return 'visitas';
    if (lowerCategory.includes('reuniões')) return 'reunioes';
    if (lowerCategory.includes('pregações')) return 'pregacoes';
    return 'geral'; // Tipo padrão
  };

  const parseExcelFile = async (file: File): Promise<ParsedEvent[]> => {
    try {
      const { data: jsonData, sheetName } = await readExcelAsRawData(file);

      calendarLogger.debug('Planilha encontrada:', sheetName);
      calendarLogger.debug('Total de linhas na planilha:', jsonData.length);
      calendarLogger.debug('Primeiras linhas:', jsonData.slice(0, 5));

      if (jsonData.length < 2) {
        throw new Error(
          'Planilha muito pequena - precisa ter pelo menos cabeçalho e uma linha de dados'
        );
      }

      // Tentar detectar colunas automaticamente
      let columnIndexes = {
        mes: -1,
        categoria: -1,
        data: -1,
        evento: -1,
      };

      if (jsonData.length > 0) {
        const headers = jsonData[0];
        calendarLogger.debug('Cabeçalhos encontrados:', headers);

        // Tentar encontrar colunas por nome
        (headers as string[]).forEach((header, index) => {
          if (header && typeof header === 'string') {
            const lowerHeader = header.toLowerCase();
            if (lowerHeader.includes('mês') || lowerHeader.includes('mes')) {
              columnIndexes.mes = index;
            }
            if (lowerHeader.includes('categoria')) columnIndexes.categoria = index;
            if (lowerHeader.includes('data')) columnIndexes.data = index;
            if (lowerHeader.includes('evento')) columnIndexes.evento = index;
          }
        });
      }

      // Se não encontrou colunas por nome, usar índices fixos como fallback
      if (
        columnIndexes.mes === -1 ||
        columnIndexes.categoria === -1 ||
        columnIndexes.data === -1 ||
        columnIndexes.evento === -1
      ) {
        calendarLogger.debug('Usando índices fixos como fallback...');
        columnIndexes = {
          mes: 0, // Primeira coluna
          categoria: 1, // Segunda coluna
          data: 2, // Terceira coluna
          evento: 3, // Quarta coluna
        };
      }

      calendarLogger.debug('Índices de colunas finais:', columnIndexes);

      const events: ParsedEvent[] = [];

      let processedRows = 0;
      let skippedRows = 0;
      let errorRows = 0;

      // Processar cada linha (pular cabeçalho)
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i] as (string | number | null | undefined)[];
        processedRows++;

        // Pular linhas vazias ou sem dados relevantes
        if (!row || row.length === 0 || !row.some((cell) => cell)) {
          calendarLogger.debug(`Linha ${i} vazia, pulando`);
          skippedRows++;
          continue;
        }

        const mes = row[columnIndexes.mes];
        const categoria = row[columnIndexes.categoria];
        const data = row[columnIndexes.data];
        const evento = row[columnIndexes.evento];

        calendarLogger.debug(`Processando linha ${i}:`, { mes, categoria, data, evento });

        // Pular se não tem evento
        if (!evento || evento.toString().trim() === '') {
          calendarLogger.debug(`Linha ${i} sem evento, pulando`);
          skippedRows++;
          continue;
        }

        try {
          // Processar data
          const dateInfo = parseBrazilianDate(data);
          let startDate, endDate;

          if (dateInfo && typeof dateInfo === 'object') {
            // Período (múltiplos dias)
            startDate = dateInfo.startDate;
            endDate = dateInfo.endDate;
          } else if (dateInfo) {
            // Data única
            startDate = dateInfo;
            endDate = null;
          } else {
            calendarLogger.warn(`Data inválida na linha ${i}: ${data}. Pulando evento.`);
            errorRows++;
            continue;
          }

          // Criar evento
          const event = {
            title: evento.toString().trim(),
            type: mapEventType(String(categoria || '')),
            date: startDate,
            endDate,
            description: `${mes || 'Evento'} - ${categoria || 'Categoria não especificada'}`,
            originalData: {
              mes,
              categoria,
              data,
              evento,
              row: i,
            },
          };
          events.push(event);
          calendarLogger.debug(
            `Evento criado (${events.length}): ${event.title} (${event.type}) - ${startDate}`
          );
        } catch (error) {
          calendarLogger.error(`Erro ao processar linha ${i}:`, error);
          errorRows++;
        }
      }

      calendarLogger.debug(`Resumo do processamento:`);
      calendarLogger.debug(`   - Linhas processadas: ${processedRows}`);
      calendarLogger.debug(`   - Eventos criados: ${events.length}`);
      calendarLogger.debug(`   - Linhas puladas: ${skippedRows}`);
      calendarLogger.debug(`   - Linhas com erro: ${errorRows}`);

      calendarLogger.debug(`Total de eventos processados: ${events.length}`);
      return events;
    } catch (error) {
      calendarLogger.error('Erro ao processar Excel:', error);
      throw new Error(`Erro ao processar arquivo Excel: ${(error as Error).message}`, {
        cause: error,
      });
    }
  };

  const handleImport = async () => {
    if (!file) {
      setMessage('Por favor, selecione um arquivo Excel');
      return;
    }

    setIsLoading(true);
    setMessage('Processando arquivo Excel...');

    try {
      // Processar arquivo Excel no frontend
      const events = await parseExcelFile(file);

      if (events.length === 0) {
        setMessage(
          '❌ Nenhum evento encontrado no arquivo Excel. Verifique se o arquivo tem a estrutura correta: Mês, Categoria, Data, Evento'
        );
        setIsLoading(false);
        return;
      }

      setMessage(`Processando ${events.length} eventos...`);

      // Enviar eventos para a API
      const response = await fetch('/api/events/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events }),
      });

      const result = await response.json();

      if (result.success) {
        let message = `✅ ${result.importedEvents} de ${result.totalEvents} eventos importados com sucesso!`;
        if (result.errorCount > 0) {
          message += `\n⚠️ ${result.errorCount} eventos falharam na importação.`;
        }
        setMessage(message);

        // Disparar evento customizado para notificar outros componentes
        window.dispatchEvent(
          new CustomEvent('import-success', {
            detail: {
              imported: result.importedEvents,
              total: result.totalEvents,
              errors: result.errorCount,
            },
          })
        );

        setTimeout(() => {
          onImportComplete?.();
          onClose();
        }, 3000);
      } else {
        setMessage(`❌ ${result.error || 'Erro ao importar eventos'}`);
      }
    } catch (error) {
      calendarLogger.error('Erro ao importar:', error);
      setMessage(`❌ ${(error as Error).message || 'Erro ao processar arquivo Excel'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DialogWithModalTracking modalId="import-excel-modal" open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-md w-[90vw]"
        style={{ maxHeight: 'calc(100vh - 2rem)' }}
        aria-describedby="import-excel-description"
      >
        <DialogHeader>
          <DialogTitle>Importar Calendário Excel</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div id="import-excel-description" className="text-sm text-muted-foreground">
            Selecione um arquivo Excel (.xlsx) com as colunas: Mês, Categoria, Data, Evento
          </div>
          <div className="space-y-2">
            <Label htmlFor="file">Selecionar arquivo Excel (.xlsx)</Label>
            <Input
              id="file"
              type="file"
              accept=".xlsx"
              onChange={handleFileChange}
              disabled={isLoading}
            />
          </div>

          <div className="text-sm text-gray-600 dark:text-gray-300">
            <p>
              <strong>Formato esperado:</strong>
            </p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Coluna A: Mês</li>
              <li>
                Coluna B: Categoria (Igreja Local, ASR Geral, ASR Administrativo, ASR Pastores,
                Visitas, Reuniões, Pregações)
              </li>
              <li>Coluna C: Data (DD/MM, DD/MM/YYYY, DD/MM-DD/MM, DD/MM/YYYY - DD/MM/YYYY)</li>
              <li>Coluna D: Evento</li>
            </ul>
          </div>

          {message && (
            <div
              className={`p-3 rounded-md text-sm ${
                message.includes('✅')
                  ? 'bg-green-100 text-green-800'
                  : message.includes('❌')
                    ? 'bg-red-100 text-red-800'
                    : 'bg-blue-100 text-blue-800'
              }`}
            >
              {message}
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button onClick={handleImport} disabled={!file || isLoading}>
              {isLoading ? 'Importando...' : 'Importar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </DialogWithModalTracking>
  );
}
