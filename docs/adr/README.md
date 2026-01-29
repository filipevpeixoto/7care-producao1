# Architecture Decision Records (ADRs)

Este diretório contém os Architecture Decision Records do projeto 7Care.

## O que são ADRs?

ADRs são documentos que capturam decisões arquiteturais importantes junto com seu contexto e consequências. Eles servem como documentação histórica para entender por que certas decisões foram tomadas.

## Formato

Cada ADR segue o template em [000-template.md](000-template.md).

## Lista de ADRs

| Número                           | Título                          | Status | Data       |
| -------------------------------- | ------------------------------- | ------ | ---------- |
| [001](001-neon-postgresql.md)    | Escolha do Neon PostgreSQL      | Aceito | 2026-01-28 |
| [002](002-jwt-authentication.md) | Arquitetura de Autenticação JWT | Aceito | 2026-01-28 |
| [003](003-role-permissions.md)   | Estrutura de Roles e Permissões | Aceito | 2026-01-28 |
| [004](004-caching-strategy.md)   | Estratégia de Cache             | Aceito | 2026-01-28 |
| [005](005-gamification.md)       | Padrão de Gamificação           | Aceito | 2026-01-28 |

## Status Possíveis

- **Proposto:** Decisão em discussão
- **Aceito:** Decisão aprovada e implementada
- **Deprecado:** Decisão substituída por outra
- **Rejeitado:** Decisão não aprovada
