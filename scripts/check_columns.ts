/* eslint-disable no-console, @typescript-eslint/no-non-null-assertion */
import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';

config();

const sql = neon(process.env.DATABASE_URL!);

async function checkColumns() {
  console.log('Verificando colunas da tabela users...\n');

  const cols = await sql`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'users' 
    ORDER BY ordinal_position
  `;

  console.log('Colunas existentes na tabela users:');
  cols.forEach((c, i) => console.log(`${i + 1}. ${c.column_name}`));

  // Colunas esperadas pelo schema
  const expected = [
    'id',
    'name',
    'email',
    'password',
    'role',
    'church',
    'church_code',
    'district_id',
    'departments',
    'birth_date',
    'civil_status',
    'occupation',
    'education',
    'address',
    'baptism_date',
    'previous_religion',
    'biblical_instructor',
    'interested_situation',
    'is_donor',
    'is_tither',
    'is_approved',
    'points',
    'level',
    'attendance',
    'extra_data',
    'engajamento',
    'classificacao',
    'dizimista_type',
    'ofertante_type',
    'tempo_batismo_anos',
    'departamentos_cargos',
    'nome_unidade',
    'tem_licao',
    'total_presenca',
    'comunhao',
    'missao',
    'estudo_biblico',
    'batizou_alguem',
    'disc_pos_batismal',
    'cpf_valido',
    'campos_vazios',
    'observations',
    'first_access',
    'status',
    'username_normalized',
    'created_at',
    'updated_at',
  ];

  const existing = cols.map(c => c.column_name);

  console.log('\n\nColunas FALTANDO:');
  const missing = expected.filter(col => !existing.includes(col));
  missing.forEach(col => console.log(`  - ${col}`));

  console.log('\n\nColunas EXTRAS (não no schema):');
  const extra = existing.filter(col => !expected.includes(col));
  extra.forEach(col => console.log(`  - ${col}`));
}

checkColumns().catch(console.error);
