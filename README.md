# 🏛️ 7care - Church Plus Manager

> **Versão de produção oficial** - Sistema completo de gestão para igrejas  
> **Repositório:** https://github.com/pxttorrent/7care-producao-sem-offline

## ⚡ Sobre Este Sistema

Sistema completo de gerenciamento para igrejas com funcionalidades avançadas.

- ✅ **Leve e Otimizado** - Performance excelente
- ✅ **Produção Ativa** - https://meu7care.netlify.app/
- ✅ **Service Worker Inteligente** - Cache otimizado de assets
- ✅ **Build Rápido** - ~7 segundos

## 🚀 Início Rápido

### Pré-requisitos
- Node.js 18+
- npm ou yarn
- Conta no Neon Database (gratuita)

### Instalação

```bash
# Clonar repositório
git clone https://github.com/pxttorrent/7care-producao-sem-offline.git
cd 7care-producao-sem-offline

# Instalar dependências
npm install

# Configurar variáveis de ambiente
# Crie um arquivo .env com:
# DATABASE_URL=sua_string_de_conexao_neon
# NODE_ENV=development

# Executar em desenvolvimento
npm run dev
```

### Acesso Local
- **URL:** http://localhost:3065
- **Login Admin:** Configure nas variáveis de ambiente
- **Credenciais:** Consulte a documentação interna ou o administrador do sistema

## 📦 Scripts Disponíveis

```bash
npm run dev          # Servidor de desenvolvimento
npm run build        # Build de produção
npm run start        # Servidor de produção
npm run check        # Verificar tipos TypeScript
```

## 🌐 Deploy

### Netlify (Recomendado)

```bash
# Build e deploy
npm run build
npx netlify deploy --prod --dir=dist
```

**Deploy Atual:**
- **Produção:** https://meu7care.netlify.app/
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
│   │   ├── pages/         # Páginas da aplicação
│   │   ├── hooks/         # Custom hooks
│   │   ├── lib/           # Utilitários e helpers
│   │   └── types/         # Tipos TypeScript
│   └── public/            # Assets estáticos
├── server/                # Backend Express
│   ├── routes.ts          # Rotas da API
│   ├── neonAdapter.ts     # Adaptador Neon Database
│   ├── schema.ts          # Schema PostgreSQL
│   └── index.ts           # Servidor principal
├── shared/                # Código compartilhado
├── dist/                  # Build de produção
├── netlify.toml           # Configuração Netlify
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
- ✅ Performance máxima
- ✅ Código limpo e manutenível
- ✅ Build rápido
- ✅ Escalabilidade
- ✅ Simplicidade de uso

## 🎯 Service Worker

Service Worker otimizado que:
- ✅ Cache inteligente de assets estáticos
- ✅ Suporte a notificações push
- ✅ Navegação fluida
- ✅ Performance aprimorada

## 📝 Histórico de Versões

### Versão Atual (09/11/2025)
- ✅ Build otimizado
- ✅ Código limpo e organizado
- ✅ Performance aprimorada
- ✅ Service Worker inteligente
- ✅ Deploy ativo em produção

## 🚀 Como Contribuir

1. Clone este repositório
2. Crie uma branch para sua feature (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'feat: Adiciona MinhaFeature'`)
4. Push para a branch (`git push origin feature/MinhaFeature`)
5. Abra um Pull Request

## 📞 Suporte

Para questões ou suporte:
- **Email:** filipe.peixoto@educadventista.org.br
- **Site em Produção:** https://meu7care.netlify.app/

## 📄 Licença

MIT License - veja o arquivo LICENSE para detalhes.

---

## 🎉 Status do Projeto

- ✅ **Build:** Funcionando
- ✅ **Deploy:** Ativo no Netlify
- ✅ **Banco de Dados:** Neon PostgreSQL
- ✅ **Testes:** Funcionando em produção
- ✅ **Performance:** Otimizada

**Church Plus Manager** - Gestão completa para igrejas com tecnologia moderna! 🏛️✨

**Última atualização:** 09/11/2025  
**Versão:** 1.0.0 (Produção)
