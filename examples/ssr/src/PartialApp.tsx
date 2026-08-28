/**
 * The shapes partial templates are most likely to get wrong under hydration: text holes
 * with static text on both sides, several holes in one element, and a hole followed by a
 * static sibling — each of which depends on the marker keeping the server's markup the
 * same shape as the clone.
 */
import { createSignal } from 'fluixi';

export function PartialApp() {
  const [name] = createSignal('Ada');
  const [n] = createSignal(7);

  return (
    <div class="partial">
      <h1 class="title">{name()}</h1>
      <p class="mid">before {name()} after</p>
      <p class="multi">{name()} and {n()} together</p>
      <section class="wrap">
        <span class="lead">{n()}</span>
        <span class="tail">static tail</span>
      </section>
    </div>
  );
}
