import { useState, useEffect } from 'react';

interface ImportSuccessEvent {
  type: 'users' | 'calendar-events' | 'other';
  count: number;
  timestamp: string;
}

export const useLastImportDate = () => {
  const [lastImportDate, setLastImportDate] = useState<string | null>(
    localStorage.getItem('lastImportDate') || '2025-01-20T14:30:00Z'
  );

  useEffect(() => {
    const handleImportSuccess = (event: CustomEvent<ImportSuccessEvent>) => {
      try {
        if (event.detail && event.detail.timestamp) {
          const newTimestamp = event.detail.timestamp;
          setLastImportDate(newTimestamp);
          
          // Salvar no localStorage para persistência
          localStorage.setItem('lastImportDate', newTimestamp);
          
          console.log(`📅 Data da última importação atualizada: ${newTimestamp} (${event.detail.type})`);
        }
      } catch (error) {
        console.error('❌ Erro no handleImportSuccess:', error);
      }
    };

    // Adicionar listener para o evento de importação bem-sucedida
    window.addEventListener('import-success', handleImportSuccess as EventListener);

    // Cleanup do listener
    return () => {
      window.removeEventListener('import-success', handleImportSuccess as EventListener);
    };
  }, []);

  const updateLastImportDate = (timestamp: string) => {
    setLastImportDate(timestamp);
    localStorage.setItem('lastImportDate', timestamp);
  };

  const getDaysSinceLastImport = () => {
    if (!lastImportDate) return null;
    
    const lastImport = new Date(lastImportDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - lastImport.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  const getFormattedLastImportDate = () => {
    if (!lastImportDate) return 'Nenhuma importação realizada';
    
    const date = new Date(lastImportDate);
    return `${date.toLocaleDateString('pt-BR')} às ${date.toLocaleTimeString('pt-BR')}`;
  };

  return {
    lastImportDate,
    updateLastImportDate,
    getDaysSinceLastImport,
    getFormattedLastImportDate,
  };
};

