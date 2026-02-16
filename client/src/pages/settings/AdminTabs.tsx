import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TabsContent } from '@/components/ui/tabs';
import { Settings as SettingsIcon, Building2 } from 'lucide-react';
import { DistrictSettings } from '@/components/settings/DistrictSettings';
import { PointsConfiguration } from '@/components/settings/PointsConfiguration';
import { ChurchManagementTab } from '@/components/settings/ChurchManagementTab';
import { CalendarManagementTab } from '@/components/settings/CalendarManagementTab';
import { DataManagementTab } from '@/components/settings/DataManagementTab';
import type { AuthUser } from './types';

export const SystemTab = () => (
  <TabsContent value="system" className="space-y-4">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SettingsIcon className="h-5 w-5" />
          Configurações do Sistema
        </CardTitle>
        <CardDescription>Gerencie as configurações globais do sistema</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6" />
    </Card>
  </TabsContent>
);

export const DistrictSettingsTab = () => (
  <TabsContent value="district-settings" className="space-y-4">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Configurações do Distrito
        </CardTitle>
        <CardDescription>
          Configure as preferências específicas do seu distrito. Essas configurações afetam apenas
          os membros e igrejas do seu distrito.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DistrictSettings />
      </CardContent>
    </Card>
  </TabsContent>
);

export const PointsConfigurationTab = () => (
  <TabsContent value="points-config" className="space-y-4">
    <PointsConfiguration />
  </TabsContent>
);

export const ChurchManagementTabSection = ({
  user,
  userDistrictId,
  userDistrictName,
}: {
  user: AuthUser;
  userDistrictId: number | null;
  userDistrictName: string;
}) => (
  <TabsContent value="church" className="space-y-4">
    <ChurchManagementTab
      user={user as Pick<import('@/types/domain').UserMember, 'id' | 'role' | 'church' | 'districtId'>}
      userDistrictId={userDistrictId}
      userDistrictName={userDistrictName}
    />
  </TabsContent>
);

export const CalendarManagementTabSection = ({
  user,
  userDistrictId,
  userDistrictName,
}: {
  user: AuthUser;
  userDistrictId: number | null;
  userDistrictName: string;
}) => (
  <TabsContent value="calendar" className="space-y-4">
    <CalendarManagementTab
      user={user as Pick<import('@/types/domain').UserMember, 'id' | 'role' | 'church' | 'districtId'>}
      userDistrictId={userDistrictId}
      userDistrictName={userDistrictName}
    />
  </TabsContent>
);

export const DataManagementTabSection = ({
  user,
  userDistrictId,
  userDistrictName,
}: {
  user: AuthUser;
  userDistrictId: number | null;
  userDistrictName: string;
}) => (
  <TabsContent value="data-management" className="space-y-4">
    <DataManagementTab
      user={user as Pick<import('@/types/domain').UserMember, 'id' | 'name' | 'role' | 'church' | 'churchCode' | 'districtId'>}
      userDistrictId={userDistrictId}
      userDistrictName={userDistrictName}
    />
  </TabsContent>
);
