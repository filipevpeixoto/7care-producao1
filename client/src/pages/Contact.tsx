import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Phone, Mail, MapPin, Clock, MessageCircle } from 'lucide-react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { useNavigate } from 'react-router-dom';

export default function Contact() {
  const navigate = useNavigate();

  return (
    <MobileLayout>
      <div className="container mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Phone className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Contato</h1>
        </div>

        {/* Contact Information */}
        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-blue-600" />
                Telefone
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-medium">(11) 99999-9999</p>
              <p className="text-sm text-muted-foreground">Segunda a Sexta, 8h às 18h</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-green-600" />
                Email
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-medium">contato@igreja.com</p>
              <p className="text-sm text-muted-foreground">Resposta em até 24h</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-red-600" />
                Endereço
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-medium">Rua da Igreja, 123</p>
              <p className="text-sm text-muted-foreground">Centro - São Paulo/SP</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-purple-600" />
                Horários de Funcionamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="font-medium">Segunda a Sexta:</span>
                <span>8h às 18h</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Sábado:</span>
                <span>8h às 12h</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Domingo:</span>
                <span>8h às 12h</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Ações Rápidas</h2>
          
          <div className="grid gap-3">
            <Button 
              variant="outline" 
              className="justify-start h-12"
              onClick={() => navigate('/messages')}
            >
              <MessageCircle className="h-5 w-5 mr-3" />
              Enviar Mensagem
            </Button>
            
            <Button 
              variant="outline" 
              className="justify-start h-12"
              onClick={() => navigate('/calendar')}
            >
              <Clock className="h-5 w-5 mr-3" />
              Agendar Reunião
            </Button>
          </div>
        </div>

        {/* Additional Info */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <h3 className="font-semibold text-blue-900 mb-2">Precisa de Ajuda?</h3>
            <p className="text-blue-800 text-sm">
              Nossa equipe está sempre disponível para ajudar você. 
              Entre em contato conosco através dos canais acima ou 
              use as ações rápidas para uma comunicação mais direta.
            </p>
          </CardContent>
        </Card>
      </div>
    </MobileLayout>
  );
}
