export interface WorkflowTeam {
  id:          string;
  workspaceId: string;
  name:        string;
  description: string;
  slug:        string;
  color:       string | null;
  icon:        string | null;
  memberUids:  string[];
  createdBy:   string;
  createdAt:   string;
}

export interface CreateTeamInput {
  workspaceId:  string;
  name:         string;
  color?:       string;
  icon?:        string;
  description?: string;
}

export type UpdateTeamInput = Partial<Omit<WorkflowTeam, 'id' | 'workspaceId' | 'createdBy' | 'createdAt'>>;
