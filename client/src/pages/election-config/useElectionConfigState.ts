/**
 * useElectionConfigState — Custom hook que encapsula toda a lógica de estado
 * e handlers da página de configuração de eleições/nomeações.
 *
 * Extraído de ElectionConfig.tsx (2854 → ~1650 linhas) para separar
 * lógica de negócio da apresentação.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { hasAdminAccess } from '@/lib/permissions';
import { useToast } from '@/hooks/use-toast';
import { fetchWithAuth } from '@/lib/api';
import {
  ALL_POSITIONS,
  DEFAULT_POSITION_DESCRIPTIONS,
  type ElectionChurch as Church,
  type ElectionMember as Member,
  type ElectionConfigData as ElectionConfig,
} from './index';

// ──────────────────────────────────────────────
// Configuração padrão de critérios
// ──────────────────────────────────────────────
const DEFAULT_CRITERIA = {
  faithfulness: { enabled: true, punctual: true, seasonal: true, recurring: true },
  attendance: { enabled: true, punctual: true, seasonal: true, recurring: true },
  churchTime: { enabled: true, minimumMonths: 12 },
  positionLimit: { enabled: true, maxPositions: 2 },
  eldersCount: { enabled: true, count: 1 },
  classification: { enabled: true, frequente: true, naoFrequente: false, aResgatar: false },
};

const DEFAULT_CONFIG: ElectionConfig = {
  churchId: 0,
  churchName: '',
  title: '',
  voters: [],
  criteria: { ...DEFAULT_CRITERIA },
  positions: [],
  status: 'draft',
};

// ──────────────────────────────────────────────
// Hook principal
// ──────────────────────────────────────────────
export function useElectionConfigState() {
  const { user } = useAuth();
  const { toast } = useToast();

  // ── Estado principal ──
  const [churches, setChurches] = useState<Church[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [configExists, setConfigExists] = useState(false);
  const [editingConfigId, setEditingConfigId] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [config, setConfig] = useState<ElectionConfig>({ ...DEFAULT_CONFIG });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // ── Estado de candidatos ──
  type Candidate = Member & {
    isTither?: string;
    isDonor?: string;
    attendance?: string;
    classification?: string;
    churchTime?: string;
    churchTimeYears?: number;
    extraData?: Record<string, unknown>;
    eligibilityReasons: string[];
  };

  type RawMember = Member & {
    status?: string;
    church?: string;
    isDonor?: boolean;
    isTither?: boolean;
    isOffering?: boolean;
    extraData?: unknown;
    extra_data?: unknown;
    observations?: string | null;
    dizimista_type?: string;
    ofertante_type?: string;
    tempo_batismo_anos?: number;
    total_presenca?: number;
    classificacao?: string;
  };

  const [eligibleCandidates, setEligibleCandidates] = useState<Candidate[]>([]);
  const [ineligibleCandidates, setIneligibleCandidates] = useState<Candidate[]>([]);
  const [removedCandidates, setRemovedCandidates] = useState<number[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [eligibleSearchTerm, setEligibleSearchTerm] = useState('');

  // ── Estado de cargos personalizados ──
  const [customPositions, setCustomPositions] = useState<string[]>([]);
  const [positionDescriptions, setPositionDescriptions] = useState<Record<string, string>>({});
  const [currentLeaders, setCurrentLeaders] = useState<Record<string, number | null>>({});
  const [showAddPosition, setShowAddPosition] = useState(false);
  const [newPositionName, setNewPositionName] = useState('');
  const [editingPosition, setEditingPosition] = useState<string | null>(null);
  const [editingPositionName, setEditingPositionName] = useState('');
  const [editingDescription, setEditingDescription] = useState<string | null>(null);
  const [editingDescriptionText, setEditingDescriptionText] = useState('');

  // ──────────────────────────────────────────────
  // Data loading
  // ──────────────────────────────────────────────

  const loadChurches = useCallback(async () => {
    try {
      const response = await fetchWithAuth('/api/churches', {
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (response.ok) {
        const rawData = await response.json();
        const data = Array.isArray(rawData) ? (rawData as Church[]) : (rawData?.data as Church[]) || [];
        setChurches(data);

        if (data && data.length === 1 && user?.church) {
          const userChurch = data[0];
          setConfig(prev => ({
            ...prev,
            churchId: userChurch.id,
            churchName: userChurch.name,
          }));
        }
      } else {
        toast({ title: 'Erro', description: 'Erro ao carregar lista de igrejas', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Erro', description: 'Erro de conexão ao carregar igrejas', variant: 'destructive' });
    }
  }, [toast, user?.church]);

  const loadMembers = useCallback(async () => {
    try {
      const response = await fetchWithAuth('/api/users?limit=5000', {
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (response.ok) {
        const rawData = await response.json();
        const data = Array.isArray(rawData) ? (rawData as RawMember[]) : (rawData?.data as RawMember[]) || [];
        const membersOnly = (data || []).filter(
          member =>
            member.role?.includes('member') &&
            (member.status === 'active' || member.status === 'approved' || member.status === 'pending')
        );
        setMembers(membersOnly);
      } else {
        toast({ title: 'Erro', description: 'Erro ao carregar lista de membros', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Erro', description: 'Erro de conexão ao carregar membros', variant: 'destructive' });
    }
  }, [toast]);

  const loadConfig = useCallback(async (configId?: number) => {
    try {
      const query = configId ? `?id=${configId}` : '';
      const response = await fetchWithAuth(`/api/elections/config${query}`, {
        headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
      });

      if (response.status === 404) {
        if (configId) {
          toast({ title: 'Configuração não encontrada', description: 'Não foi possível localizar a configuração selecionada.', variant: 'destructive' });
          setEditingConfigId(null);
          setIsEditing(false);
        } else {
          setCustomPositions([...ALL_POSITIONS]);
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

        if (data.error) return;

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

          // Parse removed_candidates
          if (data.removed_candidates) {
            let parsedRemoved = data.removed_candidates;
            if (typeof parsedRemoved === 'string') {
              try { parsedRemoved = JSON.parse(parsedRemoved); } catch { parsedRemoved = []; }
            }
            if (!Array.isArray(parsedRemoved)) parsedRemoved = [];
            setRemovedCandidates(parsedRemoved);
          } else {
            setRemovedCandidates([]);
          }

          if (data.custom_positions) setCustomPositions(data.custom_positions);
          if (data.position_descriptions) setPositionDescriptions(data.position_descriptions);
          if (data.current_leaders) setCurrentLeaders(data.current_leaders);

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
    } catch {
      toast({ title: 'Erro', description: 'Erro ao carregar configuração de eleição', variant: 'destructive' });
    }
  }, [toast]);

  // ──────────────────────────────────────────────
  // Church / Voter handlers
  // ──────────────────────────────────────────────

  const handleChurchChange = async (churchId: string) => {
    const church = churches.find(c => c.id?.toString() === churchId);
    if (church) {
      setConfig(prev => ({ ...prev, churchId: church.id, churchName: church.name }));

      try {
        const response = await fetchWithAuth('/api/elections/configs', {
          headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
        });
        if (response.ok) {
          await response.json();
          // Permitir múltiplas configurações
          setConfigExists(false);
        }
      } catch {
        // Ignora erro na verificação
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

  // ──────────────────────────────────────────────
  // Criteria handlers
  // ──────────────────────────────────────────────

  const handleCriteriaChange = (field: string, value: string | number | boolean) => {
    setConfig(prev => {
      const newConfig = { ...prev };

      if (!newConfig.criteria) {
        newConfig.criteria = { ...DEFAULT_CRITERIA };
      }

      if (field.includes('.')) {
        const [parent, child] = field.split('.');
        const criteriaAny = newConfig.criteria as Record<string, Record<string, unknown>>;
        if (!criteriaAny[parent]) criteriaAny[parent] = {};
        criteriaAny[parent][child] = value;
      } else {
        (newConfig.criteria as Record<string, unknown>)[field] = value;
      }

      return newConfig;
    });
  };

  // ──────────────────────────────────────────────
  // Position handlers
  // ──────────────────────────────────────────────

  const handlePositionToggle = (position: string) => {
    setConfig(prev => ({
      ...prev,
      positions: (prev.positions || []).includes(position)
        ? (prev.positions || []).filter(p => p !== position)
        : [...(prev.positions || []), position],
    }));
  };

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
    if (editingPosition && editingPositionName.trim() && !customPositions.includes(editingPositionName.trim())) {
      setCustomPositions(prev => prev.map(p => (p === editingPosition ? editingPositionName.trim() : p)));
      setConfig(prev => ({
        ...prev,
        positions: prev.positions?.map(p => (p === editingPosition ? editingPositionName.trim() : p)),
      }));
      setEditingPosition(null);
      setEditingPositionName('');
    }
  };

  const handleDeleteCustomPosition = (position: string) => {
    setCustomPositions(prev => prev.filter(p => p !== position));
    setConfig(prev => ({ ...prev, positions: prev.positions?.filter(p => p !== position) }));
  };

  const handleMovePositionUp = (position: string) => {
    const currentIndex = customPositions.indexOf(position);
    if (currentIndex > 0) {
      const newPositions = [...customPositions];
      [newPositions[currentIndex - 1], newPositions[currentIndex]] = [newPositions[currentIndex], newPositions[currentIndex - 1]];
      setCustomPositions(newPositions);
      setConfig(prev => {
        const currentPositions = prev.positions || [];
        const positionIndex = currentPositions.indexOf(position);
        if (positionIndex > 0) {
          const newConfigPositions = [...currentPositions];
          [newConfigPositions[positionIndex - 1], newConfigPositions[positionIndex]] = [newConfigPositions[positionIndex], newConfigPositions[positionIndex - 1]];
          return { ...prev, positions: newConfigPositions };
        }
        return prev;
      });
    }
  };

  const handleMovePositionDown = (position: string) => {
    const currentIndex = customPositions.indexOf(position);
    if (currentIndex < customPositions.length - 1) {
      const newPositions = [...customPositions];
      [newPositions[currentIndex], newPositions[currentIndex + 1]] = [newPositions[currentIndex + 1], newPositions[currentIndex]];
      setCustomPositions(newPositions);
      setConfig(prev => {
        const currentPositions = prev.positions || [];
        const positionIndex = currentPositions.indexOf(position);
        if (positionIndex >= 0 && positionIndex < currentPositions.length - 1) {
          const newConfigPositions = [...currentPositions];
          [newConfigPositions[positionIndex], newConfigPositions[positionIndex + 1]] = [newConfigPositions[positionIndex + 1], newConfigPositions[positionIndex]];
          return { ...prev, positions: newConfigPositions };
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

  const handleEditDescription = (position: string) => {
    setEditingDescription(position);
    setEditingDescriptionText(positionDescriptions[position] || '');
  };

  const handleSaveDescription = () => {
    if (editingDescription) {
      setPositionDescriptions(prev => ({ ...prev, [editingDescription]: editingDescriptionText }));
      setEditingDescription(null);
      setEditingDescriptionText('');
    }
  };

  const handleCancelDescriptionEdit = () => {
    setEditingDescription(null);
    setEditingDescriptionText('');
  };

  const handleSelectAllPositions = () => {
    setConfig(prev => ({ ...prev, positions: [...customPositions] }));
  };

  const handleDeselectAllPositions = () => {
    setConfig(prev => ({ ...prev, positions: [] }));
  };

  // ──────────────────────────────────────────────
  // Candidate eligibility
  // ──────────────────────────────────────────────

  const handleAddIneligibleCandidate = (candidate: Candidate) => {
    setIneligibleCandidates(prev => prev.filter(c => c.id !== candidate.id));
    setEligibleCandidates(prev => [...prev, candidate]);
  };

  const loadEligibleCandidates = useCallback(async () => {
    setLoadingCandidates(true);
    try {
      const response = await fetchWithAuth('/api/users?limit=5000');

      if (response.ok) {
        const rawData = await response.json();
        const users = Array.isArray(rawData) ? (rawData as RawMember[]) : (rawData?.data as RawMember[]) || [];

        const churchMembers = users.filter(user => {
          const userRole = user.role || '';
          const isAdmin = user.role === 'superadmin' || user.role === 'pastor';
          return (
            user.church === config.churchName &&
            (userRole.includes('member') || isAdmin) &&
            (user.status === 'active' || user.status === 'approved' || user.status === 'pending')
          );
        });

        const eligible: Candidate[] = [];
        const ineligible: Candidate[] = [];

        for (const member of churchMembers) {
          let isEligible = true;
          const eligibilityReasons: string[] = [];

          // Parse extraData
          const extraData =
            typeof member.extraData === 'string'
              ? JSON.parse(member.extraData || '{}')
              : (member.extraData as Record<string, unknown>) || {};
          const extraDataAlt =
            typeof member.extra_data === 'string'
              ? JSON.parse(member.extra_data || '{}')
              : (member.extra_data as Record<string, unknown>) || {};
          const mergedExtraData = { ...extraDataAlt, ...extraData };

          // Participação das observations
          let participacaoFromObs = '';
          if (member.observations) {
            const match = (member.observations as string).match(/Participação:\s*([^|]+)/i);
            if (match) participacaoFromObs = match[1].trim();
          }

          const normalizedData = {
            dizimistaType:
              (mergedExtraData.dizimistaType as string) ||
              (mergedExtraData.dizimista as string) ||
              member.dizimista_type ||
              '',
            ofertanteType:
              (mergedExtraData.ofertanteType as string) ||
              (mergedExtraData.ofertante as string) ||
              member.ofertante_type ||
              '',
            teveParticipacao:
              (mergedExtraData.teveParticipacao as string) ||
              (mergedExtraData.participacao as string) ||
              participacaoFromObs ||
              '',
            tempoBatismoAnos:
              (mergedExtraData.tempoBatismoAnos as number) ||
              (mergedExtraData.tempoBatismo as number) ||
              member.tempo_batismo_anos ||
              0,
            classificacao: (mergedExtraData.classificacao as string) || member.classificacao || '',
            totalPresenca:
              (mergedExtraData.totalPresenca as number) || member.total_presenca || 0,
          };

          // ── Critério de Fidelidade ──
          if (config.criteria?.faithfulness?.enabled) {
            let hasFaithfulness = false;
            const dizimistaType = normalizedData.dizimistaType.toLowerCase();
            const isDizimista = member.isDonor || member.isTither || dizimistaType;
            const isNotDizimista = dizimistaType === 'naodizimista' || dizimistaType === 'não dizimista';

            if (isDizimista && dizimistaType && !isNotDizimista) {
              if (config.criteria.faithfulness.punctual && dizimistaType.includes('pontual')) hasFaithfulness = true;
              if (config.criteria.faithfulness.seasonal && dizimistaType.includes('sazonal')) hasFaithfulness = true;
              if (config.criteria.faithfulness.recurring && dizimistaType.includes('recorrente')) hasFaithfulness = true;
            }

            if (!hasFaithfulness) {
              const ofertanteType = normalizedData.ofertanteType.toLowerCase();
              const isOfertante = member.isOffering || ofertanteType;
              const isNotOfertante = ofertanteType === 'naoofertante' || ofertanteType === 'não ofertante';

              if (isOfertante && ofertanteType && !isNotOfertante) {
                if (config.criteria.faithfulness.punctual && ofertanteType.includes('pontual')) hasFaithfulness = true;
                if (config.criteria.faithfulness.seasonal && ofertanteType.includes('sazonal')) hasFaithfulness = true;
                if (config.criteria.faithfulness.recurring && ofertanteType.includes('recorrente')) hasFaithfulness = true;
                if (ofertanteType === 'ofertante' && (config.criteria.faithfulness.punctual || config.criteria.faithfulness.seasonal || config.criteria.faithfulness.recurring)) {
                  hasFaithfulness = true;
                }
              }
            }

            if (!hasFaithfulness) {
              isEligible = false;
              eligibilityReasons.push('Não atende aos critérios de fidelidade (dizimista/ofertante)');
            }
          }

          // ── Critério de Presença ──
          if (config.criteria?.attendance?.enabled) {
            let hasAttendance = false;
            const teveParticipacao = normalizedData.teveParticipacao.toLowerCase();

            if (teveParticipacao && teveParticipacao !== 'não informado') {
              if (config.criteria.attendance.punctual && teveParticipacao.includes('pontual')) hasAttendance = true;
              if (config.criteria.attendance.seasonal && teveParticipacao.includes('sazonal')) hasAttendance = true;
              if (config.criteria.attendance.recurring && teveParticipacao.includes('recorrente')) hasAttendance = true;
            }

            if (!hasAttendance) {
              isEligible = false;
              eligibilityReasons.push('Não atende aos critérios de presença');
            }
          }

          // ── Critério de Tempo na Igreja ──
          if (config.criteria?.churchTime?.enabled) {
            const tempoBatismoAnos = Number(normalizedData.tempoBatismoAnos) || 0;
            const minimumYears = Math.round((config.criteria.churchTime.minimumMonths || 12) / 12);

            if (tempoBatismoAnos < minimumYears) {
              isEligible = false;
              eligibilityReasons.push(
                `Tempo de batismo insuficiente (${tempoBatismoAnos} anos, mínimo: ${minimumYears} anos)`
              );
            }
          }

          // ── Critério de Classificação ──
          if (config.criteria?.classification?.enabled) {
            const memberClassification = normalizedData.classificacao.toLowerCase();
            let hasValidClassification = false;

            if (config.criteria.classification.frequente && memberClassification === 'frequente') hasValidClassification = true;
            if (config.criteria.classification.naoFrequente && memberClassification === 'não frequente') hasValidClassification = true;
            if (config.criteria.classification.aResgatar && memberClassification === 'a resgatar') hasValidClassification = true;

            if (!hasValidClassification) {
              isEligible = false;
              eligibilityReasons.push(
                `Classificação não atende aos critérios (${normalizedData.classificacao || 'não informado'})`
              );
            }
          }

          const candidateData = {
            id: member.id,
            name: member.name,
            email: member.email,
            church: member.church,
            role: member.role,
            status: member.status,
            isTither: normalizedData.dizimistaType || (member.isDonor || member.isTither ? 'Sim' : 'Não informado'),
            isDonor: normalizedData.ofertanteType || (member.isOffering ? 'Sim' : 'Não informado'),
            attendance: normalizedData.teveParticipacao || 'Não informado',
            classification: normalizedData.classificacao || 'Não informado',
            churchTime: normalizedData.tempoBatismoAnos
              ? `${normalizedData.tempoBatismoAnos} anos` : 'Não informado',
            churchTimeYears: Number(normalizedData.tempoBatismoAnos) || 0,
            extraData: mergedExtraData,
            eligibilityReasons,
          };

          if (isEligible) {
            eligible.push(candidateData);
          } else {
            ineligible.push(candidateData);
          }
        }

        setEligibleCandidates(eligible);
        setIneligibleCandidates(ineligible);
      } else {
        throw new Error('Erro ao carregar usuários');
      }
    } catch {
      toast({ title: 'Erro', description: 'Erro ao carregar candidatos elegíveis', variant: 'destructive' });
    } finally {
      setLoadingCandidates(false);
    }
  }, [config.churchName, config.criteria, toast]);

  // ──────────────────────────────────────────────
  // Effects
  // ──────────────────────────────────────────────

  // Auto-carregar candidatos ao chegar no passo 5
  useEffect(() => {
    if (currentStep === 5 && config.churchId && eligibleCandidates.length === 0 && !loadingCandidates) {
      loadEligibleCandidates();
    }
  }, [currentStep, config.churchId, eligibleCandidates.length, loadingCandidates, loadEligibleCandidates]);

  // Carregamento inicial
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

        setCustomPositions(prev => {
          const allPositions = [...ALL_POSITIONS];
          const existingCustom = prev || [];
          const newPositions = allPositions.filter(pos => !existingCustom.includes(pos));
          return [...existingCustom, ...newPositions];
        });

        setPositionDescriptions(prev => ({
          ...prev,
          ...DEFAULT_POSITION_DESCRIPTIONS,
        }));
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [loadChurches, loadMembers, loadConfig]);

  const handleRemoveCandidate = (candidateId: number) => {
    setRemovedCandidates(prev => [...prev, candidateId]);
    toast({ title: 'Candidato removido', description: 'O candidato foi removido da lista de elegíveis.' });
  };

  const handleAddCandidate = (candidateId: number) => {
    setRemovedCandidates(prev => prev.filter(id => id !== candidateId));
    toast({ title: 'Candidato adicionado', description: 'O candidato foi adicionado à lista de elegíveis.' });
  };

  // ──────────────────────────────────────────────
  // Step validation
  // ──────────────────────────────────────────────

  const canProceedToNextStep = () => {
    switch (currentStep) {
      case 1: return !!(config.churchId && config.churchName);
      case 2: return !!(config.voters && config.voters.length > 0);
      case 3: return true;
      case 4: return !!(config.positions && config.positions.length > 0);
      case 5: return true;
      default: return false;
    }
  };

  // ──────────────────────────────────────────────
  // Save / Start
  // ──────────────────────────────────────────────

  const saveConfig = async () => {
    setSaving(true);
    try {
      if (!config.churchId || !config.churchName || config.positions.length === 0) {
        toast({ title: 'Erro', description: 'Por favor, selecione uma igreja e pelo menos um cargo.', variant: 'destructive' });
        setSaving(false);
        return;
      }

      const normalizedTitle = config.title?.trim() ||
        `Nomeação ${config.churchName} - ${new Date().toLocaleDateString('pt-BR')}`;

      const payload = {
        ...config,
        title: normalizedTitle,
        custom_positions: customPositions,
        position_descriptions: positionDescriptions,
        current_leaders: currentLeaders,
        removed_candidates: removedCandidates,
      };

      const targetConfigId = isEditing ? (config.id ?? editingConfigId ?? undefined) : undefined;
      const isUpdate = Boolean(targetConfigId);
      const endpoint = isUpdate ? `/api/elections/config/${targetConfigId}` : '/api/elections/config';
      const method = isUpdate ? 'PUT' : 'POST';

      const response = await fetchWithAuth(endpoint, {
        method,
        headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        if (isUpdate) {
          let responseData: { message?: string } | null = null;
          try { responseData = await response.json(); } catch { responseData = null; }
          if (targetConfigId) await loadConfig(targetConfigId);
          toast({ title: 'Alterações salvas', description: responseData?.message || 'Configuração atualizada com sucesso.' });
        } else {
          const data = await response.json();
          setConfigExists(true);
          setConfig(prev => ({ ...prev, id: data.id }));
          toast({ title: 'Configuração salva', description: 'Os parâmetros da nomeação foram salvos com sucesso.' });
          setCurrentStep(2);
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao salvar configuração');
      }
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível salvar a configuração.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const startElection = async () => {
    if (!config.voters || config.voters.length === 0) {
      toast({ title: 'Erro', description: 'Selecione pelo menos um votante.', variant: 'destructive' });
      return;
    }
    if (!config.positions || config.positions.length === 0) {
      toast({ title: 'Erro', description: 'Selecione pelo menos um cargo.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetchWithAuth('/api/elections/start', {
        method: 'POST',
        headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
        body: JSON.stringify({ ...config, configId: config.id }),
      });

      if (response.ok) {
        setConfig(prev => ({ ...prev, status: 'active' }));
        toast({ title: 'Eleição iniciada', description: 'A eleição foi iniciada com sucesso. Os votantes já podem acessar a página de votação.' });
      } else {
        throw new Error('Erro ao iniciar eleição');
      }
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível iniciar a eleição.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // ──────────────────────────────────────────────
  // New nomination (reset all state)
  // ──────────────────────────────────────────────

  const handleNewNomination = () => {
    setEditingConfigId(null);
    setIsEditing(false);
    setConfig({
      ...DEFAULT_CONFIG,
      title: `Nomeação ${new Date().getFullYear()} - ${new Date().toLocaleDateString('pt-BR')}`,
    });
    setCurrentStep(1);
    setConfigExists(false);
    setEligibleCandidates([]);
    setIneligibleCandidates([]);
    window.history.pushState({}, '', '/election-config');
    toast({ title: 'Nova Nomeação', description: 'Iniciando configuração de nova nomeação' });
  };

  // ──────────────────────────────────────────────
  // Derived / computed
  // ──────────────────────────────────────────────

  const filteredMembers = members.filter(member => {
    const matchesChurch = member.church === config.churchName || config.churchName === '';
    const matchesSearch = searchTerm === '' ||
      member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesChurch && matchesSearch;
  });

  const selectedVoters = members.filter(member => config.voters?.includes(member.id) || false);

  const filteredEligibleCandidates = useMemo(() => {
    const activeEligible = eligibleCandidates.filter(c => !removedCandidates.includes(c.id));
    const term = eligibleSearchTerm.trim().toLowerCase();
    if (!term) return activeEligible;
    return activeEligible.filter(c => {
      const name = c?.name?.toLowerCase() ?? '';
      const email = c?.email?.toLowerCase() ?? '';
      const role = c?.role?.toLowerCase() ?? '';
      return name.includes(term) || email.includes(term) || role.includes(term);
    });
  }, [eligibleCandidates, eligibleSearchTerm, removedCandidates]);

  const canAccessElectionConfig =
    hasAdminAccess(user) ||
    user?.email?.includes('admin') ||
    user?.name?.toLowerCase().includes('admin') ||
    user?.name?.toLowerCase().includes('pastor');

  // ──────────────────────────────────────────────
  // Return
  // ──────────────────────────────────────────────

  return {
    // Auth
    user,

    // State
    config, setConfig,
    currentStep, setCurrentStep,
    isEditing,
    editingConfigId,
    configExists,
    churches,
    members,
    loading,
    saving,
    searchTerm, setSearchTerm,
    eligibleSearchTerm, setEligibleSearchTerm,
    eligibleCandidates,
    ineligibleCandidates,
    removedCandidates,
    loadingCandidates,
    customPositions,
    positionDescriptions,
    currentLeaders, setCurrentLeaders,
    showAddPosition, setShowAddPosition,
    newPositionName, setNewPositionName,
    editingPosition,
    editingPositionName, setEditingPositionName,
    editingDescription,
    editingDescriptionText, setEditingDescriptionText,

    // Derived
    filteredMembers,
    selectedVoters,
    filteredEligibleCandidates,
    canAccessElectionConfig,

    // Handlers
    handleNewNomination,
    handleChurchChange,
    handleVoterToggle,
    handleCriteriaChange,
    handlePositionToggle,
    handleAddCustomPosition,
    handleEditCustomPosition,
    handleSaveEditPosition,
    handleDeleteCustomPosition,
    handleMovePositionUp,
    handleMovePositionDown,
    handleCancelEdit,
    handleCancelAdd,
    handleEditDescription,
    handleSaveDescription,
    handleCancelDescriptionEdit,
    handleSelectAllPositions,
    handleDeselectAllPositions,
    handleAddIneligibleCandidate,
    handleRemoveCandidate,
    handleAddCandidate,
    loadEligibleCandidates,
    canProceedToNextStep,
    saveConfig,
    startElection,
  };
}
