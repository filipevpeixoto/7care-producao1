export interface Candidate {
  id: number;
  name: string;
  unit: string;
  nomeUnidade?: string | null;
  points: number;
  nominations: number;
  votes: number;
  percentage: number;
}

export interface ElectionInfo {
  id: number;
  name?: string;
  title?: string;
  status?: string;
  positions?: Array<{ id: number; name: string; description?: string }>;
  [key: string]: unknown;
}

export interface ElectionData {
  election: ElectionInfo;
  currentPosition: number;
  totalPositions: number;
  currentPositionName: string;
  currentPositionDescription?: string;
  candidates: Candidate[];
  phase: 'nomination' | 'oral_observations' | 'voting' | 'completed';
  hasVoted: boolean;
  hasNominated?: boolean;
  nominationCount?: number;
  maxNominationsPerVoter?: number;
  userVote?: number;
  votedCandidateName?: string;
  userNominations?: number[];
  totalVoters: number;
  totalVotes: number;
  votersWhoVoted: number;
  allVotesCast: boolean;
  winner?: {
    id: number;
    name: string;
    votes: number;
    percentage: number;
  } | null;
}
