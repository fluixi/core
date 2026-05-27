import { createSignal, onCleanup } from '@awc/kettlejs';
import { apiClient } from '../../../infrastructure/api/client.js';
import type { PostMessageInput } from '../../../domain/workflow/channel.model.js';
import { useWorkspaceService } from '../../../domain/workflow/service.context.js';

// ── Types ─────────────────────────────────────────────────────────────────────

interface AttachmentFile {
  id:         string;
  file:       File;
  name:       string;
  mimeType:   string;
  size:       number;
  previewUrl: string | null; // only for images
}

interface UploadedAttachment {
  url:  string;
  name: string;
  type: string;
  size: number;
}

interface Props {
  channelId:       string;
  workspaceId?:    string;
  threadParentId?: string;
  placeholder?:    string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MessageComposer({ channelId, workspaceId, threadParentId, placeholder }: Props) {
  let editorEl:  HTMLDivElement   | null = null;
  let fileInput: HTMLInputElement | null = null;

  const [attachments,  setAttachments]  = createSignal<AttachmentFile[]>([]);
  const [sending,      setSending]      = createSignal(false);
  const [hasContent,   setHasContent]   = createSignal(false);
  const [dragOver,     setDragOver]     = createSignal(false);
  const [uploadError,  setUploadError]  = createSignal<string | null>(null);
  const {messageActions} = useWorkspaceService()!

  // ── Content check ──────────────────────────────────────────────────────────

  function checkContent() {
    if (!editorEl) { setHasContent(attachments().length > 0); return; }
    const text    = editorEl.textContent?.trim() ?? '';
    const hasHtml = editorEl.innerHTML !== '' && editorEl.innerHTML !== '<br>';
    const has = text.length > 0 || hasHtml || attachments().length > 0
    console.log('check has content', has)
    setHasContent(has);
  }

  // ── Formatting (execCommand — well-supported for messaging composers) ───────

  function execFmt(cmd: string) {
    editorEl?.focus();
    document.execCommand(cmd, false, undefined);
    checkContent();
  }

  function insertCode() {
    editorEl?.focus();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    const text  = range.toString() || 'code';
    const code  = document.createElement('code');
    code.className = 'msg-inline-code';
    code.textContent = text;
    range.deleteContents();
    range.insertNode(code);
    const after = document.createRange();
    after.setStartAfter(code);
    after.collapse(true);
    sel.removeAllRanges();
    sel.addRange(after);
    checkContent();
  }

  // ── File handling ──────────────────────────────────────────────────────────

  function addFiles(files: FileList | File[]) {
    const next: AttachmentFile[] = Array.from(files).map(f => ({
      id:         `${f.name}-${f.size}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file:       f,
      name:       f.name,
      mimeType:   f.type || 'application/octet-stream',
      size:       f.size,
      previewUrl: f.type.startsWith('image/') ? URL.createObjectURL(f) : null,
    }));
    setAttachments(prev => [...prev, ...next]);
    setHasContent(true);
  }

  function removeAttachment(id: string) {
    setAttachments(prev => {
      const found = prev.find(a => a.id === id);
      if (found?.previewUrl) URL.revokeObjectURL(found.previewUrl);
      return prev.filter(a => a.id !== id);
    });
    checkContent();
  }

  onCleanup(() => {
    for (const a of attachments()) {
      if (a.previewUrl) URL.revokeObjectURL(a.previewUrl);
    }
  });

  // ── Upload ─────────────────────────────────────────────────────────────────

  async function uploadOne(att: AttachmentFile): Promise<UploadedAttachment> {
    const fd = new FormData();
    fd.append('image_file',   att.file);
    fd.append('bucket_name',  'adafri-workspace');
    fd.append('accountId',    workspaceId ?? channelId);
    fd.append('upload_folder', `workspace/${workspaceId ?? channelId}/messages`);
    fd.append('filename',     att.name);

    const result = await apiClient.form<{ url?: string; file_url?: string }>(
      '/file/uploadImage',
      fd,
    );
    const url = result?.url ?? result?.file_url ?? '';
    return { url, name: att.name, type: att.mimeType, size: att.size };
  }

  // ── Send ───────────────────────────────────────────────────────────────────

  async function handleSend() {
    console.log('handleSend');
    if (sending() || !hasContent()) return;
    console.log('handleSend after');

    const rawHtml = editorEl?.innerHTML?.trim() ?? '';
    const atts    = attachments();
    const isEmpty = (!rawHtml || rawHtml === '<br>') && atts.length === 0;
    if (isEmpty) return;

    setSending(true);
    setUploadError(null);

    try {
      const uploadedAtts: UploadedAttachment[] = atts.length
        ? await Promise.all(atts.map(uploadOne))
        : [];

      const content = JSON.stringify({
        format: 'html' as const,
        html:   rawHtml === '<br>' ? '' : rawHtml,
        ...(uploadedAtts.length ? { attachments: uploadedAtts } : {}),
      });

      const input: PostMessageInput = {
        content,
        ...(threadParentId ? { threadParentId } : {}),
      };

      await messageActions.post(channelId, input);

      if (editorEl) editorEl.innerHTML = '';
      setAttachments([]);
      setHasContent(false);
    } catch (err: any) {
      setUploadError(err?.message ?? 'Failed to send. Please try again.');
    } finally {
      setSending(false);
    }
  }

  // ── Keyboard ───────────────────────────────────────────────────────────────

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSend();
    }
  }

  // ── Paste: strip HTML, handle image paste ──────────────────────────────────

  function handlePaste(e: ClipboardEvent) {
    const items = e.clipboardData?.items;
    if (!items) return;

    // Image paste → add as attachment
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) {
          addFiles([new File([file], `image-${Date.now()}.png`, { type: file.type })]);
        }
        return;
      }
    }

    // HTML paste → downgrade to plain text
    const hasHtml = e.clipboardData?.getData('text/html');
    if (hasHtml) {
      e.preventDefault();
      const text = e.clipboardData?.getData('text/plain') ?? '';
      document.execCommand('insertText', false, text);
    }

    checkContent();
  }

  // ── Drag & drop ────────────────────────────────────────────────────────────

  function onDragOver(e: DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }

  function onDragLeave(e: DragEvent) {
    const related = e.relatedTarget as HTMLElement | null;
    if (!related || !(e.currentTarget as HTMLElement)?.contains(related)) {
      setDragOver(false);
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer?.files;
    if (files?.length) addFiles(files);
  }

  // ── Display helpers ────────────────────────────────────────────────────────

  function fmtSize(bytes: number): string {
    if (bytes < 1024)    return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  }

  function fileIcon(mime: string): string {
    if (mime.startsWith('image/'))                              return '🖼️';
    if (mime.startsWith('video/'))                              return '🎬';
    if (mime.startsWith('audio/'))                              return '🎵';
    if (mime.includes('pdf'))                                   return '📄';
    if (mime.includes('word') || mime.includes('document'))     return '📝';
    if (mime.includes('sheet') || mime.includes('excel'))       return '📊';
    if (mime.includes('zip')  || mime.includes('archive'))      return '📦';
    return '📎';
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      class={() => `ws-composer${dragOver() ? ' ws-composer--drag' : ''}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div class="ws-composer__toolbar">

        {/* Bold */}
        <button class="ws-composer__tool" type="button" title="Bold (⌘B)"
          onClick={() => execFmt('bold')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
            <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
          </svg>
        </button>

        {/* Italic */}
        <button class="ws-composer__tool" type="button" title="Italic (⌘I)"
          onClick={() => execFmt('italic')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2.5" aria-hidden="true">
            <line x1="19" y1="4" x2="10" y2="4"/>
            <line x1="14" y1="20" x2="5" y2="20"/>
            <line x1="15" y1="4" x2="9" y2="20"/>
          </svg>
        </button>

        {/* Strikethrough */}
        <button class="ws-composer__tool" type="button" title="Strikethrough"
          onClick={() => execFmt('strikeThrough')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2.5" aria-hidden="true">
            <path d="M16 6C16 6 14.5 4 12 4C9.5 4 7 5.5 7 8C7 9.5 8 10.5 9 11"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
            <path d="M8 18C8 18 9.5 20 12 20C14.5 20 17 18.5 17 16C17 14.5 16 13.5 15 13"/>
          </svg>
        </button>

        {/* Inline code */}
        <button class="ws-composer__tool" type="button" title="Inline code"
          onClick={insertCode}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2.5" aria-hidden="true">
            <polyline points="16 18 22 12 16 6"/>
            <polyline points="8 6 2 12 8 18"/>
          </svg>
        </button>

        {/* Bulleted list */}
        <button class="ws-composer__tool" type="button" title="Bulleted list"
          onClick={() => execFmt('insertUnorderedList')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" aria-hidden="true">
            <line x1="9" y1="6"  x2="20" y2="6"/>
            <line x1="9" y1="12" x2="20" y2="12"/>
            <line x1="9" y1="18" x2="20" y2="18"/>
            <circle cx="4" cy="6"  r="1" fill="currentColor"/>
            <circle cx="4" cy="12" r="1" fill="currentColor"/>
            <circle cx="4" cy="18" r="1" fill="currentColor"/>
          </svg>
        </button>

        {/* Numbered list */}
        <button class="ws-composer__tool" type="button" title="Numbered list"
          onClick={() => execFmt('insertOrderedList')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" aria-hidden="true">
            <line x1="10" y1="6"  x2="21" y2="6"/>
            <line x1="10" y1="12" x2="21" y2="12"/>
            <line x1="10" y1="18" x2="21" y2="18"/>
            <path d="M4 6h1v4" stroke="currentColor" stroke-width="2"/>
            <path d="M4 10h2"  stroke="currentColor" stroke-width="2"/>
            <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" stroke="currentColor" stroke-width="2"/>
          </svg>
        </button>

        <div class="ws-composer__tool-sep" aria-hidden="true" />

        {/* Attach file */}
        <button class="ws-composer__tool" type="button" title="Attach file"
          onClick={() => fileInput?.click()}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
          </svg>
        </button>
      </div>

      {/* ── Editable area ────────────────────────────────────────────────── */}
      <div
        ref={(el: HTMLDivElement) => { editorEl = el; }}
        class="ws-composer__editor"
        contenteditable="true"
        data-placeholder={placeholder ?? 'Write a message…'}
        onInput={checkContent}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        role="textbox"
        aria-multiline="true"
        aria-label={placeholder ?? 'Write a message'}
      />

      {/* ── Attachment strip ─────────────────────────────────────────────── */}
      {() => {
        const atts = attachments();
        if (!atts.length) return null;
        return (
          <div class="ws-composer__attach-strip">
            {atts.map(att => (
              <div class="ws-composer__att-chip" key={att.id}>
                {att.previewUrl
                  ? <img class="ws-composer__att-thumb" src={att.previewUrl} alt="" />
                  : <span class="ws-composer__att-ext">{fileIcon(att.mimeType)}</span>
                }
                <div class="ws-composer__att-meta">
                  <span class="ws-composer__att-name" title={att.name}>{att.name}</span>
                  <span class="ws-composer__att-size">{fmtSize(att.size)}</span>
                </div>
                <button
                  class="ws-composer__att-del"
                  type="button"
                  title="Remove attachment"
                  onClick={() => removeAttachment(att.id)}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="3" aria-hidden="true">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6"  y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        );
      }}

      {/* ── Upload error ─────────────────────────────────────────────────── */}
      {() => uploadError() && (
        <div class="ws-composer__error">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {uploadError()}
        </div>
      )}

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <div class="ws-composer__footer">
        <span class="ws-composer__hints">
          <kbd class="ws-composer__kbd">⌘↵</kbd> send
          &nbsp;·&nbsp;
          <kbd class="ws-composer__kbd">⌘B</kbd> bold
          &nbsp;·&nbsp;
          drop files to attach
        </span>
      {/* {()=>hasContent() ? 'has ctx': 'not ctx'} */}
        <button
          className={() => `ws-composer__send${hasContent() && !sending() ? ' ws-composer__send--active' : ''}`}
          // disabled={()=>!hasContent() || sending()}
          onClick={(e)=>handleSend()}
          type="button"
          aria-label="Send message"
        >
          {() => sending()
            ? <span class="ws-composer__spinner" />
            : (
              <>
                <span>Send</span>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2.5"
                  stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </>
            )
          }
        </button>
      </div>

      {/* Hidden file input */}
      <input
        ref={(el: HTMLInputElement) => { fileInput = el; }}
        type="file"
        multiple
        style="display:none"
        onChange={(e: Event) => {
          const files = (e.target as HTMLInputElement).files;
          if (files?.length) addFiles(files);
          (e.target as HTMLInputElement).value = '';
        }}
      />
    </div>
  );
}
