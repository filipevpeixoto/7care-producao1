/**
 * Teste do Fluxo Completo de Check-in Espiritual
 * Simula 5 usuários reais com diferentes perfis e cenários
 * Testa: schema, score↔mood bidirecional, dados legados, privacidade, permissões
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
// Mapeamentos score ↔ mood (idêntico ao spiritualRoutes.ts)
// ============================================

const SCORE_TO_MOOD: Record<number, string> = {
  1: 'Distante',
  2: 'Buscando',
  3: 'Enraizando',
  4: 'Frutificando',
  5: 'Intimidade',
};

const MOOD_TO_SCORE: Record<string, number> = {
  Distante: 1,
  Buscando: 2,
  Enraizando: 3,
  Frutificando: 4,
  Intimidade: 5,
};

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
    return timeDiff !== 0 ? timeDiff : b.id - a.id;
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
// Lógica da rota simulada (espelha spiritualRoutes.ts CORRIGIDO)
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

  // Resolve score: usa emotionalScore direto, ou mapeia mood → score
  const finalScore = emotionalScore ?? (mood ? (MOOD_TO_SCORE[mood] ?? null) : null);

  // Resolve mood: usa mood direto, ou mapeia score → mood
  const finalMood = mood ?? (finalScore ? (SCORE_TO_MOOD[finalScore] ?? null) : null);

  return {
    userId: body.userId,
    emotionalScore: finalScore,
    mood: finalMood,
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
    // Usa emotionalScore direto, ou mapeia mood → score para dados legados
    const numericScore =
      checkIn.emotionalScore ?? (checkIn.mood ? (MOOD_TO_SCORE[checkIn.mood] ?? null) : null);
    const score = numericScore?.toString();
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
  console.log('\n🙏 TESTE DO FLUXO COMPLETO DE CHECK-IN ESPIRITUAL (v2 - corrigido)');
  console.log(`📅 ${new Date().toLocaleString('pt-BR')}`);
  console.log('👥 5 usuários simulados\n');

  const repo = new InMemoryCheckInRepository();

  // ──────────────────────────────────────────
  // TESTE 1: Validação do Schema Zod
  // ──────────────────────────────────────────
  section('1. Validação do Schema (createEmotionalCheckInSchema)');

  // 1a. Payload com emotionalScore (backend)
  const validFull = createEmotionalCheckInSchema.safeParse({
    userId: 1,
    emotionalScore: 4,
    prayerRequest: 'Ore por minha família',
    isPrivate: false,
    allowChurchMembers: true,
  });
  assert(validFull.success, 'Payload com emotionalScore aceito');

  // 1b. Payload com score (frontend alias)
  const validScoreAlias = createEmotionalCheckInSchema.safeParse({
    userId: 1,
    score: 3,
    prayerRequest: 'Ore por mim',
  });
  assert(validScoreAlias.success, 'Payload com "score" (alias) aceito');
  if (validScoreAlias.success) {
    assert(validScoreAlias.data.emotionalScore === 3, 'score=3 mapeado para emotionalScore=3');
  }

  // 1c. Payload com notes (alias de prayerRequest)
  const validNotesAlias = createEmotionalCheckInSchema.safeParse({
    userId: 1,
    emotionalScore: 2,
    notes: 'Minha nota via campo notes',
  });
  assert(validNotesAlias.success, 'Payload com "notes" (alias) aceito');
  if (validNotesAlias.success) {
    assert(
      validNotesAlias.data.prayerRequest === 'Minha nota via campo notes',
      'notes mapeado para prayerRequest'
    );
  }

  // 1d. Payload mínimo (só userId)
  const validMinimal = createEmotionalCheckInSchema.safeParse({ userId: 1 });
  assert(validMinimal.success, 'Payload mínimo (só userId) aceito');
  if (validMinimal.success) {
    assert(validMinimal.data.isPrivate === false, 'isPrivate default = false');
    assert(validMinimal.data.allowChurchMembers === true, 'allowChurchMembers default = true');
    assert(validMinimal.data.emotionalScore === null, 'emotionalScore default = null');
  }

  // 1e. Score fora do range (0)
  const invalidScore0 = createEmotionalCheckInSchema.safeParse({ userId: 1, emotionalScore: 0 });
  assert(!invalidScore0.success, 'Score 0 rejeitado (mínimo 1)');

  // 1f. Score fora do range (6)
  const invalidScore6 = createEmotionalCheckInSchema.safeParse({ userId: 1, emotionalScore: 6 });
  assert(!invalidScore6.success, 'Score 6 rejeitado (máximo 5)');

  // 1g. Score negativo
  const invalidScoreNeg = createEmotionalCheckInSchema.safeParse({
    userId: 1,
    emotionalScore: -1,
  });
  assert(!invalidScoreNeg.success, 'Score negativo rejeitado');

  // 1h. userId inválido (0)
  const invalidUserId0 = createEmotionalCheckInSchema.safeParse({ userId: 0 });
  assert(!invalidUserId0.success, 'userId 0 rejeitado');

  // 1i. userId inválido (negativo)
  const invalidUserIdNeg = createEmotionalCheckInSchema.safeParse({ userId: -5 });
  assert(!invalidUserIdNeg.success, 'userId negativo rejeitado');

  // 1j. userId faltando
  const missingUserId = createEmotionalCheckInSchema.safeParse({});
  assert(!missingUserId.success, 'Payload sem userId rejeitado');

  // 1k. Score decimal
  const decimalScore = createEmotionalCheckInSchema.safeParse({
    userId: 1,
    emotionalScore: 3.5,
  });
  assert(!decimalScore.success, 'Score decimal (3.5) rejeitado - deve ser inteiro');

  // 1l. Alias score fora do range
  const invalidScoreAlias = createEmotionalCheckInSchema.safeParse({ userId: 1, score: 0 });
  assert(!invalidScoreAlias.success, 'Alias score=0 rejeitado');

  // 1m. Todos os scores válidos (1-5) via emotionalScore
  for (let score = 1; score <= 5; score++) {
    const result = createEmotionalCheckInSchema.safeParse({ userId: 1, emotionalScore: score });
    assert(result.success, `emotionalScore ${score} aceito`);
  }

  // 1n. Todos os scores válidos (1-5) via alias score
  for (let score = 1; score <= 5; score++) {
    const result = createEmotionalCheckInSchema.safeParse({ userId: 1, score });
    assert(result.success, `alias score ${score} aceito`);
    if (result.success) {
      assert(
        result.data.emotionalScore === score,
        `alias score=${score} → emotionalScore=${score}`
      );
    }
  }

  // 1o. emotionalScore tem prioridade sobre score
  const bothScores = createEmotionalCheckInSchema.safeParse({
    userId: 1,
    emotionalScore: 5,
    score: 2,
  });
  assert(bothScores.success, 'Ambos emotionalScore e score aceitos');
  if (bothScores.success) {
    assert(
      bothScores.data.emotionalScore === 5,
      'emotionalScore (5) tem prioridade sobre score (2)'
    );
  }

  // ──────────────────────────────────────────
  // TESTE 2: Score → Mood auto-geração
  // ──────────────────────────────────────────
  section('2. Score → Mood (auto-geração bidirecional)');

  // 2a. Score gera mood automaticamente
  const scoreOnly = processCheckInRequest({ userId: 1, emotionalScore: 5 });
  assert(scoreOnly.emotionalScore === 5, 'Score 5 preservado');
  assert(scoreOnly.mood === 'Intimidade', 'Mood auto-gerado: "Intimidade"');

  const score3 = processCheckInRequest({ userId: 1, emotionalScore: 3 });
  assert(score3.mood === 'Enraizando', 'Score 3 → mood "Enraizando"');

  const score1 = processCheckInRequest({ userId: 1, emotionalScore: 1 });
  assert(score1.mood === 'Distante', 'Score 1 → mood "Distante"');

  // 2b. Mood gera score automaticamente
  const moodOnly = processCheckInRequest({ userId: 1, mood: 'Frutificando' });
  assert(moodOnly.emotionalScore === 4, 'Mood "Frutificando" → score 4');
  assert(moodOnly.mood === 'Frutificando', 'Mood preservado');

  const moodBuscando = processCheckInRequest({ userId: 1, mood: 'Buscando' });
  assert(moodBuscando.emotionalScore === 2, 'Mood "Buscando" → score 2');

  // 2c. Mood custom (sem mapeamento) preserva mood, score fica null
  const moodCustom = processCheckInRequest({ userId: 1, mood: 'contemplativo' });
  assert(moodCustom.emotionalScore === null, 'Mood custom "contemplativo" → score null');
  assert(moodCustom.mood === 'contemplativo', 'Mood custom preservado');

  // 2d. Ambos fornecidos: emotionalScore é usado, mood é preservado
  const both = processCheckInRequest({ userId: 1, emotionalScore: 4, mood: 'Enraizando' });
  assert(both.emotionalScore === 4, 'Score explícito (4) preservado quando mood fornecido');
  assert(both.mood === 'Enraizando', 'Mood explícito preservado');

  // 2e. Todos os mapeamentos score→mood
  for (let s = 1; s <= 5; s++) {
    const result = processCheckInRequest({ userId: 1, emotionalScore: s });
    assert(result.mood === SCORE_TO_MOOD[s], `Score ${s} → "${SCORE_TO_MOOD[s]}"`);
  }

  // ──────────────────────────────────────────
  // TESTE 3: Usuário 1 - Maria (membro, score 5, com pedido público)
  // ──────────────────────────────────────────
  section('3. Maria Silva — Intimidade (score 5, pedido público)');

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
  assert(mariaProcessed.mood === 'Intimidade', 'Mood auto-gerado = "Intimidade"');
  assert(mariaProcessed.prayerRequest !== null, 'Pedido de oração preservado');
  assert(mariaProcessed.isPrivate === false, 'Check-in público');
  assert(mariaProcessed.allowChurchMembers === true, 'Visível para membros');

  const mariaRecord = await repo.create(mariaProcessed);
  assert(mariaRecord.id === 1, 'Registro criado com id=1');
  assert(mariaRecord.mood === 'Intimidade', 'Mood salvo no registro');

  // ──────────────────────────────────────────
  // TESTE 4: Usuário 2 - João (membro, score 2, pedido privado)
  // ──────────────────────────────────────────
  section('4. João Santos — Buscando (score 2, pedido privado)');

  const joaoPayload = {
    userId: 2,
    emotionalScore: 2,
    prayerRequest: 'Estou passando por dificuldades financeiras. Preciso de ajuda.',
    isPrivate: true,
    allowChurchMembers: false,
  };

  const joaoProcessed = processCheckInRequest(joaoPayload);
  assert(joaoProcessed.emotionalScore === 2, 'Score processado = 2');
  assert(joaoProcessed.mood === 'Buscando', 'Mood auto-gerado = "Buscando"');
  assert(joaoProcessed.isPrivate === true, 'Check-in privado');
  assert(joaoProcessed.allowChurchMembers === false, 'NÃO visível para membros');

  const joaoRecord = await repo.create(joaoProcessed);
  assert(joaoRecord.isPrivate === true, 'Privacidade preservada no registro');

  // ──────────────────────────────────────────
  // TESTE 5: Usuário 3 - Ana (missionária, score 4, sem pedido)
  // ──────────────────────────────────────────
  section('5. Ana Oliveira — Frutificando (score 4, sem pedido de oração)');

  const anaProcessed = processCheckInRequest({
    userId: 3,
    emotionalScore: 4,
    isPrivate: false,
    allowChurchMembers: true,
  });
  assert(anaProcessed.emotionalScore === 4, 'Score processado = 4');
  assert(anaProcessed.mood === 'Frutificando', 'Mood auto-gerado = "Frutificando"');
  assert(anaProcessed.prayerRequest === null, 'Sem pedido de oração = null');

  await repo.create(anaProcessed);

  // ──────────────────────────────────────────
  // TESTE 6: Usuário 4 - Pedro (interessado, mood "Distante" sem score)
  // ──────────────────────────────────────────
  section('6. Pedro Costa — Distante (mood only, sem score — dado legado)');

  // Simula dado legado: só mood, sem emotionalScore
  const pedroProcessed = processCheckInRequest({
    userId: 4,
    mood: 'Distante',
    prayerRequest: 'Quero conhecer mais sobre Deus.',
  });
  assert(pedroProcessed.emotionalScore === 1, 'Mood "Distante" → score 1 (mapeado)');
  assert(pedroProcessed.mood === 'Distante', 'Mood preservado');

  await repo.create(pedroProcessed);

  // ──────────────────────────────────────────
  // TESTE 7: Usuário 5 - Pastor Lucas (mood custom sem mapeamento)
  // ──────────────────────────────────────────
  section('7. Pr. Lucas Ferreira — Mood custom sem mapeamento');

  const lucasProcessed = processCheckInRequest({
    userId: 5,
    mood: 'contemplativo',
    prayerRequest: 'Ore pelo distrito e pelos jovens da igreja.',
  });
  assert(lucasProcessed.emotionalScore === null, 'Mood custom → score null');
  assert(lucasProcessed.mood === 'contemplativo', 'Mood custom preservado');

  await repo.create(lucasProcessed);

  // ──────────────────────────────────────────
  // TESTE 8: Consultas do repositório
  // ──────────────────────────────────────────
  section('8. Consultas do Repositório');

  const allCheckIns = await repo.getAll();
  assert(allCheckIns.length === 5, `getAll() retorna 5 registros (obteve ${allCheckIns.length})`);

  const mariaCheckIns = await repo.getByUserId(1);
  assert(mariaCheckIns.length === 1, `getByUserId(1) retorna 1`);

  const noCheckIns = await repo.getByUserId(999);
  assert(noCheckIns.length === 0, 'getByUserId(999) retorna 0');

  const district1UserIds = users.filter((u) => u.districtId === 1).map((u) => u.id);
  const district1CheckIns = await repo.getByUserIds(district1UserIds);
  assert(
    district1CheckIns.length === 4,
    `Distrito 1: 4 check-ins (obteve ${district1CheckIns.length})`
  );

  const emptyCheckIns = await repo.getByUserIds([]);
  assert(emptyCheckIns.length === 0, 'getByUserIds([]) retorna 0');

  // ──────────────────────────────────────────
  // TESTE 9: Scores Agregados (com suporte a dados legados)
  // ──────────────────────────────────────────
  section('9. Scores Agregados (com mapeamento mood→score)');

  const allScores = calculateScoreGroups(allCheckIns, users);

  // Pedro enviou mood="Distante" sem score → calculateScoreGroups deve mapear para 1
  assert(allScores.scoreGroups['1'].count === 1, 'Score 1 (Distante): 1 (Pedro via mood)');
  assert(allScores.scoreGroups['2'].count === 1, 'Score 2 (Buscando): 1 (João)');
  assert(
    allScores.scoreGroups['3'].count === 0,
    'Score 3: 0 (Lucas tem mood custom, sem mapeamento)'
  );
  assert(allScores.scoreGroups['4'].count === 1, 'Score 4 (Frutificando): 1 (Ana)');
  assert(allScores.scoreGroups['5'].count === 1, 'Score 5 (Intimidade): 1 (Maria)');
  assert(allScores.total === 5, 'Total de usuários: 5');
  assert(
    allScores.usersWithoutCheckIn === 0,
    `Sem check-in: 0 (obteve ${allScores.usersWithoutCheckIn})`
  );

  // Simular dados 100% legados (só mood, sem emotionalScore)
  const legacyRepo = new InMemoryCheckInRepository();
  await legacyRepo.create({
    userId: 10,
    emotionalScore: null,
    mood: 'Intimidade',
    prayerRequest: null,
    isPrivate: false,
    allowChurchMembers: true,
  });
  await legacyRepo.create({
    userId: 11,
    emotionalScore: null,
    mood: 'Distante',
    prayerRequest: null,
    isPrivate: false,
    allowChurchMembers: true,
  });
  await legacyRepo.create({
    userId: 12,
    emotionalScore: null,
    mood: 'Enraizando',
    prayerRequest: null,
    isPrivate: false,
    allowChurchMembers: true,
  });

  const legacyUsers: MockUser[] = [
    { id: 10, name: 'Legado1', role: 'member', districtId: 1, church: 'Test' },
    { id: 11, name: 'Legado2', role: 'member', districtId: 1, church: 'Test' },
    { id: 12, name: 'Legado3', role: 'member', districtId: 1, church: 'Test' },
  ];

  const legacyCheckIns = await legacyRepo.getAll();
  const legacyScores = calculateScoreGroups(legacyCheckIns, legacyUsers);

  assert(
    legacyScores.scoreGroups['5'].count === 1,
    'Legado: mood "Intimidade" → score 5 contabilizado'
  );
  assert(
    legacyScores.scoreGroups['1'].count === 1,
    'Legado: mood "Distante" → score 1 contabilizado'
  );
  assert(
    legacyScores.scoreGroups['3'].count === 1,
    'Legado: mood "Enraizando" → score 3 contabilizado'
  );
  assert(legacyScores.usersWithoutCheckIn === 0, 'Legado: todos têm check-in');

  // ──────────────────────────────────────────
  // TESTE 10: Privacidade e visibilidade
  // ──────────────────────────────────────────
  section('10. Regras de Privacidade');

  const publicCheckIns = allCheckIns.filter((c) => !c.isPrivate);
  assert(publicCheckIns.length === 4, `4 check-ins públicos (obteve ${publicCheckIns.length})`);

  const privateCheckIns = allCheckIns.filter((c) => c.isPrivate);
  assert(privateCheckIns.length === 1, `1 check-in privado (obteve ${privateCheckIns.length})`);
  assert(privateCheckIns[0].userId === 2, 'Check-in privado é do João');

  const memberVisibleCheckIns = allCheckIns.filter((c) => !c.isPrivate && c.allowChurchMembers);
  assert(
    memberVisibleCheckIns.length === 4,
    `4 check-ins visíveis para membros (obteve ${memberVisibleCheckIns.length})`
  );

  // ──────────────────────────────────────────
  // TESTE 11: Múltiplos check-ins do mesmo usuário
  // ──────────────────────────────────────────
  section('11. Múltiplos Check-ins (mesmo usuário)');

  const maria2Processed = processCheckInRequest({
    userId: 1,
    emotionalScore: 3,
    prayerRequest: 'Hoje foi um dia difícil.',
    isPrivate: true,
    allowChurchMembers: false,
  });
  assert(maria2Processed.mood === 'Enraizando', 'Segundo check-in: mood auto-gerado "Enraizando"');
  await repo.create(maria2Processed);

  const mariaAllCheckIns = await repo.getByUserId(1);
  assert(
    mariaAllCheckIns.length === 2,
    `Maria tem 2 check-ins (obteve ${mariaAllCheckIns.length})`
  );
  assert(mariaAllCheckIns[0].emotionalScore === 3, 'Mais recente: score 3');
  assert(mariaAllCheckIns[1].emotionalScore === 5, 'Anterior: score 5');

  // ──────────────────────────────────────────
  // TESTE 12: Casos extremos
  // ──────────────────────────────────────────
  section('12. Casos Extremos');

  // 12a. Prayer request muito longo (500 chars)
  const longPrayerPayload = createEmotionalCheckInSchema.safeParse({
    userId: 1,
    emotionalScore: 3,
    prayerRequest: 'A'.repeat(500),
  });
  assert(longPrayerPayload.success, 'Prayer request com 500 chars aceito');

  // 12b. Score null explícito
  const nullScore = createEmotionalCheckInSchema.safeParse({ userId: 1, emotionalScore: null });
  assert(nullScore.success, 'emotionalScore null aceito');

  // 12c. Mood sem score
  const moodOnlySchema = createEmotionalCheckInSchema.safeParse({ userId: 1, mood: 'feliz' });
  assert(moodOnlySchema.success, 'Mood sem score aceito');

  // 12d. String vazia no prayerRequest
  const emptyPrayer = createEmotionalCheckInSchema.safeParse({ userId: 1, prayerRequest: '' });
  assert(emptyPrayer.success, 'prayerRequest vazio aceito');

  // 12e. prayerRequest via notes alias
  const notesAlias = createEmotionalCheckInSchema.safeParse({
    userId: 1,
    emotionalScore: 3,
    notes: 'Minha oração',
  });
  assert(notesAlias.success, 'notes alias aceito');
  if (notesAlias.success) {
    assert(
      notesAlias.data.prayerRequest === 'Minha oração',
      'notes mapeado para prayerRequest corretamente'
    );
  }

  // 12f. prayerRequest tem prioridade sobre notes
  const bothPrayer = createEmotionalCheckInSchema.safeParse({
    userId: 1,
    emotionalScore: 3,
    prayerRequest: 'Via prayerRequest',
    notes: 'Via notes',
  });
  assert(bothPrayer.success, 'Ambos prayerRequest e notes aceitos');
  if (bothPrayer.success) {
    assert(
      bothPrayer.data.prayerRequest === 'Via prayerRequest',
      'prayerRequest tem prioridade sobre notes'
    );
  }

  // 12g. Sem score e sem mood → processCheckInRequest retorna nulls
  const nada = processCheckInRequest({ userId: 1 });
  assert(nada.emotionalScore === null, 'Sem score e sem mood → emotionalScore null');
  assert(nada.mood === null, 'Sem score e sem mood → mood null');

  // ──────────────────────────────────────────
  // TESTE 13: Permissões - Visão do Pastor vs Superadmin
  // ──────────────────────────────────────────
  section('13. Permissões (Pastor vs Superadmin)');

  const pastorUser = users.find((u) => u.role === 'pastor')!;
  assert(pastorUser.role === 'pastor', `${pastorUser.name} é pastor`);

  const pastorDistrictUsers = users
    .filter((u) => u.districtId === pastorUser.districtId)
    .map((u) => u.id);
  const pastorVisibleCheckIns = await repo.getByUserIds(pastorDistrictUsers);

  assert(
    pastorVisibleCheckIns.length === 5,
    `Pastor vê 5 check-ins do distrito 1 (obteve ${pastorVisibleCheckIns.length})`
  );

  const pedroPresentInPastorView = pastorVisibleCheckIns.some((c) => c.userId === 4);
  assert(!pedroPresentInPastorView, 'Pedro (distrito 2) NÃO aparece na visão do pastor');

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
  console.log('     - Schema: score alias, notes alias, prioridade de campos');
  console.log('     - Score → Mood auto-geração bidirecional');
  console.log('     - 5 check-ins com diferentes perfis de usuário');
  console.log('     - Dados legados (mood sem emotionalScore)');
  console.log('     - Privacidade (público vs privado)');
  console.log('     - Múltiplos check-ins do mesmo usuário');
  console.log('     - Filtro por distrito (pastor vs superadmin)');
  console.log('     - Scores agregados com suporte a dados legados');
  console.log('     - Casos extremos (null, vazio, limites, aliases)');

  console.log('─'.repeat(60));

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Erro fatal ao executar testes:', err);
  process.exit(1);
});
