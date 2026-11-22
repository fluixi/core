import { onMount, signal } from '@fluixi/core';
import { mountJourney, type Journey as Scene } from './scene.js';

/**
 * The scroll-driven scene behind the homepage. It exists only in the browser: the server render
 * leaves an empty canvas, which is the page's plain background.
 */
export function Journey() {
  let canvas!: HTMLCanvasElement;
  const paused = signal(false);
  let scene: Scene | null = null;

  onMount(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    paused.set(reduce.matches);
    scene = mountJourney(canvas, { logoSrc: '/logos/mark.png', paused: () => paused() });
    const onReduce = () => {
      paused.set(reduce.matches);
      scene?.redraw();
    };
    reduce.addEventListener('change', onReduce);
    return () => {
      reduce.removeEventListener('change', onReduce);
      scene?.dispose();
    };
  });

  const toggle = () => {
    paused.set((p) => !p);
    // The loop stops itself while paused; a resume has to start it again.
    scene?.redraw();
  };

  return (
    <>
      <canvas ref={(el: HTMLCanvasElement) => (canvas = el)} class="journey" aria-hidden="true" />
      <button type="button" class="journey-pause" aria-pressed={paused() ? 'true' : 'false'} onClick={toggle}>
        {paused() ? 'Play motion' : 'Pause motion'}
      </button>
    </>
  );
}
