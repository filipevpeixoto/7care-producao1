import React from 'react';
import {
  Calendar,
  Users,
  CheckSquare,
  Heart,
  Building2,
  UserCog,
} from 'lucide-react';
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
import type { Event, BirthdayUser, Relationship } from '@/types/domain';
import { useDashboardData } from './dashboard/useDashboardData';

const Dashboard = () => {
  const navigate = useTransitionNavigate();
  const {
    user,
    showCheckIn, setShowCheckIn, markCheckInComplete,
    stats, isLoading, tasksLoading,
    birthdayData, birthdayLoading,
    visitData, visitsLoading, refetchVisits,
    userEvents, userEventsLoading, eventsThisMonthCount,
    spiritualCheckIns, spiritualCheckInsLoading,
    districtsCount, pastorsCount,
    churchInterested, churchInterestedLoading,
    userRelationships, userRelationshipsLoading,
    userDetailedData,
    getNextBirthday, formatBirthdayDate,
  } = useDashboardData();

  // ── Inline sub-components ─────────────────────────────────


  // Componente auxiliar para exibir próximo evento (prioriza eventos de hoje)
  const NextEventDisplay: React.FC<{ events: Event[] }> = ({ events }) => {
    if (!events || !Array.isArray(events)) {
      return <p className="text-xs text-gray-500">Sem próximos eventos</p>;
    }

    const parse = (v: unknown) => {
      if (!v) return null;

      // CRÍTICO: Se for string ISO (YYYY-MM-DD), parsear manualmente para evitar timezone
      if (typeof v === 'string') {
        const isoMatch = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (isoMatch) {
          const [, year, month, day] = isoMatch;
          // Criar data LOCAL para evitar conversão de timezone
          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        }
      }

      const d = new Date(v as string | number | Date);
      return isNaN(d.getTime()) ? null : d;
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Mapeia e filtra eventos válidos
    const validEvents = [...events]
      .filter(e => e && typeof e === 'object')
      .map(e => {
        // Eventos usam 'date' e 'end_date' no banco (snake_case)
        const startDate = e.startDate || e.date;
        const endDate = e.endDate || e.end_date;
        return {
          ...e,
          _start: parse(startDate),
          _end: endDate ? parse(endDate) : null,
        };
      })
      .filter(e => e._start);

    // 1. PRIORIDADE: Buscar eventos de HOJE (incluindo eventos de múltiplos dias)
    const todayEvents = validEvents
      .filter(e => {
        const eventStartDate = new Date(e._start as Date);
        const eventEndDate = e._end ? new Date(e._end as Date) : eventStartDate;

        // Criar timestamps apenas com ano/mês/dia (ignorando horas e timezone)
        const startTimestamp = new Date(
          eventStartDate.getFullYear(),
          eventStartDate.getMonth(),
          eventStartDate.getDate()
        ).getTime();

        const endTimestamp = new Date(
          eventEndDate.getFullYear(),
          eventEndDate.getMonth(),
          eventEndDate.getDate()
        ).getTime();

        const todayTimestamp = today.getTime();

        // CRÍTICO: Verificar se hoje está ENTRE a data de início e fim (inclusive)
        const isHappeningToday = todayTimestamp >= startTimestamp && todayTimestamp <= endTimestamp;

        return isHappeningToday;
      })
      .sort((a, b) => (a._start as Date).getTime() - (b._start as Date).getTime());

    // 2. Se não tem evento hoje, buscar próximos eventos futuros
    const upcomingEvents = validEvents
      .filter(e => {
        const eventDate = new Date(e._start as Date);
        // Comparar ano/mês/dia para eventos futuros ou de hoje
        const eventTimestamp = new Date(
          eventDate.getFullYear(),
          eventDate.getMonth(),
          eventDate.getDate()
        ).getTime();
        const todayTimestamp = today.getTime();
        return eventTimestamp >= todayTimestamp;
      })
      .sort((a, b) => (a._start as Date).getTime() - (b._start as Date).getTime());

    const eventToShow = todayEvents.length > 0 ? todayEvents[0] : upcomingEvents[0];

    if (!eventToShow) {
      return <p className="text-xs text-gray-500">Sem próximos eventos</p>;
    }

    const ev = eventToShow;
    const dt = ev._start as Date;
    const isToday = todayEvents.length > 0;
    const eventTitle = ev.title || 'Sem título';

    // Verificar se é evento de múltiplos dias
    const isMultiDay = ev._end && ev._end !== ev._start;
    let dateText = '';

    if (isMultiDay) {
      const startDate = new Date(ev._start as Date);
      const endDate = new Date(ev._end as Date);
      const startTimestamp = new Date(
        startDate.getFullYear(),
        startDate.getMonth(),
        startDate.getDate()
      ).getTime();
      const endTimestamp = new Date(
        endDate.getFullYear(),
        endDate.getMonth(),
        endDate.getDate()
      ).getTime();

      if (startTimestamp !== endTimestamp) {
        // Evento de múltiplos dias - mostrar intervalo
        const startFormatted = startDate.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
        });
        const endFormatted = endDate.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
        });
        dateText = `${startFormatted} a ${endFormatted}`;
      } else {
        // Mesmo dia, mostrar como normal
        dateText = dt.toLocaleDateString('pt-BR', {
          weekday: 'long',
          day: '2-digit',
          month: '2-digit',
        });
      }
    } else {
      // Evento de um dia
      dateText = dt.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
      });
    }

    return (
      <div className="flex items-center gap-3 rounded-xl border border-blue-100/60 bg-gradient-to-br from-white to-blue-50/40 p-3 shadow-sm">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-700">
          <Calendar className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] uppercase tracking-wide text-blue-700/70">
            {isToday ? 'Evento HOJE' : 'Próximo evento'}
          </div>
          {/* Título com tooltip elegante em CSS puro */}
          <div className="relative group">
            <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate cursor-help">
              {eventTitle}
            </div>
            {/* Tooltip elegante - aparece ao hover se o texto estiver truncado */}
            {eventTitle.length > 30 && (
              <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-50 animate-in fade-in-0 zoom-in-95 duration-200">
                <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 text-white text-xs px-3 py-2 rounded-lg shadow-2xl max-w-xs border border-gray-700/50 backdrop-blur-sm">
                  <div className="font-medium leading-relaxed">{eventTitle}</div>
                  {/* Seta do tooltip */}
                  <div className="absolute top-full left-6 -mt-1">
                    <div className="border-4 border-transparent border-t-gray-900"></div>
                  </div>
                  {/* Brilho sutil */}
                  <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/10 to-transparent pointer-events-none"></div>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-gray-500">Data</div>
          <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">{dateText}</div>
        </div>
      </div>
    );
  };

  // Componente auxiliar para exibir aniversariante do dia ou próximo aniversário
  const BirthdayDisplay: React.FC<{
    birthdays: { today?: BirthdayUser[]; all?: BirthdayUser[] };
  }> = ({ birthdays }) => {
    if (birthdayLoading) {
      return <p className="text-xs text-gray-500">Carregando...</p>;
    }

    if (birthdays.today && birthdays.today.length > 0) {
      // Aniversariante do dia
      return (
        <div className="flex items-center gap-3 rounded-xl border border-pink-100/60 bg-gradient-to-br from-white to-pink-50/40 p-3 shadow-sm">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-pink-500/10 text-pink-700">
            <span className="text-lg">🎂</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] uppercase tracking-wide text-pink-700/70">
              Aniversariante do dia
            </div>
            <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
              {birthdays.today[0].name}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-gray-500">Hoje</div>
            <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">🎉</div>
          </div>
        </div>
      );
    } else {
      // Próximo aniversário
      const nextBirthday = getNextBirthday(birthdays);
      if (nextBirthday) {
        return (
          <div className="flex items-center gap-3 rounded-xl border border-pink-100/60 bg-gradient-to-br from-white to-pink-50/40 p-3 shadow-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-pink-500/10 text-pink-700">
              <span className="text-lg">🎂</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] uppercase tracking-wide text-pink-700/70">
                Próximo aniversário
              </div>
              <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                {nextBirthday.name}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-gray-500">Data</div>
              <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                {formatBirthdayDate(nextBirthday.nextBirthday)}
              </div>
            </div>
          </div>
        );
      }
      return <p className="text-xs text-gray-500">Sem aniversários próximos</p>;
    }
  };


  const renderAdminDashboard = () => (
    <div className="space-y-4 lg:space-y-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-6">
            <Card className="group relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-700 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-blue-800/30 opacity-100 group-hover:from-blue-600/30 group-hover:to-blue-800/40 transition-all duration-300"></div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/30 to-blue-600/40 rounded-full -translate-y-16 translate-x-16 group-hover:scale-110 transition-transform duration-500"></div>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 lg:pb-2 relative z-10">
                <CardTitle className="text-sm lg:text-base font-semibold text-white drop-shadow-md">
                  Total de Usuários
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
                  {stats.approvedUsers} usuários aprovados
                </p>
                <Button
                  onClick={() => navigate('/users')}
                  className="mt-2 lg:mt-3 h-7 lg:h-9 px-3 lg:px-4 text-xs lg:text-sm bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white shadow-md hover:shadow-lg transition-all duration-200 border-0"
                >
                  <Users className="h-2 w-2 lg:h-3 lg:w-3 mr-1" />
                  <span className="hidden sm:inline">Gerenciar Usuários</span>
                  <span className="sm:hidden">Usuários</span>
                </Button>
              </CardContent>
            </Card>

            <Card className="group relative overflow-hidden bg-gradient-to-br from-red-500 to-red-700 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-red-600/20 to-red-800/30 opacity-100 group-hover:from-red-600/30 group-hover:to-red-800/40 transition-all duration-300"></div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-red-400/30 to-red-600/40 rounded-full -translate-y-16 translate-x-16 group-hover:scale-110 transition-transform duration-500"></div>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 lg:pb-2 relative z-10">
                <CardTitle className="text-sm lg:text-base font-semibold text-white drop-shadow-md">
                  Amigos da igreja
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
                  <span className="text-xs lg:text-sm text-white/80">Amigos</span>
                </div>
                <div className="flex items-center gap-2 pt-1 border-t border-white/20">
                  <div className="text-lg lg:text-2xl font-bold text-white/90 drop-shadow">
                    {isLoading ? '...' : stats.interestedBeingDiscipled || 0}
                  </div>
                  <span className="text-xs lg:text-sm text-white/80 leading-tight">
                    Estão Sendo Discipulados
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="group relative overflow-hidden bg-gradient-to-br from-orange-500 to-orange-700 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-600/20 to-orange-800/30 opacity-100 group-hover:from-orange-600/30 group-hover:to-orange-800/40 transition-all duration-300"></div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-400/30 to-orange-600/40 rounded-full -translate-y-16 translate-x-16 group-hover:scale-110 transition-transform duration-500"></div>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 lg:pb-2 relative z-10">
                <CardTitle className="text-sm lg:text-base font-semibold text-white drop-shadow-md">
                  Tarefas
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
                  <span className="text-xs lg:text-sm text-white/80">Pendentes</span>
                </div>
                <div className="flex items-center gap-2 pt-1 border-t border-white/20">
                  <div className="text-lg lg:text-2xl font-bold text-white/90 drop-shadow">
                    {isLoading || tasksLoading ? '...' : stats?.completedTasks || 0}
                  </div>
                  <span className="text-xs lg:text-sm text-white/80 leading-tight">Concluídas</span>
                </div>
                <div className="flex items-center gap-2 pt-1 border-t border-white/20">
                  <div className="text-sm lg:text-lg font-semibold text-white/90 drop-shadow">
                    {isLoading || tasksLoading ? '...' : stats?.totalTasks || 0}
                  </div>
                  <span className="text-xs lg:text-sm text-white/80 leading-tight">Total</span>
                </div>
                <Button
                  onClick={() => navigate('/tasks')}
                  className="mt-2 lg:mt-3 h-7 lg:h-9 px-3 lg:px-4 text-xs lg:text-sm bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white shadow-md hover:shadow-lg transition-all duration-200 border-0 w-full"
                >
                  <CheckSquare className="h-2 w-2 lg:h-3 lg:w-3 mr-1" />
                  <span className="hidden sm:inline">Gerenciar Tarefas</span>
                  <span className="sm:hidden">Tarefas</span>
                </Button>
              </CardContent>
            </Card>

            {/* Card de Membros */}
            <Card className="group relative overflow-hidden bg-gradient-to-br from-green-500 to-green-700 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-green-600/20 to-green-800/30 opacity-100 group-hover:from-green-600/30 group-hover:to-green-800/40 transition-all duration-300"></div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-400/30 to-green-600/40 rounded-full -translate-y-16 translate-x-16 group-hover:scale-110 transition-transform duration-500"></div>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 lg:pb-2 relative z-10">
                <CardTitle className="text-sm lg:text-base font-semibold text-white drop-shadow-md">
                  Membros
                </CardTitle>
                <div className="p-1 lg:p-2 rounded-full bg-white/20 backdrop-blur-sm text-white shadow-lg group-hover:bg-white/30 transition-all duration-300">
                  <Users className="h-3 w-3 lg:h-4 lg:w-4" />
                </div>
              </CardHeader>
              <CardContent className="relative z-10 p-3 lg:p-6">
                <div className="text-xl lg:text-4xl font-bold text-white drop-shadow-lg">
                  {isLoading ? '...' : stats.totalMembers}
                </div>
                <p className="text-xs lg:text-sm text-white/80 mt-1">Membros ativos da igreja</p>
              </CardContent>
            </Card>

            {/* Card de Missionários */}
            <Card className="group relative overflow-hidden bg-gradient-to-br from-purple-500 to-purple-700 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 to-purple-800/30 opacity-100 group-hover:from-purple-600/30 group-hover:to-purple-800/40 transition-all duration-300"></div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-400/30 to-purple-600/40 rounded-full -translate-y-16 translate-x-16 group-hover:scale-110 transition-transform duration-500"></div>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 lg:pb-2 relative z-10">
                <CardTitle className="text-sm lg:text-base font-semibold text-white drop-shadow-md">
                  Missionários
                </CardTitle>
                <div className="p-1 lg:p-2 rounded-full bg-white/20 backdrop-blur-sm text-white shadow-lg group-hover:bg-white/30 transition-all duration-300">
                  <Heart className="h-3 w-3 lg:h-4 lg:w-4" />
                </div>
              </CardHeader>
              <CardContent className="relative z-10 p-3 lg:p-6">
                <div className="text-xl lg:text-4xl font-bold text-white drop-shadow-lg">
                  {isLoading ? '...' : stats.totalMissionaries}
                </div>
                <p className="text-xs lg:text-sm text-white/80 mt-1">Discipuladores ativos</p>
              </CardContent>
            </Card>

            {/* Card de Check-ins Espirituais */}
            <Card className="group relative overflow-hidden bg-gradient-to-br from-pink-500 to-pink-700 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-pink-600/20 to-pink-800/30 opacity-100 group-hover:from-pink-600/30 group-hover:to-pink-800/40 transition-all duration-300"></div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-pink-400/30 to-pink-600/40 rounded-full -translate-y-16 translate-x-16 group-hover:scale-110 transition-transform duration-500"></div>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 lg:pb-2 relative z-10">
                <CardTitle className="text-sm lg:text-base font-semibold text-white drop-shadow-md">
                  Check-ins Espirituais
                </CardTitle>
                <div className="p-1 lg:p-2 rounded-full bg-white/20 backdrop-blur-sm text-white shadow-lg group-hover:bg-white/30 transition-all duration-300">
                  <span className="text-sm lg:text-base filter brightness-0 invert">🙏</span>
                </div>
              </CardHeader>
              <CardContent className="relative z-10 p-3 lg:p-6">
                <div className="text-xl lg:text-4xl font-bold text-white drop-shadow-lg">
                  {spiritualCheckInsLoading ? '...' : spiritualCheckIns?.length || 0}
                </div>
                <p className="text-xs lg:text-sm text-white/80 mt-1">
                  Últimos check-ins espirituais dos membros
                </p>
                <Button
                  onClick={() => setShowCheckIn(true)}
                  className="mt-2 lg:mt-3 h-7 lg:h-9 px-3 lg:px-4 text-xs lg:text-sm bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white shadow-md hover:shadow-lg transition-all duration-200 border-0"
                >
                  <span className="mr-1 filter brightness-0 invert">🙏</span>
                  <span className="hidden sm:inline">Fazer meu check-in</span>
                  <span className="sm:hidden">Check-in</span>
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
                      Distritos
                    </CardTitle>
                    <div className="p-1 lg:p-2 rounded-full bg-white/20 backdrop-blur-sm text-white shadow-lg group-hover:bg-white/30 transition-all duration-300">
                      <Building2 className="h-3 w-3 lg:h-4 lg:w-4" />
                    </div>
                  </CardHeader>
                  <CardContent className="relative z-10 p-3 lg:p-6">
                    <div className="text-xl lg:text-4xl font-bold text-white drop-shadow-lg">
                      {districtsCount ?? '...'}
                    </div>
                    <p className="text-xs lg:text-sm text-white/80 mt-1">Distritos cadastrados</p>
                    <Button
                      onClick={() => navigate('/districts')}
                      className="mt-2 lg:mt-3 h-7 lg:h-9 px-3 lg:px-4 text-xs lg:text-sm bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white shadow-md hover:shadow-lg transition-all duration-200 border-0"
                    >
                      <Building2 className="h-2 w-2 lg:h-3 lg:w-3 mr-1" />
                      <span className="hidden sm:inline">Gerenciar Distritos</span>
                      <span className="sm:hidden">Distritos</span>
                    </Button>
                  </CardContent>
                </Card>

                {/* Card de Pastores */}
                <Card className="group relative overflow-hidden bg-gradient-to-br from-amber-500 to-amber-700 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-600/20 to-amber-800/30 opacity-100 group-hover:from-amber-600/30 group-hover:to-amber-800/40 transition-all duration-300"></div>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-400/30 to-amber-600/40 rounded-full -translate-y-16 translate-x-16 group-hover:scale-110 transition-transform duration-500"></div>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 lg:pb-2 relative z-10">
                    <CardTitle className="text-sm lg:text-base font-semibold text-white drop-shadow-md">
                      Pastores
                    </CardTitle>
                    <div className="p-1 lg:p-2 rounded-full bg-white/20 backdrop-blur-sm text-white shadow-lg group-hover:bg-white/30 transition-all duration-300">
                      <UserCog className="h-3 w-3 lg:h-4 lg:w-4" />
                    </div>
                  </CardHeader>
                  <CardContent className="relative z-10 p-3 lg:p-6">
                    <div className="text-xl lg:text-4xl font-bold text-white drop-shadow-lg">
                      {pastorsCount ?? '...'}
                    </div>
                    <p className="text-xs lg:text-sm text-white/80 mt-1">Pastores cadastrados</p>
                    <Button
                      onClick={() => navigate('/pastors')}
                      className="mt-2 lg:mt-3 h-7 lg:h-9 px-3 lg:px-4 text-xs lg:text-sm bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white shadow-md hover:shadow-lg transition-all duration-200 border-0"
                    >
                      <UserCog className="h-2 w-2 lg:h-3 lg:w-3 mr-1" />
                      <span className="hidden sm:inline">Gerenciar Pastores</span>
                      <span className="sm:hidden">Pastores</span>
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
          <div
            onClick={() => navigate('/my-interested')}
            className="block h-full cursor-pointer"
          >
            <Card className="group relative overflow-hidden bg-gradient-to-br from-purple-500 to-purple-700 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 h-full flex flex-col">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 to-purple-800/30 opacity-100 group-hover:from-purple-600/30 group-hover:to-purple-800/40 transition-all duration-300 pointer-events-none"></div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-400/30 to-purple-600/40 rounded-full -translate-y-16 translate-x-16 group-hover:scale-110 transition-transform duration-500 pointer-events-none"></div>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
                <CardTitle className="text-sm lg:text-base font-semibold text-white drop-shadow-md">
                  Amigos
                </CardTitle>
                <div className="p-2 rounded-full bg-white/20 backdrop-blur-sm text-white shadow-lg group-hover:bg-white/30 transition-all duration-300">
                  <Heart className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="relative flex-1">
                <div className="space-y-3">
                  {/* Interessados Vinculados */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm lg:text-base text-white/80">Vinculados a você:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl lg:text-3xl font-bold text-white drop-shadow-lg">
                        {userRelationshipsLoading ? '...' : totalUserInterested}
                      </span>
                      <div className="flex items-center gap-1">
                        {userActiveRelationships.length > 0 && (
                          <div className="w-2 h-2 bg-green-400 rounded-full" title="Ativos"></div>
                        )}
                        {userPendingRelationships.length > 0 && (
                          <div
                            className="w-2 h-2 bg-yellow-400 rounded-full"
                            title="Pendentes"
                          ></div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Total da Igreja */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm lg:text-base text-white/80">Total da igreja:</span>
                    <span className="text-lg lg:text-xl font-bold text-white drop-shadow-lg">
                      {churchInterestedLoading ? '...' : totalChurchInterested}
                    </span>
                  </div>

                  {/* Barra de Progresso */}
                  {totalChurchInterested > 0 && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-white/70">
                        <span>Seu alcance</span>
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
                  Toque para ver mais
                </p>
              </div>
            </Card>
          </div>

          <div
            onClick={() => navigate('/calendar')}
            className="block h-full cursor-pointer"
          >
            <Card className="group relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-700 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 h-full flex flex-col">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-blue-800/30 opacity-100 group-hover:from-blue-600/30 group-hover:to-blue-800/40 transition-all duration-300 pointer-events-none"></div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/30 to-blue-600/40 rounded-full -translate-y-16 translate-x-16 group-hover:scale-110 transition-transform duration-500 pointer-events-none"></div>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
                <CardTitle className="text-sm lg:text-base font-semibold text-white drop-shadow-md">
                  Eventos do Mês
                </CardTitle>
                <div className="p-2 rounded-full bg-white/20 backdrop-blur-sm text-white shadow-lg group-hover:bg-white/30 transition-all duration-300">
                  <Calendar className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="relative flex-1">
                <div className="space-y-3">
                  {/* Eventos deste mês */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm lg:text-base text-white/80">Eventos deste mês:</span>
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
                    <BirthdayDisplay birthdays={birthdayData} />
                  </div>

                  {/* Removido detalhe de acesso discriminado para membros */}
                </div>
              </CardContent>
              <div className="px-6 pb-4 relative">
                <p className="text-xs text-white/70 hover:text-white/90 transition-colors">
                  Toque para ver mais
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
              Eventos Disponíveis
            </CardTitle>
            <div className="p-2 rounded-full bg-white/20 backdrop-blur-sm text-white shadow-lg group-hover:bg-white/30 transition-all duration-300">
              <Calendar className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="space-y-3">
              {/* Total de eventos visíveis para o perfil */}
              <div className="flex items-center justify-between">
                <span className="text-sm lg:text-base text-white/80">Disponíveis para você:</span>
                <div className="flex items-center gap-2">
                  <span className="text-2xl lg:text-3xl font-bold text-white drop-shadow-lg">
                    {userEventsLoading ? '...' : userEvents?.length || 0}
                  </span>
                  <div className="w-2 h-2 bg-blue-500 rounded-full" title="Eventos visíveis"></div>
                </div>
              </div>

              {/* Eventos desta semana */}
              <div className="flex items-center justify-between">
                <span className="text-sm lg:text-base text-gray-600">Eventos desta semana:</span>
                <span className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-green-600 to-green-800 bg-clip-text text-transparent">
                  {isLoading ? '...' : userEvents?.length || 0}
                </span>
              </div>

              {/* Barra de Progresso */}
              {stats.totalEvents > 0 && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Seu acesso</span>
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
              Total Usuários
            </CardTitle>
            <div className="p-2 rounded-full bg-white/20 backdrop-blur-sm text-white shadow-lg group-hover:bg-white/30 transition-all duration-300">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl lg:text-4xl font-bold text-white drop-shadow-lg">
              {isLoading ? '...' : stats.totalUsers}
            </div>
            <p className="text-xs lg:text-sm text-white/80 mt-1">Na comunidade</p>
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
            Carregando...
          </h2>
          <p className="text-gray-600 dark:text-gray-400">Verificando autenticação</p>
        </div>
      </div>
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

        <div className="relative space-y-4 lg:space-y-8 p-3 lg:p-6 max-w-7xl mx-auto">
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
