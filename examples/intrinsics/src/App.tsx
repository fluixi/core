import { signal } from '@fluixi/reactive/signal';

/**
 * The same counter twice. One imports the runtime API; the other writes the `$`
 * intrinsic and imports nothing. `$signal` compiles to `signal`, so there is one
 * reactive graph underneath and no way to tell them apart at runtime.
 */

/** The explicit form. A library that never runs this compiler writes this. */
export function RuntimeCounter() {
  const count = signal(0);

  return (
    <div class="runtime">
      <span class="value">{count()}</span>
      <button class="inc" onClick={() => count.set(count() + 1)}>
        +
      </button>
    </div>
  );
}

/** The intrinsic form. No import — the compiler resolves `$signal` and adds it. */
export function IntrinsicCounter() {
  const count = $signal(0);

  return (
    <div class="intrinsic">
      <span class="value">{count()}</span>
      <button class="inc" onClick={() => count.set(count() + 1)}>
        +
      </button>
    </div>
  );
}

/**
 * The tuple form still works and mixes freely: `createSignal` and `$memo` are the same
 * primitives, so a derived value tracks a signal made the other way.
 */
export function Mixed() {
  const count = signal(1);
  const doubled = $memo(() => count() * 2);

  return (
    <div class="mixed">
      <span class="value">{doubled()}</span>
      <button class="inc" onClick={() => count.set(count() + 1)}>
        +
      </button>
    </div>
  );
}

/** A store reads like an object, because it is one. */
export function Profile() {
  const user = $store({ name: 'Ada', role: 'author' });

  return (
    <div class="profile">
      <span class="value">{user.name}</span>
      <i class="role">{user.role}</i>
      <button class="inc" onClick={() => user.set({ name: 'Grace' })}>
        rename
      </button>
    </div>
  );
}

export function App() {
  return (
    <main>
      <h1>Intrinsics</h1>
      <RuntimeCounter />
      <IntrinsicCounter />
      <Mixed />
      <Profile />
    </main>
  );
}
