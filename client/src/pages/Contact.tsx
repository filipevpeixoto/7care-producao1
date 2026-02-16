import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Phone, Mail, MapPin, Clock, MessageCircle } from 'lucide-react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function Contact() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <MobileLayout>
      <div className="container mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Phone className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">{t('contact.title')}</h1>
        </div>

        {/* Contact Information */}
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

        {/* Quick Actions */}
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

        {/* Additional Info */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <h3 className="font-semibold text-blue-900 mb-2">{t('contact.needHelp')}</h3>
            <p className="text-blue-800 text-sm">
              {t('contact.helpText')}
            </p>
          </CardContent>
        </Card>
      </div>
    </MobileLayout>
  );
}
