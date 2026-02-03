import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { hasAdminAccess } from '@/lib/permissions';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Settings,
  Users,
  Church,
  Vote,
  CheckCircle,
  AlertCircle,
  Save,
  Play,
  UserCheck,
  Target,
  RefreshCw,
  Loader2,
  User,
  Info,
  AlertTriangle,
  UserPlus,
  Plus,
  Edit,
  Trash2,
  X,
  FileText,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { MobileLayout } from '@/components/layout/MobileLayout';

interface Church {
  id: number;
  name: string;
  code: string;
}

interface Member {
  id: number;
  name: string;
  email: string;
  church: string;
  role: string;
  status?: string;
}

interface ElectionConfig {
  id?: number;
  churchId: number;
  churchName: string;
  title?: string;
  voters: number[];
  criteria: {
    faithfulness: {
      enabled: boolean;
      punctual: boolean;
      seasonal: boolean;
      recurring: boolean;
    };
    attendance: {
      enabled: boolean;
      punctual: boolean;
      seasonal: boolean;
      recurring: boolean;
    };
    churchTime: {
      enabled: boolean;
      minimumMonths: number;
    };
    positionLimit: {
      enabled: boolean;
      maxPositions: number;
    };
    eldersCount: {
      enabled: boolean;
      count: number;
    };
    classification: {
      enabled: boolean;
      frequente: boolean;
      naoFrequente: boolean;
      aResgatar: boolean;
    };
  };
  positions: string[];
  status: 'draft' | 'active' | 'completed';
}

const ALL_POSITIONS = [
  // ANCIÃOS / ANCIÃS / DIRETORES
  'Ancião/Anciã Teen',
  'Ancião/Anciã Jovem',
  'Primeiro Ancião(ã)',
  'Secretário(a)',
  'Secretário(a) Associado(a)',
  'Secretário(a) Teen',
  'Tesoureiro(a)',
  'Tesoureiro(a) Associado(a)',
  'Tesoureiro(a) Teen',
  'Patrimônio',

  // DIACONATO
  'Diáconos',
  'Diácono(s) Teen',
  'Diaconisas',
  'Diaconisa(s) Teen',
  'Primeiro Diácono',
  'Primeira Diaconisa',

  // MORDOMIA CRISTÃ
  'Diretor(a)',
  'Diretor(a) Associado(a)',
  'Discípulo Teen',

  // NOVAS GERAÇÕES
  'Ministério da Criança – Coordenador(a)',
  'Ministério da Criança – Coordenador(a) Associado(a)',
  'Ministério dos Adolescentes – Coordenador(a)',
  'Ministério dos Adolescentes – Coordenador(a) Associado(a)',
  'Ministério Jovem – Diretor(a)',
  'Ministério Jovem – Diretor(a) Associado(a)',
  'Clube de Aventureiros – Diretor(a)',
  'Clube de Aventureiros – Diretor(a) Associado(a)',
  'Clube de Aventureiros – Discípulo Teen',
  'Clube de Desbravadores – Diretor(a)',
  'Clube de Desbravadores – Diretor(a) Associado(a)',
  'Clube de Desbravadores – Discípulo Teen',

  // ESCOLA SABATINA
  'Professores(as) das Unidades: Bebês',
  'Professores(as) das Unidades: Iniciantes',
  'Professores(as) das Unidades: Infantis',
  'Professores(as) das Unidades: Primários',
  'Professores(as) das Unidades: Pré-adolescentes',
  'Professores(as) das Unidades: Adolescentes',
  'Secretário(a) Escola Sabatina',
  'Diretor(a) Associado(a) Escola Sabatina',
  'Discípulo Teen Escola Sabatina',

  // MINISTÉRIO PESSOAL E EVANGELISMO
  'Diretor(a) Ministério Pessoal',
  'Diretor(a) Associado(a) Ministério Pessoal',
  'Discípulo Teen Ministério Pessoal',
  'Evangelismo – Diretor(a)',
  'Evangelismo – Diretor(a) Associado(a)',
  'Evangelismo – Secretário(a)',
  'Evangelismo – Discípulo Teen',
  'Coordenador(a) de Classes Bíblicas',
  'Coordenador(a) de Amigos',

  // AÇÃO SOLIDÁRIA ADVENTISTA (ASA)
  'Diretor(a) ASA',
  'Diretor(a) Associado(a) ASA',
  'Discípulo Teen ASA',

  // MINISTÉRIO DA FAMÍLIA
  'Casal Diretor',
  'Casal Associado',
  'Discípulo Teen Ministério da Família',

  // MINISTÉRIO DA MULHER
  'Diretora Ministério da Mulher',
  'Diretora Associada Ministério da Mulher',
  'Discípulo Teen Ministério da Mulher',

  // MINISTÉRIO DA RECEPÇÃO
  'Líder Ministério da Recepção',
  'Equipe Ministério da Recepção',

  // MINISTÉRIO DO HOMEM
  'Diretor Ministério do Homem',
  'Diretor Associado Ministério do Homem',
  'Discípulo Teen Ministério do Homem',

  // MINISTÉRIO DA SAÚDE
  'Diretor(a) Ministério da Saúde',
  'Diretor(a) Associado(a) Ministério da Saúde',
  'Discípulo Teen Ministério da Saúde',

  // MINISTÉRIO DAS POSSIBILIDADES
  'Diretor(a) Ministério das Possibilidades',
  'Diretor(a) Associado(a) Ministério das Possibilidades',
  'Discípulo Teen Ministério das Possibilidades',

  // MINISTÉRIO DA MÚSICA
  'Diretor(a) Ministério da Música',
  'Diretor(a) Associado(a) Ministério da Música',
  'Discípulo Teen Ministério da Música',

  // COMUNICAÇÃO
  'Diretor(a) Comunicação',
  'Diretor(a) Associado(a) Comunicação',
  'Social Media (redes sociais)',
  'Discípulo Teen Comunicação',

  // SONOPLASTIA
  'Diretor(a) Sonoplastia',
  'Diretor(a) Associado(a) Sonoplastia',
  'Equipe Sonoplastia',
];

export default function ElectionConfig() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [churches, setChurches] = useState<Church[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [configExists, setConfigExists] = useState(false);
  const [editingConfigId, setEditingConfigId] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [eligibleCandidates, setEligibleCandidates] = useState<any[]>([]);
  const [ineligibleCandidates, setIneligibleCandidates] = useState<any[]>([]);
  const [removedCandidates, setRemovedCandidates] = useState<number[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [eligibleSearchTerm, setEligibleSearchTerm] = useState('');
  const [ineligibleSearchTerm, _setIneligibleSearchTerm] = useState('');
  const [config, setConfig] = useState<ElectionConfig>({
    churchId: 0,
    churchName: '',
    title: '',
    voters: [],
    criteria: {
      faithfulness: {
        enabled: true,
        punctual: true,
        seasonal: true,
        recurring: true,
      },
      attendance: {
        enabled: true,
        punctual: true,
        seasonal: true,
        recurring: true,
      },
      churchTime: {
        enabled: true,
        minimumMonths: 12,
      },
      positionLimit: {
        enabled: true,
        maxPositions: 2,
      },
      eldersCount: {
        enabled: true,
        count: 1,
      },
      classification: {
        enabled: true,
        frequente: true,
        naoFrequente: false,
        aResgatar: false,
      },
    },
    positions: [],
    status: 'draft',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Estados para gerenciamento de cargos personalizados
  const [customPositions, setCustomPositions] = useState<string[]>([]);
  const [positionDescriptions, setPositionDescriptions] = useState<{ [key: string]: string }>({});
  const [currentLeaders, setCurrentLeaders] = useState<{ [key: string]: number | null }>({});
  const [showAddPosition, setShowAddPosition] = useState(false);
  const [newPositionName, setNewPositionName] = useState('');
  const [editingPosition, setEditingPosition] = useState<string | null>(null);
  const [editingPositionName, setEditingPositionName] = useState('');
  const [editingDescription, setEditingDescription] = useState<string | null>(null);
  const [editingDescriptionText, setEditingDescriptionText] = useState('');

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const configIdParam = searchParams.get('id');
        const parsedConfigId = configIdParam ? parseInt(configIdParam, 10) : null;

        if (parsedConfigId && !Number.isNaN(parsedConfigId)) {
          setEditingConfigId(parsedConfigId);
          setIsEditing(true);
        } else {
          setEditingConfigId(null);
          setIsEditing(false);
        }

        await loadChurches();
        await loadMembers();
        await loadConfig(parsedConfigId ?? undefined);

        // Adicionar todos os cargos padrão como personalizados
        setCustomPositions(prev => {
          const allPositions = [...ALL_POSITIONS];
          const existingCustom = prev || [];
          const newPositions = allPositions.filter(pos => !existingCustom.includes(pos));
          return [...existingCustom, ...newPositions];
        });

        // Adicionar descrições padrão para cargos específicos
        setPositionDescriptions(prev => {
          const defaultDescriptions = {
            ...prev,
            'Secretário(a)': `Atribuições:
• Cuidar do sistema de gerenciamento de membros (ACMS);
• Criar e manter registro de membros e frequentadores;
• Formar, treinar e gerenciar uma equipe de secretaria;
• Preparar agenda e participar das reuniões de comissões da igreja;
• Preparar relatórios de acordo com a necessidade da administração da igreja e dos diversos ministérios;
• Entregar certificados das cerimônias (batismos e profissões de fé).`,

            'Tesoureiro(a)': `Atribuições:
• Receber todos os recursos financeiros, gerando os recibos e devidos relatórios;
• Preparar o orçamento anual e acompanhar os gastos dos ministérios;
• Prestar contas ao campo local no momento indicado para a auditoria anual;
• Efetuar os pagamentos autorizados pelo pastorado e/ou Subcomissão Administrativa;
• Formar, treinar e gerenciar uma equipe de tesouraria.`,

            'Diretor(a) ASA': `Atribuições:
• Desenvolver projetos que atendam e aliviem o sofrimento de pessoas em estado de vulnerabilidade em nosso bairro;
• Organizar recebimento e saídas de alimentos/roupas para famílias que necessitam de ajuda (sejam elas membros da Igreja ou amigos);
• Disponibilizar seu tempo durante a semana para atendimentos e distribuição de alimentos;
• Apoiar projetos sociais de outros ministérios da Igreja.`,

            'Diretor(a) Comunicação': `Atribuições:
• Elaboração de textos informativos e promoção de informações assertivas;
• Produção de artes para as divulgações de eventos e séries;
• Gerenciamento das redes sociais da igreja e site da igreja;
• Preservar e manter a imagem da Instituição;
• Preservar a identidade visual da igreja.`,

            'Primeiro Diácono': `Atribuições:
• Prover equipes de trabalho semanais por escala;
• Prover treinamento para o corpo de diáconos e diaconisas;
• Auxiliar nas cerimônias especiais da igreja;
• Participar da equipe de visitação da igreja.`,

            'Primeira Diaconisa': `Atribuições:
• Prover equipes de trabalho semanais por escala;
• Prover treinamento para o corpo de diáconos e diaconisas;
• Auxiliar nas cerimônias especiais da igreja;
• Participar da equipe de visitação da igreja.`,

            'Diretor(a) Associado(a) Escola Sabatina': `Atribuições:
• Recrutar, capacitar e gerenciar a equipe de professores;
• Em parceria com o ancionato, promover o pastoreio através das classes;
• Organizar a programação semanal da escola sabatina;
• Incentivar e promover o estudo e aquisição da lição (Projeto Maná).`,

            'Coordenador(a) de Amigos': `Atribuições:
• Manter atualizada a lista de amigos da igreja;
• Encaminhar novos amigos para os instrutores através do Ministério Pessoal;
• Gerenciar e atualizar periodicamente o progresso dos estudos bíblicos;
• Trabalhar em parceria com a Secretaria da Escola Sabatina e Secretaria da Igreja para atualizar os sistemas com as informações.`,

            'Ministério da Criança – Coordenador(a)': `Atribuições:
• Recrutar e gerenciar a equipe de professores;
• Dar suporte aos coordenadores que auxiliam nas áreas de coral, eventos e programações;
• Compra de materiais para o departamento e classes infantis;
• Trabalhar em parceria com a distrital para aplicar o programa da associação.`,

            'Casal Diretor': `Atribuições:
• Realizar reuniões de fortalecimento do casamento;
• Apresentar palestras sobre paternidade/maternidade e educação cristã sobre sexualidade;
• Fornecer orientações para evangelismo entre famílias;
• Oferecer aconselhamento familiar;
• Promover encontros de celebração e instrução para as famílias.
Normalmente é liderado pelo casal, apesar de apenas um nome ser indicado como líder.`,

            'Diretora Ministério da Mulher': `Atribuições:
• Organizar e planejar encontros espirituais e sociais com as mulheres da Igreja;
• Implementar o programa da associação (com adaptações, se necessário);
• Mobilizar as mulheres da igreja em diversas frentes missionárias.`,

            'Diretor(a) Ministério da Música': `Atribuições:
• Recrutar, capacitar e gerenciar voluntários com aptidões musicais variadas;
• Organizar repertório e equipes para o louvor congregacional;
• Promover encontros musicais e eventos;
• Recrutar e dar suporte aos diretores e regentes dos grupos vocais e instrumentais da igreja.`,

            'Líder Ministério da Recepção': `Atribuições:
• Recrutar, capacitar e gerenciar voluntários para equipe de recepção;
• Organizar equipes de atuação semanal;
• Perfil de pessoa que seja simpática, converse com empatia e gentileza;
• Orientar os visitantes.`,

            'Diretor(a) Ministério da Saúde': `Atribuições:
• Organizar o Clube Vida e Saúde;
• Organizar palestras de saúde (físico, mental, espiritual) que possam incentivar uma vida saudável para membros e amigos da Igreja;
• Planejar feiras de saúde e projetos evangelísticos nessa área;
• Auxiliar nos cursos de saúde que sejam promovidos pela Igreja.`,

            'Diretor(a) Ministério das Possibilidades': `Atribuições:
• Desenvolver atividades para o grupo de terceira idade da Igreja e amigos;
• Identificar e atender necessidades dessa faixa etária (enfermos, unções, visitas);
• Organizar equipe de visitação de idosos;
• Mobilizar visitas em asilos;
• Realizar viagens e excursões de idosos da Igreja.`,

            'Ministério dos Adolescentes – Coordenador(a)': `Atribuições:
• Motivar o grupo de adolescentes da Igreja a terem um encontro com Deus;
• Organizar as atividades da Escola Sabatina de adolescentes;
• Planejar atividades sociais e missionárias com adolescentes;
• Acompanhar os projetos realizados com Adolescentes por nossa Associação;
• Mobilizar adolescentes para que participem ativamente de outros ministérios da Igreja.`,

            'Ministério Jovem – Diretor(a)': `Atribuições:
• Planejar atividades voltadas para jovens;
• Organizar encontros sociais com a juventude da Igreja;
• Desenvolver novos jovens na liderança;
• Realizar encontros de pequenos grupos com jovens;
• Pastorear novos jovens vindos de outros estados e jovens universitários.`,

            'Diretor(a) Ministério Pessoal': `Atribuições:
• Envolver os membros através dos ministérios da Igreja e unidades de ação da Escola Sabatina nos projetos evangelísticos da Igreja;
• Identificar e capacitar membros que dão estudos bíblicos para atendimento de amigos levantados pela Coordenação de Amigos;
• Acompanhar junto com o Coordenador de Pequenos Grupos os pequenos grupos da Igreja;
• Em parceria com o Coordenador de Amigos, conectar amigos com instrutores bíblicos.`,

            'Diretor(a)': `Atribuições:
• Ter uma compreensão do ministério espiritual e financeiro da igreja;
• Promover encontros e eventos sobre mordomia cristã;
• Aplicar (ou adaptar, se necessário) os programas de mordomia denominacionais;
• Trabalhar em parceria com outros ministérios que auxiliam no crescimento espiritual e desenvolvimento dos dons.`,
          };
          return defaultDescriptions;
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const loadChurches = async () => {
    try {
      const response = await fetch('/api/churches', {
        headers: {
          'x-user-id': user?.id?.toString() || '',
          'Cache-Control': 'no-cache',
        },
      });
      if (response.ok) {
        const rawData = await response.json();
        // A API pode retornar { data: [] } ou array diretamente
        const data = Array.isArray(rawData) ? rawData : rawData?.data || [];
        setChurches(data);

        // Se o usuário não for super admin e tiver uma igreja, pré-selecionar ela
        if (data && data.length === 1 && user?.church) {
          const userChurch = data[0];
          setConfig(prev => ({
            ...prev,
            churchId: userChurch.id,
            churchName: userChurch.name,
          }));
        }
      } else {
        console.error('Erro ao carregar igrejas:', response.status);
        toast({
          title: 'Erro',
          description: 'Erro ao carregar lista de igrejas',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Erro ao carregar igrejas:', error);
      toast({
        title: 'Erro',
        description: 'Erro de conexão ao carregar igrejas',
        variant: 'destructive',
      });
    }
  };

  const loadMembers = async () => {
    try {
      const response = await fetch('/api/users', {
        headers: {
          'x-user-id': user?.id?.toString() || '',
          'Cache-Control': 'no-cache',
        },
      });
      if (response.ok) {
        const data = await response.json();
        // Filtrar apenas membros (incluindo status pending e approved)
        const membersOnly = (data || []).filter(
          (u: any) =>
            u.role &&
            u.role.includes('member') &&
            (u.status === 'approved' || u.status === 'pending')
        );
        setMembers(membersOnly);
      } else {
        console.error('Erro ao carregar membros:', response.status);
        toast({
          title: 'Erro',
          description: 'Erro ao carregar lista de membros',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Erro ao carregar membros:', error);
      toast({
        title: 'Erro',
        description: 'Erro de conexão ao carregar membros',
        variant: 'destructive',
      });
    }
  };

  const loadConfig = async (configId?: number) => {
    try {
      const query = configId ? `?id=${configId}` : '';
      const response = await fetch(`/api/elections/config${query}`, {
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
      });

      if (response.status === 404) {
        if (configId) {
          toast({
            title: 'Configuração não encontrada',
            description: 'Não foi possível localizar a configuração selecionada.',
            variant: 'destructive',
          });
          setEditingConfigId(null);
          setIsEditing(false);
        } else {
          console.log('Nenhuma configuração encontrada, usando padrões');
          setCustomPositions(ALL_POSITIONS);
          setPositionDescriptions({
            'Secretário(a)': `Atribuições:
• Cuidar do sistema de gerenciamento de membros (ACMS);
• Criar e manter registro de membros e frequentadores;
• Formar, treinar e gerenciar uma equipe de secretaria;
• Preparar agenda e participar das reuniões de comissões da igreja;
• Preparar relatórios de acordo com a necessidade da administração da igreja e dos diversos ministérios;
• Entregar certificados das cerimônias (batismos e profissões de fé).`,
          });
        }
        return;
      }

      if (response.ok) {
        const data = await response.json();
        console.log('Config carregada:', data);

        if (data.error) {
          console.log('Nenhuma configuração encontrada, usando padrões');
          return;
        }

        if (data && data.church_id) {
          const configWithDefaults = {
            id: data.id,
            churchId: data.church_id || 0,
            churchName: data.church_name || '',
            title: data.title || '',
            voters: data.voters || [],
            criteria: {
              faithfulness: {
                enabled: data.criteria?.faithfulness?.enabled ?? true,
                punctual: data.criteria?.faithfulness?.punctual ?? false,
                seasonal: data.criteria?.faithfulness?.seasonal ?? false,
                recurring: data.criteria?.faithfulness?.recurring ?? false,
              },
              attendance: {
                enabled: data.criteria?.attendance?.enabled ?? true,
                punctual: data.criteria?.attendance?.punctual ?? false,
                seasonal: data.criteria?.attendance?.seasonal ?? false,
                recurring: data.criteria?.attendance?.recurring ?? false,
              },
              churchTime: {
                enabled: data.criteria?.churchTime?.enabled ?? true,
                minimumMonths: data.criteria?.churchTime?.minimumMonths ?? 12,
              },
              positionLimit: {
                enabled: data.criteria?.positionLimit?.enabled ?? true,
                maxPositions: data.criteria?.positionLimit?.maxPositions ?? 2,
              },
              eldersCount: {
                enabled: data.criteria?.eldersCount?.enabled ?? true,
                count: data.criteria?.eldersCount?.count ?? 1,
              },
              classification: {
                enabled: data.criteria?.classification?.enabled ?? true,
                frequente: data.criteria?.classification?.frequente ?? true,
                naoFrequente: data.criteria?.classification?.naoFrequente ?? false,
                aResgatar: data.criteria?.classification?.aResgatar ?? false,
              },
            },
            positions: data.positions || [],
            status: data.status || 'draft',
          };
          setConfig(configWithDefaults);

          // Garantir que removed_candidates está parseado corretamente
          if (data.removed_candidates) {
            let parsedRemoved = data.removed_candidates;
            if (typeof parsedRemoved === 'string') {
              try {
                parsedRemoved = JSON.parse(parsedRemoved);
              } catch (_e) {
                parsedRemoved = [];
              }
            }
            if (!Array.isArray(parsedRemoved)) {
              parsedRemoved = [];
            }
            console.log('📥 [FRONTEND] Carregando removed_candidates:', parsedRemoved);
            setRemovedCandidates(parsedRemoved);
          } else {
            console.log('📥 [FRONTEND] Nenhum removed_candidates encontrado, inicializando vazio');
            setRemovedCandidates([]);
          }

          if (data.custom_positions) {
            setCustomPositions(data.custom_positions);
          }

          if (data.position_descriptions) {
            setPositionDescriptions(data.position_descriptions);
          }

          if (data.current_leaders) {
            setCurrentLeaders(data.current_leaders);
          }

          if ((!data.title || data.title.trim().length === 0) && data.church_name) {
            setConfig(prev => ({
              ...prev,
              title: `Nomeação ${data.church_name} - ${new Date().toLocaleDateString('pt-BR')}`,
            }));
          }

          if (configId) {
            setEditingConfigId(data.id);
            setIsEditing(true);
            setConfigExists(false);
          }
        }
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar configuração de eleição',
        variant: 'destructive',
      });
    }
  };

  const handleChurchChange = async (churchId: string) => {
    const church = churches.find(c => c.id?.toString() === churchId);
    if (church) {
      setConfig(prev => ({
        ...prev,
        churchId: church.id,
        churchName: church.name,
      }));

      // Verificar se já existe uma configuração para esta igreja
      try {
        const response = await fetch('/api/elections/configs', {
          headers: {
            'Cache-Control': 'no-cache',
            Pragma: 'no-cache',
          },
        });
        if (response.ok) {
          const rawConfigs = await response.json();
          const configs = Array.isArray(rawConfigs) ? rawConfigs : rawConfigs?.data || [];
          const _existingConfig = configs.find((c: any) => c.church_id === church.id);
          // Não bloquear o salvamento - permitir múltiplas configurações
          setConfigExists(false);
        }
      } catch (error) {
        console.error('Erro ao verificar configurações existentes:', error);
      }

      loadMembers();
    }
  };

  const handleVoterToggle = (memberId: number) => {
    setConfig(prev => ({
      ...prev,
      voters: (prev.voters || []).includes(memberId)
        ? (prev.voters || []).filter(id => id !== memberId)
        : [...(prev.voters || []), memberId],
    }));
  };

  const handleCriteriaChange = (field: string, value: any) => {
    setConfig(prev => {
      const newConfig = { ...prev };

      // Ensure criteria object exists
      if (!newConfig.criteria) {
        newConfig.criteria = {
          faithfulness: { enabled: true, punctual: true, seasonal: true, recurring: true },
          attendance: { enabled: true, punctual: true, seasonal: true, recurring: true },
          churchTime: { enabled: true, minimumMonths: 12 },
          positionLimit: { enabled: true, maxPositions: 2 },
          eldersCount: { enabled: true, count: 1 },
          classification: { enabled: true, frequente: true, naoFrequente: false, aResgatar: false },
        };
      }

      // Handle nested criteria updates
      if (field.includes('.')) {
        const [parent, child] = field.split('.');
        const criteriaAny = newConfig.criteria as Record<string, Record<string, unknown>>;
        if (!criteriaAny[parent]) {
          criteriaAny[parent] = {};
        }
        criteriaAny[parent][child] = value;
      } else {
        (newConfig.criteria as Record<string, unknown>)[field] = value;
      }

      return newConfig;
    });
  };

  const handlePositionToggle = (position: string) => {
    setConfig(prev => ({
      ...prev,
      positions: (prev.positions || []).includes(position)
        ? (prev.positions || []).filter(p => p !== position)
        : [...(prev.positions || []), position],
    }));
  };

  // Funções para gerenciamento de cargos personalizados
  const handleAddCustomPosition = () => {
    if (newPositionName.trim() && !customPositions.includes(newPositionName.trim())) {
      setCustomPositions(prev => [...prev, newPositionName.trim()]);
      setNewPositionName('');
      setShowAddPosition(false);
    }
  };

  const handleEditCustomPosition = (position: string) => {
    setEditingPosition(position);
    setEditingPositionName(position);
  };

  const handleSaveEditPosition = () => {
    if (
      editingPosition &&
      editingPositionName.trim() &&
      !customPositions.includes(editingPositionName.trim())
    ) {
      setCustomPositions(prev =>
        prev.map(p => (p === editingPosition ? editingPositionName.trim() : p))
      );
      setConfig(prev => ({
        ...prev,
        positions: prev.positions?.map(p =>
          p === editingPosition ? editingPositionName.trim() : p
        ),
      }));
      setEditingPosition(null);
      setEditingPositionName('');
    }
  };

  const handleDeleteCustomPosition = (position: string) => {
    setCustomPositions(prev => prev.filter(p => p !== position));
    setConfig(prev => ({
      ...prev,
      positions: prev.positions?.filter(p => p !== position),
    }));
  };

  const handleMovePositionUp = (position: string) => {
    const currentIndex = customPositions.indexOf(position);
    if (currentIndex > 0) {
      const newPositions = [...customPositions];
      [newPositions[currentIndex - 1], newPositions[currentIndex]] = [
        newPositions[currentIndex],
        newPositions[currentIndex - 1],
      ];
      setCustomPositions(newPositions);
      // Atualizar também a ordem em config.positions se o cargo estiver selecionado
      setConfig(prev => {
        const currentPositions = prev.positions || [];
        const positionIndex = currentPositions.indexOf(position);
        if (positionIndex > 0) {
          const newConfigPositions = [...currentPositions];
          [newConfigPositions[positionIndex - 1], newConfigPositions[positionIndex]] = [
            newConfigPositions[positionIndex],
            newConfigPositions[positionIndex - 1],
          ];
          return {
            ...prev,
            positions: newConfigPositions,
          };
        }
        return prev;
      });
    }
  };

  const handleMovePositionDown = (position: string) => {
    const currentIndex = customPositions.indexOf(position);
    if (currentIndex < customPositions.length - 1) {
      const newPositions = [...customPositions];
      [newPositions[currentIndex], newPositions[currentIndex + 1]] = [
        newPositions[currentIndex + 1],
        newPositions[currentIndex],
      ];
      setCustomPositions(newPositions);
      // Atualizar também a ordem em config.positions se o cargo estiver selecionado
      setConfig(prev => {
        const currentPositions = prev.positions || [];
        const positionIndex = currentPositions.indexOf(position);
        if (positionIndex >= 0 && positionIndex < currentPositions.length - 1) {
          const newConfigPositions = [...currentPositions];
          [newConfigPositions[positionIndex], newConfigPositions[positionIndex + 1]] = [
            newConfigPositions[positionIndex + 1],
            newConfigPositions[positionIndex],
          ];
          return {
            ...prev,
            positions: newConfigPositions,
          };
        }
        return prev;
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingPosition(null);
    setEditingPositionName('');
  };

  const handleCancelAdd = () => {
    setShowAddPosition(false);
    setNewPositionName('');
  };

  // Funções para gerenciamento de descrições
  const handleEditDescription = (position: string) => {
    setEditingDescription(position);
    setEditingDescriptionText(positionDescriptions[position] || '');
  };

  const handleSaveDescription = () => {
    if (editingDescription) {
      setPositionDescriptions(prev => ({
        ...prev,
        [editingDescription]: editingDescriptionText,
      }));
      setEditingDescription(null);
      setEditingDescriptionText('');
    }
  };

  const handleCancelDescriptionEdit = () => {
    setEditingDescription(null);
    setEditingDescriptionText('');
  };

  const handleSelectAllPositions = () => {
    setConfig(prev => ({
      ...prev,
      positions: [...customPositions],
    }));
  };

  const handleDeselectAllPositions = () => {
    setConfig(prev => ({
      ...prev,
      positions: [],
    }));
  };

  const handleAddIneligibleCandidate = (candidate: any) => {
    // Remove da lista de não elegíveis
    setIneligibleCandidates(prev => prev.filter(c => c.id !== candidate.id));
    // Adiciona na lista de elegíveis
    setEligibleCandidates(prev => [...prev, candidate]);
  };

  const handleRemoveEligibleCandidate = (candidate: any) => {
    setEligibleCandidates(prev => prev.filter(c => c.id !== candidate.id));
    setIneligibleCandidates(prev => {
      const alreadyExists = prev.some(c => c.id === candidate.id);
      return alreadyExists ? prev : [...prev, candidate];
    });
  };

  const loadEligibleCandidates = async () => {
    try {
      const response = await fetch('/api/users');

      if (response.ok) {
        const users = await response.json();

        // Filtrar membros da igreja selecionada
        const churchMembers = users.filter((user: any) => {
          const isAdmin = user.role === 'superadmin' || user.role === 'pastor';
          return (
            user.church === config.churchName &&
            (user.role?.includes('member') || isAdmin) &&
            (user.status === 'approved' || user.status === 'pending')
          );
        });

        console.log(
          `🔍 Encontrados ${churchMembers.length} membros na igreja ${config.churchName}`
        );

        // Filtrar candidatos baseado nos critérios
        const eligibleCandidates = [];
        const ineligibleCandidates = [];
        const now = new Date();

        for (const member of churchMembers) {
          let isEligible = true;
          const eligibilityReasons: string[] = [];

          // Dados de teste para Vagner (ID 2227)
          if (member.id === 2227) {
            member.extra_data = {
              dizimistaType: 'Pontual (1-3)',
              ofertanteType: 'Recorrente (8-13)',
              teveParticipacao: 'Recorrente (8-13/14)',
              tempoBatismoAnos: 5,
            };
          }

          console.log(`🔍 Analisando candidato ${member.name}:`, {
            extra_data_raw: member.extra_data,
            dizimistaType: member.extra_data?.dizimistaType,
            ofertanteType: member.extra_data?.ofertanteType,
            teveParticipacao: member.extra_data?.teveParticipacao,
            criteria: config.criteria,
          });

          // Critério de Fidelidade - usando a mesma lógica do UserDetailModal
          if (config.criteria?.faithfulness?.enabled) {
            let hasFaithfulness = false;
            const extraData =
              typeof member.extra_data === 'string'
                ? JSON.parse(member.extra_data || '{}')
                : member.extra_data || {};

            // Verificar dizimista - usando coluna direta
            const dizimistaType = member.dizimista_type;
            const isDizimista = member.is_donor || member.isDonor || dizimistaType;

            if (isDizimista) {
              console.log(`  📊 Verificando dizimista: ${dizimistaType}`);
              if (config.criteria.faithfulness.punctual && dizimistaType?.includes('Pontual')) {
                hasFaithfulness = true;
                console.log(`    ✅ Passou em Pontual`);
              }
              if (config.criteria.faithfulness.seasonal && dizimistaType?.includes('Sazonal')) {
                hasFaithfulness = true;
                console.log(`    ✅ Passou em Sazonal`);
              }
              if (config.criteria.faithfulness.recurring && dizimistaType?.includes('Recorrente')) {
                hasFaithfulness = true;
                console.log(`    ✅ Passou em Recorrente`);
              }
            }

            // Verificar ofertante - usando coluna direta
            if (!hasFaithfulness) {
              const ofertanteType = member.ofertante_type;
              const isOfertante = member.isOffering || ofertanteType;

              console.log(`  💰 Verificando ofertante: ${ofertanteType}`);
              if (isOfertante) {
                if (config.criteria.faithfulness.punctual && ofertanteType?.includes('Pontual')) {
                  hasFaithfulness = true;
                  console.log(`    ✅ Passou em Pontual (ofertante)`);
                }
                if (config.criteria.faithfulness.seasonal && ofertanteType?.includes('Sazonal')) {
                  hasFaithfulness = true;
                  console.log(`    ✅ Passou em Sazonal (ofertante)`);
                }
                if (
                  config.criteria.faithfulness.recurring &&
                  ofertanteType?.includes('Recorrente')
                ) {
                  hasFaithfulness = true;
                  console.log(`    ✅ Passou em Recorrente (ofertante)`);
                }
              }
            }

            console.log(`  🎯 Resultado fidelidade: ${hasFaithfulness}`);
            if (!hasFaithfulness) {
              isEligible = false;
              eligibilityReasons.push('Não atende aos critérios de fidelidade');
            }
          }

          // Critério de Presença - usando a mesma lógica do UserDetailModal
          if (config.criteria?.attendance?.enabled) {
            let hasAttendance = false;
            const extraData =
              typeof member.extra_data === 'string'
                ? JSON.parse(member.extra_data || '{}')
                : member.extra_data || {};

            // Verificar participação - exatamente como no UserDetailModal
            const teveParticipacao = extraData.teveParticipacao;

            console.log(`  📅 Verificando participação: ${teveParticipacao}`);
            if (teveParticipacao && teveParticipacao !== 'Não informado') {
              if (config.criteria.attendance.punctual && teveParticipacao.includes('Pontual')) {
                hasAttendance = true;
                console.log(`    ✅ Passou em Pontual (participação)`);
              }
              if (config.criteria.attendance.seasonal && teveParticipacao.includes('Sazonal')) {
                hasAttendance = true;
                console.log(`    ✅ Passou em Sazonal (participação)`);
              }
              if (config.criteria.attendance.recurring && teveParticipacao.includes('Recorrente')) {
                hasAttendance = true;
                console.log(`    ✅ Passou em Recorrente (participação)`);
              }
            }

            console.log(`  🎯 Resultado participação: ${hasAttendance}`);
            if (!hasAttendance) {
              isEligible = false;
              eligibilityReasons.push('Não atende aos critérios de presença');
            }
          }

          // Critério de Tempo na Igreja (baseado no tempo de batismo)
          if (config.criteria?.churchTime?.enabled) {
            const extraData =
              typeof member.extra_data === 'string'
                ? JSON.parse(member.extra_data || '{}')
                : member.extra_data || {};

            const tempoBatismoAnos = member.tempo_batismo_anos || 0;
            const minimumYears = Math.round((config.criteria.churchTime.minimumMonths || 12) / 12);

            if (tempoBatismoAnos < minimumYears) {
              isEligible = false;
              eligibilityReasons.push(
                `Tempo de batismo insuficiente (${tempoBatismoAnos} anos, mínimo: ${minimumYears} anos)`
              );
            }
          }

          // Critério de Classificação
          if (config.criteria?.classification?.enabled) {
            const memberClassification = (member.classificacao || '').toLowerCase();
            let hasValidClassification = false;

            console.log(
              `  📊 Verificando classificação para ${member.name}: ${memberClassification}`
            );

            if (config.criteria.classification.frequente && memberClassification === 'frequente') {
              hasValidClassification = true;
              console.log(`    ✅ Passou em Frequente`);
            }
            if (
              config.criteria.classification.naoFrequente &&
              memberClassification === 'não frequente'
            ) {
              hasValidClassification = true;
              console.log(`    ✅ Passou em Não Frequente`);
            }
            if (config.criteria.classification.aResgatar && memberClassification === 'a resgatar') {
              hasValidClassification = true;
              console.log(`    ✅ Passou em A Resgatar`);
            }

            console.log(`  🎯 Resultado classificação: ${hasValidClassification}`);
            if (!hasValidClassification) {
              isEligible = false;
              eligibilityReasons.push(
                `Classificação não atende aos critérios (${member.classificacao || 'não informado'})`
              );
            }
          }

          const extraData =
            typeof member.extra_data === 'string'
              ? JSON.parse(member.extra_data || '{}')
              : member.extra_data || {};

          const candidateData = {
            id: member.id,
            name: member.name,
            email: member.email,
            church: member.church,
            role: member.role,
            status: member.status,
            // Usando colunas diretas
            isTither: member.dizimista_type || (member.is_donor || member.isDonor ? 'Sim' : 'Não'),
            isDonor: member.ofertante_type || (member.isOffering ? 'Sim' : 'Não'),
            attendance: extraData.teveParticipacao || 'Não informado',
            classification: member.classificacao || 'Não informado',
            // Tempo baseado no batismo - usando coluna direta
            churchTime: member.tempo_batismo_anos
              ? `${member.tempo_batismo_anos} anos`
              : 'Não informado',
            churchTimeYears: member.tempo_batismo_anos || 0,
            extraData: member.extra_data,
            eligibilityReasons,
          };

          console.log(
            `  🏆 Resultado final: elegível=${isEligible}, motivos=${eligibilityReasons.join(', ')}`
          );

          if (isEligible) {
            eligibleCandidates.push(candidateData);
          } else {
            ineligibleCandidates.push(candidateData);
          }
        }

        setEligibleCandidates(eligibleCandidates);
        setIneligibleCandidates(ineligibleCandidates);
      } else {
        throw new Error('Erro ao carregar usuários');
      }
    } catch (error) {
      console.error('Erro ao carregar candidatos:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar candidatos elegíveis',
        variant: 'destructive',
      });
    } finally {
      setLoadingCandidates(false);
    }
  };

  const handleRemoveCandidate = (candidateId: number) => {
    setRemovedCandidates(prev => [...prev, candidateId]);
    toast({
      title: 'Candidato removido',
      description: 'O candidato foi removido da lista de elegíveis.',
    });
  };

  const handleAddCandidate = (candidateId: number) => {
    setRemovedCandidates(prev => prev.filter(id => id !== candidateId));
    toast({
      title: 'Candidato adicionado',
      description: 'O candidato foi adicionado à lista de elegíveis.',
    });
  };

  const canProceedToNextStep = () => {
    switch (currentStep) {
      case 1:
        return config.churchId && config.churchName;
      case 2:
        return config.voters && config.voters.length > 0;
      case 3:
        return true; // Critérios são opcionais
      case 4:
        return config.positions && config.positions.length > 0;
      case 5:
        return true; // Preview de candidatos
      default:
        return false;
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      // Validar dados antes de enviar
      if (!config.churchId || !config.churchName || config.positions.length === 0) {
        toast({
          title: 'Erro',
          description: 'Por favor, selecione uma igreja e pelo menos um cargo.',
          variant: 'destructive',
        });
        setSaving(false);
        return;
      }

      const normalizedTitle =
        config.title?.trim() ||
        `Nomeação ${config.churchName} - ${new Date().toLocaleDateString('pt-BR')}`;

      const payload = {
        ...config,
        title: normalizedTitle,
        custom_positions: customPositions,
        position_descriptions: positionDescriptions,
        current_leaders: currentLeaders,
        removed_candidates: removedCandidates,
      };

      console.log('🔧 [FRONTEND] Enviando configuração:', payload);
      console.log('🔧 [FRONTEND] removed_candidates a ser enviado:', removedCandidates);
      console.log('🔧 [FRONTEND] Quantidade de candidatos removidos:', removedCandidates.length);

      // CRÍTICO: Se estamos criando uma nova nomeação (não é edição), não usar ID antigo
      const targetConfigId = isEditing ? (config.id ?? editingConfigId ?? undefined) : undefined;
      const isUpdate = Boolean(targetConfigId);
      const endpoint = isUpdate
        ? `/api/elections/config/${targetConfigId}`
        : '/api/elections/config';
      const method = isUpdate ? 'PUT' : 'POST';

      console.log('📝 Modo de salvamento:', {
        isEditing,
        targetConfigId,
        isUpdate,
        method,
        endpoint,
      });

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        if (isUpdate) {
          let responseData: any = null;
          try {
            responseData = await response.json();
          } catch (_parseError) {
            responseData = null;
          }

          if (targetConfigId) {
            await loadConfig(targetConfigId);
          }

          toast({
            title: 'Alterações salvas',
            description: responseData?.message || 'Configuração atualizada com sucesso.',
          });
        } else {
          const data = await response.json();
          setConfigExists(true);
          setConfig(prev => ({ ...prev, id: data.id }));
          toast({
            title: 'Configuração salva',
            description: 'Os parâmetros da nomeação foram salvos com sucesso.',
          });
          setCurrentStep(2); // Avança para o próximo passo
        }
      } else {
        const errorData = await response.json();
        console.error('❌ Erro na resposta:', errorData);
        throw new Error(errorData.error || 'Erro ao salvar configuração');
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar a configuração.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const startElection = async () => {
    if (!config.voters || config.voters.length === 0) {
      toast({
        title: 'Erro',
        description: 'Selecione pelo menos um votante.',
        variant: 'destructive',
      });
      return;
    }

    if (!config.positions || config.positions.length === 0) {
      toast({
        title: 'Erro',
        description: 'Selecione pelo menos um cargo.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/elections/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
        body: JSON.stringify({
          ...config,
          configId: config.id,
        }),
      });

      if (response.ok) {
        setConfig(prev => ({ ...prev, status: 'active' }));
        toast({
          title: 'Eleição iniciada',
          description:
            'A eleição foi iniciada com sucesso. Os votantes já podem acessar a página de votação.',
        });
      } else {
        throw new Error('Erro ao iniciar eleição');
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível iniciar a eleição.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredMembers = members.filter(member => {
    const matchesChurch = member.church === config.churchName || config.churchName === '';
    const matchesSearch =
      searchTerm === '' ||
      member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesChurch && matchesSearch;
  });

  const selectedVoters = members.filter(member => config.voters?.includes(member.id) || false);

  const filteredEligibleCandidates = useMemo(() => {
    // Primeiro, filtrar candidatos removidos manualmente
    const activeEligible = eligibleCandidates.filter(
      candidate => !removedCandidates.includes(candidate.id)
    );

    const term = eligibleSearchTerm.trim().toLowerCase();
    if (!term) {
      return activeEligible;
    }

    return activeEligible.filter(candidate => {
      const name = candidate?.name?.toLowerCase() ?? '';
      const email = candidate?.email?.toLowerCase() ?? '';
      const role = candidate?.role?.toLowerCase() ?? '';
      return name.includes(term) || email.includes(term) || role.includes(term);
    });
  }, [eligibleCandidates, eligibleSearchTerm, removedCandidates]);

  const filteredIneligibleCandidates = useMemo(() => {
    const term = ineligibleSearchTerm.trim().toLowerCase();
    if (!term) {
      return ineligibleCandidates;
    }

    return ineligibleCandidates.filter(candidate => {
      const name = candidate?.name?.toLowerCase() ?? '';
      const email = candidate?.email?.toLowerCase() ?? '';
      const role = candidate?.role?.toLowerCase() ?? '';
      return name.includes(term) || email.includes(term) || role.includes(term);
    });
  }, [ineligibleCandidates, ineligibleSearchTerm]);

  if (loading) {
    return (
      <MobileLayout>
        <div className="p-4 text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold mb-2">Carregando...</h2>
          <p className="text-muted-foreground">Preparando configuração de eleição</p>
        </div>
      </MobileLayout>
    );
  }

  // Verificar se o usuário tem permissão para acessar a configuração de eleição
  const canAccessElectionConfig =
    hasAdminAccess(user) ||
    user?.email?.includes('admin') ||
    user?.name?.toLowerCase().includes('admin') ||
    user?.name?.toLowerCase().includes('pastor');

  if (!canAccessElectionConfig) {
    return (
      <MobileLayout>
        <div className="p-4 text-center">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Acesso Restrito</h2>
          <p className="text-muted-foreground">Apenas administradores podem configurar eleições.</p>
          <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-left">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              <strong>Usuário atual:</strong>
              <br />
              Nome: {user?.name || 'N/A'}
              <br />
              Email: {user?.email || 'N/A'}
              <br />
              Role: {user?.role || 'N/A'}
            </p>
          </div>
        </div>
      </MobileLayout>
    );
  }

  const handleNewNomination = () => {
    // Limpa TODOS os estados para criar uma nova nomeação do zero
    setEditingConfigId(null);
    setIsEditing(false);
    setConfig({
      churchId: 0,
      churchName: '',
      title: `Nomeação ${new Date().getFullYear()} - ${new Date().toLocaleDateString('pt-BR')}`,
      voters: [],
      criteria: {
        faithfulness: {
          enabled: true,
          punctual: true,
          seasonal: true,
          recurring: true,
        },
        attendance: {
          enabled: true,
          punctual: true,
          seasonal: true,
          recurring: true,
        },
        churchTime: {
          enabled: true,
          minimumMonths: 12,
        },
        positionLimit: {
          enabled: true,
          maxPositions: 2,
        },
        eldersCount: {
          enabled: true,
          count: 1,
        },
        classification: {
          enabled: true,
          frequente: true,
          naoFrequente: false,
          aResgatar: false,
        },
      },
      positions: [],
      status: 'draft',
    });
    setCurrentStep(1);
    setConfigExists(false);
    setEligibleCandidates([]);
    setIneligibleCandidates([]);

    // Limpa URL
    window.history.pushState({}, '', '/election-config');

    toast({
      title: 'Nova Nomeação',
      description: 'Iniciando configuração de nova nomeação',
    });
  };

  return (
    <MobileLayout>
      <div className="p-3 sm:p-4 space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <Settings className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 flex-shrink-0" />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-2xl font-bold">Configuração de Nomeações</h1>
                {config.title && config.title.trim().length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {config.title}
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground">
                Configure os parâmetros da nomeação de liderança
              </p>
            </div>
          </div>

          {/* Botão Nova Nomeação */}
          <Button
            variant="default"
            size="sm"
            onClick={handleNewNomination}
            className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Nomeação
          </Button>
        </div>

        {/* Indicador de Passos */}
        <div className="flex items-center justify-center space-x-1 sm:space-x-4 mb-4 sm:mb-6 overflow-x-auto pb-2">
          {[1, 2, 3, 4, 5].map(step => (
            <div key={step} className="flex items-center flex-shrink-0">
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium ${
                  currentStep >= step
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                }`}
              >
                {step}
              </div>
              <span
                className={`hidden sm:block ml-2 text-sm font-medium ${
                  currentStep >= step ? 'text-blue-600' : 'text-gray-500'
                }`}
              >
                {step === 1 && 'Igreja'}
                {step === 2 && 'Votantes'}
                {step === 3 && 'Critérios'}
                {step === 4 && 'Cargos'}
                {step === 5 && 'Candidatos'}
              </span>
              {step < 5 && (
                <div
                  className={`w-4 sm:w-8 h-0.5 mx-1 sm:mx-2 ${currentStep > step ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Indicador de Modo (Edição ou Criação) */}
        {isEditing ? (
          <Alert className="mb-4 border-blue-500 bg-blue-50">
            <Edit className="h-4 w-4 text-blue-600" />
            <AlertDescription>
              <strong>Modo Edição</strong> - Você está editando a nomeação ID #{editingConfigId}.
              Clique em "Nova Nomeação" para criar uma nova configuração do zero.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="mb-4 border-green-500 bg-green-50">
            <Plus className="h-4 w-4 text-green-600" />
            <AlertDescription>
              <strong>Modo Criação</strong> - Você está criando uma nova nomeação. Todas as
              alterações serão salvas como uma nova configuração.
            </AlertDescription>
          </Alert>
        )}

        {/* Alerta de Configuração Existente */}
        {configExists && (
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Configuração já existe!</strong> Já existe uma configuração para esta igreja.
              Você pode editar a configuração existente ou criar uma nova.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Church className="h-5 w-5" />
                  Seleção da Igreja
                </CardTitle>
                <CardDescription>
                  Selecione qual igreja será feita a eleição de liderança
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nomination-title">Nome da Nomeação</Label>
                  <Input
                    id="nomination-title"
                    type="text"
                    placeholder="Ex.: Nomeação 2025 - Comissão de Nomeações"
                    value={config.title || ''}
                    onChange={e => setConfig(prev => ({ ...prev, title: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Defina um nome para identificar esta nomeação. Útil quando houver várias
                    nomeações para a mesma igreja.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="church">Igreja</Label>
                  <Select
                    value={config.churchId?.toString() || ''}
                    onValueChange={handleChurchChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma igreja" />
                    </SelectTrigger>
                    <SelectContent>
                      {churches.map(church => (
                        <SelectItem key={church.id} value={church.id?.toString() || ''}>
                          {church.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {config.churchName && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      Eleição será realizada na igreja: <strong>{config.churchName}</strong>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Seleção de Votantes
                </CardTitle>
                <CardDescription>
                  Selecione quais membros da igreja "{config.churchName || 'Selecione uma igreja'}"
                  poderão votar na eleição
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!config.churchId ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Selecione uma igreja na aba "Configuração Básica" para visualizar os membros
                      disponíveis.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <>
                    {/* Barra de Busca */}
                    <div className="space-y-2">
                      <Label htmlFor="voter-search">Buscar membros</Label>
                      <Input
                        id="voter-search"
                        type="text"
                        placeholder="Digite o nome ou email do membro para pesquisar..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full"
                      />
                    </div>

                    {/* Contadores */}
                    <div className="flex justify-between items-center text-sm text-muted-foreground">
                      <span>{filteredMembers.length} membro(s) encontrado(s)</span>
                      <span>{selectedVoters.length} votante(s) selecionado(s)</span>
                    </div>

                    {/* Lista de Membros */}
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {filteredMembers.map(member => (
                        <div
                          key={member.id}
                          className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <Checkbox
                            id={`voter-${member.id}`}
                            checked={config.voters?.includes(member.id) || false}
                            onCheckedChange={() => handleVoterToggle(member.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <div className="flex flex-col min-w-0 flex-1">
                                <span className="font-medium text-sm truncate">{member.name}</span>
                                <span className="text-xs text-muted-foreground truncate">
                                  {member.email}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 ml-2">
                                <Badge variant="secondary" className="text-xs">
                                  {member.role}
                                </Badge>
                                <Badge
                                  variant={member.status === 'approved' ? 'default' : 'outline'}
                                  className="text-xs"
                                >
                                  {member.status === 'approved' ? 'Ativo' : 'Pendente'}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {member.church}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {filteredMembers.length === 0 && searchTerm && (
                      <div className="text-center py-8">
                        <div className="text-muted-foreground mb-2">
                          <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>Nenhum membro encontrado para "{searchTerm}"</p>
                          <p className="text-xs mt-1">Tente usar um termo de busca diferente</p>
                        </div>
                      </div>
                    )}

                    {filteredMembers.length === 0 && !searchTerm && (
                      <div className="text-center py-8">
                        <div className="text-muted-foreground mb-2">
                          <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>Nenhum membro encontrado para a igreja "{config.churchName}"</p>
                          <p className="text-xs mt-1">
                            Verifique se a igreja foi selecionada corretamente
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Ações Rápidas */}
                    {filteredMembers.length > 0 && (
                      <div className="flex gap-2 pt-4 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const allMemberIds = filteredMembers.map(m => m.id);
                            setConfig(prev => ({
                              ...prev,
                              voters: allMemberIds,
                            }));
                          }}
                          className="flex-1"
                        >
                          Selecionar Todos
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setConfig(prev => ({
                              ...prev,
                              voters: [],
                            }));
                          }}
                          className="flex-1"
                        >
                          Limpar Seleção
                        </Button>
                      </div>
                    )}

                    {/* Votantes Selecionados */}
                    {selectedVoters.length > 0 && (
                      <div className="space-y-2">
                        <Label>Votantes selecionados ({selectedVoters.length})</Label>
                        <div className="flex flex-wrap gap-2">
                          {selectedVoters.map(voter => (
                            <Badge
                              key={voter.id}
                              variant="secondary"
                              className="flex items-center gap-1"
                            >
                              <UserCheck className="h-3 w-3" />
                              {voter.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {currentStep === 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Critérios de Candidatos
                </CardTitle>
                <CardDescription>
                  Defina os critérios que os candidatos devem atender
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-6">
                  {/* Fidelidade nos Dízimos e Ofertas */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="faithfulness-enabled"
                          checked={config.criteria?.faithfulness?.enabled || false}
                          onCheckedChange={checked =>
                            handleCriteriaChange('faithfulness.enabled', checked)
                          }
                        />
                        <Label htmlFor="faithfulness-enabled" className="cursor-pointer">
                          Fidelidade nos dízimos e ofertas
                        </Label>
                      </div>
                    </div>

                    {config.criteria?.faithfulness?.enabled && (
                      <div className="ml-6 space-y-4">
                        <div className="space-y-3">
                          <Label className="text-sm font-medium">
                            Tipos de fidelidade obrigatórios:
                          </Label>

                          {/* Campo inline para Pontual */}
                          <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                <span className="text-xs font-bold text-blue-600">P</span>
                              </div>
                              <div>
                                <Label className="font-medium text-sm">Pontual</Label>
                                <p className="text-xs text-muted-foreground">
                                  Dízimos pagos no prazo
                                </p>
                              </div>
                            </div>
                            <Checkbox
                              id="punctual"
                              checked={config.criteria?.faithfulness?.punctual || false}
                              onCheckedChange={checked =>
                                handleCriteriaChange('faithfulness.punctual', checked)
                              }
                            />
                          </div>

                          {/* Campo inline para Sazonal */}
                          <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                                <span className="text-xs font-bold text-green-600">S</span>
                              </div>
                              <div>
                                <Label className="font-medium text-sm">Sazonal</Label>
                                <p className="text-xs text-muted-foreground">
                                  Ofertas especiais e campanhas
                                </p>
                              </div>
                            </div>
                            <Checkbox
                              id="seasonal"
                              checked={config.criteria?.faithfulness?.seasonal || false}
                              onCheckedChange={checked =>
                                handleCriteriaChange('faithfulness.seasonal', checked)
                              }
                            />
                          </div>

                          {/* Campo inline para Recorrente */}
                          <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                                <span className="text-xs font-bold text-purple-600">R</span>
                              </div>
                              <div>
                                <Label className="font-medium text-sm">Recorrente</Label>
                                <p className="text-xs text-muted-foreground">
                                  Contribuições regulares
                                </p>
                              </div>
                            </div>
                            <Checkbox
                              id="recurring"
                              checked={config.criteria?.faithfulness?.recurring || false}
                              onCheckedChange={checked =>
                                handleCriteriaChange('faithfulness.recurring', checked)
                              }
                            />
                          </div>
                        </div>

                        {/* Resumo dos critérios selecionados */}
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-center space-x-2 mb-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <Label className="text-sm font-medium text-blue-800">
                              Critérios Ativos:
                            </Label>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {config.criteria?.faithfulness?.punctual && (
                              <Badge
                                variant="secondary"
                                className="text-xs bg-blue-100 text-blue-700"
                              >
                                Pontual
                              </Badge>
                            )}
                            {config.criteria?.faithfulness?.seasonal && (
                              <Badge
                                variant="secondary"
                                className="text-xs bg-green-100 text-green-700"
                              >
                                Sazonal
                              </Badge>
                            )}
                            {config.criteria?.faithfulness?.recurring && (
                              <Badge
                                variant="secondary"
                                className="text-xs bg-purple-100 text-purple-700"
                              >
                                Recorrente
                              </Badge>
                            )}
                            {!config.criteria?.faithfulness?.punctual &&
                              !config.criteria?.faithfulness?.seasonal &&
                              !config.criteria?.faithfulness?.recurring && (
                                <span className="text-xs text-muted-foreground">
                                  Nenhum critério selecionado
                                </span>
                              )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Presença Regular */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="attendance-enabled"
                        checked={config.criteria?.attendance?.enabled || false}
                        onCheckedChange={checked =>
                          handleCriteriaChange('attendance.enabled', checked)
                        }
                      />
                      <Label htmlFor="attendance-enabled" className="cursor-pointer">
                        Presença regular (teveParticipacao)
                      </Label>
                    </div>

                    {config.criteria?.attendance?.enabled && (
                      <div className="ml-6 space-y-3">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">
                            Tipos de participação aceitos:
                          </Label>

                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="attendance-punctual"
                              checked={config.criteria?.attendance?.punctual || false}
                              onCheckedChange={checked =>
                                handleCriteriaChange('attendance.punctual', checked)
                              }
                            />
                            <Label htmlFor="attendance-punctual" className="cursor-pointer text-sm">
                              Pontual (Recorrente)
                            </Label>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="attendance-seasonal"
                              checked={config.criteria?.attendance?.seasonal || false}
                              onCheckedChange={checked =>
                                handleCriteriaChange('attendance.seasonal', checked)
                              }
                            />
                            <Label htmlFor="attendance-seasonal" className="cursor-pointer text-sm">
                              Sazonal (Sazonal + Recorrente)
                            </Label>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="attendance-recurring"
                              checked={config.criteria?.attendance?.recurring || false}
                              onCheckedChange={checked =>
                                handleCriteriaChange('attendance.recurring', checked)
                              }
                            />
                            <Label
                              htmlFor="attendance-recurring"
                              className="cursor-pointer text-sm"
                            >
                              Recorrente (apenas Recorrente)
                            </Label>
                          </div>
                        </div>

                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription className="text-xs">
                            <strong>Critérios de participação:</strong>
                            <br />• <strong>Pontual:</strong> Apenas membros com participação
                            "Recorrente"
                            <br />• <strong>Sazonal:</strong> Membros com participação "Sazonal" ou
                            "Recorrente"
                            <br />• <strong>Recorrente:</strong> Apenas membros com participação
                            "Recorrente"
                            <br />• <strong>Exclusão:</strong> Membros com "Sem participação" são
                            automaticamente excluídos
                          </AlertDescription>
                        </Alert>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Tempo Mínimo de Igreja */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="church-time-enabled"
                        checked={config.criteria?.churchTime?.enabled || false}
                        onCheckedChange={checked =>
                          handleCriteriaChange('churchTime.enabled', checked)
                        }
                      />
                      <Label htmlFor="church-time-enabled" className="cursor-pointer">
                        Tempo mínimo de batismo
                      </Label>
                    </div>

                    {config.criteria?.churchTime?.enabled && (
                      <div className="ml-6 space-y-2">
                        <Label htmlFor="minimumYears">Tempo mínimo em anos</Label>
                        <Input
                          id="minimumYears"
                          type="number"
                          min="1"
                          max="50"
                          value={Math.round(
                            (config.criteria?.churchTime?.minimumMonths || 12) / 12
                          )}
                          onChange={e =>
                            handleCriteriaChange(
                              'churchTime.minimumMonths',
                              (parseInt(e.target.value) || 1) * 12
                            )
                          }
                        />
                        <p className="text-sm text-muted-foreground">
                          Membros com menos de{' '}
                          {Math.round((config.criteria?.churchTime?.minimumMonths || 12) / 12)} anos
                          de batismo não poderão ser candidatos
                        </p>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Classificação do Membro */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="classification-enabled"
                          checked={config.criteria?.classification?.enabled || false}
                          onCheckedChange={checked =>
                            handleCriteriaChange('classification.enabled', checked)
                          }
                        />
                        <Label htmlFor="classification-enabled" className="cursor-pointer">
                          Classificação do Membro
                        </Label>
                      </div>
                    </div>

                    {config.criteria?.classification?.enabled && (
                      <div className="ml-6 space-y-4">
                        <div className="space-y-3">
                          <Label className="text-sm font-medium">
                            Tipos de classificação aceitos:
                          </Label>

                          {/* Campo inline para Frequente */}
                          <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                                <span className="text-xs font-bold text-green-600">F</span>
                              </div>
                              <div>
                                <Label className="font-medium text-sm">Frequente</Label>
                                <p className="text-xs text-muted-foreground">
                                  Membros com participação regular
                                </p>
                              </div>
                            </div>
                            <Checkbox
                              id="classification-frequente"
                              checked={config.criteria?.classification?.frequente || false}
                              onCheckedChange={checked =>
                                handleCriteriaChange('classification.frequente', checked)
                              }
                            />
                          </div>

                          {/* Campo inline para Não Frequente */}
                          <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                                <span className="text-xs font-bold text-orange-600">N</span>
                              </div>
                              <div>
                                <Label className="font-medium text-sm">Não Frequente</Label>
                                <p className="text-xs text-muted-foreground">
                                  Membros com baixa participação
                                </p>
                              </div>
                            </div>
                            <Checkbox
                              id="classification-naoFrequente"
                              checked={config.criteria?.classification?.naoFrequente || false}
                              onCheckedChange={checked =>
                                handleCriteriaChange('classification.naoFrequente', checked)
                              }
                            />
                          </div>

                          {/* Campo inline para A Resgatar */}
                          <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                                <span className="text-xs font-bold text-red-600">R</span>
                              </div>
                              <div>
                                <Label className="font-medium text-sm">A Resgatar</Label>
                                <p className="text-xs text-muted-foreground">
                                  Membros inativos/afastados
                                </p>
                              </div>
                            </div>
                            <Checkbox
                              id="classification-aResgatar"
                              checked={config.criteria?.classification?.aResgatar || false}
                              onCheckedChange={checked =>
                                handleCriteriaChange('classification.aResgatar', checked)
                              }
                            />
                          </div>
                        </div>

                        {/* Resumo dos critérios selecionados */}
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-center space-x-2 mb-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <Label className="text-sm font-medium text-blue-800">
                              Critérios Ativos:
                            </Label>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {config.criteria?.classification?.frequente && (
                              <Badge
                                variant="secondary"
                                className="text-xs bg-green-100 text-green-700"
                              >
                                Frequente
                              </Badge>
                            )}
                            {config.criteria?.classification?.naoFrequente && (
                              <Badge
                                variant="secondary"
                                className="text-xs bg-orange-100 text-orange-700"
                              >
                                Não Frequente
                              </Badge>
                            )}
                            {config.criteria?.classification?.aResgatar && (
                              <Badge
                                variant="secondary"
                                className="text-xs bg-red-100 text-red-700"
                              >
                                A Resgatar
                              </Badge>
                            )}
                            {!config.criteria?.classification?.frequente &&
                              !config.criteria?.classification?.naoFrequente &&
                              !config.criteria?.classification?.aResgatar && (
                                <span className="text-xs text-muted-foreground">
                                  Nenhum critério selecionado
                                </span>
                              )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Limite de Cargos por Pessoa */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="position-limit-enabled"
                        checked={config.criteria?.positionLimit?.enabled || false}
                        onCheckedChange={checked =>
                          handleCriteriaChange('positionLimit.enabled', checked)
                        }
                      />
                      <Label htmlFor="position-limit-enabled" className="cursor-pointer">
                        Limite de cargos por pessoa
                      </Label>
                    </div>

                    {config.criteria?.positionLimit?.enabled && (
                      <div className="ml-6 space-y-2">
                        <Label htmlFor="maxPositions">Máximo de cargos por pessoa</Label>
                        <Input
                          id="maxPositions"
                          type="number"
                          min="1"
                          max="4"
                          value={config.criteria?.positionLimit?.maxPositions || 2}
                          onChange={e =>
                            handleCriteriaChange(
                              'positionLimit.maxPositions',
                              parseInt(e.target.value)
                            )
                          }
                        />
                        <p className="text-sm text-muted-foreground">
                          Uma pessoa pode ser eleita para no máximo{' '}
                          {config.criteria?.positionLimit?.maxPositions || 2} cargo(s)
                        </p>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Quantidade de Anciãos */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="elders-count-enabled"
                        checked={config.criteria?.eldersCount?.enabled || false}
                        onCheckedChange={checked =>
                          handleCriteriaChange('eldersCount.enabled', checked)
                        }
                      />
                      <Label htmlFor="elders-count-enabled" className="cursor-pointer">
                        Quantidade de anciãos a serem eleitos
                      </Label>
                    </div>

                    {config.criteria?.eldersCount?.enabled && (
                      <div className="ml-6 space-y-2">
                        <Label htmlFor="eldersCount">Número de anciãos</Label>
                        <Input
                          id="eldersCount"
                          type="number"
                          min="1"
                          max="10"
                          value={config.criteria?.eldersCount?.count || 1}
                          onChange={e =>
                            handleCriteriaChange('eldersCount.count', parseInt(e.target.value))
                          }
                        />
                        <p className="text-sm text-muted-foreground">
                          Serão eleitos {config.criteria?.eldersCount?.count || 1} ancião(s) para a
                          igreja
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 4 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Vote className="h-5 w-5" />
                  Cargos para Eleição
                </CardTitle>
                <CardDescription>
                  Gerencie todos os cargos disponíveis para eleição. Você pode adicionar, editar e
                  excluir cargos conforme necessário.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* CARGOS PERSONALIZADOS */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                      <h3 className="font-semibold text-orange-700">TODOS OS CARGOS</h3>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAddPosition(true)}
                      className="h-8 px-3"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Adicionar
                    </Button>
                  </div>

                  {/* Formulário para adicionar novo cargo */}
                  {showAddPosition && (
                    <div className="ml-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="Nome do cargo"
                          value={newPositionName}
                          onChange={e => setNewPositionName(e.target.value)}
                          className="flex-1"
                          onKeyPress={e => e.key === 'Enter' && handleAddCustomPosition()}
                        />
                        <Button
                          size="sm"
                          onClick={handleAddCustomPosition}
                          disabled={!newPositionName.trim()}
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleCancelAdd}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Tabela de cargos personalizados */}
                  <div className="ml-4">
                    {customPositions.length === 0 && !showAddPosition ? (
                      <div className="text-sm text-muted-foreground text-center py-4">
                        Nenhum cargo disponível
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="border-b border-orange-200">
                              <th className="text-left p-2 text-xs font-medium text-orange-700">
                                Selecionar
                              </th>
                              <th className="text-left p-2 text-xs font-medium text-orange-700">
                                Departamento/Ministério
                              </th>
                              <th className="text-left p-2 text-xs font-medium text-orange-700">
                                Descrição/Atribuições
                              </th>
                              <th className="text-left p-2 text-xs font-medium text-orange-700">
                                Líder Atual
                              </th>
                              <th className="text-left p-2 text-xs font-medium text-orange-700">
                                Ações
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {customPositions.map((position, index) => (
                              <tr
                                key={position}
                                className="border-b border-orange-100 hover:bg-orange-25"
                              >
                                <td className="p-2">
                                  <Checkbox
                                    id={`custom-position-${position}`}
                                    checked={(config.positions || []).includes(position)}
                                    onCheckedChange={() => handlePositionToggle(position)}
                                  />
                                </td>
                                <td className="p-2">
                                  {editingPosition === position ? (
                                    <div className="flex items-center gap-2">
                                      <Input
                                        value={editingPositionName}
                                        onChange={e => setEditingPositionName(e.target.value)}
                                        className="flex-1 text-sm"
                                        onKeyPress={e =>
                                          e.key === 'Enter' && handleSaveEditPosition()
                                        }
                                      />
                                      <Button
                                        size="sm"
                                        onClick={handleSaveEditPosition}
                                        disabled={!editingPositionName.trim()}
                                        className="h-6 w-6 p-0"
                                      >
                                        <Save className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={handleCancelEdit}
                                        className="h-6 w-6 p-0"
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <Label
                                      htmlFor={`custom-position-${position}`}
                                      className="cursor-pointer text-sm font-medium"
                                    >
                                      {position}
                                    </Label>
                                  )}
                                </td>
                                <td className="p-2">
                                  {editingDescription === position ? (
                                    <div className="space-y-2">
                                      <textarea
                                        value={editingDescriptionText}
                                        onChange={e => setEditingDescriptionText(e.target.value)}
                                        className="w-full min-h-[60px] p-2 text-xs border rounded-md resize-none"
                                        placeholder="Digite as atribuições e responsabilidades deste cargo..."
                                      />
                                      <div className="flex gap-1">
                                        <Button
                                          size="sm"
                                          onClick={handleSaveDescription}
                                          className="h-6 w-6 p-0"
                                        >
                                          <Save className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={handleCancelDescriptionEdit}
                                          className="h-6 w-6 p-0"
                                        >
                                          <X className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="space-y-1">
                                      {positionDescriptions[position] ? (
                                        <div className="text-xs text-gray-700 dark:text-gray-300 bg-white/50 dark:bg-gray-800/50 rounded p-2 border max-h-20 overflow-y-auto">
                                          {positionDescriptions[position]}
                                        </div>
                                      ) : (
                                        <div className="text-xs text-muted-foreground italic">
                                          Nenhuma descrição adicionada
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </td>
                                <td className="p-2">
                                  <Select
                                    value={currentLeaders[position]?.toString() || undefined}
                                    onValueChange={value => {
                                      if (value === 'none') {
                                        setCurrentLeaders(prev => ({
                                          ...prev,
                                          [position]: null,
                                        }));
                                      } else {
                                        setCurrentLeaders(prev => ({
                                          ...prev,
                                          [position]: value ? parseInt(value) : null,
                                        }));
                                      }
                                    }}
                                  >
                                    <SelectTrigger className="h-8 text-xs w-full">
                                      <SelectValue placeholder="Selecione o líder atual" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none">Nenhum</SelectItem>
                                      {members
                                        .filter(member => member.church === config.churchName)
                                        .sort((a, b) => a.name.localeCompare(b.name))
                                        .map(member => (
                                          <SelectItem key={member.id} value={member.id.toString()}>
                                            {member.name}
                                          </SelectItem>
                                        ))}
                                    </SelectContent>
                                  </Select>
                                </td>
                                <td className="p-2">
                                  <div className="flex gap-1 items-center">
                                    <div className="flex flex-col gap-0.5">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleMovePositionUp(position)}
                                        disabled={index === 0}
                                        className="h-5 w-5 p-0"
                                        title="Mover para cima"
                                      >
                                        <ChevronUp className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleMovePositionDown(position)}
                                        disabled={index === customPositions.length - 1}
                                        className="h-5 w-5 p-0"
                                        title="Mover para baixo"
                                      >
                                        <ChevronDown className="h-3 w-3" />
                                      </Button>
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleEditCustomPosition(position)}
                                      className="h-6 w-6 p-0"
                                      title="Editar nome do cargo"
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleEditDescription(position)}
                                      className="h-6 w-6 p-0"
                                      title="Editar descrição"
                                    >
                                      <FileText className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleDeleteCustomPosition(position)}
                                      className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                                      title="Excluir cargo"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>

                {/* Botões de Ação */}
                <div className="flex items-center justify-between pt-6 border-t">
                  <div className="text-sm text-muted-foreground">
                    {config.positions?.length || 0} cargo(s) selecionado(s)
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDeselectAllPositions}
                      disabled={!config.positions?.length}
                    >
                      Desmarcar Todos
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleSelectAllPositions}>
                      Marcar Todos
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Passo 5: Preview de Candidatos Elegíveis */}
          {currentStep === 5 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Candidatos Elegíveis
                </CardTitle>
                <CardDescription>
                  Visualize os membros que atendem aos critérios definidos e podem ser candidatos
                  nas nomeações.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <Button
                    onClick={loadEligibleCandidates}
                    disabled={loadingCandidates || !config.churchId}
                    variant="outline"
                  >
                    <RefreshCw
                      className={`h-4 w-4 mr-2 ${loadingCandidates ? 'animate-spin' : ''}`}
                    />
                    {loadingCandidates ? 'Carregando...' : 'Atualizar Lista'}
                  </Button>

                  {eligibleCandidates.length > 0 && (
                    <div className="text-sm text-muted-foreground">
                      {eligibleCandidates.length} candidato(s) elegível(eis)
                    </div>
                  )}
                </div>

                {loadingCandidates ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    <span className="ml-3 text-lg text-gray-600 dark:text-gray-300">
                      Carregando candidatos...
                    </span>
                  </div>
                ) : eligibleCandidates.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                      Nenhum candidato elegível
                    </h3>
                    <p className="text-gray-500 mb-4">
                      {config.churchId
                        ? 'Nenhum membro da igreja selecionada atende aos critérios definidos.'
                        : 'Selecione uma igreja primeiro para visualizar os candidatos.'}
                    </p>
                    {config.churchId && (
                      <Button onClick={loadEligibleCandidates} variant="outline">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Tentar Novamente
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] items-center">
                      <div>
                        <Label htmlFor="eligible-search" className="sr-only">
                          Buscar candidato elegível
                        </Label>
                        <Input
                          id="eligible-search"
                          placeholder="Buscar candidato por nome, e-mail ou função"
                          value={eligibleSearchTerm}
                          onChange={event => setEligibleSearchTerm(event.target.value)}
                        />
                      </div>
                      <div className="text-sm text-muted-foreground md:text-right">
                        Exibindo {filteredEligibleCandidates.length} de {eligibleCandidates.length}
                      </div>
                    </div>
                    {filteredEligibleCandidates.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        Nenhum candidato encontrado para a busca atual.
                      </div>
                    ) : (
                      <div className="grid gap-4">
                        {filteredEligibleCandidates.map(candidate => (
                          <Card key={candidate.id} className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                  <User className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                  <h4 className="font-medium">{candidate.name}</h4>
                                  <p className="text-sm text-muted-foreground">{candidate.email}</p>
                                </div>
                              </div>

                              <div className="flex items-center space-x-2">
                                <Badge
                                  variant={
                                    candidate.status === 'approved' ? 'default' : 'secondary'
                                  }
                                >
                                  {candidate.status === 'approved' ? 'Ativo' : 'Pendente'}
                                </Badge>
                                <Badge variant="outline">{candidate.role}</Badge>
                              </div>
                            </div>

                            <div className="mt-3 pt-3 border-t space-y-3">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div className="flex items-center space-x-2">
                                  <span className="font-medium">Tempo de batismo:</span>
                                  <Badge
                                    variant={
                                      candidate.churchTime?.includes('Não')
                                        ? 'secondary'
                                        : 'default'
                                    }
                                  >
                                    {candidate.churchTimeYears > 0
                                      ? `${candidate.churchTimeYears} anos`
                                      : 'Não informado'}
                                  </Badge>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className="font-medium">Dizimista:</span>
                                  <Badge
                                    variant={
                                      candidate.isTither?.includes('Não') ||
                                      candidate.isTither === 'Não informado'
                                        ? 'secondary'
                                        : 'default'
                                    }
                                  >
                                    {candidate.isTither}
                                  </Badge>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className="font-medium">Ofertante:</span>
                                  <Badge
                                    variant={
                                      candidate.isDonor?.includes('Não') ||
                                      candidate.isDonor === 'Não informado'
                                        ? 'secondary'
                                        : 'default'
                                    }
                                  >
                                    {candidate.isDonor}
                                  </Badge>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className="font-medium">Presença:</span>
                                  <Badge
                                    variant={
                                      candidate.attendance?.includes('Não') ||
                                      candidate.attendance === 'Não informado'
                                        ? 'secondary'
                                        : 'default'
                                    }
                                  >
                                    {candidate.attendance}
                                  </Badge>
                                </div>
                              </div>

                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <span className="font-medium text-sm">Classificação:</span>
                                  <Badge
                                    variant="outline"
                                    className={
                                      candidate.classification === 'Frequente'
                                        ? 'bg-green-50 text-green-700 border-green-300'
                                        : candidate.classification === 'Não Frequente'
                                          ? 'bg-orange-50 text-orange-700 border-orange-300'
                                          : candidate.classification === 'A Resgatar'
                                            ? 'bg-red-50 text-red-700 border-red-300'
                                            : 'bg-gray-50 text-gray-600'
                                    }
                                  >
                                    {candidate.classification}
                                  </Badge>
                                </div>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleRemoveCandidate(candidate.id)}
                                >
                                  <X className="h-4 w-4 mr-1" />
                                  Remover
                                </Button>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}

                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        Esta lista mostra apenas os membros que atendem aos critérios definidos.
                        Durante a nomeação, apenas estes membros poderão ser indicados como
                        candidatos.
                      </AlertDescription>
                    </Alert>
                  </div>
                )}

                {/* Seção de Candidatos Não Elegíveis */}
                {ineligibleCandidates.length > 0 && (
                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-orange-700 flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        Candidatos Não Elegíveis ({ineligibleCandidates.length})
                      </h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Membros que não atendem aos critérios definidos, mas podem ser adicionados
                      manualmente pelo administrador.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {ineligibleCandidates.map(candidate => (
                        <Card key={candidate.id} className="border-orange-200">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-medium text-orange-800">{candidate.name}</h4>
                                <p className="text-sm text-muted-foreground">{candidate.email}</p>
                                <div className="flex items-center gap-2 mt-2">
                                  <Badge
                                    variant={
                                      candidate.status === 'approved' ? 'default' : 'secondary'
                                    }
                                  >
                                    {candidate.status === 'approved' ? 'Ativo' : 'Pendente'}
                                  </Badge>
                                  <Badge variant="outline">{candidate.role}</Badge>
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleAddIneligibleCandidate(candidate)}
                                className="ml-2 border-orange-300 text-orange-700 hover:bg-orange-50"
                              >
                                <UserPlus className="h-4 w-4 mr-1" />
                                Adicionar
                              </Button>
                            </div>

                            <div className="mt-3 pt-3 border-t border-orange-100">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div className="flex items-center space-x-2">
                                  <span className="font-medium">Tempo de batismo:</span>
                                  <Badge
                                    variant={
                                      candidate.churchTimeYears === 0 ? 'secondary' : 'default'
                                    }
                                  >
                                    {candidate.churchTimeYears > 0
                                      ? `${candidate.churchTimeYears} anos`
                                      : 'Não informado'}
                                  </Badge>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className="font-medium">Dizimista:</span>
                                  <Badge
                                    variant={
                                      candidate.isTither?.includes('Não') ||
                                      candidate.isTither === 'Não informado'
                                        ? 'secondary'
                                        : 'default'
                                    }
                                  >
                                    {candidate.isTither}
                                  </Badge>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className="font-medium">Ofertante:</span>
                                  <Badge
                                    variant={
                                      candidate.isDonor?.includes('Não') ||
                                      candidate.isDonor === 'Não informado'
                                        ? 'secondary'
                                        : 'default'
                                    }
                                  >
                                    {candidate.isDonor}
                                  </Badge>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className="font-medium">Presença:</span>
                                  <Badge
                                    variant={
                                      candidate.attendance?.includes('Não') ||
                                      candidate.attendance === 'Não informado'
                                        ? 'secondary'
                                        : 'default'
                                    }
                                  >
                                    {candidate.attendance}
                                  </Badge>
                                </div>
                              </div>

                              <div className="flex items-center space-x-2 mt-3">
                                <span className="font-medium text-sm">Classificação:</span>
                                <Badge
                                  variant="outline"
                                  className={
                                    candidate.classification === 'Frequente'
                                      ? 'bg-green-50 text-green-700 border-green-300'
                                      : candidate.classification === 'Não Frequente'
                                        ? 'bg-orange-50 text-orange-700 border-orange-300'
                                        : candidate.classification === 'A Resgatar'
                                          ? 'bg-red-50 text-red-700 border-red-300'
                                          : 'bg-gray-50 text-gray-600'
                                  }
                                >
                                  {candidate.classification}
                                </Badge>
                              </div>

                              {/* Motivos de não elegibilidade */}
                              <div className="mt-3 pt-3 border-t border-orange-100">
                                <p className="text-sm font-medium text-orange-700 mb-2">Motivos:</p>
                                <div className="space-y-1">
                                  {candidate.eligibilityReasons.map(
                                    (reason: string, index: number) => (
                                      <div
                                        key={index}
                                        className="flex items-center gap-2 text-sm text-orange-600"
                                      >
                                        <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                                        <span>{reason}</span>
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    <Alert className="mt-4 border-orange-200">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      <AlertDescription className="text-orange-800">
                        Estes membros não atendem aos critérios definidos, mas podem ser adicionados
                        manualmente clicando no botão "Adicionar" se o administrador considerar
                        apropriado.
                      </AlertDescription>
                    </Alert>
                  </div>
                )}

                {/* Seção de Candidatos Removidos Manualmente */}
                {removedCandidates.length > 0 && (
                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-red-700 flex items-center gap-2">
                        <X className="h-5 w-5" />
                        Candidatos Removidos Manualmente ({removedCandidates.length})
                      </h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Candidatos que foram removidos manualmente pelo administrador.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {eligibleCandidates
                        .filter(c => removedCandidates.includes(c.id))
                        .map(candidate => (
                          <Card key={candidate.id} className="border-red-200 bg-red-50">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h4 className="font-medium text-red-800">{candidate.name}</h4>
                                  <p className="text-sm text-muted-foreground">{candidate.email}</p>
                                  <div className="flex items-center gap-2 mt-2">
                                    <Badge
                                      variant="outline"
                                      className="text-xs bg-red-100 text-red-700 border-red-300"
                                    >
                                      Removido
                                    </Badge>
                                  </div>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleAddCandidate(candidate.id)}
                                  className="ml-2 border-green-300 text-green-700 hover:bg-green-50"
                                >
                                  <UserPlus className="h-4 w-4 mr-1" />
                                  Adicionar de Volta
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                    </div>

                    <Alert className="mt-4 border-red-200 bg-red-50">
                      <Info className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-800">
                        Estes candidatos foram removidos manualmente e não participarão da eleição.
                        Você pode adicioná-los de volta clicando em "Adicionar de Volta".
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Navegação entre Passos */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center pt-4 sm:pt-6 border-t gap-3">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
            disabled={currentStep === 1}
            className="order-2 sm:order-1"
          >
            Anterior
          </Button>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 order-1 sm:order-2">
            {currentStep < 5 ? (
              <Button
                onClick={() => setCurrentStep(Math.min(5, currentStep + 1))}
                disabled={!canProceedToNextStep()}
                className="w-full sm:w-auto"
              >
                Próximo
              </Button>
            ) : (
              <>
                <Button
                  onClick={saveConfig}
                  disabled={saving}
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  <Save className="h-4 w-4 mr-2" />
                  <span className="truncate">
                    {saving
                      ? 'Salvando...'
                      : isEditing
                        ? 'Salvar Alterações'
                        : 'Salvar Configuração'}
                  </span>
                </Button>

                <Button
                  onClick={startElection}
                  disabled={loading}
                  variant="default"
                  className="w-full sm:w-auto"
                >
                  <Play className="h-4 w-4 mr-2" />
                  {loading ? 'Iniciando...' : 'Iniciar Nomeação'}
                </Button>
              </>
            )}
          </div>
        </div>

        {config.status === 'active' && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Nomeação ativa!</strong> Os votantes já podem acessar a página de votação.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </MobileLayout>
  );
}
