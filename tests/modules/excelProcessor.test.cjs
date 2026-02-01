/**
 * Testes do módulo de processamento de Excel
 */

const {
  normalizeColumnName,
  mapColumnToField,
  detectMemberType,
  processRow,
  extractChurches,
  groupByChurch,
  validateProcessedData,
  generateStats,
  processExcel
} = require('../../netlify/functions/modules/excelProcessor.cjs');

describe('Excel Processor Module', () => {
  describe('normalizeColumnName', () => {
    it('should convert to lowercase', () => {
      expect(normalizeColumnName('NOME')).toBe('nome');
    });

    it('should remove accents', () => {
      expect(normalizeColumnName('Endereço')).toBe('endereco');
    });

    it('should trim whitespace', () => {
      expect(normalizeColumnName('  nome  ')).toBe('nome');
    });

    it('should remove special characters', () => {
      expect(normalizeColumnName('Nome!')).toBe('nome');
    });

    it('should normalize multiple spaces', () => {
      expect(normalizeColumnName('nome   completo')).toBe('nome completo');
    });

    it('should handle empty/null values', () => {
      expect(normalizeColumnName('')).toBe('');
      expect(normalizeColumnName(null)).toBe('');
    });
  });

  describe('mapColumnToField', () => {
    it('should map common column names', () => {
      expect(mapColumnToField('nome')).toBe('name');
      expect(mapColumnToField('Nome')).toBe('name');
      expect(mapColumnToField('NOME')).toBe('name');
      expect(mapColumnToField('name')).toBe('name');
    });

    it('should map email columns', () => {
      expect(mapColumnToField('email')).toBe('email');
      expect(mapColumnToField('E-mail')).toBe('email');
    });

    it('should map phone columns', () => {
      expect(mapColumnToField('telefone')).toBe('phone');
      expect(mapColumnToField('celular')).toBe('phone');
      expect(mapColumnToField('whatsapp')).toBe('phone');
    });

    it('should map church columns', () => {
      expect(mapColumnToField('igreja')).toBe('church');
      expect(mapColumnToField('Nome da Igreja')).toBe('church');
    });

    it('should return null for unknown columns', () => {
      expect(mapColumnToField('coluna_desconhecida')).toBe(null);
    });
  });

  describe('detectMemberType', () => {
    it('should detect interested members', () => {
      expect(detectMemberType('interessado')).toBe('interested');
      expect(detectMemberType('Visitante')).toBe('interested');
      expect(detectMemberType('INTERESSADA')).toBe('interested');
    });

    it('should detect missionaries', () => {
      expect(detectMemberType('missionário')).toBe('missionary');
      expect(detectMemberType('MISSIONARIA')).toBe('missionary');
    });

    it('should detect admins', () => {
      expect(detectMemberType('admin')).toBe('admin');
      expect(detectMemberType('Líder')).toBe('admin');
      expect(detectMemberType('coordenador')).toBe('admin');
    });

    it('should default to member', () => {
      expect(detectMemberType('membro')).toBe('member');
      expect(detectMemberType('')).toBe('member');
      expect(detectMemberType(null)).toBe('member');
    });
  });

  describe('processRow', () => {
    it('should process row with mapped columns', () => {
      const row = { nome: 'João Silva', email: 'joao@test.com' };
      const columnMap = { nome: 'name', email: 'email' };
      
      const result = processRow(row, columnMap);
      
      expect(result.name).toBe('João Silva');
      expect(result.email).toBe('joao@test.com');
    });

    it('should format phone numbers', () => {
      const row = { telefone: '(11) 99999-8888' };
      const columnMap = { telefone: 'phone' };
      
      const result = processRow(row, columnMap);
      
      expect(result.phone).toBe('11999998888');
    });

    it('should parse dates', () => {
      const row = { 'data de nascimento': '25/12/1990' };
      const columnMap = { 'data de nascimento': 'birthDate' };
      
      const result = processRow(row, columnMap);
      
      expect(result.birthDate).toBe('1990-12-25');
    });

    it('should parse booleans', () => {
      const row = { 'orar por 1': 'sim' };
      const columnMap = { 'orar por 1': 'step1_orar_por_1' };
      
      const result = processRow(row, columnMap);
      
      expect(result.step1_orar_por_1).toBe(true);
    });

    it('should skip empty values', () => {
      const row = { nome: 'João', email: '' };
      const columnMap = { nome: 'name', email: 'email' };
      
      const result = processRow(row, columnMap);
      
      expect(result.name).toBe('João');
      expect(result.email).toBeUndefined();
    });
  });

  describe('extractChurches', () => {
    it('should extract unique churches', () => {
      const rows = [
        { church: 'Igreja Central' },
        { church: 'Igreja Norte' },
        { church: 'Igreja Central' },
        { church: 'Igreja Sul' }
      ];
      
      const churches = extractChurches(rows);
      
      expect(churches.length).toBe(3);
      expect(churches.map(c => c.name)).toContain('Igreja Central');
      expect(churches.map(c => c.name)).toContain('Igreja Norte');
      expect(churches.map(c => c.name)).toContain('Igreja Sul');
    });

    it('should include member count', () => {
      const rows = [
        { church: 'Igreja Central' },
        { church: 'Igreja Central' },
        { church: 'Igreja Norte' }
      ];
      
      const churches = extractChurches(rows);
      const central = churches.find(c => c.name === 'Igreja Central');
      
      expect(central.memberCount).toBe(2);
    });

    it('should be case insensitive', () => {
      const rows = [
        { church: 'Igreja Central' },
        { church: 'IGREJA CENTRAL' }
      ];
      
      const churches = extractChurches(rows);
      
      expect(churches.length).toBe(1);
    });

    it('should sort alphabetically', () => {
      const rows = [
        { church: 'Zebra' },
        { church: 'Alpha' },
        { church: 'Beta' }
      ];
      
      const churches = extractChurches(rows);
      
      expect(churches[0].name).toBe('Alpha');
      expect(churches[1].name).toBe('Beta');
      expect(churches[2].name).toBe('Zebra');
    });
  });

  describe('groupByChurch', () => {
    it('should group rows by church', () => {
      const rows = [
        { name: 'João', church: 'Igreja Central' },
        { name: 'Maria', church: 'Igreja Norte' },
        { name: 'Pedro', church: 'Igreja Central' }
      ];
      
      const grouped = groupByChurch(rows);
      
      expect(grouped['Igreja Central'].length).toBe(2);
      expect(grouped['Igreja Norte'].length).toBe(1);
    });

    it('should handle missing church', () => {
      const rows = [
        { name: 'João' },
        { name: 'Maria', church: '' }
      ];
      
      const grouped = groupByChurch(rows);
      
      expect(grouped['Sem Igreja']).toBeDefined();
    });
  });

  describe('validateProcessedData', () => {
    it('should mark valid rows', () => {
      const rows = [
        { name: 'João Silva' },
        { name: 'Maria Santos' }
      ];
      
      const result = validateProcessedData(rows);
      
      expect(result.valid.length).toBe(2);
      expect(result.errors.length).toBe(0);
    });

    it('should reject rows with invalid name', () => {
      const rows = [
        { name: '' },
        { name: 'A' }
      ];
      
      const result = validateProcessedData(rows);
      
      expect(result.errors.length).toBe(2);
      expect(result.valid.length).toBe(0);
    });

    it('should add warnings for potential issues', () => {
      const rows = [
        { name: 'João', email: 'invalid-email', phone: '123' }
      ];
      
      const result = validateProcessedData(rows);
      
      expect(result.valid.length).toBe(1);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should include summary', () => {
      const rows = [
        { name: 'Valid' },
        { name: '' }
      ];
      
      const result = validateProcessedData(rows);
      
      expect(result.summary.total).toBe(2);
      expect(result.summary.validCount).toBe(1);
      expect(result.summary.errorCount).toBe(1);
    });
  });

  describe('generateStats', () => {
    it('should calculate total rows', () => {
      const rows = [{ name: 'A' }, { name: 'B' }];
      const stats = generateStats(rows);
      expect(stats.totalRows).toBe(2);
    });

    it('should count member types', () => {
      const rows = [
        { name: 'A', memberType: 'member' },
        { name: 'B', memberType: 'member' },
        { name: 'C', memberType: 'interested' }
      ];
      
      const stats = generateStats(rows);
      
      expect(stats.memberTypes.member).toBe(2);
      expect(stats.memberTypes.interested).toBe(1);
    });

    it('should calculate data completeness', () => {
      const rows = [
        { name: 'A', email: 'a@test.com', phone: '123' },
        { name: 'B', email: 'b@test.com' }
      ];
      
      const stats = generateStats(rows);
      
      expect(stats.dataCompleteness.email).toBe(100);
      expect(stats.dataCompleteness.phone).toBe(50);
    });
  });

  describe('processExcel', () => {
    it('should process valid Excel data', () => {
      const data = [
        { Nome: 'João Silva', Email: 'joao@test.com', Igreja: 'Central' },
        { Nome: 'Maria Santos', Email: 'maria@test.com', Igreja: 'Norte' }
      ];
      
      const result = processExcel(data);
      
      expect(result.success).toBe(true);
      expect(result.data.length).toBe(2);
      expect(result.stats.totalRows).toBe(2);
    });

    it('should fail for empty data', () => {
      const result = processExcel([]);
      expect(result.success).toBe(false);
    });

    it('should fail for null data', () => {
      const result = processExcel(null);
      expect(result.success).toBe(false);
    });

    it('should track unmapped columns', () => {
      const data = [
        { Nome: 'João', ColunaDesconhecida: 'valor' }
      ];
      
      const result = processExcel(data);
      
      expect(result.columnMapping.unmapped).toContain('ColunaDesconhecida');
    });

    it('should include church list in stats', () => {
      const data = [
        { Nome: 'João', Igreja: 'Central' },
        { Nome: 'Maria', Igreja: 'Norte' }
      ];
      
      const result = processExcel(data);
      
      expect(result.stats.churches).toBe(2);
      expect(result.stats.churchList.length).toBe(2);
    });
  });
});
