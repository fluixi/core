export type WorkspaceRole = 'owner' | 'admin' | 'editor' | 'viewer' | 'guest';

export interface WorkflowInvite {
  id:          string;
  workspaceId: string;
  email:       string;
  role:        WorkspaceRole;
  teamIds:     string[];
  invitedBy:   string;
  createdAt:   string;
  status:      'pending' | 'accepted' | 'revoked';
}

export interface CreateInviteInput {
  workspaceId: string;
  email:       string;
  role:        WorkspaceRole;
  teamIds?:    string[];
}
