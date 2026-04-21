import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Phone, Mail, MapPin, Clock, MessageCircle, Calendar } from 'lucide-react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import { PrototypeAvatar, PrototypeStatusBar } from './v2/prototypeShared';
import { ThemeToggle } from '@/components/v2/ThemeToggle';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function Contact() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { skin } = useTheme();
  const { user } = useAuth();

  if (skin === 'v2') {
    return (
      <MobileLayout variant="prototype">
        <div className="p7-shell">
          <div className="p7-screen">
            <PrototypeStatusBar />
            <div className="p7-grad-header">
              <div className="p7-header-row">
                <div>
                  <div className="p7-header-label">{t('contact.title')}</div>
                  <div className="p7-header-title">{t('contact.quickActions')}</div>
                </div>
                <div className="flex items-center gap-2">
                  <ThemeToggle />
                  <PrototypeAvatar name={user?.name} className="h-9 w-9 text-[0.8rem]" />
                </div>
              </div>
            </div>

            <div className="p7-scroll">
              <div className="p7-section">
                <div className="p7-card p7-card-p">
                  <div className="mb-1 text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-[var(--v2-gold)]">
                    Suporte pastoral
                  </div>
                  <p className="prose-narrow text-[0.88rem] leading-[1.6] text-[var(--p7-text-2)]">
                    Escolha o canal mais adequado para falar com a equipe, combinar um atendimento
                    ou resolver algo prático sem perder o contexto da sua rotina no app.
                  </p>
                </div>
              </div>

              <div className="p7-section">
                <div className="p7-card">
                  <div className="p7-card-header">
                    <span className="p7-card-title">{t('contact.title')}</span>
                  </div>
                  <a href="tel:+5511999999999" className="p7-row-item">
                    <div className="p7-row-icon navy">
                      <Phone className="h-[18px] w-[18px]" />
                    </div>
                    <div className="p7-row-text">
                      <div className="p7-row-title">(11) 99999-9999</div>
                      <div className="p7-row-sub">{t('contact.phoneHours')}</div>
                    </div>
                  </a>
                  <a href="mailto:contato@igreja.com" className="p7-row-item">
                    <div className="p7-row-icon gold">
                      <Mail className="h-[18px] w-[18px]" />
                    </div>
                    <div className="p7-row-text">
                      <div className="p7-row-title">contato@igreja.com</div>
                      <div className="p7-row-sub">{t('contact.emailResponse')}</div>
                    </div>
                  </a>
                  <div className="p7-row-item">
                    <div className="p7-row-icon soft">
                      <MapPin className="h-[18px] w-[18px]" />
                    </div>
                    <div className="p7-row-text">
                      <div className="p7-row-title">{t('contact.addressLine1')}</div>
                      <div className="p7-row-sub">{t('contact.addressLine2')}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p7-section">
                <div className="p7-card p7-card-p">
                  <div className="mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-[hsl(var(--primary))]" />
                    <span className="p7-card-title">{t('contact.businessHours')}</span>
                  </div>
                  <div className="space-y-2 text-[0.85rem]">
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--p7-text-2)]">{t('contact.weekdays')}</span>
                      <span className="font-semibold text-[var(--p7-text)]">
                        {t('contact.weekdaysHours')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--p7-text-2)]">{t('contact.saturday')}</span>
                      <span className="font-semibold text-[var(--p7-text)]">
                        {t('contact.saturdayHours')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--p7-text-2)]">{t('contact.sunday')}</span>
                      <span className="font-semibold text-[var(--p7-text)]">
                        {t('contact.sundayHours')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p7-section">
                <div className="p7-card">
                  <div className="p7-card-header">
                    <span className="p7-card-title">{t('contact.quickActions')}</span>
                  </div>
                  <button
                    type="button"
                    className="p7-row-item w-full text-left"
                    onClick={() => navigate('/chat')}
                  >
                    <div className="p7-row-icon navy">
                      <MessageCircle className="h-[18px] w-[18px]" />
                    </div>
                    <div className="p7-row-text">
                      <div className="p7-row-title">{t('contact.sendMessage')}</div>
                      <div className="p7-row-sub">{t('contact.needHelp')}</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    className="p7-row-item w-full text-left"
                    onClick={() => navigate('/calendar')}
                  >
                    <div className="p7-row-icon gold">
                      <Calendar className="h-[18px] w-[18px]" />
                    </div>
                    <div className="p7-row-text">
                      <div className="p7-row-title">{t('contact.scheduleMeeting')}</div>
                      <div className="p7-row-sub">{t('contact.businessHours')}</div>
                    </div>
                  </button>
                </div>
              </div>

              <div className="p7-section pb-4">
                <div className="p7-card p7-card-p">
                  <div className="mb-1.5 text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-[hsl(var(--primary))]">
                    {t('contact.needHelp')}
                  </div>
                  <p className="prose-narrow text-[0.85rem] leading-[1.6] text-[var(--p7-text-2)]">
                    {t('contact.helpText')}
                  </p>
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
      <div className="container mx-auto p-4 space-y-6">
        <div className="flex items-center gap-3">
          <Phone className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">{t('contact.title')}</h1>
        </div>

        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-blue-600" />
                {t('contact.phone')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-medium">(11) 99999-9999</p>
              <p className="text-sm text-muted-foreground">{t('contact.phoneHours')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-green-600" />
                {t('contact.email')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-medium">contato@igreja.com</p>
              <p className="text-sm text-muted-foreground">{t('contact.emailResponse')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-red-600" />
                {t('contact.address')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-medium">{t('contact.addressLine1')}</p>
              <p className="text-sm text-muted-foreground">{t('contact.addressLine2')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-purple-600" />
                {t('contact.businessHours')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="font-medium">{t('contact.weekdays')}</span>
                <span>{t('contact.weekdaysHours')}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">{t('contact.saturday')}</span>
                <span>{t('contact.saturdayHours')}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">{t('contact.sunday')}</span>
                <span>{t('contact.sundayHours')}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">{t('contact.quickActions')}</h2>
          <div className="grid gap-3">
            <Button
              variant="outline"
              className="justify-start h-12"
              onClick={() => navigate('/messages')}
            >
              <MessageCircle className="h-5 w-5 mr-3" />
              {t('contact.sendMessage')}
            </Button>

            <Button
              variant="outline"
              className="justify-start h-12"
              onClick={() => navigate('/calendar')}
            >
              <Clock className="h-5 w-5 mr-3" />
              {t('contact.scheduleMeeting')}
            </Button>
          </div>
        </div>

        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <h3 className="font-semibold text-blue-900 mb-2">{t('contact.needHelp')}</h3>
            <p className="text-blue-800 text-sm">{t('contact.helpText')}</p>
          </CardContent>
        </Card>
      </div>
    </MobileLayout>
  );
}
