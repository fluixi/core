// Resolved by the `resolve` rule in fluixi.config.ts: a route writes <StatusPill .../>
// with no import and the build points the tag here.
import type { TicketStatus } from '../services/ticket-repo.js';

const TONE: Record<TicketStatus, string> = {
  open: '#b54708',
  pending: '#175cd3',
  closed: '#067647',
};

export function StatusPill(props: { status: TicketStatus }) {
  return (
    <span
      class="pill"
      style={{
        color: TONE[props.status] ?? '#475467',
        border: `1px solid currentColor`,
        borderRadius: '999px',
        padding: '0 .5em',
        fontSize: '.85em',
      }}
    >
      {props.status}
    </span>
  );
}

export default StatusPill;
