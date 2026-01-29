/**
 * Step 4: Importação de Planilha Excel
 * Upload e preview de membros existentes
 */

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Upload, FileSpreadsheet, X, AlertCircle, CheckCircle, Users } from 'lucide-react';
import { ExcelData, ExcelRow } from '@/types/pastor-invite';

interface Step4ExcelImportProps {
  data?: ExcelData;
  onUpdate: (data: ExcelData | undefined) => void;
  onNext: () => void;
  onBack: () => void;
  token: string;
}

export function Step4ExcelImport({ data, onUpdate, onNext, onBack, token }: Step4ExcelImportProps) {
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
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/invites/${token}/upload-excel`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao processar planilha');
      }

      const result = await response.json();

      const excelData: ExcelData = {
        fileName: file.name,
        uploadedAt: new Date().toISOString(),
        totalRows: result.data.length,
        data: result.data,
      };

      setPreviewData(result.data);
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
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Importar Membros</h2>
        <p className="text-gray-600 mt-2">
          Você pode importar uma planilha com os membros existentes do seu distrito. Este passo é
          opcional.
        </p>
      </div>

      {/* Área de Upload */}
      {previewData.length === 0 ? (
        <Card className="border-2 border-dashed border-gray-300 hover:border-primary transition-colors">
          <CardContent className="p-8">
            <div className="flex flex-col items-center justify-center text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
                className="hidden"
                id="excel-upload"
              />

              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <FileSpreadsheet className="w-8 h-8 text-primary" />
              </div>

              <h3 className="text-lg font-semibold mb-2">Arraste sua planilha aqui</h3>
              <p className="text-gray-500 text-sm mb-4">ou</p>

              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="mb-4"
              >
                <Upload className="w-4 h-4 mr-2" />
                {isUploading ? 'Processando...' : 'Selecionar Arquivo'}
              </Button>

              <p className="text-xs text-gray-400">
                Formatos aceitos: Excel (.xlsx, .xls) ou CSV. Máximo 5MB.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Preview da Planilha */
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">{data?.fileName}</CardTitle>
                  <CardDescription>
                    {previewData.length} membros • {uniqueChurches.size} igrejas encontradas
                  </CardDescription>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={handleRemoveFile}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Resumo */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2 text-blue-700 mb-1">
                  <Users className="w-4 h-4" />
                  <span className="font-medium">Total de Membros</span>
                </div>
                <p className="text-2xl font-bold text-blue-900">{previewData.length}</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="flex items-center gap-2 text-purple-700 mb-1">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span className="font-medium">Igrejas Únicas</span>
                </div>
                <p className="text-2xl font-bold text-purple-900">{uniqueChurches.size}</p>
              </div>
            </div>

            {/* Tabela de Preview */}
            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-64 overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-gray-50">
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Igreja</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Cargo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.slice(0, 10).map((row, index) => (
                      <TableRow key={index}>
                        <TableCell className="text-gray-500">{index + 1}</TableCell>
                        <TableCell className="font-medium">{row.nome}</TableCell>
                        <TableCell>{row.igreja}</TableCell>
                        <TableCell>{row.telefone || '-'}</TableCell>
                        <TableCell>{row.cargo || '-'}</TableCell>
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
          </CardContent>
        </Card>
      )}

      {/* Mensagem de Erro */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Instrução sobre formato */}
      <Card className="bg-gray-50">
        <CardContent className="p-4">
          <h4 className="font-medium text-sm mb-2">Formato esperado da planilha:</h4>
          <p className="text-xs text-gray-600 mb-2">
            A primeira linha deve conter os cabeçalhos. Colunas esperadas:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
            <div className="bg-white px-2 py-1 rounded border">
              <span className="font-medium text-red-600">*</span> Nome
            </div>
            <div className="bg-white px-2 py-1 rounded border">
              <span className="font-medium text-red-600">*</span> Igreja
            </div>
            <div className="bg-white px-2 py-1 rounded border">Telefone</div>
            <div className="bg-white px-2 py-1 rounded border">Email</div>
            <div className="bg-white px-2 py-1 rounded border">Cargo</div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            <span className="text-red-600">*</span> Campos obrigatórios
          </p>
        </CardContent>
      </Card>

      {/* Botões de Navegação */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          Voltar
        </Button>
        <div className="flex gap-3">
          {previewData.length === 0 && (
            <Button variant="ghost" onClick={handleSkip}>
              Pular este passo
            </Button>
          )}
          <Button onClick={onNext} disabled={isUploading}>
            {previewData.length > 0 ? 'Continuar' : 'Próximo'}
          </Button>
        </div>
      </div>
    </div>
  );
}
