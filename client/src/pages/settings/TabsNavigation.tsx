import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { TabConfig } from './types';

export const DesktopTabsList = ({ tabs }: { tabs: TabConfig[] }) => (
  <TabsList className="hidden md:flex md:flex-wrap md:justify-start p7-settings-tabs">
    {tabs.map((tab) => (
      <TabsTrigger key={tab.value} value={tab.value} className="p7-settings-tab-trigger">
        {tab.label}
      </TabsTrigger>
    ))}
  </TabsList>
);

export const MobileTabsList = ({ tabs }: { tabs: TabConfig[] }) => (
  <TabsList className="md:hidden p7-settings-tabs p7-settings-tabs-mobile">
    {tabs.map((tab) => (
      <TabsTrigger key={tab.value} value={tab.value} className="p7-settings-tab-trigger">
        {tab.label}
      </TabsTrigger>
    ))}
  </TabsList>
);
