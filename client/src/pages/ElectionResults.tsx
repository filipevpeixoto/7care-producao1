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
  const { user: _user } = useAuth();
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
    return (
      <MobileLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </MobileLayout>
    );
  }

  if (!dashboardData) {
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
              <h3 className="text-lg font-semibold mb-2">{t('electionResults.noActiveNomination')}</h3>
              <p className="text-muted-foreground">{t('electionResults.noActiveNominationDesc')}</p>
            </CardContent>
          </Card>
        </div>
      </MobileLayout>
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
                <span className="text-xs sm:text-sm font-medium">{t('electionResults.totalVoters')}</span>
                <Badge variant="secondary">{dashboardData.totalVoters}</Badge>
              </div>

              <div className="flex items-center space-x-2 flex-wrap">
                <Vote className="h-4 w-4 text-green-600 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium">{t('electionResults.voted')}</span>
                <Badge variant="secondary">{dashboardData.votedVoters}</Badge>
              </div>

              <div className="flex items-center space-x-2 flex-wrap">
                <Clock className="h-4 w-4 text-orange-600 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium">{t('electionResults.progress')}</span>
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
                index < dashboardData.currentPosition ? 'border-green-200 bg-green-50' : ''
              }
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    {index < dashboardData.currentPosition ? (
                      <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                    ) : index === dashboardData.currentPosition ? (
                      <Clock className="h-5 w-5 mr-2 text-orange-600" />
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
                  {position.totalNominations > 0 && `${position.totalNominations} ${t('electionResults.nominations')} • `}
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
                              <Trophy className="h-5 w-5 text-yellow-500" />
                            )}
                            <div>
                              <p className="font-medium">{result.candidateName}</p>
                              <div className="text-sm text-muted-foreground space-y-1">
                                {result.nominations > 0 && (
                                  <p>
                                    📝 {result.nominations} {result.nominations !== 1 ? t('electionResults.nominationsPlural') : t('electionResults.nominationSingular')}
                                  </p>
                                )}
                                {result.votes > 0 && (
                                  <p>
                                    🗳️ {result.votes} {result.votes !== 1 ? t('electionResults.votesPlural') : t('electionResults.voteSingular')}
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
                                <Award className="h-4 w-4 text-yellow-500" />
                              )}
                            </div>
                            <Progress value={result.percentage} className="w-20 h-2 mt-1" />
                          </div>
                        </div>
                      ))}

                    {position.winner && (
                      <div className="mt-4 p-4 bg-green-100 border border-green-200 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <Trophy className="h-5 w-5 text-green-600" />
                          <span className="font-semibold text-green-800">
                            {t('electionResults.nominated')}: {position.winner.candidateName}
                          </span>
                        </div>
                        <p className="text-sm text-green-700 mt-1">
                          {position.winner.votes} {t('electionResults.votesPlural')} ({position.winner.percentage.toFixed(1)}%)
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
