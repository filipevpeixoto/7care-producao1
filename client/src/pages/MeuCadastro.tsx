import { useEffect, useState } from 'react';
import { Camera, Save, User, Mail, Phone, Calendar, Lock, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { PhotoSelector } from '@/components/ui/photo-selector';
import { useAuth } from '@/hooks/useAuth';
import { getRoleDisplayName } from '@/lib/permissions';
import { useToast } from '@/hooks/use-toast';
import {
  DialogWithModalTracking,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { createLogger } from '@/lib/logger';
import { useTranslation } from 'react-i18next';

const meuCadastroLogger = createLogger('MeuCadastro');

const MeuCadastro = () => {
  const { user, refreshUserData } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isChangePwdOpen, setIsChangePwdOpen] = useState(false);
  const [isChangingPwd, setIsChangingPwd] = useState(false);
  const [pwdForm, setPwdForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Formata telefone no padrão brasileiro (DDD) 99999-9999
  const formatPhoneBR = (input: string | undefined | null): string => {
    const digits = (input || '').replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits ? `(${digits}` : '';
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: formatPhoneBR(user?.phone),
    birthDate:
      (user?.birthDate && /\d{4}-\d{2}-\d{2}/.test(user.birthDate)
        ? user.birthDate.slice(0, 10)
        : '') || '',
  });

  useEffect(() => {
    const formatDate = (dateStr?: string | null) => {
      if (!dateStr) return '';
      if (/\d{4}-\d{2}-\d{2}/.test(dateStr)) return dateStr.slice(0, 10);
      try {
        return new Date(dateStr).toISOString().slice(0, 10);
      } catch {
        return '';
      }
    };

    meuCadastroLogger.debug('Atualizando formData com dados do usuário:', {
      name: user?.name,
      email: user?.email,
      phone: user?.phone,
      birthDate: user?.birthDate,
    });

    setFormData({
      name: user?.name || '',
      email: user?.email || '',
      phone: formatPhoneBR(user?.phone),
      birthDate: formatDate(user?.birthDate),
    });
  }, [user]);

  // Garante que carregamos os dados completos (telefone/data) ao abrir a página
  useEffect(() => {
    meuCadastroLogger.debug('Carregando dados atualizados do usuário...');
    // Sempre tentar carregar dados atualizados ao abrir a página
    refreshUserData?.();
  }, [refreshUserData]);

  const handlePhotoSelect = async (file: File) => {
    if (!user?.id) return;

    setIsUploadingPhoto(true);

    try {
      const formData = new FormData();
      formData.append('profilePhoto', file);
      formData.append('userId', user.id.toString());

      const response = await fetch('/api/users/upload-photo', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Falha ao fazer upload da foto');
      }

      await response.json();

      // Atualizar o usuário localmente
      if (refreshUserData) {
        await refreshUserData();
      }

      toast({
        title: t('myProfile.photoUpdatedTitle'),
        description: t('myProfile.photoUpdatedDesc'),
      });
    } catch (error) {
      meuCadastroLogger.error('Erro ao fazer upload:', error);
      toast({
        title: t('myProfile.photoUpdateErrorTitle'),
        description: t('myProfile.photoUpdateErrorDesc'),
        variant: 'destructive',
      });
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handlePhotoRemove = async () => {
    if (!user?.id) return;

    try {
      const response = await fetch(`/api/users/${user.id}/remove-photo`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Falha ao remover foto');
      }

      // Atualizar o usuário localmente
      if (refreshUserData) {
        await refreshUserData();
      }

      toast({
        title: t('myProfile.photoRemovedTitle'),
        description: t('myProfile.photoRemovedDesc'),
      });
    } catch (error) {
      meuCadastroLogger.error('Erro ao remover foto:', error);
      toast({
        title: t('myProfile.photoRemoveErrorTitle'),
        description: t('myProfile.photoRemoveErrorDesc'),
        variant: 'destructive',
      });
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;

    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Falha ao atualizar dados');
      }

      // Atualizar o usuário localmente
      if (refreshUserData) {
        await refreshUserData();
      }

      setIsEditing(false);
      toast({
        title: t('myProfile.dataUpdatedTitle'),
        description: t('myProfile.dataUpdatedDesc'),
      });
    } catch (error) {
      meuCadastroLogger.error('Erro ao salvar:', error);
      toast({
        title: t('myProfile.saveErrorTitle'),
        description: t('myProfile.saveErrorDesc'),
        variant: 'destructive',
      });
    }
  };

  const handleCancel = () => {
    setFormData({
      name: user?.name || '',
      email: user?.email || '',
      phone: formatPhoneBR(user?.phone),
      birthDate:
        (user?.birthDate && /\d{4}-\d{2}-\d{2}/.test(user.birthDate)
          ? user.birthDate.slice(0, 10)
          : '') || '',
    });
    setIsEditing(false);
  };

  const validatePasswords = () => {
    if (!pwdForm.currentPassword || !pwdForm.newPassword || !pwdForm.confirmPassword) {
      toast({
        title: t('myProfile.requiredFieldsTitle'),
        description: t('myProfile.requiredFieldsDesc'),
        variant: 'destructive',
      });
      return false;
    }
    if (pwdForm.newPassword.length < 6) {
      toast({
        title: t('myProfile.passwordTooShortTitle'),
        description: t('myProfile.passwordTooShortDesc'),
        variant: 'destructive',
      });
      return false;
    }
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      toast({
        title: t('myProfile.passwordMismatchTitle'),
        description: t('myProfile.passwordMismatchDesc'),
        variant: 'destructive',
      });
      return false;
    }
    return true;
  };

  const handleSubmitChangePassword = async () => {
    if (!user?.id) return;
    if (!validatePasswords()) return;
    try {
      setIsChangingPwd(true);
      const resp = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: Number(user.id),
          currentPassword: pwdForm.currentPassword,
          newPassword: pwdForm.newPassword,
        }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || data?.success === false) {
        const message = data?.message || t('myProfile.changePasswordFail');
        toast({
          title: t('myProfile.changePasswordErrorTitle'),
          description: message,
          variant: 'destructive',
        });
        return;
      }
      // Refresh opcional
      await refreshUserData?.();
      setIsChangePwdOpen(false);
      setPwdForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast({
        title: t('myProfile.passwordChangedTitle'),
        description: t('myProfile.passwordChangedDesc'),
      });
    } catch {
      toast({
        title: t('myProfile.changePasswordErrorTitle'),
        description: t('myProfile.tryAgain'),
        variant: 'destructive',
      });
    } finally {
      setIsChangingPwd(false);
    }
  };

  const getProfilePhotoUrl = () => {
    if (user?.profilePhoto) {
      // Se a foto já é uma URL completa, retorna ela mesma
      if (user.profilePhoto.startsWith('http')) {
        return user.profilePhoto;
      }
      // Se não, constrói a URL para o servidor local
      return `/uploads/${user.profilePhoto}`;
    }
    return null;
  };

  return (
    <MobileLayout>
      <div className="p-4 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">{t('myProfile.title')}</h1>
          <p className="text-muted-foreground">{t('myProfile.subtitle')}</p>
        </div>

        {/* Profile Photo */}
        <Card className="shadow-divine">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <div className="relative mx-auto w-24 h-24">
                {user?.profilePhoto ? (
                  <>
                    <img
                      src={getProfilePhotoUrl() || ''}
                      alt={t('myProfile.photoAlt', { name: user.name })}
                      className="w-24 h-24 rounded-full object-cover border-4 border-primary/20"
                      onError={(e) => {
                        // Fallback para inicial se a imagem falhar
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const fallback = target.nextElementSibling as HTMLElement;
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                    <div
                      className="w-24 h-24 rounded-full bg-gradient-primary flex items-center justify-center text-3xl font-bold text-primary-foreground"
                      style={{ display: 'none' }}
                    >
                      {user?.name.charAt(0).toUpperCase()}
                    </div>
                  </>
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-primary flex items-center justify-center text-3xl font-bold text-primary-foreground">
                    {user?.name.charAt(0).toUpperCase()}
                  </div>
                )}

                <PhotoSelector
                  currentPhoto={getProfilePhotoUrl()}
                  onPhotoSelect={handlePhotoSelect}
                  onPhotoRemove={handlePhotoRemove}
                  isLoading={isUploadingPhoto}
                  trigger={
                    <Button
                      size="sm"
                      className="absolute -bottom-2 -right-2 rounded-full w-8 h-8 p-0"
                      disabled={isUploadingPhoto}
                      aria-label={
                        isUploadingPhoto
                          ? t('myProfile.loadingPhoto')
                          : t('myProfile.changeProfilePhoto')
                      }
                    >
                      {isUploadingPhoto ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Camera className="w-4 h-4" />
                      )}
                    </Button>
                  }
                />
              </div>
              <div>
                <h2 className="text-xl font-semibold">{user?.name}</h2>
                <p className="text-muted-foreground capitalize">{getRoleDisplayName(user?.role)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personal Information */}
        <Card className="shadow-divine">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>{t('myProfile.personalInfo')}</CardTitle>
            {!isEditing ? (
              <Button onClick={() => setIsEditing(true)} size="sm">
                {t('myProfile.edit')}
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button onClick={handleCancel} variant="outline" size="sm">
                  {t('myProfile.cancel')}
                </Button>
                <Button onClick={handleSave} size="sm">
                  <Save className="w-4 h-4 mr-2" />
                  {t('myProfile.save')}
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('myProfile.fullName')}</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  className="pl-10"
                  disabled={!isEditing}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t('myProfile.email')}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  className="pl-10"
                  disabled={!isEditing}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">{t('myProfile.phone')}</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, phone: formatPhoneBR(e.target.value) }))
                  }
                  className="pl-10"
                  disabled={!isEditing}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="birthDate">{t('myProfile.birthDate')}</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="birthDate"
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, birthDate: e.target.value }))}
                  className="pl-10"
                  disabled={!isEditing}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card className="shadow-divine">
          <CardHeader>
            <CardTitle>{t('myProfile.security')}</CardTitle>
          </CardHeader>
          <CardContent>
            <DialogWithModalTracking
              modalId="change-password-modal"
              open={isChangePwdOpen}
              onOpenChange={setIsChangePwdOpen}
            >
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  <Lock className="w-4 h-4 mr-2" />
                  {t('myProfile.changePassword')}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('myProfile.changePasswordDialogTitle')}</DialogTitle>
                  <DialogDescription>{t('myProfile.changePasswordDesc')}</DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">{t('myProfile.currentPassword')}</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={pwdForm.currentPassword}
                      onChange={(e) =>
                        setPwdForm((prev) => ({ ...prev, currentPassword: e.target.value }))
                      }
                      aria-required="true"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">{t('myProfile.newPassword')}</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={pwdForm.newPassword}
                      onChange={(e) =>
                        setPwdForm((prev) => ({ ...prev, newPassword: e.target.value }))
                      }
                      aria-invalid={
                        pwdForm.newPassword.length > 0 && pwdForm.newPassword.length < 6
                      }
                      aria-required="true"
                    />
                    {pwdForm.newPassword.length > 0 && pwdForm.newPassword.length < 6 && (
                      <p className="text-xs text-destructive">
                        {t(
                          'myProfile.passwordTooShortDesc',
                          'A senha deve ter pelo menos 6 caracteres.'
                        )}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">{t('myProfile.confirmNewPassword')}</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={pwdForm.confirmPassword}
                      onChange={(e) =>
                        setPwdForm((prev) => ({ ...prev, confirmPassword: e.target.value }))
                      }
                      aria-invalid={
                        pwdForm.confirmPassword.length > 0 &&
                        pwdForm.newPassword !== pwdForm.confirmPassword
                      }
                      aria-required="true"
                    />
                    {pwdForm.confirmPassword.length > 0 &&
                      pwdForm.newPassword !== pwdForm.confirmPassword && (
                        <p className="text-xs text-destructive">
                          {t('myProfile.passwordMismatchDesc', 'As senhas não coincidem.')}
                        </p>
                      )}
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsChangePwdOpen(false)}
                    disabled={isChangingPwd}
                  >
                    {t('myProfile.cancel')}
                  </Button>
                  <Button onClick={handleSubmitChangePassword} disabled={isChangingPwd}>
                    {isChangingPwd ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    {t('myProfile.saveNewPassword')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </DialogWithModalTracking>
          </CardContent>
        </Card>
      </div>
    </MobileLayout>
  );
};

export default MeuCadastro;
