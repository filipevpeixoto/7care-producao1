import type { ReactNode } from 'react';
import { SideNavV2 } from './SideNavV2';

interface DesktopLayoutV2Props {
  children: ReactNode;
}

export const DesktopLayoutV2 = ({ children }: DesktopLayoutV2Props) => (
  <div className="hidden min-h-screen bg-[var(--v2-surface)] lg:flex">
    <SideNavV2 />
    <main className="min-w-0 flex-1 p-6">{children}</main>
  </div>
);
