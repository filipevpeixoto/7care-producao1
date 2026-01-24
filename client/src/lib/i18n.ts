/**
 * Configuração de internacionalização (i18n)
 * Suporta detecção automática de idioma e fallback
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Traduções em português (padrão)
const ptBR = {
  translation: {
    // Navegação
    nav: {
      dashboard: 'Painel',
      users: 'Usuários',
      members: 'Membros',
      events: 'Eventos',
      churches: 'Igrejas',
      tasks: 'Tarefas',
      reports: 'Relatórios',
      settings: 'Configurações',
      logout: 'Sair',
    },
    
    // Autenticação
    auth: {
      login: 'Entrar',
      logout: 'Sair',
      email: 'E-mail',
      password: 'Senha',
      forgotPassword: 'Esqueceu a senha?',
      rememberMe: 'Lembrar-me',
      loginError: 'E-mail ou senha inválidos',
      twoFactor: 'Autenticação de dois fatores',
      enterCode: 'Digite o código do seu app autenticador',
      verify: 'Verificar',
      recoveryCode: 'Usar código de recuperação',
    },
    
    // Usuários
    users: {
      title: 'Usuários',
      addUser: 'Adicionar Usuário',
      editUser: 'Editar Usuário',
      deleteUser: 'Excluir Usuário',
      name: 'Nome',
      email: 'E-mail',
      phone: 'Telefone',
      role: 'Perfil',
      church: 'Igreja',
      status: 'Status',
      active: 'Ativo',
      inactive: 'Inativo',
      search: 'Buscar usuários...',
      noResults: 'Nenhum usuário encontrado',
      deleteConfirm: 'Tem certeza que deseja excluir este usuário?',
      roles: {
        admin: 'Administrador',
        pastor: 'Pastor',
        leader: 'Líder',
        member: 'Membro',
      },
    },
    
    // Eventos
    events: {
      title: 'Eventos',
      addEvent: 'Novo Evento',
      editEvent: 'Editar Evento',
      deleteEvent: 'Excluir Evento',
      name: 'Nome do Evento',
      description: 'Descrição',
      date: 'Data',
      time: 'Horário',
      location: 'Local',
      type: 'Tipo',
      attendees: 'Participantes',
      noEvents: 'Nenhum evento encontrado',
      types: {
        worship: 'Culto',
        prayer: 'Oração',
        study: 'Estudo Bíblico',
        meeting: 'Reunião',
        social: 'Social',
        other: 'Outro',
      },
    },
    
    // Igrejas
    churches: {
      title: 'Igrejas',
      addChurch: 'Nova Igreja',
      editChurch: 'Editar Igreja',
      deleteChurch: 'Excluir Igreja',
      name: 'Nome',
      code: 'Código',
      address: 'Endereço',
      city: 'Cidade',
      state: 'Estado',
      phone: 'Telefone',
      pastor: 'Pastor',
      members: 'Membros',
      noChurches: 'Nenhuma igreja encontrada',
    },
    
    // Dashboard
    dashboard: {
      title: 'Painel',
      welcome: 'Bem-vindo',
      totalMembers: 'Total de Membros',
      activeMembers: 'Membros Ativos',
      upcomingEvents: 'Próximos Eventos',
      recentActivity: 'Atividade Recente',
      quickActions: 'Ações Rápidas',
      statistics: 'Estatísticas',
    },
    
    // Tarefas
    tasks: {
      title: 'Tarefas',
      addTask: 'Nova Tarefa',
      editTask: 'Editar Tarefa',
      deleteTask: 'Excluir Tarefa',
      name: 'Tarefa',
      description: 'Descrição',
      dueDate: 'Data Limite',
      priority: 'Prioridade',
      status: 'Status',
      assignee: 'Responsável',
      priorities: {
        low: 'Baixa',
        medium: 'Média',
        high: 'Alta',
        urgent: 'Urgente',
      },
      statuses: {
        pending: 'Pendente',
        inProgress: 'Em Andamento',
        completed: 'Concluída',
        cancelled: 'Cancelada',
      },
    },
    
    // Configurações
    settings: {
      title: 'Configurações',
      general: 'Geral',
      appearance: 'Aparência',
      notifications: 'Notificações',
      privacy: 'Privacidade',
      security: 'Segurança',
      language: 'Idioma',
      theme: 'Tema',
      darkMode: 'Modo Escuro',
      lightMode: 'Modo Claro',
      systemMode: 'Seguir Sistema',
      enableNotifications: 'Ativar Notificações',
      emailNotifications: 'Notificações por E-mail',
      pushNotifications: 'Notificações Push',
      twoFactorAuth: 'Autenticação de Dois Fatores',
    },
    
    // Relatórios
    reports: {
      title: 'Relatórios',
      generate: 'Gerar Relatório',
      export: 'Exportar',
      period: 'Período',
      type: 'Tipo',
      attendance: 'Frequência',
      growth: 'Crescimento',
      financial: 'Financeiro',
    },
    
    // Ações comuns
    common: {
      save: 'Salvar',
      cancel: 'Cancelar',
      delete: 'Excluir',
      edit: 'Editar',
      add: 'Adicionar',
      search: 'Buscar',
      filter: 'Filtrar',
      export: 'Exportar',
      import: 'Importar',
      refresh: 'Atualizar',
      loading: 'Carregando...',
      error: 'Erro',
      success: 'Sucesso',
      confirm: 'Confirmar',
      back: 'Voltar',
      next: 'Próximo',
      previous: 'Anterior',
      close: 'Fechar',
      yes: 'Sim',
      no: 'Não',
      all: 'Todos',
      none: 'Nenhum',
      select: 'Selecionar',
      selectAll: 'Selecionar Todos',
      clearSelection: 'Limpar Seleção',
      noData: 'Nenhum dado disponível',
      required: 'Campo obrigatório',
      optional: 'Opcional',
      actions: 'Ações',
      details: 'Detalhes',
      view: 'Visualizar',
      download: 'Baixar',
      upload: 'Enviar',
      print: 'Imprimir',
    },
    
    // Mensagens
    messages: {
      saveSuccess: 'Salvo com sucesso!',
      saveError: 'Erro ao salvar',
      deleteSuccess: 'Excluído com sucesso!',
      deleteError: 'Erro ao excluir',
      loadError: 'Erro ao carregar dados',
      networkError: 'Erro de conexão',
      noConnection: 'Você está sem conexão',
      online: 'Conexão restaurada',
      unauthorized: 'Acesso não autorizado',
      sessionExpired: 'Sessão expirada. Faça login novamente.',
      confirmDelete: 'Tem certeza que deseja excluir?',
      unsavedChanges: 'Você tem alterações não salvas. Deseja sair mesmo assim?',
    },
    
    // Validação
    validation: {
      required: 'Este campo é obrigatório',
      email: 'E-mail inválido',
      phone: 'Telefone inválido',
      minLength: 'Mínimo de {{min}} caracteres',
      maxLength: 'Máximo de {{max}} caracteres',
      passwordMismatch: 'As senhas não conferem',
      invalidDate: 'Data inválida',
      invalidFormat: 'Formato inválido',
    },
    
    // Datas
    dates: {
      today: 'Hoje',
      yesterday: 'Ontem',
      tomorrow: 'Amanhã',
      thisWeek: 'Esta Semana',
      lastWeek: 'Semana Passada',
      thisMonth: 'Este Mês',
      lastMonth: 'Mês Passado',
    },
  },
};

// Traduções em inglês
const enUS = {
  translation: {
    // Navigation
    nav: {
      dashboard: 'Dashboard',
      users: 'Users',
      members: 'Members',
      events: 'Events',
      churches: 'Churches',
      tasks: 'Tasks',
      reports: 'Reports',
      settings: 'Settings',
      logout: 'Logout',
    },
    
    // Authentication
    auth: {
      login: 'Login',
      logout: 'Logout',
      email: 'Email',
      password: 'Password',
      forgotPassword: 'Forgot password?',
      rememberMe: 'Remember me',
      loginError: 'Invalid email or password',
      twoFactor: 'Two-factor authentication',
      enterCode: 'Enter the code from your authenticator app',
      verify: 'Verify',
      recoveryCode: 'Use recovery code',
    },
    
    // Users
    users: {
      title: 'Users',
      addUser: 'Add User',
      editUser: 'Edit User',
      deleteUser: 'Delete User',
      name: 'Name',
      email: 'Email',
      phone: 'Phone',
      role: 'Role',
      church: 'Church',
      status: 'Status',
      active: 'Active',
      inactive: 'Inactive',
      search: 'Search users...',
      noResults: 'No users found',
      deleteConfirm: 'Are you sure you want to delete this user?',
      roles: {
        admin: 'Administrator',
        pastor: 'Pastor',
        leader: 'Leader',
        member: 'Member',
      },
    },
    
    // Events
    events: {
      title: 'Events',
      addEvent: 'New Event',
      editEvent: 'Edit Event',
      deleteEvent: 'Delete Event',
      name: 'Event Name',
      description: 'Description',
      date: 'Date',
      time: 'Time',
      location: 'Location',
      type: 'Type',
      attendees: 'Attendees',
      noEvents: 'No events found',
      types: {
        worship: 'Worship',
        prayer: 'Prayer',
        study: 'Bible Study',
        meeting: 'Meeting',
        social: 'Social',
        other: 'Other',
      },
    },
    
    // Churches
    churches: {
      title: 'Churches',
      addChurch: 'New Church',
      editChurch: 'Edit Church',
      deleteChurch: 'Delete Church',
      name: 'Name',
      code: 'Code',
      address: 'Address',
      city: 'City',
      state: 'State',
      phone: 'Phone',
      pastor: 'Pastor',
      members: 'Members',
      noChurches: 'No churches found',
    },
    
    // Dashboard
    dashboard: {
      title: 'Dashboard',
      welcome: 'Welcome',
      totalMembers: 'Total Members',
      activeMembers: 'Active Members',
      upcomingEvents: 'Upcoming Events',
      recentActivity: 'Recent Activity',
      quickActions: 'Quick Actions',
      statistics: 'Statistics',
    },
    
    // Tasks
    tasks: {
      title: 'Tasks',
      addTask: 'New Task',
      editTask: 'Edit Task',
      deleteTask: 'Delete Task',
      name: 'Task',
      description: 'Description',
      dueDate: 'Due Date',
      priority: 'Priority',
      status: 'Status',
      assignee: 'Assignee',
      priorities: {
        low: 'Low',
        medium: 'Medium',
        high: 'High',
        urgent: 'Urgent',
      },
      statuses: {
        pending: 'Pending',
        inProgress: 'In Progress',
        completed: 'Completed',
        cancelled: 'Cancelled',
      },
    },
    
    // Settings
    settings: {
      title: 'Settings',
      general: 'General',
      appearance: 'Appearance',
      notifications: 'Notifications',
      privacy: 'Privacy',
      security: 'Security',
      language: 'Language',
      theme: 'Theme',
      darkMode: 'Dark Mode',
      lightMode: 'Light Mode',
      systemMode: 'Follow System',
      enableNotifications: 'Enable Notifications',
      emailNotifications: 'Email Notifications',
      pushNotifications: 'Push Notifications',
      twoFactorAuth: 'Two-Factor Authentication',
    },
    
    // Reports
    reports: {
      title: 'Reports',
      generate: 'Generate Report',
      export: 'Export',
      period: 'Period',
      type: 'Type',
      attendance: 'Attendance',
      growth: 'Growth',
      financial: 'Financial',
    },
    
    // Common actions
    common: {
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      add: 'Add',
      search: 'Search',
      filter: 'Filter',
      export: 'Export',
      import: 'Import',
      refresh: 'Refresh',
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
      confirm: 'Confirm',
      back: 'Back',
      next: 'Next',
      previous: 'Previous',
      close: 'Close',
      yes: 'Yes',
      no: 'No',
      all: 'All',
      none: 'None',
      select: 'Select',
      selectAll: 'Select All',
      clearSelection: 'Clear Selection',
      noData: 'No data available',
      required: 'Required field',
      optional: 'Optional',
      actions: 'Actions',
      details: 'Details',
      view: 'View',
      download: 'Download',
      upload: 'Upload',
      print: 'Print',
    },
    
    // Messages
    messages: {
      saveSuccess: 'Saved successfully!',
      saveError: 'Error saving',
      deleteSuccess: 'Deleted successfully!',
      deleteError: 'Error deleting',
      loadError: 'Error loading data',
      networkError: 'Connection error',
      noConnection: 'No internet connection',
      online: 'Connection restored',
      unauthorized: 'Unauthorized access',
      sessionExpired: 'Session expired. Please login again.',
      confirmDelete: 'Are you sure you want to delete?',
      unsavedChanges: 'You have unsaved changes. Are you sure you want to leave?',
    },
    
    // Validation
    validation: {
      required: 'This field is required',
      email: 'Invalid email',
      phone: 'Invalid phone',
      minLength: 'Minimum {{min}} characters',
      maxLength: 'Maximum {{max}} characters',
      passwordMismatch: 'Passwords do not match',
      invalidDate: 'Invalid date',
      invalidFormat: 'Invalid format',
    },
    
    // Dates
    dates: {
      today: 'Today',
      yesterday: 'Yesterday',
      tomorrow: 'Tomorrow',
      thisWeek: 'This Week',
      lastWeek: 'Last Week',
      thisMonth: 'This Month',
      lastMonth: 'Last Month',
    },
  },
};

// Traduções em espanhol
const esES = {
  translation: {
    nav: {
      dashboard: 'Panel',
      users: 'Usuarios',
      members: 'Miembros',
      events: 'Eventos',
      churches: 'Iglesias',
      tasks: 'Tareas',
      reports: 'Informes',
      settings: 'Configuración',
      logout: 'Salir',
    },
    auth: {
      login: 'Iniciar sesión',
      logout: 'Cerrar sesión',
      email: 'Correo electrónico',
      password: 'Contraseña',
      forgotPassword: '¿Olvidó su contraseña?',
      rememberMe: 'Recuérdame',
      loginError: 'Correo o contraseña inválidos',
      twoFactor: 'Autenticación de dos factores',
      enterCode: 'Ingrese el código de su aplicación autenticadora',
      verify: 'Verificar',
      recoveryCode: 'Usar código de recuperación',
    },
    common: {
      save: 'Guardar',
      cancel: 'Cancelar',
      delete: 'Eliminar',
      edit: 'Editar',
      add: 'Agregar',
      search: 'Buscar',
      filter: 'Filtrar',
      export: 'Exportar',
      import: 'Importar',
      refresh: 'Actualizar',
      loading: 'Cargando...',
      error: 'Error',
      success: 'Éxito',
      confirm: 'Confirmar',
      back: 'Volver',
      next: 'Siguiente',
      previous: 'Anterior',
      close: 'Cerrar',
      yes: 'Sí',
      no: 'No',
      all: 'Todos',
      none: 'Ninguno',
      select: 'Seleccionar',
      selectAll: 'Seleccionar Todos',
      clearSelection: 'Limpiar Selección',
      noData: 'Sin datos disponibles',
      required: 'Campo obligatorio',
      optional: 'Opcional',
      actions: 'Acciones',
      details: 'Detalles',
      view: 'Ver',
      download: 'Descargar',
      upload: 'Subir',
      print: 'Imprimir',
    },
    messages: {
      saveSuccess: '¡Guardado con éxito!',
      saveError: 'Error al guardar',
      deleteSuccess: '¡Eliminado con éxito!',
      deleteError: 'Error al eliminar',
      loadError: 'Error al cargar datos',
      networkError: 'Error de conexión',
      noConnection: 'Sin conexión a internet',
      online: 'Conexión restaurada',
      unauthorized: 'Acceso no autorizado',
      sessionExpired: 'Sesión expirada. Inicie sesión nuevamente.',
      confirmDelete: '¿Está seguro que desea eliminar?',
      unsavedChanges: 'Tiene cambios sin guardar. ¿Desea salir de todos modos?',
    },
  },
};

// Inicialização do i18n
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      'pt-BR': ptBR,
      'en-US': enUS,
      'es-ES': esES,
    },
    fallbackLng: 'pt-BR',
    supportedLngs: ['pt-BR', 'en-US', 'es-ES'],
    
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: '7care-language',
    },
    
    interpolation: {
      escapeValue: false, // React já faz escape
    },
    
    react: {
      useSuspense: false,
    },
  });

export default i18n;

// Hook para trocar idioma
export function useLanguage() {
  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('7care-language', lang);
  };
  
  const currentLanguage = i18n.language;
  
  const availableLanguages = [
    { code: 'pt-BR', name: 'Português (Brasil)', flag: '🇧🇷' },
    { code: 'en-US', name: 'English (US)', flag: '🇺🇸' },
    { code: 'es-ES', name: 'Español', flag: '🇪🇸' },
  ];
  
  return { changeLanguage, currentLanguage, availableLanguages };
}
