import { createSignal } from '@fluixi/core';

/** A component whose only job is to render native-element children passed to it. */
function Wrapper(props: { children?: unknown }) {
  return <div class="wrap">{props.children}</div>;
}

/**
 * Native children (incl. void elements) passed THROUGH a component boundary.
 * Under hydration these must be adopted from the server DOM exactly once. The bug
 * was that a void element (<input>, <br>) stranded the hydration cursor on its
 * null firstChild, so the following sibling couldn't be matched and was rebuilt
 * fresh — duplicating it.
 */
export function ChildrenApp() {
  const [n, setN] = createSignal(0);
  return (
    <main id="capp">
      <Wrapper>
        <input class="field" value="hi" />
        <br />
        <input class="field2" value="yo" />
        <button class="bump" onClick={() => setN(n() + 1)}>
          bump
        </button>
      </Wrapper>
      <span class="count">{n()}</span>
    </main>
  );
}
