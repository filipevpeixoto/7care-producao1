import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Vote, Users, ArrowRight, AlertCircle, Loader2, Church, Calendar } from 'lucide-react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { useTheme } from '@/contexts/ThemeContext';
import { V2PageStack, V2SectionCard } from '@/components/v2/V2Scaffold';
import { StatCard } from '@/components/v2/StatCard';
import { EmptyState } from '@/components/v2/EmptyState';
import { PrototypeShell } from './v2/PrototypeShell';
import { fetchWithAuth } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

interface ActiveElection {
  election_id: number;
  config_id: number;
  church_name: string;
  status: string;
  current_position: number;
  positions: string[];
  voters: number[];
  created_at: string;
}

export default function ElectionVoting() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { skin } = useTheme();

  const { data: activeElections = [], isLoading: loading } = useQuery<ActiveElection[]>({
    queryKey: ['elections-active', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await fetchWithAuth('/api/elections/active', {
        headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
      });
      if (!response.ok) return [];
      const data = await response.json();
      return data.elections || [];
    },
    enabled: !!user?.id,
    staleTime: 10_000,
    refetchOnWindowFocus: true,
  });

  const handleAccessElection = (election: ActiveElection) => {
    // Redirecionar para a interface de votação mobile usando config_id
    window.location.assign(`/election-vote/${election.config_id}`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    if (skin === 'v2') {
      return (
        <PrototypeShell
          label={t('electionVoting.title')}
          title={t('electionVoting.subtitle')}
          userName={user?.name}
        >
          <div className="p7-section">
            <V2PageStack>
              <V2SectionCard title={t('electionVoting.title')}>
                <div className="flex min-h-[220px] items-center justify-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span>{t('electionVoting.loadingNominations')}</span>
                </div>
              </V2SectionCard>
            </V2PageStack>
          </div>
        </PrototypeShell>
      );
    }
    return (
      <MobileLayout>
        <div className="p-4 flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">{t('electionVoting.loadingNominations')}</span>
        </div>
      </MobileLayout>
    );
  }

  if (skin === 'v2') {
    return (
      <PrototypeShell
        label={t('electionVoting.title')}
        title={t('electionVoting.subtitle')}
        userName={user?.name}
      >
        <div className="p7-section">
          <V2PageStack>
            <V2SectionCard
              title={t('electionVoting.title')}
              subtitle={t('electionVoting.subtitle')}
            >
              {activeElections.length > 0 ? (
                <div className="mb-4 grid gap-3 md:grid-cols-3">
                  <StatCard
                    value={activeElections.length}
                    label={t('electionVoting.activeNomination')}
                    tone="navy"
                  />
                  <StatCard
                    value={activeElections.reduce(
                      (sum, election) => sum + election.voters.length,
                      0
                    )}
                    label={t('electionVoting.voters')}
                    tone="gold"
                  />
                  <StatCard
                    value={activeElections.reduce(
                      (sum, election) => sum + election.positions.length,
                      0
                    )}
                    label={t('electionVoting.positions')}
                    tone="soft"
                  />
                </div>
              ) : null}

              {activeElections.length === 0 ? (
                <EmptyState
                  illustration={<AlertCircle className="h-7 w-7" />}
                  title={t('electionVoting.noNominations')}
                  copy={
                    !user?.id ? t('electionVoting.loginRequired') : t('electionVoting.notIncluded')
                  }
                  cta={
                    !user?.id
                      ? {
                          label: t('electionVoting.login'),
                          onClick: () => window.location.assign('/login'),
                        }
                      : undefined
                  }
                />
              ) : (
                <div className="space-y-4">
                  {activeElections.map((election) => (
                    <Card key={election.election_id} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <Church className="h-6 w-6 text-blue-600" />
                            <div>
                              <CardTitle className="text-lg">{election.church_name}</CardTitle>
                              <CardDescription className="flex items-center gap-2 mt-1">
                                <Calendar className="h-4 w-4" />
                                {t('electionVoting.startedAt')} {formatDate(election.created_at)}
                              </CardDescription>
                            </div>
                          </div>
                          <Badge className="border border-blue-200 bg-blue-100 text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
                            {t('electionVoting.activeNomination')}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>{t('electionVoting.currentPosition')}</span>
                            <span>
                              {t('electionVoting.positionOf', {
                                current: election.current_position + 1,
                                total: election.positions.length,
                              })}
                            </span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-[var(--p7-border)]">
                            <div
                              className="h-2 rounded-full bg-blue-600 transition-all duration-500 dark:bg-blue-400"
                              style={{
                                width: `${((election.current_position + 1) / election.positions.length) * 100}%`,
                              }}
                            ></div>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {election.positions[election.current_position] ||
                              t('electionVoting.waitingToStart')}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">
                              {election.voters.length}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {t('electionVoting.voters')}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">
                              {election.positions.length}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {t('electionVoting.positions')}
                            </div>
                          </div>
                        </div>
                        <Button
                          onClick={() => handleAccessElection(election)}
                          className="w-full bg-blue-600 hover:bg-blue-700"
                          size="lg"
                        >
                          <ArrowRight className="h-5 w-5 mr-2" />
                          {t('electionVoting.accessNomination')}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </V2SectionCard>
            <V2SectionCard
              title={t('electionVoting.howToParticipate')}
              subtitle={t('electionVoting.subtitle')}
            >
              <div className="text-[var(--p7-text-2)] space-y-2">
                <p>
                  <strong>1.</strong> {t('electionVoting.step1')}
                </p>
                <p>
                  <strong>2.</strong> {t('electionVoting.step2')}
                </p>
                <p>
                  <strong>3.</strong> {t('electionVoting.step3')}
                </p>
                <p>
                  <strong>4.</strong> {t('electionVoting.step4')}
                </p>
              </div>
            </V2SectionCard>
          </V2PageStack>
        </div>
      </PrototypeShell>
    );
  }

  return (
    <MobileLayout>
      <div className="p-4 space-y-6">
        <>
          <div className="flex items-center gap-3">
            <Vote className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold">{t('electionVoting.title')}</h1>
              <p className="text-muted-foreground">{t('electionVoting.subtitle')}</p>
            </div>
          </div>

          {activeElections.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <AlertCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h2 className="text-xl font-semibold mb-2">{t('electionVoting.noNominations')}</h2>
                <p className="text-muted-foreground mb-4">
                  {!user?.id ? t('electionVoting.loginRequired') : t('electionVoting.notIncluded')}
                </p>
                {!user?.id && (
                  <Button
                    onClick={() => window.location.assign('/login')}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {t('electionVoting.login')}
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {activeElections.map((election) => (
                <Card key={election.election_id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Church className="h-6 w-6 text-blue-600" />
                        <div>
                          <CardTitle className="text-lg">{election.church_name}</CardTitle>
                          <CardDescription className="flex items-center gap-2 mt-1">
                            <Calendar className="h-4 w-4" />
                            {t('electionVoting.startedAt')} {formatDate(election.created_at)}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge className="border border-blue-200 bg-blue-100 text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
                        {t('electionVoting.activeNomination')}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{t('electionVoting.currentPosition')}</span>
                        <span>
                          {t('electionVoting.positionOf', {
                            current: election.current_position + 1,
                            total: election.positions.length,
                          })}
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-[var(--p7-border)]">
                        <div
                          className="h-2 rounded-full bg-blue-600 transition-all duration-500 dark:bg-blue-400"
                          style={{
                            width: `${((election.current_position + 1) / election.positions.length) * 100}%`,
                          }}
                        ></div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {election.positions[election.current_position] ||
                          t('electionVoting.waitingToStart')}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {election.voters.length}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {t('electionVoting.voters')}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {election.positions.length}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {t('electionVoting.positions')}
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={() => handleAccessElection(election)}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      size="lg"
                    >
                      <ArrowRight className="h-5 w-5 mr-2" />
                      {t('electionVoting.accessNomination')}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
                <Users className="h-5 w-5" />
                {t('electionVoting.howToParticipate')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-blue-700 dark:text-blue-200">
                <p>
                  <strong>1.</strong> {t('electionVoting.step1')}
                </p>
                <p>
                  <strong>2.</strong> {t('electionVoting.step2')}
                </p>
                <p>
                  <strong>3.</strong> {t('electionVoting.step3')}
                </p>
                <p>
                  <strong>4.</strong> {t('electionVoting.step4')}
                </p>
              </div>
            </CardContent>
          </Card>
        </>
      </div>
    </MobileLayout>
  );
}
