export interface InterestedPerson {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  church: string;
  status: 'novo' | 'contato-inicial' | 'estudando' | 'batizado' | 'inativo';
  assignedDate?: string;
  lastContact?: string;
  nextStudy?: string;
  studiesCompleted: number;
  totalStudies: number;
  notes: string;
  source: 'evento' | 'indicacao' | 'online' | 'visita' | 'outro';
  interestedSituation?: string;
  interested_situation?: string;
  interests?: string[];
  relationship?: Relationship;
}

export interface Relationship {
  id: number;
  missionaryId: number;
  interestedId: number;
  status: 'active' | 'inactive' | 'completed';
  assignedAt: string;
  notes: string;
}

export interface DiscipleshipRequest {
  id: number;
  missionaryId: number;
  interestedId: number;
  status: 'pending' | 'approved' | 'rejected';
  type?: 'member-request' | 'pastor-invite';
  invitedBy?: number;
  requestedAt: string;
  createdAt?: string;
  notes: string;
  adminNotes?: string;
  interestedName?: string;
  missionaryName?: string;
}
