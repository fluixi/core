export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize    = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label?:    string;
  variant?:  ButtonVariant;
  size?:     ButtonSize;
  disabled?: boolean;
  loading?:  boolean;
  type?:     'button' | 'submit' | 'reset';
  onClick?:  (e: MouseEvent) => void;
  children?: unknown;
}

export function Button({
  label,
  variant  = 'primary',
  size     = 'md',
  disabled = false,
  loading  = false,
  type     = 'button',
  onClick,
  children,
}: ButtonProps) {
  return (
    <button
      type={type}
      class={`btn btn-${variant} btn-${size}${loading ? ' btn-loading' : ''}`}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading && <span class="btn-spinner" aria-hidden="true" />}
      {children ?? label}
    </button>
  );
}
