import { useLocation } from 'react-router-dom';
import { useTransitionNavigate } from '@/hooks/useTransitionNavigate';
import { useAuth } from '@/hooks/useAuth';
import { getV2NavigationItems } from './navigation';

export const BottomNavV2 = () => {
  const location = useLocation();
  const navigate = useTransitionNavigate();
  const { user } = useAuth();
  const items = getV2NavigationItems(user);

  return (
    <nav className="p7-bottom-nav">
      <div className="mx-auto flex w-full max-w-[1180px]">
        {items.map((item) => {
          const isActive =
            location.pathname === item.path ||
            (item.path !== '/menu' && location.pathname.startsWith(`${item.path}/`));

          return (
            <button
              key={item.path}
              type="button"
              onClick={() => navigate(item.path)}
              aria-current={isActive ? 'page' : undefined}
              className={`p7-nav-item ${isActive ? 'active' : ''}`}
            >
              {isActive ? <span className="p7-nav-pip" aria-hidden="true" /> : null}
              <item.icon className="h-[22px] w-[22px]" strokeWidth={2} />
              <span className="p7-nav-label">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
