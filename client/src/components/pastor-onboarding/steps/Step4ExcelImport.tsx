/**
 * Step 4: Importação de Planilha Excel
 * Upload e preview de membros existentes
 * Design elegante e moderno
 * Processamento de Excel feito no cliente para compatibilidade com Netlify Functions
 */

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Upload,
  FileSpreadsheet,
  X,
  AlertCircle,
  CheckCircle,
  Users,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  SkipForward,
} from 'lucide-react';
import { ExcelData, ExcelRow } from '@/types/pastor-invite';
import { readExcelFile } from '@/lib/excel';

interface Step4ExcelImportProps {
  data?: ExcelData;
  onUpdate: (data: ExcelData | undefined) => void;
  onNext: () => void;
  onBack: () => void;
  token?: string; // Mantido para compatibilidade, mas não é mais usado
}

export function Step4ExcelImport({ data, onUpdate, onNext, onBack }: Step4ExcelImportProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<ExcelRow[]>(data?.data || []);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ];

    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
      setError('Por favor, selecione um arquivo Excel (.xlsx, .xls) ou CSV');
      return;
    }

    // Validar tamanho (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('O arquivo deve ter no máximo 5MB');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      // Processar Excel localmente no navegador
      const result = await readExcelFile(file);

      // Converter dados para formato ExcelRow
      const formattedData: ExcelRow[] = result.data
        .map(row => ({
          nome: String(row.nome || row.Nome || row.name || '').trim(),
          igreja: String(row.igreja || row.Igreja || row.church || '').trim(),
          telefone:
            row.telefone || row.Telefone || row.phone
              ? String(row.telefone || row.Telefone || row.phone).trim()
              : undefined,
          email: row.email || row.Email ? String(row.email || row.Email).trim() : undefined,
          cargo:
            row.cargo || row.Cargo || row.role
              ? String(row.cargo || row.Cargo || row.role).trim()
              : undefined,
        }))
        .filter(row => row.nome && row.igreja); // Filtrar linhas sem dados obrigatórios

      if (formattedData.length === 0) {
        throw new Error(
          'Nenhum dado válido encontrado no arquivo. Verifique se há colunas "Nome" e "Igreja".'
        );
      }

      const excelData: ExcelData = {
        fileName: file.name,
        uploadedAt: new Date().toISOString(),
        totalRows: formattedData.length,
        data: formattedData,
      };

      setPreviewData(formattedData);
      onUpdate(excelData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao processar planilha');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveFile = () => {
    setPreviewData([]);
    onUpdate(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSkip = () => {
    onUpdate(undefined);
    onNext();
  };

  // Contar igrejas únicas
  const uniqueChurches = new Set(
    previewData.map(row => row.igreja?.toLowerCase().trim()).filter(Boolean)
  );

  return (
    <div className="p-8 md:p-10">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-purple-50 rounded-full border border-blue-100 mb-4">
          <Sparkles className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-medium text-blue-700">Passo 4 de 6</span>
        </div>
        <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
          Importar Membros
        </h2>
        <p className="text-gray-500 mt-3 text-lg">
          Importe uma planilha com os membros existentes. Este passo é opcional.
        </p>
      </div>

      {/* Área de Upload */}
      {previewData.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 rounded-2xl hover:border-blue-400 transition-all bg-gradient-to-br from-gray-50 to-white">
          <div className="p-10">
            <div className="flex flex-col items-center justify-center text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
                className="hidden"
                id="excel-upload"
              />

              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center mb-6 shadow-lg">
                <FileSpreadsheet className="w-10 h-10 text-blue-500" />
              </div>

              <h3 className="text-xl font-semibold mb-2 text-gray-800">
                Arraste sua planilha aqui
              </h3>
              <p className="text-gray-400 text-sm mb-6">ou</p>

              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="h-12 px-6 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 shadow-lg hover:shadow-xl transition-all"
              >
                <Upload className="w-5 h-5 mr-2" />
                {isUploading ? 'Processando...' : 'Selecionar Arquivo'}
              </Button>

              <p className="text-xs text-gray-400 mt-4">
                Formatos aceitos: Excel (.xlsx, .xls) ou CSV. Máximo 5MB.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Preview da Planilha */
        <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{data?.fileName}</h3>
                  <p className="text-sm text-gray-500">
                    {previewData.length} membros • {uniqueChurches.size} igrejas encontradas
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemoveFile}
                className="rounded-xl hover:bg-red-50 hover:text-red-600"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <div className="p-6">
            {/* Resumo */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-5 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl">
                <div className="flex items-center gap-2 text-blue-700 mb-2">
                  <Users className="w-5 h-5" />
                  <span className="font-semibold">Total de Membros</span>
                </div>
                <p className="text-3xl font-bold text-blue-900">{previewData.length}</p>
              </div>
              <div className="p-5 bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl">
                <div className="flex items-center gap-2 text-purple-700 mb-2">
                  <FileSpreadsheet className="w-5 h-5" />
                  <span className="font-semibold">Igrejas Únicas</span>
                </div>
                <p className="text-3xl font-bold text-purple-900">{uniqueChurches.size}</p>
              </div>
            </div>

            {/* Tabela de Preview */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="max-h-64 overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-gray-50">
                    <TableRow>
                      <TableHead className="w-12 font-semibold">#</TableHead>
                      <TableHead className="font-semibold">Nome</TableHead>
                      <TableHead className="font-semibold">Igreja</TableHead>
                      <TableHead className="font-semibold">Telefone</TableHead>
                      <TableHead className="font-semibold">Cargo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.slice(0, 10).map((row, index) => (
                      <TableRow key={index} className="hover:bg-blue-50/50">
                        <TableCell className="text-gray-400 font-medium">{index + 1}</TableCell>
                        <TableCell className="font-medium text-gray-900">{row.nome}</TableCell>
                        <TableCell className="text-gray-600">{row.igreja}</TableCell>
                        <TableCell className="text-gray-600">{row.telefone || '-'}</TableCell>
                        <TableCell className="text-gray-600">{row.cargo || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {previewData.length > 10 && (
                <div className="p-3 bg-gray-50 text-center text-sm text-gray-500 border-t">
                  ... e mais {previewData.length - 10} membros
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mensagem de Erro */}
      {error && (
        <Alert variant="destructive" className="mt-6 rounded-xl">
          <AlertCircle className="h-5 w-5" />
          <AlertDescription className="ml-2">{error}</AlertDescription>
        </Alert>
      )}

      {/* Instrução sobre formato */}
      <div className="bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-2xl p-6 mt-6">
        <h4 className="font-semibold text-gray-800 mb-3">📋 Formato esperado da planilha:</h4>
        <p className="text-sm text-gray-600 mb-3">
          A primeira linha deve conter os cabeçalhos. Colunas esperadas:
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-sm">
          <div className="bg-white px-3 py-2 rounded-xl border border-gray-200 font-medium">
            <span className="text-red-500">*</span> Nome
          </div>
          <div className="bg-white px-3 py-2 rounded-xl border border-gray-200 font-medium">
            <span className="text-red-500">*</span> Igreja
          </div>
          <div className="bg-white px-3 py-2 rounded-xl border border-gray-200">Telefone</div>
          <div className="bg-white px-3 py-2 rounded-xl border border-gray-200">Email</div>
          <div className="bg-white px-3 py-2 rounded-xl border border-gray-200">Cargo</div>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          <span className="text-red-500">*</span> Campos obrigatórios
        </p>
      </div>

      {/* Actions */}
      <div className="flex justify-between mt-10 pt-6 border-t border-gray-100">
        <Button
          variant="outline"
          onClick={onBack}
          size="lg"
          className="h-14 px-8 text-lg rounded-xl border-gray-200 hover:bg-gray-50 transition-all"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Voltar
        </Button>
        <div className="flex gap-3">
          {previewData.length === 0 && (
            <Button
              variant="ghost"
              onClick={handleSkip}
              size="lg"
              className="h-14 px-6 text-lg rounded-xl hover:bg-gray-100"
            >
              <SkipForward className="w-5 h-5 mr-2" />
              Pular
            </Button>
          )}
          <Button
            onClick={onNext}
            disabled={isUploading}
            size="lg"
            className="h-14 px-8 text-lg rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
          >
            {previewData.length > 0 ? 'Continuar' : 'Próximo'}
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
