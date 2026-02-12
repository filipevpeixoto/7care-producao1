/**
 * Excel Utilities Module
 * Suporta tanto .xlsx (ExcelJS) quanto .xls (SheetJS/xlsx)
 * Wrapper seguro para operações Excel
 */

import ExcelJS from 'exceljs';

// xlsx é importado dinamicamente para evitar vulnerabilidades e reduzir bundle
// Usa import('xlsx') apenas quando necessário para .xls files
let _XLSX: typeof import('xlsx') | null = null;
async function getXLSX() {
  if (!_XLSX) {
    _XLSX = await import('xlsx');
  }
  return _XLSX;
}

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
 * Verifica se o arquivo é formato .xls (Excel 97-2003)
 */
function isXlsFile(file: File): boolean {
  const fileName = file.name.toLowerCase();
  return fileName.endsWith('.xls') && !fileName.endsWith('.xlsx');
}

/**
 * Lê um arquivo Excel usando SheetJS (xlsx) - funciona com .xls e .xlsx
 */
async function readWithSheetJS(
  file: File | ArrayBuffer,
  sheetIndex: number = 0
): Promise<ExcelSheetData> {
  let arrayBuffer: ArrayBuffer;

  if (file instanceof File) {
    arrayBuffer = await file.arrayBuffer();
  } else {
    arrayBuffer = file;
  }

  if (arrayBuffer.byteLength === 0) {
    throw new Error('O arquivo está vazio. Por favor, selecione um arquivo válido.');
  }

  const XLSX = await getXLSX();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error(
      'O arquivo não contém nenhuma planilha. Verifique se o arquivo é um Excel válido.'
    );
  }

  const sheetName = workbook.SheetNames[sheetIndex];
  if (!sheetName) {
    throw new Error(
      `Planilha no índice ${sheetIndex} não encontrada. O arquivo tem ${workbook.SheetNames.length} planilha(s).`
    );
  }

  const worksheet = workbook.Sheets[sheetName];

  // Converter para JSON com headers
  const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: null });

  // Extrair headers
  const headers = jsonData.length > 0 ? Object.keys(jsonData[0]) : [];

  // Converter para nosso formato ExcelRow
  const data: ExcelRow[] = jsonData.map(row => {
    const excelRow: ExcelRow = {};
    for (const [key, value] of Object.entries(row)) {
      if (value instanceof Date) {
        excelRow[key] = value;
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        excelRow[key] = value;
      } else if (value === null || value === undefined) {
        excelRow[key] = null;
      } else {
        excelRow[key] = String(value);
      }
    }
    return excelRow;
  });

  return { sheetName, data, headers, rows: data };
}

/**
 * Lê um arquivo Excel e retorna os dados como array de objetos
 * Suporta tanto .xlsx quanto .xls
 * Usa SheetJS como biblioteca principal (mais compatível)
 * @param file - Arquivo Excel a ser lido
 * @param sheetIndex - Índice da planilha (padrão: 0)
 * @returns Promise com os dados da planilha
 */
export async function readExcelFile(
  file: File | ArrayBuffer,
  sheetIndex: number = 0
): Promise<ExcelSheetData> {
  // Usar SheetJS para todos os arquivos (mais compatível)
  try {
    return await readWithSheetJS(file, sheetIndex);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);

    // Se for erro conhecido, repassar
    if (errorMessage.includes('vazio') || errorMessage.includes('planilha')) {
      throw err;
    }

    // Se SheetJS falhar com .xlsx, tentar ExcelJS como fallback
    if (file instanceof File && !isXlsFile(file)) {
      console.log('[Excel] SheetJS falhou, tentando ExcelJS como fallback...');
      try {
        return await readWithExcelJS(file, sheetIndex);
      } catch (_excelJSErr) {
        // Se ambos falharem, mostrar erro original
        throw new Error(`Erro ao ler arquivo Excel: ${errorMessage}`);
      }
    }

    throw new Error(`Erro ao ler arquivo Excel: ${errorMessage}`);
  }
}

/**
 * Lê um arquivo .xlsx usando ExcelJS (fallback)
 */
async function readWithExcelJS(file: File, sheetIndex: number = 0): Promise<ExcelSheetData> {
  const workbook = new ExcelJS.Workbook();
  const arrayBuffer = await file.arrayBuffer();

  if (arrayBuffer.byteLength === 0) {
    throw new Error('O arquivo está vazio. Por favor, selecione um arquivo válido.');
  }

  await workbook.xlsx.load(arrayBuffer);

  // Verificar se há planilhas no workbook
  if (!workbook.worksheets || workbook.worksheets.length === 0) {
    throw new Error(
      'O arquivo não contém nenhuma planilha. Verifique se o arquivo é um Excel válido.'
    );
  }

  const worksheet = workbook.worksheets[sheetIndex];

  if (!worksheet) {
    throw new Error(
      `Planilha no índice ${sheetIndex} não encontrada. O arquivo tem ${workbook.worksheets.length} planilha(s).`
    );
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
 * Suporta tanto .xlsx quanto .xls
 * Usa SheetJS como biblioteca principal (mais compatível)
 * @param file - Arquivo Excel a ser lido
 * @param sheetIndex - Índice da planilha (padrão: 0)
 * @returns Promise com os dados em formato de array de arrays
 */
export async function readExcelAsRawData(
  file: File | ArrayBuffer,
  sheetIndex: number = 0
): Promise<{ sheetName: string; data: (string | number | boolean | Date | null)[][] }> {
  // Usar SheetJS para todos os arquivos (mais compatível)
  try {
    return await readRawWithSheetJS(file, sheetIndex);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);

    // Se for erro conhecido, repassar
    if (errorMessage.includes('vazio') || errorMessage.includes('planilha')) {
      throw err;
    }

    // Se SheetJS falhar com .xlsx, tentar ExcelJS como fallback
    if (file instanceof File && !isXlsFile(file)) {
      console.log('[Excel] SheetJS falhou para raw data, tentando ExcelJS como fallback...');
      try {
        return await readRawWithExcelJS(file, sheetIndex);
      } catch {
        throw new Error(`Erro ao ler arquivo Excel: ${errorMessage}`);
      }
    }

    throw new Error(`Erro ao ler arquivo Excel: ${errorMessage}`);
  }
}

/**
 * Lê um arquivo Excel como raw data usando SheetJS
 */
async function readRawWithSheetJS(
  file: File | ArrayBuffer,
  sheetIndex: number = 0
): Promise<{ sheetName: string; data: (string | number | boolean | Date | null)[][] }> {
  let arrayBuffer: ArrayBuffer;

  if (file instanceof File) {
    arrayBuffer = await file.arrayBuffer();
  } else {
    arrayBuffer = file;
  }

  if (arrayBuffer.byteLength === 0) {
    throw new Error('O arquivo está vazio. Por favor, selecione um arquivo válido.');
  }

  const XLSX = await getXLSX();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error(
      'O arquivo não contém nenhuma planilha. Verifique se o arquivo é um Excel válido.'
    );
  }

  const sheetName = workbook.SheetNames[sheetIndex];
  if (!sheetName) {
    throw new Error(
      `Planilha no índice ${sheetIndex} não encontrada. O arquivo tem ${workbook.SheetNames.length} planilha(s).`
    );
  }

  const worksheet = workbook.Sheets[sheetName];

  // Converter para array de arrays
  const rawData = XLSX.utils.sheet_to_json<(string | number | boolean | Date | null)[]>(worksheet, {
    header: 1,
    defval: null,
  });

  return { sheetName, data: rawData };
}

/**
 * Lê um arquivo .xlsx como raw data usando ExcelJS (fallback)
 */
async function readRawWithExcelJS(
  file: File,
  sheetIndex: number = 0
): Promise<{ sheetName: string; data: (string | number | boolean | Date | null)[][] }> {
  const workbook = new ExcelJS.Workbook();
  const arrayBuffer = await file.arrayBuffer();

  if (arrayBuffer.byteLength === 0) {
    throw new Error('O arquivo está vazio. Por favor, selecione um arquivo válido.');
  }

  await workbook.xlsx.load(arrayBuffer);

  if (!workbook.worksheets || workbook.worksheets.length === 0) {
    throw new Error(
      'O arquivo não contém nenhuma planilha. Verifique se o arquivo é um Excel válido.'
    );
  }

  const worksheet = workbook.worksheets[sheetIndex];

  if (!worksheet) {
    throw new Error(
      `Planilha no índice ${sheetIndex} não encontrada. O arquivo tem ${workbook.worksheets.length} planilha(s).`
    );
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
