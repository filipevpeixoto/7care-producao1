/**
 * Step 4: Importação de Planilha Excel
 * Upload e preview de membros existentes
 * Design elegante e moderno com etapas de mapeamento e validação
 * 
 * IMPORTANTE: Passa os dados BRUTOS da planilha para o backend processar
 * O backend usa exatamente a mesma lógica do Gestão de Dados (Settings.tsx)
 * Isso garante consistência entre os dois métodos de importação
 */

import React, { useState, useRef, useCallback, useMemo } from 'react';
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

// Campos-chave exibidos no passo de mapeamento (mesmo padrão do Gestão de Dados)
const DISPLAY_FIELDS = [
  { field: 'nome', label: 'Nome', required: true },
  { field: 'email', label: 'Email', required: false },
  { field: 'telefone', label: 'Telefone', required: false },
  { field: 'tipo', label: 'Tipo de Usuário', required: false },
  { field: 'igreja', label: 'Igreja', required: true },
  { field: 'dataNascimento', label: 'Data de Nascimento', required: false },
];

export function Step4ExcelImport({ data, onUpdate, onNext, onBack }: Step4ExcelImportProps) {
  const [importStep, setImportStep] = useState<ImportStep>('upload');
  const [importProgress, setImportProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [_rawData, setRawData] = useState<Record<string, unknown>[]>([]);
  const [previewData, setPreviewData] = useState<ExcelRow[]>(data?.data || []);
  const [detectedColumns, setDetectedColumns] = useState<string[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [duplicates, setDuplicates] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>(data?.fileName || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ============================================================
  // IMPORTANTE: Passa os dados BRUTOS da planilha sem transformação
  // O backend irá processar exatamente como o Gestão de Dados faz
  // Isso garante consistência entre os dois métodos de importação
  // ============================================================
  const processRawData = useCallback((raw: Record<string, unknown>[]): ExcelRow[] => {
    return raw
      .map(row => {
        // Pegar o nome - obrigatório
        const rawNome = row.Nome || row.nome || row.name || row['Nome Completo'] || row['nome completo'];
        const nome = rawNome ? String(rawNome).trim() : '';
        
        // Pular linhas sem nome válido
        if (!nome || nome.length < 2 || nome.includes('@') || /^\d+$/.test(nome)) {
          return null;
        }

        // Pegar a igreja
        const rawIgreja = row.Igreja || row.igreja || row.church || row.Church || row.Congregação;
        const igreja = rawIgreja ? String(rawIgreja).trim() : 'Igreja Principal';

        // IMPORTANTE: Passar valores ORIGINAIS da planilha para dizimista/ofertante
        // Sem usar parseDizimistaField/parseOfertanteField que transformam os valores
        const dizimistaOriginal = row.Dizimista || row.dizimista;
        const ofertanteOriginal = row.Ofertante || row.ofertante;

        // Retornar dados brutos - o backend vai processar
        return {
          // Campos obrigatórios
          nome,
          igreja,
          
          // Campos básicos - valores diretos da planilha
          telefone: row.Celular || row.celular || row.telefone || row.Telefone || row.phone,
          email: row.Email || row.email || row['E-mail'] || row['e-mail'],
          cargo: row.Cargo || row.cargo,
          codigo: row.Código || row.codigo || row.code,
          tipo: row.Tipo || row.tipo || row.role,
          distrital: row.Distrital || row.distrital,
          
          // Dados pessoais - valores diretos
          dataNascimento: row.Nascimento || row.nascimento || row.birthDate || row['Data de Nascimento'] || row['data de nascimento'],
          estadoCivil: row['Estado civil'] || row.estadoCivil || row.civilStatus || row['Estado Civil'],
          profissao: row.Ocupação || row.ocupacao || row.profissao || row.Profissão || row.occupation,
          escolaridade: row['Grau de educação'] || row.educacao || row.education || row.Escolaridade || row.escolaridade,
          endereco: row.Endereço || row.endereco || row.address || row.Address,
          sexo: row.Sexo || row.sexo,
          cpf: row.CPF || row.cpf,
          idade: row.Idade || row.idade,
          bairro: row.Bairro || row.bairro,
          cidadeEstado: row['Cidade e Estado'] || row.cidadeEstado,
          cidadeNascimento: row['Cidade de nascimento'] || row.cidadeNascimento,
          estadoNascimento: row['Estado de nascimento'] || row.estadoNascimento,
          
          // Dados religiosos - VALORES ORIGINAIS (SEM TRANSFORMAÇÃO)
          dataBatismo: row.Batismo || row.batismo || row.baptismDate || row['Data de Batismo'] || row['data de batismo'],
          dizimista: dizimistaOriginal, // Valor ORIGINAL da planilha
          ofertante: ofertanteOriginal, // Valor ORIGINAL da planilha
          religiaoAnterior: row['Religião anterior'] || row.religiaoAnterior,
          instrutorBiblico: row['Instrutor bíblico'] || row.instrutorBiblico,
          
          // Engajamento e Classificação - valores diretos
          engajamento: row.Engajamento || row.engajamento,
          classificacao: row.Classificação || row.classificacao,
          
          // Campos de pontuação - valores diretos
          tempoBatismoAnos: row['Tempo de batismo - anos'] || row.tempoBatismoAnos,
          departamentosCargos: row['Departamentos e cargos'] || row.departamentosCargos || row.departamentos,
          nomeUnidade: row['Nome da unidade'] || row.nomeUnidade || row.Unidade,
          temLicao: row['Tem lição'] || row.temLicao,
          totalPresenca: row['Total de presença'] || row.totalPresenca || row.presencaTotal || row.Presença,
          comunhao: row.Comunhão || row.comunhao,
          missao: row.Missão || row.missao,
          estudoBiblico: row['Estudo bíblico'] || row.estudoBiblico,
          batizouAlguem: row['Batizou alguém'] || row.batizouAlguem,
          discPosBatismal: row['Disc. pós batismal'] || row.discPosBatismal,
          cpfValido: row['CPF válido'] || row.cpfValido,
          camposVazios: row['Campos vazios/inválidos'] || row.camposVazios,
          
          // Escola Sabatina
          matriculadoES: row['Matriculado na ES'] || row.matriculadoES,
          periodoES: row['Período ES'] || row.periodoES,
          
          // Dízimos (12 meses) - valores diretos
          dizimos12m: row['Dízimos - 12m'] || row.dizimos12m,
          ultimoDizimo: row['Último dízimo - 12m'] || row.ultimoDizimo,
          valorDizimo: row['Valor dízimo - 12m'] || row.valorDizimo,
          numeroMesesSemDizimar: row['Número de meses s/ dizimar'] || row.numeroMesesSemDizimar,
          dizimistaAntesUltimoDizimo: row['Dizimista antes do últ. dízimo'] || row.dizimistaAntesUltimoDizimo,
          
          // Ofertas (12 meses) - valores diretos
          ofertas12m: row['Ofertas - 12m'] || row.ofertas12m,
          ultimaOferta: row['Última oferta - 12m'] || row.ultimaOferta,
          valorOferta: row['Valor oferta - 12m'] || row.valorOferta,
          numeroMesesSemOfertar: row['Número de meses s/ ofertar'] || row.numeroMesesSemOfertar,
          ofertanteAntesUltimaOferta: row['Ofertante antes da últ. oferta'] || row.ofertanteAntesUltimaOferta,
          
          // Movimentos
          ultimoMovimento: row['Último movimento'] || row.ultimoMovimento,
          dataUltimoMovimento: row['Data do último movimento'] || row.dataUltimoMovimento,
          tipoEntrada: row['Tipo de entrada'] || row.tipoEntrada,
          
          // Batismo detalhado
          tempoBatismo: row['Tempo de batismo'] || row.tempoBatismo,
          localidadeBatismo: row['Localidade do batismo'] || row.localidadeBatismo,
          batizadoPor: row['Batizado por'] || row.batizadoPor,
          idadeBatismo: row['Idade no Batismo'] || row.idadeBatismo,
          
          // Conversão
          comoConheceu: row['Como conheceu a IASD'] || row.comoConheceu,
          fatorDecisivo: row['Fator decisivo'] || row.fatorDecisivo,
          comoEstudou: row['Como estudou a Bíblia'] || row.comoEstudou,
          instrutorBiblico2: row['Instrutor bíblico 2'] || row.instrutorBiblico2,
          
          // Cargos
          temCargo: row['Tem cargo'] || row.temCargo,
          teen: row.Teen || row.teen,
          
          // Família
          nomeMae: row['Nome da mãe'] || row.nomeMae,
          nomePai: row['Nome do pai'] || row.nomePai,
          dataCasamento: row['Data de casamento'] || row.dataCasamento,
          
          // Presença detalhada
          presencaCartao: row['Total presença no cartão'] || row.presencaCartao,
          presencaQuizLocal: row['Presença no quiz local'] || row.presencaQuizLocal,
          presencaQuizOutra: row['Presença no quiz outra unidade'] || row.presencaQuizOutraUnidade,
          presencaQuizOnline: row['Presença no quiz online'] || row.presencaQuizOnline,
          teveParticipacao: row['Teve participação'] || row.teveParticipacao,
          
          // Colaboração
          campoColaborador: row['Campo - colaborador'] || row.campoColaborador,
          areaColaborador: row['Área - colaborador'] || row.areaColaborador,
          estabelecimentoColaborador: row['Estabelecimento - colaborador'] || row.estabelecimentoColaborador,
          funcaoColaborador: row['Função - colaborador'] || row.funcaoColaborador,
          
          // Educação
          alunoEducacao: row['Aluno educação Adv.'] || row.alunoEducacao,
          parentesco: row['Parentesco p/ c/ aluno'] || row.parentesco,
          
          // Validação
          nomeCamposVazios: row['Nome dos campos vazios no ACMS'] || row.nomeCamposVazios,
          
          // Observações - construir a partir dos campos originais
          observacoes: [
            row['Como estudou a Bíblia'] && `Como estudou: ${row['Como estudou a Bíblia']}`,
            row['Teve participação'] && `Participação: ${row['Teve participação']}`,
            row['Campos vazios/inválidos'] && `Campos vazios: ${row['Campos vazios/inválidos']}`,
            row['Tempo de batismo'] && `Tempo de batismo: ${row['Tempo de batismo']}`,
            row['Engajamento'] && `Engajamento: ${row['Engajamento']}`,
            row['Classificação'] && `Classificação: ${row['Classificação']}`,
          ].filter(Boolean).join(' | ') || undefined,
          
          // Flag de validação interna
          valid: true,
        } as ExcelRow;
      })
      .filter((row): row is ExcelRow => row !== null);
  }, []);

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

      // Detectar colunas (para exibição)
      const columns = Object.keys(result.data[0] || {});
      setDetectedColumns(columns);

      // Armazenar dados brutos
      setRawData(result.data);

      // Processar dados com OR chains (padrão Gestão de Dados)
      const processed = processRawData(result.data);
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

  const handleRemoveFile = () => {
    setPreviewData([]);
    setRawData([]);
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

  // Contar campos detectados (campos com pelo menos 1 valor em QUALQUER linha)
  const detectedFieldsCount = useMemo(() => {
    if (previewData.length === 0) return 0;
    
    // Pegar todas as chaves do ExcelRow
    const allKeys = new Set<string>();
    previewData.forEach(row => {
      Object.keys(row).forEach(key => allKeys.add(key));
    });
    
    // Verificar quais campos têm pelo menos um valor preenchido
    let count = 0;
    allKeys.forEach(key => {
      if (key === 'valid' || key === 'validationError') return;
      
      const hasValue = previewData.some(row => {
        const val = row[key as keyof typeof row];
        return val !== undefined && val !== null && val !== '' && val !== false;
      });
      
      if (hasValue) count++;
    });
    
    return count;
  }, [previewData]);

  return (
    <div className="p-4 sm:p-6 md:p-10">
      {/* Header */}
      <div className="text-center mb-6 sm:mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-blue-50 to-purple-50 rounded-full border border-blue-100 mb-3 sm:mb-4">
          <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500" />
          <span className="text-xs sm:text-sm font-medium text-blue-700">Passo 4 de 6</span>
        </div>
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-900 to-blue-700 bg-clip-text text-transparent">
          Importar Membros
        </h2>
        <p className="text-blue-600 mt-2 sm:mt-3 text-sm sm:text-base md:text-lg">
          Importe uma planilha com os membros existentes. Este passo é opcional.
        </p>
      </div>

      {/* Progress Bar */}
      {(importStep as string) !== 'upload' && (
        <div className="mb-8 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-blue-700">Progresso da Importação</span>
            <span className="font-medium text-blue-800">{importProgress}%</span>
          </div>
          <Progress value={importProgress} className="w-full h-2" />
          <div className="flex justify-between text-xs text-blue-500">
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
        <div className="border-2 border-dashed border-blue-200 rounded-2xl hover:border-blue-400 transition-all bg-gradient-to-br from-blue-50/50 to-white">
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

              <h3 className="text-xl font-semibold mb-2 text-blue-900">
                Arraste sua planilha aqui
              </h3>
              <p className="text-blue-500 text-sm mb-6">ou</p>

              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="h-12 px-6 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 shadow-lg hover:shadow-xl transition-all"
              >
                <Upload className="w-5 h-5 mr-2" />
                {isUploading ? 'Processando...' : 'Selecionar Arquivo'}
              </Button>

              <p className="text-xs text-blue-500 mt-4">
                Formatos aceitos: Excel (.xlsx, .xls) ou CSV. Máximo 10MB.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Preview Step */}
      {importStep === 'preview' && (
        <div className="space-y-6">
          <div className="border-2 border-blue-100 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-blue-900">{fileName}</h3>
                    <p className="text-sm text-blue-600">
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
                    <span className="font-semibold">Campos Detectados</span>
                  </div>
                  <p className="text-3xl font-bold text-purple-900">
                    {detectedFieldsCount}/{detectedColumns.length}
                  </p>
                </div>
              </div>

              {/* Tabela de Preview */}
              <div className="border-2 border-blue-200 rounded-xl overflow-hidden !bg-blue-50">
                <div className="max-h-64 overflow-y-auto !bg-blue-50">
                  <Table className="!bg-blue-50">
                    <TableHeader className="sticky top-0 !bg-blue-100">
                      <TableRow className="!bg-blue-100 !border-blue-200">
                        <TableHead className="w-12 font-semibold text-blue-800 !bg-blue-100">
                          #
                        </TableHead>
                        <TableHead className="font-semibold text-blue-800 !bg-blue-100">
                          Nome
                        </TableHead>
                        <TableHead className="font-semibold text-blue-800 !bg-blue-100">
                          Igreja
                        </TableHead>
                        <TableHead className="font-semibold text-blue-800 !bg-blue-100">
                          Telefone
                        </TableHead>
                        <TableHead className="font-semibold text-blue-800 !bg-blue-100">
                          Email
                        </TableHead>
                        <TableHead className="font-semibold text-blue-800 !bg-blue-100">
                          Status
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="!bg-blue-50">
                      {previewData.slice(0, 5).map((row, index) => (
                        <TableRow
                          key={index}
                          className="hover:!bg-blue-100 !bg-blue-50 !border-blue-200"
                        >
                          <TableCell className="text-blue-500 font-medium !bg-blue-50">
                            {index + 1}
                          </TableCell>
                          <TableCell className="font-medium text-blue-900 !bg-blue-50">
                            {row.nome}
                          </TableCell>
                          <TableCell className="text-blue-700 !bg-blue-50">
                            {row.igreja || '-'}
                          </TableCell>
                          <TableCell className="text-blue-700 !bg-blue-50">
                            {row.telefone || '-'}
                          </TableCell>
                          <TableCell className="text-blue-700 !bg-blue-50">
                            {row.email || '-'}
                          </TableCell>
                          <TableCell className="!bg-blue-50">
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
                  <div className="p-3 !bg-blue-100 text-center text-sm text-blue-700 border-t border-blue-200">
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
              className="rounded-xl !border-blue-200 !bg-blue-50 !text-blue-700 hover:!border-blue-400 hover:!bg-blue-100"
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

      {/* Mapping Step (mesmo padrão do Gestão de Dados) */}
      {importStep === 'mapping' && (
        <div className="space-y-6">
          <div className="border-2 border-blue-200 rounded-2xl p-6 !bg-blue-50/50">
            <h3 className="text-lg font-semibold mb-2 text-blue-900">Mapeamento de Colunas</h3>
            <p className="text-sm text-blue-600 mb-6">
              Confirme o mapeamento automático das colunas ou ajuste conforme necessário
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {DISPLAY_FIELDS.map(mapping => (
                <div key={mapping.field} className="space-y-2">
                  <Label className="text-sm text-blue-800">
                    {mapping.label}
                    {mapping.required && <span className="text-red-500 ml-1">*</span>}
                  </Label>
                  <Select defaultValue={mapping.field}>
                    <SelectTrigger className="rounded-xl !bg-white !border-blue-200 focus:!border-blue-400">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={mapping.field}>
                        {mapping.field.charAt(0).toUpperCase() + mapping.field.slice(1)}
                      </SelectItem>
                      <SelectItem value="none">Não mapear</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>

          {/* Alerta se não encontrou membros válidos */}
          {previewData.length === 0 && (
            <Alert variant="destructive" className="rounded-xl">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Nenhum membro válido encontrado. Verifique se a planilha contém uma coluna "Nome".
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
              className="rounded-xl !border-blue-200 !bg-blue-50 !text-blue-700 hover:!border-blue-400 hover:!bg-blue-100"
            >
              Voltar
            </Button>
            <Button
              onClick={() => {
                validateData(previewData);
                setImportStep('validation');
                setImportProgress(75);
              }}
              disabled={previewData.length === 0}
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
            <Card
              className="rounded-2xl border-2 border-blue-200 !bg-blue-50"
              style={{ backgroundColor: '#eff6ff' }}
            >
              <CardContent className="p-4 !bg-blue-50" style={{ backgroundColor: '#eff6ff' }}>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-6 w-6 text-blue-600" />
                  <div>
                    <p className="text-2xl font-bold text-blue-700">{validCount}</p>
                    <p className="text-sm text-blue-600">Registros válidos</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              className="rounded-2xl border-2 border-purple-200 !bg-purple-50"
              style={{ backgroundColor: '#faf5ff' }}
            >
              <CardContent className="p-4 !bg-purple-50" style={{ backgroundColor: '#faf5ff' }}>
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-6 w-6 text-purple-600" />
                  <div>
                    <p className="text-2xl font-bold text-purple-700">{validationErrors.length}</p>
                    <p className="text-sm text-purple-600">Avisos encontrados</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              className="rounded-2xl border-2 border-indigo-200 !bg-indigo-50"
              style={{ backgroundColor: '#eef2ff' }}
            >
              <CardContent className="p-4 !bg-indigo-50" style={{ backgroundColor: '#eef2ff' }}>
                <div className="flex items-center gap-3">
                  <X className="h-6 w-6 text-indigo-600" />
                  <div>
                    <p className="text-2xl font-bold text-indigo-700">{duplicates.length}</p>
                    <p className="text-sm text-indigo-600">Duplicatas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Alertas */}
          {validationErrors.length > 0 && (
            <Alert className="rounded-xl border-2 border-yellow-200 !bg-yellow-50">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription>
                <p className="font-medium mb-2 text-yellow-800">Avisos encontrados:</p>
                <ul className="list-disc pl-4 space-y-1 text-sm text-yellow-700">
                  {validationErrors.slice(0, 5).map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
                {validationErrors.length > 5 && (
                  <p className="text-sm mt-2 text-yellow-700">
                    E mais {validationErrors.length - 5} avisos...
                  </p>
                )}
              </AlertDescription>
            </Alert>
          )}

          {duplicates.length > 0 && (
            <Alert className="rounded-xl border-2 border-yellow-200 !bg-yellow-50">
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
            <Alert className="rounded-xl border-2 border-green-200 !bg-green-50">
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
              className="rounded-xl !border-blue-200 !bg-blue-50 !text-blue-700 hover:!border-blue-400 hover:!bg-blue-100"
            >
              Voltar
            </Button>
            <Button
              onClick={handleComplete}
              className="rounded-xl bg-gradient-to-r from-blue-500 to-purple-500"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Salvar e Continuar
            </Button>
          </div>
        </div>
      )}

      {/* Complete Step */}
      {importStep === 'complete' && (
        <div className="text-center py-10">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center mx-auto mb-6 shadow-lg">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-blue-700 mb-2">Dados Salvos!</h3>
          <p className="text-gray-500 mb-6">
            {previewData.length} membros preparados para importação.
          </p>

          <div className="max-w-md mx-auto space-y-4">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-left">
                  <p className="text-sm font-medium text-amber-800">Aguardando Aprovação</p>
                  <p className="text-sm text-amber-700 mt-1">
                    Os membros serão importados automaticamente quando o{' '}
                    <strong>administrador aprovar</strong> o seu cadastro.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
              <p className="text-sm text-gray-600">
                Continue preenchendo os próximos passos para finalizar seu cadastro.
              </p>
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

      {/* Instrução sobre formato (apenas na tela de upload) */}
      {importStep === 'upload' && (
        <div className="bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-2xl p-6 mt-6">
          <h4 className="font-semibold text-gray-800 mb-3">Colunas reconhecidas:</h4>
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
          <Alert className="mt-4 rounded-xl">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Formatos aceitos:</strong> Telefone (qualquer formato), Email (com @), Datas
              (DD/MM/AAAA ou outros formatos), Valores Sim/Não para campos booleanos
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:justify-between mt-6 sm:mt-10 pt-4 sm:pt-6 border-t border-blue-100">
        <Button
          onClick={onBack}
          size="lg"
          className="h-10 xs:h-11 sm:h-14 px-3 xs:px-4 sm:px-8 text-xs xs:text-sm sm:text-lg rounded-lg sm:rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 order-2 sm:order-1"
        >
          <ArrowLeft className="w-3 h-3 xs:w-4 xs:h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
          Voltar
        </Button>
        <div className="flex gap-2 order-1 sm:order-2">
          {importStep === 'upload' && (
            <Button
              variant="ghost"
              onClick={handleSkip}
              size="lg"
              className="h-10 xs:h-11 sm:h-14 px-2 xs:px-3 sm:px-6 text-xs xs:text-sm sm:text-lg rounded-lg sm:rounded-xl !bg-purple-50 !text-purple-700 hover:!bg-purple-100 flex-1 sm:flex-none"
            >
              <SkipForward className="w-3 h-3 xs:w-4 xs:h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
              Pular
            </Button>
          )}
          <Button
            onClick={onNext}
            disabled={isUploading || (importStep !== 'upload' && importStep !== 'complete')}
            size="lg"
            className="h-10 xs:h-11 sm:h-14 px-3 xs:px-4 sm:px-8 text-xs xs:text-sm sm:text-lg rounded-lg sm:rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 flex-1 sm:flex-none"
          >
            {importStep === 'complete' ? 'Continuar' : 'Próximo'}
            <ArrowRight className="w-3 h-3 xs:w-4 xs:h-4 sm:w-5 sm:h-5 ml-1 sm:ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
