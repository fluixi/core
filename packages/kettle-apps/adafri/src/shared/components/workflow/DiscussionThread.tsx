import { createSignal } from '@awc/kettlejs';
import { workflowStore } from '../../../domain/workflow/workflow.store.js';
import { discussionService } from '../../../domain/workflow/workflow.service.js';
import { sessionStore } from '../../../infrastructure/auth/session.store.js';
import type { DiscussionType } from '../../../domain/workflow/workflow.model.js';

interface Props {
  workspaceId: string;
}

const TYPE_ICONS: Record<DiscussionType, string> = {
  comment:       '💬',
  status_change: '🔄',
  approval:      '✅',
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function DiscussionThread({ workspaceId }: Props) {
  const [draft,   setDraft]   = createSignal('');
  const [posting, setPosting] = createSignal(false);
  const [error,   setError]   = createSignal<string | null>(null);

  async function handlePost(e: Event) {
    e.preventDefault();
    const text = draft().trim();
    if (!text) return;

    setError(null);
    setPosting(true);
    try {
      await discussionService.post(workspaceId, text);
      setDraft('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPosting(false);
    }
  }

  return (
    <div class="discussion-thread">
      <h3 class="discussion-title">Discussion</h3>

      {() => {
        const loading  = workflowStore.msgLoading();
        const messages = workflowStore.messages();

        if (loading) return <div class="discussion-loading">Loading…</div>;
        if (messages.length === 0) {
          return <p class="discussion-empty">No messages yet. Be the first to comment.</p>;
        }

        return (
          <ul class="discussion-list">
            {messages.map(msg => (
              <li
                key={msg.id}
                class={`discussion-item discussion-item--${msg.type}`}
              >
                <span class="discussion-type-icon" aria-hidden="true">
                  {TYPE_ICONS[msg.type] ?? '💬'}
                </span>
                <div class="discussion-item-body">
                  <div class="discussion-item-meta">
                    <strong class="discussion-author">{msg.authorName}</strong>
                    <time class="discussion-time" dateTime={msg.createdAt}>
                      {formatTime(msg.createdAt)}
                    </time>
                  </div>
                  <p class="discussion-content">{msg.content}</p>
                </div>
              </li>
            ))}
          </ul>
        );
      }}

      <form class="discussion-form" onSubmit={handlePost}>
        {() => error() && <p class="form-error">{error()}</p>}
        <div class="discussion-input-row">
          <textarea
            class="discussion-input"
            value={draft()}
            onInput={(e: InputEvent) => setDraft((e.target as HTMLTextAreaElement).value)}
            placeholder="Write a comment…"
            rows={2}
            disabled={posting()}
          />
          <button type="submit" class="btn btn-primary" disabled={posting() || !draft().trim()}>
            {() => posting() ? 'Posting…' : 'Post'}
          </button>
        </div>
      </form>
    </div>
  );
}
