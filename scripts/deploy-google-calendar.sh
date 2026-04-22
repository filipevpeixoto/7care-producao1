#!/bin/bash

# Script de configuração do Google Calendar para Produção - 7Care
# Configura variáveis de ambiente na Vercel

echo "🚀 Deploy Google Calendar - Configuração Vercel"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔐 Digite o Google OAuth Client ID:${NC}"
read -p "   > " CLIENT_ID

echo -e "${BLUE}🔐 Digite o Google OAuth Client Secret:${NC}"
read -s -p "   > " CLIENT_SECRET
echo ""

if [ -z "$CLIENT_ID" ] || [ -z "$CLIENT_SECRET" ]; then
    echo -e "${YELLOW}⚠️  Client ID e Client Secret são obrigatórios${NC}"
    exit 1
fi

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

# Adicionar variáveis à Vercel
echo -e "${YELLOW}📤 Adicionando variáveis à Vercel...${NC}"
echo ""

# Verificar se Vercel CLI está instalado
if ! command -v vercel &> /dev/null; then
    echo -e "${YELLOW}⚠️  Vercel CLI não encontrado. Instalando...${NC}"
    npm install -g vercel
fi

echo "Configurando variáveis de ambiente..."

# Adicionar cada variável
printf '%s' "$CLIENT_ID" | vercel env add GOOGLE_CALENDAR_CLIENT_ID production
printf '%s' "$CLIENT_SECRET" | vercel env add GOOGLE_CALENDAR_CLIENT_SECRET production
printf '%s' "$REDIRECT_URI" | vercel env add GOOGLE_CALENDAR_REDIRECT_URI production

echo ""
echo -e "${GREEN}✅ Variáveis adicionadas à Vercel!${NC}"
echo ""

# Perguntar se quer seguir para o deploy na Vercel
read -p "Abrir a instrução de deploy agora? (s/n): " fazer_deploy

if [ "$fazer_deploy" = "s" ] || [ "$fazer_deploy" = "S" ]; then
    echo ""
    echo -e "${YELLOW}🚀 Publicação em produção é feita pela Vercel após push na main.${NC}"
    echo "Execute:"
    echo "  git push origin main"
    echo ""
    echo -e "${GREEN}✅ Fluxo de deploy exibido.${NC}"
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
