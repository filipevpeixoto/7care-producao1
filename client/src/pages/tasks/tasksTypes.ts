export interface Task {
  id: number;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  due_date?: string | null;
  created_by: number;
  assigned_to?: number | null;
  created_by_name?: string;
  assigned_to_name?: string;
  church?: string;
  district_id?: number | null;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
  tags?: string[];
}

export interface TaskUser {
  id: number;
  name: string;
  email: string;
  role: string;
  church: string;
}
