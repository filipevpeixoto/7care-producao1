type V2PageMeta = {
  eyebrow: string;
  title: string;
  subtitle: string;
};

const DEFAULT_META: V2PageMeta = {
  eyebrow: '7care',
  title: '7care',
  subtitle: 'Fluxos pastorais em uma experiência única e coesa.',
};

const META_BY_PREFIX: Array<[string, V2PageMeta]> = [
  [
    '/dashboard',
    {
      eyebrow: 'Painel',
      title: 'Dashboard',
      subtitle: 'Visão rápida da igreja, do cuidado e da semana.',
    },
  ],
  [
    '/calendar',
    {
      eyebrow: 'Agenda',
      title: 'Calendário',
      subtitle: 'Compromissos, eventos e acompanhamento do mês.',
    },
  ],
  [
    '/tasks',
    {
      eyebrow: 'Execução',
      title: 'Tarefas',
      subtitle: 'Pendências, prioridades e próximos passos do time.',
    },
  ],
  [
    '/prayers',
    {
      eyebrow: 'Cuidado',
      title: 'Orações',
      subtitle: 'Pedidos, intercessões e acompanhamento espiritual.',
    },
  ],
  [
    '/chat',
    {
      eyebrow: 'Conversas',
      title: 'Chat',
      subtitle: 'Mensagens e acompanhamento pastoral em tempo real.',
    },
  ],
  [
    '/menu',
    {
      eyebrow: 'Ações',
      title: 'Menu',
      subtitle: 'Atalhos por intenção, perfil e rotina de cuidado.',
    },
  ],
  [
    '/users',
    {
      eyebrow: 'Pessoas',
      title: 'Usuários',
      subtitle: 'Membros, líderes e gestão da base da igreja.',
    },
  ],
  [
    '/interested',
    {
      eyebrow: 'Relacionamento',
      title: 'Interessados',
      subtitle: 'Acompanhamento de visitantes e novos contatos.',
    },
  ],
  [
    '/my-interested',
    {
      eyebrow: 'Relacionamento',
      title: 'Meus interessados',
      subtitle: 'Pessoas que você está acompanhando de perto.',
    },
  ],
  [
    '/meu-cadastro',
    {
      eyebrow: 'Conta',
      title: 'Meu cadastro',
      subtitle: 'Dados pessoais, perfil e informações de contato.',
    },
  ],
  [
    '/gamification',
    {
      eyebrow: 'Jornada',
      title: 'Pontuação',
      subtitle: 'Progresso, motivação e próximos marcos da caminhada.',
    },
  ],
  [
    '/push-notifications',
    {
      eyebrow: 'Comunicação',
      title: 'Notificações push',
      subtitle: 'Envio, mídia e alcance dos comunicados da igreja.',
    },
  ],
  [
    '/notifications',
    {
      eyebrow: 'Comunicação',
      title: 'Notificações',
      subtitle: 'Histórico de mensagens e alertas recebidos.',
    },
  ],
  [
    '/settings',
    {
      eyebrow: 'Preferências',
      title: 'Configurações',
      subtitle: 'Aparência, privacidade, sistema e personalizações.',
    },
  ],
  [
    '/reports',
    {
      eyebrow: 'Análises',
      title: 'Relatórios',
      subtitle: 'Indicadores, funil e visão estratégica da operação.',
    },
  ],
  [
    '/my-reports',
    {
      eyebrow: 'Análises',
      title: 'Meus relatórios',
      subtitle: 'Indicadores e recortes da sua atuação.',
    },
  ],
  [
    '/contact',
    {
      eyebrow: 'Suporte',
      title: 'Contato',
      subtitle: 'Canais de ajuda, atendimento e informações úteis.',
    },
  ],
  [
    '/election-config',
    {
      eyebrow: 'Governança',
      title: 'Configuração eleitoral',
      subtitle: 'Definição das regras e critérios da eleição.',
    },
  ],
  [
    '/election-voting',
    {
      eyebrow: 'Governança',
      title: 'Votação',
      subtitle: 'Fluxo de voto e acompanhamento da eleição.',
    },
  ],
  [
    '/election-dashboard',
    {
      eyebrow: 'Governança',
      title: 'Dashboard eleitoral',
      subtitle: 'Resultados, participação e status da eleição.',
    },
  ],
  [
    '/elections',
    {
      eyebrow: 'Governança',
      title: 'Eleições',
      subtitle: 'Central das eleições, etapas e histórico.',
    },
  ],
  [
    '/election-manage',
    {
      eyebrow: 'Governança',
      title: 'Gestão eleitoral',
      subtitle: 'Administração detalhada do processo eleitoral.',
    },
  ],
  [
    '/election-vote',
    {
      eyebrow: 'Governança',
      title: 'Voto mobile',
      subtitle: 'Experiência de votação otimizada para o celular.',
    },
  ],
  [
    '/districts',
    {
      eyebrow: 'Estrutura',
      title: 'Distritos',
      subtitle: 'Organização territorial, lideranças e cobertura.',
    },
  ],
  [
    '/pastors',
    {
      eyebrow: 'Liderança',
      title: 'Pastores',
      subtitle: 'Cadastros, acompanhamento e estrutura ministerial.',
    },
  ],
  [
    '/pastor-invites',
    {
      eyebrow: 'Liderança',
      title: 'Convites pastorais',
      subtitle: 'Envio, aprovação e acompanhamento de convites.',
    },
  ],
];

const ROLE_OVERRIDES: Record<string, Partial<Record<string, V2PageMeta>>> = {
  superadmin: {
    '/dashboard': {
      eyebrow: 'Operação',
      title: 'Painel geral',
      subtitle: 'Distritos, liderança, alertas e saúde da operação em um só lugar.',
    },
    '/menu': {
      eyebrow: 'Coordenação',
      title: 'Central de gestão',
      subtitle: 'Ações organizadas por prioridade administrativa e cuidado pastoral.',
    },
  },
  pastor: {
    '/dashboard': {
      eyebrow: 'Cuidado',
      title: 'Painel pastoral',
      subtitle: 'Pessoas que precisam de atenção, agenda da semana e próximos passos.',
    },
    '/menu': {
      eyebrow: 'Rotina',
      title: 'Central pastoral',
      subtitle: 'Acesse rápido cuidado, comunicação e organização da semana.',
    },
  },
  missionary: {
    '/dashboard': {
      eyebrow: 'Missão',
      title: 'Minha atuação',
      subtitle: 'Acompanhamentos, agenda e leitura simples do que precisa avançar.',
    },
    '/menu': {
      eyebrow: 'Missão',
      title: 'Minha central',
      subtitle: 'Tudo o que você precisa para acompanhar pessoas sem ruído.',
    },
  },
  member: {
    '/dashboard': {
      eyebrow: 'Jornada',
      title: 'Minha semana',
      subtitle: 'Agenda, vida espiritual e próximos passos em uma experiência leve.',
    },
  },
  interested: {
    '/dashboard': {
      eyebrow: 'Boas-vindas',
      title: 'Próximos passos',
      subtitle: 'Veja eventos, fale com a igreja e continue sua jornada com clareza.',
    },
    '/menu': {
      eyebrow: 'Boas-vindas',
      title: 'Acesso rápido',
      subtitle: 'Os caminhos mais simples para falar com a igreja e se orientar.',
    },
  },
};

export const getV2PageMeta = (
  pathname: string,
  fallbackTitle?: string,
  role?: string
): V2PageMeta => {
  const normalizedPath = pathname.toLowerCase();
  const normalizedRole = role?.toLowerCase();
  const roleMatch = normalizedRole ? ROLE_OVERRIDES[normalizedRole]?.[normalizedPath] : undefined;

  if (roleMatch) {
    return roleMatch;
  }

  const matched = META_BY_PREFIX.find(([prefix]) => normalizedPath.startsWith(prefix));

  if (matched) {
    return matched[1];
  }

  if (fallbackTitle) {
    return {
      eyebrow: '7care',
      title: fallbackTitle,
      subtitle: 'Experiência unificada do novo layout em todo o aplicativo.',
    };
  }

  return DEFAULT_META;
};
