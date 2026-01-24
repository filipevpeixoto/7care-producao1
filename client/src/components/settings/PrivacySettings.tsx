/**
 * Privacy Settings Component
 * Configurações de privacidade
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Shield, User, Phone, Calendar } from 'lucide-react';

interface PrivacySettings {
  profileVisible: boolean;
  contactInfoVisible: boolean;
  attendanceVisible: boolean;
}

interface PrivacySettingsProps {
  settings: PrivacySettings;
  onChange: (settings: PrivacySettings) => void;
}

export function PrivacySettingsCard({ settings, onChange }: PrivacySettingsProps) {
  const handleChange = (key: keyof PrivacySettings, value: boolean) => {
    onChange({
      ...settings,
      [key]: value,
    });
  };

  const privacyOptions = [
    {
      key: 'profileVisible' as const,
      icon: User,
      label: 'Perfil visível',
      description: 'Outros membros podem ver seu perfil',
    },
    {
      key: 'contactInfoVisible' as const,
      icon: Phone,
      label: 'Informações de contato',
      description: 'Mostrar telefone e email para outros membros',
    },
    {
      key: 'attendanceVisible' as const,
      icon: Calendar,
      label: 'Histórico de presença',
      description: 'Permitir que líderes vejam seu histórico',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Privacidade
        </CardTitle>
        <CardDescription>
          Controle quem pode ver suas informações
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {privacyOptions.map(({ key, icon: Icon, label, description }) => (
          <div key={key} className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
                {label}
              </Label>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
            <Switch
              checked={settings[key]}
              onCheckedChange={(value) => handleChange(key, value)}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default PrivacySettingsCard;
