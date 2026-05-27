import { createEffect } from '@awc/kettlejs';
import { useParams } from '@awc/kettlejs/router';
import { documentService } from '../../../../../domain/workflow/document.service.js';
import { DocumentEditor } from '../../../../../shared/components/workspace/DocumentEditor.jsx';

export default function DocEditorPage() {
  const params = useParams<{ workspaceId: string; docId: string }>();

  createEffect(() => {
    const docId = params().docId;
    if (docId) documentService.get(docId);
  });

  return (
    <div class="flex-1 flex flex-col overflow-hidden bg-white">
      <DocumentEditor docId={() => params().docId} />
    </div>
  );
}
