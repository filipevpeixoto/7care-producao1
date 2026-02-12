import { lazy, Suspense } from 'react';
import { useReportsData } from '@/hooks/useReportsData';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, RefreshCw, Download } from 'lucide-react';

// React.lazy for heavy chart sub-components (recharts tree-shaking)
const OverviewTab = lazy(() => import('@/components/reports/OverviewTab').then(m => ({ default: m.OverviewTab })));
const FunnelTab = lazy(() => import('@/components/reports/FunnelTab').then(m => ({ default: m.FunnelTab })));
const EngagementTab = lazy(() => import('@/components/reports/EngagementTab').then(m => ({ default: m.EngagementTab })));
const GrowthTab = lazy(() => import('@/components/reports/GrowthTab').then(m => ({ default: m.GrowthTab })));
const ChurchesTab = lazy(() => import('@/components/reports/ChurchesTab').then(m => ({ default: m.ChurchesTab })));
const MissionariesTab = lazy(() => import('@/components/reports/MissionariesTab').then(m => ({ default: m.MissionariesTab })));
const DistrictsTab = lazy(() => import('@/components/reports/DistrictsTab').then(m => ({ default: m.DistrictsTab })));
const GoalsTab = lazy(() => import('@/components/reports/GoalsTab').then(m => ({ default: m.GoalsTab })));
const InsightsTab = lazy(() => import('@/components/reports/InsightsTab').then(m => ({ default: m.InsightsTab })));

const TabLoader = () => <div className="space-y-4"><Skeleton className="h-32 w-full" /><Skeleton className="h-32 w-full" /></div>;

export default function Reports() {
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

  if (!hasAccess) {
    return (
      <MobileLayout title="Relatórios">
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
          <AlertCircle className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Acesso Restrito</h2>
          <p className="text-muted-foreground text-center">
            Você não tem permissão para acessar os relatórios.
          </p>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout title="Relatórios">
      <div className="p-4 space-y-4">
        {/* Header with Actions */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground dark:text-white">Relatórios</h1>
            <p className="text-sm text-muted-foreground dark:text-gray-400">
              Análise de dados e métricas
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetchOverview()}
              className="dark:border-gray-600 dark:text-gray-300"
              aria-label="Atualizar relatórios"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="dark:border-gray-600 dark:text-gray-300"
              aria-label="Baixar relatório"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Period Selector */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[
            { value: 'week', label: 'Semana' },
            { value: 'month', label: 'Mês' },
            { value: 'quarter', label: 'Trimestre' },
            { value: 'year', label: 'Ano' },
          ].map(period => (
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

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full flex overflow-x-auto bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
            <TabsTrigger value="overview" className="flex-1 min-w-fit text-xs">
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="funnel" className="flex-1 min-w-fit text-xs">
              Funil
            </TabsTrigger>
            <TabsTrigger value="engagement" className="flex-1 min-w-fit text-xs">
              Engajamento
            </TabsTrigger>
            <TabsTrigger value="growth" className="flex-1 min-w-fit text-xs">
              Crescimento
            </TabsTrigger>
            <TabsTrigger value="churches" className="flex-1 min-w-fit text-xs">
              Igrejas
            </TabsTrigger>
            {isPastorUser && (
              <TabsTrigger value="missionaries" className="flex-1 min-w-fit text-xs">
                Missionários
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger value="districts" className="flex-1 min-w-fit text-xs">
                Distritos
              </TabsTrigger>
            )}
            <TabsTrigger value="goals" className="flex-1 min-w-fit text-xs">
              Metas
            </TabsTrigger>
            <TabsTrigger value="insights" className="flex-1 min-w-fit text-xs">
              Insights
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
      </div>
    </MobileLayout>
  );
}
