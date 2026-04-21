import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DialogWithModalTracking,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Trophy, Mountain, RefreshCw, AlertCircle, Crown } from 'lucide-react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import { hasAdminAccess } from '@/lib/permissions';
import { PrototypeAvatar, PrototypeStatusBar } from './v2/prototypeShared';
import { ThemeToggle } from '@/components/v2/ThemeToggle';
import { PointsBreakdown } from '@/components/gamification/PointsBreakdown';

import { MountainJourney } from '@/components/gamification/MountainJourney';
import { usePointsCalculation } from '@/hooks/usePointsCalculation';
import {
  getLevelByPoints,
  getMountName,
  getLevelIcon,
  getLevelColor,
  getNextLevel,
  getProgressToNextLevel,
  getPointsToNextLevel,
} from '@/lib/gamification';
import { MountIcon } from '@/components/ui/mount-icon';
import { useUserPoints } from '@/hooks/useUserPoints';

const CommunityRankingV2 = ({ currentUserId }: { currentUserId?: number | string }) => {
  const { calculateAllUsersPoints, isLoading, error } = usePointsCalculation();

  const allUsers = calculateAllUsersPoints()
    .filter((entry) => typeof entry.calculatedPoints === 'number')
    .sort((left, right) => (right.calculatedPoints || 0) - (left.calculatedPoints || 0));

  const ranking = allUsers.slice(0, 5);
  const currentUserRank = currentUserId
    ? allUsers.findIndex((entry) => String(entry.id) === String(currentUserId)) + 1
    : 0;

  if (isLoading) {
    return (
      <div className="p7-card p7-card-p">
        <div className="space-y-3">
          <div className="h-4 w-28 rounded-full bg-[var(--p7-surface-2)]" />
          <div className="h-16 rounded-[18px] bg-[var(--p7-surface-2)]" />
          <div className="h-16 rounded-[18px] bg-[var(--p7-surface-2)]" />
          <div className="h-16 rounded-[18px] bg-[var(--p7-surface-2)]" />
        </div>
      </div>
    );
  }

  if (error || ranking.length === 0) {
    return null;
  }

  return (
    <div className="p7-card p7-card-p" data-tour="gamification-ranking">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="mb-1 text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-[var(--v2-gold)]">
            Ranking
          </div>
          <div className="text-[0.95rem] font-semibold text-[var(--p7-text)]">Top comunidade</div>
          <p className="mt-1 text-[0.78rem] leading-[1.5] text-[var(--p7-text-3)]">
            Visão rápida dos membros com maior pontuação acumulada neste momento.
          </p>
        </div>
        {currentUserRank > 0 ? <span className="p7-pill soft">Você #{currentUserRank}</span> : null}
      </div>

      <div className="space-y-2">
        {ranking.map((entry, index) => (
          <div
            key={entry.id}
            className="flex items-center gap-3 rounded-[18px] border border-[var(--p7-border)] bg-[var(--p7-surface-2)] px-3 py-3"
          >
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                index === 0
                  ? 'bg-[var(--grad-gold)] text-[var(--v2-navy-strong)]'
                  : index === 1
                    ? 'bg-[color-mix(in_oklab,var(--v2-blue)_14%,white)] text-[var(--v2-blue)]'
                    : 'bg-[color-mix(in_oklab,var(--v2-blue)_8%,transparent)] text-[var(--p7-text-2)]'
              }`}
            >
              {index + 1}
            </div>

            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-[var(--p7-text)]">
                {entry.name}
              </div>
              <div className="mt-0.5 text-[0.74rem] text-[var(--p7-text-3)]">
                {getMountName(entry.calculatedPoints || 0)}
              </div>
            </div>

            <div className="text-right">
              <div className="text-sm font-semibold text-[var(--p7-text)]">
                {entry.calculatedPoints} pts
              </div>
              <div className="text-[0.72rem] text-[var(--p7-text-3)]">{entry.role || 'membro'}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function Gamification() {
  const { t } = useTranslation();
  const { skin } = useTheme();
  const { user } = useAuth();
  const { data, isLoading, error, refetch } = useUserPoints();
  const [activeTab, setActiveTab] = useState('my-progress');
  const [isIconModalOpen, setIsIconModalOpen] = useState(false);

  const renderV2State = ({
    eyebrow,
    title,
    description,
    action,
  }: {
    eyebrow: string;
    title: string;
    description: string;
    action?: ReactNode;
  }) => (
    <MobileLayout variant="prototype">
      <div className="p7-shell">
        <div className="p7-screen">
          <PrototypeStatusBar />
          <div className="p7-grad-header">
            <div className="p7-header-row">
              <div>
                <div className="p7-header-label">{eyebrow}</div>
                <div className="p7-header-title">{title}</div>
              </div>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <PrototypeAvatar name={user?.name} className="h-9 w-9 text-[0.8rem]" />
              </div>
            </div>
          </div>

          <div className="p7-scroll">
            <div className="p7-section pb-4">
              <div className="p7-card p7-card-p">
                <div className="mb-1 text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-[var(--v2-gold)]">
                  Leitura rápida
                </div>
                <p className="mb-4 text-[0.84rem] leading-[1.58] text-[var(--p7-text-2)]">
                  {description}
                </p>
                {action}
              </div>
            </div>
          </div>
        </div>
      </div>
    </MobileLayout>
  );

  // Loading state
  if (isLoading) {
    if (skin === 'v2') {
      return renderV2State({
        eyebrow: 'Jornada',
        title: 'Pontuação',
        description:
          'Estamos reunindo sua pontuação e os próximos marcos da caminhada para mostrar tudo em uma leitura mais clara.',
        action: (
          <div className="flex items-center gap-3 rounded-[18px] border border-[var(--p7-border)] bg-[var(--p7-surface-2)] px-4 py-4">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[color-mix(in_oklab,var(--v2-gold)_22%,transparent)] border-t-[var(--v2-gold)]" />
            <span className="text-sm font-medium text-[var(--p7-text)]">
              {t('gamification.loadingScore', { defaultValue: 'Carregando pontuação' })}
            </span>
          </div>
        ),
      });
    }

    return (
      <MobileLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">
              {t('gamification.loadingScore', { defaultValue: 'Carregando pontuação' })}
            </p>
          </div>
        </div>
      </MobileLayout>
    );
  }

  // Error state
  if (error || !data) {
    if (skin === 'v2') {
      return renderV2State({
        eyebrow: 'Jornada',
        title: 'Pontuação',
        description:
          'Não conseguimos montar sua jornada agora. Revise a conexão e tente novamente para recuperar seus marcos e pontos.',
        action: (
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--grad-h)] px-4 py-2 text-sm font-semibold text-white shadow-[var(--shadow-card)] transition-transform duration-200 hover:scale-[1.01]"
          >
            <RefreshCw className="h-4 w-4" />
            Tentar novamente
          </button>
        ),
      });
    }

    return (
      <MobileLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              {error ||
                t('gamification.errorLoadingScore', { defaultValue: 'Erro ao carregar pontuação' })}
            </p>
            <Button onClick={() => refetch()} className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Tentar novamente
            </Button>
          </div>
        </div>
      </MobileLayout>
    );
  }

  const { total, breakdown, userData } = data;
  const currentLevel = getLevelByPoints(total);
  const nextLevel = getNextLevel(total);
  const progress = getProgressToNextLevel(total);
  const pointsToNext = getPointsToNextLevel(total);
  const ringProgress = nextLevel ? Math.max(0, Math.min(progress, 100)) : 100;
  const ringRadius = 58;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference - (ringProgress / 100) * ringCircumference;
  const canSeeRanking = hasAdminAccess(user);
  const gamificationSummary = nextLevel
    ? `${pointsToNext} pontos separam você do próximo marco espiritual.`
    : 'Você alcançou o topo atual da jornada e já concluiu o ciclo principal.';

  if (skin === 'v2') {
    return (
      <MobileLayout variant="prototype">
        <div className="p7-shell">
          <div className="p7-screen">
            <PrototypeStatusBar />
            <div className="p7-grad-header">
              <div className="p7-header-row">
                <div>
                  <div className="p7-header-label">{t('gamification.myScore')}</div>
                  <div className="p7-header-title">{getMountName(total)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <ThemeToggle />
                  <PrototypeAvatar name={user?.name} className="h-9 w-9 text-[0.8rem]" />
                </div>
              </div>
            </div>

            <div className="p7-scroll">
              <div className="p7-section">
                <div className="grid grid-cols-3 gap-2">
                  <div className="p7-stat-card navy">
                    <div className="p7-stat-num">{total}</div>
                    <div className="p7-stat-label">{t('gamification.currentPoints')}</div>
                  </div>
                  <div className="p7-stat-card glass">
                    <div className="p7-stat-num dark text-base">{currentLevel.name}</div>
                    <div className="p7-stat-label dark">{t('gamification.myProgress')}</div>
                  </div>
                  <div className="p7-stat-card gold">
                    <div className="p7-stat-num">{nextLevel ? pointsToNext : '∞'}</div>
                    <div className="p7-stat-label">
                      {nextLevel
                        ? t('gamification.pointsRemaining')
                        : t('gamification.maxStatusReached')}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p7-section">
                <div className="p7-card p7-card-p">
                  <div className="mb-1 text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-[var(--v2-gold)]">
                    Leitura rápida
                  </div>
                  <p className="mb-4 text-[0.84rem] leading-[1.58] text-[var(--p7-text-2)]">
                    {gamificationSummary}
                  </p>

                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <div className="mb-1 text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-[var(--v2-gold)]">
                        Ascensão espiritual
                      </div>
                      <span className="p7-card-title">{t('gamification.yourCurrentMount')}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsIconModalOpen(true)}
                      className="rounded-full border border-[var(--p7-border)] bg-[var(--p7-card)] px-3 py-1 text-[0.75rem] font-semibold text-[var(--p7-text-2)] transition hover:bg-[var(--p7-surface-2)]"
                    >
                      Ver detalhes
                    </button>
                  </div>

                  <div className="grid gap-5 lg:grid-cols-[auto,1fr] lg:items-center">
                    <button
                      type="button"
                      className="mx-auto flex h-[168px] w-[168px] items-center justify-center rounded-full transition-transform duration-200 hover:scale-[1.02]"
                      onClick={() => setIsIconModalOpen(true)}
                    >
                      <div className="relative flex h-[168px] w-[168px] items-center justify-center">
                        <svg
                          className="absolute inset-0 -rotate-90"
                          viewBox="0 0 140 140"
                          aria-hidden="true"
                        >
                          <circle
                            cx="70"
                            cy="70"
                            r={ringRadius}
                            fill="none"
                            stroke="color-mix(in oklab, var(--v2-gold) 12%, transparent)"
                            strokeWidth="10"
                          />
                          <circle
                            cx="70"
                            cy="70"
                            r={ringRadius}
                            fill="none"
                            stroke="url(#gamification-ring)"
                            strokeWidth="10"
                            strokeLinecap="round"
                            strokeDasharray={ringCircumference}
                            strokeDashoffset={ringOffset}
                          />
                          <defs>
                            <linearGradient
                              id="gamification-ring"
                              x1="0%"
                              y1="0%"
                              x2="100%"
                              y2="100%"
                            >
                              <stop offset="0%" stopColor="oklch(0.79 0.13 88)" />
                              <stop offset="100%" stopColor="oklch(0.62 0.13 78)" />
                            </linearGradient>
                          </defs>
                        </svg>

                        <div className="flex h-[126px] w-[126px] flex-col items-center justify-center rounded-full border border-[color-mix(in_oklab,var(--v2-gold)_18%,transparent)] bg-[linear-gradient(180deg,var(--p7-card),var(--p7-surface-2))] shadow-[var(--shadow-card)]">
                          <MountIcon iconType={getLevelIcon(total)} className="h-14 w-14" />
                          <div className="mt-2 text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-[var(--p7-text-3)]">
                            Progresso
                          </div>
                          <div className="text-lg font-bold text-[var(--p7-text)]">
                            {Math.round(ringProgress)}%
                          </div>
                        </div>
                      </div>
                    </button>

                    <div className="space-y-3">
                      <div>
                        <div className="text-[1.35rem] font-bold text-[var(--p7-text)]">
                          {getMountName(total)}
                        </div>
                        <div className="mt-1 text-[0.88rem] text-[var(--p7-text-2)]">
                          {currentLevel.name}
                        </div>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="rounded-[18px] border border-[var(--p7-border)] bg-[var(--p7-surface-2)] px-4 py-3">
                          <div className="text-[0.72rem] uppercase tracking-[0.12em] text-[var(--p7-text-3)]">
                            Agora
                          </div>
                          <div className="mt-1 text-lg font-bold text-[var(--p7-text)]">
                            {total} pts
                          </div>
                        </div>
                        <div className="rounded-[18px] border border-[var(--p7-border)] bg-[var(--p7-surface-2)] px-4 py-3">
                          <div className="text-[0.72rem] uppercase tracking-[0.12em] text-[var(--p7-text-3)]">
                            Próximo marco
                          </div>
                          <div className="mt-1 text-lg font-bold text-[var(--p7-text)]">
                            {nextLevel ? `${pointsToNext} pts` : 'Concluído'}
                          </div>
                        </div>
                      </div>

                      <div className="rounded-[18px] border border-[var(--p7-border)] bg-[var(--p7-surface-2)] px-4 py-3">
                        <div className="mb-2 flex items-center justify-between gap-3 text-[0.8rem]">
                          <span className="text-[var(--p7-text-2)]">
                            {nextLevel
                              ? t('gamification.progressTo', { mount: nextLevel.mount })
                              : t('gamification.maxMountReached')}
                          </span>
                          <span className="font-semibold text-[var(--p7-text)]">
                            {Math.round(ringProgress)}%
                          </span>
                        </div>
                        <Progress value={ringProgress} className="h-2" />
                        <div className="mt-2 text-xs leading-[1.55] text-[var(--p7-text-3)]">
                          {pointsToNext > 0
                            ? t('gamification.pointsToMount', {
                                points: pointsToNext,
                                mount: nextLevel?.mount || '',
                              })
                            : t('gamification.maxStatusReached')}
                        </div>
                      </div>

                      {total >= 1000 ? (
                        <div className="flex items-center gap-2 rounded-[14px] bg-[color-mix(in_oklab,var(--v2-gold)_12%,transparent)] px-3 py-2 text-[var(--v2-gold)]">
                          <Crown className="h-4 w-4" />
                          <span className="text-xs font-semibold">
                            {t('gamification.maxStatusReached')}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p7-section">
                <div className="p7-card p7-card-p">
                  <div className="mb-1 text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-[var(--v2-gold)]">
                    Próximo passo
                  </div>
                  <p className="text-[0.82rem] leading-[1.58] text-[var(--p7-text-2)]">
                    Abra os detalhes da sua montanha para entender o significado do nível atual e
                    use o detalhamento de pontos para decidir onde ganhar constância.
                  </p>
                </div>
              </div>

              {canSeeRanking ? (
                <div className="p7-section">
                  <CommunityRankingV2 currentUserId={user?.id} />
                </div>
              ) : null}

              <div className="p7-section">
                <MountainJourney userPoints={total} showCurrent={true} />
              </div>

              <div className="p7-section pb-4">
                <PointsBreakdown
                  userData={
                    userData as import('@/types/domain').UserMember & { actualPoints?: number }
                  }
                  breakdown={breakdown}
                  showDetails={true}
                />
              </div>
            </div>
          </div>
        </div>

        <DialogWithModalTracking
          modalId="gamification-icon-modal"
          open={isIconModalOpen}
          onOpenChange={setIsIconModalOpen}
        >
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader className="pb-4">
              <DialogTitle className="text-center text-xl sm:text-2xl font-bold text-[var(--p7-text)]">
                {getMountName(total)} — {t('gamification.achievementDetails')}
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-start lg:gap-10">
              <div className="flex h-48 w-48 shrink-0 items-center justify-center rounded-[18px] bg-[var(--p7-surface-2)] p-4 sm:h-64 sm:w-64">
                <MountIcon iconType={getLevelIcon(total)} className="h-full w-full" />
              </div>
              <div className="flex-1 space-y-4 text-center lg:text-left">
                <div className={`${getLevelColor(total)} text-3xl font-bold`}>
                  {getMountName(total)}
                </div>
                <div className="text-lg font-medium text-[var(--p7-text-2)]">
                  {currentLevel.name}
                </div>
                <div className="p7-card p7-card-p">
                  <div className="mb-2 text-sm font-semibold text-[var(--p7-text)]">
                    {t('gamification.biblicalMeaning')}
                  </div>
                  <p className="text-sm leading-[1.5] text-[var(--p7-text-2)]">
                    {currentLevel.description}
                  </p>
                </div>
                <div className="p7-card p7-card-p">
                  <div className="mb-2 text-sm font-semibold text-[var(--p7-text)]">
                    {t('gamification.unlockedAchievements')}
                  </div>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    {currentLevel.benefits.map((benefit, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-[hsl(var(--primary))]" />
                        <span className="text-sm text-[var(--p7-text-2)]">{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </DialogWithModalTracking>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="space-y-6 p-4">
        <>
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Trophy className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {t('gamification.myScore')}
              </h1>
            </div>
            <p className="text-muted-foreground">{t('gamification.trackProgress')}</p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-1">
              <TabsTrigger value="my-progress">{t('gamification.myProgress')}</TabsTrigger>
            </TabsList>

            <TabsContent value="my-progress" className="space-y-6">
              <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200 dark:from-slate-800/80 dark:to-slate-900/80 dark:border-slate-700">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Mountain className="h-5 w-5 text-purple-600" />
                    {t('gamification.yourCurrentMount')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="text-6xl mb-4">
                      <div
                        className="cursor-pointer hover:scale-105 transition-transform duration-200"
                        onClick={() => setIsIconModalOpen(true)}
                      >
                        <MountIcon iconType={getLevelIcon(total)} className="h-72 w-72 mx-auto" />
                      </div>
                    </div>
                    <div className={`${getLevelColor(total)} text-2xl font-bold mb-2`}>
                      {getMountName(total)}
                    </div>
                    <div className="text-lg text-muted-foreground">{currentLevel.name}</div>
                  </div>

                  {nextLevel && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{t('gamification.progressTo', { mount: nextLevel.mount })}</span>
                        <span>{Math.round(progress)}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                      <div className="text-center text-xs text-muted-foreground">
                        {pointsToNext > 0
                          ? t('gamification.pointsToMount', {
                              points: pointsToNext,
                              mount: nextLevel.mount,
                            })
                          : t('gamification.maxMountReached')}
                      </div>
                    </div>
                  )}

                  {total >= 1000 && (
                    <div className="flex items-center justify-center gap-2 mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg">
                      <Crown className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                      <span className="text-xs font-medium text-yellow-700 dark:text-yellow-300">
                        {t('gamification.maxStatusReached')}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <MountainJourney userPoints={total} showCurrent={true} />
              <PointsBreakdown
                userData={
                  userData as import('@/types/domain').UserMember & { actualPoints?: number }
                }
                breakdown={breakdown}
                showDetails={true}
              />
            </TabsContent>
          </Tabs>
        </>
      </div>

      {/* Modal de expansão do ícone */}
      <DialogWithModalTracking
        modalId="gamification-icon-modal"
        open={isIconModalOpen}
        onOpenChange={setIsIconModalOpen}
      >
        <DialogContent className="max-w-5xl max-h-[90vh] sm:max-h-[95vh] overflow-y-auto bg-gradient-to-br from-amber-50 to-yellow-100 border-amber-200 dark:from-slate-800 dark:to-slate-900 dark:border-slate-600 p-4 sm:p-6">
          <DialogHeader className="pb-4 sm:pb-6">
            <DialogTitle className="text-center text-xl sm:text-2xl lg:text-3xl font-bold text-amber-800 dark:text-amber-300">
              {getMountName(total)} - {t('gamification.achievementDetails')}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col lg:flex-row items-center lg:items-start space-y-6 lg:space-y-0 lg:space-x-12 p-2 sm:p-8">
            {/* Ícone */}
            <div className="flex-shrink-0">
              <div className="w-48 h-48 sm:w-64 sm:h-64 lg:w-80 lg:h-80 flex items-center justify-center bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 sm:p-8">
                <MountIcon iconType={getLevelIcon(total)} className="w-full h-full" />
              </div>
            </div>

            {/* Informações */}
            <div className="flex-1 text-center lg:text-left space-y-6">
              <div className="space-y-3">
                <div className={`${getLevelColor(total)} text-4xl font-bold`}>
                  {getMountName(total)}
                </div>
                <div className="text-2xl text-amber-700 dark:text-amber-300 font-medium">
                  {currentLevel.name}
                </div>
              </div>

              {/* Descrição bíblica */}
              <div className="bg-white/70 dark:bg-gray-800/70 rounded-xl p-6 shadow-md">
                <h3 className="text-xl font-bold text-amber-800 dark:text-amber-300 mb-3">
                  {t('gamification.biblicalMeaning')}
                </h3>
                <p className="text-amber-900 dark:text-amber-200 leading-relaxed text-lg">
                  {currentLevel.description}
                </p>
              </div>

              {/* Estatísticas */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white/70 dark:bg-gray-800/70 rounded-lg p-4 shadow-md">
                  <div className="text-sm font-medium text-amber-700 dark:text-amber-300 mb-1">
                    {t('gamification.currentPoints')}
                  </div>
                  <div className="text-2xl font-bold text-amber-800 dark:text-amber-200">
                    {total}
                  </div>
                </div>

                <div className="bg-white/70 dark:bg-gray-800/70 rounded-lg p-4 shadow-md">
                  <div className="text-sm font-medium text-amber-700 dark:text-amber-300 mb-1">
                    {t('gamification.nextLevel')}
                  </div>
                  <div className="text-lg font-semibold text-amber-800 dark:text-amber-200">
                    {getNextLevel(total)?.name || t('gamification.maxReached')}
                  </div>
                </div>

                {getNextLevel(total) && (
                  <div className="bg-white/70 dark:bg-gray-800/70 rounded-lg p-4 shadow-md">
                    <div className="text-sm font-medium text-amber-700 dark:text-amber-300 mb-1">
                      {t('gamification.pointsRemaining')}
                    </div>
                    <div className="text-2xl font-bold text-amber-800 dark:text-amber-200">
                      {getPointsToNextLevel(total)}
                    </div>
                  </div>
                )}
              </div>

              {/* Benefícios */}
              <div className="bg-white/70 dark:bg-gray-800/70 rounded-xl p-6 shadow-md">
                <h3 className="text-xl font-bold text-amber-800 dark:text-amber-300 mb-4">
                  {t('gamification.unlockedAchievements')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {currentLevel.benefits.map((benefit, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-amber-600 dark:bg-amber-400 rounded-full flex-shrink-0"></div>
                      <span className="text-amber-900 dark:text-amber-200 font-medium">
                        {benefit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </DialogWithModalTracking>
    </MobileLayout>
  );
}
