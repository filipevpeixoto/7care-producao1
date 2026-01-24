# Como Executar a Migração de Roles

## 📍 Onde Executar

Execute o comando **no terminal, na raiz do projeto** (mesma pasta onde está o `package.json`).

## 🚀 Opção 1: Usando npm script (Recomendado)

```bash
npm run migrate-roles
```

Este é o método mais simples e recomendado.

## 🚀 Opção 2: Executar diretamente com tsx

```bash
NODE_ENV=development tsx server/migrateRoles.ts
```

## 🚀 Opção 3: Executar via Node (se tiver ts-node configurado)

```bash
node -r ts-node/register server/migrateRoles.ts
```

## ⚠️ Importante Antes de Executar

1. **Faça backup do banco de dados** (recomendado)
2. **Certifique-se de que a variável `DATABASE_URL` está configurada** no arquivo `.env` ou nas variáveis de ambiente
3. **Execute em ambiente de desenvolvimento primeiro** para testar

## 📋 O que o Script Faz

1. ✅ Cria a tabela `districts` (se não existir)
2. ✅ Adiciona coluna `district_id` em `users` (se não existir)
3. ✅ Adiciona coluna `district_id` em `churches` (se não existir)
4. ✅ Cria um "Distrito Padrão"
5. ✅ Converte todos os usuários com `role='admin'` para `role='pastor'`
6. ✅ Converte `admin@7care.com` para `role='superadmin'`
7. ✅ Associa pastores ao distrito padrão
8. ✅ Associa igrejas ao distrito padrão
9. ✅ Cria índices para melhorar performance

## ✅ Verificação Após Execução

Após executar, você verá uma mensagem como:

```
🎉 Migração de roles e distritos concluída com sucesso!

📊 Resumo:
   - Tabela districts criada
   - Colunas district_id adicionadas
   - Distrito padrão criado (ID: X)
   - Y admins convertidos para pastores
   - admin@7care.com convertido para superadmin
```

## 🔍 Verificar no Banco

Você pode verificar se funcionou:

```sql
-- Verificar distritos criados
SELECT * FROM districts;

-- Verificar usuários convertidos
SELECT id, name, email, role, district_id FROM users WHERE role IN ('superadmin', 'pastor');

-- Verificar igrejas associadas
SELECT id, name, district_id FROM churches;
```

## ❌ Em Caso de Erro

Se houver erro, o script mostrará detalhes. Os erros mais comuns são:

1. **Erro de conexão com banco:** Verifique `DATABASE_URL`
2. **Tabela já existe:** O script usa `IF NOT EXISTS`, então é seguro executar múltiplas vezes
3. **Permissões:** Verifique se o usuário do banco tem permissões para criar tabelas

## 🔄 Reversão (se necessário)

A migração **não deleta dados**, apenas atualiza. Para reverter manualmente:

```sql
-- Reverter roles (se necessário)
UPDATE users SET role = 'admin' WHERE role IN ('pastor', 'superadmin');

-- Remover distritos (cuidado!)
DELETE FROM districts;
```

**⚠️ Atenção:** Faça backup antes de reverter!

