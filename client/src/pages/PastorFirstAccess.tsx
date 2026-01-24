import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Database, Lock, CheckCircle2, ArrowRight, ArrowLeft, Upload, Eye, EyeOff, Building2 } from 'lucide-react';
import { isPastor } from '@/lib/permissions';
import * as XLSX from 'xlsx';

const STEPS = [
  {
    id: 1,
    title: 'Configurar Distrito',
    description: 'Informe o nome do seu distrito',
    icon: Building2,
    color: 'bg-purple-500'
  },
  {
    id: 2,
    title: 'Importar Banco de Dados',
    description: 'Importe os dados da sua igreja para começar a usar o sistema',
    icon: Database,
    color: 'bg-blue-500'
  },
  {
    id: 3,
    title: 'Trocar Senha',
    description: 'Por segurança, altere sua senha padrão',
    icon: Lock,
    color: 'bg-green-500'
  }
];

export default function PastorFirstAccess() {
  const { user, refreshUserData } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  
  // Estado do passo 1 (Configurar Distrito)
  const [districtName, setDistrictName] = useState('');
  const [districtCode, setDistrictCode] = useState('');
  const [isCreatingDistrict, setIsCreatingDistrict] = useState(false);
  const [districtCreated, setDistrictCreated] = useState(false);
  
  // Estado do passo 2 (Importação)
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importCompleted, setImportCompleted] = useState(false);
  
  // Estado do passo 3 (Troca de senha)
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordChanged, setPasswordChanged] = useState(false);

  // Verificar se é pastor
  if (!isPastor(user)) {
    navigate('/dashboard');
    return null;
  }

  // Verificar se já tem distrito configurado
  const hasDistrict = user?.districtId;

  const handleCreateDistrict = async () => {
    if (!districtName.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, informe o nome do distrito",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingDistrict(true);

    try {
      // Gerar código do distrito se não fornecido
      const code = districtCode.trim() || districtName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '-')
        .substring(0, 20);

      const response = await fetch('/api/districts/pastor/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id?.toString() || ''
        },
        body: JSON.stringify({
          name: districtName.trim(),
          code: code,
          pastorId: user?.id
        })
      });

      const data = await response.json();

      if (response.ok) {
        setDistrictCreated(true);
        setCompletedSteps([...completedSteps, 1]);
        toast({
          title: "Distrito criado!",
          description: `Distrito "${districtName}" configurado com sucesso`,
        });
        // Atualizar dados do usuário
        await refreshUserData?.();
      } else {
        throw new Error(data.error || 'Erro ao criar distrito');
      }
    } catch (error: any) {
      console.error('Erro ao criar distrito:', error);
      toast({
        title: "Erro ao criar distrito",
        description: error.message || "Não foi possível criar o distrito",
        variant: "destructive",
      });
    } finally {
      setIsCreatingDistrict(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        setImportFile(file);
      } else {
        toast({
          title: "Formato inválido",
          description: "Por favor, selecione um arquivo Excel (.xlsx ou .xls)",
          variant: "destructive",
        });
      }
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      toast({
        title: "Nenhum arquivo selecionado",
        description: "Por favor, selecione um arquivo para importar",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);
    setImportProgress(0);

    try {
      // Ler arquivo Excel
      const arrayBuffer = await importFile.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (!jsonData || jsonData.length === 0) {
        throw new Error('Nenhum dado encontrado no arquivo');
      }

      setImportProgress(30);

      // Processar dados para o formato esperado pela API
      const usersToImport = jsonData.map((row: any) => {
        // Função auxiliar para formatar telefone
        const formatPhoneNumber = (phone: any): string | null => {
          if (!phone) return null;
          const phoneStr = phone.toString().replace(/\D/g, '');
          if (phoneStr.length < 10) return null;
          return phoneStr;
        };

        // Função auxiliar para obter role
        const getRole = (tipo: any): string => {
          if (!tipo) return 'member';
          const tipoStr = tipo.toString().toLowerCase();
          if (tipoStr.includes('admin') || tipoStr.includes('pastor')) return 'member'; // Pastores não podem ser criados via import
          if (tipoStr.includes('missionary') || tipoStr.includes('missionário')) return 'missionary';
          if (tipoStr.includes('interested') || tipoStr.includes('interessado')) return 'interested';
          return 'member';
        };

        // Função auxiliar para parsear data
        const parseDate = (dateStr: any): string | null => {
          if (!dateStr) return null;
          try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return null;
            return date.toISOString().split('T')[0];
          } catch {
            return null;
          }
        };

        const originalPhone = row.Celular || row.celular || row.telefone || row.Telefone || row.phone;
        const formattedPhone = formatPhoneNumber(originalPhone);

        return {
          name: row.Nome || row.nome || row.name || 'Usuário Importado',
          email: row.Email || row.email || `${(row.Nome || row.nome || 'usuario').toLowerCase().replace(/\s+/g, '.')}@igreja.com`,
          password: '123456', // Senha padrão
          role: getRole(row.Tipo || row.tipo || row.role),
          church: row.Igreja || row.igreja || row.church || user?.church || 'Igreja Principal',
          phone: formattedPhone,
          cpf: row.CPF || row.cpf,
          address: row.Endereço || row.endereco || row.address,
          birthDate: parseDate(row.Nascimento || row.nascimento || row.birthDate),
          baptismDate: parseDate(row.Batismo || row.batismo || row.baptismDate),
          civilStatus: row['Estado civil'] || row.estadoCivil || row.civilStatus,
          occupation: row.Ocupação || row.ocupacao || row.profissao || row.occupation,
          education: row['Grau de educação'] || row.educacao || row.education,
        };
      });

      setImportProgress(60);

      // Enviar para API em lotes
      const batchSize = 50;
      let totalImported = 0;
      let lastResult: any = null;

      for (let i = 0; i < usersToImport.length; i += batchSize) {
        const batch = usersToImport.slice(i, i + batchSize);
        
        const response = await fetch('/api/users/bulk-import', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': user?.id?.toString() || ''
          },
          body: JSON.stringify({ 
            users: batch,
            allowUpdates: false
          })
        });

        const result = await response.json();
        lastResult = result;
        
        if (response.ok) {
          totalImported += result.imported || 0;
          setImportProgress(60 + ((i + batchSize) / usersToImport.length) * 30);
        } else {
          throw new Error(result.error || 'Erro ao importar dados');
        }
      }

      setImportProgress(100);
      setImportCompleted(true);
      setCompletedSteps([...completedSteps, 2]);
      
      toast({
        title: "Importação concluída!",
        description: lastResult?.message || `${totalImported} usuários importados com sucesso`,
      });
    } catch (error: any) {
      console.error('Erro na importação:', error);
      toast({
        title: "Erro na importação",
        description: error.message || "Não foi possível importar o arquivo",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos de senha",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Senhas não coincidem",
        description: "As senhas digitadas não são iguais",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Senha muito curta",
        description: "A senha deve ter pelo menos 6 caracteres",
        variant: "destructive",
      });
      return;
    }

    setIsChangingPassword(true);

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.id,
          currentPassword,
          newPassword
        }),
      });

      const data = await response.json();

      if (data.success) {
        setPasswordChanged(true);
        setCompletedSteps([...completedSteps, 3]);
        toast({
          title: "Senha alterada!",
          description: "Sua senha foi alterada com sucesso",
        });
      } else {
        throw new Error(data.message || 'Erro ao alterar senha');
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao alterar senha",
        variant: "destructive",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Finalizar primeiro acesso
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    // Marcar primeiro acesso como concluído
    if (user?.id) {
      try {
        const response = await fetch(`/api/users/${user.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': user.id.toString()
          },
          body: JSON.stringify({
            firstAccess: false
          })
        });

        if (response.ok) {
          localStorage.setItem('pastor_first_access_completed', 'true');
          await refreshUserData?.();
          navigate('/dashboard');
        }
      } catch (error) {
        console.error('Erro ao atualizar primeiro acesso:', error);
      }
    }
  };

  const canProceed = () => {
    if (currentStep === 0) {
      // Passo 1: Configurar Distrito - precisa completar OU já tem distrito
      return districtCreated || hasDistrict;
    } else if (currentStep === 1) {
      // Passo 2: Importação - pode pular (não é obrigatório)
      return true; // Sempre permite avançar, mesmo sem importar
    } else if (currentStep === 2) {
      // Passo 3: Senha - precisa completar
      return passwordChanged;
    }
    return false;
  };

  const currentStepData = STEPS[currentStep];
  const StepIcon = currentStepData.icon;
  const progress = ((currentStep + 1) / STEPS.length) * 100;

  return (
    <MobileLayout showBottomNav={false}>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 p-4">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <Card className="bg-white/95 backdrop-blur-sm">
            <CardHeader className="text-center space-y-4">
              <div className={`w-20 h-20 mx-auto ${currentStepData.color} rounded-full flex items-center justify-center`}>
                <StepIcon className="w-10 h-10 text-white" />
              </div>
              <CardTitle className="text-2xl">
                Bem-vindo, Pastor {user?.name?.split(' ')[0]}!
              </CardTitle>
              <CardDescription className="text-base">
                Vamos configurar sua conta em {STEPS.length} passos simples
              </CardDescription>
              <Progress value={progress} className="h-2" />
              <div className="flex justify-center gap-2 mt-2">
                {STEPS.map((step, index) => (
                  <div
                    key={step.id}
                    className={`w-3 h-3 rounded-full ${
                      index === currentStep
                        ? 'bg-blue-600'
                        : completedSteps.includes(step.id)
                        ? 'bg-green-500'
                        : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            </CardHeader>
          </Card>

          {/* Conteúdo do passo atual */}
          <Card className="bg-white/95 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-blue-600">Passo {currentStep + 1}:</span>
                {currentStepData.title}
              </CardTitle>
              <CardDescription>{currentStepData.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {currentStep === 0 && (
                <div className="space-y-4">
                  {hasDistrict ? (
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 text-green-600 mb-2">
                        <CheckCircle2 className="h-5 w-5" />
                        <span className="font-medium">Distrito já configurado</span>
                      </div>
                      <p className="text-sm text-green-800">
                        Seu distrito já está configurado. Você pode avançar para o próximo passo.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div>
                        <Label htmlFor="district-name">Nome do Distrito *</Label>
                        <Input
                          id="district-name"
                          value={districtName}
                          onChange={(e) => setDistrictName(e.target.value)}
                          placeholder="Ex: Santana do Livramento"
                          className="mt-2"
                          disabled={districtCreated || isCreatingDistrict}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Informe o nome completo do seu distrito
                        </p>
                      </div>

                      <div>
                        <Label htmlFor="district-code">Código do Distrito (Opcional)</Label>
                        <Input
                          id="district-code"
                          value={districtCode}
                          onChange={(e) => setDistrictCode(e.target.value)}
                          placeholder="Ex: santana-livramento"
                          className="mt-2"
                          disabled={districtCreated || isCreatingDistrict}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Se não informado, será gerado automaticamente a partir do nome
                        </p>
                      </div>

                      {districtCreated && (
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle2 className="h-5 w-5" />
                          <span className="font-medium">Distrito criado com sucesso!</span>
                        </div>
                      )}

                      <div className="bg-blue-50 p-4 rounded-lg">
                        <p className="text-sm text-blue-800">
                          <strong>Importante:</strong> O distrito é necessário para organizar as igrejas e membros sob sua administração.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}

              {currentStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <Label>Selecione o arquivo Excel com os dados da igreja</Label>
                    <div className="mt-2 space-y-2">
                      <Input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleFileSelect}
                        className="hidden"
                        id="import-file"
                      />
                      <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full"
                        disabled={isImporting}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {importFile ? importFile.name : 'Selecionar arquivo'}
                      </Button>
                      {importFile && (
                        <div className="text-sm text-muted-foreground">
                          Arquivo selecionado: {importFile.name} ({(importFile.size / 1024).toFixed(2)} KB)
                        </div>
                      )}
                    </div>
                  </div>

                  {isImporting && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Importando dados...</span>
                        <span>{importProgress}%</span>
                      </div>
                      <Progress value={importProgress} />
                    </div>
                  )}

                  {importCompleted && (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="font-medium">Importação concluída com sucesso!</span>
                    </div>
                  )}

                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Dica:</strong> Você pode pular esta etapa e importar os dados depois nas Configurações.
                    </p>
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-4">
                  <div>
                    <Label>Senha Atual</Label>
                    <div className="relative mt-2">
                      <Input
                        type={showCurrentPassword ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Digite sua senha atual"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      >
                        {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label>Nova Senha</Label>
                    <div className="relative mt-2">
                      <Input
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Digite sua nova senha"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label>Confirmar Nova Senha</Label>
                    <div className="relative mt-2">
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirme sua nova senha"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  {passwordChanged && (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="font-medium">Senha alterada com sucesso!</span>
                    </div>
                  )}

                  <div className="bg-amber-50 p-4 rounded-lg">
                    <p className="text-sm text-amber-800">
                      <strong>Importante:</strong> Por segurança, você deve alterar sua senha padrão antes de continuar.
                    </p>
                  </div>
                </div>
              )}

              {/* Botões de navegação */}
              <div className="flex gap-2 pt-4">
                {currentStep > 0 && (
                  <Button
                    variant="outline"
                    onClick={handlePrevious}
                    className="flex-1"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Anterior
                  </Button>
                )}
                
                {currentStep === 0 && !hasDistrict && !districtCreated && (
                  <Button
                    onClick={handleCreateDistrict}
                    disabled={isCreatingDistrict || !districtName.trim()}
                    className="flex-1"
                  >
                    {isCreatingDistrict ? 'Criando...' : 'Criar Distrito'}
                  </Button>
                )}

                {currentStep === 1 && importFile && (
                  <Button
                    onClick={handleImport}
                    disabled={isImporting || importCompleted}
                    className="flex-1"
                  >
                    {isImporting ? 'Importando...' : importCompleted ? 'Importado' : 'Importar Dados'}
                  </Button>
                )}

                {currentStep === 2 && !passwordChanged && (
                  <Button
                    onClick={handleChangePassword}
                    disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
                    className="flex-1"
                  >
                    {isChangingPassword ? 'Alterando...' : 'Alterar Senha'}
                  </Button>
                )}

                <Button
                  onClick={handleNext}
                  disabled={!canProceed()}
                  className="flex-1"
                >
                  {currentStep === STEPS.length - 1 ? 'Finalizar' : 'Próximo'}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MobileLayout>
  );
}

