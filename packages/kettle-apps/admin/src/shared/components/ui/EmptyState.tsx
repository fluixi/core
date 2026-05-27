interface EmptyStateProps {
  icon?:    string;
  title:    string;
  message?: string;
  action?:  any;
}

export function EmptyState({ icon = '📭', title, message, action }: EmptyStateProps) {
  return (
    <div class="empty-state">
      <div class="empty-state-icon">{icon}</div>
      <h3 class="empty-state-title">{title}</h3>
      {message && <p class="empty-state-message">{message}</p>}
      {action && <div class="empty-state-action">{action}</div>}
    </div>
  );
}
