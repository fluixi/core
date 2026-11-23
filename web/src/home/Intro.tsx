const DOCS_URL = 'https://docs.fluixi.com';
const PLAYGROUND_URL = 'https://playground.fluixi.com';

/** The opening of the homepage: what Fluixi is, in one line, and where to go next. */
export function Intro() {
  return (
    <header class="intro wrap">
      <style scoped>{`
        .intro { position: relative; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 22px; padding-top: 88px; padding-bottom: 56px; }
        .intro-pill { display: inline-flex; align-items: center; gap: 8px; padding: 6px 12px; border-radius: 999px; font-size: 14px;
          border: 1px solid light-dark(rgba(180, 83, 9, .4), rgba(245, 158, 11, .45)); background: rgba(245, 158, 11, .12); }
        .intro-pill svg { color: light-dark(#b45309, #f59e0b); flex: none; }
        .intro h1 { margin: 0; font-size: clamp(40px, 6vw, 68px); line-height: 1.03; letter-spacing: -.035em; max-width: 14em; text-wrap: balance; }
        .intro h1 span { color: var(--accent); }
        .intro-lead { margin: 0; color: var(--muted); font-size: clamp(16px, 1.6vw, 19px); line-height: 1.6; max-width: 36em; }
        .intro-lead-panel { position: relative; isolation: isolate; padding: 12px 22px; border-radius: 14px; border: 1px solid var(--line);
          background: color-mix(in srgb, var(--bg) 80%, transparent); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); }
        /* A ring of light travelling round the border. The glow is the same ring blurred, on its own
           element: blurring the ring element itself would happen before its mask, and wash the panel. */
        .intro-lead-panel::before, .intro-lead-glow::before { content: ''; position: absolute; inset: -1px; border-radius: inherit; pointer-events: none;
          background: conic-gradient(from var(--lead-angle), transparent 0deg, var(--accent) 70deg, light-dark(#15803d, #5ee08f) 130deg, transparent 200deg);
          -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask-composite: exclude;
          padding: 1px; animation: lead-spin 7s linear infinite; }
        .intro-lead-glow { position: absolute; inset: 0; border-radius: inherit; pointer-events: none; z-index: -1; filter: blur(7px); opacity: .8; }
        .intro-lead-glow::before { inset: -2px; padding: 3px; }
        @property --lead-angle { syntax: '<angle>'; inherits: false; initial-value: 0deg; }
        @keyframes lead-spin { to { --lead-angle: 360deg; } }
        @media (prefers-reduced-motion: reduce) { .intro-lead-panel::before, .intro-lead-glow::before { animation: none; } }
        .intro-actions { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; align-items: center; }
        .intro-install { font: 14px var(--mono); padding: 12px 16px; border-radius: 10px; border: 1px solid var(--line); background: var(--bg); }
        .intro-install b { color: var(--muted); font-weight: 400; margin-right: 10px; }
      `}</style>
      <p class="intro-pill">
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </svg>
        Experimental: APIs may change between alpha releases
      </p>
      <h1>
        Fine-grained reactivity, with a compiler that <span>understands your code.</span>
      </h1>
      {/* The scene animates behind the hero: the panel keeps the line readable over it. */}
      <div class="intro-lead-panel">
        <span class="intro-lead-glow" aria-hidden="true" />
        <p class="intro-lead">Write ordinary TypeScript. Fluixi updates only the text, attribute or branch that changed; components run once.</p>
      </div>
      <div class="intro-actions">
        <a class="btn primary" href={`${DOCS_URL}/v1/en/quickstart`}>Get started</a>
        <a class="btn ghost" href={PLAYGROUND_URL}>Open the playground</a>
        <span class="intro-install"><b>$</b>npm create fluixi</span>
      </div>
    </header>
  );
}
