// @vitest-environment jsdom
import { describe, it, expect, beforeAll } from 'vitest';
import { onCleanup, createEffect, createSignal, flush } from '@fluixi/reactive/signal';
import { render, Portal, Show, createNativeElement } from '@fluixi/dom';

describe('Portal disposal', () => {
  it('disposes portal content and removes the container when the render root is disposed', () => {
    let cleaned = false;
    const container = document.createElement('div');
    const bodyBefore = document.body.children.length;

    const dispose = render(
      () =>
        Portal({
          children: (() => {
            onCleanup(() => {
              cleaned = true;
            });
            return createNativeElement('div');
          })(),
        }),
      container,
    );

    // The portal mounted a container into <body>.
    expect(document.body.children.length).toBe(bodyBefore + 1);

    dispose();

    expect(cleaned).toBe(true);
    // The portal container is gone from <body>.
    expect(document.body.children.length).toBe(bodyBefore);
  });

  it('disposes an effect created inside portaled content (the scroll-lock case)', () => {
    let locked = false;
    const container = document.createElement('div');

    const Overlay = () => {
      createEffect(() => {
        locked = true;
        onCleanup(() => {
          locked = false;
        });
      });
      return createNativeElement('div');
    };

    const dispose = render(() => Portal({ children: Overlay() }), container);
    expect(locked).toBe(true);

    dispose();
    expect(locked).toBe(false);
  });

  it('disposes when portal children are a thunk (compiled form)', () => {
    let cleaned = false;
    const container = document.createElement('div');
    const bodyBefore = document.body.children.length;

    const dispose = render(
      () =>
        Portal({
          children: () => {
            onCleanup(() => {
              cleaned = true;
            });
            return createNativeElement('div');
          },
        }),
      container,
    );
    expect(document.body.children.length).toBe(bodyBefore + 1);

    dispose();
    expect(cleaned).toBe(true);
    expect(document.body.children.length).toBe(bodyBefore);
  });

  it('disposes a portal that unmounts while open (Portal inside a toggled <Show>)', async () => {
    let locked = false;
    const container = document.createElement('div');
    const bodyBefore = document.body.children.length;
    const [open, setOpen] = createSignal(true);

    const Overlay = () => {
      createEffect(() => {
        locked = true;
        onCleanup(() => {
          locked = false;
        });
      });
      return createNativeElement('div');
    };

    const dispose = render(
      () => Show({ when: open, children: () => Portal({ children: Overlay() }) }),
      container,
    );
    expect(locked).toBe(true);
    expect(document.body.children.length).toBe(bodyBefore + 1);

    // Close while open: the <Show> tears down its branch, which must dispose the portal.
    setOpen(false);
    await flush();

    expect(locked).toBe(false);
    expect(document.body.children.length).toBe(bodyBefore);

    dispose();
  });
});
