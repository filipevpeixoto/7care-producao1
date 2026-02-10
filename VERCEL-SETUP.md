# Migração para Vercel

## Arquivos criados
- ✅ `vercel.json` - Configuração do Vercel
- ✅ `api/index.js` - Wrapper da função principal
- ✅ `api/chatlist.js` - Wrapper do chatlist

## Passos para deploy

### 1. Instalar Vercel CLI (opcional)
```bash
npm i -g vercel
```

### 2. Fazer login no Vercel
- Acesse: https://vercel.com
- Login com GitHub

### 3. Importar repositório
- Dashboard Vercel → "Add New" → "Project"
- Selecione: `filipevpeixoto/7care-producao1`
- Framework Preset: **Vite**
- Root Directory: `.` (raiz)

### 4. Configurar variáveis de ambiente
No Vercel Dashboard → Settings → Environment Variables, adicione TODAS as que estão no Netlify.

**Como copiar do Netlify:**
1. Netlify Dashboard → Site Settings → Environment Variables
2. Copie TODAS as variáveis (exceto as que começam com NETLIFY_)

**Mínimo obrigatório:**
```
DATABASE_URL=postgresql://...
JWT_SECRET=...
```

**Opcionais (copie se existirem no Netlify):**
```
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
GOOGLE_SCRIPT_URL=...
SETUP_TOKEN=...
DEFAULT_ADMIN_PASSWORD=...
APP_URL=https://seu-projeto.vercel.app
BREVO_API_KEY=...
BREVO_SENDER_EMAIL=...
ALLOWED_ORIGINS=...
```

💡 **Dica:** Use o formato `key=value` e cole diretamente no Vercel (suporta bulk add)

### 5. Build Settings
- Build Command: `npm install --legacy-peer-deps && npm run build`
- Output Directory: `dist`
- Install Command: `npm install --legacy-peer-deps`

### 6. Deploy
- Clique em "Deploy"
- Aguarde 2-3 minutos

### 7. Após deploy
- URL: `https://seu-projeto.vercel.app`
- Configurar domínio custom (se tiver)
- Atualizar variáveis que usam URLs do Netlify

## Diferenças Netlify vs Vercel

| Item | Netlify | Vercel |
|------|---------|--------|
| Serverless invocations | 125K/mês | Ilimitado |
| Bandwidth | 100GB/mês | 100GB/mês |
| Build minutes | 300min/mês | 6000min/mês |
| Edge Functions | Limitado | Melhor |
| PostgreSQL | Externo (Neon) | Externo (Neon) |

## Troubleshooting

### Erro: Module not found
- Verifique que `api/` tem os arquivos `.js`
- Rode localmente: `vercel dev`

### Erro: Function timeout
- Aumente `maxDuration` no vercel.json
- Limite gratuito: 10s

### Erro: Cannot find module netlify
- Normal — as funções não precisam do pacote netlify-lambda

## Rollback
Se algo der errado, pode continuar no Netlify:
- Não delete o site no Netlify
- Basta pausar os deploys no Vercel
