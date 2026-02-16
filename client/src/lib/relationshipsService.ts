// Serviço temporário de relacionamentos usando LocalStorage
// Este serviço será usado até que a API de relacionamentos seja corrigida

import { createLogger } from '@/lib/logger';

const relationshipsLogger = createLogger('Relationships');

export interface Relationship {
  id: number;
  interestedId: number;
  missionaryId: number;
  status: 'active' | 'pending' | 'inactive';
  notes?: string;
  createdAt: string;
  updatedAt: string;
  interestedName?: string;
  missionaryName?: string;
}

const STORAGE_KEY = 'relationships';

export class RelationshipsService {
  private static getRelationships(): Relationship[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      relationshipsLogger.error('Erro ao carregar relacionamentos do localStorage:', error);
      return [];
    }
  }

  private static saveRelationships(relationships: Relationship[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(relationships));
    } catch (error) {
      relationshipsLogger.error('Erro ao salvar relacionamentos no localStorage:', error);
    }
  }

  static async getAllRelationships(): Promise<Relationship[]> {
    relationshipsLogger.debug('Buscando relacionamentos do localStorage...');
    const relationships = this.getRelationships();
    relationshipsLogger.debug('Relacionamentos encontrados:', relationships.length);
    return relationships;
  }

  static async createRelationship(data: {
    interestedId: number;
    missionaryId: number;
    status: string;
    notes?: string;
  }): Promise<Relationship> {
    relationshipsLogger.debug('Criando relacionamento no localStorage:', data);
    
    const relationships = this.getRelationships();
    const newRelationship: Relationship = {
      id: Date.now(),
      interestedId: data.interestedId,
      missionaryId: data.missionaryId,
      status: data.status as 'active' | 'pending' | 'inactive',
      notes: data.notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    relationships.push(newRelationship);
    this.saveRelationships(relationships);
    
    relationshipsLogger.debug('Relacionamento criado:', newRelationship);
    return newRelationship;
  }

  static async deleteRelationship(id: number): Promise<boolean> {
    relationshipsLogger.debug('Deletando relacionamento do localStorage:', id);
    
    const relationships = this.getRelationships();
    const filtered = relationships.filter(rel => rel.id !== id);
    
    if (filtered.length === relationships.length) {
      relationshipsLogger.debug('Relacionamento não encontrado');
      return false;
    }

    this.saveRelationships(filtered);
    relationshipsLogger.debug('Relacionamento deletado');
    return true;
  }

  static async getRelationshipsByInterested(interestedId: number): Promise<Relationship[]> {
    relationshipsLogger.debug('Buscando relacionamentos por interessado:', interestedId);
    
    const relationships = this.getRelationships();
    const filtered = relationships.filter(rel => rel.interestedId === interestedId);
    
    relationshipsLogger.debug('Relacionamentos encontrados para interessado:', filtered.length);
    return filtered;
  }

  static async getRelationshipsByMissionary(missionaryId: number): Promise<Relationship[]> {
    relationshipsLogger.debug('Buscando relacionamentos por missionário:', missionaryId);
    
    const relationships = this.getRelationships();
    const filtered = relationships.filter(rel => rel.missionaryId === missionaryId);
    
    relationshipsLogger.debug('Relacionamentos encontrados para missionário:', filtered.length);
    return filtered;
  }

  // Método para enriquecer relacionamentos com nomes dos usuários
  static async enrichWithNames(relationships: Relationship[], users: { id: number; name: string }[]): Promise<Relationship[]> {
    const userMap = new Map(users.map(user => [user.id, user.name]));
    
    return relationships.map(rel => ({
      ...rel,
      interestedName: userMap.get(rel.interestedId) || 'Usuário não encontrado',
      missionaryName: userMap.get(rel.missionaryId) || 'Usuário não encontrado'
    }));
  }
}
