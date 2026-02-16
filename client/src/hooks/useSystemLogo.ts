import { useState, useCallback } from 'react';
import { createLogger } from '@/lib/logger';

const logger = createLogger('SystemLogo');

export const useSystemLogo = () => {
  // Logo fixa do sistema
  const [systemLogo] = useState<string>('/7care-logo.png');
  const [logoVersion] = useState<number>(1);
  const [isLoading] = useState(false);

  // Funções simplificadas para logo fixa
  const refreshLogo = useCallback(async () => {
    logger.debug('🔄 Logo fixa do sistema - sem necessidade de refresh');
  }, []);

  const clearLogoSystem = useCallback(async () => {
    logger.debug('🗑️ Logo fixa do sistema - não pode ser removida');
  }, []);

  const updateLogoSystem = useCallback((_newLogoUrl: string) => {
    logger.debug('🔄 Logo fixa do sistema - não pode ser atualizada');
  }, []);

  return {
    systemLogo,
    logoVersion,
    isLoading,
    refreshLogo,
    clearLogoSystem,
    updateLogoSystem,
  };
};
