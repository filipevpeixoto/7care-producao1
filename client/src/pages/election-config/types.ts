export interface ElectionChurch {
  id: number;
  name: string;
  code: string;
}

export interface ElectionMember {
  id: number;
  name: string;
  email: string;
  church: string;
  role: string;
  status?: string;
}

export interface ElectionConfigData {
  id?: number;
  churchId: number;
  churchName: string;
  title?: string;
  voters: number[];
  criteria: {
    faithfulness: {
      enabled: boolean;
      punctual: boolean;
      seasonal: boolean;
      recurring: boolean;
    };
    attendance: {
      enabled: boolean;
      punctual: boolean;
      seasonal: boolean;
      recurring: boolean;
    };
    churchTime: {
      enabled: boolean;
      minimumMonths: number;
    };
    positionLimit: {
      enabled: boolean;
      maxPositions: number;
    };
    eldersCount: {
      enabled: boolean;
      count: number;
    };
    classification: {
      enabled: boolean;
      frequente: boolean;
      naoFrequente: boolean;
      aResgatar: boolean;
    };
  };
  positions: string[];
  status: 'draft' | 'active' | 'completed';
}
