/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import {
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle,
  X,
  Loader2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { hasAdminAccess } from '@/lib/permissions';
import { readExcelFile } from '@/lib/excel';
import {
  getRole,
  parseNumber,
  parseDate,
  parseBooleanField,
  parseDizimistaField,
  parseOfertanteField,
  formatPhoneNumber,
} from '@/utils/importParsers';

interface ImportUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  onImportComplete: () => void;
  loadChurches: () => Promise<void>;
}

type ImportStep = 'upload' | 'preview' | 'mapping' | 'validation' | 'importing' | 'complete';

export function ImportUsersModal({
  isOpen,
  onClose,
  user,
  onImportComplete,
  loadChurches,
}: ImportUsersModalProps) {
  const { toast } = useToast();

  const [_importFile, setImportFile] = useState<File | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [importStep, setImportStep] = useState<ImportStep>('upload');
  const [importData, setImportData] = useState<any[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importDuplicates, setImportDuplicates] = useState<any[]>([]);

  const processRealFile = async (file: File) => {
    try {
      setImportProgress(20);
      setImportStep('preview');

      if (file.name.endsWith('.xlsx')) {
        const { rows } = await readExcelFile(file);
        setImportData(rows);
      } else if (file.name.endsWith('.csv')) {
        const arrayBuffer = await file.arrayBuffer();
        const text = new TextDecoder().decode(arrayBuffer);
        const lines = text.split('\n');
        const headers = lines[0].split(',').map((h) => h.trim());

        const jsonData = lines
          .slice(1)
          .filter((line) => line.trim())
          .map((line) => {
            const values = line.split(',').map((v) => v.trim());
            const obj: Record<string, string> = {};
            headers.forEach((header, index) => {
              obj[header] = values[index] || '';
            });
            return obj;
          });

        setImportData(jsonData);
      }

      setTimeout(() => {
        setImportProgress(40);
        setImportStep('mapping');
      }, 500);
    } catch (_error) {
      console.error('Error processing file:', _error);
      toast({
        title: 'Erro no arquivo',
        description: 'Não foi possível processar o arquivo. Verifique o formato.',
        variant: 'destructive',
      });
    }
  };

  const validateImportData = () => {
    const errors: string[] = [];
    const duplicates: string[] = [];
    const emails = new Set();

    const validatedData = importData.map((row, index) => {
      const validatedRow = { ...row, valid: true, errors: [] };
      const lineNumber = index + 1;

      const name = row.nome || row.Nome || row.name;
      if (!name || name.toString().trim() === '') {
        errors.push(`Linha ${lineNumber}: Nome é obrigatório`);
        validatedRow.valid = false;
      }

      const email = row.email || row.Email;
      if (email) {
        const emailStr = email.toString().trim();
        if (emailStr && !emailStr.includes('@')) {
          errors.push(`Linha ${lineNumber}: Email "${emailStr}" é inválido`);
          validatedRow.valid = false;
        }
        if (emails.has(emailStr)) {
          duplicates.push(`Linha ${lineNumber}: Email "${emailStr}" duplicado`);
          validatedRow.valid = false;
        } else {
          emails.add(emailStr);
        }
      }

      const phone = row.celular || row.Celular || row.telefone || row.Telefone || row.phone;
      if (phone) {
        const phoneStr = phone.toString().trim();
        if (phoneStr && phoneStr.length < 10) {
          errors.push(`Linha ${lineNumber}: Telefone "${phoneStr}" muito curto`);
          validatedRow.valid = false;
        }
      }

      const tipo = row.tipo || row.Tipo || row.role;
      if (tipo) {
        const tipoStr = tipo.toString().toLowerCase();
        const validRoles = [
          'admin', 'superadmin', 'pastor', 'missionary', 'member', 'interested',
          'diácono', 'membro', 'interessado',
        ];
        if (!validRoles.some((role) => tipoStr.includes(role))) {
          errors.push(
            `Linha ${lineNumber}: Tipo "${tipo}" não reconhecido. Use: Superadmin, Pastor, Missionary, Member ou Interested`
          );
          validatedRow.valid = false;
        }
      }

      return validatedRow;
    });

    setImportData(validatedData);
    setImportErrors([...errors, ...duplicates]);
    setImportDuplicates(duplicates);
  };

  const performImport = async () => {
    try {
      setImportStep('importing');
      setImportProgress(85);

      const validRows = importData.filter((row) => {
        const name = row.nome || row.Nome || row.name;
        return name && name.toString().trim() !== '';
      });

      const batchSize = 50;
      let totalImported = 0;

      let lastResult: {
        created?: number;
        updated?: number;
        errors?: number;
        skipped?: number;
        imported?: number;
        message?: string;
      } | null = null;

      for (let i = 0; i < validRows.length; i += batchSize) {
        const batch = validRows.slice(i, i + batchSize);

        const usersToImport = batch.map((row) => {
          const originalPhone =
            row.Celular || row.celular || row.telefone || row.Telefone || row.phone || row['Celular'];
          const formattedPhone = formatPhoneNumber(originalPhone);
          const phoneWarning = originalPhone && !formattedPhone;

          return {
            name: row.Nome || row.nome || row.name || 'Usuário Importado',
            email:
              row.Email || row.email ||
              `${(row.Nome || row.nome || 'usuario').toLowerCase().replace(/\s+/g, '.')}@igreja.com`,
            password: undefined,
            role: getRole(row.Tipo || row.tipo || row.role),
            church: row.Igreja || row.igreja || row.church || 'Igreja Principal',
            churchCode: row.Código || row.codigo || row.code,
            phone: formattedPhone,
            cpf: row.CPF || row.cpf,
            address: row.Endereço || row.endereco || row.address,
            birthDate: parseDate(row.Nascimento || row.nascimento || row.birthDate),
            baptismDate: parseDate(row.Batismo || row.batismo || row.baptismDate),
            civilStatus: row['Estado civil'] || row.estadoCivil || row.civilStatus,
            occupation: row.Ocupação || row.ocupacao || row.profissao || row.occupation,
            education: row['Grau de educação'] || row.educacao || row.education,
            engajamento: row.Engajamento || row.engajamento || null,
            classificacao: row.Classificação || row.classificacao || null,
            ...(() => {
              const dizimistaResult = parseDizimistaField(row.Dizimista || row.dizimista);
              return { isDonor: dizimistaResult.isDonor, dizimistaType: dizimistaResult.dizimistaType };
            })(),
            ...(() => {
              const ofertanteResult = parseOfertanteField(row.Ofertante || row.ofertante);
              return { isOffering: ofertanteResult.isOffering, ofertanteType: ofertanteResult.ofertanteType };
            })(),
            tempoBatismoAnos: (() => {
              const direto = parseNumber(row['Tempo de batismo - anos'] || row.tempoBatismoAnos);
              if (direto > 0) return direto;
              const dataBatismo = parseDate(row.Batismo || row.batismo || row.baptismDate);
              if (dataBatismo) {
                const hoje = new Date();
                const batismo = new Date(dataBatismo);
                const diffAnos = Math.floor(
                  (hoje.getTime() - batismo.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
                );
                return diffAnos > 0 ? diffAnos : 0;
              }
              return 0;
            })(),
            departamentosCargos:
              row['Departamentos e cargos'] || row.departamentosCargos || row.departamentos || null,
            nomeUnidade: row['Nome da unidade'] || row.nomeUnidade || null,
            temLicao: parseBooleanField(row['Tem lição'] || row.temLicao),
            totalPresenca: parseNumber(row['Total de presença'] || row.totalPresenca || row.presencaTotal),
            comunhao: parseNumber(row.Comunhão || row.comunhao),
            missao: parseNumber(row.Missão || row.missao),
            estudoBiblico: parseNumber(row['Estudo bíblico'] || row.estudoBiblico),
            batizouAlguem: (() => {
              const valor = row['Batizou alguém'] || row.batizouAlguem;
              if (typeof valor === 'number') return valor > 0;
              return parseBooleanField(valor);
            })(),
            discPosBatismal: parseNumber(row['Disc. pós batismal'] || row.discPosBatismal),
            cpfValido: parseBooleanField(row['CPF válido'] || row.cpfValido),
            camposVazios: (() => {
              const valor = row['Campos vazios/inválidos'] || row.camposVazios;
              if (typeof valor === 'number') return valor > 0;
              return parseBooleanField(valor);
            })(),
            isEnrolledES: parseBooleanField(row['Matriculado na ES'] || row.matriculadoES),
            hasLesson: parseBooleanField(row['Tem lição'] || row.temLicao),
            esPeriod: row['Período ES'] || row.periodoES,
            previousReligion: row['Religião anterior'] || row.religiaoAnterior,
            biblicalInstructor: row['Instrutor bíblico'] || row.instrutorBiblico,
            departments: row['Departamentos e cargos'] || row.departamentos,
            extraData: JSON.stringify({
              sexo: row.Sexo || row.sexo,
              idade: parseNumber(row.Idade || row.idade),
              codigo: row.Código || row.codigo,
              phoneWarning,
              originalPhone: phoneWarning ? originalPhone : null,
              bairro: row.Bairro || row.bairro,
              cidadeEstado: row['Cidade e Estado'] || row.cidadeEstado,
              cidadeNascimento: row['Cidade de nascimento'] || row.cidadeNascimento,
              estadoNascimento: row['Estado de nascimento'] || row.estadoNascimento,
              cpf: row.CPF || row.cpf,
              quantidadeBatizados:
                typeof (row['Batizou alguém'] || row.batizouAlguem) === 'number'
                  ? parseNumber(row['Batizou alguém'] || row.batizouAlguem) : 0,
              dizimos12m: row['Dízimos - 12m'] || row.dizimos12m,
              ultimoDizimo: row['Último dízimo - 12m'] || row.ultimoDizimo,
              valorDizimo: row['Valor dízimo - 12m'] || row.valorDizimo,
              numeroMesesSemDizimar: row['Número de meses s/ dizimar'] || row.numeroMesesSemDizimar,
              dizimistaAntesUltimoDizimo:
                row['Dizimista antes do últ. dízimo'] || row.dizimistaAntesUltimoDizimo,
              dizimistaType: (() => {
                const dizimistaResult = parseDizimistaField(row.Dizimista || row.dizimista);
                return dizimistaResult.dizimistaType;
              })(),
              ofertas12m: row['Ofertas - 12m'] || row.ofertas12m,
              ultimaOferta: row['Última oferta - 12m'] || row.ultimaOferta,
              valorOferta: row['Valor oferta - 12m'] || row.valorOferta,
              numeroMesesSemOfertar: row['Número de meses s/ ofertar'] || row.numeroMesesSemOfertar,
              ofertanteAntesUltimaOferta:
                row['Ofertante antes da últ. oferta'] || row.ofertanteAntesUltimaOferta,
              ofertanteType: (() => {
                const ofertanteResult = parseOfertanteField(row.Ofertante || row.ofertante);
                return ofertanteResult.ofertanteType;
              })(),
              ultimoMovimento: row['Último movimento'] || row.ultimoMovimento,
              dataUltimoMovimento: row['Data do último movimento'] || row.dataUltimoMovimento,
              tipoEntrada: row['Tipo de entrada'] || row.tipoEntrada,
              tempoBatismo: row['Tempo de batismo'] || row.tempoBatismo,
              localidadeBatismo: row['Localidade do batismo'] || row.localidadeBatismo,
              batizadoPor: row['Batizado por'] || row.batizadoPor,
              idadeBatismo: row['Idade no Batismo'] || row.idadeBatismo,
              comoConheceu: row['Como conheceu a IASD'] || row.comoConheceu,
              fatorDecisivo: row['Fator decisivo'] || row.fatorDecisivo,
              comoEstudou: row['Como estudou a Bíblia'] || row.comoEstudou,
              instrutorBiblico2: row['Instrutor bíblico 2'] || row.instrutorBiblico2,
              temCargo: row['Tem cargo'] || row.temCargo,
              teen: row.Teen || row.teen,
              nomeMae: row['Nome da mãe'] || row.nomeMae,
              nomePai: row['Nome do pai'] || row.nomePai,
              dataCasamento: parseDate(row['Data de casamento'] || row.dataCasamento),
              presencaCartao: parseNumber(row['Total presença no cartão'] || row.presencaCartao),
              presencaQuizLocal: parseNumber(row['Presença no quiz local'] || row.presencaQuizLocal),
              presencaQuizOutra: parseNumber(
                row['Presença no quiz outra unidade'] || row.presencaQuizOutraUnidade
              ),
              presencaQuizOnline: parseNumber(row['Presença no quiz online'] || row.presencaQuizOnline),
              teveParticipacao: row['Teve participação'] || row.teveParticipacao,
              matriculadoES: parseBooleanField(row['Matriculado na ES'] || row.matriculadoES),
              campoColaborador: row['Campo - colaborador'] || row.campoColaborador,
              areaColaborador: row['Área - colaborador'] || row.areaColaborador,
              estabelecimentoColaborador:
                row['Estabelecimento - colaborador'] || row.estabelecimentoColaborador,
              funcaoColaborador: row['Função - colaborador'] || row.funcaoColaborador,
              nomeCamposVazios: row['Nome dos campos vazios no ACMS'] || row.nomeCamposVazios,
              alunoEducacao: row['Aluno educação Adv.'] || row.alunoEducacao,
              parentesco: row['Parentesco p/ c/ aluno'] || row.parentesco,
            }),
            observations:
              [
                row['Como estudou a Bíblia'] && `Como estudou: ${row['Como estudou a Bíblia']}`,
                row['Teve participação'] && `Participação: ${row['Teve participação']}`,
                row['Campos vazios/inválidos'] && `Campos vazios: ${row['Campos vazios/inválidos']}`,
                row['Tempo de batismo'] && `Tempo de batismo: ${row['Tempo de batismo']}`,
                row['Engajamento'] && `Engajamento: ${row['Engajamento']}`,
                row['Classificação'] && `Classificação: ${row['Classificação']}`,
              ]
                .filter(Boolean)
                .join(' | ') || null,
          };
        });

        const response = await fetch('/api/users/bulk-import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            users: usersToImport,
            allowUpdates: importErrors.length > 0,
          }),
        });

        const result = await response.json();
        lastResult = result;

        if (response.ok) {
          totalImported += result.imported + (result.updated || 0);
          const progress = 85 + ((i + batchSize) / validRows.length) * 15;
          setImportProgress(Math.min(progress, 100));
        } else {
          throw new Error(result.error || 'Erro na importação');
        }
      }

      setImportProgress(100);
      setImportStep('complete');

      onImportComplete();

      toast({
        title: 'Importação concluída!',
        description: lastResult?.message || `${totalImported} usuários importados com sucesso`,
      });

      if (hasAdminAccess(user)) {
        await loadChurches();
      }

      window.dispatchEvent(new CustomEvent('user-imported'));
    } catch (error) {
      console.error('Import error:', error);

      let errorMessage = 'Ocorreu um erro durante a importação.';
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      toast({
        title: 'Erro na importação',
        description: errorMessage,
        variant: 'destructive',
      });
      setImportStep('validation');
    }
  };

  const handleClose = () => {
    onClose();
    // Reset state when closing
    setImportStep('upload');
    setImportProgress(0);
    setImportFile(null);
    setImportData([]);
    setImportErrors([]);
    setImportDuplicates([]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar Usuários
          </DialogTitle>
          <DialogDescription>
            Importe dados de usuários a partir de arquivos Excel (.xlsx) ou CSV
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Progresso da Importação</span>
              <span>{importProgress}%</span>
            </div>
            <Progress value={importProgress} className="w-full" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className={importStep === 'upload' ? 'text-primary font-medium' : ''}>Upload</span>
              <span className={importStep === 'preview' ? 'text-primary font-medium' : ''}>Preview</span>
              <span className={importStep === 'mapping' ? 'text-primary font-medium' : ''}>Mapeamento</span>
              <span className={importStep === 'validation' ? 'text-primary font-medium' : ''}>Validação</span>
              <span className={importStep === 'importing' ? 'text-primary font-medium' : ''}>Importando</span>
              <span className={importStep === 'complete' ? 'text-primary font-medium' : ''}>Concluído</span>
            </div>
          </div>

          {/* Upload Step */}
          {importStep === 'upload' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Selecione o arquivo</h3>
                  <p className="text-sm text-muted-foreground">
                    Formatos aceitos: .xlsx, .csv (máximo 10MB)
                  </p>
                </div>
                <input
                  type="file"
                  accept=".xlsx,.csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setImportFile(file);
                      processRealFile(file);
                    }
                  }}
                  className="mt-4"
                  data-testid="file-upload"
                />
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Colunas reconhecidas:</strong> Igreja, Nome, Código, Tipo, Sexo, Idade,
                  Nascimento, Engajamento, Classificação, Dizimista, Ofertante, Email, Celular,
                  CPF, Estado civil, Ocupação, Grau de educação, Batismo, Religião anterior,
                  Instrutor bíblico, Departamentos e cargos, Nome da mãe/pai, Bairro, Endereço,
                  Matriculado na ES, Tem lição, e muitos outros campos específicos da IASD.
                  <br />
                  <strong>Formatos aceitos:</strong> Telefone (qualquer formato), Email (com @),
                  Datas (DD/MM/AAAA ou outros formatos), Valores Sim/Não para campos booleanos
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Preview Step */}
          {importStep === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Preview dos Dados</h3>
                <Badge variant="secondary">{importData.length} registros encontrados</Badge>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Igreja</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Celular</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importData.slice(0, 5).map((row, index) => (
                      <TableRow key={index}>
                        <TableCell>{row.Nome || row.nome || 'N/A'}</TableCell>
                        <TableCell>{row.Igreja || row.igreja || 'N/A'}</TableCell>
                        <TableCell>{row.Código || row.codigo || 'N/A'}</TableCell>
                        <TableCell>{row.Tipo || row.tipo || 'N/A'}</TableCell>
                        <TableCell>{row.Email || row.email || 'N/A'}</TableCell>
                        <TableCell>{row.Celular || row.celular || 'N/A'}</TableCell>
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

              {importData.length > 5 && (
                <p className="text-sm text-muted-foreground text-center">
                  Mostrando 5 de {importData.length} registros
                </p>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={() => { setImportStep('mapping'); setImportProgress(50); }}
                  data-testid="continue-mapping"
                >
                  Continuar para Mapeamento
                </Button>
                <Button
                  variant="outline"
                  onClick={() => { setImportStep('upload'); setImportProgress(0); setImportFile(null); }}
                >
                  Voltar
                </Button>
              </div>
            </div>
          )}

          {/* Mapping Step */}
          {importStep === 'mapping' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Mapeamento de Colunas</h3>
              <p className="text-sm text-muted-foreground">
                Confirme o mapeamento automático das colunas ou ajuste conforme necessário
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { field: 'nome', label: 'Nome', required: true },
                  { field: 'email', label: 'Email', required: true },
                  { field: 'celular', label: 'Telefone', required: true },
                  { field: 'tipo', label: 'Tipo de Usuário', required: true },
                  { field: 'igreja', label: 'Igreja', required: false },
                  { field: 'nascimento', label: 'Data de Nascimento', required: false },
                ].map((mapping) => (
                  <div key={mapping.field} className="space-y-2">
                    <Label>
                      {mapping.label}
                      {mapping.required && <span className="text-destructive ml-1">*</span>}
                    </Label>
                    <Select defaultValue={mapping.field}>
                      <SelectTrigger>
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

              <div className="flex gap-2">
                <Button
                  onClick={() => { setImportStep('validation'); setImportProgress(75); validateImportData(); }}
                  data-testid="continue-validation"
                >
                  Continuar para Validação
                </Button>
                <Button
                  variant="outline"
                  onClick={() => { setImportStep('preview'); setImportProgress(25); }}
                >
                  Voltar
                </Button>
              </div>
            </div>
          )}

          {/* Validation Step */}
          {importStep === 'validation' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Validação dos Dados</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium">{importData.filter((r) => r.valid).length}</p>
                        <p className="text-sm text-muted-foreground">Registros válidos</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-yellow-600" />
                      <div>
                        <p className="font-medium">{importErrors.length}</p>
                        <p className="text-sm text-muted-foreground">Erros encontrados</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <X className="h-5 w-5 text-red-600" />
                      <div>
                        <p className="font-medium">{importDuplicates.length}</p>
                        <p className="text-sm text-muted-foreground">Duplicatas</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {importErrors.length > 0 && (
                <Alert variant="default">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <p className="font-medium">Avisos encontrados (linhas serão ignoradas):</p>
                      <ul className="list-disc pl-4 space-y-1">
                        {importErrors.slice(0, 3).map((error, index) => (
                          <li key={index} className="text-sm">{error}</li>
                        ))}
                      </ul>
                      {importErrors.length > 3 && (
                        <p className="text-sm">E mais {importErrors.length - 3} avisos...</p>
                      )}
                      <p className="text-sm font-medium mt-2">
                        Somente linhas sem nome serão ignoradas. Outros erros serão corrigidos automaticamente.
                      </p>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                <Button onClick={performImport} data-testid="start-import">
                  {importErrors.length > 0 ? 'Importar (ignorar erros)' : 'Iniciar Importação'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => { setImportStep('mapping'); setImportProgress(50); }}
                >
                  Voltar
                </Button>
              </div>
            </div>
          )}

          {/* Importing Step */}
          {importStep === 'importing' && (
            <div className="space-y-4 text-center">
              <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
              <div>
                <h3 className="text-lg font-medium">Importando dados...</h3>
                <p className="text-sm text-muted-foreground">
                  Processando {importData.filter((r) => r.valid).length} registros válidos
                </p>
              </div>
            </div>
          )}

          {/* Complete Step */}
          {importStep === 'complete' && (
            <div className="space-y-4 text-center">
              <CheckCircle className="h-12 w-12 mx-auto text-green-600" />
              <div>
                <h3 className="text-lg font-medium text-green-600">Importação Concluída!</h3>
                <p className="text-sm text-muted-foreground">
                  {importData.filter((r) => r.valid).length} usuários importados com sucesso
                </p>
              </div>

              <Button
                onClick={() => {
                  const importSuccessEvent = new CustomEvent('import-success', {
                    detail: {
                      type: 'users',
                      count: importData.filter((r) => r.valid).length,
                      timestamp: new Date().toISOString(),
                    },
                  });
                  window.dispatchEvent(importSuccessEvent);
                  handleClose();
                  onImportComplete();
                }}
                data-testid="close-import"
              >
                Fechar
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
