import { createSignal } from 'fluixi';

/**
 * Components here destructure their props the way you would in plain JavaScript. With
 * `propsDestructure` on, the compiler rewrites each binding back into a read of the
 * props object, so the value stays live instead of being copied once at call time.
 *
 * Turn the option off in vite.config.ts and the labels below stop updating — that is the
 * whole feature, and it is what the tests check.
 */

/** A shorthand binding, and an alias. */
export function Label({ text, tone: mood }: { text: string; tone?: string }) {
  return (
    <p class="label" data-mood={mood}>
      {text}
    </p>
  );
}

/** A default. It only applies when the prop is `undefined`, exactly as it would in JS. */
export function Badge({ text, size = 'md' }: { text: string; size?: string }) {
  return (
    <span class="badge" data-size={size}>
      {text}
    </span>
  );
}

/** A nested pattern reads through the path it names. */
export function UserCard({ user: { name, role } }: { user: { name: string; role: string } }) {
  return (
    <div class="user">
      <b class="name">{name}</b>
      <i class="role">{role}</i>
    </div>
  );
}

/**
 * `...rest` is the shape most components have: name the props you use, forward the
 * remainder. The compiler writes the `splitProps` call, which carries the props over as
 * getters rather than reading them out into a plain object.
 */
export function Field({ label, ...rest }: { label: string; [key: string]: unknown }) {
  return (
    <label class="field">
      <span class="field-label">{label}</span>
      <input {...rest} />
    </label>
  );
}

export function App() {
  const [name, setName] = createSignal('Ada');
  const [role, setRole] = createSignal('author');

  return (
    <main class="app">
      <h1>Props</h1>

      <Label text={name()} tone="calm" />
      <Badge text={name()} />
      <Badge text={name()} size="lg" />
      <UserCard user={{ name: name(), role: role() }} />
      <Field label={name()} type="text" placeholder="type here" />

      <button class="rename" onClick={() => setName(name() === 'Ada' ? 'Grace' : 'Ada')}>
        rename
      </button>
      <button class="promote" onClick={() => setRole('maintainer')}>
        promote
      </button>
    </main>
  );
}
