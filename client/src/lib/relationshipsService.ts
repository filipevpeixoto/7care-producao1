// Serviço temporário de relacionamentos usando LocalStorage
// Este serviço será usado até que a API de relacionamentos seja corrigida

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
      console.error('Erro ao carregar relacionamentos do localStorage:', error);
      return [];
    }
  }

  private static saveRelationships(relationships: Relationship[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(relationships));
    } catch (error) {
      console.error('Erro ao salvar relacionamentos no localStorage:', error);
    }
  }

  static async getAllRelationships(): Promise<Relationship[]> {
    console.log('🔍 Buscando relacionamentos do localStorage...');
    const relationships = this.getRelationships();
    console.log('✅ Relacionamentos encontrados:', relationships.length);
    return relationships;
  }

  static async createRelationship(data: {
    interestedId: number;
    missionaryId: number;
    status: string;
    notes?: string;
  }): Promise<Relationship> {
    console.log('🔍 Criando relacionamento no localStorage:', data);
    
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
    
    console.log('✅ Relacionamento criado:', newRelationship);
    return newRelationship;
  }

  static async deleteRelationship(id: number): Promise<boolean> {
    console.log('🔍 Deletando relacionamento do localStorage:', id);
    
    const relationships = this.getRelationships();
    const filtered = relationships.filter(rel => rel.id !== id);
    
    if (filtered.length === relationships.length) {
      console.log('❌ Relacionamento não encontrado');
      return false;
    }

    this.saveRelationships(filtered);
    console.log('✅ Relacionamento deletado');
    return true;
  }

  static async getRelationshipsByInterested(interestedId: number): Promise<Relationship[]> {
    console.log('🔍 Buscando relacionamentos por interessado:', interestedId);
    
    const relationships = this.getRelationships();
    const filtered = relationships.filter(rel => rel.interestedId === interestedId);
    
    console.log('✅ Relacionamentos encontrados para interessado:', filtered.length);
    return filtered;
  }

  static async getRelationshipsByMissionary(missionaryId: number): Promise<Relationship[]> {
    console.log('🔍 Buscando relacionamentos por missionário:', missionaryId);
    
    const relationships = this.getRelationships();
    const filtered = relationships.filter(rel => rel.missionaryId === missionaryId);
    
    console.log('✅ Relacionamentos encontrados para missionário:', filtered.length);
    return filtered;
  }

  // Método para enriquecer relacionamentos com nomes dos usuários
  static async enrichWithNames(relationships: Relationship[], users: any[]): Promise<Relationship[]> {
    const userMap = new Map(users.map(user => [user.id, user.name]));
    
    return relationships.map(rel => ({
      ...rel,
      interestedName: userMap.get(rel.interestedId) || 'Usuário não encontrado',
      missionaryName: userMap.get(rel.missionaryId) || 'Usuário não encontrado'
    }));
  }
}
