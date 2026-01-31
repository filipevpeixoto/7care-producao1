/**
 * Testes de Adaptadores - User Adapter
 * Cobre transformações de dados de usuário
 */

import { describe, it, expect } from '@jest/globals';

describe('User Adapter', () => {
  interface UserDB {
    id: number;
    username: string;
    username_normalized: string;
    email: string;
    password_hash: string;
    first_name: string;
    last_name: string;
    phone: string | null;
    birth_date: Date | null;
    gender: string | null;
    role: string;
    church_id: number | null;
    district_id: number | null;
    profile_image: string | null;
    is_active: boolean;
    is_verified: boolean;
    last_login: Date | null;
    points: number;
    created_at: Date;
    updated_at: Date;
  }

  interface UserDTO {
    id: number;
    username: string;
    email: string;
    profile: {
      firstName: string;
      lastName: string;
      fullName: string;
      phone?: string;
      birthDate?: string;
      gender?: string;
      avatar?: string;
    };
    membership: {
      role: string;
      churchId?: number;
      districtId?: number;
    };
    status: {
      isActive: boolean;
      isVerified: boolean;
      lastLogin?: string;
    };
    gamification: {
      points: number;
      level: number;
    };
    createdAt: string;
    updatedAt: string;
  }

  interface UserPublicDTO {
    id: number;
    username: string;
    fullName: string;
    avatar?: string;
    role: string;
  }

  const calculateLevel = (points: number): number => {
    const thresholds = [0, 50, 150, 300, 500, 750, 1000, 1500, 2000, 3000];
    for (let i = thresholds.length - 1; i >= 0; i--) {
      if (points >= thresholds[i]) return i + 1;
    }
    return 1;
  };

  const toDTO = (db: UserDB): UserDTO => ({
    id: db.id,
    username: db.username,
    email: db.email,
    profile: {
      firstName: db.first_name,
      lastName: db.last_name,
      fullName: `${db.first_name} ${db.last_name}`,
      ...(db.phone && { phone: db.phone }),
      ...(db.birth_date && { birthDate: db.birth_date.toISOString().split('T')[0] }),
      ...(db.gender && { gender: db.gender }),
      ...(db.profile_image && { avatar: db.profile_image }),
    },
    membership: {
      role: db.role,
      ...(db.church_id && { churchId: db.church_id }),
      ...(db.district_id && { districtId: db.district_id }),
    },
    status: {
      isActive: db.is_active,
      isVerified: db.is_verified,
      ...(db.last_login && { lastLogin: db.last_login.toISOString() }),
    },
    gamification: {
      points: db.points,
      level: calculateLevel(db.points),
    },
    createdAt: db.created_at.toISOString(),
    updatedAt: db.updated_at.toISOString(),
  });

  const toPublicDTO = (db: UserDB): UserPublicDTO => ({
    id: db.id,
    username: db.username,
    fullName: `${db.first_name} ${db.last_name}`,
    ...(db.profile_image && { avatar: db.profile_image }),
    role: db.role,
  });

  const toDB = (dto: Partial<UserDTO>): Partial<UserDB> => ({
    ...(dto.username && {
      username: dto.username,
      username_normalized: dto.username.toLowerCase(),
    }),
    ...(dto.email && { email: dto.email }),
    ...(dto.profile?.firstName && { first_name: dto.profile.firstName }),
    ...(dto.profile?.lastName && { last_name: dto.profile.lastName }),
    ...(dto.profile?.phone !== undefined && { phone: dto.profile.phone || null }),
    ...(dto.profile?.birthDate && { birth_date: new Date(dto.profile.birthDate) }),
    ...(dto.profile?.gender !== undefined && { gender: dto.profile.gender || null }),
    ...(dto.profile?.avatar !== undefined && { profile_image: dto.profile.avatar || null }),
    ...(dto.membership?.role && { role: dto.membership.role }),
    ...(dto.membership?.churchId !== undefined && { church_id: dto.membership.churchId || null }),
    ...(dto.membership?.districtId !== undefined && {
      district_id: dto.membership.districtId || null,
    }),
    ...(dto.status?.isActive !== undefined && { is_active: dto.status.isActive }),
    ...(dto.status?.isVerified !== undefined && { is_verified: dto.status.isVerified }),
  });

  describe('toDTO - Database para API', () => {
    const baseUser: UserDB = {
      id: 1,
      username: 'joaosilva',
      username_normalized: 'joaosilva',
      email: 'joao@test.com',
      password_hash: 'hashed_password',
      first_name: 'João',
      last_name: 'Silva',
      phone: '11999999999',
      birth_date: new Date('1990-05-15'),
      gender: 'male',
      role: 'member',
      church_id: 1,
      district_id: 5,
      profile_image: '/uploads/avatar.jpg',
      is_active: true,
      is_verified: true,
      last_login: new Date('2024-01-15T10:00:00Z'),
      points: 350,
      created_at: new Date('2023-01-01'),
      updated_at: new Date('2024-01-15'),
    };

    it('deve converter campos básicos', () => {
      const dto = toDTO(baseUser);

      expect(dto.id).toBe(1);
      expect(dto.username).toBe('joaosilva');
      expect(dto.email).toBe('joao@test.com');
    });

    it('deve NUNCA incluir password_hash', () => {
      const dto = toDTO(baseUser);
      expect((dto as unknown as Record<string, unknown>)['password_hash']).toBeUndefined();
      expect((dto as unknown as Record<string, unknown>)['passwordHash']).toBeUndefined();
    });

    it('deve agrupar dados do perfil', () => {
      const dto = toDTO(baseUser);

      expect(dto.profile.firstName).toBe('João');
      expect(dto.profile.lastName).toBe('Silva');
      expect(dto.profile.fullName).toBe('João Silva');
      expect(dto.profile.phone).toBe('11999999999');
      expect(dto.profile.birthDate).toBe('1990-05-15');
      expect(dto.profile.gender).toBe('male');
      expect(dto.profile.avatar).toBe('/uploads/avatar.jpg');
    });

    it('deve agrupar dados de membership', () => {
      const dto = toDTO(baseUser);

      expect(dto.membership.role).toBe('member');
      expect(dto.membership.churchId).toBe(1);
      expect(dto.membership.districtId).toBe(5);
    });

    it('deve agrupar status', () => {
      const dto = toDTO(baseUser);

      expect(dto.status.isActive).toBe(true);
      expect(dto.status.isVerified).toBe(true);
      expect(dto.status.lastLogin).toBeDefined();
    });

    it('deve calcular nível baseado em pontos', () => {
      const dto = toDTO(baseUser);

      expect(dto.gamification.points).toBe(350);
      expect(dto.gamification.level).toBe(4); // 350 pontos = nível 4 (300-499)
    });

    it('deve omitir campos nulos', () => {
      const minimalUser: UserDB = {
        ...baseUser,
        phone: null,
        birth_date: null,
        gender: null,
        church_id: null,
        district_id: null,
        profile_image: null,
        last_login: null,
      };

      const dto = toDTO(minimalUser);

      expect(dto.profile.phone).toBeUndefined();
      expect(dto.profile.birthDate).toBeUndefined();
      expect(dto.profile.gender).toBeUndefined();
      expect(dto.profile.avatar).toBeUndefined();
      expect(dto.membership.churchId).toBeUndefined();
      expect(dto.status.lastLogin).toBeUndefined();
    });
  });

  describe('toPublicDTO - Dados públicos', () => {
    const user: UserDB = {
      id: 1,
      username: 'maria',
      username_normalized: 'maria',
      email: 'maria@test.com',
      password_hash: 'secret',
      first_name: 'Maria',
      last_name: 'Santos',
      phone: '11888888888',
      birth_date: new Date('1985-03-20'),
      gender: 'female',
      role: 'pastor',
      church_id: 2,
      district_id: 3,
      profile_image: '/avatar.jpg',
      is_active: true,
      is_verified: true,
      last_login: new Date(),
      points: 1000,
      created_at: new Date(),
      updated_at: new Date(),
    };

    it('deve incluir apenas dados públicos', () => {
      const publicDto = toPublicDTO(user);

      expect(publicDto.id).toBe(1);
      expect(publicDto.username).toBe('maria');
      expect(publicDto.fullName).toBe('Maria Santos');
      expect(publicDto.avatar).toBe('/avatar.jpg');
      expect(publicDto.role).toBe('pastor');
    });

    it('deve NUNCA incluir dados sensíveis', () => {
      const publicDto = toPublicDTO(user);

      expect((publicDto as unknown as Record<string, unknown>)['email']).toBeUndefined();
      expect((publicDto as unknown as Record<string, unknown>)['phone']).toBeUndefined();
      expect((publicDto as unknown as Record<string, unknown>)['birthDate']).toBeUndefined();
      expect((publicDto as unknown as Record<string, unknown>)['password']).toBeUndefined();
    });
  });

  describe('toDB - API para Database', () => {
    it('deve converter campos de perfil', () => {
      const dto: Partial<UserDTO> = {
        profile: {
          firstName: 'Carlos',
          lastName: 'Lima',
          fullName: 'Carlos Lima',
          phone: '11777777777',
        },
      };

      const db = toDB(dto);

      expect(db.first_name).toBe('Carlos');
      expect(db.last_name).toBe('Lima');
      expect(db.phone).toBe('11777777777');
    });

    it('deve normalizar username', () => {
      const dto: Partial<UserDTO> = {
        username: 'JoãoSilva',
      };

      const db = toDB(dto);

      expect(db.username).toBe('JoãoSilva');
      expect(db.username_normalized).toBe('joãosilva');
    });

    it('deve converter data de nascimento', () => {
      const dto: Partial<UserDTO> = {
        profile: {
          firstName: 'Test',
          lastName: 'User',
          fullName: 'Test User',
          birthDate: '1995-08-25',
        },
      };

      const db = toDB(dto);

      expect(db.birth_date).toBeInstanceOf(Date);
      expect(db.birth_date?.getFullYear()).toBe(1995);
    });

    it('deve converter membership', () => {
      const dto: Partial<UserDTO> = {
        membership: {
          role: 'elder',
          churchId: 5,
          districtId: 10,
        },
      };

      const db = toDB(dto);

      expect(db.role).toBe('elder');
      expect(db.church_id).toBe(5);
      expect(db.district_id).toBe(10);
    });

    it('deve permitir remover valores (set to null)', () => {
      const dto: Partial<UserDTO> = {
        profile: {
          firstName: 'Test',
          lastName: 'User',
          fullName: 'Test User',
          phone: '', // Vazio = remover
        },
      };

      const db = toDB(dto);

      expect(db.phone).toBeNull();
    });
  });

  describe('Cálculo de Nível', () => {
    it('deve calcular níveis corretamente', () => {
      expect(calculateLevel(0)).toBe(1);
      expect(calculateLevel(49)).toBe(1);
      expect(calculateLevel(50)).toBe(2);
      expect(calculateLevel(149)).toBe(2);
      expect(calculateLevel(150)).toBe(3);
      expect(calculateLevel(500)).toBe(5);
      expect(calculateLevel(1000)).toBe(7);
      expect(calculateLevel(3000)).toBe(10);
      expect(calculateLevel(5000)).toBe(10); // Máximo
    });
  });

  describe('Formatações Especiais', () => {
    it('deve formatar nome para exibição', () => {
      const formatDisplayName = (firstName: string, lastName: string, maxLength: number = 20) => {
        const fullName = `${firstName} ${lastName}`;
        if (fullName.length <= maxLength) return fullName;
        return `${firstName} ${lastName.charAt(0)}.`;
      };

      expect(formatDisplayName('João', 'Silva')).toBe('João Silva');
      expect(formatDisplayName('João', 'Evangelista Santos Pereira')).toBe('João E.');
    });

    it('deve mascarar email para exibição', () => {
      const maskEmail = (email: string) => {
        const [local, domain] = email.split('@');
        const masked = `${local.substring(0, 2)}***`;
        return `${masked}@${domain}`;
      };

      expect(maskEmail('joao@test.com')).toBe('jo***@test.com');
    });

    it('deve mascarar telefone', () => {
      const maskPhone = (phone: string) => {
        if (phone.length < 8) return phone;
        return `${phone.substring(0, 2)}*****${phone.substring(phone.length - 2)}`;
      };

      expect(maskPhone('11999999999')).toBe('11*****99');
    });

    it('deve calcular idade', () => {
      const calculateAge = (birthDate: Date): number => {
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        return age;
      };

      const birthDate = new Date('1990-01-15');
      const age = calculateAge(birthDate);

      expect(age).toBeGreaterThanOrEqual(34);
    });
  });

  describe('Validações', () => {
    it('deve validar roles permitidos', () => {
      const validRoles = ['member', 'elder', 'deacon', 'pastor', 'admin', 'superadmin'];

      const isValidRole = (role: string) => validRoles.includes(role);

      expect(isValidRole('member')).toBe(true);
      expect(isValidRole('pastor')).toBe(true);
      expect(isValidRole('invalid')).toBe(false);
    });

    it('deve validar formato de email', () => {
      const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('test@')).toBe(false);
    });

    it('deve validar gênero', () => {
      const validGenders = ['male', 'female', 'other', 'prefer_not_to_say'];

      expect(validGenders.includes('male')).toBe(true);
      expect(validGenders.includes('invalid')).toBe(false);
    });
  });

  describe('Conversão em Lote', () => {
    it('deve converter lista preservando ordem', () => {
      const users: UserDB[] = [
        {
          id: 1,
          username: 'a',
          username_normalized: 'a',
          email: 'a@test.com',
          password_hash: 'x',
          first_name: 'A',
          last_name: 'User',
          phone: null,
          birth_date: null,
          gender: null,
          role: 'member',
          church_id: null,
          district_id: null,
          profile_image: null,
          is_active: true,
          is_verified: true,
          last_login: null,
          points: 0,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 2,
          username: 'b',
          username_normalized: 'b',
          email: 'b@test.com',
          password_hash: 'x',
          first_name: 'B',
          last_name: 'User',
          phone: null,
          birth_date: null,
          gender: null,
          role: 'member',
          church_id: null,
          district_id: null,
          profile_image: null,
          is_active: true,
          is_verified: true,
          last_login: null,
          points: 0,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      const dtos = users.map(toDTO);

      expect(dtos).toHaveLength(2);
      expect(dtos[0].id).toBe(1);
      expect(dtos[1].id).toBe(2);
    });
  });
});
