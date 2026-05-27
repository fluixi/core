import type { WorkspaceRole } from '../../../domain/workflow/invite.model.js';

interface Props {
  role: WorkspaceRole | string;
}

const ROLE_STYLES: Record<string, string> = {
  owner:  'bg-purple-100 text-purple-700',
  admin:  'bg-indigo-100 text-indigo-700',
  editor: 'bg-blue-100 text-blue-700',
  viewer: 'bg-gray-100 text-gray-600',
  guest:  'bg-amber-100 text-amber-700',
};

export function RoleBadge({ role }: Props) {
  return (
    <span class={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${ROLE_STYLES[role] ?? 'bg-gray-100 text-gray-600'}`}>
      {role}
    </span>
  );
}
