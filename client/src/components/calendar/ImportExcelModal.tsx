import React, { useState } from 'react';
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
    dateStr: any
  ): string | { startDate: string; endDate: string } | null => {
    if (!dateStr) return null;

    console.log(`📅 Parsing date: "${dateStr}"`);

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
        const date = new Date(year, month - 1, day);
        console.log(`✅ Parsed DD/MM/YYYY: ${date.toISOString()}`);
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
          startDate: new Date(startParts[2], startParts[1] - 1, startParts[0]).toISOString(),
          endDate: new Date(endParts[2], endParts[1] - 1, endParts[0]).toISOString(),
        };
        console.log(`✅ Parsed full period: ${result.startDate} - ${result.endDate}`);
        return result;
      }

      // Formato DD/MM - DD/MM (período sem ano)
      const period = dateStr.match(/^(\d{1,2})\/(\d{1,2})\s*-\s*(\d{1,2})\/(\d{1,2})$/);
      if (period) {
        const [, startDay, startMonth, endDay, endMonth] = period;
        const currentYear = new Date().getFullYear();
        const result = {
          startDate: new Date(currentYear, startMonth - 1, startDay).toISOString(),
          endDate: new Date(currentYear, endMonth - 1, endDay).toISOString(),
        };
        console.log(`✅ Parsed period: ${result.startDate} - ${result.endDate}`);
        return result;
      }

      // Formato DD/MM
      const ddmm = dateStr.match(/^(\d{1,2})\/(\d{1,2})$/);
      if (ddmm) {
        const [, day, month] = ddmm;
        const currentYear = new Date().getFullYear();
        const date = new Date(currentYear, month - 1, day);
        console.log(`✅ Parsed DD/MM: ${date.toISOString()}`);
        return date.toISOString();
      }

      // Tentar parsear como número de data Excel
      if (!isNaN(dateStr) && !isNaN(parseFloat(dateStr))) {
        try {
          const excelDate = parseFloat(dateStr);
          const date = new Date((excelDate - 25569) * 86400 * 1000);
          console.log(`✅ Parsed Excel date: ${date.toISOString()}`);
          return date.toISOString();
        } catch (e) {
          console.log(`⚠️ Erro ao converter data Excel: ${(e as Error).message}`);
        }
      }
    }

    // Tentar parsear como data normal
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      console.log(`✅ Parsed as Date: ${date.toISOString()}`);
      return date.toISOString();
    }

    console.log(`❌ Could not parse date: ${dateStr}`);
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

  const parseExcelFile = async (file: File): Promise<any[]> => {
    try {
      const { data: jsonData, sheetName } = await readExcelAsRawData(file);

      console.log('📋 Planilha encontrada:', sheetName);
      console.log('📄 Total de linhas na planilha:', jsonData.length);
      console.log('📄 Primeiras linhas:', jsonData.slice(0, 5));

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
        console.log('📋 Cabeçalhos encontrados:', headers);

        // Tentar encontrar colunas por nome
        (headers as string[]).forEach((header, index) => {
          if (header && typeof header === 'string') {
            const lowerHeader = header.toLowerCase();
            if (lowerHeader.includes('mês') || lowerHeader.includes('mes'))
              columnIndexes.mes = index;
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
        console.log('🔍 Usando índices fixos como fallback...');
        columnIndexes = {
          mes: 0, // Primeira coluna
          categoria: 1, // Segunda coluna
          data: 2, // Terceira coluna
          evento: 3, // Quarta coluna
        };
      }

      console.log('🔍 Índices de colunas finais:', columnIndexes);

      const events: any[] = [];

      let processedRows = 0;
      let skippedRows = 0;
      let errorRows = 0;

      // Processar cada linha (pular cabeçalho)
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i] as any[];
        processedRows++;

        // Pular linhas vazias ou sem dados relevantes
        if (!row || row.length === 0 || !row.some(cell => cell)) {
          console.log(`⏭️ Linha ${i} vazia, pulando`);
          skippedRows++;
          continue;
        }

        const mes = row[columnIndexes.mes];
        const categoria = row[columnIndexes.categoria];
        const data = row[columnIndexes.data];
        const evento = row[columnIndexes.evento];

        console.log(`🔍 Processando linha ${i}:`, { mes, categoria, data, evento });

        // Pular se não tem evento
        if (!evento || evento.toString().trim() === '') {
          console.log(`⏭️ Linha ${i} sem evento, pulando`);
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
            console.warn(`⚠️ Data inválida na linha ${i}: ${data}. Pulando evento.`);
            errorRows++;
            continue;
          }

          // Criar evento
          const event = {
            title: evento.toString().trim(),
            type: mapEventType(categoria),
            date: startDate,
            endDate: endDate,
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
          console.log(
            `✅ Evento criado (${events.length}): ${event.title} (${event.type}) - ${startDate}`
          );
        } catch (error) {
          console.error(`❌ Erro ao processar linha ${i}:`, error);
          errorRows++;
        }
      }

      console.log(`📊 Resumo do processamento:`);
      console.log(`   - Linhas processadas: ${processedRows}`);
      console.log(`   - Eventos criados: ${events.length}`);
      console.log(`   - Linhas puladas: ${skippedRows}`);
      console.log(`   - Linhas com erro: ${errorRows}`);

      console.log(`🎉 Total de eventos processados: ${events.length}`);
      return events;
    } catch (error) {
      console.error('❌ Erro ao processar Excel:', error);
      throw new Error(`Erro ao processar arquivo Excel: ${(error as Error).message}`);
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
      console.error('Erro ao importar:', error);
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

          <div className="text-sm text-gray-600">
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
