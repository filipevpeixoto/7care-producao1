#!/bin/bash

# Script de Deploy do Google Calendar para Produção - 7Care
# Configura variáveis de ambiente no Netlify

echo "🚀 Deploy Google Calendar - Configuração Netlify"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Credenciais (já configuradas)
CLIENT_ID="61388812338-se0a70hkratv97es0geudr9p8km45kdg.apps.googleusercontent.com"
CLIENT_SECRET="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"

echo -e "${BLUE}📝 Digite a URL de produção:${NC}"
echo "   Exemplo: https://7care.vercel.app"
read -p "   > " prod_url

if [ -z "$prod_url" ]; then
    echo -e "${YELLOW}⚠️  URL não pode ser vazia${NC}"
    exit 1
fi

# Remover barra no final se houver
prod_url=${prod_url%/}

REDIRECT_URI="${prod_url}/api/calendar/google/oauth-callback"

echo ""
echo -e "${GREEN}✅ Configuração:${NC}"
echo "   URL: $prod_url"
echo "   Redirect URI: $REDIRECT_URI"
echo ""

# Adicionar variáveis ao Netlify
echo -e "${YELLOW}📤 Adicionando variáveis ao Netlify...${NC}"
echo ""

# Verificar se netlify CLI está instalado
if ! command -v netlify &> /dev/null; then
    echo -e "${YELLOW}⚠️  Netlify CLI não encontrado. Instalando...${NC}"
    npm install -g netlify-cli
fi

echo "Configurando variáveis de ambiente..."

# Adicionar cada variável
netlify env:set GOOGLE_CALENDAR_CLIENT_ID "$CLIENT_ID" --context production
netlify env:set GOOGLE_CALENDAR_CLIENT_SECRET "$CLIENT_SECRET" --context production
netlify env:set GOOGLE_CALENDAR_REDIRECT_URI "$REDIRECT_URI" --context production

echo ""
echo -e "${GREEN}✅ Variáveis adicionadas ao Netlify!${NC}"
echo ""

# Perguntar se quer fazer deploy
read -p "Fazer deploy para produção agora? (s/n): " fazer_deploy

if [ "$fazer_deploy" = "s" ] || [ "$fazer_deploy" = "S" ]; then
    echo ""
    echo -e "${YELLOW}🚀 Fazendo deploy...${NC}"
    npm run deploy
    echo ""
    echo -e "${GREEN}✅ Deploy concluído!${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}📋 Próximos passos:${NC}"
echo ""
echo "1. Rodar migration em produção:"
echo "   ${YELLOW}npm run migrate-prod${NC}"
echo ""
echo "2. Acessar o site em produção:"
echo "   ${YELLOW}${prod_url}/settings${NC}"
echo ""
echo "3. Testar a conexão com Google Calendar"
echo ""
echo -e "${GREEN}🎉 Configuração de produção concluída!${NC}"
echo ""
