import { NeonAdapter } from "./neonAdapter";
import * as bcrypt from 'bcryptjs';

export async function setupNeonData() {
  const storage = new NeonAdapter();
  
  console.log('🚀 Configurando dados iniciais no Neon Database...');
  
  // Verificar se já existem usuários além do admin
  const existingUsers = await storage.getAllUsers();
  const nonAdminUsers = existingUsers.filter(u => u.role !== 'admin' && u.role !== 'superadmin');
  if (nonAdminUsers.length > 0) {
    console.log('✅ Dados já existem no Neon Database');
    return;
  }
  
  console.log('👑 Criando super admin...');
  const adminPassword = await bcrypt.hash('meu7care', 10);
  const admin = await storage.createUser({
    name: 'Super Administrador',
    email: 'admin@7care.com',
    password: adminPassword,
    role: 'superadmin',
    church: 'Armour',
    churchCode: 'ARM001',
    departments: 'Administração',
    birthDate: '1990-01-01',
    civilStatus: 'Solteiro',
    occupation: 'Administrador',
    education: 'Superior',
    address: 'Rua Principal, 123',
    baptismDate: '2000-01-01',
    previousReligion: 'Nenhuma',
    biblicalInstructor: 'Pastor João',
    interestedSituation: 'Aprovado',
    isDonor: true,
    isTither: true,
    isApproved: true,
    points: 1000,
    level: 'Ouro',
    attendance: 100,
    extraData: JSON.stringify({
      engajamento: 'Alto',
      classificacao: 'Frequente',
      dizimista: 'Pontual',
      ofertante: 'Recorrente',
      tempoBatismo: 20,
      cargos: ['Administrador'],
      nomeUnidade: 'Armour',
      temLicao: true,
      totalPresenca: 100,
      batizouAlguem: true,
      discipuladoPosBatismo: 5,
      cpfValido: true,
      camposVaziosACMS: false,
      escolaSabatina: {
        comunhao: 10,
        missao: 8,
        estudoBiblico: 9,
        batizouAlguem: true,
        discipuladoPosBatismo: 5
      }
    }),
    observations: 'Super administrador do sistema',
    firstAccess: false,
    status: 'active'
  } as any);
  
  console.log('✅ Super admin criado:', admin.name);
  
  // Criar usuários do Armour
  const armourUsers = [
    {
      name: 'Pastor João Silva',
      email: 'joao@armour.com',
      password: 'armour123',
      role: 'admin',
      church: 'Armour',
      church_code: 'ARM001',
      departments: ['Pastoral'],
      birth_date: '1975-05-15',
      civil_status: 'Casado',
      occupation: 'Pastor',
      education: 'Superior',
      address: 'Rua da Igreja, 456',
      baptism_date: '1990-06-15',
      previous_religion: 'Católico',
      biblical_instructor: 'Pastor Antônio',
      interested_situation: 'Aprovado',
      is_donor: true,
      is_tither: true,
      is_approved: true,
      points: 850,
      level: 'Prata',
      attendance: 95,
      extra_data: JSON.stringify({
        engajamento: 'Alto',
        classificacao: 'Frequente',
        dizimista: 'Pontual',
        ofertante: 'Recorrente',
        tempoBatismo: 30,
        cargos: ['Pastor'],
        nomeUnidade: 'Armour',
        temLicao: true,
        totalPresenca: 95,
        batizouAlguem: true,
        discipuladoPosBatismo: 10,
        cpfValido: true,
        camposVaziosACMS: false
      }),
      observations: 'Pastor da igreja Armour',
      first_access: false,
      status: 'active'
    },
    {
      name: 'Maria Santos',
      email: 'maria@armour.com',
      password: 'armour123',
      role: 'member',
      church: 'Armour',
      church_code: 'ARM001',
      departments: ['Música', 'Evangelismo'],
      birth_date: '1985-03-20',
      civil_status: 'Casada',
      occupation: 'Professora',
      education: 'Superior',
      address: 'Av. Central, 789',
      baptism_date: '2005-08-20',
      previous_religion: 'Evangélica',
      biblical_instructor: 'Pastor João',
      interested_situation: 'Aprovado',
      is_donor: true,
      is_tither: true,
      is_approved: true,
      points: 650,
      level: 'Bronze',
      attendance: 90,
      extra_data: JSON.stringify({
        engajamento: 'Médio',
        classificacao: 'Frequente',
        dizimista: 'Sazonal',
        ofertante: 'Pontual',
        tempoBatismo: 15,
        cargos: ['Música', 'Evangelismo'],
        nomeUnidade: 'Armour',
        temLicao: true,
        totalPresenca: 90,
        batizouAlguem: false,
        discipuladoPosBatismo: 2,
        cpfValido: true,
        camposVaziosACMS: false
      }),
      observations: 'Membro ativo da igreja Armour',
      first_access: false,
      status: 'active'
    },
    {
      name: 'Carlos Oliveira',
      email: 'carlos@armour.com',
      password: 'armour123',
      role: 'member',
      church: 'Armour',
      church_code: 'ARM001',
      departments: ['Jovens'],
      birth_date: '1995-12-10',
      civil_status: 'Solteiro',
      occupation: 'Estudante',
      education: 'Superior',
      address: 'Rua Nova, 321',
      baptism_date: '2015-12-10',
      previous_religion: 'Nenhuma',
      biblical_instructor: 'Pastor João',
      interested_situation: 'Aprovado',
      is_donor: false,
      is_tither: false,
      is_approved: true,
      points: 400,
      level: 'Bronze',
      attendance: 80,
      extra_data: JSON.stringify({
        engajamento: 'Baixo',
        classificacao: 'Frequente',
        dizimista: 'Não dizimista',
        ofertante: 'Não ofertante',
        tempoBatismo: 5,
        cargos: ['Jovens'],
        nomeUnidade: 'Armour',
        temLicao: false,
        totalPresenca: 80,
        batizouAlguem: false,
        discipuladoPosBatismo: 0,
        cpfValido: true,
        camposVaziosACMS: false
      }),
      observations: 'Jovem membro da igreja Armour',
      first_access: false,
      status: 'active'
    }
  ];
  
  console.log('👥 Criando usuários do Armour...');
  
  for (const userData of armourUsers) {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const user = await storage.createUser({
      ...userData,
      password: hashedPassword
    } as any);
    console.log(`✅ Usuário criado: ${user.name} (${user.email})`);
  }
  
  // Criar igreja Armour
  console.log('⛪ Criando igreja Armour...');
  const church = await storage.createChurch({
    name: 'Igreja Armour',
    code: 'ARM001',
    address: 'Rua da Igreja, 456',
    city: 'São Paulo',
    state: 'SP',
    zip_code: '01234-567',
    phone: '(11) 1234-5678',
    email: 'contato@armour.com',
    pastor_name: 'Pastor João Silva',
    pastor_email: 'joao@armour.com',
    established_date: '1990-01-01',
    status: 'active',
    districtId: null,
    isActive: true
  });
  
  console.log('✅ Igreja Armour criada:', church.name);
  
  // Criar alguns eventos da Armour
  console.log('📅 Criando eventos da Armour...');
  const events = [
    {
      title: 'Culto Dominical',
      description: 'Culto de adoração e pregação',
      date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 dias no futuro
      time: '09:00',
      location: 'Igreja Armour',
      type: 'Culto',
      church_id: church.id,
      max_participants: 200,
      status: 'active'
    },
    {
      title: 'Reunião de Jovens',
      description: 'Encontro semanal dos jovens',
      date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 dias no futuro
      time: '19:30',
      location: 'Igreja Armour - Sala dos Jovens',
      type: 'Reunião',
      church_id: church.id,
      max_participants: 50,
      status: 'active'
    },
    {
      title: 'Escola Sabatina',
      description: 'Estudo bíblico semanal',
      date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 dias no futuro
      time: '08:00',
      location: 'Igreja Armour - Salas de Classe',
      type: 'Estudo',
      church_id: church.id,
      max_participants: 100,
      status: 'active'
    }
  ];
  
  for (const eventData of events) {
    const event = await storage.createEvent(eventData);
    console.log(`✅ Evento criado: ${event.title}`);
  }
  
  console.log('🎉 Setup do Neon Database concluído com sucesso!');
  console.log('📊 Resumo:');
  console.log('   - 1 Super Admin (admin@7care.com)');
  console.log('   - 3 Usuários da Armour');
  console.log('   - 1 Igreja Armour');
  console.log('   - 3 Eventos da Armour');
  
  return {
    admin,
    church,
    users: armourUsers.length,
    events: events.length
  };
}
