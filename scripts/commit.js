#!/usr/bin/env node

/**
 * Script interativo para commits
 * Ajuda a criar mensagens de commit padronizadas
 */

import readline from 'readline';
import { execSync } from 'child_process';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m'
};

function log(message, color = '') {
  console.log(`${color}${message}${colors.reset}`);
}

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(`${colors.cyan}${prompt}${colors.reset}`, resolve);
  });
}

async function main() {
  console.clear();
  
  log('\n╔════════════════════════════════════════════════════════════════╗', colors.bright);
  log('║              🚀 Commit Interativo - 7care                     ║', colors.bright);
  log('╚════════════════════════════════════════════════════════════════╝\n', colors.bright);

  // Verificar se há mudanças
  try {
    execSync('git diff-index --quiet HEAD --', { stdio: 'ignore' });
    log('❌ Não há mudanças para commitar!\n', colors.red);
    process.exit(0);
  } catch {
    // Há mudanças
  }

  // Mostrar status
  log('📊 Status atual:\n', colors.yellow);
  try {
    const status = execSync('git status --short', { encoding: 'utf-8' });
    console.log(status);
  } catch (error) {
    log('⚠️ Erro ao verificar status do git\n', colors.red);
  }

  // Tipos de commit
  log('\n📝 Tipos de commit disponíveis:\n', colors.yellow);
  const types = [
    { value: 'feat', desc: 'Nova funcionalidade' },
    { value: 'fix', desc: 'Correção de bug' },
    { value: 'docs', desc: 'Documentação' },
    { value: 'style', desc: 'Formatação, estilos' },
    { value: 'refactor', desc: 'Refatoração de código' },
    { value: 'perf', desc: 'Melhoria de performance' },
    { value: 'test', desc: 'Testes' },
    { value: 'chore', desc: 'Tarefas gerais' }
  ];

  types.forEach((type, index) => {
    log(`  ${index + 1}. ${type.value.padEnd(10)} - ${type.desc}`, colors.blue);
  });

  // Perguntas
  const typeIndex = await question('\n🔹 Escolha o tipo (1-8): ');
  const selectedType = types[parseInt(typeIndex) - 1];

  if (!selectedType) {
    log('\n❌ Tipo inválido!\n', colors.red);
    process.exit(1);
  }

  const description = await question(`🔹 Descrição (ex: Adiciona sistema de notificações): `);

  if (!description.trim()) {
    log('\n❌ Descrição é obrigatória!\n', colors.red);
    process.exit(1);
  }

  const scope = await question('🔹 Escopo (opcional, ex: auth, ui, api): ');
  
  // Montar mensagem
  let message = `${selectedType.value}`;
  if (scope.trim()) {
    message += `(${scope.trim()})`;
  }
  message += `: ${description.trim()}`;

  // Confirmar
  log('\n═══════════════════════════════════════════════════════════════', colors.green);
  log('📝 Mensagem do commit:', colors.yellow);
  log(`\n   ${message}\n`, colors.bright);
  log('═══════════════════════════════════════════════════════════════', colors.green);

  const confirm = await question('\n✅ Confirma? (s/n): ');

  if (confirm.toLowerCase() !== 's') {
    log('\n❌ Commit cancelado!\n', colors.red);
    process.exit(0);
  }

  // Adicionar todos os arquivos
  try {
    log('\n📦 Adicionando arquivos...', colors.yellow);
    execSync('git add .', { stdio: 'inherit' });

    log('💾 Criando commit...', colors.yellow);
    execSync(`git commit -m "${message}"`, { stdio: 'inherit' });

    log('\n✅ Commit criado com sucesso!', colors.green);
    
    // Perguntar se quer fazer push
    const push = await question('\n🚀 Fazer push para o GitHub? (s/n): ');
    
    if (push.toLowerCase() === 's') {
      log('\n📤 Enviando para GitHub...', colors.yellow);
      execSync('git push origin main', { stdio: 'inherit' });
      log('\n✅ Push concluído! O deploy automático deve ser iniciado pela Vercel.', colors.green);
      log('🌐 Acompanhe no painel da Vercel do projeto.\n', colors.cyan);
    } else {
      log('\n📝 Lembre-se de fazer push depois: git push origin main\n', colors.yellow);
    }

  } catch (error) {
    log('\n❌ Erro ao criar commit!\n', colors.red);
    console.error(error.message);
    process.exit(1);
  }

  rl.close();
}

main();
