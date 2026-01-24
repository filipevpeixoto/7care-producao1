/**
 * APM (Application Performance Monitoring) Service
 * Métricas, tracing distribuído e observabilidade
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Estrutura de métrica
 */
interface Metric {
  name: string;
  value: number;
  timestamp: number;
  tags: Record<string, string>;
  type: 'counter' | 'gauge' | 'histogram' | 'timing';
}

/**
 * Estrutura de span para tracing
 */
interface Span {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  tags: Record<string, string>;
  logs: Array<{ timestamp: number; message: string }>;
  status: 'ok' | 'error';
}

/**
 * Buffer de métricas para envio em batch
 */
const metricsBuffer: Metric[] = [];
const MAX_BUFFER_SIZE = 1000;
const FLUSH_INTERVAL_MS = 60000; // 1 minuto

/**
 * Buffer de traces
 */
const tracesBuffer: Span[] = [];
const MAX_TRACES_BUFFER = 500;

/**
 * Contadores de métricas agregadas
 */
const counters: Map<string, number> = new Map();
const gauges: Map<string, number> = new Map();
const histograms: Map<string, number[]> = new Map();

/**
 * Gera ID único para trace
 */
function generateTraceId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Gera ID único para span
 */
function generateSpanId(): string {
  return Math.random().toString(36).substr(2, 16);
}

/**
 * Incrementa contador
 */
export function incrementCounter(name: string, value: number = 1, tags: Record<string, string> = {}): void {
  const key = `${name}:${JSON.stringify(tags)}`;
  counters.set(key, (counters.get(key) || 0) + value);
  
  metricsBuffer.push({
    name,
    value,
    timestamp: Date.now(),
    tags,
    type: 'counter',
  });
  
  checkBufferSize();
}

/**
 * Define valor de gauge
 */
export function setGauge(name: string, value: number, tags: Record<string, string> = {}): void {
  const key = `${name}:${JSON.stringify(tags)}`;
  gauges.set(key, value);
  
  metricsBuffer.push({
    name,
    value,
    timestamp: Date.now(),
    tags,
    type: 'gauge',
  });
  
  checkBufferSize();
}

/**
 * Registra valor em histograma
 */
export function recordHistogram(name: string, value: number, tags: Record<string, string> = {}): void {
  const key = `${name}:${JSON.stringify(tags)}`;
  const values = histograms.get(key) || [];
  values.push(value);
  histograms.set(key, values);
  
  metricsBuffer.push({
    name,
    value,
    timestamp: Date.now(),
    tags,
    type: 'histogram',
  });
  
  checkBufferSize();
}

/**
 * Registra tempo de execução
 */
export function recordTiming(name: string, durationMs: number, tags: Record<string, string> = {}): void {
  metricsBuffer.push({
    name,
    value: durationMs,
    timestamp: Date.now(),
    tags,
    type: 'timing',
  });
  
  checkBufferSize();
}

/**
 * Verifica e flush do buffer se necessário
 */
function checkBufferSize(): void {
  if (metricsBuffer.length >= MAX_BUFFER_SIZE) {
    flushMetrics();
  }
}

/**
 * Envia métricas para backend de monitoramento
 */
export async function flushMetrics(): Promise<void> {
  if (metricsBuffer.length === 0) return;
  
  const metrics = [...metricsBuffer];
  metricsBuffer.length = 0;
  
  // Log resumo de métricas
  const summary = {
    total: metrics.length,
    counters: metrics.filter(m => m.type === 'counter').length,
    gauges: metrics.filter(m => m.type === 'gauge').length,
    histograms: metrics.filter(m => m.type === 'histogram').length,
    timings: metrics.filter(m => m.type === 'timing').length,
  };
  
  logger.debug('Métricas flushed', summary);
  
  // TODO: Enviar para Datadog/NewRelic/Prometheus
  // await sendToMonitoringBackend(metrics);
}

/**
 * Inicia um span de tracing
 */
export function startSpan(
  operationName: string,
  parentSpanId?: string,
  traceId?: string
): Span {
  const span: Span = {
    traceId: traceId || generateTraceId(),
    spanId: generateSpanId(),
    parentSpanId,
    operationName,
    startTime: Date.now(),
    tags: {},
    logs: [],
    status: 'ok',
  };
  
  return span;
}

/**
 * Finaliza um span
 */
export function endSpan(span: Span, status: 'ok' | 'error' = 'ok'): void {
  span.endTime = Date.now();
  span.duration = span.endTime - span.startTime;
  span.status = status;
  
  tracesBuffer.push(span);
  
  if (tracesBuffer.length >= MAX_TRACES_BUFFER) {
    flushTraces();
  }
  
  // Registrar como timing também
  recordTiming(`span.${span.operationName}`, span.duration, span.tags);
}

/**
 * Adiciona log ao span
 */
export function addSpanLog(span: Span, message: string): void {
  span.logs.push({
    timestamp: Date.now(),
    message,
  });
}

/**
 * Adiciona tag ao span
 */
export function addSpanTag(span: Span, key: string, value: string): void {
  span.tags[key] = value;
}

/**
 * Flush de traces
 */
export async function flushTraces(): Promise<void> {
  if (tracesBuffer.length === 0) return;
  
  const traces = [...tracesBuffer];
  tracesBuffer.length = 0;
  
  logger.debug(`Traces flushed: ${traces.length}`);
  
  // TODO: Enviar para Jaeger/Zipkin/Datadog APM
}

/**
 * Middleware de tracing automático
 */
export function tracingMiddleware(req: Request, res: Response, next: NextFunction): void {
  const span = startSpan(`HTTP ${req.method} ${req.path}`);
  
  // Propagar trace ID
  const incomingTraceId = req.headers['x-trace-id'] as string;
  if (incomingTraceId) {
    span.traceId = incomingTraceId;
  }
  
  // Adicionar headers de trace
  res.setHeader('x-trace-id', span.traceId);
  res.setHeader('x-span-id', span.spanId);
  
  // Tags do request
  addSpanTag(span, 'http.method', req.method);
  addSpanTag(span, 'http.url', req.originalUrl);
  addSpanTag(span, 'http.user_agent', req.headers['user-agent'] || 'unknown');
  
  // Anexar span ao request
  (req as Request & { span?: Span }).span = span;
  
  // Capturar resposta
  const originalEnd = res.end.bind(res);
  res.end = function(chunk?: unknown, encoding?: BufferEncoding | (() => void), cb?: () => void) {
    addSpanTag(span, 'http.status_code', res.statusCode.toString());
    endSpan(span, res.statusCode >= 400 ? 'error' : 'ok');
    if (typeof encoding === 'function') {
      return originalEnd(chunk, encoding);
    }
    if (encoding !== undefined) {
      return originalEnd(chunk, encoding, cb);
    }
    return originalEnd(chunk);
  } as typeof res.end;
  
  next();
}

/**
 * Middleware de métricas automáticas
 */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  
  // Contador de requisições
  incrementCounter('http.requests.total', 1, {
    method: req.method,
    path: req.route?.path || req.path,
  });
  
  // Capturar resposta para métricas
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    // Tempo de resposta
    recordTiming('http.request.duration', duration, {
      method: req.method,
      path: req.route?.path || req.path,
      status: res.statusCode.toString(),
    });
    
    // Contador por status
    incrementCounter('http.responses.total', 1, {
      method: req.method,
      status: res.statusCode.toString(),
    });
  });
  
  next();
}

/**
 * Retorna métricas atuais para endpoint /metrics
 */
export function getMetricsSummary(): Record<string, unknown> {
  const counterSummary: Record<string, number> = {};
  counters.forEach((value, key) => {
    counterSummary[key] = value;
  });
  
  const gaugeSummary: Record<string, number> = {};
  gauges.forEach((value, key) => {
    gaugeSummary[key] = value;
  });
  
  const histogramSummary: Record<string, { count: number; avg: number; min: number; max: number }> = {};
  histograms.forEach((values, key) => {
    if (values.length > 0) {
      histogramSummary[key] = {
        count: values.length,
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
      };
    }
  });
  
  return {
    timestamp: new Date().toISOString(),
    counters: counterSummary,
    gauges: gaugeSummary,
    histograms: histogramSummary,
    bufferSize: metricsBuffer.length,
    tracesBufferSize: tracesBuffer.length,
  };
}

/**
 * Inicializa APM
 */
export function initAPM(): void {
  // Flush periódico de métricas
  setInterval(flushMetrics, FLUSH_INTERVAL_MS);
  setInterval(flushTraces, FLUSH_INTERVAL_MS);
  
  // Métricas de sistema
  setInterval(() => {
    const memUsage = process.memoryUsage();
    setGauge('process.memory.heap_used', memUsage.heapUsed);
    setGauge('process.memory.heap_total', memUsage.heapTotal);
    setGauge('process.memory.rss', memUsage.rss);
    setGauge('process.uptime', process.uptime());
  }, 30000); // A cada 30 segundos
  
  logger.info('APM inicializado');
}

export default {
  init: initAPM,
  counter: incrementCounter,
  gauge: setGauge,
  histogram: recordHistogram,
  timing: recordTiming,
  startSpan,
  endSpan,
  addSpanLog,
  addSpanTag,
  tracingMiddleware,
  metricsMiddleware,
  getMetrics: getMetricsSummary,
  flush: {
    metrics: flushMetrics,
    traces: flushTraces,
  },
};
