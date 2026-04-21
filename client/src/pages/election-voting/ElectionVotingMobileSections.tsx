import type { Dispatch, SetStateAction } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Vote,
  Users,
  CheckCircle,
  Clock,
  Loader2,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  Search,
  X,
} from 'lucide-react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import type { ElectionData } from './electionVotingTypes';
import { ariaLabels } from '@/lib/accessibility';

type ToastFn = (props: {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
}) => void;

export const LoadingState = () => (
  <MobileLayout>
    <div className="p-4 flex items-center justify-center min-h-[50vh]">
      <Loader2 className="h-8 w-8 animate-spin" />
      <span className="ml-2">Carregando eleição...</span>
    </div>
  </MobileLayout>
);

type ErrorStateProps = {
  error: string;
  onRetry: () => void;
  onBack: () => void;
};

export const ErrorState = ({ error, onRetry, onBack }: ErrorStateProps) => (
  <MobileLayout>
    <div className="p-4 text-center space-y-4">
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>

      <div className="space-y-3">
        <Button onClick={onRetry} className="w-full">
          <RefreshCw className="h-4 w-4 mr-2" />
          Tentar Novamente
        </Button>

        <Button variant="outline" onClick={onBack} className="w-full">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar ao Dashboard
        </Button>
      </div>
    </div>
  </MobileLayout>
);

type MissingDataStateProps = {
  onRetry: () => void;
};

export const MissingDataState = ({ onRetry }: MissingDataStateProps) => (
  <MobileLayout>
    <div className="p-4 text-center space-y-4">
      <Alert>
        <AlertDescription>Não foi possível carregar os dados da eleição.</AlertDescription>
      </Alert>

      <Button onClick={onRetry} className="w-full">
        <RefreshCw className="h-4 w-4 mr-2" />
        Tentar Novamente
      </Button>
    </div>
  </MobileLayout>
);

type PageHeaderProps = {
  churchName?: string;
  currentPosition: number;
  totalPositions: number;
  onBack: () => void;
};

export const PageHeader = ({
  churchName,
  currentPosition,
  totalPositions,
  onBack,
}: PageHeaderProps) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-3">
      <Button variant="ghost" size="sm" onClick={onBack} aria-label={ariaLabels.back}>
        <ArrowLeft className="h-4 w-4" />
      </Button>
      <Vote className="h-6 w-6 text-blue-600" />
      <div>
        <h1 className="text-lg font-bold">Eleição de Liderança</h1>
        <p className="text-sm text-muted-foreground">{churchName || 'Igreja'}</p>
      </div>
    </div>

    <Badge variant="outline">
      {currentPosition + 1} / {totalPositions}
    </Badge>
  </div>
);

type NominationWaitingCardProps = {
  nominationCount: number;
  maxNominations: number;
};

export const NominationWaitingCard = ({
  nominationCount,
  maxNominations,
}: NominationWaitingCardProps) => (
  <Card className="border-blue-300 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/40">
    <CardContent className="p-8 text-center space-y-4">
      <div className="flex justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/50">
          <CheckCircle className="h-8 w-8 text-blue-600 dark:text-blue-300" />
        </div>
      </div>
      <h2 className="text-xl font-bold text-blue-900 dark:text-blue-100">
        {nominationCount === 1 ? 'Indicação Registrada!' : 'Indicações Registradas!'}
      </h2>
      <p className="text-blue-800 dark:text-blue-200">
        Você fez <strong>{nominationCount || 0}</strong> de <strong>{maxNominations || 1}</strong>{' '}
        indicações permitidas.
      </p>
      <p className="text-blue-800 dark:text-blue-200">Visualize na tela principal os indicados.</p>
      <p className="text-sm text-blue-700 dark:text-blue-300">
        Aguarde o administrador iniciar a votação para continuar.
      </p>
      <div className="flex items-center justify-center gap-2 pt-2 text-xs text-blue-600 dark:text-blue-300">
        <RefreshCw className="h-3 w-3 animate-spin" />
        <span>Atualizando automaticamente...</span>
      </div>
    </CardContent>
  </Card>
);

type VoteWaitingCardProps = {
  votedCandidateName: string;
  currentPositionName: string;
};

export const VoteWaitingCard = ({
  votedCandidateName,
  currentPositionName,
}: VoteWaitingCardProps) => (
  <Card className="border-green-300 bg-green-50 dark:border-green-900 dark:bg-green-950/40">
    <CardContent className="p-8 text-center space-y-4">
      <div className="flex justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/50">
          <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-300" />
        </div>
      </div>
      <h2 className="text-xl font-bold text-green-900 dark:text-green-100">Voto Registrado!</h2>
      <p className="text-lg text-green-800 dark:text-green-200">
        Você votou em <strong>{votedCandidateName}</strong> para{' '}
        <strong>{currentPositionName}</strong>.
      </p>
      <p className="text-sm text-green-700 dark:text-green-300">Aguarde a contagem de votos.</p>
      <div className="flex items-center justify-center gap-2 pt-2 text-xs text-green-600 dark:text-green-300">
        <RefreshCw className="h-3 w-3 animate-spin" />
        <span>Atualizando automaticamente...</span>
      </div>
    </CardContent>
  </Card>
);

type WinnerInfo = {
  name: string;
  votes: number;
  percentage: number;
};

type FinalCardWinnerProps = {
  winner: WinnerInfo;
  currentPositionName: string;
  expectedVoters: number | null;
};

export const FinalCardWinner = ({
  winner,
  currentPositionName,
  expectedVoters,
}: FinalCardWinnerProps) => (
  <Card className="border-purple-300 bg-purple-50">
    <CardContent className="p-8 text-center space-y-4">
      <div className="flex justify-center">
        <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
          <CheckCircle className="h-8 w-8 text-purple-600" />
        </div>
      </div>
      <h2 className="text-xl font-bold text-purple-900">Votação Finalizada!</h2>
      <p className="text-purple-800 text-lg leading-relaxed">
        O membro <strong>{winner.name}</strong> foi eleito para{' '}
        <strong>{currentPositionName}</strong> com <strong>{winner.percentage.toFixed(1)}%</strong>{' '}
        dos votos ({winner.votes} de {expectedVoters || winner.votes}).
      </p>
      <p className="text-sm text-purple-700">
        Aguarde o próximo cargo. O processo avançará automaticamente assim que o administrador
        prosseguir.
      </p>
      <div className="flex items-center justify-center gap-2 text-xs text-purple-600 pt-2">
        <RefreshCw className="h-3 w-3 animate-spin" />
        <span>Atualizando automaticamente...</span>
      </div>
    </CardContent>
  </Card>
);

type FinalCardNoWinnerProps = {
  currentPositionName: string;
};

export const FinalCardNoWinner = ({ currentPositionName }: FinalCardNoWinnerProps) => (
  <Card className="border-purple-300 bg-purple-50">
    <CardContent className="p-8 text-center space-y-4">
      <div className="flex justify-center">
        <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
          <CheckCircle className="h-8 w-8 text-purple-600" />
        </div>
      </div>
      <h2 className="text-xl font-bold text-purple-900">Votação Finalizada!</h2>
      <p className="text-purple-800 text-lg leading-relaxed">
        Todos os votos para <strong>{currentPositionName}</strong> foram registrados. Aguarde o
        próximo cargo.
      </p>
      <div className="flex items-center justify-center gap-2 text-xs text-purple-600 pt-2">
        <RefreshCw className="h-3 w-3 animate-spin" />
        <span>Atualizando automaticamente...</span>
      </div>
    </CardContent>
  </Card>
);

type PhaseStatusCardProps = {
  phase: string;
  title: string;
  description: string;
};

export const PhaseStatusCard = ({ phase, title, description }: PhaseStatusCardProps) => (
  <Card
    className={`${
      phase === 'nomination'
        ? 'border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30'
        : phase === 'voting'
          ? 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30'
          : phase === 'oral_observations'
            ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/30'
            : 'border-gray-200 bg-gray-50 dark:border-[var(--p7-border)] dark:bg-[var(--p7-surface-2)]'
    }`}
  >
    <CardContent className="p-4">
      <div className="flex items-center gap-2 mb-2">
        <Clock className="h-4 w-4" />
        <span className="font-semibold text-sm">{title}</span>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
    </CardContent>
  </Card>
);

type PositionInfoCardProps = {
  currentPositionName: string;
  currentPositionDescription?: string | null;
  candidatesCount: number;
  isNominationPhase: boolean;
  nominationCount: number;
  maxNominations: number;
};

export const PositionInfoCard = ({
  currentPositionName,
  currentPositionDescription,
  candidatesCount,
  isNominationPhase,
  nominationCount,
  maxNominations,
}: PositionInfoCardProps) => (
  <Card>
    <CardHeader className="pb-3">
      <CardTitle className="text-base font-semibold mb-2">{currentPositionName}</CardTitle>
      {currentPositionDescription && (
        <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
            {currentPositionDescription}
          </p>
        </div>
      )}
    </CardHeader>
    <CardContent>
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>{candidatesCount} candidato(s) elegível(is)</span>
        </div>
        {isNominationPhase && (
          <div className="flex items-center gap-2 text-sm">
            <Badge
              variant="outline"
              className="border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300"
            >
              {nominationCount || 0} / {maxNominations || 1} indicações
            </Badge>
          </div>
        )}
      </div>
    </CardContent>
  </Card>
);

type CandidatesSectionProps = {
  electionData: ElectionData;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  selectedCandidate: number | null;
  setSelectedCandidate: Dispatch<SetStateAction<number | null>>;
  submitting: boolean;
  handleRetry: () => void;
  handleNominateCandidate: (candidateId: number) => void;
  handleVote: (candidateId: number, phase: string) => void;
  toast: ToastFn;
};

export const CandidatesSection = ({
  electionData,
  searchTerm,
  setSearchTerm,
  selectedCandidate,
  setSelectedCandidate,
  submitting,
  handleRetry,
  handleNominateCandidate,
  handleVote,
  toast,
}: CandidatesSectionProps) => {
  if (electionData.candidates.length === 0) {
    return (
      <Card className="border-border/70 bg-card/95 shadow-sm">
        <CardContent className="p-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[1.2rem] bg-primary/10 text-primary">
            <Users className="h-7 w-7" />
          </div>
          <h3 className="mb-2 font-semibold">Nenhum candidato elegível</h3>
          <p className="mb-4 text-sm leading-6 text-muted-foreground">
            {electionData.phase === 'nomination'
              ? 'Ainda não há membros aptos para indicação neste cargo. Atualize a lista em instantes ou confirme as regras com a administração.'
              : 'Ainda não há candidatos liberados para votação neste cargo. Atualize a lista ou aguarde a próxima liberação.'}
          </p>
          <Button variant="outline" size="sm" onClick={handleRetry}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Recarregar lista
          </Button>
        </CardContent>
      </Card>
    );
  }

  const filteredCandidates = electionData.candidates
    .filter(
      (candidate) =>
        candidate &&
        candidate.name &&
        candidate.id &&
        candidate.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  const isNominationPhase = electionData.phase === 'nomination';

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-sm text-muted-foreground">
        {electionData.phase === 'nomination'
          ? (electionData.maxNominationsPerVoter || 1) > 1
            ? `Selecione até ${electionData.maxNominationsPerVoter} candidatos:`
            : 'Indique um candidato:'
          : 'Escolha um candidato:'}
      </h3>

      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar candidato pelo nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        {searchTerm && (
          <p className="text-xs text-muted-foreground mt-2">
            {
              electionData.candidates.filter(
                (c) => c.name && c.name.toLowerCase().includes(searchTerm.toLowerCase())
              ).length
            }{' '}
            candidato(s) encontrado(s)
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {filteredCandidates.map((candidate) => {
          const userNominations = Array.isArray(electionData.userNominations)
            ? electionData.userNominations
            : [];
          const maxNominations = electionData.maxNominationsPerVoter || 1;
          const nominationLimitReached = userNominations.length >= maxNominations;
          const isVotingPhase = electionData.phase === 'voting';
          const alreadyIndicated = isNominationPhase && userNominations.includes(candidate.id);
          const isNominationSelected = isNominationPhase && selectedCandidate === candidate.id;
          const cardActive = isNominationPhase
            ? alreadyIndicated || isNominationSelected
            : isVotingPhase && selectedCandidate === candidate.id;
          const cardClickable = isNominationPhase
            ? !submitting && (!nominationLimitReached || isNominationSelected)
            : isVotingPhase && !electionData.hasVoted && !submitting;

          return (
            <div
              key={candidate.id}
              className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                cardActive
                  ? 'border-blue-500 bg-blue-50 dark:border-blue-700 dark:bg-blue-950/30'
                  : 'border-gray-200 hover:border-gray-300 dark:border-[var(--p7-border)] dark:hover:border-[var(--v2-gold)]'
              } ${
                submitting
                  ? 'opacity-50 pointer-events-none'
                  : cardClickable
                    ? 'cursor-pointer'
                    : 'cursor-default'
              }`}
              onClick={() => {
                if (isNominationPhase) {
                  if (alreadyIndicated) {
                    setSelectedCandidate(candidate.id);
                    return;
                  }

                  if (nominationLimitReached && !isNominationSelected) {
                    toast({
                      title: 'Limite atingido',
                      description: `Você já indicou ${maxNominations} candidato(s) para este cargo.`,
                      variant: 'destructive',
                    });
                    return;
                  }

                  setSelectedCandidate((prev) => (prev === candidate.id ? null : candidate.id));
                } else if (cardClickable) {
                  setSelectedCandidate(candidate.id);
                }
              }}
            >
              <div className="flex flex-col h-full">
                <div className="flex flex-col items-center gap-2 mb-3">
                  <div className="flex items-center gap-2 w-full justify-center">
                    {(cardActive ||
                      (isVotingPhase ? candidate.votes > 0 : candidate.nominations > 0)) && (
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${
                          cardActive
                            ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-blue-200'
                            : 'bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {cardActive ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          <span className="text-xs font-semibold">
                            {isVotingPhase ? candidate.votes : candidate.nominations}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="flex-1 min-w-0 text-center">
                      <p className="font-bold text-base tracking-tight leading-tight break-words text-gray-900 dark:text-gray-100 sm:text-lg">
                        {candidate.name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-center">
                    {isNominationPhase && candidate.points > 0 && (
                      <Badge
                        variant="outline"
                        className="border-2 border-amber-300 bg-gradient-to-r from-amber-50 to-yellow-50 px-3 py-1 text-[11px] font-bold text-amber-700 shadow-sm transition-shadow hover:shadow-md dark:border-amber-900 dark:from-amber-950/40 dark:to-yellow-950/30 dark:text-amber-300"
                      >
                        <span>⭐ {candidate.points.toLocaleString('pt-BR')} pts</span>
                      </Badge>
                    )}
                    {isNominationPhase && alreadyIndicated && (
                      <Badge
                        variant="outline"
                        className="border-2 border-blue-400 bg-gradient-to-r from-blue-50 to-indigo-50 px-2.5 py-1 text-[10px] uppercase tracking-wide text-blue-700 shadow-sm dark:border-blue-900 dark:from-blue-950/40 dark:to-indigo-950/30 dark:text-blue-300"
                      >
                        ✓ Você indicou
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-2 mb-3">
                  {isVotingPhase && candidate.votes > 0 && (
                    <p className="text-xs font-medium text-green-600 dark:text-green-300">
                      {candidate.votes} votos ({candidate.percentage.toFixed(1)}%)
                    </p>
                  )}
                  {isNominationPhase && alreadyIndicated && (
                    <p className="text-xs font-medium text-blue-600 dark:text-blue-300">
                      Você indicou este membro.
                    </p>
                  )}
                  {isNominationPhase && !alreadyIndicated && nominationLimitReached && (
                    <p className="text-xs text-amber-600">Limite de indicações atingido.</p>
                  )}
                </div>

                {isNominationPhase && (
                  <div className="mt-auto space-y-2">
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNominateCandidate(candidate.id);
                      }}
                      disabled={
                        submitting ||
                        alreadyIndicated ||
                        nominationLimitReached ||
                        !isNominationSelected
                      }
                      className={`w-full text-xs ${
                        alreadyIndicated
                          ? 'border border-blue-200 bg-blue-100 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300'
                          : isNominationSelected
                            ? 'bg-blue-600 hover:bg-blue-700 text-white'
                            : 'bg-gray-100 text-gray-500 dark:bg-[var(--p7-surface-2)] dark:text-[var(--p7-text-3)]'
                      }`}
                    >
                      {alreadyIndicated
                        ? 'Indicado por você'
                        : isNominationSelected
                          ? 'Confirmar indicação'
                          : 'Indicar'}
                    </Button>
                    {!alreadyIndicated && nominationLimitReached && (
                      <p className="text-xs text-amber-600 text-center">
                        Limite de indicações atingido.
                      </p>
                    )}
                  </div>
                )}
                {isVotingPhase && !electionData.hasVoted && (
                  <div className="mt-auto">
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleVote(candidate.id, 'voting');
                      }}
                      disabled={submitting || selectedCandidate !== candidate.id}
                      className={`w-full text-xs ${
                        selectedCandidate === candidate.id
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-[var(--p7-surface-2)] dark:text-[var(--p7-text-2)] dark:hover:bg-[var(--p7-border)]'
                      }`}
                    >
                      Votar
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

type PositionDescriptionModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string | null;
};

export const PositionDescriptionModal = ({
  isOpen,
  onOpenChange,
  title,
  description,
}: PositionDescriptionModalProps) => (
  <Dialog open={isOpen} onOpenChange={onOpenChange}>
    <DialogContent className="mx-auto max-w-md border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 dark:border-blue-900 dark:from-blue-950/40 dark:to-indigo-950/30">
      <DialogHeader className="space-y-3">
        <div className="flex items-center justify-between">
          <DialogTitle className="text-lg font-semibold text-blue-900 dark:text-blue-100">
            {title}
          </DialogTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-100 hover:text-blue-800 dark:text-blue-300 dark:hover:bg-blue-900/50 dark:hover:text-blue-100"
            aria-label={ariaLabels.close}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </DialogHeader>
      <div className="space-y-4">
        <div className="rounded-lg border border-blue-200 bg-white/70 p-4 backdrop-blur-sm dark:border-blue-900 dark:bg-[var(--p7-card)]/90">
          <h3 className="mb-2 font-medium text-blue-900 dark:text-blue-100">
            Atribuições e Responsabilidades:
          </h3>
          <div className="leading-relaxed whitespace-pre-line text-blue-800 dark:text-blue-200">
            {description}
          </div>
        </div>
        <div className="flex justify-end">
          <Button
            onClick={() => onOpenChange(false)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Entendi
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
);
