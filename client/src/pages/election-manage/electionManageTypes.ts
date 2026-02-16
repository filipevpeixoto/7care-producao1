export interface Candidate {
  id: number;
  name: string;
  email: string;
  nominations: number;
  votes: number;
  percentage: number;
}

export interface Position {
  position: string;
  totalNominations: number;
  winner: Candidate | null;
  results: Candidate[];
}

export interface Election {
  id: number;
  config_id: number;
  church_name?: string;
  status: string;
  current_position: number;
  positions: string[];
  voters: number[];
  created_at?: string;
}

export interface ElectionData {
  election: Election;
  totalVoters: number;
  votedVoters: number;
  currentPosition: number;
  totalPositions: number;
  positions: Position[];
}

export type ElectionPhase = 'nomination' | 'oral_observations' | 'voting' | 'completed';
