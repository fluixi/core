// ── Channel ─────────────────────────────────────────────────────────────────────

export type ChannelType = 'general' | 'announcements' | 'creatives' | 'scenarios' | 'custom';

export interface WorkflowChannel {
  id:                string;
  workspaceId:       string;
  name:              string;
  slug:              string;
  description:       string;
  type:              ChannelType;
  isDefault:         boolean;
  ownerId:           string;
  allowedTeamIds:    string[];
  allowedMemberUids: string[];
  pinnedMessageIds:  string[];
  createdAt:         string;
  createdBy:         string;
}

export interface CreateChannelInput {
  workspaceId:  string;
  name:         string;
  slug?:        string;
  description?: string;
  type?:        ChannelType;
}

// ── Channel message ─────────────────────────────────────────────────────────────

export type Reaction = Record<string, string[]>; // emoji → [uid, ...]

export interface WorkflowChannelMessage {
  id:             string;
  channelId:      string;
  workspaceId:    string;
  authorUid:      string;
  authorName:     string;
  content:        string;
  threadParentId: string | null;
  reactions:      Reaction;
  isEdited:       boolean;
  editedAt:       string | null;
  createdAt:      string;
}

export interface PostMessageInput {
  content:         string;
  threadParentId?: string;
}
