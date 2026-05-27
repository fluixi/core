import { createSignal, createMemo } from '@awc/kettlejs';
// import { workspaceService } from '../../../domain/workflow/workflow.service.js';
import { useAccount } from '../../../store/account.js';
import { useWorkspaceService } from '../../../domain/workflow/service.context.js';

interface Props {
  onClose: () => void;
  onCreated: (wsId: string) => void;
}

const PRESET_COLORS = [
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#f97316', // orange
  '#14b8a6', // teal
  '#22c55e', // green
  '#3b82f6', // blue
  '#f59e0b', // amber
];

export function CreateWorkspaceModal({ onClose, onCreated }: Props) {
  const [name, setName]             = createSignal('');
  const [description, setDescription] = createSignal('');
  const [logo, setLogo]             = createSignal('');
  const [color, setColor]           = createSignal(PRESET_COLORS[0]);
  const [industry, setIndustry]     = createSignal('');
  const [website, setWebsite]       = createSignal('');
  const [dueDate, setDueDate]       = createSignal('');
  const [submitting, setSubmitting] = createSignal(false);
  const [error, setError]           = createSignal<string | null>(null);

  // Pass memo accessor directly so applyProps can track it reactively via ._node
  const isDisabled = createMemo(() => name().trim().length === 0 || submitting());
  const act = useAccount();
  const {workspaceActions} = useWorkspaceService()!
  async function handleSubmit(e: Event) {
    e.preventDefault();
    const acc = act.account();
    if (!acc || isDisabled()) return;

    setSubmitting(true);
    setError(null);
    try {
      const ws = await workspaceActions.create(acc.id, {
        name:        name().trim(),
        description: description().trim() || undefined,
        logo:        logo().trim() || undefined,
        color:       color() || undefined,
        industry:    industry().trim() || undefined,
        website:     website().trim() || undefined,
        dueDate:     dueDate() || undefined,
      });
      onCreated(ws.id);
    } catch (err) {
      setError((err as Error).message ?? 'Something went wrong');
      setSubmitting(false);
    }
  }

  return (
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div class="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 shrink-0">
          <h2 class="text-lg font-semibold text-gray-900">New Workspace</h2>
          <button
            class="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
            onClick={onClose}
            type="button"
          >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <form onSubmit={handleSubmit} class="overflow-y-auto px-6 py-5 space-y-5 flex-1">

          {/* Color + Logo preview row */}
          <div class="flex items-center gap-4">
            {/* Avatar preview */}
            <div
              class="w-14 h-14 rounded-xl shrink-0 flex items-center justify-center overflow-hidden text-white font-bold text-xl shadow-sm"
              style={`background-color: ${color()}`}
            >
              {logo().trim() ? (
                <img src={logo()} alt="logo" class="w-full h-full object-cover" />
              ) : (
                <span>{name().trim().charAt(0).toUpperCase() || '?'}</span>
              )}
            </div>

            {/* Color swatches */}
            <div>
              <p class="text-xs font-medium text-gray-500 mb-2">Brand color</p>
              <div class="flex gap-2 flex-wrap">
                {PRESET_COLORS.map((c) => (
                  <button
                    type="button"
                    class="w-6 h-6 rounded-full border-2 transition-all"
                    style={`background-color: ${c}; border-color: ${color() === c ? '#1e1b4b' : 'transparent'}`}
                    onClick={() => setColor(c)}
                  />
                ))}
                {/* Custom color input */}
                <label class="w-6 h-6 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer relative overflow-hidden hover:border-gray-400">
                  <span class="text-gray-400 text-xs">+</span>
                  <input
                    type="color"
                    class="absolute inset-0 opacity-0 cursor-pointer"
                    value={color()}
                    onInput={(e) => setColor((e.target as HTMLInputElement).value)}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Name */}
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Workspace name <span class="text-red-500">*</span>
            </label>
            <input
              type="text"
              class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="e.g. Brand Awareness 2025"
              value={name()}
              onInput={(e) => setName((e.target as HTMLInputElement).value)}
              required
              autofocus
            />
          </div>

          {/* Description */}
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Description <span class="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              placeholder="What does this workspace manage?"
              rows={2}
              value={description()}
              onInput={(e) => setDescription((e.target as HTMLTextAreaElement).value)}
            />
          </div>

          {/* Logo URL */}
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Logo URL <span class="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="url"
              class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="https://example.com/logo.png"
              value={logo()}
              onInput={(e) => setLogo((e.target as HTMLInputElement).value)}
            />
          </div>

          {/* Industry + Website */}
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Industry</label>
              <select
                class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                value={industry()}
                onChange={(e) => setIndustry((e.target as HTMLSelectElement).value)}
              >
                <option value="">Select…</option>
                <option value="advertising">Advertising</option>
                <option value="ecommerce">E-commerce</option>
                <option value="finance">Finance</option>
                <option value="healthcare">Healthcare</option>
                <option value="media">Media</option>
                <option value="real_estate">Real Estate</option>
                <option value="retail">Retail</option>
                <option value="saas">SaaS</option>
                <option value="travel">Travel</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Website</label>
              <input
                type="url"
                class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="https://…"
                value={website()}
                onInput={(e) => setWebsite((e.target as HTMLInputElement).value)}
              />
            </div>
          </div>

          {/* Due date */}
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Due date <span class="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="date"
              class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              value={dueDate()}
              onInput={(e) => setDueDate((e.target as HTMLInputElement).value)}
            />
          </div>

          {error() && (
            <p class="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error()}</p>
          )}
        </form>

        {/* Footer actions — outside scroll area */}
        <div class="px-6 pb-6 pt-4 border-t border-gray-100 shrink-0 flex gap-3">
          <button
            type="button"
            class="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            class="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center gap-2"
            disabled={isDisabled}
            onClick={handleSubmit}
          >
            {submitting() && (
              <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {submitting() ? 'Creating…' : 'Create Workspace'}
          </button>
        </div>
      </div>
    </div>
  );
}
