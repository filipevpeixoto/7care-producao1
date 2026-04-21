import { useLocation } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useSystemLogo } from '@/hooks/useSystemLogo';
import { getRoleDisplayName } from '@/lib/permissions';
import { useTransitionNavigate } from '@/hooks/useTransitionNavigate';
import { getV2NavigationItems } from './navigation';

export const SideNavV2 = () => {
  const location = useLocation();
  const navigate = useTransitionNavigate();
  const { user } = useAuth();
  const { systemLogo } = useSystemLogo();
  const items = getV2NavigationItems(user);

  return (
    <aside
      className="hidden w-[18.5rem] shrink-0 flex-col p-5 lg:flex"
      style={{ background: 'var(--grad-h)', boxShadow: 'var(--shadow-nav)' }}
    >
      <button
        type="button"
        onClick={() => navigate('/dashboard')}
        className="flex items-center gap-3 rounded-[1.5rem] border border-white/10 bg-white/8 p-4 text-left text-white transition hover:bg-white/12"
      >
        {systemLogo ? (
          <img
            src={systemLogo}
            alt="7Care"
            className="h-12 w-12 rounded-2xl bg-white/10 p-2 object-contain"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white">
            7
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-white">7care</p>
          <p className="text-sm text-white/62">Novo layout pastoral</p>
        </div>
      </button>

      <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/8 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{user?.name || 'Usuário'}</p>
            <p className="truncate text-xs text-white/62">{getRoleDisplayName(user?.role)}</p>
          </div>
          <Badge
            variant="secondary"
            className="rounded-full border-0 bg-white/12 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-white"
          >
            V2
          </Badge>
        </div>
      </div>

      <nav className="mt-6 flex flex-1 flex-col gap-2">
        {items.map((item) => {
          const isActive =
            location.pathname === item.path ||
            (item.path !== '/menu' && location.pathname.startsWith(`${item.path}/`));

          return (
            <button
              key={item.path}
              type="button"
              onClick={() => navigate(item.path)}
              className={`flex items-center gap-3 rounded-[1.2rem] px-4 py-3 text-left transition ${
                isActive
                  ? 'bg-white text-[var(--v2-navy-strong)] shadow-lg'
                  : 'text-white/72 hover:bg-white/10 hover:text-white'
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
};
