import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { fetchWithAuth } from '@/lib/api';
import { electionLogger } from '@/lib/logger';
import type { Candidate, ElectionData } from './election-voting/electionVotingTypes';
import {
  getExpectedVoters,
  getHasAllVotes,
  getPhaseDescription,
  getPhaseTitle,
} from './election-voting/electionVotingUtils';
import {
  LoadingState,
  ErrorState,
  MissingDataState,
  PageHeader,
  NominationWaitingCard,
  VoteWaitingCard,
  FinalCardWinner,
  FinalCardNoWinner,
  PhaseStatusCard,
  PositionInfoCard,
  CandidatesSection,
  PositionDescriptionModal,
} from './election-voting/ElectionVotingMobileSections';
import { useTranslation } from 'react-i18next';

export default function ElectionVotingMobile() {
  const { configId } = useParams<{ configId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [electionData, setElectionData] = useState<ElectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);

  const electionDataRef = useRef<ElectionData | null>(null);
  const retryCountRef = useRef(0);
  const isInitialLoadRef = useRef(true);

  useEffect(() => {
    electionDataRef.current = electionData;
  }, [electionData]);

  useEffect(() => {
    retryCountRef.current = retryCount;
  }, [retryCount]);

  useEffect(() => {
    isInitialLoadRef.current = isInitialLoad;
  }, [isInitialLoad]);

  // Função para buscar eleições ativas e encontrar a correta
  const findActiveElection = useCallback(async () => {
    try {
      const response = await fetchWithAuth('/api/elections/active', {
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
      });

      if (response.ok) {
        const data = await response.json();
        electionLogger.debug('Eleições ativas encontradas:', data);

        if (data.elections && data.elections.length > 0) {
          // Usar a primeira eleição ativa encontrada
          const activeElection = data.elections[0];
          electionLogger.debug('Usando eleição ativa:', activeElection);
          return activeElection.config_id;
        }
      }

      return null;
    } catch (error) {
      electionLogger.error('Erro ao buscar eleições ativas:', error);
      return null;
    }
  }, []);

  const loadAllMembers = useCallback(
    async (_electionId: number) => {
      try {
        electionLogger.debug('Carregando todos os membros como candidatos...');

        // Buscar todos os membros da igreja
        const response = await fetch('/api/debug/users');
        if (response.ok) {
          const data = await response.json();
          electionLogger.debug('Membros encontrados:', data.users.length);

          // Converter membros em candidatos
          const candidates: Candidate[] = data.users.map(
            (member: { id: number; name: string; church?: string }) => ({
              id: member.id,
              name: member.name,
              unit: member.church || 'N/A',
              points: 0,
              nominations: 0,
              votes: 0,
              percentage: 0,
            })
          );

          // Atualizar dados da eleição com candidatos
          setElectionData((prev) =>
            prev
              ? {
                  ...prev,
                  candidates,
                }
              : null
          );

          toast({
            title: t('electionVotingMobile.candidatesLoaded'),
            description: t('electionVotingMobile.candidatesLoadedDesc', {
              count: candidates.length,
            }),
          });
        }
      } catch (error) {
        electionLogger.error('Erro ao carregar membros:', error);
        toast({
          title: t('electionVotingMobile.warning'),
          description: t('electionVotingMobile.candidatesLoadError'),
          variant: 'destructive',
        });
      }
    },
    [t, toast]
  );

  const loadElectionData = useCallback(
    async (_electionConfigId?: number, silentUpdate = false) => {
      try {
        // Só mostrar loading se não for uma atualização silenciosa
        if (!silentUpdate) {
          setLoading(true);
        }
        setError(null);

        // Se não foi fornecido um configId, tentar encontrar eleição ativa
        let targetConfigId = configId;
        if (!targetConfigId || targetConfigId === 'undefined') {
          electionLogger.debug('ConfigId não fornecido, buscando eleição ativa...');
          const activeConfigId = await findActiveElection();
          if (activeConfigId) {
            targetConfigId = activeConfigId.toString();
            // Atualizar a URL se necessário
            if (window.location.pathname !== `/election-vote/${activeConfigId}`) {
              window.history.replaceState(null, '', `/election-vote/${activeConfigId}`);
            }
          } else {
            throw new Error(t('electionVotingMobile.noActiveElection'));
          }
        }

        electionLogger.debug('Carregando dados da eleição com configId:', targetConfigId);

        // Adicionar timestamp para evitar cache e garantir dados atualizados
        const timestamp = Date.now();
        const response = await fetchWithAuth(
          `/api/elections/voting/${targetConfigId}?t=${timestamp}`,
          {
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              Pragma: 'no-cache',
              Expires: '0',
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          electionLogger.debug('Dados da eleição recebidos:', data);
          const currentElectionData = electionDataRef.current;

          // Validar dados recebidos
          if (!data.election) {
            throw new Error(t('electionVotingMobile.invalidElectionData'));
          }

          // Se não há candidatos, tentar carregar sem filtros
          if (!data.candidates || data.candidates.length === 0) {
            electionLogger.debug(
              'Nenhum candidato encontrado, tentando carregar todos os membros...'
            );
            await loadAllMembers(data.election.id);
            return;
          }

          // Se a posição mudou, resetar o candidato selecionado
          if (currentElectionData && currentElectionData.currentPosition !== data.currentPosition) {
            electionLogger.debug('Posição mudou, resetando candidato selecionado');
            setSelectedCandidate(null);
            setSubmitting(false);
          }

          // Se o usuário já votou ou indicou, resetar a seleção (já foi processada)
          // Mas só resetar se realmente mudou o estado (não durante polling normal)
          if (
            (data.hasVoted || data.hasNominated) &&
            (!currentElectionData ||
              currentElectionData.hasVoted !== data.hasVoted ||
              currentElectionData.hasNominated !== data.hasNominated)
          ) {
            electionLogger.debug('Usuário votou/indicou, resetando seleção');
            setSelectedCandidate(null);
          }

          const normalizedWinner = data.winner
            ? {
                id: data.winner.id,
                name: data.winner.name,
                votes: Number(data.winner.votes) || 0,
                percentage: Number(data.winner.percentage) || 0,
              }
            : null;

          const enrichedData: ElectionData = {
            ...data,
            totalVoters:
              typeof data.totalVoters === 'number'
                ? data.totalVoters
                : Array.isArray(data.voters)
                  ? data.voters.length
                  : 0,
            totalVotes: typeof data.totalVotes === 'number' ? data.totalVotes : 0,
            votersWhoVoted: typeof data.votersWhoVoted === 'number' ? data.votersWhoVoted : 0,
            allVotesCast: Boolean(data.allVotesCast),
            winner: normalizedWinner,
          };

          // Verificar se a lista de candidatos mudou (apenas para logs, sem notificações)
          const previousCandidatesCount = currentElectionData?.candidates?.length || 0;
          const currentCandidatesCount = enrichedData.candidates?.length || 0;
          const previousCandidateIds =
            currentElectionData?.candidates
              ?.map((c) => c.id)
              .sort()
              .join(',') || '';
          const currentCandidateIds =
            enrichedData.candidates
              ?.map((c) => c.id)
              .sort()
              .join(',') || '';

          if (previousCandidateIds !== currentCandidateIds && currentElectionData) {
            const previousCandidateNames = currentElectionData.candidates?.map((c) => c.name) || [];
            const currentCandidateNames = enrichedData.candidates?.map((c) => c.name) || [];
            const removedCandidates = previousCandidateNames.filter(
              (name) => !currentCandidateNames.includes(name)
            );

            electionLogger.debug('Lista de candidatos atualizada:', {
              anterior: previousCandidatesCount,
              atual: currentCandidatesCount,
              removidos: previousCandidatesCount - currentCandidatesCount,
              candidatos_removidos: removedCandidates,
              candidatos_anteriores: previousCandidateNames,
              candidatos_atuais: currentCandidateNames,
            });

            // Removido: toast de notificação de candidatos removidos (estava atrapalhando os votantes)
          }

          setElectionData(enrichedData);
          electionLogger.debug('Dados normalizados da eleição:', {
            configId: enrichedData.election?.config_id,
            position: enrichedData.currentPositionName,
            phase: enrichedData.phase,
            totalVoters: enrichedData.totalVoters,
            totalVotes: enrichedData.totalVotes,
            votersWhoVoted: enrichedData.votersWhoVoted,
            allVotesCast: enrichedData.allVotesCast,
            winner: enrichedData.winner,
            candidatos: enrichedData.candidates?.length || 0,
          });

          // Se o usuário já votou, mostrar o voto selecionado
          if (data.userVote) {
            setSelectedCandidate(data.userVote);
          }
          // Se não votou nem indicou, preservar a seleção atual durante polling
          // Não resetar o selectedCandidate para não perder a seleção do usuário

          retryCountRef.current = 0;
          setRetryCount(0); // Reset retry count on success
        } else if (response.status === 404) {
          // Se não encontrou eleição com este configId, tentar encontrar ativa
          electionLogger.debug('Eleição não encontrada, buscando eleição ativa...');
          const activeConfigId = await findActiveElection();
          if (activeConfigId && activeConfigId.toString() !== configId) {
            electionLogger.debug('Redirecionando para eleição ativa:', activeConfigId);
            navigate(`/election-vote/${activeConfigId}`, { replace: true });
            return;
          }

          const errorData = await response.json();
          throw new Error(errorData.error || t('electionVotingMobile.electionNotFound'));
        } else {
          const errorData = await response.json();
          throw new Error(errorData.error || t('electionVotingMobile.loadElectionError'));
        }
      } catch (error) {
        electionLogger.error('Erro ao carregar dados da eleição:', error);
        setError(error instanceof Error ? error.message : t('electionVotingMobile.unknownError'));

        // Se ainda não tentou buscar eleição ativa, tentar agora
        if (retryCountRef.current === 0 && configId) {
          electionLogger.debug('Tentando buscar eleição ativa...');
          retryCountRef.current = 1;
          setRetryCount(1);
          await loadElectionData();
          return;
        }
      } finally {
        // Só desativar loading se não for uma atualização silenciosa
        if (!silentUpdate) {
          setLoading(false);
        }
        // Após o primeiro carregamento, marcar como não sendo mais inicial
        if (isInitialLoadRef.current) {
          isInitialLoadRef.current = false;
          setIsInitialLoad(false);
        }
      }
    },
    [configId, findActiveElection, loadAllMembers, navigate, t]
  );

  const loadElectionDataRef = useRef(loadElectionData);

  useEffect(() => {
    loadElectionDataRef.current = loadElectionData;
  }, [loadElectionData]);

  const handleVote = async (candidateId: number, phase: string) => {
    if (submitting || !electionData) return;

    setSubmitting(true);
    try {
      const response = await fetchWithAuth('/api/elections/vote', {
        method: 'POST',
        body: JSON.stringify({
          configId,
          candidateId,
          phase,
        }),
      });

      if (response.ok) {
        await response.json();

        // Não mostrar toast, vamos mostrar uma tela especial
        // Recarregar dados para atualizar o estado
        await loadElectionData();
        setSubmitting(false);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || t('electionVotingMobile.voteError'));
      }
    } catch (error) {
      electionLogger.error('Erro ao votar:', error);
      toast({
        title: t('electionVotingMobile.error'),
        description:
          error instanceof Error ? error.message : t('electionVotingMobile.couldNotRegisterVote'),
        variant: 'destructive',
      });
      setSubmitting(false);
    }
  };

  const handleNominateCandidate = async (candidateId: number) => {
    if (submitting || !electionData) return;

    await handleVote(candidateId, 'nomination');
    setSelectedCandidate(null);
  };

  const handleRetry = () => {
    setError(null);
    retryCountRef.current = 0;
    setRetryCount(0);
    loadElectionData();
  };

  useEffect(() => {
    if (user?.id) {
      loadElectionData();
    }
  }, [user?.id, configId, loadElectionData]);

  // Polling contínuo para atualização em tempo real (incluindo remoção de candidatos pelo admin)
  useEffect(() => {
    if (!user?.id) return;

    // Atualizar a cada 1 segundo para garantir que mudanças do admin sejam refletidas imediatamente
    // O polling continua mesmo quando electionData ainda não foi carregado
    const interval = setInterval(() => {
      if (electionDataRef.current) {
        electionLogger.debug('Atualizando dados da eleição em tempo real...');
      }
      loadElectionDataRef.current?.(undefined, true); // true = silentUpdate (sem mostrar loading)
    }, 1000); // 1 segundo - mais responsivo para mudanças do admin (remoção de candidatos)

    return () => {
      electionLogger.debug('Parando atualização automática');
      clearInterval(interval);
    };
  }, [user?.id, configId]); // Polling sempre ativo quando há usuário e configId

  const expectedVoters = getExpectedVoters(electionData);
  const hasAllVotes = getHasAllVotes(electionData);

  const showWaitingCard = electionData
    ? ['voting'].includes(electionData.phase) &&
      electionData.hasVoted &&
      electionData.votedCandidateName &&
      !hasAllVotes
    : false;

  const showFinalCard = electionData
    ? ['voting', 'completed'].includes(electionData.phase) && hasAllVotes
    : false;

  const finalCardShownRef = useRef(false);

  useEffect(() => {
    finalCardShownRef.current = false;
  }, [electionData?.currentPosition, electionData?.phase]);

  useEffect(() => {
    if (showFinalCard && !finalCardShownRef.current && electionData) {
      finalCardShownRef.current = true;
      const winnerName = electionData.winner?.name;
      const message = winnerName
        ? t('electionVotingMobile.winnerElected', {
            name: winnerName,
            position: electionData.currentPositionName,
          })
        : t('electionVotingMobile.allVotesRegistered', {
            position: electionData.currentPositionName,
          });
      toast({
        title: t('electionVotingMobile.votingFinished'),
        description: message,
      });
    }
  }, [showFinalCard, electionData, t, toast]);

  // Só mostrar loading completo no carregamento inicial
  if (loading && isInitialLoad) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={handleRetry} onBack={() => navigate('/dashboard')} />;
  }

  if (!electionData) {
    return <MissingDataState onRetry={handleRetry} />;
  }

  return (
    <MobileLayout>
      <div className="p-4 space-y-6">
        <PageHeader
          churchName={electionData.election.church_name as string}
          currentPosition={electionData.currentPosition}
          totalPositions={electionData.totalPositions}
          onBack={() => navigate('/dashboard')}
        />

        {electionData.phase === 'nomination' && electionData.hasNominated && (
          <NominationWaitingCard
            nominationCount={electionData.nominationCount || 0}
            maxNominations={electionData.maxNominationsPerVoter || 1}
          />
        )}

        {showWaitingCard && (
          <VoteWaitingCard
            votedCandidateName={electionData.votedCandidateName || ''}
            currentPositionName={electionData.currentPositionName}
          />
        )}

        {showFinalCard && electionData.winner && (
          <FinalCardWinner
            winner={electionData.winner}
            currentPositionName={electionData.currentPositionName}
            expectedVoters={expectedVoters}
          />
        )}

        {showFinalCard && !electionData.winner && (
          <FinalCardNoWinner currentPositionName={electionData.currentPositionName} />
        )}

        {!(
          (electionData.phase === 'nomination' && electionData.hasNominated) ||
          (electionData.phase === 'voting' && electionData.hasVoted)
        ) && (
          <PhaseStatusCard
            phase={electionData.phase}
            title={getPhaseTitle(electionData?.phase)}
            description={getPhaseDescription(electionData)}
          />
        )}

        {!(
          (electionData.phase === 'nomination' && electionData.hasNominated) ||
          (electionData.phase === 'voting' && electionData.hasVoted)
        ) && (
          <PositionInfoCard
            currentPositionName={electionData.currentPositionName}
            currentPositionDescription={electionData.currentPositionDescription}
            candidatesCount={electionData.candidates.length}
            isNominationPhase={electionData.phase === 'nomination'}
            nominationCount={electionData.nominationCount || 0}
            maxNominations={electionData.maxNominationsPerVoter || 1}
          />
        )}

        {!(
          (electionData.phase === 'nomination' && electionData.hasNominated) ||
          (electionData.phase === 'voting' && electionData.hasVoted)
        ) && (
          <CandidatesSection
            electionData={electionData}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            selectedCandidate={selectedCandidate}
            setSelectedCandidate={setSelectedCandidate}
            submitting={submitting}
            handleRetry={handleRetry}
            handleNominateCandidate={handleNominateCandidate}
            handleVote={handleVote}
            toast={toast}
          />
        )}
      </div>

      <PositionDescriptionModal
        isOpen={showDescriptionModal}
        onOpenChange={setShowDescriptionModal}
        title={electionData?.currentPositionName}
        description={electionData?.currentPositionDescription}
      />
    </MobileLayout>
  );
}
