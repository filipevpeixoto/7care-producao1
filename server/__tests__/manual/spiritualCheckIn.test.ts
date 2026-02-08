/**
 * Teste do Fluxo Completo de Check-in Espiritual
 * Simula 5 usuários reais com diferentes perfis e cenários
 *
 * Executar: npx tsx server/__tests__/manual/spiritualCheckIn.test.ts
 */

import { createEmotionalCheckInSchema } from '../../schemas';

// ============================================
// Helpers de teste
// ============================================

let passed = 0;
let failed = 0;
const errors: string[] = [];

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${message}`);
  } else {
    failed++;
    errors.push(message);
    console.log(`  ❌ ${message}`);
  }
}

function section(name: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📋 ${name}`);
  console.log('='.repeat(60));
}

// ============================================
// Mock do repositório (in-memory)
// ============================================

interface CheckInRecord {
  id: number;
  userId: number;
  emotionalScore: number | null;
  mood: string | null;
  prayerRequest: string | null;
  isPrivate: boolean;
  allowChurchMembers: boolean;
  createdAt: string;
  updatedAt: string;
}

class InMemoryCheckInRepository {
  private records: CheckInRecord[] = [];
  private nextId = 1;

  async create(data: {
    userId: number;
    emotionalScore: number | null;
    mood: string | null;
    prayerRequest: string | null;
    isPrivate: boolean;
    allowChurchMembers: boolean;
  }): Promise<CheckInRecord> {
    const now = new Date().toISOString();
    const record: CheckInRecord = {
      id: this.nextId++,
      userId: data.userId,
      emotionalScore: data.emotionalScore,
      mood: data.mood,
      prayerRequest: data.prayerRequest,
      isPrivate: data.isPrivate ?? false,
      allowChurchMembers: data.allowChurchMembers ?? true,
      createdAt: now,
      updatedAt: now,
    };
    this.records.push(record);
    return record;
  }

  private sortDesc(a: CheckInRecord, b: CheckInRecord): number {
    const timeDiff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    return timeDiff !== 0 ? timeDiff : b.id - a.id; // id como desempate (simula DB)
  }

  async getAll(): Promise<CheckInRecord[]> {
    return [...this.records].sort(this.sortDesc);
  }

  async getByUserId(userId: number): Promise<CheckInRecord[]> {
    return this.records.filter((r) => r.userId === userId).sort(this.sortDesc);
  }

  async getByUserIds(userIds: number[]): Promise<CheckInRecord[]> {
    if (userIds.length === 0) return [];
    return this.records.filter((r) => userIds.includes(r.userId)).sort(this.sortDesc);
  }

  clear() {
    this.records = [];
    this.nextId = 1;
  }
}

// ============================================
// Dados dos 5 usuários reais simulados
// ============================================

interface MockUser {
  id: number;
  name: string;
  role: 'superadmin' | 'pastor' | 'member' | 'interested' | 'missionary';
  districtId: number | null;
  church: string;
}

const users: MockUser[] = [
  { id: 1, name: 'Maria Silva', role: 'member', districtId: 1, church: 'IASD Central' },
  { id: 2, name: 'João Santos', role: 'member', districtId: 1, church: 'IASD Central' },
  { id: 3, name: 'Ana Oliveira', role: 'missionary', districtId: 1, church: 'IASD Esperança' },
  { id: 4, name: 'Pedro Costa', role: 'interested', districtId: 2, church: 'IASD Maranata' },
  { id: 5, name: 'Pr. Lucas Ferreira', role: 'pastor', districtId: 1, church: 'IASD Central' },
];

// ============================================
// Lógica da rota simulada (espelha spiritualRoutes.ts)
// ============================================

function processCheckInRequest(body: {
  userId: number;
  emotionalScore?: number | null;
  mood?: string | null;
  prayerRequest?: string | null;
  isPrivate?: boolean;
  allowChurchMembers?: boolean;
}) {
  const { emotionalScore, mood, prayerRequest, isPrivate, allowChurchMembers } = body;

  let finalScore = emotionalScore ?? null;
  if (mood) {
    finalScore = null; // mood sobrescreve o score
  }

  return {
    userId: body.userId,
    emotionalScore: finalScore,
    mood: mood ?? null,
    prayerRequest: prayerRequest ?? null,
    isPrivate: isPrivate ?? false,
    allowChurchMembers: allowChurchMembers ?? true,
  };
}

function calculateScoreGroups(checkIns: CheckInRecord[], allUsers: MockUser[]) {
  const scoreGroups: Record<string, { count: number; label: string; description: string }> = {
    '1': { count: 0, label: 'Distante', description: 'Muito distante de Deus' },
    '2': { count: 0, label: 'Frio', description: 'Pouco conectado' },
    '3': { count: 0, label: 'Neutro', description: 'Indiferente' },
    '4': { count: 0, label: 'Quente', description: 'Conectado' },
    '5': { count: 0, label: 'Intimidade', description: 'Muito próximo de Deus' },
  };

  checkIns.forEach((checkIn) => {
    const score = checkIn.emotionalScore?.toString();
    if (score && scoreGroups[score]) {
      scoreGroups[score].count++;
    }
  });

  const usersWithCheckIn = new Set(checkIns.map((c) => c.userId));
  const usersWithoutCheckIn = allUsers.filter((u) => !usersWithCheckIn.has(u.id)).length;

  return { scoreGroups, usersWithoutCheckIn, total: allUsers.length };
}

// ============================================
// TESTES
// ============================================

async function runTests() {
  console.log('\n🙏 TESTE DO FLUXO COMPLETO DE CHECK-IN ESPIRITUAL');
  console.log('📅 ' + new Date().toLocaleString('pt-BR'));
  console.log('👥 5 usuários simulados\n');

  const repo = new InMemoryCheckInRepository();

  // ──────────────────────────────────────────
  // TESTE 1: Validação do Schema Zod
  // ──────────────────────────────────────────
  section('1. Validação do Schema (createEmotionalCheckInSchema)');

  // 1a. Payload válido completo
  const validFull = createEmotionalCheckInSchema.safeParse({
    userId: 1,
    emotionalScore: 4,
    prayerRequest: 'Ore por minha família',
    isPrivate: false,
    allowChurchMembers: true,
  });
  assert(validFull.success, 'Payload completo válido aceito');

  // 1b. Payload mínimo (só userId)
  const validMinimal = createEmotionalCheckInSchema.safeParse({ userId: 1 });
  assert(validMinimal.success, 'Payload mínimo (só userId) aceito');
  if (validMinimal.success) {
    assert(validMinimal.data.isPrivate === false, 'isPrivate default = false');
    assert(validMinimal.data.allowChurchMembers === true, 'allowChurchMembers default = true');
  }

  // 1c. Score fora do range (0)
  const invalidScore0 = createEmotionalCheckInSchema.safeParse({ userId: 1, emotionalScore: 0 });
  assert(!invalidScore0.success, 'Score 0 rejeitado (mínimo 1)');

  // 1d. Score fora do range (6)
  const invalidScore6 = createEmotionalCheckInSchema.safeParse({ userId: 1, emotionalScore: 6 });
  assert(!invalidScore6.success, 'Score 6 rejeitado (máximo 5)');

  // 1e. Score negativo
  const invalidScoreNeg = createEmotionalCheckInSchema.safeParse({
    userId: 1,
    emotionalScore: -1,
  });
  assert(!invalidScoreNeg.success, 'Score negativo rejeitado');

  // 1f. userId inválido (0)
  const invalidUserId0 = createEmotionalCheckInSchema.safeParse({ userId: 0 });
  assert(!invalidUserId0.success, 'userId 0 rejeitado');

  // 1g. userId inválido (negativo)
  const invalidUserIdNeg = createEmotionalCheckInSchema.safeParse({ userId: -5 });
  assert(!invalidUserIdNeg.success, 'userId negativo rejeitado');

  // 1h. userId faltando
  const missingUserId = createEmotionalCheckInSchema.safeParse({});
  assert(!missingUserId.success, 'Payload sem userId rejeitado');

  // 1i. Score decimal
  const decimalScore = createEmotionalCheckInSchema.safeParse({
    userId: 1,
    emotionalScore: 3.5,
  });
  assert(!decimalScore.success, 'Score decimal (3.5) rejeitado - deve ser inteiro');

  // 1j. Todos os scores válidos (1-5)
  for (let score = 1; score <= 5; score++) {
    const result = createEmotionalCheckInSchema.safeParse({ userId: 1, emotionalScore: score });
    assert(result.success, `Score ${score} aceito`);
  }

  // ──────────────────────────────────────────
  // TESTE 2: Usuário 1 - Maria (membro, score 5, com pedido de oração público)
  // ──────────────────────────────────────────
  section('2. Maria Silva — Intimidade (score 5, pedido público)');

  const mariaPayload = {
    userId: 1,
    emotionalScore: 5,
    prayerRequest: 'Agradeço a Deus pela cura do meu pai. Orem pela família do Irmão José.',
    isPrivate: false,
    allowChurchMembers: true,
  };

  const mariaValidation = createEmotionalCheckInSchema.safeParse(mariaPayload);
  assert(mariaValidation.success, 'Validação do payload da Maria passou');

  const mariaProcessed = processCheckInRequest(mariaPayload);
  assert(mariaProcessed.emotionalScore === 5, 'Score processado = 5');
  assert(mariaProcessed.prayerRequest !== null, 'Pedido de oração preservado');
  assert(mariaProcessed.isPrivate === false, 'Check-in público');
  assert(mariaProcessed.allowChurchMembers === true, 'Visível para membros');

  const mariaRecord = await repo.create(mariaProcessed);
  assert(mariaRecord.id === 1, 'Registro criado com id=1');
  assert(mariaRecord.userId === 1, 'userId correto');
  assert(typeof mariaRecord.createdAt === 'string', 'createdAt é string ISO');

  // ──────────────────────────────────────────
  // TESTE 3: Usuário 2 - João (membro, score 2, pedido privado)
  // ──────────────────────────────────────────
  section('3. João Santos — Buscando (score 2, pedido privado)');

  const joaoPayload = {
    userId: 2,
    emotionalScore: 2,
    prayerRequest: 'Estou passando por dificuldades financeiras. Preciso de ajuda.',
    isPrivate: true,
    allowChurchMembers: false,
  };

  const joaoValidation = createEmotionalCheckInSchema.safeParse(joaoPayload);
  assert(joaoValidation.success, 'Validação do payload do João passou');

  const joaoProcessed = processCheckInRequest(joaoPayload);
  assert(joaoProcessed.emotionalScore === 2, 'Score processado = 2');
  assert(joaoProcessed.isPrivate === true, 'Check-in privado');
  assert(joaoProcessed.allowChurchMembers === false, 'NÃO visível para membros');

  const joaoRecord = await repo.create(joaoProcessed);
  assert(joaoRecord.id === 2, 'Registro criado com id=2');
  assert(joaoRecord.isPrivate === true, 'Privacidade preservada no registro');

  // ──────────────────────────────────────────
  // TESTE 4: Usuário 3 - Ana (missionária, score 4, sem pedido)
  // ──────────────────────────────────────────
  section('4. Ana Oliveira — Frutificando (score 4, sem pedido de oração)');

  const anaPayload = {
    userId: 3,
    emotionalScore: 4,
    isPrivate: false,
    allowChurchMembers: true,
  };

  const anaValidation = createEmotionalCheckInSchema.safeParse(anaPayload);
  assert(anaValidation.success, 'Validação do payload da Ana passou');

  const anaProcessed = processCheckInRequest(anaPayload);
  assert(anaProcessed.emotionalScore === 4, 'Score processado = 4');
  assert(anaProcessed.prayerRequest === null, 'Sem pedido de oração = null');
  assert(anaProcessed.mood === null, 'Sem mood = null');

  const anaRecord = await repo.create(anaProcessed);
  assert(anaRecord.id === 3, 'Registro criado com id=3');
  assert(anaRecord.prayerRequest === null, 'prayerRequest null no registro');

  // ──────────────────────────────────────────
  // TESTE 5: Usuário 4 - Pedro (interessado, score 1, pedido público)
  // ──────────────────────────────────────────
  section('5. Pedro Costa — Distante (score 1, pedido público)');

  const pedroPayload = {
    userId: 4,
    emotionalScore: 1,
    prayerRequest: 'Quero conhecer mais sobre Deus. Estou começando a frequentar a igreja.',
    isPrivate: false,
    allowChurchMembers: true,
  };

  const pedroValidation = createEmotionalCheckInSchema.safeParse(pedroPayload);
  assert(pedroValidation.success, 'Validação do payload do Pedro passou');

  const pedroProcessed = processCheckInRequest(pedroPayload);
  assert(pedroProcessed.emotionalScore === 1, 'Score processado = 1');

  const pedroRecord = await repo.create(pedroProcessed);
  assert(pedroRecord.id === 4, 'Registro criado com id=4');

  // ──────────────────────────────────────────
  // TESTE 6: Usuário 5 - Pastor Lucas (pastor, score 3, com mood)
  // ──────────────────────────────────────────
  section('6. Pr. Lucas Ferreira — Enraizando (score 3, com mood)');

  const lucasPayload = {
    userId: 5,
    emotionalScore: 3,
    mood: 'contemplativo',
    prayerRequest: 'Ore pelo distrito e pelos jovens da igreja.',
    isPrivate: false,
    allowChurchMembers: true,
  };

  const lucasValidation = createEmotionalCheckInSchema.safeParse(lucasPayload);
  assert(lucasValidation.success, 'Validação do payload do Pr. Lucas passou');

  const lucasProcessed = processCheckInRequest(lucasPayload);
  assert(
    lucasProcessed.emotionalScore === null,
    'Score anulado quando mood é fornecido (regra de negócio)'
  );
  assert(lucasProcessed.mood === 'contemplativo', 'Mood preservado');

  const lucasRecord = await repo.create(lucasProcessed);
  assert(lucasRecord.id === 5, 'Registro criado com id=5');
  assert(lucasRecord.emotionalScore === null, 'emotionalScore null no registro (mood presente)');

  // ──────────────────────────────────────────
  // TESTE 7: Consultas do repositório
  // ──────────────────────────────────────────
  section('7. Consultas do Repositório');

  // 7a. getAll retorna todos os 5
  const allCheckIns = await repo.getAll();
  assert(allCheckIns.length === 5, `getAll() retorna 5 registros (obteve ${allCheckIns.length})`);

  // 7b. getByUserId para Maria
  const mariaCheckIns = await repo.getByUserId(1);
  assert(
    mariaCheckIns.length === 1,
    `getByUserId(1) retorna 1 registro (obteve ${mariaCheckIns.length})`
  );
  assert(mariaCheckIns[0].emotionalScore === 5, 'Score da Maria = 5');

  // 7c. getByUserId para usuário inexistente
  const noCheckIns = await repo.getByUserId(999);
  assert(noCheckIns.length === 0, 'getByUserId(999) retorna 0 registros');

  // 7d. getByUserIds com filtro de distrito 1 (Maria, João, Ana, Pr. Lucas)
  const district1UserIds = users.filter((u) => u.districtId === 1).map((u) => u.id);
  const district1CheckIns = await repo.getByUserIds(district1UserIds);
  assert(
    district1CheckIns.length === 4,
    `getByUserIds distrito 1 retorna 4 registros (obteve ${district1CheckIns.length})`
  );

  // 7e. getByUserIds com array vazio
  const emptyCheckIns = await repo.getByUserIds([]);
  assert(emptyCheckIns.length === 0, 'getByUserIds([]) retorna 0 registros');

  // 7f. getByUserIds com distrito 2 (Pedro)
  const district2UserIds = users.filter((u) => u.districtId === 2).map((u) => u.id);
  const district2CheckIns = await repo.getByUserIds(district2UserIds);
  assert(
    district2CheckIns.length === 1,
    `getByUserIds distrito 2 retorna 1 registro (obteve ${district2CheckIns.length})`
  );

  // ──────────────────────────────────────────
  // TESTE 8: Cálculo de scores agregados (visão admin)
  // ──────────────────────────────────────────
  section('8. Scores Agregados (visão admin/pastor)');

  // 8a. Score groups com todos os check-ins
  const allScores = calculateScoreGroups(allCheckIns, users);
  assert(allScores.scoreGroups['1'].count === 1, 'Score 1 (Distante): 1 pessoa (Pedro)');
  assert(allScores.scoreGroups['2'].count === 1, 'Score 2 (Frio): 1 pessoa (João)');
  assert(
    allScores.scoreGroups['3'].count === 0,
    'Score 3 (Neutro): 0 pessoas (Lucas tem mood, score null)'
  );
  assert(allScores.scoreGroups['4'].count === 1, 'Score 4 (Quente): 1 pessoa (Ana)');
  assert(allScores.scoreGroups['5'].count === 1, 'Score 5 (Intimidade): 1 pessoa (Maria)');
  assert(allScores.total === 5, 'Total de usuários: 5');
  assert(
    allScores.usersWithoutCheckIn === 0,
    `Usuários sem check-in: 0 (obteve ${allScores.usersWithoutCheckIn})`
  );

  // 8b. Score groups filtrado por distrito 1 (visão pastor)
  const district1Scores = calculateScoreGroups(district1CheckIns, users.filter((u) => u.districtId === 1));
  assert(
    district1Scores.scoreGroups['1'].count === 0,
    'Distrito 1 - Score 1: 0 (Pedro é do distrito 2)'
  );
  assert(district1Scores.scoreGroups['2'].count === 1, 'Distrito 1 - Score 2: 1 (João)');
  assert(district1Scores.scoreGroups['5'].count === 1, 'Distrito 1 - Score 5: 1 (Maria)');
  assert(district1Scores.total === 4, 'Distrito 1 - Total: 4 usuários');

  // ──────────────────────────────────────────
  // TESTE 9: Privacidade e visibilidade
  // ──────────────────────────────────────────
  section('9. Regras de Privacidade');

  // Simular filtragem de check-ins visíveis para membros da igreja
  const publicCheckIns = allCheckIns.filter((c) => !c.isPrivate);
  assert(publicCheckIns.length === 4, `4 check-ins públicos (obteve ${publicCheckIns.length})`);

  const privateCheckIns = allCheckIns.filter((c) => c.isPrivate);
  assert(privateCheckIns.length === 1, `1 check-in privado (obteve ${privateCheckIns.length})`);
  assert(privateCheckIns[0].userId === 2, 'Check-in privado é do João');

  // Check-ins visíveis para membros (público E allowChurchMembers)
  const memberVisibleCheckIns = allCheckIns.filter((c) => !c.isPrivate && c.allowChurchMembers);
  assert(
    memberVisibleCheckIns.length === 4,
    `4 check-ins visíveis para membros (obteve ${memberVisibleCheckIns.length})`
  );

  // ──────────────────────────────────────────
  // TESTE 10: Múltiplos check-ins do mesmo usuário
  // ──────────────────────────────────────────
  section('10. Múltiplos Check-ins (mesmo usuário)');

  // Maria faz um segundo check-in
  const mariaSecondPayload = {
    userId: 1,
    emotionalScore: 3,
    prayerRequest: 'Hoje foi um dia difícil.',
    isPrivate: true,
    allowChurchMembers: false,
  };

  const maria2Processed = processCheckInRequest(mariaSecondPayload);
  await repo.create(maria2Processed);

  const mariaAllCheckIns = await repo.getByUserId(1);
  assert(
    mariaAllCheckIns.length === 2,
    `Maria agora tem 2 check-ins (obteve ${mariaAllCheckIns.length})`
  );

  // O mais recente vem primeiro (orderBy desc)
  assert(
    mariaAllCheckIns[0].emotionalScore === 3,
    'Check-in mais recente da Maria tem score 3'
  );
  assert(
    mariaAllCheckIns[1].emotionalScore === 5,
    'Check-in anterior da Maria tem score 5'
  );

  // Total agora é 6
  const allAfterSecond = await repo.getAll();
  assert(
    allAfterSecond.length === 6,
    `Total de check-ins agora é 6 (obteve ${allAfterSecond.length})`
  );

  // ──────────────────────────────────────────
  // TESTE 11: Casos extremos
  // ──────────────────────────────────────────
  section('11. Casos Extremos');

  // 11a. Prayer request muito longo (500 chars)
  const longPrayer = 'A'.repeat(500);
  const longPrayerPayload = createEmotionalCheckInSchema.safeParse({
    userId: 1,
    emotionalScore: 3,
    prayerRequest: longPrayer,
  });
  assert(longPrayerPayload.success, 'Prayer request com 500 chars aceito');

  // 11b. Score null explícito
  const nullScore = createEmotionalCheckInSchema.safeParse({
    userId: 1,
    emotionalScore: null,
  });
  assert(nullScore.success, 'emotionalScore null aceito');

  // 11c. Mood sem score
  const moodOnly = createEmotionalCheckInSchema.safeParse({
    userId: 1,
    mood: 'feliz',
  });
  assert(moodOnly.success, 'Mood sem score aceito');

  // 11d. Mood + Score (mood sobrescreve)
  const moodAndScore = processCheckInRequest({
    userId: 1,
    emotionalScore: 4,
    mood: 'ansioso',
  });
  assert(
    moodAndScore.emotionalScore === null,
    'Quando mood presente, emotionalScore vira null'
  );
  assert(moodAndScore.mood === 'ansioso', 'Mood preservado: "ansioso"');

  // 11e. String vazia no prayerRequest
  const emptyPrayer = createEmotionalCheckInSchema.safeParse({
    userId: 1,
    prayerRequest: '',
  });
  assert(emptyPrayer.success, 'prayerRequest vazio aceito');

  // ──────────────────────────────────────────
  // TESTE 12: Permissões - Visão do Pastor vs Superadmin
  // ──────────────────────────────────────────
  section('12. Permissões (Pastor vs Superadmin)');

  const pastorUser = users.find((u) => u.role === 'pastor')!;
  const isPastor = pastorUser.role === 'pastor';
  const hasDistrict = pastorUser.districtId !== null;

  assert(isPastor, `${pastorUser.name} é pastor`);
  assert(hasDistrict, `${pastorUser.name} tem districtId=${pastorUser.districtId}`);

  // Pastor só vê check-ins do seu distrito
  if (isPastor && hasDistrict) {
    const pastorDistrictUsers = users
      .filter((u) => u.districtId === pastorUser.districtId)
      .map((u) => u.id);
    const pastorVisibleCheckIns = await repo.getByUserIds(pastorDistrictUsers);

    // Maria (2), João (1), Ana (1), Lucas (1) = 5 (Maria fez 2 check-ins)
    assert(
      pastorVisibleCheckIns.length === 5,
      `Pastor vê 5 check-ins do distrito 1 (obteve ${pastorVisibleCheckIns.length})`
    );

    // Pedro (distrito 2) não aparece
    const pedroPresentInPastorView = pastorVisibleCheckIns.some((c) => c.userId === 4);
    assert(!pedroPresentInPastorView, 'Pedro (distrito 2) NÃO aparece na visão do pastor');
  }

  // Superadmin vê todos
  const superadminCheckIns = await repo.getAll();
  assert(
    superadminCheckIns.length === 6,
    `Superadmin vê todos os 6 check-ins (obteve ${superadminCheckIns.length})`
  );

  // ──────────────────────────────────────────
  // RESUMO
  // ──────────────────────────────────────────
  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 RESUMO DOS TESTES');
  console.log('='.repeat(60));
  console.log(`  ✅ Passou: ${passed}`);
  console.log(`  ❌ Falhou: ${failed}`);
  console.log(`  📋 Total:  ${passed + failed}`);

  if (errors.length > 0) {
    console.log('\n  Falhas:');
    errors.forEach((e) => console.log(`    ❌ ${e}`));
  }

  console.log(`\n${'─'.repeat(60)}`);
  console.log('  👥 Usuários testados:');
  users.forEach((u) => {
    console.log(`     ${u.id}. ${u.name} (${u.role}, distrito ${u.districtId})`);
  });

  console.log(`\n  📈 Cenários cobertos:`);
  console.log('     - Validação de schema (scores 1-5, limites, defaults)');
  console.log('     - 5 check-ins com diferentes perfis de usuário');
  console.log('     - Privacidade (público vs privado)');
  console.log('     - Mood vs Score (regra de negócio)');
  console.log('     - Múltiplos check-ins do mesmo usuário');
  console.log('     - Filtro por distrito (pastor vs superadmin)');
  console.log('     - Score groups agregados');
  console.log('     - Casos extremos (null, vazio, limites)');

  console.log('─'.repeat(60));

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Erro fatal ao executar testes:', err);
  process.exit(1);
});
