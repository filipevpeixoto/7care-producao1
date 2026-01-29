/**
 * Excel Utilities Module
 * Wrapper seguro para operações Excel usando exceljs
 * Substitui xlsx vulnerável por exceljs
 */

import ExcelJS from 'exceljs';

export interface ExcelRow {
  [key: string]: string | number | boolean | Date | null | undefined;
}

export interface ExcelSheetData {
  sheetName: string;
  data: ExcelRow[];
  headers: string[];
  rows: ExcelRow[]; // Alias para data (compatibilidade)
}

/**
 * Lê um arquivo Excel e retorna os dados como array de objetos
 * @param file - Arquivo Excel a ser lido
 * @param sheetIndex - Índice da planilha (padrão: 0)
 * @returns Promise com os dados da planilha
 */
export async function readExcelFile(
  file: File | ArrayBuffer,
  sheetIndex: number = 0
): Promise<ExcelSheetData> {
  const workbook = new ExcelJS.Workbook();

  if (file instanceof File) {
    const arrayBuffer = await file.arrayBuffer();
    await workbook.xlsx.load(arrayBuffer);
  } else {
    await workbook.xlsx.load(file);
  }

  const worksheet = workbook.worksheets[sheetIndex];

  if (!worksheet) {
    throw new Error(`Planilha no índice ${sheetIndex} não encontrada`);
  }

  const sheetName = worksheet.name;
  const headers: string[] = [];
  const data: ExcelRow[] = [];

  // Ler cabeçalhos da primeira linha
  const headerRow = worksheet.getRow(1);
  headerRow.eachCell((cell, colNumber) => {
    headers[colNumber - 1] = cell.value?.toString() || `Column${colNumber}`;
  });

  // Ler dados das linhas subsequentes
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Pular cabeçalho

    const rowData: ExcelRow = {};
    row.eachCell((cell, colNumber) => {
      const header = headers[colNumber - 1] || `Column${colNumber}`;
      rowData[header] = getCellValue(cell);
    });

    // Só adicionar se tiver algum dado
    if (Object.values(rowData).some(v => v !== null && v !== undefined && v !== '')) {
      data.push(rowData);
    }
  });

  return { sheetName, data, headers, rows: data };
}

/**
 * Lê um arquivo Excel e retorna como array de arrays (formato raw)
 * @param file - Arquivo Excel a ser lido
 * @param sheetIndex - Índice da planilha (padrão: 0)
 * @returns Promise com os dados em formato de array de arrays
 */
export async function readExcelAsRawData(
  file: File | ArrayBuffer,
  sheetIndex: number = 0
): Promise<{ sheetName: string; data: (string | number | boolean | Date | null)[][] }> {
  const workbook = new ExcelJS.Workbook();

  if (file instanceof File) {
    const arrayBuffer = await file.arrayBuffer();
    await workbook.xlsx.load(arrayBuffer);
  } else {
    await workbook.xlsx.load(file);
  }

  const worksheet = workbook.worksheets[sheetIndex];

  if (!worksheet) {
    throw new Error(`Planilha no índice ${sheetIndex} não encontrada`);
  }

  const sheetName = worksheet.name;
  const data: (string | number | boolean | Date | null)[][] = [];

  worksheet.eachRow(row => {
    const rowData: (string | number | boolean | Date | null)[] = [];
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      // Preencher células vazias antes desta
      while (rowData.length < colNumber - 1) {
        rowData.push(null);
      }
      rowData[colNumber - 1] = getCellValue(cell);
    });
    data.push(rowData);
  });

  return { sheetName, data };
}

/**
 * Cria um workbook Excel a partir de dados JSON
 * @param data - Array de objetos a ser convertido
 * @param sheetName - Nome da planilha
 * @returns Workbook do exceljs
 */
export function createWorkbook(data: ExcelRow[], sheetName: string = 'Sheet1'): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  if (data.length === 0) {
    return workbook;
  }

  // Extrair cabeçalhos
  const headers = Object.keys(data[0]);

  // Adicionar cabeçalhos
  worksheet.addRow(headers);

  // Estilizar cabeçalhos
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' },
  };

  // Adicionar dados
  data.forEach(row => {
    const values = headers.map(header => row[header] ?? '');
    worksheet.addRow(values);
  });

  // Auto-ajustar largura das colunas
  worksheet.columns.forEach(column => {
    let maxLength = 0;
    column.eachCell?.({ includeEmpty: true }, cell => {
      const columnLength = cell.value ? cell.value.toString().length : 10;
      if (columnLength > maxLength) {
        maxLength = columnLength;
      }
    });
    column.width = Math.min(maxLength + 2, 50);
  });

  return workbook;
}

/**
 * Exporta workbook para download
 * @param workbook - Workbook do exceljs
 * @param filename - Nome do arquivo (sem extensão)
 */
export async function downloadWorkbook(
  workbook: ExcelJS.Workbook,
  filename: string
): Promise<void> {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Exporta dados JSON diretamente para download Excel
 * @param data - Array de objetos
 * @param filename - Nome do arquivo (sem extensão)
 * @param sheetName - Nome da planilha
 */
export async function exportToExcel(
  data: ExcelRow[],
  filename: string,
  sheetName: string = 'Dados'
): Promise<void> {
  const workbook = createWorkbook(data, sheetName);
  await downloadWorkbook(workbook, filename);
}

/**
 * Converte valor de célula do exceljs para valor JavaScript
 */
function getCellValue(cell: ExcelJS.Cell): string | number | boolean | Date | null {
  const value = cell.value;

  if (value === null || value === undefined) {
    return null;
  }

  // Valor de fórmula
  if (typeof value === 'object' && 'result' in value) {
    return value.result as string | number | boolean | Date | null;
  }

  // Rich text
  if (typeof value === 'object' && 'richText' in value) {
    return (value.richText as Array<{ text: string }>).map(rt => rt.text).join('');
  }

  // Hyperlink
  if (typeof value === 'object' && 'hyperlink' in value) {
    return (
      (value as { text?: string; hyperlink?: string }).text ||
      (value as { hyperlink?: string }).hyperlink ||
      ''
    );
  }

  // Error
  if (typeof value === 'object' && 'error' in value) {
    return null;
  }

  // Data
  if (value instanceof Date) {
    return value;
  }

  return value as string | number | boolean;
}

/**
 * Converte número de data Excel para Date JavaScript
 * @param excelDate - Número serial do Excel
 * @returns Date JavaScript
 */
export function excelDateToJSDate(excelDate: number): Date {
  // Excel usa 1/1/1900 como dia 1, mas tem um bug no ano 1900
  // JavaScript usa milissegundos desde 1/1/1970
  const msPerDay = 86400 * 1000;
  const excelEpoch = new Date(Date.UTC(1899, 11, 30));
  return new Date(excelEpoch.getTime() + excelDate * msPerDay);
}

/**
 * Converte Date JavaScript para número de data Excel
 * @param date - Date JavaScript
 * @returns Número serial do Excel
 */
export function jsDateToExcelDate(date: Date): number {
  const msPerDay = 86400 * 1000;
  const excelEpoch = new Date(Date.UTC(1899, 11, 30));
  return Math.floor((date.getTime() - excelEpoch.getTime()) / msPerDay);
}

// Alias para compatibilidade com código legado (xlsx)
export const utils = {
  json_to_sheet: (data: ExcelRow[]) => createWorkbook(data).worksheets[0],
  book_new: () => new ExcelJS.Workbook(),
  book_append_sheet: (workbook: ExcelJS.Workbook, _worksheet: unknown, sheetName: string) => {
    workbook.addWorksheet(sheetName);
  },
  sheet_to_json: <T = ExcelRow>(worksheet: ExcelJS.Worksheet): T[] => {
    const headers: string[] = [];
    const data: T[] = [];

    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell, colNumber) => {
      headers[colNumber - 1] = cell.value?.toString() || `Column${colNumber}`;
    });

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const rowData: ExcelRow = {};
      row.eachCell((cell, colNumber) => {
        const header = headers[colNumber - 1];
        if (header) {
          rowData[header] = getCellValue(cell);
        }
      });
      data.push(rowData as T);
    });

    return data;
  },
};

// Re-exportar tipos úteis
export type { Workbook, Worksheet, Cell, Row } from 'exceljs';
