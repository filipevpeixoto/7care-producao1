import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Mapeamento de rotas para títulos de página amigáveis.
 * Usado para atualizar o document.title e anunciar mudanças de rota
 * para leitores de tela.
 */
const routeTitles: Record<string, string> = {
  '/': 'Login',
  '/login': 'Login',
  '/first-access': 'Primeiro Acesso',
  '/termos': 'Termos de Uso',
  '/privacidade': 'Política de Privacidade',
  '/dashboard': 'Início',
  '/calendar': 'Agenda',
  '/menu': 'Menu',
  '/meu-cadastro': 'Meu Cadastro',
  '/users': 'Usuários',
  '/interested': 'Interessados',
  '/my-interested': 'Meus Interessados',
  '/chat': 'Chat',
  '/gamification': 'Gamificação',
  '/prayers': 'Orações',
  '/push-notifications': 'Notificações Push',
  '/notifications': 'Histórico de Notificações',
  '/settings': 'Configurações',
  '/appearance': 'Aparência',
  '/tasks': 'Tarefas',
  '/reports': 'Relatórios',
  '/my-reports': 'Meus Relatórios',
  '/contact': 'Contato',
  '/election-config': 'Configurar Nomeações',
  '/election-voting': 'Votação',
  '/election-dashboard': 'Dashboard de Nomeações',
  '/elections': 'Nomeações',
  '/election-manage': 'Gerenciar Nomeação',
  '/election-vote': 'Votar',
  '/districts': 'Distritos',
  '/pastors': 'Pastores',
  '/receipts': 'Recibos',
  '/receipt-automation': 'Automação de Recibos',
};

const APP_NAME = '7Care';

/**
 * Componente que atualiza o document.title e anuncia mudanças de rota
 * para leitores de tela via aria-live region.
 *
 * Deve ser colocado dentro do <Router> no App.tsx.
 */
export function RouteAnnouncer() {
  const location = useLocation();

  useEffect(() => {
    // Obter título baseado na rota exata ou pelo primeiro segmento
    const path = location.pathname;
    let pageTitle = routeTitles[path];

    if (!pageTitle) {
      // Tentar match por primeiro nível de rota (ex: /pastor-onboarding/abc → Onboarding)
      const firstSegment = '/' + path.split('/').filter(Boolean)[0];
      pageTitle = routeTitles[firstSegment];
    }

    if (!pageTitle) {
      // Fallback: capitalizar o primeiro segmento
      const segment = path.split('/').filter(Boolean)[0] || '';
      pageTitle =
        segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
    }

    const fullTitle = `${pageTitle} | ${APP_NAME}`;
    document.title = fullTitle;

    // Anunciar mudança de rota para leitores de tela
    const announcer = document.getElementById('route-announcer');
    if (announcer) {
      announcer.textContent = `Navegou para ${pageTitle}`;
    }
  }, [location.pathname]);

  return (
    <div
      id="route-announcer"
      role="status"
      aria-live="assertive"
      aria-atomic="true"
      className="sr-only"
    />
  );
}
