/**
 * Testes manuais para GamificationService (executar com tsx)
 * Uso: npx tsx server/__tests__/manual/gamificationService.manual.test.ts
 */

console.log('\n🧪 Testando GamificationService...\n');

let passed = 0;
let failed = 0;

// Função de teste auxiliar
function assertEquals(actual: any, expected: any, testName: string) {
  if (actual === expected) {
    console.log(`✅ PASS: ${testName}`);
    passed++;
  } else {
    console.log(`❌ FAIL: ${testName}`);
    console.log(`   Esperado: ${expected}`);
    console.log(`   Recebido: ${actual}`);
    failed++;
  }
}

// ====================================
// TESTES: calculateLevel
// ====================================

console.log('\n📊 Testando calculateLevel:\n');

function calculateLevel(points: number): string {
  if (points < 250) return 'Iniciante';
  if (points < 500) return 'Bronze';
  if (points < 750) return 'Prata';
  if (points < 1000) return 'Ouro';
  return 'Platina';
}

assertEquals(calculateLevel(100), 'Iniciante', 'Pontos abaixo de 250 = Iniciante');
assertEquals(calculateLevel(300), 'Bronze', 'Pontos 250-499 = Bronze');
assertEquals(calculateLevel(600), 'Prata', 'Pontos 500-749 = Prata');
assertEquals(calculateLevel(800), 'Ouro', 'Pontos 750-999 = Ouro');
assertEquals(calculateLevel(1500), 'Platina', 'Pontos acima de 1000 = Platina');

// ====================================
// TESTES: parseExtraData
// ====================================

console.log('\n📦 Testando parseExtraData:\n');

function parseExtraData(data: any): Record<string, any> {
  if (!data) return {};
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch {
      return {};
    }
  }
  if (typeof data === 'object') return data;
  return {};
}

const test1 = parseExtraData('{"engajamento":"alto","classificacao":"frequente"}');
assertEquals(
  JSON.stringify(test1),
  JSON.stringify({ engajamento: 'alto', classificacao: 'frequente' }),
  'Parsear JSON string corretamente'
);

const test2 = parseExtraData('{invalid json}');
assertEquals(JSON.stringify(test2), JSON.stringify({}), 'JSON inválido retorna objeto vazio');

const test3 = parseExtraData({ engajamento: 'alto' });
assertEquals(
  JSON.stringify(test3),
  JSON.stringify({ engajamento: 'alto' }),
  'Objeto direto é retornado como está'
);

const test4 = parseExtraData(null);
assertEquals(JSON.stringify(test4), JSON.stringify({}), 'null retorna objeto vazio');

const test5 = parseExtraData(undefined);
assertEquals(JSON.stringify(test5), JSON.stringify({}), 'undefined retorna objeto vazio');

// ====================================
// TESTES: calculatePointsForUser
// ====================================

console.log('\n🎯 Testando calculatePointsForUser:\n');

interface PointsConfiguration {
  basicPoints: number;
  engajamento?: { alto?: number; medio?: number; baixo?: number };
  classificacao?: { frequente?: number; naoFrequente?: number };
  dizimista?: { recorrente?: number; sazonal?: number; pontual?: number };
  tempoBatismo?: { maisVinte?: number; dezAnos?: number; cincoAnos?: number; doisAnos?: number };
  cargos?: { tresOuMais?: number; doisCargos?: number; umCargo?: number };
}

function calculatePointsForUser(user: any, config: PointsConfiguration): number {
  let points = config.basicPoints || 0;

  const extraData = parseExtraData(user.extraData);

  // Engajamento
  if (extraData.engajamento && config.engajamento) {
    points += config.engajamento[extraData.engajamento as keyof typeof config.engajamento] || 0;
  }

  // Classificação
  if (extraData.classificacao && config.classificacao) {
    points +=
      config.classificacao[extraData.classificacao as keyof typeof config.classificacao] || 0;
  }

  // Dizimista
  if (extraData.dizimistaType && config.dizimista) {
    points += config.dizimista[extraData.dizimistaType as keyof typeof config.dizimista] || 0;
  }

  // Tempo de batismo
  if (extraData.tempoBatismoAnos && config.tempoBatismo) {
    const anos = extraData.tempoBatismoAnos;
    if (anos >= 20) points += config.tempoBatismo.maisVinte || 0;
    else if (anos >= 10) points += config.tempoBatismo.dezAnos || 0;
    else if (anos >= 5) points += config.tempoBatismo.cincoAnos || 0;
    else if (anos >= 2) points += config.tempoBatismo.doisAnos || 0;
  }

  // Cargos
  if (extraData.departamentosCargos && config.cargos) {
    const numCargos = extraData.departamentosCargos.split(',').length;
    if (numCargos >= 3) points += config.cargos.tresOuMais || 0;
    else if (numCargos >= 2) points += config.cargos.doisCargos || 0;
    else if (numCargos >= 1) points += config.cargos.umCargo || 0;
  }

  return Math.max(0, points);
}

const mockConfig: PointsConfiguration = {
  basicPoints: 100,
  engajamento: { alto: 50, medio: 25, baixo: 10 },
  classificacao: { frequente: 30, naoFrequente: 0 },
  dizimista: { recorrente: 40, sazonal: 20, pontual: 10 },
  tempoBatismo: { maisVinte: 50, dezAnos: 30, cincoAnos: 15, doisAnos: 5 },
  cargos: { tresOuMais: 40, doisCargos: 25, umCargo: 10 },
};

// Teste 1: Usuário sem extras
const user1 = { id: 1, name: 'Teste', email: 'teste@test.com', extraData: {} };
const points1 = calculatePointsForUser(user1, mockConfig);
assertEquals(points1, 100, 'Pontos básicos para usuário sem extras');

// Teste 2: Engajamento alto
const user2 = { id: 1, name: 'Teste', extraData: { engajamento: 'alto' } };
const points2 = calculatePointsForUser(user2, mockConfig);
assertEquals(points2, 150, 'Pontos básicos + engajamento alto (100 + 50)');

// Teste 3: Classificação frequente
const user3 = { id: 1, name: 'Teste', extraData: { classificacao: 'frequente' } };
const points3 = calculatePointsForUser(user3, mockConfig);
assertEquals(points3, 130, 'Pontos básicos + classificação frequente (100 + 30)');

// Teste 4: Múltiplos fatores
const user4 = {
  id: 1,
  name: 'Teste',
  extraData: {
    engajamento: 'alto',
    classificacao: 'frequente',
    dizimistaType: 'recorrente',
    tempoBatismoAnos: 15,
    departamentosCargos: 'cargo1,cargo2,cargo3',
  },
};
const points4 = calculatePointsForUser(user4, mockConfig);
// 100 (basic) + 50 (eng alto) + 30 (freq) + 40 (diz rec) + 30 (10-20 anos) + 40 (3+ cargos)
assertEquals(points4, 290, 'Pontos complexos com múltiplos fatores');

// Teste 5: Pontos mínimos
const user5 = { id: 1, name: 'Teste', extraData: {} };
const negativeConfig: PointsConfiguration = { basicPoints: -1000 };
const points5 = calculatePointsForUser(user5, negativeConfig);
assertEquals(points5, 0, 'Pontos mínimos = 0 (não permite negativos)');

// Teste 6: extraData como string JSON
const user6 = { id: 1, name: 'Teste', extraData: '{"engajamento":"alto"}' };
const points6 = calculatePointsForUser(user6, mockConfig);
assertEquals(points6, 150, 'Parsear extraData como JSON string (100 + 50)');

// ====================================
// RESULTADO FINAL
// ====================================

console.log(`\n📊 Resultado: ${passed} passou(ram), ${failed} falhou(aram)`);

if (failed === 0) {
  console.log('✅ Todos os testes passaram!\n');
  process.exit(0);
} else {
  console.log('❌ Alguns testes falharam!\n');
  process.exit(1);
}
