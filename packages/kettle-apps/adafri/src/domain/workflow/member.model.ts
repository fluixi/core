import type { WorkspaceRole } from './invite.model.js';

export type { WorkspaceRole };

export interface WorkflowMember {
  id:          string;
  workspaceId: string;
  uid:         string;
  email:       string;
  displayName: string;
  role:        WorkspaceRole;
  teamIds:     string[];
  status:      'active' | 'pending';
  joinedAt:    string;
}
