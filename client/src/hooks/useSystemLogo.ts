import { useState, useEffect, useCallback } from 'react';

export const useSystemLogo = () => {
  // Logo fixa do sistema
  const [systemLogo, setSystemLogo] = useState<string>('/7care-logo.png');
  const [logoVersion, setLogoVersion] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(false);

  // Funções simplificadas para logo fixa
  const refreshLogo = useCallback(async () => {
    console.log('🔄 Logo fixa do sistema - sem necessidade de refresh');
  }, []);

  const clearLogoSystem = useCallback(async () => {
    console.log('🗑️ Logo fixa do sistema - não pode ser removida');
  }, []);

  const updateLogoSystem = useCallback((newLogoUrl: string) => {
    console.log('🔄 Logo fixa do sistema - não pode ser atualizada');
  }, []);

  return { 
    systemLogo, 
    logoVersion, 
    isLoading, 
    refreshLogo, 
    clearLogoSystem, 
    updateLogoSystem 
  };
};