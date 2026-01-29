import { Express, Request, Response } from 'express';
import { sql } from '../neonConfig';
import multer from 'multer';
import { readExcelFile, cleanupTempFile, ExcelRow as BaseExcelRow } from '../utils/excelUtils';
import { logger } from '../utils/logger';

const upload = multer({ dest: 'uploads/' });

interface ExcelRow extends BaseExcelRow {
  Evento?: string;
  Data?: string;
  Categoria?: string;
}

export const importRoutes = (app: Express): void => {
  // Novo endpoint de importação simplificado
  app.post(
    '/api/calendar/import-simple',
    upload.single('file'),
    async (req: Request, res: Response) => {
      try {
        logger.info('Importação simplificada iniciada');

        if (!req.file) {
          return res.status(400).json({ error: 'Nenhum arquivo enviado' });
        }

        logger.info(`Arquivo recebido: ${req.file.originalname}`);

        // Verificar se é arquivo XLSX
        if (!req.file.originalname.endsWith('.xlsx')) {
          return res.status(400).json({
            error:
              'Apenas arquivos .xlsx são aceitos. Por favor, converta seu arquivo para formato Excel (.xlsx).',
          });
        }

        // Processar arquivo Excel usando excelUtils
        const filePath = req.file.path;

        const { rows: data, sheetName } = await readExcelFile(filePath);
        logger.info(`Planilha lida: ${sheetName}, ${data.length} linhas`);

        if (!data || data.length === 0) {
          cleanupTempFile(filePath);
          return res.status(400).json({ error: 'Nenhum dado encontrado no arquivo' });
        }

        let importedCount = 0;
        const errors: string[] = [];

        // Mapeamento de categorias - apenas as 7 categorias especificadas
        const categoryMapping = {
          'igreja local': 'igreja-local',
          'igreja-local': 'igreja-local',
          'asr geral': 'asr-geral',
          'asr-geral': 'asr-geral',
          'asr administrativo': 'asr-administrativo',
          'asr-administrativo': 'asr-administrativo',
          'asr pastores': 'asr-pastores',
          'asr-pastores': 'asr-pastores',
          visitas: 'visitas',
          reunioes: 'reunioes',
          reuniões: 'reunioes',
          pregações: 'pregacoes',
          pregacoes: 'pregacoes',
        };

        // Processar cada linha
        for (let i = 0; i < data.length; i++) {
          try {
            const event = data[i] as ExcelRow;

            if (!event.Evento || !event.Data) {
              errors.push(`Linha ${i + 1}: campos obrigatórios ausentes`);
              continue;
            }

            const eventTitle = String(event.Evento).trim();
            const dateString = String(event.Data).trim();
            const category = event.Categoria
              ? String(event.Categoria).trim().toLowerCase()
              : 'reunioes';
            const mappedType = (categoryMapping as Record<string, string>)[category] || 'reunioes';

            // Processar data
            let startDate = '';
            let endDate = '';

            if (dateString.includes('-')) {
              // Evento de múltiplos dias
              const [startPart, endPart] = dateString.split('-');
              const currentYear = new Date().getFullYear();

              // Processar data de início
              const [startDay, startMonth] = startPart.trim().split('/');
              startDate = `${currentYear}-${startMonth.padStart(2, '0')}-${startDay.padStart(2, '0')}`;

              // Processar data de fim
              const [endDay, endMonth] = endPart.trim().split('/');
              endDate = `${currentYear}-${endMonth.padStart(2, '0')}-${endDay.padStart(2, '0')}`;

              logger.info(`Evento de múltiplos dias: ${eventTitle} (${startDate} até ${endDate})`);
            } else {
              // Evento de um dia
              const [day, month] = dateString.split('/');
              const currentYear = new Date().getFullYear();
              startDate = `${currentYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }

            // Criar evento usando SQL direto
            interface EventResult {
              id: number;
              title: string;
              date: string;
            }

            let result: EventResult[] | EventResult;
            if (endDate) {
              // Evento de múltiplos dias - criar múltiplos eventos para cada dia
              const start = new Date(`${startDate}T00:00:00Z`);
              const end = new Date(`${endDate}T23:59:59Z`);
              const days: EventResult[] = [];

              for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const dayDate = d.toISOString().split('T')[0];
                const isStart = dayDate === startDate;
                const isEnd = dayDate === endDate;

                let eventTitleForDay = eventTitle;
                if (isStart) eventTitleForDay = `${eventTitle} (Início)`;
                else if (isEnd) eventTitleForDay = `${eventTitle} (Fim)`;
                else eventTitleForDay = `${eventTitle} (Continua)`;

                const dayResult = (await sql`
                INSERT INTO events (title, description, date, location, type, capacity, is_recurring, recurrence_pattern, created_by, church_id, created_at, updated_at)
                VALUES (${eventTitleForDay}, ${`Evento importado: ${eventTitle}`}, ${`${dayDate}T19:00:00Z`}, ${''}, ${mappedType}, ${0}, ${false}, ${null}, ${1}, ${24}, ${new Date().toISOString()}, ${new Date().toISOString()})
                RETURNING id, title, date
              `) as unknown as EventResult[];

                days.push(dayResult[0]);
              }

              result = days;
              logger.info(`Evento de múltiplos dias criado: ${eventTitle} (${days.length} dias)`);
            } else {
              // Evento de um dia
              const singleResult = (await sql`
              INSERT INTO events (title, description, date, location, type, capacity, is_recurring, recurrence_pattern, created_by, church_id, created_at, updated_at)
              VALUES (${eventTitle}, ${`Evento importado: ${eventTitle}`}, ${`${startDate}T19:00:00Z`}, ${''}, ${mappedType}, ${0}, ${false}, ${null}, ${1}, ${24}, ${new Date().toISOString()}, ${new Date().toISOString()})
              RETURNING id, title, date
            `) as unknown as EventResult[];
              result = singleResult[0];
            }

            if (Array.isArray(result)) {
              logger.info(
                `Evento de múltiplos dias inserido: ${eventTitle} (${result.length} dias)`
              );
              importedCount += result.length;
            } else {
              logger.info(`Evento inserido: ${eventTitle} (ID: ${result.id})`);
              importedCount++;
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
            logger.error(`Erro na linha ${i + 1}: ${errorMessage}`);
            errors.push(`Linha ${i + 1}: ${errorMessage}`);
          }
        }

        // Limpar arquivo temporário
        cleanupTempFile(filePath);

        return res.json({
          success: true,
          imported: importedCount,
          errors: errors,
        });
      } catch (error) {
        logger.error('Erro na importação:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }
    }
  );
};
