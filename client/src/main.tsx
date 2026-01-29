import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initWebVitals } from './lib/webVitals';

// Global error handler for Chrome extension messages and service worker errors
window.addEventListener('unhandledrejection', event => {
  const errorMessage = event.reason?.message || '';

  // Suppress Chrome extension and service worker message channel errors
  if (
    errorMessage.includes('message channel closed before a response was received') ||
    errorMessage.includes('listener indicated an asynchronous response') ||
    errorMessage.includes('SKIP_WAITING') ||
    errorMessage.includes('message channel closed') ||
    errorMessage.includes('asynchronous response')
  ) {
    event.preventDefault();
    return;
  }
});

// Global error handler for uncaught errors
window.addEventListener('error', event => {
  const errorMessage = event.message || '';

  // Suppress service worker related errors
  if (
    errorMessage.includes('message channel closed') ||
    errorMessage.includes('asynchronous response') ||
    errorMessage.includes('listener indicated')
  ) {
    event.preventDefault();
    return;
  }
});

// Handle Chrome extension runtime errors
declare const chrome:
  | {
      runtime?: {
        onMessage?: {
          addListener: (
            callback: (
              message: unknown,
              sender: unknown,
              sendResponse: (response: unknown) => void
            ) => boolean
          ) => void;
        };
      };
    }
  | undefined;

if (typeof chrome !== 'undefined' && chrome?.runtime) {
  try {
    chrome.runtime.onMessage?.addListener(
      (message: unknown, sender: unknown, sendResponse: (response: unknown) => void) => {
        try {
          sendResponse({ success: true });
        } catch (_e) {
          // Ignore channel closure errors
        }
        return false;
      }
    );
  } catch (error) {
    // Silently ignore extension API errors
  }
}

// Registrar Service Worker para funcionalidade offline
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      console.log('[App] Service Worker registrado:', registration.scope);

      // Verificar atualizações
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Nova versão disponível
              console.log('[App] Nova versão do app disponível');
              // Pode mostrar um toast para o usuário atualizar
            }
          });
        }
      });

      // Escutar mensagens do Service Worker
      navigator.serviceWorker.addEventListener('message', event => {
        if (event.data?.type === 'SYNC_REQUIRED') {
          console.log('[App] Sincronização solicitada pelo SW');
          // Dispara evento customizado para o app tratar
          window.dispatchEvent(new CustomEvent('sw-sync-required'));
        }
      });
    } catch (error) {
      console.warn('[App] Erro ao registrar Service Worker:', error);
    }
  });
}

// Inicializar Web Vitals monitoring
initWebVitals();

// Montar React
createRoot(document.getElementById('root')!).render(<App />);
