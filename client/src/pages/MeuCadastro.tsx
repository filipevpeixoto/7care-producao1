import { useEffect, useState } from 'react';
import { Camera, Save, User, Mail, Phone, Calendar, Lock, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemeToggle } from '@/components/v2/ThemeToggle';
import { PrototypeAvatar, PrototypeStatusBar } from './v2/prototypeShared';
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
  const { skin } = useTheme();
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
  const roleLabel = getRoleDisplayName(user?.role);
  const initial = user?.name?.charAt(0).toUpperCase() || 'U';
  const summaryTiles = [
    { label: t('common.role'), value: roleLabel || t('common.notInformed'), tone: 'navy' },
    { label: t('common.email'), value: user?.email || t('common.notInformed'), tone: 'glass' },
    { label: t('common.phone'), value: formData.phone || t('common.notInformed'), tone: 'gold' },
  ];

  if (skin === 'v2') {
    return (
      <MobileLayout variant="prototype">
        <div className="p7-shell">
          <div className="p7-screen">
            <PrototypeStatusBar />
            <div className="p7-grad-header">
              <div className="p7-header-row">
                <div>
                  <div className="p7-header-label">{t('myProfile.title')}</div>
                  <div className="p7-header-title">{user?.name || t('myProfile.title')}</div>
                </div>
                <div className="flex items-center gap-2">
                  <ThemeToggle />
                  <PrototypeAvatar name={user?.name} className="h-9 w-9 text-[0.8rem]" />
                </div>
              </div>
            </div>
            <div className="p7-scroll">
              <div className="p7-stats-row" tabIndex={-1} aria-label="Resumo do perfil">
                {summaryTiles.map((tile) => (
                  <div key={tile.label} className={`p7-stat-card ${tile.tone}`}>
                    <div
                      className={`truncate text-[0.95rem] font-bold ${tile.tone === 'glass' ? 'text-[var(--p7-text)]' : 'text-white'}`}
                    >
                      {tile.value}
                    </div>
                    <div
                      className={`mt-2 text-[0.72rem] ${tile.tone === 'glass' ? 'text-[var(--p7-text-3)]' : 'text-white/72'}`}
                    >
                      {tile.label}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p7-section">
                <div className="p7-card p7-card-p">
                  <div className="p7-profile-hero">
                    <div className="flex items-center gap-4">
                      <div className="relative h-24 w-24">
                        {user?.profilePhoto ? (
                          <>
                            <img
                              src={getProfilePhotoUrl() || ''}
                              alt={t('myProfile.photoAlt', { name: user.name })}
                              className="h-24 w-24 rounded-full border border-[var(--p7-border)] object-cover shadow-[var(--shadow-card)]"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const fallback = target.nextElementSibling as HTMLElement;
                                if (fallback) fallback.style.display = 'flex';
                              }}
                            />
                            <div className="p7-profile-avatar-fallback" style={{ display: 'none' }}>
                              {initial}
                            </div>
                          </>
                        ) : (
                          <div className="p7-profile-avatar-fallback">{initial}</div>
                        )}

                        <PhotoSelector
                          currentPhoto={getProfilePhotoUrl()}
                          onPhotoSelect={handlePhotoSelect}
                          onPhotoRemove={handlePhotoRemove}
                          isLoading={isUploadingPhoto}
                          trigger={
                            <Button
                              size="sm"
                              className="absolute -bottom-2 -right-2 h-9 w-9 rounded-full p-0 shadow-[var(--shadow-card)]"
                              disabled={isUploadingPhoto}
                              aria-label={
                                isUploadingPhoto
                                  ? t('myProfile.loadingPhoto')
                                  : t('myProfile.changeProfilePhoto')
                              }
                            >
                              {isUploadingPhoto ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Camera className="h-4 w-4" />
                              )}
                            </Button>
                          }
                        />
                      </div>

                      <div className="min-w-0">
                        <h2 className="truncate text-[1.18rem] font-bold text-[var(--p7-text)]">
                          {user?.name}
                        </h2>
                        <p className="mt-1 text-sm capitalize text-[var(--p7-text-3)]">
                          {roleLabel}
                        </p>
                        <div className="mt-3 inline-flex rounded-full border border-[var(--p7-border)] bg-[var(--p7-surface-2)] px-3 py-1 text-[0.74rem] font-semibold text-[var(--p7-text-2)]">
                          {user?.email || t('common.notInformed')}
                        </div>
                      </div>
                    </div>

                    <div className="p7-panel-note">
                      <div className="mb-1 text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-[var(--v2-gold)]">
                        {t('myProfile.profileHubTitle', { defaultValue: 'Central do perfil' })}
                      </div>
                      <p className="text-[0.82rem] leading-[1.6] text-[var(--p7-text-2)]">
                        {t('myProfile.subtitle')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p7-section">
                <div className="p7-card p7-card-p">
                  <div className="p7-card-header">
                    <div>
                      <div className="p7-card-title">{t('myProfile.personalInfo')}</div>
                      <p className="mt-1 text-[0.8rem] leading-[1.55] text-[var(--p7-text-3)]">
                        {t('myProfile.personalInfoHint', {
                          defaultValue:
                            'Revise os dados que aparecem no seu cadastro e ajuste só o necessário.',
                        })}
                      </p>
                    </div>
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
                          <Save className="mr-2 h-4 w-4" />
                          {t('myProfile.save')}
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="p7-profile-field">
                      <Label htmlFor="name">{t('myProfile.fullName')}</Label>
                      <div className="p7-profile-input-wrap">
                        <User className="p7-profile-input-icon" />
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, name: e.target.value }))
                          }
                          className="p7-profile-input"
                          disabled={!isEditing}
                        />
                      </div>
                    </div>

                    <div className="p7-profile-field">
                      <Label htmlFor="email">{t('myProfile.email')}</Label>
                      <div className="p7-profile-input-wrap">
                        <Mail className="p7-profile-input-icon" />
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, email: e.target.value }))
                          }
                          className="p7-profile-input"
                          disabled={!isEditing}
                        />
                      </div>
                    </div>

                    <div className="p7-profile-field">
                      <Label htmlFor="phone">{t('myProfile.phone')}</Label>
                      <div className="p7-profile-input-wrap">
                        <Phone className="p7-profile-input-icon" />
                        <Input
                          id="phone"
                          value={formData.phone}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              phone: formatPhoneBR(e.target.value),
                            }))
                          }
                          className="p7-profile-input"
                          disabled={!isEditing}
                        />
                      </div>
                    </div>

                    <div className="p7-profile-field">
                      <Label htmlFor="birthDate">{t('myProfile.birthDate')}</Label>
                      <div className="p7-profile-input-wrap">
                        <Calendar className="p7-profile-input-icon" />
                        <Input
                          id="birthDate"
                          type="date"
                          value={formData.birthDate}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, birthDate: e.target.value }))
                          }
                          className="p7-profile-input"
                          disabled={!isEditing}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p7-section pb-4">
                <div className="p7-card p7-card-p">
                  <div className="p7-card-header">
                    <div>
                      <div className="p7-card-title">{t('myProfile.security')}</div>
                      <div className="text-sm text-[var(--p7-text-3)]">
                        {t('myProfile.changePasswordDesc')}
                      </div>
                    </div>
                  </div>
                  <DialogWithModalTracking
                    modalId="change-password-modal"
                    open={isChangePwdOpen}
                    onOpenChange={setIsChangePwdOpen}
                  >
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full md:w-auto">
                        <Lock className="mr-2 h-4 w-4" />
                        {t('myProfile.changePassword')}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="p7-modal-card">
                      <DialogHeader>
                        <DialogTitle>{t('myProfile.changePasswordDialogTitle')}</DialogTitle>
                        <DialogDescription>{t('myProfile.changePasswordDesc')}</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-3">
                        <div className="p7-profile-field">
                          <Label htmlFor="currentPassword">{t('myProfile.currentPassword')}</Label>
                          <div className="p7-profile-input-wrap">
                            <Lock className="p7-profile-input-icon" />
                            <Input
                              id="currentPassword"
                              type="password"
                              value={pwdForm.currentPassword}
                              onChange={(e) =>
                                setPwdForm((prev) => ({ ...prev, currentPassword: e.target.value }))
                              }
                              className="p7-profile-input"
                              aria-required="true"
                            />
                          </div>
                        </div>
                        <div className="p7-profile-field">
                          <Label htmlFor="newPassword">{t('myProfile.newPassword')}</Label>
                          <div className="p7-profile-input-wrap">
                            <Lock className="p7-profile-input-icon" />
                            <Input
                              id="newPassword"
                              type="password"
                              value={pwdForm.newPassword}
                              onChange={(e) =>
                                setPwdForm((prev) => ({ ...prev, newPassword: e.target.value }))
                              }
                              className="p7-profile-input"
                              aria-invalid={
                                pwdForm.newPassword.length > 0 && pwdForm.newPassword.length < 6
                              }
                              aria-required="true"
                            />
                          </div>
                          {pwdForm.newPassword.length > 0 && pwdForm.newPassword.length < 6 && (
                            <p className="text-xs text-destructive">
                              {t(
                                'myProfile.passwordTooShortDesc',
                                'A senha deve ter pelo menos 6 caracteres.'
                              )}
                            </p>
                          )}
                        </div>
                        <div className="p7-profile-field">
                          <Label htmlFor="confirmPassword">
                            {t('myProfile.confirmNewPassword')}
                          </Label>
                          <div className="p7-profile-input-wrap">
                            <Lock className="p7-profile-input-icon" />
                            <Input
                              id="confirmPassword"
                              type="password"
                              value={pwdForm.confirmPassword}
                              onChange={(e) =>
                                setPwdForm((prev) => ({ ...prev, confirmPassword: e.target.value }))
                              }
                              className="p7-profile-input"
                              aria-invalid={
                                pwdForm.confirmPassword.length > 0 &&
                                pwdForm.confirmPassword !== pwdForm.newPassword
                              }
                              aria-required="true"
                            />
                          </div>
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
                          {isChangingPwd ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Lock className="mr-2 h-4 w-4" />
                          )}
                          {t('myProfile.savePassword')}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </DialogWithModalTracking>
                </div>
              </div>
            </div>
          </div>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="p-4 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">{t('myProfile.title')}</h1>
          <p className="text-muted-foreground">{t('myProfile.subtitle')}</p>
        </div>

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
