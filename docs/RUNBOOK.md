# Runbook Operacional - 7Care

**Versão:** 1.0  
**Atualizado em:** 28 de janeiro de 2026

---

## 📋 Índice

1. [Informações Gerais](#informações-gerais)
2. [Ambientes](#ambientes)
3. [Deploy](#deploy)
4. [Monitoramento](#monitoramento)
5. [Troubleshooting](#troubleshooting)
6. [Procedimentos de Emergência](#procedimentos-de-emergência)
7. [Backup e Recovery](#backup-e-recovery)
8. [Contatos](#contatos)

---

## 1. Informações Gerais

### Stack Tecnológico

- **Frontend:** React 18 + TypeScript + Vite
- **Backend:** Express 4.21 + TypeScript
- **Banco de Dados:** PostgreSQL (Neon)
- **ORM:** Drizzle
- **Hospedagem:** Netlify (Functions + CDN)
- **CI/CD:** GitHub Actions

### Repositórios

- **Produção:** `main` branch
- **Staging:** `develop` branch

---

## 2. Ambientes

### Produção

- **URL:** https://7care.netlify.app
- **API:** https://7care.netlify.app/.netlify/functions/api
- **Database:** Neon PostgreSQL (produção)

### Staging

- **URL:** Deploy preview em PRs
- **API:** Mesma estrutura, banco de staging

### Local

```bash
# Iniciar desenvolvimento
npm run dev

# Rodar testes
npm test           # Jest (server)
npm run test:client  # Vitest (client)
npm run test:e2e   # Playwright
```

---

## 3. Deploy

### Deploy Automático

- Push para `main` → Deploy automático para produção
- Push para `develop` → Build e testes
- PR → Deploy preview automático

### Deploy Manual (se necessário)

```bash
# Build
npm run build

# Deploy via Netlify CLI
netlify deploy --prod
```

### Rollback

```bash
# Via Netlify Dashboard
# 1. Acesse Deploys
# 2. Selecione deploy anterior
# 3. Clique em "Publish deploy"

# Via CLI
netlify rollback
```

---

## 4. Monitoramento

### Logs

```bash
# Logs do Netlify Functions
netlify logs:function api

# Logs em tempo real
netlify logs:function api --level debug
```

### Métricas

- **Netlify Analytics:** Dashboard de tráfego
- **Sentry:** Erros de aplicação (se configurado)
- **Codecov:** Cobertura de testes

### Health Check

```bash
# Verificar API
curl https://7care.netlify.app/.netlify/functions/api/health

# Resposta esperada
{ "status": "ok", "timestamp": "..." }
```

---

## 5. Troubleshooting

### Problema: API retorna 500

**Causa provável:** Erro de conexão com banco
**Solução:**

1. Verificar logs: `netlify logs:function api`
2. Verificar status do Neon: https://console.neon.tech
3. Verificar variáveis de ambiente no Netlify

### Problema: Build falha

**Causa provável:** Erro de TypeScript ou dependência
**Solução:**

1. Verificar logs do CI
2. Rodar localmente: `npm run build`
3. Verificar `npm run check`

### Problema: Testes E2E falham

**Causa provável:** Timeout ou elemento não encontrado
**Solução:**

1. Verificar se app está rodando
2. Aumentar timeouts se necessário
3. Verificar seletores no Playwright

### Problema: Autenticação não funciona

**Causa provável:** JWT_SECRET inválido
**Solução:**

1. Verificar variável `JWT_SECRET` no Netlify
2. Verificar se token não expirou
3. Limpar cookies e localStorage

### Problema: Upload de fotos falha

**Causa provável:** Limite de tamanho ou tipo inválido
**Solução:**

1. Verificar tamanho (max 5MB)
2. Verificar tipo (jpg, png, gif, webp)
3. Verificar permissões do diretório uploads

---

## 6. Procedimentos de Emergência

### Incidente de Segurança

1. **Isolar:** Desabilitar deploy automático
2. **Investigar:** Verificar logs e acessos
3. **Mitigar:** Revogar tokens comprometidos
4. **Comunicar:** Notificar stakeholders
5. **Remediar:** Aplicar correção
6. **Documentar:** Criar post-mortem

### Banco de Dados Indisponível

1. Verificar status do Neon
2. Verificar limites de conexão
3. Contatar suporte Neon se necessário
4. Ativar página de manutenção

### Site Fora do Ar

1. Verificar status do Netlify: https://www.netlifystatus.com
2. Verificar último deploy
3. Executar rollback se necessário
4. Verificar DNS se problema persistir

---

## 7. Backup e Recovery

### Banco de Dados

- **Backup automático:** Neon faz snapshots diários
- **Retenção:** 7 dias (plano atual)
- **Recovery:** Via console Neon

### Código

- **Git:** Histórico completo
- **Releases:** Tags de versão

### Procedimento de Recovery

```bash
# 1. Identificar ponto de recovery
git log --oneline

# 2. Criar branch de recovery
git checkout -b recovery/incident-YYYY-MM-DD <commit>

# 3. Testar
npm run build && npm test

# 4. Merge para main se aprovado
git checkout main
git merge recovery/incident-YYYY-MM-DD
```

---

## 8. Contatos

### Equipe Técnica

- **Lead Developer:** [Nome] - [email]
- **DevOps:** [Nome] - [email]

### Suporte Externo

- **Neon:** https://neon.tech/docs/introduction/support
- **Netlify:** https://www.netlify.com/support/

### Escalação

1. **P1 (Crítico):** Site fora do ar → Contato imediato
2. **P2 (Alto):** Funcionalidade crítica indisponível → 1h
3. **P3 (Médio):** Bug impactante → 4h
4. **P4 (Baixo):** Bug menor → Próximo sprint

---

_Última atualização: 28/01/2026_
