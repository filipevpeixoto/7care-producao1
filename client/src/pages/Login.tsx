import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useTheme } from '@/contexts/ThemeContext';
import { LoginClassic } from './login/LoginClassic';
import { LoginV2 } from './login/LoginV2';

export const Login = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(true);
  const { isAuthenticated, isLoading, user } = useAuth();
  const { isInstallable, isInstalled, installApp } = usePWAInstall();
  const { skin } = useTheme();

  const handleInstall = async () => {
    const success = await installApp();
    if (success) {
      setShowInstallPrompt(false);
    }
  };

  if (isLoading) {
    return skin === 'v2' ? <LoginV2 isLoading /> : <LoginClassic isLoading />;
  }

  if (isAuthenticated && user?.id) {
    // Check for first access and tutorial completion - usando chave específica do usuário
    const tutorialCompleted = localStorage.getItem(`tutorial_completed_${user.id}`);
    const tutorialSkipped = localStorage.getItem(`tutorial_skipped_${user.id}`);

    // Check if user needs first access (firstAccess flag, or using default password)
    // But only if they haven't completed the tutorial yet
    // Pastores aprovados via convite também veem o tour geral na primeira vez
    const needsFirstAccess = !tutorialCompleted && !tutorialSkipped && user?.firstAccess;

    if (needsFirstAccess) {
      return <Navigate to="/first-access" replace />;
    }

    return <Navigate to="/dashboard" replace />;
  }

  if (isAuthenticated) {
    // User authenticated but no id yet, redirect to dashboard
    return <Navigate to="/dashboard" replace />;
  }

  const shellProps = {
    isRegistering,
    showInstallPrompt,
    isInstallable,
    isInstalled,
    onInstall: handleInstall,
    onToggleRegistering: () => setIsRegistering((current) => !current),
    onDismissInstallPrompt: () => setShowInstallPrompt(false),
  };

  return skin === 'v2' ? <LoginV2 {...shellProps} /> : <LoginClassic {...shellProps} />;
};
