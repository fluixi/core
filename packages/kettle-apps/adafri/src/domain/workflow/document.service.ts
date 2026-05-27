import { createResource } from '@awc/reactive';
import { documentApi } from '../../infrastructure/api/document.api.js';
import { documentStore } from './document.store.js';
import type { CreateDocInput, UpdateDocInput, WorkflowDocument } from './document.model.js';
import type { DocumentActions } from './service.context.js';

// ── Resource factory ───────────────────────────────────────────────────────────

export function createDocumentResources(workspaceId: () => string) {
  const [documents, { refetch: refetchDocuments }] = createResource(
    workspaceId,
    (id) => documentApi.listDocs(id),
  );
  return { documents, refetchDocuments };
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function createDocumentActions(refetch: () => void): DocumentActions {
  return {
    async create(input: CreateDocInput): Promise<WorkflowDocument> {
      const doc = await documentApi.createDoc(input);
      documentStore.upsertDoc(doc);
      return doc;
    },

    async update(id: string, input: UpdateDocInput): Promise<WorkflowDocument> {
      documentStore.setDocSaving(true);
      try {
        const doc = await documentApi.updateDoc(id, input);
        documentStore.upsertDoc(doc);
        return doc;
      } finally {
        documentStore.setDocSaving(false);
      }
    },

    async delete(id: string): Promise<void> {
      await documentApi.deleteDoc(id);
      documentStore.removeDoc(id);
    },

    refetch,
  };
}

// ── Legacy compatibility ───────────────────────────────────────────────────────

/** @deprecated Inject documentActions from WorkspaceServiceContext instead. */
// export const documentService = {
//   list:   (workspaceId: string)                    => documentApi.listDocs(workspaceId),
//   get:    (docId: string)                          => documentApi.getDoc(docId).then(doc => { documentStore.upsertDoc(doc); documentStore.setActiveDoc(doc); return doc; }),
//   create: (input: CreateDocInput)                   => createDocumentActions(() => {}).create(input),
//   update: (docId: string, input: UpdateDocInput)    => createDocumentActions(() => {}).update(docId, input),
//   delete: (docId: string)                           => createDocumentActions(() => {}).delete(docId),
// } as const;
