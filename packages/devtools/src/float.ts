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
function draggable(
  handle: HTMLElement,
  /** Total travel since the press, not the step since the last event. */
  onMove: (dx: number, dy: number) => void,
  onStart?: () => void,
): void {
  handle.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    // Capture retargets the click that follows onto the handle, so a button inside it would
    // never hear its own click.
    if ((event.target as HTMLElement).closest('button')) return;
    event.preventDefault();
    handle.setPointerCapture(event.pointerId);
    const fromX = event.clientX;
    const fromY = event.clientY;
    onStart?.();

    // Measured from where the press began. Adding up each step instead loses whatever a
    // clamp refused, so dragging back out of a minimum grows the card immediately rather
    // than when the pointer returns to where it stopped shrinking.
    const move = (e: PointerEvent): void => onMove(e.clientX - fromX, e.clientY - fromY);
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

    const bar = doc.createElement('div');
    bar.className = 'fx-float-bar';
    const name = doc.createElement('span');
    name.textContent = options.title;
    bar.append(name);

    card.append(bar, pane);
    doc.body.appendChild(card);

    pane.classList.add('fx-floated');
    button.textContent = '⇲';
    button.title = `Put ${options.title} back`;

    // Kept here rather than read back from the element each move. offsetWidth is what the
    // card ended up at, so once a size clamps, every further move measures from the clamp
    // and the card grows when the pointer is still travelling the other way.
    let x = spot.x;
    let y = spot.y;
    let w = spot.width;
    let h = spot.height;

    const apply = (): void => {
      const view = doc.defaultView;
      const vw = view?.innerWidth ?? w;
      const vh = view?.innerHeight ?? h;
      w = Math.min(Math.max(MIN_W, w), vw);
      h = Math.min(Math.max(MIN_H, h), vh);
      // Fully on screen: a card wider than the window puts its own resize handles past the
      // edge, and then there is no way to make it smaller again.
      x = Math.min(Math.max(0, x), Math.max(0, vw - w));
      y = Math.min(Math.max(0, y), Math.max(0, vh - h));
      card!.style.left = `${x}px`;
      card!.style.top = `${y}px`;
      card!.style.width = `${w}px`;
      card!.style.height = `${h}px`;
    };

    // Every edge and corner, so a card against one side of the window can still be resized
    // from the other.
    let from = { x, y, w, h };
    const remember = (): void => {
      from = { x, y, w, h };
    };

    for (const edge of ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'] as const) {
      const handle = doc.createElement('div');
      handle.className = `fx-float-h fx-float-${edge}`;
      card.append(handle);
      draggable(
        handle,
        (dx, dy) => {
          if (edge.includes('e')) w = from.w + dx;
          if (edge.includes('s')) h = from.h + dy;
          // A top or left edge leaves the opposite one where it is, so the card only moves
          // by as much as the size actually gave.
          if (edge.includes('w')) {
            w = Math.max(MIN_W, from.w - dx);
            x = from.x + from.w - w;
          }
          if (edge.includes('n')) {
            h = Math.max(MIN_H, from.h - dy);
            y = from.y + from.h - h;
          }
          apply();
        },
        remember,
      );
    }

    draggable(
      bar,
      (dx, dy) => {
        x = from.x + dx;
        y = from.y + dy;
        apply();
      },
      remember,
    );
    apply();

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
/* Edges and corners. Thin, and over everything, so a card can be resized from whichever
   side is reachable. */
.fx-float-h { position: absolute; z-index: 1; }
.fx-float-n, .fx-float-s { left: 8px; right: 8px; height: 6px; cursor: ns-resize; }
.fx-float-e, .fx-float-w { top: 8px; bottom: 8px; width: 6px; cursor: ew-resize; }
.fx-float-n { top: -3px; }
.fx-float-s { bottom: -3px; }
.fx-float-e { right: -3px; }
.fx-float-w { left: -3px; }
.fx-float-ne, .fx-float-nw, .fx-float-se, .fx-float-sw { width: 14px; height: 14px; }
.fx-float-nw { top: -3px; left: -3px; cursor: nwse-resize; }
.fx-float-ne { top: -3px; right: -3px; cursor: nesw-resize; }
.fx-float-sw { bottom: -3px; left: -3px; cursor: nesw-resize; }
.fx-float-se {
  bottom: 0; right: 0; cursor: nwse-resize;
  background: linear-gradient(135deg, transparent 50%, var(--fx-line, #262a35) 50%);
}
`;
