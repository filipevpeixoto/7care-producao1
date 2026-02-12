import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { fetchWithAuth } from '@/lib/api';
import { STALE_TIME } from '@/lib/queryConstants';

interface BirthdayUser {
  id: number;
  name: string;
  phone?: string;
  birthDate: string;
  profilePhoto?: string;
  church?: string | null;
}

interface BirthdaysData {
  today: BirthdayUser[];
  thisMonth: BirthdayUser[];
  all: BirthdayUser[]; // Todos os aniversariantes para o calendário
}

export const useBirthdays = () => {
  const { user } = useAuth();

  const { data: birthdays = { today: [], thisMonth: [], all: [] }, isLoading, error } = useQuery<BirthdaysData>({
    queryKey: ['birthdays', user?.id],
    queryFn: async () => {
      const response = await fetchWithAuth('/api/users/birthdays');
      
      if (!response.ok) {
        throw new Error('Falha ao buscar aniversariantes');
      }
      
      return response.json();
    },
    enabled: !!user, // Só executa se o usuário estiver logado
    staleTime: STALE_TIME.LONG, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos - manter em cache
    refetchInterval: 15 * 60 * 1000, // 15 minutos - refresh automático
    refetchOnWindowFocus: false // Não refazer ao focar janela
  });

  return { 
    birthdays, 
    isLoading, 
    error: error ? (error instanceof Error ? error.message : 'Erro desconhecido') : null 
  };
};
