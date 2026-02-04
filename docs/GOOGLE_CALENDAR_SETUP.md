# 🗓️ Guia de Configuração do Google Calendar

## Para o Administrador do Sistema

### Passo 1: Criar Projeto no Google Cloud Console

1. **Acesse:** https://console.cloud.google.com
2. **Faça login** com sua conta Google
3. **Clique em "Select a project"** (no topo)
4. **Clique em "NEW PROJECT"**
5. **Nome do projeto:** `7Care Calendar` (ou qualquer nome)
6. **Clique em "CREATE"**
7. **Aguarde** a criação do projeto (alguns segundos)

### Passo 2: Ativar Google Calendar API

1. **No menu lateral**, clique em **"APIs & Services" → "Library"**
2. **Pesquise:** `Google Calendar API`
3. **Clique** no resultado "Google Calendar API"
4. **Clique em "ENABLE"**
5. **Aguarde** a ativação (alguns segundos)

### Passo 3: Criar Credenciais OAuth 2.0

1. **No menu lateral**, clique em **"APIs & Services" → "Credentials"**
2. **Clique em "CREATE CREDENTIALS"** (botão azul no topo)
3. **Selecione:** "OAuth client ID"
4. **Se aparecer aviso sobre OAuth consent screen:**
   - Clique em "CONFIGURE CONSENT SCREEN"
   - Selecione **"External"** (ou "Internal" se tiver Google Workspace)
   - Clique "CREATE"
   - Preencha:
     - **App name:** `7Care`
     - **User support email:** seu email
     - **Developer contact:** seu email
   - Clique "SAVE AND CONTINUE"
   - Em "Scopes", clique "ADD OR REMOVE SCOPES"
   - Pesquise e adicione: `Google Calendar API` → `../auth/calendar.readonly`
   - Clique "UPDATE" e depois "SAVE AND CONTINUE"
   - Em "Test users", adicione seu email (para testar)
   - Clique "SAVE AND CONTINUE"
   - Clique "BACK TO DASHBOARD"

5. **Volte para "Credentials"** e clique novamente em "CREATE CREDENTIALS" → "OAuth client ID"
6. **Application type:** Selecione "Web application"
7. **Name:** `7Care Web Client`
8. **Authorized redirect URIs:**
   - Clique em "ADD URI"
   - Cole: `http://localhost:5000/api/calendar/google/oauth-callback`
   - Se for produção, adicione também: `https://seu-dominio.com/api/calendar/google/oauth-callback`
9. **Clique em "CREATE"**

### Passo 4: Copiar Credenciais

Uma janela vai aparecer com:

- **Client ID** (algo como: `xxx.apps.googleusercontent.com`)
- **Client Secret** (algo como: `GOCSPX-xxx`)

**⚠️ IMPORTANTE:** Copie e guarde essas informações agora! Você vai precisar delas no próximo passo.

---

## Para os Pastores (Depois da Configuração)

### Como Conectar Sua Conta Google

1. **Acesse** Settings → Calendar
2. **Clique** em "Configurar Google Calendar"
3. **Clique** no botão "Conectar"
4. **Popup do Google** vai abrir
5. **Escolha** sua conta Google
6. **Clique** em "Permitir" para autorizar
7. **Pronto!** Sua conta está conectada

### Como Sincronizar Eventos

1. **Selecione** qual calendário quer sincronizar (dropdown)
2. **Clique** em "Sincronizar Agora"
3. **Aguarde** alguns segundos
4. **Veja** seus eventos aparecerem no calendário do 7Care!

### Configurações Opcionais

- **Sincronização Automática:** Ative para sincronizar periodicamente
- **Intervalo:** Defina a cada quantos minutos sincronizar (recomendado: 60 min)

---

## Troubleshooting

### "Popup bloqueado"

- Permita popups no seu navegador para este site
- Tente novamente

### "Erro de autorização"

- Verifique se seu email está na lista de "Test users" (durante fase de desenvolvimento)
- Ou publique o app OAuth (veja próxima seção)

### "Nenhum calendário encontrado"

- Verifique se você tem calendários na sua conta Google
- Tente desconectar e conectar novamente

---

## Publicar App OAuth (Produção)

Para que TODOS os pastores possam usar (não só test users):

1. **Acesse** Google Cloud Console → OAuth consent screen
2. **Clique** em "PUBLISH APP"
3. **Confirme** a publicação
4. **Status** vai mudar para "In production"

Agora qualquer pessoa pode conectar sua conta!

---

## Suporte

Se tiver dúvidas, entre em contato com o administrador do sistema.
