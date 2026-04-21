import { Heart, Search, Trash2 } from 'lucide-react';
import {
  PrototypeAvatar,
  PrototypeHeaderIconButton,
  PrototypeStatusBar,
  formatRelativeDate,
} from './prototypeShared';
import { ThemeToggle } from '@/components/v2/ThemeToggle';
import { Input } from '@/components/ui/input';

type PrayerRequestLike = {
  id: number;
  userName: string;
  prayerRequest?: string;
  isAnswered: boolean;
  isUserPraying?: boolean;
  createdAt: string;
};

interface PrayersV2Props {
  prayers: PrayerRequestLike[];
  intercessors: Record<number, { id: number }[]>;
  searchTerm: string;
  filterStatus: 'all' | 'pending' | 'answered';
  onSearchChange: (value: string) => void;
  onFilterStatusChange: (value: 'all' | 'pending' | 'answered') => void;
  onToggleIntercessor: (prayerId: number, isPraying: boolean) => void;
  onDeletePrayer?: (prayerId: number) => void;
}

export const PrayersV2 = ({
  prayers,
  intercessors,
  searchTerm,
  filterStatus,
  onSearchChange,
  onFilterStatusChange,
  onToggleIntercessor,
  onDeletePrayer,
}: PrayersV2Props) => {
  const pendingCount = prayers.filter((prayer) => !prayer.isAnswered).length;
  const answeredCount = prayers.filter((prayer) => prayer.isAnswered).length;
  const prayingCount = prayers.filter((prayer) => prayer.isUserPraying).length;

  return (
    <div className="p7-shell">
      <div className="p7-screen">
        <PrototypeStatusBar />
        <div className="p7-grad-header">
          <div className="p7-header-row">
            <div>
              <div className="p7-header-label">Cuidado compartilhado</div>
              <div className="p7-header-title">Pedidos de oração</div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <PrototypeHeaderIconButton icon={Heart} label="Pedidos de oração" />
            </div>
          </div>
        </div>

        <div className="p7-scroll">
          <div className="p7-stats-row" tabIndex={-1} aria-label="Resumo dos pedidos de oração">
            <div className="p7-stat-card navy">
              <div className="p7-stat-num">{pendingCount}</div>
              <div className="p7-stat-label">Pendentes</div>
            </div>
            <div className="p7-stat-card glass">
              <div className="p7-stat-num dark">{prayingCount}</div>
              <div className="p7-stat-label dark">Orando</div>
            </div>
            <div className="p7-stat-card gold">
              <div className="p7-stat-num">{answeredCount}</div>
              <div className="p7-stat-label">Respondidos</div>
            </div>
          </div>

          <div className="p7-section">
            <div className="p7-card p7-card-p space-y-3">
              <div className="mb-1 text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-[var(--v2-gold)]">
                Intercessão em movimento
              </div>
              <p className="text-[0.82rem] leading-[1.55] text-[var(--p7-text-2)]">
                Filtre os pedidos da semana, veja onde já existe cobertura e responda rápido quando
                alguém precisar de companhia em oração.
              </p>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--p7-text-3)]" />
                <Input
                  aria-label="Buscar pedidos de oração"
                  placeholder="Buscar por nome, igreja ou pedido"
                  value={searchTerm}
                  onChange={(event) => onSearchChange(event.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="p7-chip-row" role="toolbar" aria-label="Filtrar pedidos de oração">
                {[
                  { value: 'all' as const, label: 'Todos' },
                  { value: 'pending' as const, label: 'Pendentes' },
                  { value: 'answered' as const, label: 'Respondidos' },
                ].map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    className={`p7-chip ${filterStatus === filter.value ? 'active' : ''}`}
                    onClick={() => onFilterStatusChange(filter.value)}
                    aria-pressed={filterStatus === filter.value}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="p7-section flex flex-col gap-3">
            {prayers.length > 0 ? (
              prayers.map((prayer, index) => (
                <div
                  key={prayer.id}
                  className="p7-prayer-card"
                  style={{ animation: `fade-up .4s var(--p7-ease) ${0.08 + index * 0.08}s both` }}
                >
                  <div className="p7-prayer-top" />
                  <div className="p7-prayer-body">
                    <div className="p7-prayer-meta">
                      <PrototypeAvatar
                        name={prayer.userName}
                        className="h-8 w-8 text-[0.75rem]"
                        solid
                      />
                      <div>
                        <div className="text-[0.82rem] font-semibold text-[var(--p7-text)]">
                          {prayer.userName}
                        </div>
                        <div className="text-[0.68rem] text-[var(--p7-text-3)]">
                          {formatRelativeDate(prayer.createdAt)}
                        </div>
                      </div>
                      <span
                        className={`p7-pill ${prayer.isAnswered ? 'green' : prayer.isUserPraying ? 'soft' : 'warn'}`}
                        style={{ marginLeft: 'auto' }}
                      >
                        {prayer.isAnswered
                          ? 'Respondida'
                          : prayer.isUserPraying
                            ? 'Orando'
                            : 'Pedido'}
                      </span>
                    </div>
                    <div className="p7-prayer-text">
                      {prayer.prayerRequest || 'Pedido de oração sem descrição detalhada.'}
                    </div>
                  </div>
                  <div className="p7-prayer-actions">
                    <button
                      type="button"
                      className={`p7-prayer-action ${prayer.isUserPraying ? 'active' : ''}`}
                      onClick={() => onToggleIntercessor(prayer.id, Boolean(prayer.isUserPraying))}
                      aria-pressed={Boolean(prayer.isUserPraying)}
                      aria-label={`${intercessors[prayer.id]?.length || 0} pessoas orando por ${prayer.userName}`}
                    >
                      <Heart
                        className={`h-3.5 w-3.5 ${prayer.isUserPraying ? 'fill-current' : ''}`}
                      />
                      {intercessors[prayer.id]?.length || 0} orando
                    </button>
                    <button
                      type="button"
                      className="p7-prayer-action ml-auto"
                      onClick={() => onToggleIntercessor(prayer.id, Boolean(prayer.isUserPraying))}
                    >
                      {prayer.isUserPraying ? 'Parar de orar' : 'Orar por este pedido →'}
                    </button>
                    {onDeletePrayer ? (
                      <button
                        type="button"
                        className="p7-prayer-action"
                        onClick={() => onDeletePrayer(prayer.id)}
                        aria-label={`Excluir pedido de oração de ${prayer.userName}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <div className="p7-card p7-card-p text-center">
                <Heart
                  className="mx-auto mb-3 h-9 w-9 text-[var(--p7-text-3)]"
                  aria-hidden="true"
                />
                <div className="text-sm font-semibold text-[var(--p7-text)]">
                  Nenhum pedido encontrado
                </div>
                <p className="mx-auto mt-1 max-w-[32ch] text-xs text-[var(--p7-text-3)]">
                  Ajuste a busca ou o filtro. Quando alguém compartilhar uma necessidade, ela
                  aparece aqui para a comunidade acompanhar em oração.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
