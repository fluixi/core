// ── Workflow workspace ─────────────────────────────────────────────────────────

export type WorkspaceStatus =
  | 'draft'
  | 'in_review'
  | 'approved'
  | 'live'
  | 'completed';

export interface WorkflowWorkspace {
  id:          string;
  accountId:   string;
  campaignIds: string[];
  name:        string;
  description: string;
  logo:        string | null;
  color:       string | null;
  industry:    string | null;
  website:     string | null;
  status:      WorkspaceStatus;
  assignees:   string[];
  dueDate:     string | null;
  tags:        string[];
  ownerUid:    string;
  adminUids:   string[];
  createdAt:   string;
  updatedAt:   string;
  createdBy:   string;
}

export interface CreateWorkspaceInput {
  name:         string;
  description?: string;
  logo?:        string;
  color?:       string;
  industry?:    string;
  website?:     string;
  dueDate?:     string;
  tags?:        string[];
}

export type UpdateWorkspaceInput = Partial<Omit<WorkflowWorkspace, 'id' | 'accountId' | 'createdAt' | 'createdBy'>>;

// ── Scenario ───────────────────────────────────────────────────────────────────

export type ScenarioStatus = 'draft' | 'selected' | 'rejected';
export type BidStrategy    = 'TARGET_CPA' | 'TARGET_ROAS' | 'MAXIMIZE_CONVERSIONS' | 'MANUAL_CPC';

export interface TargetAudience {
  ageRanges?:   string[];
  genders?:     string[];
  interests?:   string[];
  locations?:   string[];
  languages?:   string[];
}

export interface WorkflowScenario {
  id:                   string;
  workspaceId:          string;
  accountId:            string;
  campaignId:           string;
  name:                 string;
  description:          string;
  budget:               number;
  bidStrategy:          BidStrategy;
  targetAudience:       TargetAudience;
  expectedReach:        number;
  expectedClicks:       number;
  expectedConversions:  number;
  status:               ScenarioStatus;
  score:                number;
  ownerId:              string;
  allowedTeamIds:       string[];
  allowedMemberUids:    string[];
  createdAt:            string;
  updatedAt:            string;
  createdBy:            string;
}

export interface CreateScenarioInput {
  workspaceId:          string;
  name:                 string;
  description?:         string;
  budget:               number;
  bidStrategy?:         BidStrategy;
  targetAudience?:      TargetAudience;
  expectedReach?:       number;
  expectedClicks?:      number;
  expectedConversions?: number;
}

export type UpdateScenarioInput = Partial<Omit<WorkflowScenario, 'id' | 'workspaceId' | 'accountId' | 'campaignId' | 'createdAt' | 'createdBy'>>;

// ── Creative ───────────────────────────────────────────────────────────────────

export type CreativeType   = 'image' | 'video' | 'copy' | 'html';
export type CreativeStatus = 'draft' | 'in_review' | 'approved' | 'rejected';

export interface WorkflowCreative {
  id:          string;
  workspaceId: string;
  scenarioId:  string | null;
  accountId:   string;
  campaignId:  string;
  type:        CreativeType;
  name:        string;
  headline:    string;
  description: string;
  ctaText:     string;
  assetUrl:    string;
  previewUrl:  string;
  status:      CreativeStatus;
  feedback:    string | null;
  createdAt:   string;
  updatedAt:   string;
  createdBy:   string;
}

export interface CreateCreativeInput {
  workspaceId:  string;
  scenarioId?:  string;
  type:         CreativeType;
  name:         string;
  headline?:    string;
  description?: string;
  ctaText?:     string;
  assetUrl?:    string;
  previewUrl?:  string;
}

export type UpdateCreativeInput = Partial<Omit<WorkflowCreative, 'id' | 'workspaceId' | 'accountId' | 'campaignId' | 'createdAt' | 'createdBy'>>;

// ── Discussion ─────────────────────────────────────────────────────────────────

export type DiscussionType = 'comment' | 'status_change' | 'approval';

export interface DiscussionMessage {
  id:          string;
  workspaceId: string;
  authorUid:   string;
  authorName:  string;
  content:     string;
  type:        DiscussionType;
  createdAt:   string;
}

// ── Analytics ──────────────────────────────────────────────────────────────────

export interface WorkspaceAnalytics {
  workspaceId:     string;
  workspaceStatus: WorkspaceStatus;
  scenarios: {
    total:      number;
    byStatus:   Record<ScenarioStatus, number>;
    selectedId: string | null;
  };
  creatives: {
    total:    number;
    byStatus: Record<CreativeStatus, number>;
    byType:   Record<CreativeType, number>;
  };
  healthScore: number;
}
