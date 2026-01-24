// Configurações de performance para o aplicativo
export const PERFORMANCE_CONFIG = {
  // Configurações de React Query
  queryDefaults: {
    retry: 1,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  },
  
  // Configurações de cache para diferentes tipos de dados
  cacheConfig: {
    dashboard: {
      staleTime: 2 * 60 * 1000, // 2 minutos - dados não mudam tão frequentemente
      gcTime: 5 * 60 * 1000, // 5 minutos
      refetchInterval: 5 * 60 * 1000, // 5 minutos - menos frequente
    },
    calendar: {
      staleTime: 5 * 60 * 1000, // 5 minutos
      gcTime: 10 * 60 * 1000, // 10 minutos
      refetchInterval: 15 * 60 * 1000, // 15 minutos
    },
    users: {
      staleTime: 3 * 60 * 1000, // 3 minutos - dados de usuários mudam menos
      gcTime: 5 * 60 * 1000, // 5 minutos
      refetchInterval: 10 * 60 * 1000, // 10 minutos - menos frequente
    },
    activities: {
      staleTime: 10 * 60 * 1000, // 10 minutos
      gcTime: 30 * 60 * 1000, // 30 minutos
      refetchInterval: 30 * 60 * 1000, // 30 minutos
    }
  },
  
  // Configurações de debounce para inputs
  debounce: {
    search: 300, // 300ms
    form: 500, // 500ms
    resize: 150, // 150ms
  },
  
  // Configurações de lazy loading
  lazyLoading: {
    threshold: 0.1, // 10% da viewport
    rootMargin: '50px',
  },
  
  // Configurações de virtualização para listas grandes
  virtualization: {
    itemHeight: 60,
    overscan: 5,
  }
};

// Função para verificar se está em modo de desenvolvimento
export const isDevelopment = () => process.env.NODE_ENV === 'development';

// Função para verificar se está em modo de produção
export const isProduction = () => process.env.NODE_ENV === 'production';

// Função para limpar console logs em produção
export const cleanConsoleInProduction = () => {
  if (isProduction()) {
    console.log = () => {};
    console.info = () => {};
    console.debug = () => {};
    console.warn = () => {};
    console.error = () => {};
  }
};

// Função para otimizar imagens
export const optimizeImage = (url: string, width: number, quality: number = 80) => {
  if (!url) return url;
  
  // Se for uma URL externa, retornar como está
  if (url.startsWith('http')) return url;
  
  // Para imagens locais, adicionar parâmetros de otimização
  return `${url}?w=${width}&q=${quality}`;
};

// Função para debounce
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Função para throttle
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

/**
 * Logger condicional que só exibe logs em desenvolvimento
 * Use este em vez de console.log diretamente
 */
export const devLog = {
  log: (...args: unknown[]) => {
    if (isDevelopment()) console.log(...args);
  },
  info: (...args: unknown[]) => {
    if (isDevelopment()) console.info(...args);
  },
  warn: (...args: unknown[]) => {
    if (isDevelopment()) console.warn(...args);
  },
  error: (...args: unknown[]) => {
    // Erros são sempre logados, mesmo em produção
    console.error(...args);
  },
  debug: (...args: unknown[]) => {
    if (isDevelopment()) console.debug(...args);
  }
};
