#!/bin/bash
# Script legado para exportar variáveis do Netlify para .env
# Use apenas em migrações antigas; produção atual roda na Vercel.

echo "📥 Exportando variáveis de ambiente do Netlify..."

# Verifica se Netlify CLI está instalado
if ! command -v netlify &> /dev/null; then
  echo "❌ Netlify CLI não encontrado!"
  echo "📦 Instale com: npm install -g netlify-cli"
  exit 1
fi

# Login no Netlify
echo "🔐 Faça login no Netlify:"
netlify login

# Escolher site
echo "🌐 Conectando com o site..."
netlify link

# Exportar variáveis
echo "📤 Exportando variáveis..."
netlify env:list --json > netlify-env.json

# Converter JSON para .env
echo "🔄 Convertendo para formato .env..."
node -e "
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('netlify-env.json', 'utf8'));
const envLines = Object.entries(data).map(([key, value]) => {
  // Pular variáveis internas do Netlify
  if (key.startsWith('NETLIFY_')) return null;
  return \`\${key}=\${value}\`;
}).filter(Boolean);
fs.writeFileSync('.env', envLines.join('\n'));
console.log('✅ Arquivo .env criado com sucesso!');
"

rm netlify-env.json

echo ""
echo "✅ Variáveis exportadas para .env"
echo "🔍 Revise o arquivo .env antes de importar para o Vercel"
echo "🚀 Execute: bash scripts/import-env-to-vercel.sh"
