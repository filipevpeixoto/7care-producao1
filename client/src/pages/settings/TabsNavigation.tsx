import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { TabConfig } from './types';

export const DesktopTabsList = ({ tabs }: { tabs: TabConfig[] }) => (
  <TabsList className="hidden md:grid w-full grid-cols-11">
    {tabs.map((tab) => (
      <TabsTrigger key={tab.value} value={tab.value} className="text-xs">
        {tab.label}
      </TabsTrigger>
    ))}
  </TabsList>
);

export const MobileTabsList = ({ tabs }: { tabs: TabConfig[] }) => (
  <TabsList className="md:hidden flex w-full overflow-x-auto scrollbar-hide">
    {tabs.map((tab) => (
      <TabsTrigger key={tab.value} value={tab.value} className="text-xs flex-shrink-0 px-2">
        {tab.label}
      </TabsTrigger>
    ))}
  </TabsList>
);
