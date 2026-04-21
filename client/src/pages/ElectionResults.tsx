import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  BarChart3,
  Users,
  Vote,
  Clock,
  CheckCircle,
  ArrowLeft,
  RefreshCw,
  Loader2,
  Trophy,
  Award,
} from 'lucide-react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { useTheme } from '@/contexts/ThemeContext';
import { V2PageStack, V2SectionCard } from '@/components/v2/V2Scaffold';
import { StatCard } from '@/components/v2/StatCard';
import { EmptyState } from '@/components/v2/EmptyState';
import { PrototypeShell } from './v2/PrototypeShell';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { electionLogger } from '@/lib/logger';
import { useTranslation } from 'react-i18next';

interface ElectionResult {
  positionId: string;
  positionName: string;
  totalVotes: number;
  totalNominations: number;
  results: {
    candidateId: number;
    candidateName: string;
    nominations: number;
    votes: number;
    percentage: number;
  }[];
  winner?: {
    candidateId: number;
    candidateName: string;
    nominations: number;
    votes: number;
    percentage: number;
  };
}

interface DashboardData {
  totalVoters: number;
  votedVoters: number;
  currentPosition: number;
  totalPositions: number;
  isActive: boolean;
  positions: ElectionResult[];
}

export default function ElectionResults() {
  const { user } = useAuth();
  const { skin } = useTheme();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { configId } = useParams();
  const { t } = useTranslation();

  const [autoRefresh, setAutoRefresh] = useState(true);

  const { data: dashboardData = null, isLoading: loading } = useQuery<DashboardData | null>({
    queryKey: ['election-results', configId],
    queryFn: async () => {
      electionLogger.debug('Loading dashboard data for configId:', configId);
      const response = await fetch(`/api/elections/dashboard/${configId}`, {
        headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
      });

      if (response.ok) {
        const data = await response.json();
        electionLogger.debug('Dashboard data:', data);
        return data;
      }

      if (response.status === 404) {
        const errorData = await response.json();
        toast({
          title: t('electionResults.noActiveElection'),
          description: errorData.error || t('electionResults.noActiveElectionDesc'),
          variant: 'destructive',
        });
        navigate('/election-dashboard');
        return null;
      }

      throw new Error('Erro ao carregar dashboard');
    },
    enabled: !!configId,
    refetchInterval: autoRefresh ? 5000 : false,
    staleTime: 3000,
    meta: {
      onError: () => {
        toast({
          title: t('electionResults.error'),
          description: t('electionResults.nominationResultsError'),
          variant: 'destructive',
        });
      },
    },
  });

  const getProgressPercentage = () => {
    if (!dashboardData) return 0;
    return (dashboardData.currentPosition / dashboardData.totalPositions) * 100;
  };

  const getVoterTurnout = () => {
    if (!dashboardData) return 0;
    return (dashboardData.votedVoters / dashboardData.totalVoters) * 100;
  };

  if (loading) {
    if (skin === 'v2') {
      return (
        <PrototypeShell
          label={t('electionResults.dashboardTitle')}
          title={t('electionResults.subtitle')}
          userName={user?.name}
        >
          <div className="p7-section">
            <V2PageStack>
              <V2SectionCard title={t('electionResults.dashboardTitle')}>
                <div className="flex min-h-[220px] items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              </V2SectionCard>
            </V2PageStack>
          </div>
        </PrototypeShell>
      );
    }
    return (
      <MobileLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </MobileLayout>
    );
  }

  if (!dashboardData) {
    if (skin === 'v2') {
      return (
        <PrototypeShell
          label={t('electionResults.dashboardTitle')}
          title={t('electionResults.noActiveNomination')}
          userName={user?.name}
        >
          <div className="p7-section">
            <V2PageStack>
              <V2SectionCard
                title={t('electionResults.noActiveNomination')}
                action={
                  <Button variant="outline" onClick={() => navigate('/election-dashboard')}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {t('electionResults.back')}
                  </Button>
                }
              >
                <EmptyState
                  illustration={<BarChart3 className="h-7 w-7" />}
                  title={t('electionResults.noActiveNomination')}
                  copy={t('electionResults.noActiveNominationDesc')}
                />
              </V2SectionCard>
            </V2PageStack>
          </div>
        </PrototypeShell>
      );
    }
    return (
      <MobileLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="outline"
              onClick={() => navigate('/election-dashboard')}
              className="flex items-center"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('electionResults.back')}
            </Button>
          </div>

          <Card>
            <CardContent className="p-8 text-center">
              <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {t('electionResults.noActiveNomination')}
              </h3>
              <p className="text-muted-foreground">{t('electionResults.noActiveNominationDesc')}</p>
            </CardContent>
          </Card>
        </div>
      </MobileLayout>
    );
  }

  if (skin === 'v2') {
    return (
      <PrototypeShell
        label={t('electionResults.dashboardTitle')}
        title={t('electionResults.subtitle')}
        userName={user?.name}
      >
        <div className="p7-section">
          <V2PageStack>
            <V2SectionCard
              title={t('electionResults.dashboardTitle')}
              subtitle={t('electionResults.subtitle')}
              action={
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => navigate('/election-dashboard')}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {t('electionResults.back')}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setAutoRefresh(!autoRefresh)}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
                    {autoRefresh ? t('electionResults.pause') : t('electionResults.refresh')}
                  </Button>
                </div>
              }
            >
              <div className="grid gap-3 md:grid-cols-4">
                <StatCard
                  value={dashboardData.totalVoters}
                  label={t('electionResults.totalVoters')}
                  tone="navy"
                />
                <StatCard
                  value={dashboardData.votedVoters}
                  label={t('electionResults.voted')}
                  tone="gold"
                />
                <StatCard
                  value={`${getVoterTurnout().toFixed(0)}%`}
                  label={t('electionResults.turnout')}
                  tone="soft"
                />
                <StatCard
                  value={`${dashboardData.currentPosition + 1}/${dashboardData.totalPositions}`}
                  label={t('electionResults.progress')}
                  tone="red"
                />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="mr-2 h-5 w-5" />
                    {t('electionResults.dashboardTitle')}
                  </CardTitle>
                  <CardDescription>{t('electionResults.subtitle')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Users className="h-4 w-4 text-blue-600" />
                      <span className="text-xs font-medium sm:text-sm">
                        {t('electionResults.totalVoters')}
                      </span>
                      <Badge variant="secondary">{dashboardData.totalVoters}</Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Vote className="h-4 w-4 text-green-600" />
                      <span className="text-xs font-medium sm:text-sm">
                        {t('electionResults.voted')}
                      </span>
                      <Badge variant="secondary">{dashboardData.votedVoters}</Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Clock className="h-4 w-4 text-orange-600 dark:text-orange-300" />
                      <span className="text-xs font-medium sm:text-sm">
                        {t('electionResults.currentPosition')}
                      </span>
                      <Badge variant="secondary">
                        {dashboardData.currentPosition + 1}/{dashboardData.totalPositions}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="mb-2 flex justify-between text-sm">
                        <span>{t('electionResults.progress')}</span>
                        <span>{getProgressPercentage().toFixed(0)}%</span>
                      </div>
                      <Progress value={getProgressPercentage()} className="h-2" />
                    </div>
                    <div>
                      <div className="mb-2 flex justify-between text-sm">
                        <span>{t('electionResults.turnout')}</span>
                        <span>{getVoterTurnout().toFixed(0)}%</span>
                      </div>
                      <Progress value={getVoterTurnout()} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </V2SectionCard>

            <V2SectionCard title={t('electionResults.votesPlural')}>
              <div className="space-y-6">
                {(dashboardData.positions || []).map((position, index) => (
                  <Card
                    key={position.positionId}
                    className={
                      index < dashboardData.currentPosition
                        ? 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30'
                        : ''
                    }
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center">
                          {index < dashboardData.currentPosition ? (
                            <CheckCircle className="mr-2 h-5 w-5 text-green-600 dark:text-green-300" />
                          ) : index === dashboardData.currentPosition ? (
                            <Clock className="mr-2 h-5 w-5 text-orange-600 dark:text-orange-300" />
                          ) : (
                            <Clock className="mr-2 h-5 w-5 text-gray-400" />
                          )}
                          {position.positionName}
                        </div>
                        <Badge
                          variant={index < dashboardData.currentPosition ? 'default' : 'secondary'}
                        >
                          {index < dashboardData.currentPosition
                            ? t('electionResults.completed')
                            : index === dashboardData.currentPosition
                              ? t('electionResults.inProgress')
                              : t('electionResults.pending')}
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        {position.totalNominations > 0 &&
                          `${position.totalNominations} ${t('electionResults.nominations')} • `}
                        {position.totalVotes > 0
                          ? t('electionResults.votesRegistered', { count: position.totalVotes })
                          : t('electionResults.noVotesRegistered')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {position.results.length > 0 ? (
                        <div className="space-y-3">
                          {position.results
                            .sort((a, b) => b.votes - a.votes)
                            .map((result, resultIndex) => (
                              <div
                                key={result.candidateId}
                                className="flex items-center justify-between rounded-lg border p-3"
                              >
                                <div className="flex items-center space-x-3">
                                  {resultIndex === 0 && result.votes > 0 && (
                                    <Trophy className="h-5 w-5 text-yellow-500 dark:text-yellow-300" />
                                  )}
                                  <div>
                                    <p className="font-medium">{result.candidateName}</p>
                                    <div className="space-y-1 text-sm text-muted-foreground">
                                      {result.nominations > 0 && (
                                        <p>
                                          📝 {result.nominations}{' '}
                                          {result.nominations !== 1
                                            ? t('electionResults.nominationsPlural')
                                            : t('electionResults.nominationSingular')}
                                        </p>
                                      )}
                                      {result.votes > 0 && (
                                        <p>
                                          🗳️ {result.votes}{' '}
                                          {result.votes !== 1
                                            ? t('electionResults.votesPlural')
                                            : t('electionResults.voteSingular')}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-sm font-medium">
                                      {result.percentage.toFixed(1)}%
                                    </span>
                                    {resultIndex === 0 && result.votes > 0 && (
                                      <Award className="h-4 w-4 text-yellow-500 dark:text-yellow-300" />
                                    )}
                                  </div>
                                  <Progress value={result.percentage} className="mt-1 h-2 w-20" />
                                </div>
                              </div>
                            ))}
                          {position.winner && (
                            <div className="mt-4 rounded-lg border border-green-200 bg-green-100 p-4 dark:border-green-900 dark:bg-green-950/40">
                              <div className="flex items-center space-x-2">
                                <Trophy className="h-5 w-5 text-green-600 dark:text-green-300" />
                                <span className="font-semibold text-green-800 dark:text-green-200">
                                  {t('electionResults.nominated')}: {position.winner.candidateName}
                                </span>
                              </div>
                              <p className="mt-1 text-sm text-green-700 dark:text-green-300">
                                {position.winner.votes} {t('electionResults.votesPlural')} (
                                {position.winner.percentage.toFixed(1)}%)
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="py-8 text-center text-muted-foreground">
                          <Vote className="mx-auto mb-2 h-8 w-8" />
                          <p>{t('electionResults.noVotesForPosition')}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </V2SectionCard>
          </V2PageStack>
        </div>
      </PrototypeShell>
    );
  }

  return (
    <MobileLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="outline"
            onClick={() => navigate('/election-dashboard')}
            className="flex items-center"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('electionResults.back')}
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setAutoRefresh(!autoRefresh)}>
              <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
              {autoRefresh ? t('electionResults.pause') : t('electionResults.refresh')}
            </Button>
          </div>
        </div>

        {/* Status da Nomeação */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              {t('electionResults.dashboardTitle')}
            </CardTitle>
            <CardDescription>{t('electionResults.subtitle')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4">
              <div className="flex items-center space-x-2 flex-wrap">
                <Users className="h-4 w-4 text-blue-600 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium">
                  {t('electionResults.totalVoters')}
                </span>
                <Badge variant="secondary">{dashboardData.totalVoters}</Badge>
              </div>

              <div className="flex items-center space-x-2 flex-wrap">
                <Vote className="h-4 w-4 text-green-600 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium">{t('electionResults.voted')}</span>
                <Badge variant="secondary">{dashboardData.votedVoters}</Badge>
              </div>

              <div className="flex items-center space-x-2 flex-wrap">
                <Clock className="h-4 w-4 text-orange-600 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium">
                  {t('electionResults.progress')}
                </span>
                <Badge variant="secondary">
                  {dashboardData.currentPosition}/{dashboardData.totalPositions}
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{t('electionResults.voterTurnout')}</span>
                <span>{getVoterTurnout().toFixed(1)}%</span>
              </div>
              <Progress value={getVoterTurnout()} className="h-2" />
            </div>

            <div className="space-y-2 mt-4">
              <div className="flex justify-between text-sm">
                <span>{t('electionResults.nominationProgress')}</span>
                <span>{getProgressPercentage().toFixed(1)}%</span>
              </div>
              <Progress value={getProgressPercentage()} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Resultados por Posição */}
        <div className="space-y-6">
          {(dashboardData.positions || []).map((position, index) => (
            <Card
              key={position.positionId}
              className={
                index < dashboardData.currentPosition
                  ? 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30'
                  : ''
              }
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    {index < dashboardData.currentPosition ? (
                      <CheckCircle className="h-5 w-5 mr-2 text-green-600 dark:text-green-300" />
                    ) : index === dashboardData.currentPosition ? (
                      <Clock className="h-5 w-5 mr-2 text-orange-600 dark:text-orange-300" />
                    ) : (
                      <Clock className="h-5 w-5 mr-2 text-gray-400" />
                    )}
                    {position.positionName}
                  </div>
                  <Badge variant={index < dashboardData.currentPosition ? 'default' : 'secondary'}>
                    {index < dashboardData.currentPosition
                      ? t('electionResults.completed')
                      : index === dashboardData.currentPosition
                        ? t('electionResults.inProgress')
                        : t('electionResults.pending')}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  {position.totalNominations > 0 &&
                    `${position.totalNominations} ${t('electionResults.nominations')} • `}
                  {position.totalVotes > 0
                    ? t('electionResults.votesRegistered', { count: position.totalVotes })
                    : t('electionResults.noVotesRegistered')}
                </CardDescription>
              </CardHeader>

              <CardContent>
                {position.results.length > 0 ? (
                  <div className="space-y-3">
                    {position.results
                      .sort((a, b) => b.votes - a.votes)
                      .map((result, resultIndex) => (
                        <div
                          key={result.candidateId}
                          className="flex items-center justify-between p-3 rounded-lg border"
                        >
                          <div className="flex items-center space-x-3">
                            {resultIndex === 0 && result.votes > 0 && (
                              <Trophy className="h-5 w-5 text-yellow-500 dark:text-yellow-300" />
                            )}
                            <div>
                              <p className="font-medium">{result.candidateName}</p>
                              <div className="text-sm text-muted-foreground space-y-1">
                                {result.nominations > 0 && (
                                  <p>
                                    📝 {result.nominations}{' '}
                                    {result.nominations !== 1
                                      ? t('electionResults.nominationsPlural')
                                      : t('electionResults.nominationSingular')}
                                  </p>
                                )}
                                {result.votes > 0 && (
                                  <p>
                                    🗳️ {result.votes}{' '}
                                    {result.votes !== 1
                                      ? t('electionResults.votesPlural')
                                      : t('electionResults.voteSingular')}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium">
                                {result.percentage.toFixed(1)}%
                              </span>
                              {resultIndex === 0 && result.votes > 0 && (
                                <Award className="h-4 w-4 text-yellow-500 dark:text-yellow-300" />
                              )}
                            </div>
                            <Progress value={result.percentage} className="w-20 h-2 mt-1" />
                          </div>
                        </div>
                      ))}

                    {position.winner && (
                      <div className="mt-4 rounded-lg border border-green-200 bg-green-100 p-4 dark:border-green-900 dark:bg-green-950/40">
                        <div className="flex items-center space-x-2">
                          <Trophy className="h-5 w-5 text-green-600 dark:text-green-300" />
                          <span className="font-semibold text-green-800 dark:text-green-200">
                            {t('electionResults.nominated')}: {position.winner.candidateName}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-green-700 dark:text-green-300">
                          {position.winner.votes} {t('electionResults.votesPlural')} (
                          {position.winner.percentage.toFixed(1)}%)
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Vote className="h-8 w-8 mx-auto mb-2" />
                    <p>{t('electionResults.noVotesForPosition')}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </MobileLayout>
  );
}
