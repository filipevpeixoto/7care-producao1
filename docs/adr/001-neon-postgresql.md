# ADR-001: Escolha do Neon PostgreSQL

**Status:** Aceito  
**Data:** 2026-01-28  
**Decisores:** Equipe de Desenvolvimento

## Contexto

O projeto 7Care precisa de um banco de dados relacional para armazenar dados de membros, eventos, igrejas, e outras entidades do sistema de gestão eclesiástica. O sistema será hospedado no Netlify, que não oferece banco de dados nativo.

Requisitos:

- Banco relacional com suporte a transações
- Compatível com hospedagem serverless
- Custo acessível para projeto em crescimento
- Backups automáticos
- Escalabilidade

## Decisão

Escolhemos **Neon PostgreSQL** como banco de dados principal.

Justificativa:

1. **Serverless-first:** Neon é otimizado para ambientes serverless
2. **Branching:** Permite criar branches do banco para desenvolvimento
3. **Auto-scaling:** Escala automaticamente conforme demanda
4. **Tier gratuito:** Generoso para desenvolvimento e projetos pequenos
5. **PostgreSQL completo:** Todas as features do PostgreSQL standard

## Alternativas Consideradas

### Supabase

- **Prós:** Dashboard completo, Auth integrado, Realtime
- **Contras:** Mais complexo que necessário, custo maior em escala

### PlanetScale (MySQL)

- **Prós:** Excelente scaling, branching
- **Contras:** MySQL vs PostgreSQL, menos features SQL

### Railway PostgreSQL

- **Prós:** Simples, bom preço
- **Contras:** Menos otimizado para serverless

### SQLite (local/Turso)

- **Prós:** Simples, rápido
- **Contras:** Limitações para múltiplas conexões, menos features

## Consequências

### Positivas

- Cold starts rápidos em serverless
- Custo previsível e baixo
- PostgreSQL completo com JSON, arrays, etc.
- Backups automáticos incluídos

### Negativas

- Dependência de serviço externo
- Latência de rede vs banco local
- Limites de conexão no tier gratuito

### Neutras

- Necessidade de pool de conexões
- Migrações via Drizzle ORM

## Referências

- [Neon Documentation](https://neon.tech/docs)
- [Drizzle ORM with Neon](https://orm.drizzle.team/docs/get-started-postgresql#neon)
