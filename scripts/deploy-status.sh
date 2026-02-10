#!/bin/bash

# Script para verificar status do deploy no Netlify

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║           📊 STATUS DO DEPLOY - 7care                         ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔍 Verificando último commit local...${NC}"
echo ""
LAST_COMMIT=$(git log -1 --pretty=format:"%h - %s (%an, %ar)")
echo -e "${BLUE}📝 Último commit:${NC} $LAST_COMMIT"
echo ""

echo "══════════════════════════════════════════════════════════════════"
echo ""

echo -e "${YELLOW}🌐 Links Úteis:${NC}"
echo ""
echo -e "  ${BLUE}Produção:${NC}      https://7care-app.vercel.app/"
echo -e "  ${BLUE}Painel:${NC}        https://vercel.com/filipevpeixotos-projects/7care-app"
echo -e "  ${BLUE}Deploys:${NC}       https://vercel.com/filipevpeixotos-projects/7care-app/deployments"
echo -e "  ${BLUE}GitHub:${NC}        https://github.com/pxttorrent/7care-producao-sem-offline"
echo ""

echo "══════════════════════════════════════════════════════════════════"
echo ""

echo -e "${YELLOW}📋 Comandos Disponíveis:${NC}"
echo ""
echo "  npm run commit          - Commit interativo"
echo "  npm run deploy          - Deploy manual para produção"
echo "  npm run deploy:preview  - Deploy de preview"
echo "  npm run status          - Status do site"
echo "  npm run logs            - Logs do último deploy"
echo ""

echo "══════════════════════════════════════════════════════════════════"
echo ""

# Verificar se tem mudanças não commitadas
if ! git diff-index --quiet HEAD -- 2>/dev/null; then
    echo -e "${RED}⚠️  ATENÇÃO: Você tem mudanças não commitadas!${NC}"
    echo ""
    echo -e "${YELLOW}Mudanças pendentes:${NC}"
    git status --short
    echo ""
    echo -e "${BLUE}💡 Execute:${NC} npm run commit"
else
    echo -e "${GREEN}✅ Repositório local está limpo${NC}"
fi

echo ""
echo "══════════════════════════════════════════════════════════════════"

