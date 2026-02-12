# 🏛️ 7care - Church Plus Manager

> **Versão de produção oficial** - Sistema completo de gestão para igrejas  
> **Repositório:** https://github.com/pxttorrent/7care-producao-sem-offline

[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![CI](https://github.com/pxttorrent/7care-producao-sem-offline/actions/workflows/ci.yml/badge.svg)](https://github.com/pxttorrent/7care-producao-sem-offline/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/pxttorrent/7care-producao-sem-offline/graph/badge.svg)](https://codecov.io/gh/pxttorrent/7care-producao-sem-offline)
[![Tests](https://img.shields.io/badge/Tests-676%20passing-brightgreen.svg)](./tests)
[![Code Quality](https://img.shields.io/badge/Quality-8.0%2F10-brightgreen.svg)](#)
[![Security](https://img.shields.io/badge/Security-CodeQL%20%7C%20npm%20audit-green.svg)](./SECURITY.md)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

## ⚡ Sobre Este Sistema

Sistema completo de gerenciamento para igrejas com funcionalidades avançadas.

- ✅ **Leve e Otimizado** - Performance excelente com lazy loading
- ✅ **Produção Ativa** - https://7care-app.vercel.app/
- ✅ **676 Testes** - 526 client + 150 server (cobertura 40%/35%)
- ✅ **Segurança Robusta** - JWT 15min, CSRF, input sanitization, rate limiting
- ✅ **CI/CD Completo** - Lint, TypeCheck, Tests, Security Audit, Coverage
- ✅ **Docker Ready** - PostgreSQL + Redis + Adminer + Redis Commander
- ✅ **Quality Score** - 8.0/10 (auditado em Feb 2026)

## 🚀 Início Rápido

### Pré-requisitos

- **Node.js 20+** (use `nvm use` para garantir a versão)
- **npm 9+**
- **Docker** (opcional, mas recomendado)
- Conta no Neon Database (gratuita)

### Instalação Rápida (Script Helper)

```bash
# Clonar repositório
git clone https://github.com/pxttorrent/7care-producao-sem-offline.git
cd 7care-producao-sem-offline

# Setup completo (instala deps + migrations)
./dev.sh setup

# Inicia dev servers (backend + frontend)
./dev.sh start
```

### Instalação Manual

```bash
# Instalar dependências
npm install --legacy-peer-deps

# Configurar variáveis de ambiente
cp .env.example .env
# Edite .env com suas credenciais

# Rodar migrations
npm run migrate-to-neon

# Executar em desenvolvimento
npm run dev          # Backend (porta 3064)
npm run dev:web      # Frontend (porta 5173)
```

### Instalação com Docker 🐳

```bash
# Inicia PostgreSQL + Redis + UIs
./dev.sh docker

# Acesse:
# - Adminer (PostgreSQL): http://localhost:8080
# - Redis Commander: http://localhost:8081
```

### Acesso Local

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3064
- **Produção:** https://7care-app.vercel.app/

> 📖 **Guia completo:** Veja [DEVELOPMENT.md](./DEVELOPMENT.md) para documentação detalhada

## 📦 Scripts Disponíveis

### Desenvolvimento
```bash
./dev.sh start           # 🚀 Inicia dev servers (backend + frontend)
npm run dev              # Backend (porta 3064)
npm run dev:web          # Frontend (porta 5173)
npm run dev:tauri        # App desktop Tauri
```

### Build e Deploy
```bash
npm run build            # Build frontend
npm run build:tauri      # Build app desktop
npm run build:server     # Build backend
npm run deploy           # Deploy para Netlify
```

### Testes
```bash
./dev.sh test            # 🧪 Todos os testes
npm test                 # Client tests (526 testes)
npm run test:server      # Server tests (150 testes)
npm run test:coverage    # Coverage client (40% threshold)
npm run test:server:coverage  # Coverage server (35% threshold)
npm run test:e2e         # E2E com Playwright
```

### Qualidade de Código
```bash
./dev.sh lint            # 🔍 Lint + format automático
./dev.sh check           # ✅ Lint + Types + Tests
npm run check            # TypeScript type-check
npm run lint             # ESLint
npm run lint:fix         # ESLint --fix
npm run format           # Prettier
```

### Utilitários
```bash
./dev.sh docker          # 🐳 Inicia Docker Compose
./dev.sh clean           # 🧹 Limpa node_modules/dist
./dev.sh setup           # 📦 Setup inicial
```

> 💡 **Dica:** Use `./dev.sh help` para ver todos os comandos disponíveis

## 🌐 Deploy

### Netlify (Recomendado)

```bash
# Build e deploy
npm run build
npx netlify deploy --prod --dir=dist
```

**Deploy Atual:**

- **Produção:** https://7care-app.vercel.app/
- **Site ID:** meu7care

## ✨ Funcionalidades

### 👥 Gestão de Membros

- Cadastro completo de membros
- Sistema de aprovação
- Perfis detalhados
- Histórico de atividades

### 🎯 Sistema de Relacionamentos

- Conectar interessados com missionários
- Acompanhamento de relacionamentos
- Status de progresso
- Notas e observações

### 📅 Gestão de Eventos

- Criação e edição de eventos
- Sistema de convites
- Controle de presença
- Eventos recorrentes
- Importação via Excel e Google Drive

### 🎮 Gamificação

- Sistema de pontos
- Conquistas e badges
- Ranking de membros
- Metas e desafios

### 📊 Dashboard e Relatórios

- Estatísticas em tempo real
- Gráficos interativos
- Relatórios personalizados
- Exportação de dados

### 🗳️ Sistema de Eleições

- Criação de eleições
- Votação online
- Resultados em tempo real
- Dashboard administrativo

### 💬 Comunicação

- Sistema de mensagens
- Notificações push
- Chat em tempo real
- Avisos e comunicados

## 🛠️ Tecnologias

- **Frontend:** React 18 + TypeScript + Vite
- **Backend:** Node.js + Express
- **Banco de Dados:** Neon Database (PostgreSQL)
- **Deploy:** Netlify
- **UI:** Tailwind CSS + Radix UI
- **Gráficos:** Recharts
- **Formulários:** React Hook Form + Zod
- **ORM:** Drizzle ORM
- **State:** TanStack Query (React Query)

## 📁 Estrutura do Projeto

```
7care-producao-sem-offline/
├── client/                 # Frontend React
│   ├── src/
│   │   ├── components/     # Componentes reutilizáveis
│   │   │   ├── ui/        # Componentes UI base (shadcn/ui)
│   │   │   ├── layout/    # Layouts e estrutura
│   │   │   └── dashboard/ # Componentes do dashboard
│   │   ├── pages/         # Páginas da aplicação (lazy loaded)
│   │   ├── hooks/         # Custom hooks React
│   │   ├── lib/           # Utilitários e helpers
│   │   ├── contexts/      # Contextos React
│   │   ├── types/         # Tipos TypeScript
│   │   └── test/          # Setup de testes Vitest
│   └── public/            # Assets estáticos
├── server/                # Backend Express
│   ├── routes/            # Rotas da API organizadas
│   ├── services/          # Lógica de negócios
│   ├── repositories/      # Acesso a dados
│   ├── middleware/        # Middlewares Express
│   ├── schemas/           # Schemas Zod de validação
│   ├── adapters/          # Adaptadores externos
│   ├── __tests__/         # Testes Jest
│   ├── neonAdapter.ts     # Adaptador Neon Database
│   ├── schema.ts          # Schema PostgreSQL (Drizzle)
│   └── index.ts           # Servidor principal
├── shared/                # Código compartilhado client/server
│   ├── schema.ts          # Tipos compartilhados
│   └── validators.ts      # Validadores compartilhados
├── e2e/                   # Testes E2E Playwright
├── tests/                 # Fixtures e mocks de teste
├── docs/                  # Documentação adicional
├── scripts/               # Scripts utilitários
├── dist/                  # Build de produção
├── netlify.toml           # Configuração Netlify
├── vitest.config.ts       # Configuração Vitest
├── playwright.config.ts   # Configuração Playwright
└── package.json           # Dependências
```

## 🔐 Variáveis de Ambiente

```env
# Banco de Dados
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require

# Ambiente
NODE_ENV=production

# JWT (opcional)
JWT_SECRET=sua_chave_secreta

# Notificações Push (opcional)
VAPID_PRIVATE_KEY=sua_chave_vapid
```

## ⚡ Características Técnicas

Esta versão é **otimizada** para:

- ✅ Performance máxima com lazy loading de rotas
- ✅ Código limpo e manutenível
- ✅ Build rápido (~7s)
- ✅ Escalabilidade
- ✅ Simplicidade de uso
- ✅ 1.273 testes automatizados

## 🧪 Testes

O projeto possui uma suíte completa de testes:

| Tipo               | Framework  | Quantidade |
| ------------------ | ---------- | ---------- |
| Unitários (Server) | Jest       | 636        |
| Unitários (Client) | Vitest     | 87         |
| E2E                | Playwright | 550        |
| **Total**          | -          | **1.273**  |

```bash
# Executar todos os testes
npm run test:all

# Testes com cobertura
npm run test:coverage
npm run test:client:coverage

# Testes E2E com interface
npm run test:e2e:ui
```

## 🎯 Service Worker

Service Worker otimizado que:

- ✅ Cache inteligente de assets estáticos
- ✅ Suporte a notificações push
- ✅ Navegação fluida
- ✅ Performance aprimorada

## 📝 Histórico de Versões

### Versão 1.2.0 (Janeiro/2026)

- ✅ Security headers (CSP, HSTS, X-Frame-Options)
- ✅ Rate limiting por IP/usuário/endpoint
- ✅ Sistema completo de auditoria
- ✅ Health checks para Kubernetes (/health, /ready, /live)
- ✅ Monitoring service com métricas
- ✅ Componentes de acessibilidade (SkipLink, FocusGuard)
- ✅ Testes automatizados de acessibilidade WCAG
- ✅ Rotas de eleição modularizadas
- ✅ Logger estruturado e seguro
- ✅ Documentação Swagger completa

### Versão 1.1.0 (Janeiro/2026)

- ✅ Migração de testes client para Vitest
- ✅ Adição de 550 testes E2E com Playwright
- ✅ Pipeline CI/CD completa com GitHub Actions
- ✅ Melhorias de documentação
- ✅ Limpeza de código e variáveis não usadas

### Versão 1.0.0 (Novembro/2025)

- ✅ Build otimizado
- ✅ Código limpo e organizado
- ✅ Performance aprimorada
- ✅ Service Worker inteligente
- ✅ Deploy ativo em produção

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   React 18  │  │  TanStack   │  │  Radix UI + Tailwind│  │
│  │  + Router   │  │   Query     │  │     Components      │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                        BACKEND                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Express.js │  │ Rate Limit  │  │  Security Headers   │  │
│  │   + Vite    │  │   + Auth    │  │  + CORS + Helmet    │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Drizzle    │  │  Audit      │  │    Monitoring       │  │
│  │    ORM      │  │  Service    │  │     Service         │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                       DATABASE                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Neon PostgreSQL (Serverless)            │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Estrutura de Pastas

```
├── client/                 # Frontend React
│   ├── src/
│   │   ├── components/     # Componentes reutilizáveis
│   │   ├── contexts/       # Contextos React
│   │   ├── hooks/          # Hooks customizados
│   │   ├── lib/            # Utilitários
│   │   ├── pages/          # Páginas da aplicação
│   │   └── types/          # Tipos TypeScript
│   └── public/             # Assets estáticos
├── server/                 # Backend Express
│   ├── middleware/         # Middlewares (auth, rate limit, etc)
│   ├── routes/             # Rotas da API
│   ├── services/           # Serviços de negócio
│   ├── repositories/       # Acesso a dados
│   ├── utils/              # Utilitários
│   └── migrations/         # Migrações de banco
├── e2e/                    # Testes E2E (Playwright)
├── tests/                  # Configuração de testes
└── docs/                   # Documentação adicional
```

## 🔧 Troubleshooting

### Problemas Comuns

#### 1. Erro de conexão com banco de dados

```bash
# Verificar se DATABASE_URL está configurado
echo $DATABASE_URL

# Testar conexão
npm run checkDatabase
```

#### 2. Build falha com erro de memória

```bash
# Aumentar memória do Node
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build
```

#### 3. Testes falhando

```bash
# Limpar cache e reinstalar
rm -rf node_modules
npm install
npm test
```

#### 4. Portas em uso

```bash
# Verificar processos na porta 3065
lsof -i :3065
# Matar processo
kill -9 <PID>
```

#### 5. Problemas com ESLint

```bash
# Corrigir automaticamente
npm run lint:fix
```

## 🚀 Como Contribuir

1. Clone este repositório
2. Crie uma branch para sua feature (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'feat: Adiciona MinhaFeature'`)
4. Push para a branch (`git push origin feature/MinhaFeature`)
5. Abra um Pull Request

## 📞 Suporte

Para questões ou suporte:

- **Email:** filipe.peixoto@educadventista.org.br
- **Site em Produção:** https://7care-app.vercel.app/

## 📄 Licença

MIT License - veja o arquivo LICENSE para detalhes.

---

## 🎉 Status do Projeto

| Componente     | Status                   | Nota  |
| -------------- | ------------------------ | ----- |
| Build          | ✅ Funcionando           | 10/10 |
| Deploy         | ✅ Ativo no Netlify      | 10/10 |
| Banco de Dados | ✅ Neon PostgreSQL       | 10/10 |
| Testes         | ✅ 820 passando          | 10/10 |
| CI/CD          | ✅ GitHub Actions        | 10/10 |
| TypeScript     | ✅ 0 erros               | 10/10 |
| ESLint         | ✅ 0 erros               | 10/10 |
| Segurança      | ✅ CSP, HSTS, Rate Limit | 10/10 |
| Acessibilidade | ✅ WCAG 2.1 AA           | 10/10 |
| Documentação   | ✅ Swagger + JSDoc       | 10/10 |
| Performance    | ✅ Code Splitting + PWA  | 10/10 |

### Métricas de Qualidade

```
📊 QUALIDADE DO CÓDIGO
═══════════════════════════════════════
TypeScript Errors    : 0
ESLint Errors        : 0
Tests Passing        : 820/820 (100%)
Build Time           : ~16s
Bundle Size (gzip)   : ~256KB (main chunk)
═══════════════════════════════════════
```

**Church Plus Manager** - Gestão completa para igrejas com tecnologia moderna! 🏛️✨

**Última atualização:** Janeiro/2026  
**Versão:** 1.2.0 (Produção)
