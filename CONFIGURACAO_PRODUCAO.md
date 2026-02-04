# 🚀 Configuração de Produção - Google Calendar

## ✅ Checklist Completo

### Já Feito:

- ✅ Google Cloud Console configurado
- ✅ OAuth Client ID criado
- ✅ Redirect URI de produção adicionado
- ✅ Credenciais locais configuradas
- ✅ Migration rodada localmente
- ✅ Scripts de deploy criados

### Falta Fazer:

## 📋 Passo a Passo para Produção

### 1️⃣ Configurar Variáveis no Netlify

**Opção A - Usando CLI (Automático):**

```bash
npm run deploy-google-calendar
```

Esse comando vai:

- Pedir a URL de produção
- Adicionar as 3 variáveis ao Netlify
- Opcionalmente fazer deploy

**Opção B - Manual (via Dashboard Netlify):**

1. Acesse: https://app.netlify.com
2. Selecione seu site (meu7care)
3. Site settings → Build & deploy → Environment
4. Clique "Add a variable" e adicione:

```bash
GOOGLE_CALENDAR_CLIENT_ID
61388812338-se0a70hkratv97es0geudr9p8km45kdg.apps.googleusercontent.com

GOOGLE_CALENDAR_CLIENT_SECRET
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

GOOGLE_CALENDAR_REDIRECT_URI
https://meu7care.netlify.app/api/calendar/google/oauth-callback
```

_(Substitua `meu7care.netlify.app` pela sua URL real)_

---

### 2️⃣ Fazer Deploy

```bash
npm run deploy
```

Ou faça commit e push (se tiver CI/CD configurado):

```bash
git add .
git commit -m "feat: adicionar integração Google Calendar"
git push
```

---

### 3️⃣ Rodar Migration em Produção

**Opção A - Via DATABASE_URL:**

```bash
# Copie a DATABASE_URL de produção do Netlify
# Execute:
DATABASE_URL=<sua-url-producao> npm run migrate-google-calendar:prod
```

**Opção B - Via Netlify CLI:**

```bash
netlify env:get DATABASE_URL --context production
# Copie a URL e use na opção A
```

---

### 4️⃣ Testar em Produção

1. Acesse: `https://meu7care.netlify.app/settings`
2. Vá para aba "Calendar"
3. Clique em "Google Calendar"
4. Clique em "Conectar"
5. Autorize com sua conta Google
6. Sincronize eventos!

---

## 🔒 Importante - Publicar App OAuth

Para que TODOS os pastores possam usar (não só você):

1. Acesse: https://console.cloud.google.com
2. OAuth consent screen
3. Clique em **"PUBLISH APP"**
4. Confirme
5. Status vai mudar para "In production"

**Enquanto não publicar:**

- Só você (e test users adicionados) conseguem conectar
- Outros pastores vão ver erro "Access blocked"

**Depois de publicar:**

- Qualquer pastor pode conectar sua conta
- Sem necessidade de adicionar manualmente

---

## 🆘 Troubleshooting

### "Redirect URI mismatch"

- Verifique se a URI no Google Cloud é EXATAMENTE:
  `https://seu-dominio.com/api/calendar/google/oauth-callback`
- Sem barra no final!

### "Access blocked: This app's request is invalid"

- Publique o app (veja seção acima)
- Ou adicione o usuário em "Test users"

### "Error: ENCRYPTION_KEY not set"

- Adicione ENCRYPTION_KEY no Netlify também
- Copie do .env local ou gere nova

---

## 📞 Suporte

Se precisar de ajuda, entre em contato!
