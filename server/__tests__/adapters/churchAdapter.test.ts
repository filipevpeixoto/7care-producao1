/**
 * Testes de Adaptadores - Church Adapter
 * Cobre transformações de dados de igreja
 */

import { describe, it, expect } from '@jest/globals';

describe('Church Adapter', () => {
  interface ChurchDB {
    id: number;
    name: string;
    district_id: number;
    address_street: string;
    address_number: string;
    address_city: string;
    address_state: string;
    address_zip: string;
    phone: string | null;
    email: string | null;
    member_count: number;
    created_at: Date;
    updated_at: Date;
  }

  interface ChurchDTO {
    id: number;
    name: string;
    districtId: number;
    address: {
      street: string;
      number: string;
      city: string;
      state: string;
      zip: string;
      full: string;
    };
    contact: {
      phone?: string;
      email?: string;
    };
    memberCount: number;
    createdAt: string;
    updatedAt: string;
  }

  const toDTO = (db: ChurchDB): ChurchDTO => ({
    id: db.id,
    name: db.name,
    districtId: db.district_id,
    address: {
      street: db.address_street,
      number: db.address_number,
      city: db.address_city,
      state: db.address_state,
      zip: db.address_zip,
      full: `${db.address_street}, ${db.address_number} - ${db.address_city}/${db.address_state}`,
    },
    contact: {
      ...(db.phone && { phone: db.phone }),
      ...(db.email && { email: db.email }),
    },
    memberCount: db.member_count,
    createdAt: db.created_at.toISOString(),
    updatedAt: db.updated_at.toISOString(),
  });

  const toDB = (dto: Partial<ChurchDTO>): Partial<ChurchDB> => ({
    ...(dto.name && { name: dto.name }),
    ...(dto.districtId && { district_id: dto.districtId }),
    ...(dto.address && {
      address_street: dto.address.street,
      address_number: dto.address.number,
      address_city: dto.address.city,
      address_state: dto.address.state,
      address_zip: dto.address.zip,
    }),
    ...(dto.contact?.phone !== undefined && { phone: dto.contact.phone || null }),
    ...(dto.contact?.email !== undefined && { email: dto.contact.email || null }),
  });

  describe('toDTO - Database para API', () => {
    it('deve converter campos básicos', () => {
      const db: ChurchDB = {
        id: 1,
        name: 'Igreja Central',
        district_id: 5,
        address_street: 'Rua Principal',
        address_number: '100',
        address_city: 'São Paulo',
        address_state: 'SP',
        address_zip: '01234-567',
        phone: '11999999999',
        email: 'contato@igreja.com',
        member_count: 150,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-15'),
      };

      const dto = toDTO(db);

      expect(dto.id).toBe(1);
      expect(dto.name).toBe('Igreja Central');
      expect(dto.districtId).toBe(5);
    });

    it('deve agrupar endereço em objeto', () => {
      const db: ChurchDB = {
        id: 1,
        name: 'Igreja Central',
        district_id: 5,
        address_street: 'Rua Principal',
        address_number: '100',
        address_city: 'São Paulo',
        address_state: 'SP',
        address_zip: '01234-567',
        phone: null,
        email: null,
        member_count: 150,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const dto = toDTO(db);

      expect(dto.address.street).toBe('Rua Principal');
      expect(dto.address.city).toBe('São Paulo');
      expect(dto.address.full).toBe('Rua Principal, 100 - São Paulo/SP');
    });

    it('deve agrupar contato em objeto', () => {
      const db: ChurchDB = {
        id: 1,
        name: 'Igreja Central',
        district_id: 5,
        address_street: 'Rua Principal',
        address_number: '100',
        address_city: 'São Paulo',
        address_state: 'SP',
        address_zip: '01234-567',
        phone: '11999999999',
        email: 'contato@igreja.com',
        member_count: 150,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const dto = toDTO(db);

      expect(dto.contact.phone).toBe('11999999999');
      expect(dto.contact.email).toBe('contato@igreja.com');
    });

    it('deve omitir campos de contato nulos', () => {
      const db: ChurchDB = {
        id: 1,
        name: 'Igreja Central',
        district_id: 5,
        address_street: 'Rua Principal',
        address_number: '100',
        address_city: 'São Paulo',
        address_state: 'SP',
        address_zip: '01234-567',
        phone: null,
        email: null,
        member_count: 150,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const dto = toDTO(db);

      expect(dto.contact.phone).toBeUndefined();
      expect(dto.contact.email).toBeUndefined();
    });

    it('deve converter datas para ISO string', () => {
      const db: ChurchDB = {
        id: 1,
        name: 'Igreja Central',
        district_id: 5,
        address_street: 'Rua',
        address_number: '1',
        address_city: 'SP',
        address_state: 'SP',
        address_zip: '00000-000',
        phone: null,
        email: null,
        member_count: 0,
        created_at: new Date('2024-01-01T10:00:00Z'),
        updated_at: new Date('2024-01-15T15:30:00Z'),
      };

      const dto = toDTO(db);

      expect(dto.createdAt).toBe('2024-01-01T10:00:00.000Z');
      expect(dto.updatedAt).toBe('2024-01-15T15:30:00.000Z');
    });
  });

  describe('toDB - API para Database', () => {
    it('deve converter campos básicos', () => {
      const dto: Partial<ChurchDTO> = {
        name: 'Nova Igreja',
        districtId: 3,
      };

      const db = toDB(dto);

      expect(db.name).toBe('Nova Igreja');
      expect(db.district_id).toBe(3);
    });

    it('deve desagrupar endereço', () => {
      const dto: Partial<ChurchDTO> = {
        address: {
          street: 'Av Brasil',
          number: '500',
          city: 'Rio de Janeiro',
          state: 'RJ',
          zip: '20000-000',
          full: '',
        },
      };

      const db = toDB(dto);

      expect(db.address_street).toBe('Av Brasil');
      expect(db.address_number).toBe('500');
      expect(db.address_city).toBe('Rio de Janeiro');
      expect(db.address_state).toBe('RJ');
      expect(db.address_zip).toBe('20000-000');
    });

    it('deve incluir apenas campos fornecidos', () => {
      const dto: Partial<ChurchDTO> = {
        name: 'Atualização Parcial',
      };

      const db = toDB(dto);

      expect(db.name).toBe('Atualização Parcial');
      expect(db.district_id).toBeUndefined();
      expect(db.address_street).toBeUndefined();
    });

    it('deve converter contato vazio para null', () => {
      const dto: Partial<ChurchDTO> = {
        contact: {
          phone: '',
          email: '',
        },
      };

      const db = toDB(dto);

      expect(db.phone).toBeNull();
      expect(db.email).toBeNull();
    });
  });

  describe('Conversão em Lote', () => {
    it('deve converter lista para DTO', () => {
      const dbList: ChurchDB[] = [
        {
          id: 1,
          name: 'Igreja A',
          district_id: 1,
          address_street: 'Rua 1',
          address_number: '1',
          address_city: 'SP',
          address_state: 'SP',
          address_zip: '00000-000',
          phone: null,
          email: null,
          member_count: 100,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 2,
          name: 'Igreja B',
          district_id: 1,
          address_street: 'Rua 2',
          address_number: '2',
          address_city: 'SP',
          address_state: 'SP',
          address_zip: '00000-001',
          phone: null,
          email: null,
          member_count: 200,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      const dtoList = dbList.map(toDTO);

      expect(dtoList).toHaveLength(2);
      expect(dtoList[0].name).toBe('Igreja A');
      expect(dtoList[1].name).toBe('Igreja B');
    });
  });

  describe('Validações de Formato', () => {
    it('deve validar formato de CEP', () => {
      const validateZip = (zip: string) => /^\d{5}-?\d{3}$/.test(zip);

      expect(validateZip('01234-567')).toBe(true);
      expect(validateZip('01234567')).toBe(true);
      expect(validateZip('1234-567')).toBe(false);
      expect(validateZip('abcde-fgh')).toBe(false);
    });

    it('deve validar formato de estado', () => {
      const validStates = [
        'AC',
        'AL',
        'AP',
        'AM',
        'BA',
        'CE',
        'DF',
        'ES',
        'GO',
        'MA',
        'MT',
        'MS',
        'MG',
        'PA',
        'PB',
        'PR',
        'PE',
        'PI',
        'RJ',
        'RN',
        'RS',
        'RO',
        'RR',
        'SC',
        'SP',
        'SE',
        'TO',
      ];

      const validateState = (state: string) => validStates.includes(state.toUpperCase());

      expect(validateState('SP')).toBe(true);
      expect(validateState('sp')).toBe(true);
      expect(validateState('XX')).toBe(false);
    });

    it('deve normalizar telefone', () => {
      const normalizePhone = (phone: string) => phone.replace(/\D/g, '');

      expect(normalizePhone('(11) 99999-9999')).toBe('11999999999');
      expect(normalizePhone('+55 11 99999-9999')).toBe('5511999999999');
    });
  });

  describe('Transformações Especiais', () => {
    it('deve calcular estatísticas da igreja', () => {
      const church = {
        id: 1,
        memberCount: 150,
        activeMembers: 120,
        events: 48,
        prayerRequests: 200,
      };

      const stats = {
        engagementRate: (church.activeMembers / church.memberCount) * 100,
        eventsPerMonth: church.events / 12,
        prayersPerMember: church.prayerRequests / church.memberCount,
      };

      expect(stats.engagementRate).toBe(80);
      expect(stats.eventsPerMonth).toBe(4);
      expect(stats.prayersPerMember).toBeCloseTo(1.33, 1);
    });

    it('deve formatar para exportação CSV', () => {
      const church: ChurchDTO = {
        id: 1,
        name: 'Igreja, Central', // Nome com vírgula
        districtId: 5,
        address: {
          street: 'Rua Principal',
          number: '100',
          city: 'São Paulo',
          state: 'SP',
          zip: '01234-567',
          full: 'Rua Principal, 100 - São Paulo/SP',
        },
        contact: { phone: '11999999999' },
        memberCount: 150,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-15T00:00:00Z',
      };

      const toCSVRow = (c: ChurchDTO) => {
        const escapeCsv = (val: string) => (val.includes(',') ? `"${val}"` : val);

        return [
          c.id,
          escapeCsv(c.name),
          c.districtId,
          escapeCsv(c.address.full),
          c.memberCount,
        ].join(',');
      };

      const row = toCSVRow(church);
      expect(row).toBe('1,"Igreja, Central",5,"Rua Principal, 100 - São Paulo/SP",150');
    });
  });
});
