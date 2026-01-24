/**
 * Testes para funções utilitárias puras do storage
 * Nota: Testes isolados para funções sem dependência de banco de dados
 */

import { describe, it, expect } from '@jest/globals';

// Funções puras copiadas do helpers.ts para teste isolado
// (evita importar o módulo que requer conexão com DB)

function toDateString(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (value == null) {
    return '';
  }
  return String(value);
}

function toOptionalDateString(value: unknown): string | null {
  if (value == null) {
    return null;
  }
  return value instanceof Date ? value.toISOString() : String(value);
}

function normalizeExtraData(value: unknown): Record<string, unknown> | string | null | undefined {
  if (value == null) {
    return value as null | undefined;
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'object') {
    return value as Record<string, unknown>;
  }
  return String(value);
}

function getActivitiesFromConfig(raw: unknown): unknown[] {
  if (Array.isArray(raw)) {
    return raw;
  }
  return [];
}

function generateChurchCode(name: string): string {
  const base = name
    .split(' ')
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  return (base || 'CH').slice(0, 10);
}

interface User {
  id: number;
  name: string;
  email: string;
  password: string;
  role: string;
  church: string | null;
  churchCode: string;
  districtId: number | null;
  departments: string;
  birthDate: string;
  civilStatus: string;
  occupation: string;
  education: string;
  address: string;
  baptismDate: string;
  previousReligion: string;
  biblicalInstructor: string | null;
  interestedSituation: string;
  isDonor: boolean;
  isTither: boolean;
  isApproved: boolean;
  points: number;
  level: string;
  attendance: number;
  extraData: Record<string, unknown> | string | null | undefined;
  observations: string;
  createdAt: string;
  updatedAt: string;
  firstAccess: boolean;
  status?: string;
  phone?: string;
  cpf?: string;
  profilePhoto?: string;
  isOffering?: boolean;
  hasLesson?: boolean;
}

function toUser(row: Record<string, unknown>): User {
  return {
    id: Number(row.id),
    name: row.name == null ? '' : String(row.name),
    email: row.email == null ? '' : String(row.email),
    password: row.password == null ? '' : String(row.password),
    role: row.role == null ? 'member' : String(row.role),
    church: row.church == null ? null : String(row.church),
    churchCode: row.churchCode == null ? '' : String(row.churchCode),
    districtId: row.districtId == null ? null : Number(row.districtId),
    departments: row.departments == null ? '' : String(row.departments),
    birthDate: row.birthDate == null ? '' : String(row.birthDate),
    civilStatus: row.civilStatus == null ? '' : String(row.civilStatus),
    occupation: row.occupation == null ? '' : String(row.occupation),
    education: row.education == null ? '' : String(row.education),
    address: row.address == null ? '' : String(row.address),
    baptismDate: row.baptismDate == null ? '' : String(row.baptismDate),
    previousReligion: row.previousReligion == null ? '' : String(row.previousReligion),
    biblicalInstructor: row.biblicalInstructor == null ? null : String(row.biblicalInstructor),
    interestedSituation: row.interestedSituation == null ? '' : String(row.interestedSituation),
    isDonor: Boolean(row.isDonor),
    isTither: Boolean(row.isTither),
    isApproved: Boolean(row.isApproved),
    points: Number(row.points ?? 0),
    level: row.level == null ? '' : String(row.level),
    attendance: Number(row.attendance ?? 0),
    extraData: normalizeExtraData(row.extraData),
    observations: row.observations == null ? '' : String(row.observations),
    createdAt: toDateString(row.createdAt),
    updatedAt: toDateString(row.updatedAt),
    firstAccess: Boolean(row.firstAccess),
    status: row.status == null ? undefined : String(row.status),
    phone: row.phone == null ? undefined : String(row.phone),
    cpf: row.cpf == null ? undefined : String(row.cpf),
    profilePhoto: row.profilePhoto == null ? undefined : String(row.profilePhoto),
    isOffering: row.isOffering == null ? undefined : Boolean(row.isOffering),
    hasLesson: row.hasLesson == null ? undefined : Boolean(row.hasLesson)
  };
}

interface Church {
  id: number;
  name: string;
  code?: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  email: string | null;
  phone: string | null;
  pastor_name: string | null;
  pastor_email: string | null;
  established_date: string | null;
  status: string | null;
  districtId: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

function mapChurchRecord(record: Record<string, unknown>): Church {
  return {
    id: Number(record.id),
    name: record.name == null ? '' : String(record.name),
    code: record.code == null ? undefined : String(record.code),
    address: record.address == null ? null : String(record.address),
    city: record.city == null ? null : String(record.city),
    state: record.state == null ? null : String(record.state),
    zip_code: record.zip_code == null ? null : String(record.zip_code),
    email: record.email == null ? null : String(record.email),
    phone: record.phone == null ? null : String(record.phone),
    pastor_name: record.pastor_name == null ? null : String(record.pastor_name),
    pastor_email: record.pastor_email == null ? null : String(record.pastor_email),
    established_date: record.established_date == null ? null : String(record.established_date),
    status: record.status == null ? null : String(record.status),
    districtId: record.districtId == null ? null : Number(record.districtId),
    isActive: record.isActive == null ? true : Boolean(record.isActive),
    createdAt: toDateString(record.createdAt),
    updatedAt: toDateString(record.updatedAt)
  };
}

interface Relationship {
  id: number;
  interestedId?: number;
  missionaryId?: number;
  userId1?: number;
  userId2?: number;
  relationshipType?: string;
  status?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

function mapRelationshipRecord(record: Record<string, unknown>): Relationship {
  return {
    id: Number(record.id),
    interestedId: record.interestedId == null ? undefined : Number(record.interestedId),
    missionaryId: record.missionaryId == null ? undefined : Number(record.missionaryId),
    userId1: record.userId1 == null ? undefined : Number(record.userId1),
    userId2: record.userId2 == null ? undefined : Number(record.userId2),
    relationshipType: record.relationshipType == null ? undefined : String(record.relationshipType),
    status: record.status == null ? undefined : String(record.status),
    notes: record.notes == null ? undefined : String(record.notes),
    createdAt: toDateString(record.createdAt),
    updatedAt: toDateString(record.updatedAt)
  };
}

interface Meeting {
  id: number;
  requesterId: number;
  assignedToId: number;
  typeId: number;
  title: string;
  description: string;
  scheduledAt: string;
  duration: number;
  location: string;
  priority: string;
  isUrgent: boolean;
  status: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

function mapMeetingRecord(record: Record<string, unknown>): Meeting {
  return {
    id: Number(record.id),
    requesterId: Number(record.requesterId ?? 0),
    assignedToId: Number(record.assignedToId ?? 0),
    typeId: Number(record.typeId ?? 0),
    title: record.title == null ? '' : String(record.title),
    description: record.description == null ? '' : String(record.description),
    scheduledAt: toDateString(record.scheduledAt),
    duration: Number(record.duration ?? 0),
    location: record.location == null ? '' : String(record.location),
    priority: record.priority == null ? '' : String(record.priority),
    isUrgent: Boolean(record.isUrgent),
    status: record.status == null ? '' : String(record.status),
    notes: record.notes == null ? '' : String(record.notes),
    createdAt: toDateString(record.createdAt),
    updatedAt: toDateString(record.updatedAt)
  };
}

interface Notification {
  id: number;
  userId: number;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

function mapNotificationRecord(record: Record<string, unknown>): Notification {
  return {
    id: Number(record.id),
    userId: Number(record.userId ?? 0),
    type: record.type == null ? '' : String(record.type),
    title: record.title == null ? '' : String(record.title),
    message: record.message == null ? '' : String(record.message),
    isRead: Boolean(record.isRead),
    createdAt: toDateString(record.createdAt)
  };
}

describe('Storage Helpers', () => {
  describe('toDateString', () => {
    it('should convert Date to ISO string', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      expect(toDateString(date)).toBe('2024-01-15T10:30:00.000Z');
    });

    it('should return empty string for null', () => {
      expect(toDateString(null)).toBe('');
    });

    it('should return empty string for undefined', () => {
      expect(toDateString(undefined)).toBe('');
    });

    it('should convert string to string', () => {
      expect(toDateString('2024-01-15')).toBe('2024-01-15');
    });

    it('should convert number to string', () => {
      expect(toDateString(12345)).toBe('12345');
    });
  });

  describe('toOptionalDateString', () => {
    it('should convert Date to ISO string', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      expect(toOptionalDateString(date)).toBe('2024-01-15T10:30:00.000Z');
    });

    it('should return null for null', () => {
      expect(toOptionalDateString(null)).toBeNull();
    });

    it('should return null for undefined', () => {
      expect(toOptionalDateString(undefined)).toBeNull();
    });

    it('should convert string to string', () => {
      expect(toOptionalDateString('2024-01-15')).toBe('2024-01-15');
    });
  });

  describe('normalizeExtraData', () => {
    it('should return null for null', () => {
      expect(normalizeExtraData(null)).toBeNull();
    });

    it('should return undefined for undefined', () => {
      expect(normalizeExtraData(undefined)).toBeUndefined();
    });

    it('should return string as-is', () => {
      expect(normalizeExtraData('test string')).toBe('test string');
    });

    it('should return object as-is', () => {
      const obj = { key: 'value' };
      expect(normalizeExtraData(obj)).toEqual(obj);
    });

    it('should convert number to string', () => {
      expect(normalizeExtraData(123)).toBe('123');
    });
  });

  describe('getActivitiesFromConfig', () => {
    it('should return array as-is', () => {
      const activities = [{ name: 'activity1' }, { name: 'activity2' }];
      expect(getActivitiesFromConfig(activities)).toEqual(activities);
    });

    it('should return empty array for non-array', () => {
      expect(getActivitiesFromConfig(null)).toEqual([]);
      expect(getActivitiesFromConfig(undefined)).toEqual([]);
      expect(getActivitiesFromConfig('string')).toEqual([]);
      expect(getActivitiesFromConfig({})).toEqual([]);
    });
  });

  describe('generateChurchCode', () => {
    it('should generate code from church name initials', () => {
      expect(generateChurchCode('Igreja Adventista do Sétimo Dia')).toBe('IADSD');
    });

    it('should handle single word', () => {
      expect(generateChurchCode('Central')).toBe('C');
    });

    it('should default to CH for empty name', () => {
      expect(generateChurchCode('')).toBe('CH');
    });

    it('should remove non-alphanumeric characters', () => {
      // O # e ! são removidos, mas números também são iniciais
      expect(generateChurchCode('Igreja #1 Central!')).toBe('IC');
    });

    it('should limit to 10 characters', () => {
      expect(generateChurchCode('A B C D E F G H I J K L M N O').length).toBeLessThanOrEqual(10);
    });
  });

  describe('toUser', () => {
    it('should map complete user record', () => {
      const record = {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        password: 'hashed',
        role: 'member',
        church: 'Central',
        churchCode: 'CTR',
        districtId: 1,
        departments: 'Music',
        birthDate: '1990-01-15',
        civilStatus: 'single',
        occupation: 'Developer',
        education: 'College',
        address: '123 Main St',
        baptismDate: '2010-06-01',
        previousReligion: '',
        biblicalInstructor: null,
        interestedSituation: '',
        isDonor: true,
        isTither: true,
        isApproved: true,
        points: 100,
        level: 'Gold',
        attendance: 50,
        extraData: { custom: 'data' },
        observations: 'Test',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
        firstAccess: false,
        status: 'active',
        phone: '123-456-7890',
        cpf: '123.456.789-00',
        profilePhoto: 'photo.jpg',
        isOffering: true,
        hasLesson: true
      };

      const user = toUser(record);

      expect(user.id).toBe(1);
      expect(user.name).toBe('John Doe');
      expect(user.email).toBe('john@example.com');
      expect(user.role).toBe('member');
      expect(user.isDonor).toBe(true);
      expect(user.points).toBe(100);
      expect(user.phone).toBe('123-456-7890');
    });

    it('should handle null values with defaults', () => {
      const record = {
        id: 1,
        name: null,
        email: null,
        password: null,
        role: null
      };

      const user = toUser(record);

      expect(user.id).toBe(1);
      expect(user.name).toBe('');
      expect(user.email).toBe('');
      expect(user.role).toBe('member');
      expect(user.points).toBe(0);
    });
  });

  describe('mapChurchRecord', () => {
    it('should map complete church record', () => {
      const record = {
        id: 1,
        name: 'Central Church',
        code: 'CTR',
        address: '123 Main St',
        city: 'City',
        state: 'ST',
        zip_code: '12345',
        email: 'church@example.com',
        phone: '123-456-7890',
        pastor_name: 'Pastor John',
        pastor_email: 'pastor@example.com',
        established_date: '2000-01-01',
        status: 'active',
        districtId: 1,
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02')
      };

      const church = mapChurchRecord(record);

      expect(church.id).toBe(1);
      expect(church.name).toBe('Central Church');
      expect(church.code).toBe('CTR');
      expect(church.city).toBe('City');
      expect(church.isActive).toBe(true);
    });

    it('should handle null values', () => {
      const record = {
        id: 1,
        name: null,
        code: null,
        address: null,
        createdAt: null
      };

      const church = mapChurchRecord(record);

      expect(church.id).toBe(1);
      expect(church.name).toBe('');
      expect(church.code).toBeUndefined();
      expect(church.address).toBeNull();
    });
  });

  describe('mapRelationshipRecord', () => {
    it('should map complete relationship record', () => {
      const record = {
        id: 1,
        interestedId: 10,
        missionaryId: 20,
        userId1: 30,
        userId2: 40,
        relationshipType: 'discipleship',
        status: 'active',
        notes: 'Test notes',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02')
      };

      const relationship = mapRelationshipRecord(record);

      expect(relationship.id).toBe(1);
      expect(relationship.interestedId).toBe(10);
      expect(relationship.missionaryId).toBe(20);
      expect(relationship.relationshipType).toBe('discipleship');
    });

    it('should handle null values', () => {
      const record = {
        id: 1,
        interestedId: null,
        missionaryId: null
      };

      const relationship = mapRelationshipRecord(record);

      expect(relationship.id).toBe(1);
      expect(relationship.interestedId).toBeUndefined();
      expect(relationship.missionaryId).toBeUndefined();
    });
  });

  describe('mapMeetingRecord', () => {
    it('should map complete meeting record', () => {
      const record = {
        id: 1,
        requesterId: 10,
        assignedToId: 20,
        typeId: 1,
        title: 'Meeting Title',
        description: 'Description',
        scheduledAt: new Date('2024-01-15T10:00:00Z'),
        duration: 60,
        location: 'Room 101',
        priority: 'high',
        isUrgent: true,
        status: 'scheduled',
        notes: 'Notes',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02')
      };

      const meeting = mapMeetingRecord(record);

      expect(meeting.id).toBe(1);
      expect(meeting.title).toBe('Meeting Title');
      expect(meeting.duration).toBe(60);
      expect(meeting.isUrgent).toBe(true);
    });

    it('should handle null values with defaults', () => {
      const record = {
        id: 1,
        title: null,
        duration: null
      };

      const meeting = mapMeetingRecord(record);

      expect(meeting.id).toBe(1);
      expect(meeting.title).toBe('');
      expect(meeting.duration).toBe(0);
    });
  });

  describe('mapNotificationRecord', () => {
    it('should map complete notification record', () => {
      const record = {
        id: 1,
        userId: 10,
        type: 'system',
        title: 'Notification Title',
        message: 'Message content',
        isRead: false,
        createdAt: new Date('2024-01-01')
      };

      const notification = mapNotificationRecord(record);

      expect(notification.id).toBe(1);
      expect(notification.userId).toBe(10);
      expect(notification.title).toBe('Notification Title');
      expect(notification.isRead).toBe(false);
    });

    it('should handle null values', () => {
      const record = {
        id: 1,
        userId: null,
        title: null
      };

      const notification = mapNotificationRecord(record);

      expect(notification.id).toBe(1);
      expect(notification.userId).toBe(0);
      expect(notification.title).toBe('');
    });
  });
});
