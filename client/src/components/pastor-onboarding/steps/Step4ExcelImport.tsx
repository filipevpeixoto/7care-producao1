/**
 * Step 4: Importação de Planilha Excel
 * Upload e preview de membros existentes
 * Design elegante e moderno com etapas de mapeamento e validação
 * Alinhado com funcionalidade do Gestão de Dados
 */

import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
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
  AlertTriangle,
} from 'lucide-react';
import { ExcelData, ExcelRow } from '@/types/pastor-invite';
import { readExcelFile } from '@/lib/excel';

type ImportStep = 'upload' | 'preview' | 'mapping' | 'validation' | 'complete';

interface Step4ExcelImportProps {
  data?: ExcelData;
  onUpdate: (data: ExcelData | undefined) => void;
  onNext: () => void;
  onBack: () => void;
  token?: string;
}

// Campos disponíveis para mapeamento
const AVAILABLE_FIELDS = [
  { field: 'nome', label: 'Nome', required: true },
  { field: 'igreja', label: 'Igreja', required: true },
  { field: 'email', label: 'Email', required: false },
  { field: 'telefone', label: 'Telefone', required: false },
  { field: 'cargo', label: 'Cargo/Função', required: false },
  { field: 'codigo', label: 'Código', required: false },
  { field: 'tipo', label: 'Tipo de Usuário', required: false },
  { field: 'sexo', label: 'Sexo', required: false },
  { field: 'idade', label: 'Idade', required: false },
  { field: 'dataNascimento', label: 'Data de Nascimento', required: false },
  { field: 'cpf', label: 'CPF', required: false },
  { field: 'estadoCivil', label: 'Estado Civil', required: false },
  { field: 'profissao', label: 'Profissão/Ocupação', required: false },
  { field: 'escolaridade', label: 'Escolaridade', required: false },
  { field: 'endereco', label: 'Endereço', required: false },
  { field: 'bairro', label: 'Bairro', required: false },
  { field: 'cidadeEstado', label: 'Cidade/Estado', required: false },
  { field: 'dataBatismo', label: 'Data de Batismo', required: false },
  { field: 'dizimista', label: 'Dizimista', required: false },
  { field: 'ofertante', label: 'Ofertante', required: false },
  { field: 'engajamento', label: 'Engajamento', required: false },
  { field: 'classificacao', label: 'Classificação', required: false },
  { field: 'departamentosCargos', label: 'Departamentos e Cargos', required: false },
  { field: 'nomeUnidade', label: 'Nome da Unidade', required: false },
  { field: 'temLicao', label: 'Tem Lição', required: false },
  { field: 'matriculadoES', label: 'Matriculado na ES', required: false },
  { field: 'totalPresenca', label: 'Total de Presença', required: false },
  { field: 'comunhao', label: 'Comunhão', required: false },
  { field: 'missao', label: 'Missão', required: false },
  { field: 'estudoBiblico', label: 'Estudo Bíblico', required: false },
  { field: 'batizouAlguem', label: 'Batizou Alguém', required: false },
  { field: 'religiaoAnterior', label: 'Religião Anterior', required: false },
  { field: 'instrutorBiblico', label: 'Instrutor Bíblico', required: false },
  { field: 'nomeMae', label: 'Nome da Mãe', required: false },
  { field: 'nomePai', label: 'Nome do Pai', required: false },
  { field: 'observacoes', label: 'Observações', required: false },
];

// Mapeamento de variações de nomes de colunas para campos
const COLUMN_MAPPINGS: Record<string, string> = {
  // Nome
  nome: 'nome',
  name: 'nome',
  'nome completo': 'nome',
  'full name': 'nome',
  membro: 'nome',

  // Igreja
  igreja: 'igreja',
  church: 'igreja',
  congregacao: 'igreja',
  congregação: 'igreja',
  comunidade: 'igreja',

  // Email
  email: 'email',
  'e-mail': 'email',
  mail: 'email',
  correio: 'email',

  // Telefone
  telefone: 'telefone',
  celular: 'telefone',
  phone: 'telefone',
  cel: 'telefone',
  fone: 'telefone',
  whatsapp: 'telefone',

  // Cargo
  cargo: 'cargo',
  funcao: 'cargo',
  função: 'cargo',
  role: 'cargo',
  ministerio: 'cargo',
  ministério: 'cargo',

  // Código
  codigo: 'codigo',
  código: 'codigo',
  code: 'codigo',

  // Tipo
  tipo: 'tipo',
  type: 'tipo',
  categoria: 'tipo',

  // Sexo
  sexo: 'sexo',
  genero: 'sexo',
  gênero: 'sexo',
  gender: 'sexo',

  // Idade
  idade: 'idade',
  age: 'idade',

  // Data Nascimento
  nascimento: 'dataNascimento',
  'data nascimento': 'dataNascimento',
  'data de nascimento': 'dataNascimento',
  'dt nascimento': 'dataNascimento',
  'dt. nascimento': 'dataNascimento',
  birthdate: 'dataNascimento',
  'birth date': 'dataNascimento',

  // CPF
  cpf: 'cpf',

  // Estado Civil
  'estado civil': 'estadoCivil',
  'civil status': 'estadoCivil',

  // Profissão
  profissao: 'profissao',
  profissão: 'profissao',
  ocupacao: 'profissao',
  ocupação: 'profissao',
  occupation: 'profissao',

  // Escolaridade
  escolaridade: 'escolaridade',
  'grau de educação': 'escolaridade',
  educacao: 'escolaridade',
  educação: 'escolaridade',
  education: 'escolaridade',

  // Endereço
  endereco: 'endereco',
  endereço: 'endereco',
  address: 'endereco',

  // Bairro
  bairro: 'bairro',
  neighborhood: 'bairro',

  // Cidade/Estado
  cidade: 'cidadeEstado',
  'cidade e estado': 'cidadeEstado',
  city: 'cidadeEstado',

  // Data Batismo
  batismo: 'dataBatismo',
  'data batismo': 'dataBatismo',
  'data de batismo': 'dataBatismo',
  'dt batismo': 'dataBatismo',
  'dt. batismo': 'dataBatismo',
  baptism: 'dataBatismo',
  'baptism date': 'dataBatismo',

  // Dizimista
  dizimista: 'dizimista',
  'é dizimista': 'dizimista',
  tither: 'dizimista',
  dizimo: 'dizimista',
  dízimo: 'dizimista',

  // Ofertante
  ofertante: 'ofertante',
  'é ofertante': 'ofertante',
  oferta: 'ofertante',
  offering: 'ofertante',

  // Engajamento
  engajamento: 'engajamento',
  engagement: 'engajamento',

  // Classificação
  classificacao: 'classificacao',
  classificação: 'classificacao',
  classification: 'classificacao',

  // Departamentos
  departamentos: 'departamentosCargos',
  'departamentos e cargos': 'departamentosCargos',
  departments: 'departamentosCargos',

  // Unidade ES
  unidade: 'nomeUnidade',
  'nome da unidade': 'nomeUnidade',
  'unidade es': 'nomeUnidade',

  // Tem Lição
  licao: 'temLicao',
  lição: 'temLicao',
  'tem lição': 'temLicao',
  'tem licao': 'temLicao',

  // Matriculado ES
  'matriculado es': 'matriculadoES',
  'matriculado na es': 'matriculadoES',
  'escola sabatina': 'matriculadoES',

  // Presença
  presenca: 'totalPresenca',
  presença: 'totalPresenca',
  'total presença': 'totalPresenca',
  'total de presença': 'totalPresenca',

  // Comunhão
  comunhao: 'comunhao',
  comunhão: 'comunhao',

  // Missão
  missao: 'missao',
  missão: 'missao',

  // Estudo Bíblico
  'estudo biblico': 'estudoBiblico',
  'estudo bíblico': 'estudoBiblico',

  // Batizou alguém
  'batizou alguem': 'batizouAlguem',
  'batizou alguém': 'batizouAlguem',

  // Religião anterior
  'religiao anterior': 'religiaoAnterior',
  'religião anterior': 'religiaoAnterior',

  // Instrutor bíblico
  'instrutor biblico': 'instrutorBiblico',
  'instrutor bíblico': 'instrutorBiblico',

  // Nome da mãe
  'nome da mae': 'nomeMae',
  'nome da mãe': 'nomeMae',
  mae: 'nomeMae',
  mãe: 'nomeMae',

  // Nome do pai
  'nome do pai': 'nomePai',
  pai: 'nomePai',

  // Observações
  observacoes: 'observacoes',
  observações: 'observacoes',
  obs: 'observacoes',
  notas: 'observacoes',
  notes: 'observacoes',
};

export function Step4ExcelImport({ data, onUpdate, onNext, onBack }: Step4ExcelImportProps) {
  const [importStep, setImportStep] = useState<ImportStep>('upload');
  const [importProgress, setImportProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rawData, setRawData] = useState<Record<string, unknown>[]>([]);
  const [previewData, setPreviewData] = useState<ExcelRow[]>(data?.data || []);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [detectedColumns, setDetectedColumns] = useState<string[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [duplicates, setDuplicates] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>(data?.fileName || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Detectar mapeamento automático de colunas
  const autoDetectMapping = useCallback((columns: string[]): Record<string, string> => {
    const mapping: Record<string, string> = {};

    columns.forEach(col => {
      const normalizedCol = col.toLowerCase().trim();
      if (COLUMN_MAPPINGS[normalizedCol]) {
        mapping[col] = COLUMN_MAPPINGS[normalizedCol];
      }
    });

    return mapping;
  }, []);

  // Processar dados brutos para ExcelRow usando o mapeamento
  const processDataWithMapping = useCallback(
    (raw: Record<string, unknown>[], mapping: Record<string, string>): ExcelRow[] => {
      return raw
        .map(row => {
          const processed: Record<string, unknown> = {};

          // Aplicar mapeamento
          Object.entries(row).forEach(([col, value]) => {
            const targetField = mapping[col];
            if (targetField && value !== undefined && value !== null && value !== '') {
              processed[targetField] = String(value).trim();
            }
          });

          // Extrair campos obrigatórios
          const nome = String(processed.nome || '').trim();
          const igreja = String(processed.igreja || '').trim();

          if (!nome) return null;

          return {
            nome,
            igreja,
            telefone: processed.telefone as string,
            email: processed.email as string,
            cargo: processed.cargo as string,
            codigo: processed.codigo as string,
            tipo: processed.tipo as string,
            sexo: processed.sexo as string,
            idade: processed.idade ? parseInt(String(processed.idade)) : undefined,
            dataNascimento: processed.dataNascimento as string,
            cpf: processed.cpf as string,
            estadoCivil: processed.estadoCivil as string,
            profissao: processed.profissao as string,
            escolaridade: processed.escolaridade as string,
            endereco: processed.endereco as string,
            bairro: processed.bairro as string,
            cidadeEstado: processed.cidadeEstado as string,
            dataBatismo: processed.dataBatismo as string,
            dizimista: processed.dizimista as string,
            ofertante: processed.ofertante as string,
            engajamento: processed.engajamento as string,
            classificacao: processed.classificacao as string,
            departamentosCargos: processed.departamentosCargos as string,
            nomeUnidade: processed.nomeUnidade as string,
            temLicao: (processed.temLicao as string) === 'true' || processed.temLicao === 'Sim',
            matriculadoES:
              (processed.matriculadoES as string) === 'true' || processed.matriculadoES === 'Sim',
            totalPresenca: processed.totalPresenca
              ? parseInt(String(processed.totalPresenca))
              : undefined,
            comunhao: processed.comunhao ? parseInt(String(processed.comunhao)) : undefined,
            missao: processed.missao ? parseInt(String(processed.missao)) : undefined,
            estudoBiblico: processed.estudoBiblico
              ? parseInt(String(processed.estudoBiblico))
              : undefined,
            batizouAlguem:
              (processed.batizouAlguem as string) === 'true' || processed.batizouAlguem === 'Sim',
            religiaoAnterior: processed.religiaoAnterior as string,
            instrutorBiblico: processed.instrutorBiblico as string,
            nomeMae: processed.nomeMae as string,
            nomePai: processed.nomePai as string,
            observacoes: processed.observacoes as string,
            valid: true,
          } as ExcelRow;
        })
        .filter((row): row is ExcelRow => row !== null);
    },
    []
  );

  // Validar dados importados
  const validateData = useCallback((rows: ExcelRow[]) => {
    const errors: string[] = [];
    const dups: string[] = [];
    const seenNames = new Map<string, number>();

    rows.forEach((row, index) => {
      // Validar nome
      if (!row.nome || row.nome.length < 2) {
        errors.push(`Linha ${index + 1}: Nome inválido ou muito curto`);
        row.valid = false;
        row.validationError = 'Nome inválido';
      }

      // Verificar duplicatas por nome
      const normalizedName = row.nome.toLowerCase().trim();
      if (seenNames.has(normalizedName)) {
        dups.push(
          `"${row.nome}" aparece nas linhas ${seenNames.get(normalizedName)! + 1} e ${index + 1}`
        );
      } else {
        seenNames.set(normalizedName, index);
      }

      // Validar email se fornecido
      if (row.email && !row.email.includes('@')) {
        errors.push(`Linha ${index + 1}: Email inválido "${row.email}"`);
      }
    });

    setValidationErrors(errors);
    setDuplicates(dups);

    return rows;
  }, []);

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

    // Validar tamanho (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('O arquivo deve ter no máximo 10MB');
      return;
    }

    setIsUploading(true);
    setError(null);
    setFileName(file.name);

    try {
      const result = await readExcelFile(file);

      if (result.data.length === 0) {
        throw new Error('Nenhum dado encontrado no arquivo');
      }

      // Detectar colunas
      const columns = Object.keys(result.data[0] || {});
      setDetectedColumns(columns);

      // Auto-detectar mapeamento
      const autoMapping = autoDetectMapping(columns);
      setColumnMapping(autoMapping);

      // Armazenar dados brutos
      setRawData(result.data);

      // Processar preview
      const processed = processDataWithMapping(result.data, autoMapping);
      setPreviewData(processed);

      // Avançar para preview
      setImportStep('preview');
      setImportProgress(25);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao processar planilha');
    } finally {
      setIsUploading(false);
    }
  };

  const handleMappingChange = (column: string, field: string) => {
    const newMapping = { ...columnMapping };
    if (field === 'none') {
      delete newMapping[column];
    } else {
      newMapping[column] = field;
    }
    setColumnMapping(newMapping);

    // Reprocessar dados com novo mapeamento
    const processed = processDataWithMapping(rawData, newMapping);
    setPreviewData(processed);
  };

  const handleRemoveFile = () => {
    setPreviewData([]);
    setRawData([]);
    setColumnMapping({});
    setDetectedColumns([]);
    setValidationErrors([]);
    setDuplicates([]);
    setFileName('');
    setImportStep('upload');
    setImportProgress(0);
    onUpdate(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSkip = () => {
    onUpdate(undefined);
    onNext();
  };

  const handleComplete = () => {
    // Salvar dados processados
    const excelData: ExcelData = {
      fileName,
      uploadedAt: new Date().toISOString(),
      totalRows: previewData.length,
      data: previewData,
    };
    onUpdate(excelData);
    setImportStep('complete');
    setImportProgress(100);
  };

  // Contar igrejas únicas
  const uniqueChurches = new Set(
    previewData.map(row => row.igreja?.toLowerCase().trim()).filter(Boolean)
  );

  // Contar registros válidos
  const validCount = previewData.filter(r => r.valid !== false).length;

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

      {/* Progress Bar */}
      {importStep !== 'upload' && (
        <div className="mb-8 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Progresso da Importação</span>
            <span className="font-medium">{importProgress}%</span>
          </div>
          <Progress value={importProgress} className="w-full h-2" />
          <div className="flex justify-between text-xs text-gray-400">
            <span className={importStep === 'upload' ? 'text-blue-600 font-medium' : ''}>
              Upload
            </span>
            <span className={importStep === 'preview' ? 'text-blue-600 font-medium' : ''}>
              Preview
            </span>
            <span className={importStep === 'mapping' ? 'text-blue-600 font-medium' : ''}>
              Mapeamento
            </span>
            <span className={importStep === 'validation' ? 'text-blue-600 font-medium' : ''}>
              Validação
            </span>
            <span className={importStep === 'complete' ? 'text-green-600 font-medium' : ''}>
              Concluído
            </span>
          </div>
        </div>
      )}

      {/* Upload Step */}
      {importStep === 'upload' && (
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
                Formatos aceitos: Excel (.xlsx, .xls) ou CSV. Máximo 10MB.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Preview Step */}
      {importStep === 'preview' && (
        <div className="space-y-6">
          <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{fileName}</h3>
                    <p className="text-sm text-gray-500">
                      {previewData.length} membros • {uniqueChurches.size} igrejas •{' '}
                      {detectedColumns.length} colunas detectadas
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
                    <span className="font-semibold">Colunas Mapeadas</span>
                  </div>
                  <p className="text-3xl font-bold text-purple-900">
                    {Object.keys(columnMapping).length}/{detectedColumns.length}
                  </p>
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
                        <TableHead className="font-semibold">Email</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.slice(0, 5).map((row, index) => (
                        <TableRow key={index} className="hover:bg-blue-50/50">
                          <TableCell className="text-gray-400 font-medium">{index + 1}</TableCell>
                          <TableCell className="font-medium text-gray-900">{row.nome}</TableCell>
                          <TableCell className="text-gray-600">{row.igreja || '-'}</TableCell>
                          <TableCell className="text-gray-600">{row.telefone || '-'}</TableCell>
                          <TableCell className="text-gray-600">{row.email || '-'}</TableCell>
                          <TableCell>
                            <Badge variant={row.valid !== false ? 'secondary' : 'destructive'}>
                              {row.valid !== false ? 'Válido' : 'Erro'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {previewData.length > 5 && (
                  <div className="p-3 bg-gray-50 text-center text-sm text-gray-500 border-t">
                    ... e mais {previewData.length - 5} membros
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Ações */}
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setImportStep('upload');
                setImportProgress(0);
              }}
              className="rounded-xl"
            >
              Voltar
            </Button>
            <Button
              onClick={() => {
                setImportStep('mapping');
                setImportProgress(50);
              }}
              className="rounded-xl bg-gradient-to-r from-blue-500 to-purple-500"
            >
              Continuar para Mapeamento
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Mapping Step */}
      {importStep === 'mapping' && (
        <div className="space-y-6">
          <div className="border border-gray-200 rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-2">Mapeamento de Colunas</h3>
            <p className="text-sm text-gray-500 mb-6">
              Confirme o mapeamento automático das colunas ou ajuste conforme necessário
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
              {detectedColumns.map(col => (
                <div key={col} className="space-y-2">
                  <Label className="text-sm">
                    {col}
                    {AVAILABLE_FIELDS.find(f => f.field === columnMapping[col])?.required && (
                      <span className="text-red-500 ml-1">*</span>
                    )}
                  </Label>
                  <Select
                    value={columnMapping[col] || 'none'}
                    onValueChange={value => handleMappingChange(col, value)}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Não mapear" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Não mapear</SelectItem>
                      {AVAILABLE_FIELDS.map(f => (
                        <SelectItem key={f.field} value={f.field}>
                          {f.label}
                          {f.required && ' *'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>

          {/* Alerta sobre campos obrigatórios */}
          {!columnMapping['nome'] && (
            <Alert variant="destructive" className="rounded-xl">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                O campo "Nome" é obrigatório. Mapeie uma coluna para ele.
              </AlertDescription>
            </Alert>
          )}

          {/* Ações */}
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setImportStep('preview');
                setImportProgress(25);
              }}
              className="rounded-xl"
            >
              Voltar
            </Button>
            <Button
              onClick={() => {
                validateData(previewData);
                setImportStep('validation');
                setImportProgress(75);
              }}
              disabled={!Object.values(columnMapping).includes('nome')}
              className="rounded-xl bg-gradient-to-r from-blue-500 to-purple-500"
            >
              Continuar para Validação
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Validation Step */}
      {importStep === 'validation' && (
        <div className="space-y-6">
          {/* Cards de estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="rounded-2xl">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  <div>
                    <p className="text-2xl font-bold text-green-700">{validCount}</p>
                    <p className="text-sm text-gray-500">Registros válidos</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-6 w-6 text-yellow-600" />
                  <div>
                    <p className="text-2xl font-bold text-yellow-700">{validationErrors.length}</p>
                    <p className="text-sm text-gray-500">Avisos encontrados</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <X className="h-6 w-6 text-red-600" />
                  <div>
                    <p className="text-2xl font-bold text-red-700">{duplicates.length}</p>
                    <p className="text-sm text-gray-500">Duplicatas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Alertas */}
          {validationErrors.length > 0 && (
            <Alert className="rounded-xl">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium mb-2">Avisos encontrados:</p>
                <ul className="list-disc pl-4 space-y-1 text-sm">
                  {validationErrors.slice(0, 5).map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
                {validationErrors.length > 5 && (
                  <p className="text-sm mt-2">E mais {validationErrors.length - 5} avisos...</p>
                )}
              </AlertDescription>
            </Alert>
          )}

          {duplicates.length > 0 && (
            <Alert className="rounded-xl border-yellow-200 bg-yellow-50">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription>
                <p className="font-medium mb-2 text-yellow-800">Possíveis duplicatas:</p>
                <ul className="list-disc pl-4 space-y-1 text-sm text-yellow-700">
                  {duplicates.slice(0, 3).map((dup, i) => (
                    <li key={i}>{dup}</li>
                  ))}
                </ul>
                {duplicates.length > 3 && (
                  <p className="text-sm mt-2 text-yellow-700">
                    E mais {duplicates.length - 3} duplicatas...
                  </p>
                )}
              </AlertDescription>
            </Alert>
          )}

          {validationErrors.length === 0 && duplicates.length === 0 && (
            <Alert className="rounded-xl border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">
                Todos os registros foram validados com sucesso! Nenhum erro encontrado.
              </AlertDescription>
            </Alert>
          )}

          {/* Ações */}
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setImportStep('mapping');
                setImportProgress(50);
              }}
              className="rounded-xl"
            >
              Voltar
            </Button>
            <Button
              onClick={handleComplete}
              className="rounded-xl bg-gradient-to-r from-green-500 to-emerald-500"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Confirmar Importação
            </Button>
          </div>
        </div>
      )}

      {/* Complete Step */}
      {importStep === 'complete' && (
        <div className="text-center py-10">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center mx-auto mb-6 shadow-lg">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-green-700 mb-2">Importação Pronta!</h3>
          <p className="text-gray-500 mb-6">
            {previewData.length} membros serão importados quando o convite for aprovado.
          </p>
          <div className="p-4 bg-blue-50 rounded-xl inline-block">
            <p className="text-sm text-blue-700">
              <strong>Nota:</strong> Os dados serão efetivamente importados para o sistema quando o
              administrador aprovar o seu cadastro.
            </p>
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

      {/* Instrução sobre formato (apenas na tela de upload) */}
      {importStep === 'upload' && (
        <div className="bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-2xl p-6 mt-6">
          <h4 className="font-semibold text-gray-800 mb-3">📋 Colunas reconhecidas:</h4>
          <p className="text-sm text-gray-600 mb-3">
            O sistema reconhece automaticamente diversas colunas do ACMS e outros sistemas:
          </p>
          <div className="flex flex-wrap gap-2 text-sm">
            {[
              'Nome',
              'Igreja',
              'Email',
              'Telefone',
              'Cargo',
              'Código',
              'Sexo',
              'Idade',
              'Nascimento',
              'Batismo',
              'Dizimista',
              'Ofertante',
              'Engajamento',
              'Classificação',
              'Departamentos',
              'Comunhão',
              'Missão',
              'ES',
            ].map(col => (
              <span key={col} className="bg-white px-3 py-1 rounded-full border border-gray-200">
                {col}
              </span>
            ))}
            <span className="bg-white px-3 py-1 rounded-full border border-gray-200">
              + muitos outros
            </span>
          </div>
        </div>
      )}

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
          {importStep === 'upload' && (
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
            disabled={isUploading || (importStep !== 'upload' && importStep !== 'complete')}
            size="lg"
            className="h-14 px-8 text-lg rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
          >
            {importStep === 'complete' ? 'Continuar' : 'Próximo'}
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
