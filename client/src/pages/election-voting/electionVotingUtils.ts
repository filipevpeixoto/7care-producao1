import type { ElectionData } from './electionVotingTypes';

export const getPhaseTitle = (phase?: ElectionData['phase']) => {
  switch (phase) {
    case 'nomination':
      return 'Fase de Indicações';
    case 'oral_observations':
      return 'Observações Orais';
    case 'voting':
      return 'Fase de Votação';
    case 'completed':
      return 'Eleição Finalizada';
    default:
      return 'Eleição';
  }
};

export const getPhaseDescription = (electionData?: ElectionData | null) => {
  if (!electionData) return '';

  switch (electionData.phase) {
    case 'nomination': {
      const limit = electionData.maxNominationsPerVoter || 1;
      if (limit > 1) {
        return `Selecione até ${limit} candidatos para este cargo. Cada toque confirma automaticamente sua indicação.`;
      }
      return 'Selecione quem você indica para este cargo. O toque confirma automaticamente sua indicação.';
    }
    case 'oral_observations':
      return 'Aguarde as observações orais do pastor. Mantenha esta tela aberta para acompanhar.';
    case 'voting':
      return 'Selecione quem você escolhe para este cargo. Cada pessoa pode votar apenas uma vez.';
    case 'completed':
      return 'A eleição foi finalizada. Obrigado por sua participação!';
    default:
      return '';
  }
};

export const getExpectedVoters = (electionData?: ElectionData | null) => {
  if (!electionData) return 0;
  if (electionData.totalVoters && electionData.totalVoters > 0) {
    return electionData.totalVoters;
  }
  return Math.max(electionData.votersWhoVoted || 0, electionData.totalVotes || 0);
};

export const getHasAllVotes = (electionData?: ElectionData | null) => {
  if (!electionData) return false;
  const expectedVoters = getExpectedVoters(electionData);
  return (
    electionData.phase === 'completed' ||
    electionData.allVotesCast ||
    (expectedVoters > 0 && (electionData.votersWhoVoted || 0) >= expectedVoters) ||
    (expectedVoters > 0 && (electionData.totalVotes || 0) >= expectedVoters)
  );
};
