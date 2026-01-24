import { useState, useEffect } from 'react';

export const useSpiritualCheckIn = () => {
  const [shouldShowCheckIn, setShouldShowCheckIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkDailyCheckIn();
  }, []);

  const checkDailyCheckIn = async () => {
    try {
      const today = new Date().toDateString();
      const lastCheckIn = localStorage.getItem('lastSpiritualCheckIn');
      
      if (lastCheckIn !== today) {
        setShouldShowCheckIn(true);
      }
    } catch (error) {
      console.error('Erro ao verificar check-in:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const markCheckInComplete = () => {
    const today = new Date().toDateString();
            localStorage.setItem('lastSpiritualCheckIn', today);
    setShouldShowCheckIn(false);
  };

  const resetCheckIn = () => {
          localStorage.removeItem('lastSpiritualCheckIn');
    setShouldShowCheckIn(true);
  };

  return {
    shouldShowCheckIn,
    isLoading,
    markCheckInComplete,
    resetCheckIn
  };
};
