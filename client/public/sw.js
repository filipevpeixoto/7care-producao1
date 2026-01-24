/**
 * Service Worker para 7Care
 * Permite acesso offline completo à aplicação
 */

const CACHE_NAME = '7care-v1';
const STATIC_CACHE = '7care-static-v1';
const API_CACHE = '7care-api-v1';

// Arquivos essenciais para cachear
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/7care-logo.png',
  '/7carelogonew.png',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/placeholder.svg',
  '/offline.html',
];

// APIs para cachear
const API_ROUTES = [
  '/api/users',
  '/api/events',
  '/api/tasks',
  '/api/churches',
  '/api/districts',
  '/api/messages',
];

// Instalar Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando Service Worker...');
  
  event.waitUntil(
    Promise.all([
      // Cache de arquivos estáticos
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('[SW] Cacheando arquivos estáticos...');
        return cache.addAll(STATIC_ASSETS).catch((error) => {
          console.warn('[SW] Alguns arquivos não foram cacheados:', error);
        });
      }),
      // Ativar imediatamente
      self.skipWaiting(),
    ])
  );
});

// Ativar Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Ativando Service Worker...');
  
  event.waitUntil(
    Promise.all([
      // Limpar caches antigos
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name.startsWith('7care-') && name !== CACHE_NAME && name !== STATIC_CACHE && name !== API_CACHE)
            .map((name) => {
              console.log('[SW] Removendo cache antigo:', name);
              return caches.delete(name);
            })
        );
      }),
      // Tomar controle imediatamente
      self.clients.claim(),
    ])
  );
});

// Interceptar requisições
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar requisições não-GET
  if (request.method !== 'GET') {
    return;
  }

  // Ignorar extensões do Chrome e outros protocolos
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Estratégia para diferentes tipos de recursos
  if (url.pathname.startsWith('/api/')) {
    // API: Network First, fallback para cache
    event.respondWith(networkFirstStrategy(request, API_CACHE));
  } else if (isStaticAsset(url.pathname)) {
    // Estáticos: Cache First
    event.respondWith(cacheFirstStrategy(request, STATIC_CACHE));
  } else {
    // Outros (páginas): Network First com fallback offline
    event.respondWith(networkFirstWithOfflineFallback(request));
  }
});

/**
 * Verifica se é um asset estático
 */
function isStaticAsset(pathname) {
  const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot'];
  return staticExtensions.some((ext) => pathname.endsWith(ext)) || pathname === '/manifest.json';
}

/**
 * Network First: Tenta rede, fallback para cache
 */
async function networkFirstStrategy(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    
    // Se sucesso, atualiza o cache
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Sem rede, busca do cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('[SW] Servindo do cache:', request.url);
      return cachedResponse;
    }
    
    // Se for API, retorna JSON vazio
    if (request.url.includes('/api/')) {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    throw error;
  }
}

/**
 * Cache First: Busca do cache, fallback para rede
 */
async function cacheFirstStrategy(request, cacheName) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    // Atualiza cache em background
    fetch(request).then((response) => {
      if (response.ok) {
        caches.open(cacheName).then((cache) => cache.put(request, response));
      }
    }).catch(() => {});
    
    return cachedResponse;
  }
  
  // Não tem no cache, busca da rede
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Para arquivos JS/CSS, tentar retornar vazio
    if (request.url.endsWith('.js')) {
      return new Response('', { headers: { 'Content-Type': 'application/javascript' } });
    }
    if (request.url.endsWith('.css')) {
      return new Response('', { headers: { 'Content-Type': 'text/css' } });
    }
    throw error;
  }
}

/**
 * Network First com fallback para página offline
 */
async function networkFirstWithOfflineFallback(request) {
  try {
    const networkResponse = await fetch(request);
    
    // Cacheia a resposta
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Tenta o cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Para navegação, tenta a página principal ou offline
    if (request.mode === 'navigate') {
      const indexCache = await caches.match('/index.html');
      if (indexCache) {
        return indexCache;
      }
      
      const offlineCache = await caches.match('/offline.html');
      if (offlineCache) {
        return offlineCache;
      }
    }
    
    throw error;
  }
}

// Sincronização em background
self.addEventListener('sync', (event) => {
  console.log('[SW] Background Sync:', event.tag);
  
  if (event.tag === '7care-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // Notifica os clients para sincronizar
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage({
      type: 'SYNC_REQUIRED',
    });
  });
}

// Receber mensagens do app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(STATIC_CACHE).then((cache) => {
        return cache.addAll(event.data.urls || []);
      })
    );
  }
});

// Push notifications (para futuro uso)
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  
  event.waitUntil(
    self.registration.showNotification(data.title || '7Care', {
      body: data.body || 'Nova notificação',
      icon: '/pwa-192x192.png',
      badge: '/icons/icon-72x72.png',
      data: data,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      // Se já tem uma janela aberta, foca nela
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // Senão, abre uma nova
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});

console.log('[SW] Service Worker carregado');
