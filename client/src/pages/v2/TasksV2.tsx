import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { Task } from '../tasks/tasksTypes';
import { PrototypeHeaderIconButton, PrototypeStatusBar, formatShortDate } from './prototypeShared';
import { ThemeToggle } from '@/components/v2/ThemeToggle';

interface TasksV2Props {
  pendingTasks: Task[];
  inProgressTasks: Task[];
  completedTasks: Task[];
  onToggleStatus: (task: Task) => void;
  onOpenCreate: () => void;
}

type TasksV2Filter = 'all' | 'urgent' | 'week' | 'completed';

const getTaskTone = (task: Task) => {
  if (task.priority === 'high') return 'red';
  if (task.priority === 'medium') return 'warn';
  return 'soft';
};

const getTaskSubtitle = (task: Task) => {
  const category = task.church || task.priority || 'Tarefa';
  const dueDate = task.due_date ? formatShortDate(task.due_date) : 'Sem prazo';
  return `${category} · ${dueDate}`;
};

const getTaskActionLabel = (task: Task) =>
  task.status === 'completed'
    ? `Reabrir tarefa ${task.title}`
    : `Marcar tarefa ${task.title} como concluída`;

export const TasksV2 = ({
  pendingTasks,
  inProgressTasks,
  completedTasks,
  onToggleStatus,
  onOpenCreate,
}: TasksV2Props) => {
  const [activeFilter, setActiveFilter] = useState<TasksV2Filter>('all');
  const urgentTasks = pendingTasks.filter((task) => task.priority === 'high').slice(0, 3);
  const weekTasks = [
    ...pendingTasks.filter((task) => task.priority !== 'high'),
    ...inProgressTasks,
  ].slice(0, 6);
  const totalTasks = pendingTasks.length + inProgressTasks.length + completedTasks.length;
  const stats = [
    { label: 'Pendentes', value: pendingTasks.length, tone: 'navy' },
    { label: 'Em andamento', value: inProgressTasks.length, tone: 'glass' },
    { label: 'Concluídas', value: completedTasks.length, tone: 'gold' },
  ] as const;

  const filters: Array<{ id: TasksV2Filter; label: string; count: number }> = [
    { id: 'all', label: 'Todas', count: totalTasks },
    { id: 'urgent', label: 'Urgentes', count: urgentTasks.length },
    { id: 'week', label: 'Esta semana', count: weekTasks.length },
    { id: 'completed', label: 'Concluídas', count: completedTasks.length },
  ];

  const showUrgent = activeFilter === 'all' || activeFilter === 'urgent';
  const showWeek = activeFilter === 'all' || activeFilter === 'week';
  const showCompleted = activeFilter === 'all' || activeFilter === 'completed';

  return (
    <div className="p7-shell">
      <div className="p7-screen">
        <PrototypeStatusBar />
        <div className="p7-grad-header">
          <div className="p7-header-row">
            <div>
              <div className="p7-header-label">{pendingTasks.length} pendentes</div>
              <div className="p7-header-title">Tarefas</div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <PrototypeHeaderIconButton
                icon={Plus}
                onClick={onOpenCreate}
                label="Criar nova tarefa"
              />
            </div>
          </div>
          <div
            className="p7-chip-row mt-3.5"
            role="toolbar"
            aria-label="Filtrar tarefas por recorte"
          >
            {filters.map((filter) => (
              <button
                key={filter.id}
                type="button"
                className={`p7-chip ${activeFilter === filter.id ? 'active' : ''}`}
                onClick={() => setActiveFilter(filter.id)}
                aria-pressed={activeFilter === filter.id}
              >
                {filter.label}
                <span aria-hidden="true" className="ml-1 text-[0.65rem] opacity-80">
                  {filter.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="p7-scroll">
          <div className="p7-stats-row" tabIndex={-1} aria-label="Resumo de tarefas">
            {stats.map((stat) => (
              <div key={stat.label} className={`p7-stat-card ${stat.tone}`}>
                <div className={`p7-stat-num ${stat.tone === 'glass' ? 'dark' : ''}`}>
                  {stat.value}
                </div>
                <div className={`p7-stat-label ${stat.tone === 'glass' ? 'dark' : ''}`}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          <div className="p7-section">
            <div className="p7-card p7-card-p">
              <div className="mb-1 text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-[var(--v2-gold)]">
                Leitura da fila
              </div>
              <p className="text-[0.82rem] leading-[1.55] text-[var(--p7-text-2)]">
                Use o bloco urgente para o que não pode esperar e o recorte da semana para manter o
                ritmo sem abrir listas longas.
              </p>
            </div>
          </div>

          {showUrgent ? (
            <div className="p7-section">
              <div className="mb-1.5 text-[0.7rem] font-bold uppercase tracking-[0.08em] text-[var(--v2-gold)]">
                Urgente
              </div>
              <div className="space-y-2">
                {urgentTasks.length > 0 ? (
                  urgentTasks.map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      className="p7-task-item w-full text-left"
                      onClick={() => onToggleStatus(task)}
                      aria-pressed={task.status === 'completed'}
                      aria-label={getTaskActionLabel(task)}
                    >
                      <div className="p7-task-check" aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <div className="p7-task-title">{task.title}</div>
                        <div className="p7-task-meta">{getTaskSubtitle(task)}</div>
                      </div>
                      <span className={`p7-pill ${getTaskTone(task)}`}>
                        {task.due_date ? formatShortDate(task.due_date) : 'hoje'}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="p7-panel-note">
                    <div className="text-sm font-semibold text-[var(--p7-text)]">
                      Nenhuma tarefa urgente agora.
                    </div>
                    <div className="mt-1 text-[0.78rem] text-[var(--p7-text-3)]">
                      Quando algo pedir prioridade alta, ele aparece aqui primeiro para facilitar a
                      decisão.
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {showWeek ? (
            <div className="p7-section">
              <div className="mb-1.5 text-[0.7rem] font-bold uppercase tracking-[0.08em] text-[var(--p7-text-3)]">
                Esta semana
              </div>
              <div className="space-y-2">
                {weekTasks.length > 0 ? (
                  weekTasks.map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      className="p7-task-item w-full text-left"
                      onClick={() => onToggleStatus(task)}
                      aria-pressed={task.status === 'completed'}
                      aria-label={getTaskActionLabel(task)}
                    >
                      <div className="p7-task-check" aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <div className="p7-task-title">{task.title}</div>
                        <div className="p7-task-meta">{getTaskSubtitle(task)}</div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p7-panel-note">
                    <div className="text-sm font-semibold text-[var(--p7-text)]">
                      Semana livre por enquanto.
                    </div>
                    <div className="mt-1 text-[0.78rem] text-[var(--p7-text-3)]">
                      Use o atalho de nova tarefa para organizar visitas, retornos e
                      acompanhamentos.
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {showCompleted ? (
            <div className="p7-section">
              <div className="mb-1.5 text-[0.7rem] font-bold uppercase tracking-[0.08em] text-[var(--p7-text-3)]">
                Concluídas
              </div>
              <div className="space-y-2">
                {completedTasks.length > 0 ? (
                  completedTasks.slice(0, 6).map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      className="p7-task-item p7-task-item--completed w-full text-left"
                      onClick={() => onToggleStatus(task)}
                      aria-pressed
                      aria-label={getTaskActionLabel(task)}
                    >
                      <div className="p7-task-check done" aria-hidden="true">
                        <svg
                          width="11"
                          height="11"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                      <div>
                        <div className="p7-task-title done">{task.title}</div>
                        <div className="p7-task-meta">
                          Concluída em{' '}
                          {task.updated_at ? formatShortDate(task.updated_at) : 'data recente'}
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p7-panel-note">
                    <div className="text-sm font-semibold text-[var(--p7-text)]">
                      Sem histórico concluído ainda.
                    </div>
                    <div className="mt-1 text-[0.78rem] text-[var(--p7-text-3)]">
                      Conforme você fechar a semana, o histórico aparece aqui para revisão rápida.
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>

        <button
          type="button"
          className="p7-fab lg:hidden"
          onClick={onOpenCreate}
          aria-label="Nova tarefa"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};
