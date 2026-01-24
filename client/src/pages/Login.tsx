import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { LoginForm } from '@/components/auth/LoginForm';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { X, Download, Smartphone } from 'lucide-react';

import { useSystemLogo } from '@/hooks/useSystemLogo';

export const Login = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(true);
  const { systemLogo } = useSystemLogo();
  const { isAuthenticated, isLoading, user } = useAuth();
  const { isInstallable, isInstalled, installApp, getInstallInstructions } = usePWAInstall();
  
  const installInstructions = getInstallInstructions();

  const handleInstall = async () => {
    const success = await installApp();
    if (success) {
      setShowInstallPrompt(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-white">Carregando...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    // Check for first access and tutorial completion
    const tutorialCompleted = localStorage.getItem('tutorial_completed');
    const tutorialSkipped = localStorage.getItem('tutorial_skipped');
    
    // Debug logs
    console.log('🔍 Debug Login.tsx:');
    console.log('  - isAuthenticated:', isAuthenticated);
    console.log('  - user:', user);
    console.log('  - tutorialCompleted:', tutorialCompleted);
    console.log('  - tutorialSkipped:', tutorialSkipped);
    console.log('  - user?.firstAccess:', user?.firstAccess);
    console.log('  - user?.status:', user?.status);
    console.log('  - user?.usingDefaultPassword:', user?.usingDefaultPassword);
    
    // Check if user needs first access (firstAccess flag, or using default password)
    // But only if they haven't completed the tutorial yet
    // Note: status 'pending' alone should not force first access
    const needsFirstAccess = !tutorialCompleted && !tutorialSkipped && 
      (user?.firstAccess || user?.usingDefaultPassword);
    
    // Verificar se é pastor e precisa de primeiro acesso específico
    const pastorFirstAccessCompleted = localStorage.getItem('pastor_first_access_completed');
    const isPastorUser = user?.role === 'pastor';
    const needsPastorFirstAccess = isPastorUser && !pastorFirstAccessCompleted && needsFirstAccess;
    
    console.log('  - needsFirstAccess:', needsFirstAccess);
    console.log('  - isPastorUser:', isPastorUser);
    console.log('  - needsPastorFirstAccess:', needsPastorFirstAccess);
    console.log('  - Conditions breakdown:');
    console.log('    - !tutorialCompleted:', !tutorialCompleted);
    console.log('    - !tutorialSkipped:', !tutorialSkipped);
    console.log('    - user?.firstAccess:', user?.firstAccess);
    console.log('    - user?.status === "pending":', user?.status === 'pending');
    console.log('    - user?.usingDefaultPassword:', user?.usingDefaultPassword);
    
    if (needsPastorFirstAccess) {
      console.log('  - Redirecionando para /pastor-first-access');
      return <Navigate to="/pastor-first-access" replace />;
    }
    
    if (needsFirstAccess) {
      console.log('  - Redirecionando para /first-access');
      return <Navigate to="/first-access" replace />;
    }
    
    console.log('  - Redirecionando para /dashboard');
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center p-4 relative">
      {/* PWA Install Notification */}
      {!isInstalled && showInstallPrompt && (
        <div className="fixed bottom-4 right-4 z-50 max-w-xs">
          <Alert className="bg-white/95 backdrop-blur-sm border-primary/20 shadow-lg">
            <Smartphone className="h-4 w-4" />
            <AlertDescription className="pr-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-medium text-primary mb-1 text-sm">
                    📱 Instale o app!
                  </p>
                  <div className="text-xs text-muted-foreground">
                    <p className="font-medium mb-1">{installInstructions.platform}:</p>
                    {installInstructions.steps.slice(0, 2).map((step, index) => (
                      <p key={index} className="text-xs leading-tight">{step}</p>
                    ))}
                  </div>
                  <Button 
                    onClick={isInstallable ? handleInstall : () => {
                      // Para iOS/Safari, mostra todas as instruções em um alert
                      alert(`Como instalar o 7Care:\n\n${installInstructions.steps.join('\n')}`);
                    }}
                    size="sm" 
                    className="mt-2 bg-primary hover:bg-primary/90 text-white text-xs h-7 px-3"
                  >
                    <Download className="w-3 h-3 mr-1" />
                    {isInstallable ? 'Instalar Agora' : 'Ver Instruções'}
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 hover:bg-primary/10 ml-1"
                  onClick={() => setShowInstallPrompt(false)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )}
      
      <div className="w-full max-w-md space-y-8">
        {/* Logo and Title */}
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-40 h-40 bg-background backdrop-blur-sm rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.3)]">
              {systemLogo && (
              <img 
                src={systemLogo} 
                alt="Logo" 
                className="w-24 h-24 object-contain"
              />
              )}
            </div>
          </div>

        </div>

        {/* Auth Forms */}
        <div className="space-y-4">
          {isRegistering ? <RegisterForm /> : <LoginForm />}
          
          <div className="text-center">
            <Button
              variant="ghost"
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-white hover:bg-white/10 hover:text-white"
            >
              {isRegistering 
                ? 'Já tem uma conta? Faça login' 
                : 'Não tem conta? Cadastre-se'
              }
            </Button>
          </div>
        </div>


      </div>
    </div>
  );
};