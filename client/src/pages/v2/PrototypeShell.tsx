import type { ReactNode } from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { ThemeToggle } from '@/components/v2/ThemeToggle';
import { PrototypeAvatar, PrototypeStatusBar } from './prototypeShared';

interface PrototypeShellProps {
  label: string;
  title: string;
  userName?: string | null;
  headerAction?: ReactNode;
  children: ReactNode;
}

export const PrototypeShell = ({
  label,
  title,
  userName,
  headerAction,
  children,
}: PrototypeShellProps) => (
  <MobileLayout variant="prototype">
    <div className="p7-shell">
      <div className="p7-screen">
        <PrototypeStatusBar />
        <div className="p7-grad-header">
          <div className="p7-header-row">
            <div>
              <div className="p7-header-label">{label}</div>
              <div className="p7-header-title">{title}</div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              {headerAction}
              <PrototypeAvatar name={userName} className="h-9 w-9 text-[0.8rem]" />
            </div>
          </div>
        </div>
        <div className="p7-scroll">{children}</div>
      </div>
    </div>
  </MobileLayout>
);
