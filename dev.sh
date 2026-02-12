#!/bin/bash
# 7Care - Development Helper Script

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }

show_help() {
    cat << EOF
7Care - Script de Desenvolvimento

COMMANDS:
    setup       Setup inicial (install + migrations)
    start       Inicia dev servers (backend + frontend)
    docker      Inicia Docker Compose
    test        Roda todos os testes
    lint        Lint + format código
    clean       Limpa build artifacts
    check       Verifica saúde do projeto
    help        Mostra esta mensagem
EOF
}

cmd_setup() {
    print_info "Setup do projeto..."
    npm install --legacy-peer-deps
    [ ! -f .env ] && cp .env.example .env && print_warning "Configure .env"
    npm run migrate-to-neon
    print_success "Setup concluído!"
}

cmd_start() {
    print_info "Iniciando dev servers..."
    npm run dev &
    npm run dev:web
}

cmd_docker() {
    print_info "Iniciando Docker Compose..."
    docker-compose up -d
    print_success "Docker iniciado! Adminer: http://localhost:8080"
}

cmd_test() {
    print_info "Rodando testes..."
    npm test && npm run test:server
    print_success "Testes OK!"
}

cmd_lint() {
    print_info "Linting..."
    npm run lint:fix && npm run format
    print_success "Código formatado!"
}

cmd_clean() {
    print_warning "Limpando projeto..."
    rm -rf node_modules dist dist-server coverage .vite
    print_success "Projeto limpo!"
}

cmd_check() {
    print_info "Verificando projeto..."
    npm run check && npm run lint && npm test && npm run test:server
    print_success "Projeto saudável!"
}

case "${1:-help}" in
    setup) cmd_setup ;;
    start) cmd_start ;;
    docker) cmd_docker ;;
    test) cmd_test ;;
    lint) cmd_lint ;;
    clean) cmd_clean ;;
    check) cmd_check ;;
    *) show_help ;;
esac
