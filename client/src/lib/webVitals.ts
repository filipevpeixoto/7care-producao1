/**
 * Web Vitals Monitoring
 * Mede e reporta Core Web Vitals (LCP, FID, CLS, FCP, TTFB)
 */

import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from 'web-vitals';

// Tipos para métricas
interface WebVitalMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  navigationType: string;
}

// Thresholds para classificação
const THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 },
  INP: { good: 200, poor: 500 },
  CLS: { good: 0.1, poor: 0.25 },
  FCP: { good: 1800, poor: 3000 },
  TTFB: { good: 800, poor: 1800 },
};

/**
 * Classifica a métrica como good, needs-improvement ou poor
 */
function getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const threshold = THRESHOLDS[name as keyof typeof THRESHOLDS];
  if (!threshold) return 'good';

  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
}

/**
 * Handler para processar métricas
 */
function handleMetric(metric: Metric): void {
  const webVital: WebVitalMetric = {
    name: metric.name,
    value: metric.value,
    rating: getRating(metric.name, metric.value),
    delta: metric.delta,
    id: metric.id,
    navigationType: metric.navigationType || 'unknown',
  };

  // Log em desenvolvimento
  if (process.env.NODE_ENV === 'development') {
    const color =
      webVital.rating === 'good' ? '🟢' : webVital.rating === 'needs-improvement' ? '🟡' : '🔴';
    console.log(
      `${color} [Web Vital] ${webVital.name}: ${webVital.value.toFixed(2)} (${webVital.rating})`
    );
  }

  // Enviar para analytics
  sendToAnalytics(webVital);
}

/**
 * Envia métrica para sistema de analytics
 */
function sendToAnalytics(metric: WebVitalMetric): void {
  // Não envia se não houver conexão
  if (!navigator.onLine) return;

  // Analytics habilitado em produção — envia métricas para Sentry breadcrumbs
  // e (se configurado) para o endpoint /api/analytics/vitals
  const ANALYTICS_ENABLED = import.meta.env.PROD;
  if (!ANALYTICS_ENABLED) return;

  // Enviar para endpoint de analytics (se configurado)
  const analyticsEndpoint = '/api/analytics/vitals';

  // Usar sendBeacon para não bloquear
  if (navigator.sendBeacon) {
    const blob = new Blob([JSON.stringify(metric)], { type: 'application/json' });
    navigator.sendBeacon(analyticsEndpoint, blob);
  } else {
    // Fallback para fetch
    fetch(analyticsEndpoint, {
      method: 'POST',
      body: JSON.stringify(metric),
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
    }).catch(() => {
      // Silenciar erros de analytics
    });
  }

  // Tipo para window extendido
  const extWindow = window as unknown as {
    Sentry?: { addBreadcrumb: (b: object) => void };
    gtag?: (cmd: string, action: string, params: object) => void;
  };

  // Enviar para Sentry como breadcrumb (se disponível)
  if (typeof window !== 'undefined' && extWindow.Sentry) {
    extWindow.Sentry.addBreadcrumb({
      category: 'web-vital',
      message: `${metric.name}: ${metric.value.toFixed(2)}`,
      level: metric.rating === 'poor' ? 'warning' : 'info',
      data: metric,
    });
  }

  // Enviar para Google Analytics (se disponível)
  if (typeof window !== 'undefined' && extWindow.gtag) {
    extWindow.gtag('event', metric.name, {
      event_category: 'Web Vitals',
      event_label: metric.id,
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      non_interaction: true,
    });
  }
}

/**
 * Inicializa monitoramento de Web Vitals
 */
export function initWebVitals(): void {
  // Core Web Vitals
  onLCP(handleMetric);
  onINP(handleMetric);
  onCLS(handleMetric);

  // Métricas adicionais
  onFCP(handleMetric);
  onTTFB(handleMetric);
}

/**
 * Obtém resumo das métricas coletadas
 */
export function getVitalsReport(): Promise<Record<string, WebVitalMetric>> {
  return new Promise(resolve => {
    const metrics: Record<string, WebVitalMetric> = {};

    const collectMetric = (metric: Metric) => {
      metrics[metric.name] = {
        name: metric.name,
        value: metric.value,
        rating: getRating(metric.name, metric.value),
        delta: metric.delta,
        id: metric.id,
        navigationType: metric.navigationType || 'unknown',
      };
    };

    onLCP(collectMetric);
    onINP(collectMetric);
    onCLS(collectMetric);
    onFCP(collectMetric);
    onTTFB(collectMetric);

    // Retorna após 5 segundos ou quando todas as métricas forem coletadas
    setTimeout(() => resolve(metrics), 5000);
  });
}

/**
 * Componente React para mostrar Web Vitals (dev only)
 */
export function WebVitalsDebug(): JSX.Element | null {
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return null; // Implementar UI se necessário
}

export default initWebVitals;
