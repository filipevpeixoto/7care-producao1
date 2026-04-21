import { LogOut, Settings, User } from 'lucide-react';
import { PrototypeAvatar, PrototypeChevron, PrototypeStatusBar } from './prototypeShared';
import { ThemeToggle } from '@/components/v2/ThemeToggle';

interface MenuItemLike {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  color: string;
  description?: string;
}

interface MenuV2Props {
  user?: {
    name?: string;
    role?: string;
    church?: string | null;
  } | null;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  sections: Array<{
    title: string;
    description?: string;
    items: MenuItemLike[];
  }>;
  accountItems: MenuItemLike[];
  onNavigate: (path: string) => void;
  onLogout: () => void;
}

const toneClassFromColor = (color: string) => {
  if (color.includes('red')) return 'red';
  if (color.includes('green') || color.includes('emerald') || color.includes('teal'))
    {return 'green';}
  if (color.includes('amber') || color.includes('yellow') || color.includes('orange'))
    {return 'gold';}
  return 'soft';
};

export const MenuV2 = ({
  user,
  eyebrow,
  title,
  subtitle,
  sections,
  accountItems,
  onNavigate,
  onLogout,
}: MenuV2Props) => {
  const settingsItem = accountItems.find((item) => item.path === '/settings');
  const registrationItem = accountItems.find((item) => item.path === '/meu-cadastro');

  return (
    <div className="p7-shell">
      <div className="p7-screen">
        <PrototypeStatusBar light />

        <div className="bg-[var(--p7-surface)] px-4 pb-4 pt-3">
          <div className="p7-menu-profile-card">
            <div className="flex items-center gap-3">
              <PrototypeAvatar name={user?.name} className="h-12 w-12 text-base" solid />
              <div className="min-w-0 flex-1">
                <div className="truncate text-base font-bold text-[var(--p7-text)]">
                  {user?.name || 'Usuário'}
                </div>
                <div className="text-[0.75rem] text-[var(--p7-text-3)]">
                  {user?.role || 'Perfil'} {user?.church ? `· ${user.church}` : ''}
                </div>
              </div>
              <ThemeToggle tone="onLight" />
            </div>

            {(eyebrow || title || subtitle) && (
              <div className="mt-3 rounded-[18px] border border-[var(--p7-border)] bg-[var(--p7-surface-2)] px-3 py-3">
                {eyebrow ? (
                  <div className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-[var(--v2-gold)]">
                    {eyebrow}
                  </div>
                ) : null}
                {title ? (
                  <div className="mt-1 text-sm font-semibold text-[var(--p7-text)]">{title}</div>
                ) : null}
                {subtitle ? (
                  <p className="mt-1 text-[0.78rem] leading-[1.5] text-[var(--p7-text-3)]">
                    {subtitle}
                  </p>
                ) : null}
              </div>
            )}

            {settingsItem || registrationItem ? (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {registrationItem ? (
                  <button
                    type="button"
                    className="flex items-center justify-center gap-2 rounded-[14px] border border-[var(--p7-border)] bg-[var(--p7-surface-2)] px-3 py-2 text-sm font-semibold text-[var(--p7-text)] transition-colors hover:bg-[var(--p7-surface-3)]"
                    onClick={() => onNavigate(registrationItem.path)}
                  >
                    <User className="h-4 w-4" />
                    <span>Meu cadastro</span>
                  </button>
                ) : null}
                {settingsItem ? (
                  <button
                    type="button"
                    className="flex items-center justify-center gap-2 rounded-[14px] border border-[var(--p7-border)] bg-[var(--p7-surface-2)] px-3 py-2 text-sm font-semibold text-[var(--p7-text)] transition-colors hover:bg-[var(--p7-surface-3)]"
                    onClick={() => onNavigate(settingsItem.path)}
                  >
                    <Settings className="h-4 w-4" />
                    <span>{settingsItem.title}</span>
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="p7-scroll bg-[var(--p7-surface)]">
          {sections.map((section) =>
            section.items.length > 0 ? (
              <div key={section.title}>
                <div className="p7-menu-title">{section.title}</div>
                <div className="mx-4 mb-2 text-[0.76rem] leading-[1.5] text-[var(--p7-text-3)]">
                  {section.description}
                </div>
                <div className="p7-menu-panel mx-4">
                  {section.items.map((item) => (
                    <button
                      key={item.path}
                      type="button"
                      className="p7-row-item w-full text-left"
                      onClick={() => onNavigate(item.path)}
                    >
                      <div className={`p7-row-icon ${toneClassFromColor(item.color)}`}>
                        <item.icon className="h-[18px] w-[18px]" />
                      </div>
                      <div className="p7-row-text">
                        <div className="p7-row-title">{item.title}</div>
                        {item.description ? (
                          <div className="p7-row-sub">{item.description}</div>
                        ) : null}
                      </div>
                      <PrototypeChevron />
                    </button>
                  ))}
                </div>
              </div>
            ) : null
          )}

          <div className="p7-menu-title">Conta</div>
          <div className="p7-menu-panel mx-4 mb-4">
            {accountItems.map((item) => (
              <button
                key={item.path}
                type="button"
                className="p7-row-item w-full text-left"
                onClick={() => onNavigate(item.path)}
              >
                <div className={`p7-row-icon ${toneClassFromColor(item.color)}`}>
                  <item.icon className="h-[18px] w-[18px]" />
                </div>
                <div className="p7-row-text">
                  <div className="p7-row-title">{item.title}</div>
                  {item.description ? <div className="p7-row-sub">{item.description}</div> : null}
                </div>
                <PrototypeChevron />
              </button>
            ))}
            <button type="button" className="p7-row-item w-full text-left" onClick={onLogout}>
              <div className="p7-row-icon red">
                <LogOut className="h-[18px] w-[18px]" />
              </div>
              <div className="p7-row-text">
                <div className="p7-row-title text-[var(--v2-danger)]">Sair</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
