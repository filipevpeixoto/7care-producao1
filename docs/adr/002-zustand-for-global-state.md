# ADR-002: Zustand para estado global

## Status: Aceito

## Contexto

Necessidade de estado global leve para dados que não vêm do servidor (tema, sidebar, preferências de UI).

## Decisão

Usar **Zustand** com um store centralizado (`appStore`) para estado de UI global.

## Consequências

- **Positivo**: API mínima, sem boilerplate, SSR-friendly
- **Positivo**: Subscriptions seletivas (re-render apenas quando o slice muda)
- **Positivo**: Middleware de persist para localStorage
- **Negativo**: Sem devtools tão ricos quanto Redux (mitigado com zustand/devtools)

## Uso

```typescript
import { useAppStore } from '@/stores/appStore';
const theme = useAppStore(state => state.theme);
```
