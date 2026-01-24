import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';

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
      const headers: Record<string, string> = {};
      if (user?.id) {
        headers['x-user-id'] = user.id.toString();
        headers['x-user-role'] = user.role;
      }
      
      const response = await fetch('/api/users/birthdays', {
        headers
      });
      
      if (!response.ok) {
        throw new Error('Falha ao buscar aniversariantes');
      }
      
      return response.json();
    },
    enabled: !!user, // Só executa se o usuário estiver logado
    staleTime: 5 * 60 * 1000, // 5 minutos - cache inteligente
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
