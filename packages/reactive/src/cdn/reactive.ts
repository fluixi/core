/**
 * CDN entry: the full reactive API as a browser global.
 *
 *   <script src="https://.../@fluixi/reactive/reactive.global.js"></script>
 *   const [count, setCount] = Fluixi.createSignal(0);   // window.Fluixi.*
 *
 * Everything the `@fluixi/reactive` entry exposes (signal + store + observable),
 * running on the TC39 graph.
 */
export * from '../lib/index.js';
