// ── Document ────────────────────────────────────────────────────────────────────

export interface WorkflowDocument {
  id:                string;
  workspaceId:       string;
  title:             string;
  icon:              string;
  content:           string;
  isPublished:       boolean;
  allowedTeamIds:    string[];
  allowedMemberUids: string[];
  createdAt:         string;
  updatedAt:         string;
  createdBy:         string;
  lastEditedBy:      string;
}

export interface CreateDocInput {
  workspaceId: string;
  title?:      string;
  icon?:       string;
  content?:    string;
}

export interface UpdateDocInput {
  title?:       string;
  icon?:        string;
  content?:     string;
  isPublished?: boolean;
}
