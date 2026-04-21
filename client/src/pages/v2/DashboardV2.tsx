import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Bell,
  Building2,
  CalendarDays,
  Heart,
  MessageSquareHeart,
  NotebookTabs,
  Users,
} from 'lucide-react';
import { fetchWithAuth } from '@/lib/api';
import { useTransitionNavigate } from '@/hooks/useTransitionNavigate';
import { SpiritualCheckInModal } from '@/components/dashboard/SpiritualCheckInModal';
import {
  PrototypeAvatar,
  PrototypeHeaderIconButton,
  PrototypeStatusBar,
  formatShortDate,
} from './prototypeShared';
import { ThemeToggle } from '@/components/v2/ThemeToggle';
import { getUserRole } from '@/lib/permissions';

type EventLike = {
  id?: number | string;
  title?: string;
  date?: string;
  startDate?: string | null;
  time?: string;
  location?: string | null;
};

type BirthdayLike = {
  id?: number | string;
  name?: string;
  birthDate?: string;
};

type InterestedLike = {
  id?: number | string;
  name?: string;
  interestedSituation?: string | null;
  interested_situation?: string | null;
};

type DashboardStatsLike = {
  totalUsers?: number;
  totalInterested?: number;
  totalPoints?: number;
  interestedBeingDiscipled?: number;
  pendingTasks?: number;
  totalTasks?: number;
  pendingApprovals?: number;
  thisWeekEvents?: number;
};

interface DashboardV2Props {
  user: {
    id?: number | string;
    name?: string;
    role?: string;
  };
  isAdmin: boolean;
  stats: DashboardStatsLike;
  birthdayData?: { today?: BirthdayLike[] };
  userEvents?: EventLike[];
  churchInterested?: InterestedLike[];
  eventsThisMonthCount?: number;
  districtsCount?: number;
  pastorsCount?: number;
  spiritualCheckIns?: unknown[];
  showCheckIn: boolean;
  setShowCheckIn: (value: boolean) => void;
  markCheckInComplete: () => void;
}

type DashboardTask = {
  id: number;
  title: string;
  description?: string | null;
  due_date?: string | null;
  priority?: 'low' | 'medium' | 'high';
  status?: 'pending' | 'in_progress' | 'completed';
};

export const DashboardV2 = ({
  user,
  isAdmin,
  stats,
  birthdayData,
  userEvents = [],
  churchInterested = [],
  eventsThisMonthCount = 0,
  districtsCount = 0,
  pastorsCount = 0,
  spiritualCheckIns = [],
  showCheckIn,
  setShowCheckIn,
  markCheckInComplete,
}: DashboardV2Props) => {
  const navigate = useTransitionNavigate();
  const role = getUserRole(user);
  const isSuperadmin = role === 'superadmin';
  const isPastor = role === 'pastor';
  const isMissionary = role === 'missionary';
  const isMember = role === 'member';
  const isInterested = role === 'interested';
  const safeInterested = Array.isArray(churchInterested) ? churchInterested : [];
  const safeBirthdays = Array.isArray(birthdayData?.today) ? birthdayData.today : [];
  const safeCheckIns = Array.isArray(spiritualCheckIns) ? spiritualCheckIns : [];

  const { data: tasks = [] } = useQuery<DashboardTask[]>({
    queryKey: ['dashboard-v2-tasks', user?.id],
    queryFn: async () => {
      const response = await fetchWithAuth('/api/tasks');
      if (!response.ok) return [];
      const data = await response.json();
      return (data?.data?.tasks || data?.tasks || []) as DashboardTask[];
    },
    enabled: Boolean(user?.id && isPastor),
    staleTime: 30_000,
  });

  const urgentTasks = useMemo(
    () =>
      tasks
        .filter((task) => task.status !== 'completed')
        .sort((a, b) => {
          const priority = { high: 0, medium: 1, low: 2 };
          return (priority[a.priority || 'low'] ?? 9) - (priority[b.priority || 'low'] ?? 9);
        })
        .slice(0, 3),
    [tasks]
  );

  const nextEvent = useMemo(() => {
    const safeEvents = Array.isArray(userEvents) ? userEvents : [];
    const events = [...safeEvents]
      .map((event) => ({
        ...event,
        normalizedDate: new Date(event.startDate || event.date || ''),
      }))
      .filter((event) => !Number.isNaN(event.normalizedDate.getTime()))
      .sort((a, b) => a.normalizedDate.getTime() - b.normalizedDate.getTime());
    return events[0];
  }, [userEvents]);

  const birthdayPeople = safeBirthdays.slice(0, 3);
  const interestedPeople = safeInterested.slice(0, 3);
  const greeting =
    new Date().getHours() < 12 ? 'Bom dia' : new Date().getHours() < 18 ? 'Boa tarde' : 'Boa noite';
  const firstName = (user?.name || 'Usuário').split(' ')[0];
  const points = stats.totalPoints || 0;

  const heroCopy = {
    superadmin: {
      label: 'Operação da semana',
      title: `${greeting}, ${firstName}`,
      subtitle: 'Veja estrutura, pendências e liderança sem navegar por blocos administrativos.',
    },
    pastor: {
      label: 'Cuidado pastoral',
      title: `${greeting}, ${firstName}`,
      subtitle: 'As pessoas certas, na ordem certa, para você agir agora.',
    },
    missionary: {
      label: 'Minha missão',
      title: `${greeting}, ${firstName}`,
      subtitle: 'Uma leitura simples do que precisa de continuidade no seu acompanhamento.',
    },
    member: {
      label: 'Minha caminhada',
      title: `${greeting}, ${firstName}`,
      subtitle: 'Agenda, oração e progresso em um espaço mais leve.',
    },
    interested: {
      label: 'Próximos passos',
      title: `${greeting}, ${firstName}`,
      subtitle: 'Encontre eventos, fale com a igreja e continue sua jornada com clareza.',
    },
  }[role || 'member'];

  const topStats = isSuperadmin
    ? [
        { tone: 'navy', label: 'Usuários', value: stats.totalUsers || 0, dark: false },
        { tone: 'glass', label: 'Distritos', value: districtsCount || 0, dark: true },
        { tone: 'glass', label: 'Pastores', value: pastorsCount || 0, dark: true },
        { tone: 'gold', label: 'Pendências', value: stats.pendingApprovals || 0, dark: false },
      ]
    : isPastor
      ? [
          { tone: 'navy', label: 'Amigos', value: stats.totalInterested || 0, dark: false },
          {
            tone: 'glass',
            label: 'Em cuidado',
            value: stats.interestedBeingDiscipled || 0,
            dark: true,
          },
          { tone: 'glass', label: 'Tarefas', value: stats.pendingTasks || 0, dark: true },
          {
            tone: 'gold',
            label: 'Agenda',
            value: eventsThisMonthCount || stats.thisWeekEvents || 0,
            dark: false,
          },
        ]
      : isMissionary
        ? [
            { tone: 'navy', label: 'Acompanhando', value: interestedPeople.length, dark: false },
            { tone: 'glass', label: 'Eventos', value: eventsThisMonthCount, dark: true },
            { tone: 'gold', label: 'Pontos', value: points, dark: false },
          ]
        : isMember
          ? [
              { tone: 'navy', label: 'Eventos', value: eventsThisMonthCount, dark: false },
              { tone: 'glass', label: 'Orações', value: safeCheckIns.length, dark: true },
              { tone: 'gold', label: 'Pontos', value: points, dark: false },
            ]
          : [
              { tone: 'navy', label: 'Eventos', value: eventsThisMonthCount, dark: false },
              { tone: 'glass', label: 'Contato', value: 'Aberto', dark: true },
              { tone: 'gold', label: 'Jornada', value: '1 passo', dark: false },
            ];

  const actionItems = isSuperadmin
    ? [
        {
          label: 'Distritos',
          helper: 'Cobertura e estrutura',
          path: '/districts',
          icon: Building2,
          tone: 'gold',
        },
        {
          label: 'Pastores',
          helper: 'Liderança ativa',
          path: '/pastors',
          icon: Users,
          tone: 'soft',
        },
        {
          label: 'Relatórios',
          helper: 'Leitura executiva',
          path: '/reports',
          icon: NotebookTabs,
          tone: 'soft',
        },
      ]
    : isPastor
      ? [
          {
            label: 'Pessoas',
            helper: 'Membros e perfis',
            path: '/users',
            icon: Users,
            tone: 'soft',
          },
          {
            label: 'Cuidado',
            helper: 'Meus interessados',
            path: '/my-interested',
            icon: MessageSquareHeart,
            tone: 'gold',
          },
          {
            label: 'Tarefas',
            helper: 'Próxima ação',
            path: '/tasks',
            icon: NotebookTabs,
            tone: 'soft',
          },
        ]
      : isMissionary
        ? [
            {
              label: 'Acompanhamentos',
              helper: 'Quem precisa de retorno',
              path: '/my-interested',
              icon: MessageSquareHeart,
              tone: 'gold',
            },
            {
              label: 'Agenda',
              helper: 'Próximos encontros',
              path: '/calendar',
              icon: CalendarDays,
              tone: 'soft',
            },
            {
              label: 'Relatórios',
              helper: 'Resumo pessoal',
              path: '/my-reports',
              icon: NotebookTabs,
              tone: 'soft',
            },
          ]
        : isMember
          ? [
              {
                label: 'Agenda',
                helper: 'Próximos eventos',
                path: '/calendar',
                icon: CalendarDays,
                tone: 'gold',
              },
              {
                label: 'Orações',
                helper: 'Pedidos e cuidado',
                path: '/prayers',
                icon: Heart,
                tone: 'soft',
              },
              {
                label: 'Pontuação',
                helper: 'Minha jornada',
                path: '/gamification',
                icon: NotebookTabs,
                tone: 'soft',
              },
            ]
          : [
              {
                label: 'Falar com a igreja',
                helper: 'Contato direto',
                path: '/contact',
                icon: Heart,
                tone: 'gold',
              },
              {
                label: 'Ver agenda',
                helper: 'Encontros e eventos',
                path: '/calendar',
                icon: CalendarDays,
                tone: 'soft',
              },
              {
                label: 'Meu perfil',
                helper: 'Dados básicos',
                path: '/meu-cadastro',
                icon: Users,
                tone: 'soft',
              },
            ];

  const renderQuickActions = () => (
    <div className="p7-section">
      <div className="p7-card p7-card-p">
        <div className="mb-1 text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-[var(--v2-gold)]">
          Ações rápidas
        </div>
        <p className="mb-4 text-[0.82rem] leading-[1.55] text-[var(--p7-text-2)]">
          Menos caça ao tesouro entre páginas, mais clareza sobre o que vale abrir agora.
        </p>
        <div className="grid gap-3">
          {actionItems.map((item) => (
            <button
              key={item.path}
              type="button"
              onClick={() => navigate(item.path)}
              className="flex items-center gap-3 rounded-[18px] border border-[var(--p7-border)] bg-[var(--p7-card)] px-4 py-3 text-left shadow-[var(--shadow-card)] transition-transform hover:-translate-y-[1px]"
            >
              <div className={`p7-row-icon ${item.tone}`}>
                <item.icon className="h-[18px] w-[18px]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-[var(--p7-text)]">{item.label}</div>
                <div className="text-[0.74rem] text-[var(--p7-text-3)]">{item.helper}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderNextEvent = (linkLabel = 'Ver agenda', badgeLabel = 'Agenda') =>
    nextEvent ? (
      <div className="p7-section">
        <div className="p7-card p7-card-p">
          <div className="mb-3 flex items-center justify-between">
            <span className="p7-card-title">Próximo evento</span>
            <button type="button" className="p7-card-link" onClick={() => navigate('/calendar')}>
              {linkLabel}
            </button>
          </div>
          <button
            type="button"
            className="p7-event-chip w-full text-left"
            onClick={() => navigate('/calendar')}
          >
            <div className="p7-event-date">
              <div className="p7-event-day">
                {new Date(nextEvent.startDate || nextEvent.date || '').getDate()}
              </div>
              <div className="p7-event-mon">
                {new Date(nextEvent.startDate || nextEvent.date || '')
                  .toLocaleDateString('pt-BR', { month: 'short' })
                  .replace('.', '')}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[0.85rem] font-bold text-[var(--p7-text)]">
                {nextEvent.title || 'Evento'}
              </div>
              <div className="truncate text-[0.72rem] text-[var(--p7-text-3)]">
                {nextEvent.time || 'Horário a definir'} · {nextEvent.location || 'Sem local'}
              </div>
            </div>
            <span className="p7-pill soft">{badgeLabel}</span>
          </button>
        </div>
      </div>
    ) : null;

  const renderBirthdays = () => (
    <div className="p7-section">
      <div className="p7-card">
        <div className="p7-card-header">
          <span className="p7-card-title">Aniversariantes</span>
          <span className="p7-card-link">hoje</span>
        </div>
        {birthdayPeople.length > 0 ? (
          birthdayPeople.map((person) => (
            <div key={person.id} className="p7-row-item">
              <PrototypeAvatar
                name={person.name}
                className="h-[38px] w-[38px] text-[0.74rem]"
                solid
              />
              <div className="p7-row-text">
                <div className="p7-row-title">{person.name || 'Membro'}</div>
                <div className="p7-row-sub">Aniversariante do dia</div>
              </div>
              <span className="p7-pill gold">🎂</span>
            </div>
          ))
        ) : (
          <div className="px-4 pb-4 text-sm text-[var(--p7-text-3)]">
            Nenhum aniversariante hoje.
          </div>
        )}
      </div>
    </div>
  );

  const renderInterestedPanel = (title: string, helper: string) => (
    <div className="p7-section">
      <div className="p7-card p7-card-p">
        <div className="mb-3 flex items-center justify-between">
          <span className="p7-card-title">{title}</span>
          <button type="button" className="p7-card-link" onClick={() => navigate('/my-interested')}>
            Ver todos
          </button>
        </div>
        <div className="mb-3 flex gap-2 overflow-x-auto">
          {interestedPeople.length > 0 ? (
            interestedPeople.map((person) => {
              const state = person.interestedSituation || person.interested_situation || 'novo';
              const tone = state === 'inativo' ? 'red' : state === 'estudando' ? 'green' : 'warn';
              return (
                <div key={person.id} className="flex min-w-[74px] flex-col items-center gap-1.5">
                  <PrototypeAvatar name={person.name} className="h-11 w-11 text-[0.72rem]" solid />
                  <div className="text-[0.65rem] text-[var(--p7-text-2)]">
                    {(person.name || 'Pessoa').split(' ')[0]}
                  </div>
                  <span
                    className={`p7-pill ${tone}`}
                    style={{ padding: '1px 6px', fontSize: '0.58rem' }}
                  >
                    {state}
                  </span>
                </div>
              );
            })
          ) : (
            <div className="text-sm text-[var(--p7-text-3)]">{helper}</div>
          )}
        </div>
        <div className="p7-progress-track">
          <div
            className="p7-progress-fill"
            style={{
              width: `${Math.min((interestedPeople.length / Math.max(stats.totalInterested || 1, 1)) * 100, 100)}%`,
            }}
          />
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[0.7rem] text-[var(--p7-text-3)]">
          <span>
            {interestedPeople.length} de {stats.totalInterested || 0} da igreja
          </span>
          <span className="font-semibold text-[hsl(var(--primary))]">
            {stats.totalInterested
              ? Math.round((interestedPeople.length / stats.totalInterested) * 100)
              : 0}
            %
          </span>
        </div>
      </div>
    </div>
  );

  const renderPrayerPanel = (title: string, subtitle: string, path = '/prayers') => (
    <div className="p7-section pb-4">
      <div className="p7-card">
        <div className="p7-card-header">
          <span className="p7-card-title">{title}</span>
          <button type="button" className="p7-card-link" onClick={() => navigate(path)}>
            Abrir
          </button>
        </div>
        <div className="p7-row-item">
          <div className="p7-row-icon gold">
            <Heart className="h-[18px] w-[18px]" />
          </div>
          <div className="p7-row-text">
            <div className="p7-row-title">{subtitle}</div>
            <div className="p7-row-sub">
              {safeCheckIns.length} registros recentes para acompanhar
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p7-shell">
      <div className="p7-screen">
        <PrototypeStatusBar />
        <div className="p7-grad-header">
          <div className="p7-header-row">
            <div>
              <div className="p7-header-label">{heroCopy.label}</div>
              <div className="p7-header-title">{heroCopy.title}</div>
              <div className="mt-1 max-w-[220px] text-[0.78rem] leading-[1.45] text-white/75">
                {heroCopy.subtitle}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              {isAdmin ? (
                <div className="relative">
                  <PrototypeHeaderIconButton
                    icon={Bell}
                    onClick={() => navigate('/menu')}
                    label="Abrir menu de notificações"
                  />
                  <span className="absolute right-0 top-0 h-2 w-2 rounded-full border border-[var(--sidebar-background)] bg-[var(--secondary)]" />
                </div>
              ) : (
                <div
                  className="p7-pill"
                  style={{
                    background: 'rgba(255,255,255,.15)',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,.2)',
                  }}
                >
                  <Heart className="h-3 w-3 fill-current" strokeWidth={2} />
                  {isInterested ? 'Bem-vindo' : `${points} pts`}
                </div>
              )}
              <PrototypeAvatar name={user?.name} className="h-9 w-9 text-[0.8rem]" />
            </div>
          </div>
        </div>

        <div className="p7-scroll">
          {!isInterested && (
            <button
              type="button"
              className="p7-checkin-banner w-[calc(100%-32px)] text-left"
              onClick={() => setShowCheckIn(true)}
            >
              <div className="p7-checkin-icon">
                <Heart className="h-5 w-5" />
              </div>
              <div>
                <div className="p7-checkin-title">
                  {isAdmin ? 'Check-in espiritual' : 'Check-in semanal'}
                </div>
                <div className="p7-checkin-sub">
                  {isAdmin
                    ? 'Como está sua semana de liderança?'
                    : 'Como está sua caminhada nesta semana?'}
                </div>
              </div>
              <span className="p7-checkin-cta">{isAdmin ? 'Abrir' : 'Responder'}</span>
            </button>
          )}

          <div className="p7-stats-row" tabIndex={-1} aria-label="Resumo do painel">
            {topStats.map((stat) => (
              <div key={stat.label} className={`p7-stat-card ${stat.tone}`}>
                <div className={`p7-stat-num ${stat.dark ? 'dark' : ''}`}>{stat.value}</div>
                <div className={`p7-stat-label ${stat.dark ? 'dark' : ''}`}>{stat.label}</div>
              </div>
            ))}
          </div>

          {renderQuickActions()}

          {isSuperadmin ? (
            <>
              <div className="p7-section">
                <div className="p7-card p7-card-p">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="p7-card-title">Atenção imediata</span>
                    <button
                      type="button"
                      className="p7-card-link"
                      onClick={() => navigate('/menu')}
                    >
                      Ver central
                    </button>
                  </div>
                  <div className="space-y-2">
                    <div className="rounded-[16px] bg-[var(--p7-surface-2)] px-4 py-3 text-sm text-[var(--p7-text)]">
                      {stats.pendingApprovals || 0} aprovações ou decisões esperando revisão.
                    </div>
                    <div className="rounded-[16px] bg-[var(--p7-surface-2)] px-4 py-3 text-sm text-[var(--p7-text)]">
                      {stats.totalInterested || 0} interessados ativos na operação atual.
                    </div>
                    <div className="rounded-[16px] bg-[var(--p7-surface-2)] px-4 py-3 text-sm text-[var(--p7-text)]">
                      {pastorsCount || 0} líderes em acompanhamento na estrutura da igreja.
                    </div>
                  </div>
                </div>
              </div>
              {renderNextEvent('Ver agenda', 'Agenda')}
              {renderBirthdays()}
            </>
          ) : isPastor ? (
            <>
              <div className="p7-section">
                <div className="p7-card">
                  <div className="p7-card-header">
                    <span className="p7-card-title">Tarefas urgentes</span>
                    <button
                      type="button"
                      className="p7-card-link"
                      onClick={() => navigate('/tasks')}
                    >
                      Ver todas
                    </button>
                  </div>
                  <div className="space-y-2 px-4 pb-4">
                    {urgentTasks.length > 0 ? (
                      urgentTasks.map((task) => (
                        <button
                          key={task.id}
                          type="button"
                          className="p7-task-item w-full text-left"
                          onClick={() => navigate('/tasks')}
                        >
                          <div className="p7-task-check" />
                          <div className="min-w-0 flex-1">
                            <div className="p7-task-title">{task.title}</div>
                            <div className="p7-task-meta">
                              {(task.priority || 'média') === 'high' ? 'Urgente' : 'Acompanhar'} ·{' '}
                              {task.due_date ? formatShortDate(task.due_date) : 'Sem prazo'}
                            </div>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="px-1 pb-1 text-sm text-[var(--p7-text-3)]">
                        Sem pendências críticas no momento.
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {renderInterestedPanel(
                'Pessoas em cuidado',
                'Nenhuma pessoa acompanhada no momento.'
              )}
              {renderNextEvent('Ver agenda', 'Agenda')}
              {renderBirthdays()}
            </>
          ) : isMissionary ? (
            <>
              {renderInterestedPanel(
                'Pessoas em acompanhamento',
                'Sua lista de acompanhamento ainda está vazia.'
              )}
              {renderNextEvent('Ver agenda', 'Confirmado')}
              {renderPrayerPanel(
                'Vida espiritual',
                'Reserve alguns minutos para interceder e revisar seus contatos.'
              )}
            </>
          ) : isMember ? (
            <>
              {renderNextEvent('Abrir agenda', 'Evento')}
              {renderPrayerPanel(
                'Pedidos de oração',
                'Acompanhe pedidos recentes e permaneça perto da comunidade.'
              )}
              {renderBirthdays()}
            </>
          ) : (
            <>
              <div className="p7-section">
                <div className="p7-card p7-card-p">
                  <div className="mb-1 text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-[var(--v2-gold)]">
                    Comece por aqui
                  </div>
                  <p className="text-[0.86rem] leading-[1.6] text-[var(--p7-text-2)]">
                    O melhor caminho agora é ver os próximos encontros e falar com a equipe para
                    receber orientação.
                  </p>
                </div>
              </div>
              {renderNextEvent('Ver agenda', 'Próximo')}
              {renderPrayerPanel(
                'Fale com a igreja',
                'Quando quiser conversar, a equipe está pronta para acolher você.',
                '/contact'
              )}
            </>
          )}
        </div>

        <SpiritualCheckInModal
          isOpen={showCheckIn}
          onClose={() => {
            setShowCheckIn(false);
            markCheckInComplete();
          }}
        />
      </div>
    </div>
  );
};
