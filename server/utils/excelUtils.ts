/**
 * Excel Utilities for Server
 * Wrapper seguro sobre exceljs para manipulação de arquivos Excel no servidor
 * Substitui xlsx que tem vulnerabilidades de segurança
 */

import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import { logger } from './logger';

export interface ExcelRow {
  [key: string]: string | number | boolean | Date | null | undefined;
}

export interface ExcelSheetData {
  headers: string[];
  rows: ExcelRow[];
  sheetName: string;
}

/**
 * Lê um arquivo Excel do sistema de arquivos
 * @param filePath Caminho do arquivo
 * @param sheetIndex Índice da planilha (0 por padrão)
 */
export async function readExcelFile(
  filePath: string,
  sheetIndex: number = 0
): Promise<ExcelSheetData> {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const worksheet = workbook.worksheets[sheetIndex];
    if (!worksheet) {
      throw new Error(`Planilha índice ${sheetIndex} não encontrada`);
    }

    const headers: string[] = [];
    const rows: ExcelRow[] = [];

    // Primeira linha contém os headers
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell, colNumber) => {
      headers[colNumber - 1] = cell.value?.toString() || `Column${colNumber}`;
    });

    // Processar demais linhas
    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
      const row = worksheet.getRow(rowNumber);
      const rowData: ExcelRow = {};
      let hasData = false;

      row.eachCell((cell, colNumber) => {
        const header = headers[colNumber - 1] || `Column${colNumber}`;
        const value = cell.value;

        if (value !== null && value !== undefined) {
          hasData = true;

          // Tratar diferentes tipos de valores
          if (value instanceof Date) {
            rowData[header] = value;
          } else if (typeof value === 'object' && 'result' in value) {
            // Fórmula - pegar o resultado
            rowData[header] = value.result?.toString() || '';
          } else if (typeof value === 'object' && 'richText' in value) {
            // Rich text - concatenar os textos
            rowData[header] = (value.richText as { text: string }[]).map(rt => rt.text).join('');
          } else {
            rowData[header] = value as string | number | boolean;
          }
        }
      });

      if (hasData) {
        rows.push(rowData);
      }
    }

    return {
      headers,
      rows,
      sheetName: worksheet.name,
    };
  } catch (error) {
    logger.error('Erro ao ler arquivo Excel:', error);
    throw error;
  }
}

/**
 * Lê arquivo Excel retornando dados raw (array de arrays)
 * Compatível com XLSX.utils.sheet_to_json({ header: 1 })
 */
export async function readExcelAsRawData(
  filePath: string,
  sheetIndex: number = 0
): Promise<{ sheetName: string; data: unknown[][] }> {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const worksheet = workbook.worksheets[sheetIndex];
    if (!worksheet) {
      throw new Error(`Planilha índice ${sheetIndex} não encontrada`);
    }

    const data: unknown[][] = [];

    worksheet.eachRow((row, _rowNumber) => {
      const rowData: unknown[] = [];
      row.eachCell((cell, colNumber) => {
        // Preencher células vazias anteriores
        while (rowData.length < colNumber - 1) {
          rowData.push(null);
        }

        const value = cell.value;
        if (value instanceof Date) {
          rowData.push(value);
        } else if (typeof value === 'object' && value !== null) {
          if ('result' in value) {
            rowData.push(value.result);
          } else if ('richText' in value) {
            rowData.push((value.richText as { text: string }[]).map(rt => rt.text).join(''));
          } else {
            rowData.push(value.toString());
          }
        } else {
          rowData.push(value);
        }
      });
      data.push(rowData);
    });

    return {
      sheetName: worksheet.name,
      data,
    };
  } catch (error) {
    logger.error('Erro ao ler arquivo Excel como dados raw:', error);
    throw error;
  }
}

/**
 * Cria um workbook Excel a partir de dados
 */
export function createWorkbook(data: ExcelRow[], sheetName: string = 'Sheet1'): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  if (data.length === 0) {
    return workbook;
  }

  // Extrair headers das chaves do primeiro objeto
  const headers = Object.keys(data[0]);
  worksheet.addRow(headers);

  // Adicionar dados
  data.forEach(row => {
    const values = headers.map(header => row[header]);
    worksheet.addRow(values);
  });

  // Auto-ajustar largura das colunas
  worksheet.columns.forEach(column => {
    let maxLength = 10;
    column.eachCell?.(cell => {
      const columnLength = cell.value?.toString().length || 0;
      if (columnLength > maxLength) {
        maxLength = Math.min(columnLength, 50);
      }
    });
    column.width = maxLength + 2;
  });

  return workbook;
}

/**
 * Salva workbook em arquivo
 */
export async function saveWorkbook(workbook: ExcelJS.Workbook, filePath: string): Promise<void> {
  // Garantir que o diretório existe
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  await workbook.xlsx.writeFile(filePath);
}

/**
 * Exporta dados diretamente para arquivo Excel
 */
export async function exportToExcel(
  data: ExcelRow[],
  filePath: string,
  sheetName: string = 'Sheet1'
): Promise<void> {
  const workbook = createWorkbook(data, sheetName);
  await saveWorkbook(workbook, filePath);
}

/**
 * Remove arquivo temporário com segurança
 */
export function cleanupTempFile(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    logger.warn('Erro ao remover arquivo temporário:', error);
  }
}

// Exportar ExcelJS para uso avançado
export { ExcelJS };

export default {
  readExcelFile,
  readExcelAsRawData,
  createWorkbook,
  saveWorkbook,
  exportToExcel,
  cleanupTempFile,
};
