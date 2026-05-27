import { createSignal } from '@awc/kettlejs';
import { threadService } from '../../../domain/workflow/channel.service.js';
import type { WorkflowChannelMessage } from '../../../domain/workflow/channel.model.js';
import { useWorkspaceService } from '../../../domain/workflow/service.context.js';

interface Props {
  message:       WorkflowChannelMessage;
  isThreadView?: boolean;
  key?:          string;
}

const QUICK_EMOJIS = ['👍', '❤️', '😄', '🎉', '🚀', '👀'];

// ── Helpers ───────────────────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── EditorJS block renderer ───────────────────────────────────────────────────

interface Block { type: string; data: Record<string, any>; }

function renderListItems(items: any[], style: string, depth = 0): string {
  const tag = style === 'ordered' ? 'ol' : 'ul';
  const cls = depth === 0
    ? (style === 'ordered' ? 'msg-ol' : 'msg-ul')
    : (style === 'ordered' ? 'msg-ol msg-list-nested' : 'msg-ul msg-list-nested');

  const lis = items.map((item: any) => {
    const text     = typeof item === 'string' ? item : (item.content ?? '');
    const children = Array.isArray(item.items) && item.items.length
      ? renderListItems(item.items, style, depth + 1)
      : '';
    return `<li>${text}${children}</li>`;
  }).join('');
  return `<${tag} class="${cls}">${lis}</${tag}>`;
}

function renderBlock(block: Block): string {
  const d = block.data ?? {};
  switch (block.type) {

    case 'paragraph': {
      const text = (d.text ?? '').trim();
      if (!text) return '';
      return `<p class="msg-p">${text}</p>`;
    }

    case 'header': {
      const lv  = Math.min(Math.max(d.level ?? 2, 1), 6);
      const cls = ['', 'msg-h1', 'msg-h2', 'msg-h3', 'msg-h4', 'msg-h5', 'msg-h6'][lv];
      return `<h${lv} class="${cls}">${d.text ?? ''}</h${lv}>`;
    }

    case 'list':
      return renderListItems(d.items ?? [], d.style ?? 'unordered');

    case 'checklist': {
      const items = (d.items ?? []).map((item: any) => {
        const done    = item.checked;
        const iconSvg = done
          ? `<svg class="msg-check-icon msg-check-icon--done" viewBox="0 0 16 16" fill="currentColor">
               <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z"/>
             </svg>`
          : `<span class="msg-check-box"></span>`;
        const textCls = done ? 'msg-check-label msg-check-label--done' : 'msg-check-label';
        return `<li class="msg-check-item">${iconSvg}<span class="${textCls}">${item.text ?? ''}</span></li>`;
      }).join('');
      return `<ul class="msg-checklist">${items}</ul>`;
    }

    case 'code':
      return `<div class="msg-code"><pre><code>${escapeHtml(d.code ?? '')}</code></pre></div>`;

    case 'quote':
      return `<blockquote class="msg-quote">
        <p>${d.text ?? ''}</p>
        ${d.caption ? `<cite>${escapeHtml(d.caption)}</cite>` : ''}
      </blockquote>`;

    case 'delimiter':
      return `<div class="msg-delimiter"><span></span><span>✦</span><span></span></div>`;

    case 'warning':
      return `<div class="msg-warning">
        ${d.title ? `<strong>${escapeHtml(d.title)}</strong>` : ''}
        <p>${escapeHtml(d.message ?? '')}</p>
      </div>`;

    default:
      return '';
  }
}

// ── Attachment type ───────────────────────────────────────────────────────────

interface MsgAttachment { url: string; name: string; type: string; size: number; }

// ── Content renderer: new HTML format, EditorJS JSON, or plain markdown ───────

function renderMarkdown(text: string): string {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,     '<em>$1</em>')
    .replace(/`(.+?)`/g,       '<code class="msg-inline-code">$1</code>')
    .replace(/\n/g,            '<br>');
}

function renderContent(raw: string): string {
  if (raw.trimStart().startsWith('{')) {
    try {
      const data = JSON.parse(raw);
      // console.log('renderContent', data);
      // New HTML format (from native contenteditable composer)
      if (data.format === 'html') {
        return data.html ?? '';
      }
      // Old EditorJS blocks format
      if (data.blocks && Array.isArray(data.blocks)) {
        const html = data.blocks.map(renderBlock).filter(Boolean).join('');
        return html || renderMarkdown(raw);
      }
    } catch(e) {
      console.log('inner html faileds', e)
       /* fall through */ }
  }
  return renderMarkdown(raw);
}

function parseAttachments(raw: string): MsgAttachment[] {
  if (!raw.trimStart().startsWith('{')) return [];
  try {
    const data = JSON.parse(raw);
    if (data.format === 'html' && Array.isArray(data.attachments)) {
      return data.attachments as MsgAttachment[];
    }
  } catch { /* ignore */ }
  return [];
}

function fmtSize(bytes: number): string {
  if (bytes < 1024)    return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function attachmentIcon(mime: string): string {
  if (mime.startsWith('image/'))                           return '🖼️';
  if (mime.startsWith('video/'))                           return '🎬';
  if (mime.startsWith('audio/'))                           return '🎵';
  if (mime.includes('pdf'))                                return '📄';
  if (mime.includes('word') || mime.includes('document'))  return '📝';
  if (mime.includes('sheet') || mime.includes('excel'))    return '📊';
  if (mime.includes('zip')  || mime.includes('archive'))   return '📦';
  return '📎';
}

// ── EditorJS JSON → editable markdown (for the textarea edit mode) ─────────────

function htmlToMd(html: string): string {
  return html
    .replace(/<b>(.*?)<\/b>/gi,            '**$1**')
    .replace(/<strong>(.*?)<\/strong>/gi,  '**$1**')
    .replace(/<i>(.*?)<\/i>/gi,            '*$1*')
    .replace(/<em>(.*?)<\/em>/gi,          '*$1*')
    .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
    .replace(/<mark[^>]*>(.*?)<\/mark>/gi, '**$1**')
    .replace(/<u>(.*?)<\/u>/gi,            '$1')
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
}

function editorJsonToEditText(raw: string): string {
  if (!raw.trimStart().startsWith('{')) return raw;
  try {
    const data = JSON.parse(raw);
    // New HTML format — strip tags to plain text for the edit textarea
    if (data.format === 'html') {
      return htmlToMd(data.html ?? '');
    }
    if (!data.blocks || !Array.isArray(data.blocks)) return raw;
    return data.blocks
      .map((b: Block) => {
        const d = b.data ?? {};
        switch (b.type) {
          case 'paragraph':  return htmlToMd(d.text ?? '');
          case 'header':     return '#'.repeat(Math.min(d.level ?? 2, 6)) + ' ' + htmlToMd(d.text ?? '');
          case 'list':
            return (d.items ?? []).map((item: any, i: number) => {
              const text = htmlToMd(typeof item === 'string' ? item : (item.content ?? ''));
              return d.style === 'ordered' ? `${i + 1}. ${text}` : `- ${text}`;
            }).join('\n');
          case 'checklist':
            return (d.items ?? []).map((item: any) =>
              `- [${item.checked ? 'x' : ' '}] ${item.text ?? ''}`
            ).join('\n');
          case 'code':       return '```\n' + (d.code ?? '') + '\n```';
          case 'quote':      return '> ' + htmlToMd(d.text ?? '') + (d.caption ? '\n> — ' + d.caption : '');
          case 'delimiter':  return '---';
          default:           return '';
        }
      })
      .filter(Boolean)
      .join('\n\n');
  } catch {
    return raw;
  }
}

// ── Avatar helpers ────────────────────────────────────────────────────────────

function initials(name: string): string {
  return name.split(' ').map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase() || '?';
}

function avatarColor(name: string): string {
  const colors = [
    'bg-indigo-500', 'bg-violet-500', 'bg-blue-500',
    'bg-cyan-500',   'bg-teal-500',   'bg-emerald-500',
    'bg-rose-500',   'bg-orange-500', 'bg-pink-500',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) & 0xffff;
  return colors[hash % colors.length];
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MessageBubble({ message, isThreadView }: Props) {
  const [showActions, setShowActions] = createSignal(false);
  const [showEmoji,   setShowEmoji]   = createSignal(false);
  const [editing,     setEditing]     = createSignal(false);
  const [editContent, setEditContent] = createSignal('');
  const [saving,      setSaving]      = createSignal(false);

  const {messageActions} = useWorkspaceService()!
  function startEdit() {
    setEditContent(editorJsonToEditText(message.content));
    setEditing(true);
  }

  async function handleSaveEdit() {
    const content = editContent().trim();
    if (!content) return;
    setSaving(true);
    try {
      await messageActions.edit(message.channelId, message.id, content);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleReact(emoji: string) {
    setShowEmoji(false);
    await messageActions.react(message.channelId, message.id, emoji);
  }

  async function handleDelete() {
    if (!confirm('Delete this message?')) return;
    await messageActions.remove(message.channelId, message.id);
  }

  async function handleReply() {
    if (!isThreadView) {
      await threadService.open(message.channelId, message.id);
    }
  }

  const time = new Date(message.createdAt).toLocaleTimeString([], {
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <div
      class="group relative flex gap-3 px-4 py-2 hover:bg-gray-50 rounded-lg transition-colors"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); setShowEmoji(false); }}
    >
      {/* Avatar */}
      <div class={`w-9 h-9 rounded-full flex-shrink-0 mt-0.5 flex items-center justify-center text-white text-xs font-bold ${avatarColor(message.authorName)}`}>
        {initials(message.authorName)}
      </div>

      {/* Body */}
      <div class="flex-1 min-w-0">
        <div class="flex items-baseline gap-2">
          <span class="text-sm font-semibold text-gray-900">{message.authorName}</span>
          <span class="text-xs text-gray-400">{time}</span>
          {message.isEdited && (
            <span class="text-xs text-gray-400 italic">(edited)</span>
          )}
        </div>

        {/* Content or edit form */}
        {() => editing()
          ? (
            <div class="mt-1.5">
              <textarea
                class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono leading-relaxed"
                value={editContent()}
                onInput={(e: InputEvent) => setEditContent((e.target as HTMLTextAreaElement).value)}
                rows={4}
                placeholder="Edit your message…"
              />
              <div class="flex gap-2 mt-1.5">
                <button
                  class="px-3 py-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors disabled:opacity-50"
                  disabled={saving()}
                  onClick={handleSaveEdit}
                >
                  {() => saving() ? 'Saving…' : 'Save'}
                </button>
                <button
                  class="px-3 py-1 text-xs text-gray-500 hover:text-gray-700 rounded-md transition-colors"
                  onClick={() => setEditing(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )
          : (
            <>
              {renderContent(message.content) && (
                <div
                  class="mt-0.5 msg-content"
                  innerHTML={renderContent(message.content)}
                />
              )}
              {/* File attachments */}
              {() => {
                const atts = parseAttachments(message.content);
                if (!atts.length) return null;
                return (
                  <div class="msg-attachments">
                    {atts.map((att, i) => {
                      const isImage = att.type.startsWith('image/');
                      return (
                        <a
                          key={`${att.url}-${i}`}
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          class={`msg-att${isImage ? ' msg-att--image' : ''}`}
                        >
                          {isImage
                            ? <img class="msg-att-img" src={att.url} alt={att.name} loading="lazy" />
                            : (
                              <>
                                <span class="msg-att-icon">{attachmentIcon(att.type)}</span>
                                <div class="msg-att-info">
                                  <span class="msg-att-name">{att.name}</span>
                                  <span class="msg-att-size">{fmtSize(att.size)}</span>
                                </div>
                                <svg class="msg-att-dl" width="14" height="14" viewBox="0 0 24 24"
                                  fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                  <polyline points="7 10 12 15 17 10"/>
                                  <line x1="12" y1="15" x2="12" y2="3"/>
                                </svg>
                              </>
                            )
                          }
                        </a>
                      );
                    })}
                  </div>
                );
              }}
            </>
          )
        }

        {/* Reactions */}
        {() => {
          const entries = Object.entries(message.reactions);
          if (!entries.length) return null;
          return (
            <div class="flex flex-wrap gap-1 mt-2">
              {entries.map(([emoji, uids]) => (
                <button
                  key={emoji}
                  class="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-gray-100 hover:bg-indigo-50 hover:border-indigo-300 border border-gray-200 rounded-full transition-colors"
                  onClick={() => handleReact(emoji)}
                  title={`${uids.length} reaction${uids.length !== 1 ? 's' : ''}`}
                >
                  {emoji} <span class="text-gray-500 font-medium">{uids.length}</span>
                </button>
              ))}
            </div>
          );
        }}
      </div>

      {/* Hover toolbar */}
      {() => showActions() && (
        <div class="absolute right-4 -top-4 flex items-center bg-white border border-gray-200 rounded-lg shadow-md px-1 py-0.5 gap-0.5 z-10">
          {!isThreadView && (
            <button
              class="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md text-sm transition-colors"
              title="Reply in thread"
              onClick={handleReply}
            >
              💬
            </button>
          )}

          <div class="relative">
            <button
              class="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md text-sm transition-colors"
              title="React"
              onClick={() => setShowEmoji(!showEmoji())}
            >
              😀
            </button>
            {() => showEmoji() && (
              <div class="absolute right-0 top-8 flex gap-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-20">
                {QUICK_EMOJIS.map(e => (
                  <button
                    key={e}
                    class="p-1 text-lg hover:bg-gray-100 rounded-md transition-colors"
                    onClick={() => handleReact(e)}
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            class="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md text-sm transition-colors"
            title="Edit"
            onClick={startEdit}
          >
            ✏️
          </button>
          <button
            class="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md text-sm transition-colors"
            title="Delete"
            onClick={handleDelete}
          >
            🗑️
          </button>
        </div>
      )}
    </div>
  );
}
