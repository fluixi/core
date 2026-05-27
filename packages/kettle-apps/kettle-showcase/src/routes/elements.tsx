// Page Web Components — /elements
// Démontre : defineElement, wrapElement, interop JSX ↔ lit-html ↔ web components,
//            props réactives, events custom, lifecycle hooks, usage direct HTML
import { html, createSignal, Show } from '@awc/kettlejs';
import { A } from '@awc/kettlejs/router';

// Import des web components (côté defineElement — enregistre les custom elements)
import '../components/elements/counter';
import '../components/elements/progress-bar';
import '../components/elements/toggle-switch';

export default function ElementsPage() {
  // ── Signaux partagés pour démontrer la réactivité entre composants ──
  const [counterValue, setCounterValue] = createSignal(0);
  const [progressValue, setProgressValue] = createSignal(35);
  const [darkMode, setDarkMode] = createSignal(false);
  const [eventLog, setEventLog] = createSignal<string[]>([]);

  // Ajoute un message au journal d'événements
  const logEvent = (msg: string) => {
    setEventLog((prev) =>
      [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 8)
    );
  };

  return html`
    <div>
      <h1 class="page-title">Web Components</h1>
      <p class="page-subtitle">
        Composants créés avec <code>defineElement</code> et utilisés via
        <code>wrapElement</code>. Interopérables entre JSX, lit-html et HTML
        natif.
      </p>

      <!-- ════════════════════════════════════════════════════════════════════ -->
      <!-- Section 1 : Compteur avec events                                    -->
      <!-- ════════════════════════════════════════════════════════════════════ -->
      <div class="card mb-4">
        <div class="card-header">k-counter — Compteur avec événements</div>
        <p class="text-sm text-muted mb-3">
          Web component avec props <code>label</code> et <code>step</code>,
          event <code>countChange</code>, et lifecycle hooks.
        </p>

        <!-- Utilisation directe en HTML natif (le custom element est enregistré) -->
        <div class="demo-row mb-3">
          <strong class="text-sm">HTML natif :</strong>
          <k-counter label="HTML direct" step="1"></k-counter>
        </div>

        <!-- Utilisation via wrapElement dans lit-html -->
        <div class="demo-row mb-3">
          <strong class="text-sm">wrapElement (lit-html) :</strong>
          <k-counter
            label="Counter navtive element" step="${2}" @countChange=${(
    e: any
  ) => {
    setCounterValue(e.detail);
    logEvent(`Compteur changé : ${e.detail}`);
  }}></k-counter>
        </div>

        <!-- Valeur réactive affichée séparément -->
        <div class="text-sm text-muted">
          Dernière valeur reçue via <code>onCountChange</code> :
          <strong>${counterValue}</strong>
        </div>
      </div>

      <!-- ════════════════════════════════════════════════════════════════════ -->
      <!-- Section 2 : Barre de progression                                    -->
      <!-- ════════════════════════════════════════════════════════════════════ -->
      <div class="card mb-4">
        <div class="card-header">k-progress — Barre de progression</div>
        <p class="text-sm text-muted mb-3">
          Prop <code>value</code> (Number), <code>color</code> (String),
          <code>striped</code> (Boolean). Contrôlée via un slider réactif.
        </p>

        <!-- Contrôle réactif — le slider modifie le signal, le web component suit -->
        <div class="form-group mb-3">
          <label class="form-label">Valeur : ${progressValue}%</label>
          <input
            type="range"
            min="0"
            max="100"
            .value=${String(progressValue())}
            @input=${(e: Event) =>
              setProgressValue(Number((e.target as HTMLInputElement).value))}
            style="width:100%"
          />
        </div>

        <!-- Plusieurs instances avec des props différentes -->
        <div style="display:flex;flex-direction:column;gap:.75rem">
          <k-progress value=${progressValue} color="#3b82f6"></k-progress>
          <k-progress value=${progressValue} color="#10b981" striped=${true}></k-progress>
          <k-progress value=${Math.min(
            100,
            progressValue() * 1.5
          )} color="#f59e0b"></k-progress>

        </div>
      </div>

      <!-- ════════════════════════════════════════════════════════════════════ -->
      <!-- Section 3 : Toggle switch                                           -->
      <!-- ════════════════════════════════════════════════════════════════════ -->
      <div class="card mb-4">
        <div class="card-header">k-toggle — Interrupteur</div>
        <p class="text-sm text-muted mb-3">
          Event <code>toggle</code> avec <code>detail: boolean</code>. Utilise
          <code>lifecycle.connectedCallback</code>.
        </p>

        <div style="display:flex;flex-direction:column;gap:.75rem">
          <k-toggle
            label="Mode sombre"
            @onToggle=${(e: CustomEvent<boolean>) => {
              setDarkMode(e.detail);
              logEvent(`Mode sombre : ${e.detail ? 'activé' : 'désactivé'}`);
            }}
          ></k-toggle>
          <k-toggle
            label="Notifications"
            checked=${true}
            @onToggle=${(e: CustomEvent<boolean>) => {
              logEvent(
                `Notifications : ${e.detail ? 'activées' : 'désactivées'}`
              );
            }}
          ></k-toggle>

          <k-toggle
              label='Mode maintenance'
            @onToggle=${(e: CustomEvent<boolean>) => {
              logEvent(`Maintenance : ${e.detail ? 'activé' : 'désactivé'}`);
            }}></<k-toggle>
        </div>

        <!-- Réaction au toggle mode sombre -->
        ${Show({
          when: () => darkMode(),
          children: () => html`
            <div class="alert alert-success" style="margin-top:1rem">
              Mode sombre activé ! (démonstration de la réactivité signal ↔ web
              component)
            </div>
          `,
        })}
      </div>

      <!-- ════════════════════════════════════════════════════════════════════ -->
      <!-- Section 4 : Interop JSX — web components utilisés dans du JSX       -->
      <!-- ════════════════════════════════════════════════════════════════════ -->
      <div class="card mb-4">
        <div class="card-header">Interop JSX ↔ Web Component</div>
        <p class="text-sm text-muted mb-3">
          Les composants wrappés avec <code>wrapElement</code> sont utilisables
          directement dans du JSX avec typage complet des props et events.
        </p>

      </div>

      <!-- ════════════════════════════════════════════════════════════════════ -->
      <!-- Section 5 : Journal d'événements                                    -->
      <!-- ════════════════════════════════════════════════════════════════════ -->
      <div class="card">
        <div class="card-header">Journal des événements</div>
        <p class="text-sm text-muted mb-3">
          Tous les events <code>CustomEvent</code> émis par les web components
          sont captés et affichés ici en temps réel.
        </p>
        <div
          style="font-family:monospace;font-size:.8rem;max-height:200px;overflow-y:auto"
        >
          ${() => {
            const logs = eventLog();
            return logs.length === 0
              ? html`<p class="text-muted">
                  Aucun événement pour le moment. Interagissez avec les
                  composants ci-dessus.
                </p>`
              : html`${logs.map(
                  (log) =>
                    html`<div
                      style="padding:.25rem 0;border-bottom:1px solid var(--border,#eee)"
                    >
                      ${log}
                    </div>`
                )}`;
          }}
        </div>
      </div>

      <div class="mt-3">
        ${A({
          href: '/about',
          class: 'btn btn-outline',
          children: '← Retour à propos',
        })}
      </div>
    </div>
  `;
}

// ── Composant JSX pur qui utilise les web components wrappés ──
// Démontre l'interop : composant JSX contenant des web components
// function InteropJSXDemo() {
//   const [jsxCount, setJsxCount] = createSignal(0);

//   return (
//     <div style="padding:1rem;border:1px dashed var(--border,#ddd);border-radius:8px">
//       <p style="margin:0 0 .75rem;font-size:.85rem;color:var(--text-muted)">
//         Ce bloc est rendu en <strong>JSX</strong>. Les web components ci-dessous
//         sont insérés via leurs wrappers typés.
//       </p>
//       <Counter
//         label="Depuis JSX"
//         step={3}
//         onCountChange={(e: CustomEvent<number>) => setJsxCount(e.detail)}
//       />
//       <p style="margin:.5rem 0 0;font-size:.85rem">
//         Valeur captée dans JSX : <strong>{jsxCount}</strong>
//       </p>
//     </div>
//   );
// }
