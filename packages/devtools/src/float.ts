/**
 * Taking a pane out of the layout and putting it back.
 *
 * The inspector, the timeline and the tree each live in a fixed corner of the panel. Reading
 * one of them properly means giving it room, and the room has to come from the others. So
 * each carries a button that lifts it into a card over everything, and the same button puts
 * it back exactly where it was.
 *
 * The pane element itself is moved rather than re-rendered. Whatever drew into it keeps its
 * handle on it, its listeners, and its scroll position — a floated timeline is the same
 * timeline, not a copy of one.
 */

/** So a card cannot be dragged or resized into something unreadable. */
const MIN_W = 240;
const MIN_H = 160;

/**
 * Pointer capture, for the reason the splitters need it: without it the events stop arriving
 * once the pointer crosses the graph or an iframe, the release is never seen, and the card
 * keeps following the mouse.
 */
function draggable(handle: HTMLElement, onMove: (dx: number, dy: number) => void): void {
  handle.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    // Capture retargets the click that follows onto the handle, so a button inside it would
    // never hear its own click.
    if ((event.target as HTMLElement).closest('button')) return;
    event.preventDefault();
    handle.setPointerCapture(event.pointerId);
    let lastX = event.clientX;
    let lastY = event.clientY;

    const move = (e: PointerEvent): void => {
      onMove(e.clientX - lastX, e.clientY - lastY);
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const stop = (): void => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', stop);
      handle.removeEventListener('pointercancel', stop);
      handle.removeEventListener('lostpointercapture', stop);
      if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
    };

    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', stop);
    handle.addEventListener('pointercancel', stop);
    handle.addEventListener('lostpointercapture', stop);
  });
}

export interface FloatOptions {
  /** Shown on the card's bar, and on the button that lifts it. */
  title: string;
  /** Where a card opens the first time. Defaults to a cascade from the top left. */
  at?: { x: number; y: number; width: number; height: number };
  /** Told each way round, for a host that wants to remember or relayout. */
  onChange?: (floating: boolean) => void;
}

export interface Floatable {
  readonly floating: boolean;
  /** Lift it out, or put it back. Returns what it now is. */
  toggle(): boolean;
  dock(): void;
  destroy(): void;
}

/** Enough of a cascade that two cards opened together do not sit on top of each other. */
let opened = 0;

export function makeFloatable(pane: HTMLElement, options: FloatOptions): Floatable {
  const doc = pane.ownerDocument;
  let card: HTMLElement | null = null;
  /** Where the pane came from, so it goes back there rather than at the end. */
  let home: { parent: Node; before: Node | null } | null = null;

  const button = doc.createElement('button');
  button.type = 'button';
  button.className = 'fx-float-btn';
  button.textContent = '⇱';
  button.title = `Float ${options.title}`;
  pane.classList.add('fx-floatable');
  pane.append(button);

  /**
   * The panes rewrite their own contents — the inspector replaces its markup whenever the
   * selection changes — which takes the button with it. Rather than asking each of them to
   * leave it alone, it is put back when it goes.
   */
  const keep = new MutationObserver(() => {
    if (button.parentNode !== pane) pane.append(button);
  });
  keep.observe(pane, { childList: true });

  function dock(): void {
    if (!card || !home) return;
    home.parent.insertBefore(pane, home.before);
    card.remove();
    card = null;
    home = null;
    pane.classList.remove('fx-floated');
    button.textContent = '⇱';
    button.title = `Float ${options.title}`;
    options.onChange?.(false);
  }

  function float(): void {
    if (card || !pane.parentNode) return;
    home = { parent: pane.parentNode, before: pane.nextSibling };

    card = doc.createElement('div');
    card.className = 'fx-float';
    const spot = options.at ?? {
      x: 60 + (opened % 4) * 28,
      y: 60 + (opened % 4) * 28,
      width: 360,
      height: 280,
    };
    opened += 1;
    card.style.left = `${spot.x}px`;
    card.style.top = `${spot.y}px`;
    card.style.width = `${spot.width}px`;
    card.style.height = `${spot.height}px`;

    const bar = doc.createElement('div');
    bar.className = 'fx-float-bar';
    const name = doc.createElement('span');
    name.textContent = options.title;
    bar.append(name);

    const grip = doc.createElement('div');
    grip.className = 'fx-float-grip';
    grip.title = 'Drag to resize';

    card.append(bar, pane, grip);
    doc.body.appendChild(card);

    pane.classList.add('fx-floated');
    button.textContent = '⇲';
    button.title = `Put ${options.title} back`;

    draggable(bar, (dx, dy) => {
      card!.style.left = `${card!.offsetLeft + dx}px`;
      card!.style.top = `${Math.max(0, card!.offsetTop + dy)}px`;
    });
    draggable(grip, (dx, dy) => {
      card!.style.width = `${Math.max(MIN_W, card!.offsetWidth + dx)}px`;
      card!.style.height = `${Math.max(MIN_H, card!.offsetHeight + dy)}px`;
    });

    options.onChange?.(true);
  }

  button.addEventListener('click', (event) => {
    event.stopPropagation();
    if (card) dock();
    else float();
  });

  return {
    get floating() {
      return card !== null;
    },
    toggle() {
      if (card) dock();
      else float();
      return card !== null;
    },
    dock,
    destroy() {
      keep.disconnect();
      dock();
      button.remove();
      pane.classList.remove('fx-floatable');
    },
  };
}

export const FLOAT_CSS = `
.fx-floatable { position: relative; }
.fx-float-btn {
  position: absolute; top: 2px; right: 2px; z-index: 5;
  width: 18px; height: 18px; padding: 0; line-height: 1;
  font-size: 11px; color: var(--fx-muted, #8a90a2);
  background: var(--fx-panel, #14161c);
  border: 1px solid var(--fx-line, #262a35); border-radius: 4px;
  cursor: pointer; opacity: 0; transition: opacity .12s;
}
.fx-floatable:hover .fx-float-btn, .fx-float-btn:focus-visible { opacity: 1; }
.fx-float-btn:hover { color: var(--fx-accent, #5eead4); border-color: var(--fx-accent, #5eead4); }

.fx-float {
  position: fixed; z-index: 60; display: flex; flex-direction: column;
  background: var(--fx-panel, #14161c);
  border: 1px solid var(--fx-line, #262a35); border-radius: 8px;
  box-shadow: 0 12px 34px rgba(0, 0, 0, .5); overflow: hidden;
}
.fx-float-bar {
  display: flex; align-items: center; padding: 4px 8px; cursor: move;
  font-size: 11px; color: var(--fx-muted, #8a90a2);
  background: var(--fx-bg, #0f1115); border-bottom: 1px solid var(--fx-line, #262a35);
  user-select: none;
}
/* The pane fills the card, whatever it was sized to in the layout it came from. */
.fx-float > .fx-floated {
  flex: 1; min-height: 0; width: auto; height: auto; overflow: auto;
}
.fx-float-grip {
  position: absolute; right: 0; bottom: 0; width: 16px; height: 16px;
  cursor: nwse-resize;
  background: linear-gradient(135deg, transparent 50%, var(--fx-line, #262a35) 50%);
}
`;
