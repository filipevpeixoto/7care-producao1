import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { TabsContent } from '@/components/ui/tabs';
import { Shield } from 'lucide-react';
import type { SettingsData, UpdateSetting } from './types';

export const PrivacyTab = ({
  settings,
  updateSetting,
}: {
  settings: SettingsData;
  updateSetting: UpdateSetting;
}) => (
  <TabsContent value="privacy" className="space-y-4">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Privacidade
        </CardTitle>
        <CardDescription>Controle a visibilidade das suas informações</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="text-sm font-medium">Perfil visível</div>
            <div className="text-xs text-muted-foreground">Outros membros podem ver seu perfil</div>
          </div>
          <Switch
            aria-label="Tornar perfil visível"
            checked={settings.privacy.profileVisible}
            onCheckedChange={(checked) => updateSetting('privacy', 'profileVisible', checked)}
            data-testid="switch-profile-visible"
          />
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="text-sm font-medium">Informações de contato</div>
            <div className="text-xs text-muted-foreground">Mostrar telefone e email no perfil</div>
          </div>
          <Switch
            aria-label="Mostrar informações de contato"
            checked={settings.privacy.contactInfoVisible}
            onCheckedChange={(checked) => updateSetting('privacy', 'contactInfoVisible', checked)}
            data-testid="switch-contact-visible"
          />
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="text-sm font-medium">Frequência visível</div>
            <div className="text-xs text-muted-foreground">Mostrar sua frequência nos eventos</div>
          </div>
          <Switch
            aria-label="Mostrar frequência nos eventos"
            checked={settings.privacy.attendanceVisible}
            onCheckedChange={(checked) => updateSetting('privacy', 'attendanceVisible', checked)}
            data-testid="switch-attendance-visible"
          />
        </div>
      </CardContent>
    </Card>
  </TabsContent>
);
