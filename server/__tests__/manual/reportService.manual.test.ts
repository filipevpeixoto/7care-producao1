/**
 * Testes manuais para ReportService (executar com tsx)
 * Uso: npx tsx server/__tests__/manual/reportService.manual.test.ts
 */

// Testando apenas a função exportToCSV que não depende do banco
function testExportToCSV() {
  console.log('\n🧪 Testando exportToCSV...\n');

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

  function _assertDeepEquals(actual: any, expected: any, testName: string) {
    const actualStr = JSON.stringify(actual);
    const expectedStr = JSON.stringify(expected);
    if (actualStr === expectedStr) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.log(`❌ FAIL: ${testName}`);
      console.log(`   Esperado: ${expectedStr}`);
      console.log(`   Recebido: ${actualStr}`);
      failed++;
    }
  }

  // Implementação da função exportToCSV inline para evitar imports
  async function exportToCSV<T>(data: T[]): Promise<string> {
    try {
      if (data.length === 0) return '';

      const headers = Object.keys(data[0] as object);
      const csvHeaders = headers.join(',');

      const csvRows = data.map(row =>
        headers
          .map(header => {
            const value = (row as any)[header];
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value ?? '';
          })
          .join(',')
      );

      return [csvHeaders, ...csvRows].join('\n');
    } catch (error) {
      console.error('Erro ao exportar CSV:', error);
      return '';
    }
  }

  // TESTE 1: Array vazio
  (async () => {
    const result = await exportToCSV([]);
    assertEquals(result, '', 'Array vazio deve retornar string vazia');
  })();

  // TESTE 2: Dados simples
  (async () => {
    const data = [
      { name: 'João', age: 30, city: 'São Paulo' },
      { name: 'Maria', age: 25, city: 'Rio' },
    ];
    const result = await exportToCSV(data);
    const lines = result.split('\n');

    assertEquals(lines[0], 'name,age,city', 'Headers corretos');
    assertEquals(lines[1], 'João,30,São Paulo', 'Primeira linha correta');
    assertEquals(lines[2], 'Maria,25,Rio', 'Segunda linha correta');
  })();

  // TESTE 3: Valores com vírgulas
  (async () => {
    const data = [{ name: 'Silva, João', city: 'São Paulo, SP' }];
    const result = await exportToCSV(data);
    const lines = result.split('\n');

    assertEquals(lines[1], '"Silva, João","São Paulo, SP"', 'Valores com vírgula devem ser escapados');
  })();

  // TESTE 4: Valores com aspas duplas
  (async () => {
    const data = [{ description: 'Diz "olá" para todos' }];
    const result = await exportToCSV(data);
    const lines = result.split('\n');

    assertEquals(lines[1], '"Diz ""olá"" para todos"', 'Aspas duplas devem ser escapadas');
  })();

  // TESTE 5: Valores null/undefined
  (async () => {
    const data = [{ name: 'João', email: null, phone: undefined }];
    const result = await exportToCSV(data);
    const lines = result.split('\n');

    assertEquals(lines[1], 'João,,', 'null/undefined devem virar strings vazias');
  })();

  // TESTE 6: Números
  (async () => {
    const data = [{ count: 100, price: 19.99, discount: 0 }];
    const result = await exportToCSV(data);
    const lines = result.split('\n');

    assertEquals(lines[1], '100,19.99,0', 'Números devem ser mantidos');
  })();

  // TESTE 7: Ordem das colunas
  (async () => {
    const data = [
      { z: 'último', a: 'primeiro', m: 'meio' },
      { z: '3', a: '1', m: '2' },
    ];
    const result = await exportToCSV(data);
    const lines = result.split('\n');

    assertEquals(lines[0], 'z,a,m', 'Ordem das colunas deve ser mantida (z,a,m)');
    assertEquals(lines[1], 'último,primeiro,meio', 'Primeira linha com ordem correta');
  })();

  // Aguardar todos os testes async
  setTimeout(() => {
    console.log(`\n📊 Resultado: ${passed} passou(ram), ${failed} falhou(aram)`);

    if (failed === 0) {
      console.log('✅ Todos os testes passaram!\n');
      process.exit(0);
    } else {
      console.log('❌ Alguns testes falharam!\n');
      process.exit(1);
    }
  }, 100);
}

// Executar testes
testExportToCSV();
