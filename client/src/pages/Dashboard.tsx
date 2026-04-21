import React from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, Users, CheckSquare, Heart, Building2, UserCog } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useTransitionNavigate } from '@/hooks/useTransitionNavigate';
import { hasAdminAccess, isSuperAdmin } from '@/lib/permissions';
import { BirthdayCard } from '@/components/dashboard/BirthdayCard';
import { Visitometer } from '@/components/dashboard/Visitometer';
import { QuickGamificationCard } from '@/components/dashboard/QuickGamificationCard';
import { SpiritualCheckInModal } from '@/components/dashboard/SpiritualCheckInModal';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { useTheme } from '@/contexts/ThemeContext';
import type { Relationship } from '@/types/domain';
import { useDashboardData } from './dashboard/useDashboardData';
import { NextEventDisplay } from './dashboard/NextEventDisplay';
import { BirthdayDisplay } from './dashboard/BirthdayDisplay';
import { DashboardV2 } from './v2/DashboardV2';

const Dashboard = () => {
  const { t } = useTranslation();
  const navigate = useTransitionNavigate();
  const { skin } = useTheme();
  const {
    user,
    showCheckIn,
    setShowCheckIn,
    markCheckInComplete,
    stats,
    isLoading,
    tasksLoading,
    birthdayData,
    birthdayLoading,
    visitData,
    visitsLoading,
    refetchVisits,
    userEvents,
    userEventsLoading,
    eventsThisMonthCount,
    spiritualCheckIns,
    spiritualCheckInsLoading,
    districtsCount,
    pastorsCount,
    churchInterested,
    churchInterestedLoading,
    userRelationships,
    userRelationshipsLoading,
    userDetailedData,
    getNextBirthday,
    formatBirthdayDate,
  } = useDashboardData();

  // ── Sub-components extraídos para ./dashboard/ ─────

  const renderAdminDashboard = () => (
    <div className="space-y-4 lg:space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-6">
        <Card className="group relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-700 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-blue-800/30 opacity-100 group-hover:from-blue-600/30 group-hover:to-blue-800/40 transition-all duration-300"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/30 to-blue-600/40 rounded-full -translate-y-16 translate-x-16 group-hover:scale-110 transition-transform duration-500"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 lg:pb-2 relative z-10">
            <CardTitle className="text-sm lg:text-base font-semibold text-white drop-shadow-md">
              {t('dashboard.totalUsers')}
            </CardTitle>
            <div className="p-1 lg:p-2 rounded-full bg-white/20 backdrop-blur-sm text-white shadow-lg group-hover:bg-white/30 transition-all duration-300">
              <Users className="h-3 w-3 lg:h-4 lg:w-4" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10 p-3 lg:p-6">
            <div className="text-xl lg:text-4xl font-bold text-white drop-shadow-lg">
              {isLoading ? '...' : stats.totalUsers}
            </div>
            <p className="text-xs lg:text-sm text-white/80 mt-1">
              {t('dashboard.approvedUsers', { count: stats.approvedUsers })}
            </p>
            <Button
              onClick={() => navigate('/users')}
              className="mt-2 lg:mt-3 h-7 lg:h-9 px-3 lg:px-4 text-xs lg:text-sm bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white shadow-md hover:shadow-lg transition-all duration-200 border-0"
            >
              <Users className="h-2 w-2 lg:h-3 lg:w-3 mr-1" />
              <span className="hidden sm:inline">{t('dashboard.manageUsers')}</span>
              <span className="sm:hidden">{t('dashboard.usersShort')}</span>
            </Button>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden bg-gradient-to-br from-red-500 to-red-700 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute inset-0 bg-gradient-to-br from-red-600/20 to-red-800/30 opacity-100 group-hover:from-red-600/30 group-hover:to-red-800/40 transition-all duration-300"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-red-400/30 to-red-600/40 rounded-full -translate-y-16 translate-x-16 group-hover:scale-110 transition-transform duration-500"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 lg:pb-2 relative z-10">
            <CardTitle className="text-sm lg:text-base font-semibold text-white drop-shadow-md">
              {t('dashboard.churchFriends')}
            </CardTitle>
            <div className="p-1 lg:p-2 rounded-full bg-white/20 backdrop-blur-sm text-white shadow-lg group-hover:bg-white/30 transition-all duration-300">
              <Heart className="h-3 w-3 lg:h-4 lg:w-4" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10 p-3 lg:p-6 space-y-2">
            <div className="flex items-baseline gap-2">
              <div className="text-xl lg:text-4xl font-bold text-white drop-shadow-lg">
                {isLoading ? '...' : stats.totalInterested}
              </div>
              <span className="text-xs lg:text-sm text-white/80">{t('dashboard.friends')}</span>
            </div>
            <div className="flex items-center gap-2 pt-1 border-t border-white/20">
              <div className="text-lg lg:text-2xl font-bold text-white/90 drop-shadow">
                {isLoading ? '...' : stats.interestedBeingDiscipled || 0}
              </div>
              <span className="text-xs lg:text-sm text-white/80 leading-tight">
                {t('dashboard.beingDiscipled')}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden bg-gradient-to-br from-orange-500 to-orange-700 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-600/20 to-orange-800/30 opacity-100 group-hover:from-orange-600/30 group-hover:to-orange-800/40 transition-all duration-300"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-400/30 to-orange-600/40 rounded-full -translate-y-16 translate-x-16 group-hover:scale-110 transition-transform duration-500"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 lg:pb-2 relative z-10">
            <CardTitle className="text-sm lg:text-base font-semibold text-white drop-shadow-md">
              {t('dashboard.tasks')}
            </CardTitle>
            <div className="p-1 lg:p-2 rounded-full bg-white/20 backdrop-blur-sm text-white shadow-lg group-hover:bg-white/30 transition-all duration-300">
              <CheckSquare className="h-3 w-3 lg:h-4 lg:w-4" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10 p-3 lg:p-6 space-y-2">
            <div className="flex items-baseline gap-2">
              <div className="text-xl lg:text-4xl font-bold text-white drop-shadow-lg">
                {isLoading || tasksLoading ? '...' : stats?.pendingTasks || 0}
              </div>
              <span className="text-xs lg:text-sm text-white/80">{t('dashboard.pending')}</span>
            </div>
            <div className="flex items-center gap-2 pt-1 border-t border-white/20">
              <div className="text-lg lg:text-2xl font-bold text-white/90 drop-shadow">
                {isLoading || tasksLoading ? '...' : stats?.completedTasks || 0}
              </div>
              <span className="text-xs lg:text-sm text-white/80 leading-tight">
                {t('dashboard.completed')}
              </span>
            </div>
            <div className="flex items-center gap-2 pt-1 border-t border-white/20">
              <div className="text-sm lg:text-lg font-semibold text-white/90 drop-shadow">
                {isLoading || tasksLoading ? '...' : stats?.totalTasks || 0}
              </div>
              <span className="text-xs lg:text-sm text-white/80 leading-tight">
                {t('dashboard.total')}
              </span>
            </div>
            <Button
              onClick={() => navigate('/tasks')}
              className="mt-2 lg:mt-3 h-7 lg:h-9 px-3 lg:px-4 text-xs lg:text-sm bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white shadow-md hover:shadow-lg transition-all duration-200 border-0 w-full"
            >
              <CheckSquare className="h-2 w-2 lg:h-3 lg:w-3 mr-1" />
              <span className="hidden sm:inline">{t('dashboard.manageTasks')}</span>
              <span className="sm:hidden">{t('dashboard.tasks')}</span>
            </Button>
          </CardContent>
        </Card>

        {/* Card de Membros */}
        <Card className="group relative overflow-hidden bg-gradient-to-br from-green-500 to-green-700 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute inset-0 bg-gradient-to-br from-green-600/20 to-green-800/30 opacity-100 group-hover:from-green-600/30 group-hover:to-green-800/40 transition-all duration-300"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-400/30 to-green-600/40 rounded-full -translate-y-16 translate-x-16 group-hover:scale-110 transition-transform duration-500"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 lg:pb-2 relative z-10">
            <CardTitle className="text-sm lg:text-base font-semibold text-white drop-shadow-md">
              {t('dashboard.members')}
            </CardTitle>
            <div className="p-1 lg:p-2 rounded-full bg-white/20 backdrop-blur-sm text-white shadow-lg group-hover:bg-white/30 transition-all duration-300">
              <Users className="h-3 w-3 lg:h-4 lg:w-4" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10 p-3 lg:p-6">
            <div className="text-xl lg:text-4xl font-bold text-white drop-shadow-lg">
              {isLoading ? '...' : stats.totalMembers}
            </div>
            <p className="text-xs lg:text-sm text-white/80 mt-1">{t('dashboard.activeMembers')}</p>
          </CardContent>
        </Card>

        {/* Card de Missionários */}
        <Card className="group relative overflow-hidden bg-gradient-to-br from-purple-500 to-purple-700 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 to-purple-800/30 opacity-100 group-hover:from-purple-600/30 group-hover:to-purple-800/40 transition-all duration-300"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-400/30 to-purple-600/40 rounded-full -translate-y-16 translate-x-16 group-hover:scale-110 transition-transform duration-500"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 lg:pb-2 relative z-10">
            <CardTitle className="text-sm lg:text-base font-semibold text-white drop-shadow-md">
              {t('dashboard.missionaries')}
            </CardTitle>
            <div className="p-1 lg:p-2 rounded-full bg-white/20 backdrop-blur-sm text-white shadow-lg group-hover:bg-white/30 transition-all duration-300">
              <Heart className="h-3 w-3 lg:h-4 lg:w-4" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10 p-3 lg:p-6">
            <div className="text-xl lg:text-4xl font-bold text-white drop-shadow-lg">
              {isLoading ? '...' : stats.totalMissionaries}
            </div>
            <p className="text-xs lg:text-sm text-white/80 mt-1">
              {t('dashboard.activeDisciplers')}
            </p>
          </CardContent>
        </Card>

        {/* Card de Check-ins Espirituais */}
        <Card className="group relative overflow-hidden bg-gradient-to-br from-pink-500 to-pink-700 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute inset-0 bg-gradient-to-br from-pink-600/20 to-pink-800/30 opacity-100 group-hover:from-pink-600/30 group-hover:to-pink-800/40 transition-all duration-300"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-pink-400/30 to-pink-600/40 rounded-full -translate-y-16 translate-x-16 group-hover:scale-110 transition-transform duration-500"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 lg:pb-2 relative z-10">
            <CardTitle className="text-sm lg:text-base font-semibold text-white drop-shadow-md">
              {t('dashboard.spiritualCheckins')}
            </CardTitle>
            <div className="p-1 lg:p-2 rounded-full bg-white/20 backdrop-blur-sm text-white shadow-lg group-hover:bg-white/30 transition-all duration-300">
              <span
                className="text-sm lg:text-base filter brightness-0 invert"
                aria-hidden="true"
                role="img"
              >
                🙏
              </span>
            </div>
          </CardHeader>
          <CardContent className="relative z-10 p-3 lg:p-6">
            <div className="text-xl lg:text-4xl font-bold text-white drop-shadow-lg">
              {spiritualCheckInsLoading ? '...' : spiritualCheckIns?.length || 0}
            </div>
            <p className="text-xs lg:text-sm text-white/80 mt-1">
              {t('dashboard.latestSpiritualCheckins')}
            </p>
            <Button
              onClick={() => setShowCheckIn(true)}
              className="mt-2 lg:mt-3 h-7 lg:h-9 px-3 lg:px-4 text-xs lg:text-sm bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white shadow-md hover:shadow-lg transition-all duration-200 border-0"
            >
              <span className="mr-1 filter brightness-0 invert" aria-hidden="true" role="img">
                🙏
              </span>
              <span className="hidden sm:inline">{t('dashboard.doMyCheckin')}</span>
              <span className="sm:hidden">{t('dashboard.checkinShort')}</span>
            </Button>
          </CardContent>
        </Card>

        {/* Cards específicos para Superadmin */}
        {isSuperAdmin(user) && (
          <>
            {/* Card de Distritos */}
            <Card className="group relative overflow-hidden bg-gradient-to-br from-emerald-500 to-emerald-700 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/20 to-emerald-800/30 opacity-100 group-hover:from-emerald-600/30 group-hover:to-emerald-800/40 transition-all duration-300"></div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-400/30 to-emerald-600/40 rounded-full -translate-y-16 translate-x-16 group-hover:scale-110 transition-transform duration-500"></div>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 lg:pb-2 relative z-10">
                <CardTitle className="text-sm lg:text-base font-semibold text-white drop-shadow-md">
                  {t('dashboard.districts')}
                </CardTitle>
                <div className="p-1 lg:p-2 rounded-full bg-white/20 backdrop-blur-sm text-white shadow-lg group-hover:bg-white/30 transition-all duration-300">
                  <Building2 className="h-3 w-3 lg:h-4 lg:w-4" />
                </div>
              </CardHeader>
              <CardContent className="relative z-10 p-3 lg:p-6">
                <div className="text-xl lg:text-4xl font-bold text-white drop-shadow-lg">
                  {districtsCount ?? '...'}
                </div>
                <p className="text-xs lg:text-sm text-white/80 mt-1">
                  {t('dashboard.registeredDistricts')}
                </p>
                <Button
                  onClick={() => navigate('/districts')}
                  className="mt-2 lg:mt-3 h-7 lg:h-9 px-3 lg:px-4 text-xs lg:text-sm bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white shadow-md hover:shadow-lg transition-all duration-200 border-0"
                >
                  <Building2 className="h-2 w-2 lg:h-3 lg:w-3 mr-1" />
                  <span className="hidden sm:inline">{t('dashboard.manageDistricts')}</span>
                  <span className="sm:hidden">{t('dashboard.districts')}</span>
                </Button>
              </CardContent>
            </Card>

            {/* Card de Pastores */}
            <Card className="group relative overflow-hidden bg-gradient-to-br from-amber-500 to-amber-700 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-600/20 to-amber-800/30 opacity-100 group-hover:from-amber-600/30 group-hover:to-amber-800/40 transition-all duration-300"></div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-400/30 to-amber-600/40 rounded-full -translate-y-16 translate-x-16 group-hover:scale-110 transition-transform duration-500"></div>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 lg:pb-2 relative z-10">
                <CardTitle className="text-sm lg:text-base font-semibold text-white drop-shadow-md">
                  {t('dashboard.pastors')}
                </CardTitle>
                <div className="p-1 lg:p-2 rounded-full bg-white/20 backdrop-blur-sm text-white shadow-lg group-hover:bg-white/30 transition-all duration-300">
                  <UserCog className="h-3 w-3 lg:h-4 lg:w-4" />
                </div>
              </CardHeader>
              <CardContent className="relative z-10 p-3 lg:p-6">
                <div className="text-xl lg:text-4xl font-bold text-white drop-shadow-lg">
                  {pastorsCount ?? '...'}
                </div>
                <p className="text-xs lg:text-sm text-white/80 mt-1">
                  {t('dashboard.registeredPastors')}
                </p>
                <Button
                  onClick={() => navigate('/pastors')}
                  className="mt-2 lg:mt-3 h-7 lg:h-9 px-3 lg:px-4 text-xs lg:text-sm bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white shadow-md hover:shadow-lg transition-all duration-200 border-0"
                >
                  <UserCog className="h-2 w-2 lg:h-3 lg:w-3 mr-1" />
                  <span className="hidden sm:inline">{t('dashboard.managePastors')}</span>
                  <span className="sm:hidden">{t('dashboard.pastors')}</span>
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Special Components Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-8">
        {/* Visitômetro */}
        <div className="group">
          <Visitometer
            visitsCompleted={visitData?.completed || 0}
            visitsExpected={visitData?.expected || 0}
            totalVisits={visitData?.totalVisits || 0}
            visitedPeople={visitData?.visitedPeople || 0}
            percentage={visitData?.percentage || 0}
            isLoading={isLoading || visitsLoading}
            onRefresh={refetchVisits}
          />
        </div>

        {/* Card de Aniversariantes */}
        <div className="group">
          <BirthdayCard
            birthdaysToday={birthdayData?.today || []}
            birthdaysThisMonth={birthdayData?.thisMonth || []}
            isLoading={birthdayLoading}
          />
        </div>
      </div>
    </div>
  );

  const renderMemberDashboard = () => {
    // Calcular estatísticas de interessados
    const totalChurchInterested =
      churchInterested && Array.isArray(churchInterested) ? churchInterested.length : 0;

    const userActiveRelationships =
      userRelationships && Array.isArray(userRelationships)
        ? userRelationships.filter((rel: Relationship) => {
            const isMatch =
              rel &&
              typeof rel === 'object' &&
              rel.missionaryId === user?.id &&
              rel.status === 'active';
            return isMatch;
          })
        : [];

    const userPendingRelationships =
      userRelationships && Array.isArray(userRelationships)
        ? userRelationships.filter((rel: Relationship) => {
            const isMatch =
              rel &&
              typeof rel === 'object' &&
              rel.missionaryId === user?.id &&
              rel.status === 'pending';
            return isMatch;
          })
        : [];

    const totalUserInterested = userActiveRelationships.length + userPendingRelationships.length;

    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card de Estatísticas de Interessados */}
          <div onClick={() => navigate('/my-interested')} className="block h-full cursor-pointer">
            <Card className="group relative overflow-hidden bg-gradient-to-br from-purple-500 to-purple-700 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 h-full flex flex-col">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 to-purple-800/30 opacity-100 group-hover:from-purple-600/30 group-hover:to-purple-800/40 transition-all duration-300 pointer-events-none"></div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-400/30 to-purple-600/40 rounded-full -translate-y-16 translate-x-16 group-hover:scale-110 transition-transform duration-500 pointer-events-none"></div>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
                <CardTitle className="text-sm lg:text-base font-semibold text-white drop-shadow-md">
                  {t('dashboard.friends')}
                </CardTitle>
                <div className="p-2 rounded-full bg-white/20 backdrop-blur-sm text-white shadow-lg group-hover:bg-white/30 transition-all duration-300">
                  <Heart className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="relative flex-1">
                <div className="space-y-3">
                  {/* Interessados Vinculados */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm lg:text-base text-white/80">
                      {t('dashboard.linkedToYou')}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl lg:text-3xl font-bold text-white drop-shadow-lg">
                        {userRelationshipsLoading ? '...' : totalUserInterested}
                      </span>
                      <div className="flex items-center gap-1">
                        {userActiveRelationships.length > 0 && (
                          <div
                            className="w-2 h-2 bg-green-400 rounded-full"
                            title={t('dashboard.active')}
                          ></div>
                        )}
                        {userPendingRelationships.length > 0 && (
                          <div
                            className="w-2 h-2 bg-yellow-400 rounded-full"
                            title={t('dashboard.pending')}
                          ></div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Total da Igreja */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm lg:text-base text-white/80">
                      {t('dashboard.churchTotal')}
                    </span>
                    <span className="text-lg lg:text-xl font-bold text-white drop-shadow-lg">
                      {churchInterestedLoading ? '...' : totalChurchInterested}
                    </span>
                  </div>

                  {/* Barra de Progresso */}
                  {totalChurchInterested > 0 && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-white/70">
                        <span>{t('dashboard.yourReach')}</span>
                        <span>
                          {totalChurchInterested > 0
                            ? Math.round((totalUserInterested / totalChurchInterested) * 100)
                            : 0}
                          %
                        </span>
                      </div>
                      <Progress
                        value={
                          totalChurchInterested > 0
                            ? (totalUserInterested / totalChurchInterested) * 100
                            : 0
                        }
                        className="h-2"
                      />
                    </div>
                  )}
                </div>
              </CardContent>
              <div className="px-6 pb-4 relative">
                <p className="text-xs text-white/70 hover:text-white/90 transition-colors">
                  {t('dashboard.tapToSeeMore')}
                </p>
              </div>
            </Card>
          </div>

          <div onClick={() => navigate('/calendar')} className="block h-full cursor-pointer">
            <Card className="group relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-700 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 h-full flex flex-col">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-blue-800/30 opacity-100 group-hover:from-blue-600/30 group-hover:to-blue-800/40 transition-all duration-300 pointer-events-none"></div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/30 to-blue-600/40 rounded-full -translate-y-16 translate-x-16 group-hover:scale-110 transition-transform duration-500 pointer-events-none"></div>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
                <CardTitle className="text-sm lg:text-base font-semibold text-white drop-shadow-md">
                  {t('dashboard.monthEvents')}
                </CardTitle>
                <div className="p-2 rounded-full bg-white/20 backdrop-blur-sm text-white shadow-lg group-hover:bg-white/30 transition-all duration-300">
                  <Calendar className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="relative flex-1">
                <div className="space-y-3">
                  {/* Eventos deste mês */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm lg:text-base text-white/80">
                      {t('dashboard.eventsThisMonth')}
                    </span>
                    <span className="text-2xl lg:text-3xl font-bold text-white drop-shadow-lg">
                      {userEventsLoading ? '...' : eventsThisMonthCount}
                    </span>
                  </div>
                  {/* Próximo evento */}
                  <div className="mt-2">
                    <NextEventDisplay events={userEvents || []} />
                  </div>

                  {/* Aniversariante do dia ou próximo aniversário */}
                  <div className="mt-2">
                    <BirthdayDisplay
                      birthdays={birthdayData}
                      isLoading={birthdayLoading}
                      getNextBirthday={getNextBirthday}
                      formatBirthdayDate={formatBirthdayDate}
                    />
                  </div>

                  {/* Removido detalhe de acesso discriminado para membros */}
                </div>
              </CardContent>
              <div className="px-6 pb-4 relative">
                <p className="text-xs text-white/70 hover:text-white/90 transition-colors">
                  {t('dashboard.tapToSeeMore')}
                </p>
              </div>
            </Card>
          </div>

          {/* Card de Gamificação Rápida */}
          <QuickGamificationCard
            showDetails={true}
            userData={{
              ...userDetailedData?.userData,
              actualPoints:
                userDetailedData?.calculatedPoints || userDetailedData?.currentPoints || 0,
            }}
          />
        </div>
      </div>
    );
  };

  const renderInterestedDashboard = () => (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="group relative overflow-hidden bg-gradient-to-br from-cyan-500 to-cyan-700 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-600/20 to-cyan-800/30 opacity-100 group-hover:from-cyan-600/30 group-hover:to-cyan-800/40 transition-all duration-300"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-cyan-400/30 to-cyan-600/40 rounded-full -translate-y-16 translate-x-16 group-hover:scale-110 transition-transform duration-500"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm lg:text-base font-semibold text-white drop-shadow-md">
              {t('dashboard.availableEvents')}
            </CardTitle>
            <div className="p-2 rounded-full bg-white/20 backdrop-blur-sm text-white shadow-lg group-hover:bg-white/30 transition-all duration-300">
              <Calendar className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="space-y-3">
              {/* Total de eventos visíveis para o perfil */}
              <div className="flex items-center justify-between">
                <span className="text-sm lg:text-base text-white/80">
                  {t('dashboard.availableForYou')}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-2xl lg:text-3xl font-bold text-white drop-shadow-lg">
                    {userEventsLoading ? '...' : userEvents?.length || 0}
                  </span>
                  <div
                    className="w-2 h-2 bg-blue-500 rounded-full"
                    title={t('dashboard.visibleEvents')}
                  ></div>
                </div>
              </div>

              {/* Eventos desta semana */}
              <div className="flex items-center justify-between">
                <span className="text-sm lg:text-base text-gray-600">
                  {t('dashboard.eventsThisWeek')}
                </span>
                <span className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-green-600 to-green-800 bg-clip-text text-transparent">
                  {isLoading ? '...' : userEvents?.length || 0}
                </span>
              </div>

              {/* Barra de Progresso */}
              {stats.totalEvents > 0 && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{t('dashboard.yourAccess')}</span>
                    <span>
                      {stats.totalEvents > 0
                        ? Math.round(((userEvents?.length || 0) / stats.totalEvents) * 100)
                        : 0}
                      %
                    </span>
                  </div>
                  <Progress
                    value={
                      stats.totalEvents > 0
                        ? ((userEvents?.length || 0) / stats.totalEvents) * 100
                        : 0
                    }
                    className="h-2"
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden bg-gradient-to-br from-indigo-500 to-indigo-700 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 to-indigo-800/30 opacity-100 group-hover:from-indigo-600/30 group-hover:to-indigo-800/40 transition-all duration-300"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-400/30 to-indigo-600/40 rounded-full -translate-y-16 translate-x-16 group-hover:scale-110 transition-transform duration-500"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm lg:text-base font-semibold text-white drop-shadow-md">
              {t('dashboard.totalUsersShort')}
            </CardTitle>
            <div className="p-2 rounded-full bg-white/20 backdrop-blur-sm text-white shadow-lg group-hover:bg-white/30 transition-all duration-300">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl lg:text-4xl font-bold text-white drop-shadow-lg">
              {isLoading ? '...' : stats.totalUsers}
            </div>
            <p className="text-xs lg:text-sm text-white/80 mt-1">{t('dashboard.inCommunity')}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-200 via-blue-200 to-slate-300">
        <div className="text-center p-8 rounded-2xl bg-white/90 backdrop-blur-sm shadow-xl border border-white/30">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-amber-600 bg-clip-text text-transparent">
            {t('dashboard.loadingTitle')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">{t('dashboard.verifyingAuth')}</p>
        </div>
      </div>
    );
  }

  if (skin === 'v2') {
    return (
      <MobileLayout variant="prototype">
        <DashboardV2
          user={user}
          isAdmin={hasAdminAccess(user)}
          stats={stats}
          birthdayData={birthdayData}
          userEvents={userEvents}
          churchInterested={churchInterested}
          eventsThisMonthCount={eventsThisMonthCount}
          districtsCount={districtsCount}
          pastorsCount={pastorsCount}
          spiritualCheckIns={spiritualCheckIns}
          showCheckIn={showCheckIn}
          setShowCheckIn={setShowCheckIn}
          markCheckInComplete={markCheckInComplete}
        />
      </MobileLayout>
    );
  }

  // Definir fundo baseado no role do usuário
  const isAdmin = hasAdminAccess(user);
  const backgroundClasses = isAdmin
    ? 'min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 relative'
    : 'min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100 relative';

  const patternClasses = isAdmin
    ? 'absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-blue-400/5'
    : 'absolute inset-0 bg-gradient-to-br from-blue-100/30 via-transparent to-blue-50/20';

  const radialClasses = isAdmin
    ? 'absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.15),transparent_50%)]'
    : 'absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.05),transparent_50%)]';

  return (
    <MobileLayout>
      <div className={backgroundClasses}>
        {/* Background Pattern */}
        <div className={patternClasses}></div>
        <div className={radialClasses}></div>

        <div className="relative mx-auto max-w-7xl space-y-4 p-3 lg:space-y-8 lg:p-6">
          {/* Page heading - visually hidden but accessible */}
          <h1 className="sr-only">{t('dashboard.pageTitle', 'Painel de Controle')}</h1>

          {/* Role-specific Dashboard */}
          {hasAdminAccess(user) && <>{renderAdminDashboard()}</>}
          {(user.role.includes('missionary') || user.role.includes('member')) &&
            renderMemberDashboard()}
          {user.role === 'interested' && renderInterestedDashboard()}

          {/* Spiritual Check-in Modal - Abertura automática desabilitada */}
          <SpiritualCheckInModal
            isOpen={showCheckIn}
            onClose={() => {
              setShowCheckIn(false);
              markCheckInComplete();
            }}
          />
        </div>
      </div>
    </MobileLayout>
  );
};

export default Dashboard;
