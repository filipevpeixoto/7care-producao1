#!/bin/bash

# Script para testar todas as rotas da aplicação
# Verifica se retornam status 200 (OK) ou outros códigos de erro

BASE_URL="http://localhost:3065"

# Lista de todas as rotas da aplicação
ROUTES=(
    "/"
    "/dashboard"
    "/calendar"
    "/menu"
    "/meu-cadastro"
    "/users"
    "/interested"
    "/my-interested"
    "/chat"
    "/gamification"
    "/prayers"
    "/push-notifications"
    "/notifications"
    "/settings"
    "/tasks"
    "/reports"
    "/my-reports"
    "/contact"
    "/election-config"
    "/election-voting"
    "/election-dashboard"
    "/elections"
    "/election-dashboard/1"
    "/election-manage"
    "/election-manage/1"
    "/election-vote/1"
    "/districts"
    "/pastors"
    "/pastor-invites"
    "/first-access"
    "/pastor-onboarding/abc123"
)

echo "=========================================="
echo "   Teste de Rotas - Church Plus Manager"
echo "=========================================="
echo ""

TOTAL=0
SUCCESS=0
FAILED=0
FAILED_ROUTES=()

for route in "${ROUTES[@]}"; do
    TOTAL=$((TOTAL + 1))
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}${route}")
    
    if [ "$HTTP_CODE" == "200" ]; then
        echo "✅ $route -> $HTTP_CODE"
        SUCCESS=$((SUCCESS + 1))
    else
        echo "❌ $route -> $HTTP_CODE"
        FAILED=$((FAILED + 1))
        FAILED_ROUTES+=("$route ($HTTP_CODE)")
    fi
done

echo ""
echo "=========================================="
echo "              RESUMO"
echo "=========================================="
echo "Total de rotas testadas: $TOTAL"
echo "✅ Sucesso: $SUCCESS"
echo "❌ Falhas: $FAILED"

if [ $FAILED -gt 0 ]; then
    echo ""
    echo "Rotas com erro:"
    for failed_route in "${FAILED_ROUTES[@]}"; do
        echo "  - $failed_route"
    done
    exit 1
else
    echo ""
    echo "🎉 Todas as rotas estão funcionando corretamente!"
    exit 0
fi
