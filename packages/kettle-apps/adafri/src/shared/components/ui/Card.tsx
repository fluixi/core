interface CardProps {
  title?:    string;
  actions?:  unknown;
  children:  unknown;
  class?:    string;
}

export function Card({ title, actions, children, class: cls }: CardProps) {
  return (
    <div class={`card${cls ? ` ${cls}` : ''}`}>
      {(title || actions) && (
        <div class="card-header">
          {title && <h3 class="card-title">{title}</h3>}
          {actions && <div class="card-actions">{actions}</div>}
        </div>
      )}
      <div class="card-body">{children}</div>
    </div>
  );
}
