# 🏛️ 7Care - Church Plus Manager

> **Sistema completo de gestão para igrejas** - Plataforma moderna e escalável  
> **Produção:** https://meu7care.netlify.app/

[![Build Status](https://github.com/pxttorrent/7care-producao-sem-offline/actions/workflows/ci.yml/badge.svg)](https://github.com/pxttorrent/7care-producao-sem-offline/actions)
[![Tests](https://img.shields.io/badge/tests-395%20passing-brightgreen)](https://github.com/pxttorrent/7care-producao-sem-offline)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

## 📋 Índice

- [Sobre](#-sobre)
- [Funcionalidades](#-funcionalidades)
- [Tech Stack](#-tech-stack)
- [Instalação](#-instalação)
- [Configuração](#-configuração)
- [Scripts](#-scripts)
- [Arquitetura](#-arquitetura)
- [API](#-api)
- [Testes](#-testes)
- [Contribuição](#-contribuição)
- [Deploy](#-deploy)

## ⚡ Sobre

7Care é um sistema completo de gestão para igrejas, oferecendo ferramentas para:

- ✅ **Gestão de Membros** - Cadastro completo com foto, dados e histórico
- ✅ **Sistema de Gamificação** - Pontos, níveis e rankings para engajamento
- ✅ **Calendário de Eventos** - Reuniões, cultos e atividades
- ✅ **Chat Integrado** - Comunicação entre membros e líderes
- ✅ **Notificações Push** - Alertas em tempo real
- ✅ **Relatórios** - Dashboards e métricas de acompanhamento
- ✅ **Multi-igreja** - Suporte a distritos e múltiplas congregações
- ✅ **PWA** - Funciona como app mobile

## 🚀 Funcionalidades

### Para Membros
- Perfil pessoal com pontuação e conquistas
- Acompanhamento de participação
- Chat com líderes
- Calendário de eventos
- Pedidos de oração

### Para Líderes
- Dashboard com métricas
- Gestão de membros
- Envio de notificações
- Relatórios de engajamento
- Importação/exportação de dados

### Para Administradores
- Configuração de pontos
- Gestão de igrejas e distritos
- Logs de auditoria
- Sistema de permissões

## 🛠 Tech Stack

### Frontend
- **React 18** - UI Library
- **TypeScript** - Type Safety
- **Vite** - Build Tool
- **TailwindCSS** - Styling
- **Shadcn/ui** - Component Library
- **TanStack Query** - Data Fetching

### Backend
- **Node.js** - Runtime
- **Express** - Web Framework
- **Drizzle ORM** - Database ORM
- **Zod** - Validation

### Database & Infra
- **Neon Database** - PostgreSQL Serverless
- **Redis** - Cache (opcional)
- **Netlify** - Hosting & Functions

### DevOps
- **GitHub Actions** - CI/CD
- **ESLint + Prettier** - Code Quality
- **Husky** - Git Hooks
- **Jest** - Unit Tests
- **Sentry** - Error Monitoring

## 📦 Instalação

### Pré-requisitos
- Node.js 18+ 
- npm ou yarn
- Conta no [Neon Database](https://neon.tech) (gratuita)

### Passos

```bash
# 1. Clonar repositório
git clone https://github.com/pxttorrent/7care-producao-sem-offline.git
cd 7care-producao-sem-offline

# 2. Instalar dependências
npm install

# 3. Copiar arquivo de ambiente
cp .env.example .env

# 4. Configurar variáveis (ver seção Configuração)

# 5. Executar em desenvolvimento
npm run dev
```

### Acesso Local
- **URL:** http://localhost:3065
- **Login Admin:** admin@7care.com
- **Senha:** meu7care

## ⚙️ Configuração

Crie um arquivo `.env` na raiz do projeto:

```env
# Database (obrigatório)
DATABASE_URL=postgresql://user:password@host/database?sslmode=require

# Ambiente
NODE_ENV=development

# JWT (use valores seguros em produção)
JWT_SECRET=sua-chave-secreta-muito-longa-aqui
JWT_REFRESH_SECRET=outra-chave-secreta-para-refresh

# Sentry (opcional - monitoramento)
SENTRY_DSN=https://xxx@sentry.io/xxx

# Redis (opcional - cache)
REDIS_URL=redis://localhost:6379

# Push Notifications (opcional)
VAPID_PUBLIC_KEY=sua-chave-publica
VAPID_PRIVATE_KEY=sua-chave-privada
```

## 📜 Scripts

```bash
# Desenvolvimento
npm run dev          # Servidor com hot reload

# Build
npm run build        # Build de produção
npm run build:full   # Build completo (client + server)

# Testes
npm test             # Rodar testes unitários
npm run test:watch   # Testes em modo watch
npm run test:coverage # Cobertura de testes
npm run test:e2e     # Testes E2E (Playwright)

# Code Quality
npm run lint         # Verificar ESLint
npm run lint:fix     # Corrigir ESLint
npm run format       # Formatar com Prettier
npm run format:check # Verificar formatação

# Deploy
npm run deploy       # Deploy para Netlify (produção)
npm run deploy:preview # Deploy preview

# Migrations
npm run migrate-to-neon     # Migrar dados para Neon
npm run migrate-roles       # Migrar sistema de roles
```

## 🏗 Arquitetura

```
7care/
├── client/                 # Frontend React
│   ├── src/
│   │   ├── components/    # Componentes UI
│   │   ├── hooks/         # Custom hooks
│   │   ├── lib/           # Utilitários
│   │   ├── pages/         # Páginas/rotas
│   │   └── types/         # TypeScript types
│   └── public/            # Assets estáticos
├── server/                 # Backend Express
│   ├── middleware/        # Middlewares
│   ├── repositories/      # Data access layer
│   ├── routes/            # API routes
│   ├── schemas/           # Zod schemas
│   ├── services/          # Business logic
│   ├── types/             # TypeScript types
│   └── utils/             # Utilitários
├── shared/                 # Código compartilhado
│   ├── schema.ts          # Database schema
│   └── validators.ts      # Validações compartilhadas
├── .github/workflows/      # CI/CD
└── tests/                  # Testes
```

### Padrões de Código

- **Repository Pattern** - Abstração de acesso a dados
- **Service Layer** - Lógica de negócio separada
- **Middleware Chain** - Segurança e validação em camadas
- **Type Safety** - TypeScript em todo o projeto

## 📡 API

### Autenticação

```
POST /api/auth/login      # Login
POST /api/auth/refresh    # Refresh token
POST /api/auth/logout     # Logout
GET  /api/auth/me         # Usuário atual
POST /api/auth/change-password # Alterar senha
```

### Usuários

```
GET    /api/users         # Listar usuários
GET    /api/users/:id     # Buscar por ID
POST   /api/users         # Criar usuário
PUT    /api/users/:id     # Atualizar
DELETE /api/users/:id     # Deletar
```

### Igrejas

```
GET    /api/churches      # Listar igrejas
GET    /api/churches/:id  # Buscar por ID
POST   /api/churches      # Criar
PUT    /api/churches/:id  # Atualizar
DELETE /api/churches/:id  # Deletar
```

### Eventos

```
GET    /api/events        # Listar eventos
POST   /api/events        # Criar evento
PUT    /api/events/:id    # Atualizar
DELETE /api/events/:id    # Deletar
```

### Documentação completa disponível em `/api-docs` (Swagger)

## 🧪 Testes

### Executar Testes

```bash
# Todos os testes
npm test

# Com cobertura
npm run test:coverage

# Modo watch
npm run test:watch

# Testes E2E
npm run test:e2e
```

### Estrutura de Testes

```
tests/
├── fixtures/         # Dados de teste
├── mocks/           # Mocks
└── setup.ts         # Configuração

server/__tests__/
├── integration/     # Testes de integração
├── middleware.test.ts
├── permissions.test.ts
└── utils.test.ts
```

### Cobertura

- **395 testes** passando
- Cobertura de código > 80%
- Testes unitários e de integração

## 🤝 Contribuição

### Como Contribuir

1. Fork o repositório
2. Crie uma branch (`git checkout -b feature/MinhaFeature`)
3. Faça commit (`git commit -m 'feat: Adiciona MinhaFeature'`)
4. Push (`git push origin feature/MinhaFeature`)
5. Abra um Pull Request

### Convenções de Commit

Usamos [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` Nova funcionalidade
- `fix:` Correção de bug
- `docs:` Documentação
- `style:` Formatação
- `refactor:` Refatoração
- `test:` Testes
- `chore:` Manutenção

### Code Style

- ESLint + Prettier configurados
- Husky para pre-commit hooks
- TypeScript strict mode

```bash
# Antes de commitar
npm run lint:fix
npm run format
npm test
```

## 🚀 Deploy

### Netlify (Produção)

```bash
# Deploy de produção
npm run deploy

# Deploy preview
npm run deploy:preview
```

### Variáveis de Ambiente (Netlify)

Configure no painel do Netlify:

- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `NODE_ENV=production`

### Docker (Opcional)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3065
CMD ["npm", "start"]
```

## 📊 Monitoramento

### Sentry

Erros são automaticamente reportados para o Sentry em produção.

Configure `SENTRY_DSN` nas variáveis de ambiente.

### Logs de Auditoria

Todas as ações sensíveis são registradas:

- Login/logout
- Alterações de dados
- Exportações
- Mudanças de permissão

## 📄 Licença

MIT License - veja [LICENSE](LICENSE) para detalhes.

## 👥 Equipe

Desenvolvido com ❤️ para a comunidade cristã.

---

**7Care** - Gestão inteligente para igrejas modernas.
