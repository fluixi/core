import { createSignal, batch } from '@awc/kettlejs';
import type { WorkflowDocument } from './document.model.js';

// ── Signals ────────────────────────────────────────────────────────────────────

const [_docs,       _setDocs]       = createSignal<WorkflowDocument[]>([]);
const [_activeDoc,  _setActiveDoc]  = createSignal<WorkflowDocument | null>(null);
const [_docLoading, _setDocLoading] = createSignal(false);
const [_docSaving,  _setDocSaving]  = createSignal(false);

// ── Store ──────────────────────────────────────────────────────────────────────

export const documentStore = {
  docs:       _docs,
  activeDoc:  _activeDoc,
  docLoading: _docLoading,
  docSaving:  _docSaving,

  loadDocs(items: WorkflowDocument[]): void {
    _setDocs(items);
  },

  upsertDoc(doc: WorkflowDocument): void {
    _setDocs(prev => {
      const idx = prev.findIndex(d => d.id === doc.id);
      return idx >= 0 ? prev.map((d, i) => (i === idx ? doc : d)) : [doc, ...prev];
    });
    if (_activeDoc()?.id === doc.id) {
      _setActiveDoc(doc);
    }
  },

  removeDoc(id: string): void {
    _setDocs(prev => prev.filter(d => d.id !== id));
    if (_activeDoc()?.id === id) _setActiveDoc(null);
  },

  setActiveDoc(doc: WorkflowDocument | null): void { _setActiveDoc(doc); },
  setDocLoading: _setDocLoading,
  setDocSaving:  _setDocSaving,

  clearDocs(): void {
    batch(() => {
      _setDocs([]);
      _setActiveDoc(null);
    });
  },
} as const;
