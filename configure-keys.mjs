import 'dotenv/config';
import { sql } from './server/neonConfig.ts';
import * as crypto from 'crypto';

console.log('🔑 Configurador de Credenciais - Automação de Notas Fiscais\n');

// Gerar chave aleatória para n8n
const n8nApiKey = crypto.randomBytes(32).toString('hex');

console.log('📝 Gerando configurações...\n');
console.log('1️⃣ n8n_api_key (gerada automaticamente):');
console.log(`   ${  n8nApiKey}`);
console.log('   ⚠️ COPIE e use no n8n quando configurar o webhook\n');

console.log('2️⃣ dracma_username:');
console.log('   ⚠️ Use suas credenciais do https://dracma.sdasystems.org/\n');

console.log('3️⃣ dracma_password:');
console.log('   ⚠️ Use suas credenciais do https://dracma.sdasystems.org/\n');

console.log('4️⃣ ocr_space_api_key:');
console.log('   ⚠️ Registre-se GRÁTIS em https://ocr.space/ocrapi');
console.log('   ⚠️ Você ganha 500 requisições/dia sem precisar de cartão\n');

console.log('═══════════════════════════════════════════════════════════\n');

// Atualizar n8n_api_key automaticamente
await sql`
  UPDATE automation_config
  SET value = ${n8nApiKey}, updated_at = NOW()
  WHERE key = 'n8n_api_key'
`;

console.log('✅ n8n_api_key configurada automaticamente!\n');

console.log('📋 Para configurar o resto, execute estes comandos SQL:\n');
console.log('   UPDATE automation_config SET value = \'SEU_USUARIO\' WHERE key = \'dracma_username\';');
console.log('   UPDATE automation_config SET value = \'SUA_SENHA\' WHERE key = \'dracma_password\';');
console.log('   UPDATE automation_config SET value = \'SUA_KEY_OCR\' WHERE key = \'ocr_space_api_key\';\n');

console.log('Ou crie um arquivo update-credentials.sql com:\n');
console.log(`
-- update-credentials.sql
UPDATE automation_config SET value = 'SEU_USUARIO_DRACMA' WHERE key = 'dracma_username';
UPDATE automation_config SET value = 'SUA_SENHA_DRACMA' WHERE key = 'dracma_password';
UPDATE automation_config SET value = 'SUA_CHAVE_OCR_SPACE' WHERE key = 'ocr_space_api_key';

-- Verificar
SELECT key,
       CASE
         WHEN value = 'CHANGE_ME' THEN '⚠️ NÃO CONFIGURADO'
         ELSE '✅ Configurado'
       END as status
FROM automation_config
ORDER BY key;
`);

console.log('\n💡 DICA: Por enquanto, você pode testar APENAS com a n8n_api_key');
console.log('   A automação completa (Dracma) pode ser configurada depois!\n');

process.exit(0);
