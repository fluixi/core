import type { WorkflowTeam } from '../../../domain/workflow/team.model.js';

interface Props {
  team: WorkflowTeam;
}

export function TeamBadge({ team }: Props) {
  return (
    <span
      class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
      style={`background: ${team.color ?? '#6366f1'}`}
    >
      {team.icon && <span>{team.icon}</span>}
      <span>{team.name}</span>
    </span>
  );
}
