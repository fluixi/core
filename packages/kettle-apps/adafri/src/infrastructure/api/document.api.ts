import { apiClient } from './client.js';
import type {
  WorkflowDocument,
  CreateDocInput,
  UpdateDocInput,
} from '../../domain/workflow/document.model.js';

export const documentApi = {
  listDocs(workspaceId: string) {
    return apiClient.get<WorkflowDocument[]>(`/workflow/docs/list/${workspaceId}`);
  },

  getDoc(docId: string) {
    return apiClient.get<WorkflowDocument>(`/workflow/docs/${docId}`);
  },

  createDoc(input: CreateDocInput) {
    return apiClient.post<WorkflowDocument>('/workflow/docs/create', { data: input });
  },

  updateDoc(docId: string, input: UpdateDocInput) {
    return apiClient.put<WorkflowDocument>(`/workflow/docs/${docId}`, { data: input });
  },

  deleteDoc(docId: string) {
    return apiClient.delete(`/workflow/docs/${docId}`);
  },
} as const;
