import { createSignal, createEffect } from '@awc/kettlejs';
import { documentStore } from '../../../domain/workflow/document.store.js';
import { documentService } from '../../../domain/workflow/document.service.js';

interface Props {
  docId: () => string;
}

const EMOJI_OPTIONS = ['📄', '📝', '📋', '📌', '🗒️', '💡', '🎯', '📊', '🔍', '⚡', '🛠️', '🚀'];

function simpleMarkdownToHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold text-gray-800 mt-4 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-semibold text-gray-900 mt-5 mb-2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold text-gray-900 mt-6 mb-3">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="bg-gray-100 text-indigo-600 text-xs px-1.5 py-0.5 rounded font-mono">$1</code>')
    .replace(/\n/g, '<br>');
}

export function DocumentEditor({ docId }: Props) {
  const [tab,             setTab]             = createSignal<'edit' | 'preview'>('edit');
  const [title,           setTitle]           = createSignal('');
  const [icon,            setIcon]            = createSignal('📄');
  const [content,         setContent]         = createSignal('');
  const [showEmojiPicker, setShowEmojiPicker] = createSignal(false);
  const [saveStatus,      setSaveStatus]      = createSignal<'idle' | 'saving' | 'saved'>('idle');

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  createEffect(() => {
    const doc = documentStore.activeDoc();
    if (!doc || doc.id !== docId()) return;
    setTitle(doc.title);
    setIcon(doc.icon);
    setContent(doc.content);
  });

  function scheduleAutosave() {
    if (debounceTimer) clearTimeout(debounceTimer);
    setSaveStatus('saving');
    debounceTimer = setTimeout(async () => {
      await documentService.update(docId(), {
        title:   title(),
        icon:    icon(),
        content: content(),
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 1500);
  }

  function handleIconSelect(emoji: string) {
    setIcon(emoji);
    setShowEmojiPicker(false);
    scheduleAutosave();
  }

  return (
    <div class="flex flex-col h-full bg-white overflow-hidden">
      {() => documentStore.docLoading()
        ? (
          <div class="flex-1 flex items-center justify-center">
            <div class="text-center">
              <div class="w-8 h-8 border-2 border-gray-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
              <p class="text-sm text-gray-500">Loading document…</p>
            </div>
          </div>
        )
        : !documentStore.activeDoc()
        ? (
          <div class="flex-1 flex items-center justify-center">
            <p class="text-sm text-gray-500">Document not found.</p>
          </div>
        )
        : (
          <>
            {/* ── Header ──────────────────────────────────────────── */}
            <div class="px-8 pt-8 pb-4 border-b border-gray-100">

              {/* Icon picker */}
              <div class="relative inline-block mb-3">
                <button
                  class="text-4xl hover:opacity-70 transition-opacity rounded-lg p-1 -ml-1 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker())}
                  title="Change icon"
                >
                  {icon()}
                </button>
                {() => showEmojiPicker() && (
                  <div class="absolute left-0 top-14 z-20 bg-white border border-gray-200 rounded-xl shadow-lg p-2 grid grid-cols-6 gap-1">
                    {EMOJI_OPTIONS.map(e => (
                      <button
                        key={e}
                        class="w-9 h-9 flex items-center justify-center text-xl hover:bg-gray-100 rounded-lg transition-colors"
                        onClick={() => handleIconSelect(e)}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Title */}
              <h1
                class="text-3xl font-bold text-gray-900 focus:outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-gray-300 mb-1 leading-tight"
                contentEditable
                data-placeholder="Untitled"
                onBlur={(e: FocusEvent) => {
                  setTitle((e.target as HTMLElement).textContent ?? '');
                  scheduleAutosave();
                }}
                onInput={(e: InputEvent) => setTitle((e.target as HTMLElement).textContent ?? '')}
                innerHTML={title()}
              />

              {/* Save indicator */}
              <div class="h-5 mt-1">
                {() => saveStatus() === 'saving'
                  ? <span class="text-xs text-gray-400">Saving…</span>
                  : saveStatus() === 'saved'
                  ? <span class="text-xs text-green-500 font-medium">✓ Saved</span>
                  : null
                }
              </div>
            </div>

            {/* ── Tabs ────────────────────────────────────────────── */}
            <div class="flex items-center gap-1 px-8 py-2 border-b border-gray-100 bg-gray-50 flex-shrink-0">
              <button
                class={`px-4 py-1.5 text-sm rounded-md font-medium transition-colors ${
                  tab() === 'edit'
                    ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
                onClick={() => setTab('edit')}
              >
                Edit
              </button>
              <button
                class={`px-4 py-1.5 text-sm rounded-md font-medium transition-colors ${
                  tab() === 'preview'
                    ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
                onClick={() => setTab('preview')}
              >
                Preview
              </button>
              <span class="ml-auto text-xs text-gray-400">Markdown supported</span>
            </div>

            {/* ── Editor / Preview ─────────────────────────────────── */}
            {() => tab() === 'edit'
              ? (
                <textarea
                  class="flex-1 w-full px-8 py-6 text-sm text-gray-800 font-mono resize-none focus:outline-none leading-relaxed bg-white placeholder-gray-300"
                  value={content()}
                  placeholder="Start writing in Markdown…&#10;&#10;# Heading&#10;**Bold**, *italic*, `code`"
                  onInput={(e: InputEvent) => {
                    setContent((e.target as HTMLTextAreaElement).value);
                    scheduleAutosave();
                  }}
                />
              )
              : (
                <div
                  class="flex-1 overflow-y-auto px-8 py-6 text-sm text-gray-800 leading-relaxed prose max-w-none"
                  innerHTML={simpleMarkdownToHtml(content())}
                />
              )
            }
          </>
        )
      }
    </div>
  );
}
