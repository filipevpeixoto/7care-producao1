#!/bin/bash

# Script de Setup do Google Calendar - 7Care
# Este script ajuda a configurar as variáveis de ambiente

echo "🗓️  Setup do Google Calendar - 7Care"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📋 Este script vai te ajudar a configurar o Google Calendar${NC}"
echo ""

# Verificar se já existe .env
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  Arquivo .env não encontrado. Criando...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✅ Arquivo .env criado${NC}"
fi

echo ""
echo -e "${YELLOW}📝 Você precisa ter as credenciais do Google Cloud Console${NC}"
echo ""
echo "Se você ainda não tem, siga estes passos:"
echo ""
echo "1. Acesse: https://console.cloud.google.com"
echo "2. Crie um novo projeto (nome: 7Care Calendar)"
echo "3. Ative a Google Calendar API"
echo "4. Crie credenciais OAuth 2.0 (Web Application)"
echo "5. Configure redirect URI: http://localhost:5000/api/calendar/google/oauth-callback"
echo ""
echo -e "${BLUE}📖 Guia completo: docs/GOOGLE_CALENDAR_SETUP.md${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Perguntar se já tem as credenciais
read -p "Você já tem o Client ID e Client Secret? (s/n): " tem_credenciais

if [ "$tem_credenciais" != "s" ] && [ "$tem_credenciais" != "S" ]; then
    echo ""
    echo -e "${YELLOW}📖 Siga o guia em: docs/GOOGLE_CALENDAR_SETUP.md${NC}"
    echo -e "${YELLOW}📖 Quando tiver as credenciais, execute este script novamente${NC}"
    echo ""
    exit 0
fi

echo ""
echo -e "${GREEN}✅ Ótimo! Vamos configurar agora${NC}"
echo ""

# Coletar Client ID
echo -e "${BLUE}🔑 Cole seu Client ID:${NC}"
echo "   (algo como: xxx.apps.googleusercontent.com)"
read -p "   > " client_id

if [ -z "$client_id" ]; then
    echo -e "${RED}❌ Client ID não pode ser vazio${NC}"
    exit 1
fi

# Coletar Client Secret
echo ""
echo -e "${BLUE}🔐 Cole seu Client Secret:${NC}"
echo "   (algo como: GOCSPX-xxx)"
read -p "   > " client_secret

if [ -z "$client_secret" ]; then
    echo -e "${RED}❌ Client Secret não pode ser vazio${NC}"
    exit 1
fi

# Definir Redirect URI (padrão)
redirect_uri="http://localhost:5000/api/calendar/google/oauth-callback"

echo ""
echo -e "${BLUE}🔗 Redirect URI (padrão):${NC}"
echo "   $redirect_uri"
read -p "   Usar este? (s/n): " usar_redirect_padrao

if [ "$usar_redirect_padrao" != "s" ] && [ "$usar_redirect_padrao" != "S" ]; then
    echo "   Cole o Redirect URI customizado:"
    read -p "   > " redirect_uri_custom
    if [ ! -z "$redirect_uri_custom" ]; then
        redirect_uri="$redirect_uri_custom"
    fi
fi

# Adicionar ao .env
echo ""
echo -e "${YELLOW}📝 Adicionando credenciais ao .env...${NC}"

# Verificar se já existem as variáveis
if grep -q "GOOGLE_CALENDAR_CLIENT_ID=" .env; then
    # Atualizar existentes
    sed -i.bak "s|GOOGLE_CALENDAR_CLIENT_ID=.*|GOOGLE_CALENDAR_CLIENT_ID=$client_id|" .env
    sed -i.bak "s|GOOGLE_CALENDAR_CLIENT_SECRET=.*|GOOGLE_CALENDAR_CLIENT_SECRET=$client_secret|" .env
    sed -i.bak "s|GOOGLE_CALENDAR_REDIRECT_URI=.*|GOOGLE_CALENDAR_REDIRECT_URI=$redirect_uri|" .env
    rm .env.bak 2>/dev/null
else
    # Adicionar novas
    echo "" >> .env
    echo "# Google Calendar Integration" >> .env
    echo "GOOGLE_CALENDAR_CLIENT_ID=$client_id" >> .env
    echo "GOOGLE_CALENDAR_CLIENT_SECRET=$client_secret" >> .env
    echo "GOOGLE_CALENDAR_REDIRECT_URI=$redirect_uri" >> .env
fi

echo -e "${GREEN}✅ Credenciais adicionadas ao .env${NC}"
echo ""

# Verificar se ENCRYPTION_KEY existe
if ! grep -q "ENCRYPTION_KEY=" .env || grep -q "ENCRYPTION_KEY=$" .env || grep -q "ENCRYPTION_KEY=your-encryption-key" .env; then
    echo -e "${YELLOW}🔐 Gerando ENCRYPTION_KEY...${NC}"
    encryption_key=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

    if grep -q "ENCRYPTION_KEY=" .env; then
        sed -i.bak "s|ENCRYPTION_KEY=.*|ENCRYPTION_KEY=$encryption_key|" .env
        rm .env.bak 2>/dev/null
    else
        echo "ENCRYPTION_KEY=$encryption_key" >> .env
    fi

    echo -e "${GREEN}✅ ENCRYPTION_KEY gerada${NC}"
else
    echo -e "${GREEN}✅ ENCRYPTION_KEY já existe${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Configuração concluída!${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${BLUE}📋 Próximos passos:${NC}"
echo ""
echo "1. Rodar a migration do banco de dados:"
echo "   ${YELLOW}npm run migrate-google-calendar${NC}"
echo ""
echo "2. Iniciar o servidor:"
echo "   ${YELLOW}npm run dev${NC}"
echo ""
echo "3. Testar a integração:"
echo "   - Acesse: http://localhost:3000/settings"
echo "   - Vá para aba 'Calendar'"
echo "   - Clique em 'Google Calendar'"
echo "   - Clique em 'Conectar'"
echo ""
echo -e "${GREEN}✨ Sucesso! Agora os pastores podem conectar suas contas Google!${NC}"
echo ""
