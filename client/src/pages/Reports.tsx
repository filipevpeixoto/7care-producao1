import { lazy, Suspense, startTransition } from 'react';
import { useTranslation } from 'react-i18next';
import { useReportsData } from '@/hooks/useReportsData';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import {
  PrototypeAvatar,
  PrototypeHeaderIconButton,
  PrototypeStatusBar,
} from './v2/prototypeShared';
import { ThemeToggle } from '@/components/v2/ThemeToggle';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, CalendarDays, Download, RefreshCw, Target, Users } from 'lucide-react';

// React.lazy for heavy chart sub-components (recharts tree-shaking)
const OverviewTab = lazy(() =>
  import('@/components/reports/OverviewTab').then((m) => ({ default: m.OverviewTab }))
);
const FunnelTab = lazy(() =>
  import('@/components/reports/FunnelTab').then((m) => ({ default: m.FunnelTab }))
);
const EngagementTab = lazy(() =>
  import('@/components/reports/EngagementTab').then((m) => ({ default: m.EngagementTab }))
);
const GrowthTab = lazy(() =>
  import('@/components/reports/GrowthTab').then((m) => ({ default: m.GrowthTab }))
);
const ChurchesTab = lazy(() =>
  import('@/components/reports/ChurchesTab').then((m) => ({ default: m.ChurchesTab }))
);
const MissionariesTab = lazy(() =>
  import('@/components/reports/MissionariesTab').then((m) => ({ default: m.MissionariesTab }))
);
const DistrictsTab = lazy(() =>
  import('@/components/reports/DistrictsTab').then((m) => ({ default: m.DistrictsTab }))
);
const GoalsTab = lazy(() =>
  import('@/components/reports/GoalsTab').then((m) => ({ default: m.GoalsTab }))
);
const InsightsTab = lazy(() =>
  import('@/components/reports/InsightsTab').then((m) => ({ default: m.InsightsTab }))
);

const TabLoader = () => (
  <div className="space-y-4">
    <Skeleton className="h-32 w-full" />
    <Skeleton className="h-32 w-full" />
  </div>
);

export default function Reports() {
  const { skin } = useTheme();
  const { user } = useAuth();
  const {
    activeTab,
    setActiveTab,
    selectedPeriod,
    setSelectedPeriod,
    isAdmin,
    isPastorUser,
    hasAccess,
    overviewData,
    loadingOverview,
    refetchOverview,
    funnelData,
    loadingFunnel,
    churchData,
    loadingChurches,
    engagementData,
    loadingEngagement,
    growthData,
    loadingGrowth,
    missionaryData,
    loadingMissionary,
    districtData,
    loadingDistrict,
    goalsData,
    loadingGoals,
    insightsData,
    loadingInsights,
  } = useReportsData();

  const { t } = useTranslation();

  if (!hasAccess) {
    return (
      <MobileLayout title={t('reports.title')}>
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
          <AlertCircle className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">
            {t('reports.accessRestricted')}
          </h2>
          <p className="text-muted-foreground text-center">{t('reports.noPermission')}</p>
        </div>
      </MobileLayout>
    );
  }

  if (skin === 'v2') {
    const visibleTabs = [
      { value: 'overview', label: 'Panorama' },
      { value: 'funnel', label: 'Funil' },
      { value: 'engagement', label: 'Engaj.' },
      { value: 'growth', label: 'Crescimento' },
      { value: 'churches', label: 'Igrejas' },
      ...(isPastorUser ? [{ value: 'missionaries', label: 'Missionários' }] : []),
      ...(isAdmin ? [{ value: 'districts', label: 'Distritos' }] : []),
      { value: 'goals', label: 'Metas' },
      { value: 'insights', label: 'Insights' },
    ];

    const summaryTiles = [
      {
        icon: Users,
        title: 'Base ativa',
        value: overviewData?.totalUsers ?? 0,
        helper: 'pessoas na operação',
        tone: 'navy',
      },
      {
        icon: CalendarDays,
        title: 'Eventos no mês',
        value: overviewData?.eventsThisMonth ?? 0,
        helper: 'movimento do período',
        tone: 'soft',
      },
      {
        icon: Target,
        title: 'Engajamento',
        value: `${overviewData?.avgEngagement ?? 0}%`,
        helper: 'média geral',
        tone: 'gold',
      },
    ];

    const summaryText =
      overviewData && !loadingOverview
        ? overviewData.growthRate >= 0
          ? `A operação está crescendo ${overviewData.growthRate}% no período, com ${overviewData.usersThisMonth} novos usuários e ${overviewData.eventsThisMonth} eventos registrados.`
          : `O período pede atenção: crescimento em ${overviewData.growthRate}% e engajamento médio de ${overviewData.avgEngagement}%.`
        : 'Uma leitura rápida para priorizar o que merece atenção antes de entrar nos gráficos detalhados.';

    const periodOptions = [
      { value: 'week', label: t('reports.week') },
      { value: 'month', label: t('reports.month') },
      { value: 'quarter', label: t('reports.quarter') },
      { value: 'year', label: t('reports.year') },
    ];
    return (
      <MobileLayout variant="prototype">
        <div className="p7-shell">
          <div className="p7-screen">
            <PrototypeStatusBar />
            <div className="p7-grad-header">
              <div className="p7-header-row">
                <div>
                  <div className="p7-header-label">{t('reports.overview')}</div>
                  <div className="p7-header-title">{t('reports.title')}</div>
                </div>
                <div className="flex items-center gap-2">
                  <ThemeToggle />
                  <PrototypeHeaderIconButton
                    icon={RefreshCw}
                    onClick={() => refetchOverview()}
                    label="Atualizar relatórios"
                  />
                  <PrototypeHeaderIconButton icon={Download} label="Exportar relatórios" />
                  <PrototypeAvatar name={user?.name} className="h-9 w-9 text-[0.8rem]" />
                </div>
              </div>
              <div className="p7-chip-row mt-3">
                {periodOptions.map((period) => (
                  <button
                    key={period.value}
                    type="button"
                    onClick={() => setSelectedPeriod(period.value)}
                    className={`p7-chip ${selectedPeriod === period.value ? 'active' : ''}`}
                  >
                    {period.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p7-scroll">
              <div className="p7-section pb-4">
                <div className="p7-card p7-card-p">
                  <div className="mb-1 text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-[var(--v2-gold)]">
                    Leitura rápida
                  </div>
                  <p className="mb-4 text-[0.84rem] leading-[1.6] text-[var(--p7-text-2)]">
                    {summaryText}
                  </p>

                  <div className="grid gap-3 sm:grid-cols-3">
                    {summaryTiles.map((tile) => (
                      <div key={tile.title} className={`v2-stat-tile ${tile.tone}`}>
                        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-[12px] bg-white/12 text-current">
                          <tile.icon className="h-5 w-5" />
                        </div>
                        <div className="v2-stat-value">{tile.value}</div>
                        <div className="v2-stat-label">{tile.title}</div>
                        <div className="mt-1 text-[0.72rem] text-[var(--p7-text-3)]">
                          {tile.helper}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p7-section pb-4">
                <div className="p7-card p7-card-p">
                  <Tabs
                    value={activeTab}
                    onValueChange={(val) => startTransition(() => setActiveTab(val))}
                    className="w-full"
                  >
                    <TabsList className="p7-report-tabs">
                      {visibleTabs.map((tab) => (
                        <TabsTrigger
                          key={tab.value}
                          value={tab.value}
                          className="p7-report-tab-trigger"
                        >
                          {tab.label}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    <div className="mt-4">
                      <TabsContent value="overview" tabIndex={-1} className="m-0">
                        <Suspense fallback={<TabLoader />}>
                          <OverviewTab data={overviewData} loading={loadingOverview} />
                        </Suspense>
                      </TabsContent>
                      <TabsContent value="funnel" tabIndex={-1} className="m-0">
                        <Suspense fallback={<TabLoader />}>
                          <FunnelTab data={funnelData} loading={loadingFunnel} />
                        </Suspense>
                      </TabsContent>
                      <TabsContent value="engagement" tabIndex={-1} className="m-0">
                        <Suspense fallback={<TabLoader />}>
                          <EngagementTab data={engagementData} loading={loadingEngagement} />
                        </Suspense>
                      </TabsContent>
                      <TabsContent value="growth" tabIndex={-1} className="m-0">
                        <Suspense fallback={<TabLoader />}>
                          <GrowthTab data={growthData} loading={loadingGrowth} />
                        </Suspense>
                      </TabsContent>
                      <TabsContent value="churches" tabIndex={-1} className="m-0">
                        <Suspense fallback={<TabLoader />}>
                          <ChurchesTab data={churchData} loading={loadingChurches} />
                        </Suspense>
                      </TabsContent>
                      {isPastorUser && (
                        <TabsContent value="missionaries" tabIndex={-1} className="m-0">
                          <Suspense fallback={<TabLoader />}>
                            <MissionariesTab data={missionaryData} loading={loadingMissionary} />
                          </Suspense>
                        </TabsContent>
                      )}
                      {isAdmin && (
                        <TabsContent value="districts" tabIndex={-1} className="m-0">
                          <Suspense fallback={<TabLoader />}>
                            <DistrictsTab data={districtData} loading={loadingDistrict} />
                          </Suspense>
                        </TabsContent>
                      )}
                      <TabsContent value="goals" tabIndex={-1} className="m-0">
                        <Suspense fallback={<TabLoader />}>
                          <GoalsTab data={goalsData} loading={loadingGoals} />
                        </Suspense>
                      </TabsContent>
                      <TabsContent value="insights" tabIndex={-1} className="m-0">
                        <Suspense fallback={<TabLoader />}>
                          <InsightsTab data={insightsData} loading={loadingInsights} />
                        </Suspense>
                      </TabsContent>
                    </div>
                  </Tabs>
                </div>
              </div>
            </div>
          </div>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout title={t('reports.title')}>
      <div className="p-4 space-y-4">
        <>
          {/* Header with Actions */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground dark:text-white">
                {t('reports.title')}
              </h1>
              <p className="text-sm text-muted-foreground dark:text-gray-400">
                {t('reports.subtitle')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => refetchOverview()}
                className="dark:border-gray-600 dark:text-gray-300"
                aria-label={t('reports.refreshReports')}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="dark:border-gray-600 dark:text-gray-300"
                aria-label={t('reports.downloadReport')}
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {[
              { value: 'week', label: t('reports.week') },
              { value: 'month', label: t('reports.month') },
              { value: 'quarter', label: t('reports.quarter') },
              { value: 'year', label: t('reports.year') },
            ].map((period) => (
              <Button
                key={period.value}
                variant={selectedPeriod === period.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedPeriod(period.value)}
                className={
                  selectedPeriod === period.value
                    ? 'bg-primary'
                    : 'dark:border-gray-600 dark:text-gray-300'
                }
              >
                {period.label}
              </Button>
            ))}
          </div>
          <Tabs
            value={activeTab}
            onValueChange={(val) => startTransition(() => setActiveTab(val))}
            className="w-full"
          >
            <TabsList className="w-full flex overflow-x-auto bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
              <TabsTrigger value="overview" className="flex-1 min-w-fit text-xs">
                {t('reports.overview')}
              </TabsTrigger>
              <TabsTrigger value="funnel" className="flex-1 min-w-fit text-xs">
                {t('reports.funnel')}
              </TabsTrigger>
              <TabsTrigger value="engagement" className="flex-1 min-w-fit text-xs">
                {t('reports.engagement')}
              </TabsTrigger>
              <TabsTrigger value="growth" className="flex-1 min-w-fit text-xs">
                {t('reports.growth')}
              </TabsTrigger>
              <TabsTrigger value="churches" className="flex-1 min-w-fit text-xs">
                {t('reports.churches')}
              </TabsTrigger>
              {isPastorUser && (
                <TabsTrigger value="missionaries" className="flex-1 min-w-fit text-xs">
                  {t('reports.missionaries')}
                </TabsTrigger>
              )}
              {isAdmin && (
                <TabsTrigger value="districts" className="flex-1 min-w-fit text-xs">
                  {t('reports.districts')}
                </TabsTrigger>
              )}
              <TabsTrigger value="goals" className="flex-1 min-w-fit text-xs">
                {t('reports.goals')}
              </TabsTrigger>
              <TabsTrigger value="insights" className="flex-1 min-w-fit text-xs">
                {t('reports.insights')}
              </TabsTrigger>
            </TabsList>
            <div className="mt-4">
              <TabsContent value="overview" className="m-0">
                <Suspense fallback={<TabLoader />}>
                  <OverviewTab data={overviewData} loading={loadingOverview} />
                </Suspense>
              </TabsContent>
              <TabsContent value="funnel" className="m-0">
                <Suspense fallback={<TabLoader />}>
                  <FunnelTab data={funnelData} loading={loadingFunnel} />
                </Suspense>
              </TabsContent>
              <TabsContent value="engagement" className="m-0">
                <Suspense fallback={<TabLoader />}>
                  <EngagementTab data={engagementData} loading={loadingEngagement} />
                </Suspense>
              </TabsContent>
              <TabsContent value="growth" className="m-0">
                <Suspense fallback={<TabLoader />}>
                  <GrowthTab data={growthData} loading={loadingGrowth} />
                </Suspense>
              </TabsContent>
              <TabsContent value="churches" className="m-0">
                <Suspense fallback={<TabLoader />}>
                  <ChurchesTab data={churchData} loading={loadingChurches} />
                </Suspense>
              </TabsContent>
              {isPastorUser && (
                <TabsContent value="missionaries" className="m-0">
                  <Suspense fallback={<TabLoader />}>
                    <MissionariesTab data={missionaryData} loading={loadingMissionary} />
                  </Suspense>
                </TabsContent>
              )}
              {isAdmin && (
                <TabsContent value="districts" className="m-0">
                  <Suspense fallback={<TabLoader />}>
                    <DistrictsTab data={districtData} loading={loadingDistrict} />
                  </Suspense>
                </TabsContent>
              )}
              <TabsContent value="goals" className="m-0">
                <Suspense fallback={<TabLoader />}>
                  <GoalsTab data={goalsData} loading={loadingGoals} />
                </Suspense>
              </TabsContent>
              <TabsContent value="insights" className="m-0">
                <Suspense fallback={<TabLoader />}>
                  <InsightsTab data={insightsData} loading={loadingInsights} />
                </Suspense>
              </TabsContent>
            </div>
          </Tabs>
        </>
      </div>
    </MobileLayout>
  );
}
