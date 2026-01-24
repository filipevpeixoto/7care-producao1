import { ChevronRight, Home } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

interface BreadcrumbItem {
  label: string;
  path?: string;
}

// Mapeamento de rotas para labels amigáveis
const routeLabels: Record<string, string> = {
  'dashboard': 'Início',
  'calendar': 'Agenda',
  'menu': 'Menu',
  'meu-cadastro': 'Meu Cadastro',
  'users': 'Usuários',
  'interested': 'Interessados',
  'my-interested': 'Meus Interessados',
  'chat': 'Chat',
  'gamification': 'Gamificação',
  'prayers': 'Orações',
  'push-notifications': 'Notificações Push',
  'notifications': 'Histórico de Notificações',
  'settings': 'Configurações',
  'tasks': 'Tarefas',
  'reports': 'Relatórios',
  'my-reports': 'Meus Relatórios',
  'contact': 'Contato',
  'election-config': 'Configurar Nomeações',
  'election-voting': 'Votação',
  'election-dashboard': 'Dashboard de Nomeações',
  'elections': 'Nomeações',
  'election-manage': 'Gerenciar Nomeação',
  'election-vote': 'Votar',
  'districts': 'Distritos',
  'pastors': 'Pastores',
  'first-access': 'Primeiro Acesso',
  'pastor-first-access': 'Configuração Inicial'
};

export const Breadcrumbs = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  // Não mostrar breadcrumbs na página de login ou se só tiver um nível
  if (pathnames.length === 0 || location.pathname === '/') {
    return null;
  }

  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Início', path: '/dashboard' }
  ];

  let currentPath = '';
  pathnames.forEach((segment, index) => {
    currentPath += `/${segment}`;
    
    // Pegar label amigável ou usar o segmento capitalizado
    const label = routeLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
    
    // Último item não tem link
    if (index === pathnames.length - 1) {
      breadcrumbs.push({ label });
    } else {
      breadcrumbs.push({ label, path: currentPath });
    }
  });

  // Se estiver no dashboard, não mostrar breadcrumbs
  if (pathnames.length === 1 && pathnames[0] === 'dashboard') {
    return null;
  }

  return (
    <nav className="flex items-center space-x-1 text-sm text-muted-foreground px-4 py-2 bg-background/50 border-b">
      {breadcrumbs.map((item, index) => (
        <div key={index} className="flex items-center">
          {index > 0 && <ChevronRight className="h-4 w-4 mx-1" />}
          {item.path ? (
            <Link 
              to={item.path} 
              className="hover:text-foreground transition-colors flex items-center"
            >
              {index === 0 && <Home className="h-3 w-3 mr-1" />}
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground font-medium">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
};
