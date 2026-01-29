/**
 * Election Repository
 * Métodos relacionados a eleições
 */

import { sql as rawSql } from '../neonConfig';
import { logger } from '../utils/logger';

export interface Election {
  id: number;
  configId: number;
  status: string;
  currentPosition: number | null;
  currentPhase: string | null;
  resultAnnounced: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ElectionConfig {
  id: number;
  churchCode: string;
  churchName: string;
  positions: ElectionPosition[];
  criteria: ElectionCriteria;
  voters: number[];
  maxNominationsPerVoter: number;
  removedCandidates: number[];
  currentLeaders: Record<string, unknown>[];
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ElectionPosition {
  id: string;
  name: string;
  quantity: number;
}

export interface ElectionCriteria {
  dizimistaRecorrente?: boolean;
  mustBeTither?: boolean;
  mustBeDonor?: boolean;
  minAttendance?: number;
  minMonthsInChurch?: number;
  minEngagement?: boolean;
  minClassification?: boolean;
  minBaptismYears?: number;
  classification?: {
    enabled?: boolean;
    frequente?: boolean;
    naoFrequente?: boolean;
    aResgatar?: boolean;
  };
}

export interface ElectionCandidate {
  id: number;
  name: string;
  unit: string;
  birthDate: string | null;
  points: number;
  nominations: number;
  votes: number;
  percentage: number;
}

export interface ElectionVote {
  id: number;
  electionId: number;
  positionId: string;
  candidateId: number;
  voterId: number;
  createdAt: string | null;
}

export interface ElectionNomination {
  id: number;
  electionId: number;
  positionId: string;
  candidateId: number;
  nominatorId: number;
  createdAt: string | null;
}

export class ElectionRepository {
  /**
   * Busca todas as eleições
   */
  async getAllElections(): Promise<Election[]> {
    try {
      const elections = await rawSql`
        SELECT * FROM elections ORDER BY created_at DESC
      `;
      return elections.map(this.mapElectionRecord);
    } catch (error) {
      logger.error('Erro ao buscar eleições', error);
      return [];
    }
  }

  /**
   * Busca eleição por ID
   */
  async getElectionById(id: number): Promise<Election | null> {
    try {
      const [election] = await rawSql`
        SELECT * FROM elections WHERE id = ${id}
      `;
      return election ? this.mapElectionRecord(election) : null;
    } catch (error) {
      logger.error('Erro ao buscar eleição por ID', error);
      return null;
    }
  }

  /**
   * Busca configuração de eleição por ID
   */
  async getElectionConfigById(configId: number): Promise<ElectionConfig | null> {
    try {
      const [config] = await rawSql`
        SELECT * FROM election_config WHERE id = ${configId}
      `;
      return config ? this.mapElectionConfigRecord(config) : null;
    } catch (error) {
      logger.error('Erro ao buscar config de eleição', error);
      return null;
    }
  }

  /**
   * Busca configuração de eleição por código da igreja
   */
  async getElectionConfigByChurch(churchCode: string): Promise<ElectionConfig | null> {
    try {
      const [config] = await rawSql`
        SELECT * FROM election_config WHERE church_code = ${churchCode}
      `;
      return config ? this.mapElectionConfigRecord(config) : null;
    } catch (error) {
      logger.error('Erro ao buscar config de eleição por igreja', error);
      return null;
    }
  }

  /**
   * Cria nova eleição
   */
  async createElection(configId: number): Promise<Election> {
    try {
      const [election] = await rawSql`
        INSERT INTO elections (config_id, status, created_at, updated_at)
        VALUES (${configId}, 'pending', NOW(), NOW())
        RETURNING *
      `;
      return this.mapElectionRecord(election);
    } catch (error) {
      logger.error('Erro ao criar eleição', error);
      throw error;
    }
  }

  /**
   * Atualiza status da eleição
   */
  async updateElectionStatus(id: number, status: string): Promise<Election | null> {
    try {
      const [election] = await rawSql`
        UPDATE elections
        SET status = ${status}, updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;
      return election ? this.mapElectionRecord(election) : null;
    } catch (error) {
      logger.error('Erro ao atualizar status da eleição', error);
      return null;
    }
  }

  /**
   * Busca eleições ativas
   */
  async getActiveElections(): Promise<Election[]> {
    try {
      const elections = await rawSql`
        SELECT * FROM elections
        WHERE status IN ('active', 'nomination', 'voting')
        ORDER BY created_at DESC
      `;
      return elections.map(this.mapElectionRecord);
    } catch (error) {
      logger.error('Erro ao buscar eleições ativas', error);
      return [];
    }
  }

  /**
   * Busca eleições por igreja
   */
  async getElectionsByChurch(churchCode: string): Promise<Election[]> {
    try {
      const elections = await rawSql`
        SELECT e.* FROM elections e
        JOIN election_config ec ON e.config_id = ec.id
        WHERE ec.church_code = ${churchCode}
        ORDER BY e.created_at DESC
      `;
      return elections.map(this.mapElectionRecord);
    } catch (error) {
      logger.error('Erro ao buscar eleições por igreja', error);
      return [];
    }
  }

  /**
   * Registra uma indicação
   */
  async registerNomination(
    electionId: number,
    positionId: string,
    candidateId: number,
    nominatorId: number
  ): Promise<ElectionNomination> {
    try {
      const [nomination] = await rawSql`
        INSERT INTO election_nominations (election_id, position_id, candidate_id, nominator_id, created_at)
        VALUES (${electionId}, ${positionId}, ${candidateId}, ${nominatorId}, NOW())
        RETURNING *
      `;
      return this.mapNominationRecord(nomination);
    } catch (error) {
      logger.error('Erro ao registrar indicação', error);
      throw error;
    }
  }

  /**
   * Registra um voto
   */
  async registerVote(
    electionId: number,
    positionId: string,
    candidateId: number,
    voterId: number
  ): Promise<ElectionVote> {
    try {
      const [vote] = await rawSql`
        INSERT INTO election_votes (election_id, position_id, candidate_id, voter_id, created_at)
        VALUES (${electionId}, ${positionId}, ${candidateId}, ${voterId}, NOW())
        RETURNING *
      `;
      return this.mapVoteRecord(vote);
    } catch (error) {
      logger.error('Erro ao registrar voto', error);
      throw error;
    }
  }

  /**
   * Busca indicações por eleição e posição
   */
  async getNominationsByPosition(
    electionId: number,
    positionId: string
  ): Promise<ElectionNomination[]> {
    try {
      const nominations = await rawSql`
        SELECT * FROM election_nominations
        WHERE election_id = ${electionId} AND position_id = ${positionId}
      `;
      return nominations.map(this.mapNominationRecord);
    } catch (error) {
      logger.error('Erro ao buscar indicações', error);
      return [];
    }
  }

  /**
   * Busca votos por eleição e posição
   */
  async getVotesByPosition(electionId: number, positionId: string): Promise<ElectionVote[]> {
    try {
      const votes = await rawSql`
        SELECT * FROM election_votes
        WHERE election_id = ${electionId} AND position_id = ${positionId}
      `;
      return votes.map(this.mapVoteRecord);
    } catch (error) {
      logger.error('Erro ao buscar votos', error);
      return [];
    }
  }

  /**
   * Verifica se usuário já votou
   */
  async hasUserVoted(electionId: number, positionId: string, voterId: number): Promise<boolean> {
    try {
      const [result] = (await rawSql`
        SELECT COUNT(*) as count FROM election_votes
        WHERE election_id = ${electionId}
          AND position_id = ${positionId}
          AND voter_id = ${voterId}
      `) as Array<{ count: number }>;
      return (result?.count || 0) > 0;
    } catch (error) {
      logger.error('Erro ao verificar se usuário votou', error);
      return false;
    }
  }

  /**
   * Verifica se usuário já indicou
   */
  async hasUserNominated(
    electionId: number,
    positionId: string,
    nominatorId: number
  ): Promise<boolean> {
    try {
      const [result] = (await rawSql`
        SELECT COUNT(*) as count FROM election_nominations
        WHERE election_id = ${electionId}
          AND position_id = ${positionId}
          AND nominator_id = ${nominatorId}
      `) as Array<{ count: number }>;
      return (result?.count || 0) > 0;
    } catch (error) {
      logger.error('Erro ao verificar se usuário indicou', error);
      return false;
    }
  }

  /**
   * Busca resultados de votação
   */
  async getVoteResults(
    electionId: number,
    positionId: string
  ): Promise<{ candidateId: number; votes: number }[]> {
    try {
      const results = await rawSql`
        SELECT candidate_id, COUNT(*) as votes
        FROM election_votes
        WHERE election_id = ${electionId} AND position_id = ${positionId}
        GROUP BY candidate_id
        ORDER BY votes DESC
      `;
      return results.map((r: Record<string, unknown>) => ({
        candidateId: r.candidate_id as number,
        votes: Number(r.votes || 0),
      }));
    } catch (error) {
      logger.error('Erro ao buscar resultados', error);
      return [];
    }
  }

  /**
   * Deleta eleição
   */
  async deleteElection(id: number): Promise<boolean> {
    try {
      // Deleta votos e indicações primeiro
      await rawSql`DELETE FROM election_votes WHERE election_id = ${id}`;
      await rawSql`DELETE FROM election_nominations WHERE election_id = ${id}`;
      const result = await rawSql`DELETE FROM elections WHERE id = ${id}`;
      return (result?.length || 0) >= 0;
    } catch (error) {
      logger.error('Erro ao deletar eleição', error);
      return false;
    }
  }

  /**
   * Mapeia registro para Election
   */
  private mapElectionRecord(record: Record<string, unknown>): Election {
    return {
      id: record.id as number,
      configId: record.config_id as number,
      status: record.status as string,
      currentPosition: record.current_position as number | null,
      currentPhase: record.current_phase as string | null,
      resultAnnounced: record.result_announced as boolean,
      createdAt:
        record.created_at instanceof Date
          ? record.created_at.toISOString()
          : (record.created_at as string | null),
      updatedAt:
        record.updated_at instanceof Date
          ? record.updated_at.toISOString()
          : (record.updated_at as string | null),
    };
  }

  /**
   * Mapeia registro para ElectionConfig
   */
  private mapElectionConfigRecord(record: Record<string, unknown>): ElectionConfig {
    const parseJson = (value: unknown): unknown => {
      if (!value) return null;
      if (typeof value === 'string') {
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      }
      return value;
    };

    return {
      id: record.id as number,
      churchCode: record.church_code as string,
      churchName: record.church_name as string,
      positions: (parseJson(record.positions) as ElectionPosition[]) || [],
      criteria: (parseJson(record.criteria) as ElectionCriteria) || {},
      voters: (parseJson(record.voters) as number[]) || [],
      maxNominationsPerVoter: (record.max_nominations_per_voter as number) || 1,
      removedCandidates: (parseJson(record.removed_candidates) as number[]) || [],
      currentLeaders: (parseJson(record.current_leaders) as Record<string, unknown>[]) || [],
      createdAt:
        record.created_at instanceof Date
          ? record.created_at.toISOString()
          : (record.created_at as string | null),
      updatedAt:
        record.updated_at instanceof Date
          ? record.updated_at.toISOString()
          : (record.updated_at as string | null),
    };
  }

  /**
   * Mapeia registro para ElectionVote
   */
  private mapVoteRecord(record: Record<string, unknown>): ElectionVote {
    return {
      id: record.id as number,
      electionId: record.election_id as number,
      positionId: record.position_id as string,
      candidateId: record.candidate_id as number,
      voterId: record.voter_id as number,
      createdAt:
        record.created_at instanceof Date
          ? record.created_at.toISOString()
          : (record.created_at as string | null),
    };
  }

  /**
   * Mapeia registro para ElectionNomination
   */
  private mapNominationRecord(record: Record<string, unknown>): ElectionNomination {
    return {
      id: record.id as number,
      electionId: record.election_id as number,
      positionId: record.position_id as string,
      candidateId: record.candidate_id as number,
      nominatorId: record.nominator_id as number,
      createdAt:
        record.created_at instanceof Date
          ? record.created_at.toISOString()
          : (record.created_at as string | null),
    };
  }
}

export const electionRepository = new ElectionRepository();
export default electionRepository;
