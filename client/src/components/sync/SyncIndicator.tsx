// Indicador de status de conexão
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CloudOff } from 'lucide-react';
import { useState, useEffect } from 'react';
import { createLogger } from '@/lib/logger';

const logger = createLogger('Sync');

export function SyncIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      logger.debug('🌐 Conexão restabelecida!');
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      logger.debug('📡 Sem conexão!');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Mostrar apenas quando sem conexão
  if (isOnline) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md">
      <Alert className="bg-orange-50 border-orange-200">
        <CloudOff className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-sm text-orange-800">
          <strong>Sem conexão</strong> - Verifique sua internet
        </AlertDescription>
      </Alert>
    </div>
  );
}

