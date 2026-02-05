const { neon } = require('@neondatabase/serverless');
const bcrypt = require('bcryptjs');
const sql = neon(process.env.DATABASE_URL);

async function main() {
  const senha = 'teste123';
  const hash = await bcrypt.hash(senha, 10);
  
  console.log('Hash gerado:', hash);
  
  // Atualizar senhas dos pastores de teste
  await sql`
    UPDATE users 
    SET password = ${hash}, is_approved = true, status = 'approved'
    WHERE email IN ('pastor.teste.a@teste.com', 'pastor.teste.b@teste.com')
  `;
  
  console.log('\n✅ Senhas atualizadas com bcrypt!');
  
  // Verificar
  const pastores = await sql`
    SELECT email, password FROM users 
    WHERE email IN ('pastor.teste.a@teste.com', 'pastor.teste.b@teste.com')
  `;
  
  for (const p of pastores) {
    const match = await bcrypt.compare(senha, p.password);
    console.log(`   ${p.email}: senha válida = ${match}`);
  }
}

main().catch(console.error);
