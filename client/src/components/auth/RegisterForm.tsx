import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { User, Mail, Lock, Phone, Church, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import type { UserRole } from '@/../../shared/types/user';

export const RegisterForm = () => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    church: '',
    role: 'interested' as UserRole,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { register } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: t('common.error'),
        description: t('errors.passwordMismatch'),
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const success = await register(formData);

      if (success) {
        toast({
          title: t('success.created'),
          description:
            formData.role === 'interested'
              ? t('auth.accountActive')
              : t('auth.awaitApproval'),
        });

        // Reset form
        setFormData({
          name: '',
          email: '',
          password: '',
          confirmPassword: '',
          phone: '',
          church: '',
          role: 'interested',
        });
      }
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('errors.generic'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-divine">
      <CardHeader className="text-center space-y-4">
        <CardTitle className="text-2xl font-bold text-primary">{t('auth.createAccount')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t('auth.fullName')}</Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="name"
                placeholder={t('auth.fullName')}
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="pl-10"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="register-email">{t('auth.email')}</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="register-email"
                type="email"
                placeholder="seu@email.com"
                value={formData.email}
                onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="pl-10"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">{t('common.phone')}</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="phone"
                placeholder="(11) 99999-9999"
                value={formData.phone}
                onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="church">{t('users.church')}</Label>
            <div className="relative">
              <Church className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="church"
                placeholder="Nome da sua igreja"
                value={formData.church}
                onChange={e => setFormData(prev => ({ ...prev, church: e.target.value }))}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">{t('common.role')}</Label>
            <Select
              value={formData.role}
              onValueChange={(value: UserRole) => setFormData(prev => ({ ...prev, role: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('common.select')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="interested">{t('common.friend')}</SelectItem>
                <SelectItem value="member">{t('common.member')}</SelectItem>
                <SelectItem value="missionary">{t('common.missionary')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="register-password">{t('auth.password')}</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="register-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={formData.password}
                onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))}
                className="pl-10 pr-10"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">{t('auth.confirmPassword')}</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="confirm-password"
                type="password"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={e => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                className="pl-10"
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-gradient-secondary hover:opacity-90 transition-opacity"
            disabled={isLoading}
          >
            {isLoading ? t('common.creating') : t('auth.createAccount')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
