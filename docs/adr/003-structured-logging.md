# ADR-003: Logging estruturado com módulo centralizado

## Status: Aceito

## Contexto

O app usava `console.log/warn/error` espalhados pelo código sem estrutura, dificultando debugging e impedindo integração com serviço de monitoramento.

## Decisão

Criar módulo `client/src/lib/logger.ts` com:
- Loggers pré-configurados por domínio (authLogger, calendarLogger, etc.)
- Factory para loggers customizados (`createLogger('Module')`)
- Integração automática com Sentry: `logger.error()` envia para Sentry
- Logs de debug/info suprimidos em produção

## Consequências

- **Positivo**: Erros reportados automaticamente ao Sentry
- **Positivo**: Breadcrumbs de warning para contexto em crash reports
- **Positivo**: Logs consistentes com timestamp e prefixo de módulo
- **Regra**: Nunca usar `console.*` diretamente — usar loggers do módulo
