#!/bin/bash
# Script para importar variáveis do .env para o Vercel

echo "🚀 Importando variáveis de ambiente para o Vercel..."

# Verifica se .env existe
if [ ! -f .env ]; then
  echo "❌ Arquivo .env não encontrado!"
  echo "💡 Copie suas variáveis do Netlify para um arquivo .env na raiz do projeto"
  exit 1
fi

# Verifica se Vercel CLI está instalado
if ! command -v vercel &> /dev/null; then
  echo "📦 Instalando Vercel CLI..."
  npm install -g vercel
fi

# Login no Vercel
echo "🔐 Faça login no Vercel:"
vercel login

# Link com o projeto (se ainda não estiver linkado)
echo "🔗 Conectando com o projeto no Vercel..."
vercel link

# Importar variáveis
echo "📤 Importando variáveis de ambiente..."

while IFS='=' read -r key value; do
  # Pular comentários e linhas vazias
  [[ "$key" =~ ^#.*$ ]] && continue
  [[ -z "$key" ]] && continue
  
  # Remover espaços em branco
  key=$(echo "$key" | xargs)
  value=$(echo "$value" | xargs)
  
  # Remover aspas do valor se existirem
  value="${value%\"}"
  value="${value#\"}"
  value="${value%\'}"
  value="${value#\'}"
  
  echo "  ➕ $key"
  vercel env add "$key" production <<< "$value"
  
done < .env

echo ""
echo "✅ Variáveis importadas com sucesso!"
echo "🌐 Acesse: https://vercel.com/dashboard para verificar"
