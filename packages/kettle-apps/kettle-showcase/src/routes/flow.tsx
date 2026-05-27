// Page Control Flow — /flow
// Demonstrates: Show, For, Index, Switch/Match, Dynamic, Portal, ErrorBoundary, classMap
import {
  html,
  createSignal,
  Show,
  For,
  Index,
  Switch,
  Match,
  Dynamic,
  Portal,
  ErrorBoundary,
  classMap,
  createMemo,
} from '@awc/kettlejs';
import { A } from '@awc/kettlejs/router';

// ── Helpers ──────────────────────────────────────────────────────────────────

let nextId = 1;
function makeItem(label: string) {
  return { id: nextId++, label };
}

// ── Sub-components used by Dynamic ───────────────────────────────────────────

function CardInfo(props: { name: string; color: string }) {
  return html`
    <div
      style="padding:.75rem 1rem;border-radius:8px;background:${props.color};color:#fff;font-weight:600"
    >
      Composant : ${props.name}
    </div>
  `;
}

function ViewAlpha(props: Record<string, any>) {
  return CardInfo({ name: 'Alpha', color: '#3b82f6', ...props });
}
function ViewBeta(props: Record<string, any>) {
  return CardInfo({ name: 'Beta', color: '#10b981', ...props });
}
function ViewGamma(props: Record<string, any>) {
  return CardInfo({ name: 'Gamma', color: '#f59e0b', ...props });
}

const VIEWS: Record<string, (p: any) => any> = {
  alpha: ViewAlpha,
  beta: ViewBeta,
  gamma: ViewGamma,
};

// ── Component that intentionally throws (for ErrorBoundary demo) ──────────────

function BrokenComponent(props: { shouldThrow: boolean }) {
  if (props.shouldThrow) throw new Error('Oops — rendu cassé !');
  return html`<p class="text-sm" style="color:#10b981">✓ Rendu normal</p>`;
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function FlowPage() {
  // ── Show ──
  const [showContent, setShowContent] = createSignal(true);
  const [userName, setUserName] = createSignal<string | null>('Alice');

  // ── For (keyed by reference) ──
  const [items, setItems] = createSignal([
    makeItem('Pomme'),
    makeItem('Banane'),
    makeItem('Cerise'),
  ]);

  const addItem = () =>
    setItems((prev) => [
      ...prev,
      makeItem(`Item #${prev.length + 1}`),
    ]);

  const removeFirst = () => setItems((prev) => prev.slice(1));

  const shuffleItems = () =>
    setItems((prev) => [...prev].sort(() => Math.random() - 0.5));

  // ── Index (keyed by position) ──
  const [indexItems, setIndexItems] = createSignal(['Rouge', 'Vert', 'Bleu']);

  const rotateColors = () =>
    setIndexItems((prev) => {
      const [first, ...rest] = prev;
      return [...rest, first];
    });

  const pushColor = () => {
    const colors = ['Orange', 'Violet', 'Rose', 'Cyan'];
    setIndexItems((prev) => [
      ...prev,
      colors[prev.length % colors.length],
    ]);
  };

  const popColor = () =>
    setIndexItems((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));

  // ── Switch / Match ──
  const [status, setStatus] = createSignal<'idle' | 'loading' | 'success' | 'error'>('idle');
  const loading = createMemo(() => status() === 'loading');

  const simulate = () => {
    setStatus('loading');
    setTimeout(() => {
      setStatus(Math.random() > 0.3 ? 'success' : 'error');
    }, 1200);
  };

  // ── Dynamic ──
  const [activeView, setActiveView] = createSignal<'alpha' | 'beta' | 'gamma'>('alpha');

  // ── Portal ──
  const [portalOpen, setPortalOpen] = createSignal(false);

  // ── ErrorBoundary ──
  const [shouldThrow, setShouldThrow] = createSignal(false);

  return html`
    <div>
      <h1 class="page-title">Control Flow</h1>
      <p class="page-subtitle">
        Primitives de contrôle de flux framework-agnostiques — compatibles JSX
        et lit-html. Toutes retournent un <code>createMemo</code> réactif.
      </p>

      <!-- ══════════════════════════════════════════════════════════════════ -->
      <!-- Show                                                              -->
      <!-- ══════════════════════════════════════════════════════════════════ -->
      <div class="card mb-4">
        <div class="card-header">Show — Rendu conditionnel</div>
        <p class="text-sm text-muted mb-3">
          Affiche <code>children</code> quand <code>when</code> est truthy,
          sinon affiche <code>fallback</code>. La version fonction reçoit la
          valeur non-nulle.
        </p>

        <!-- Booléen simple -->
        <div class="demo-row mb-3" style="gap:.75rem;align-items:center">
          <button
            class="btn btn-primary btn-sm"
            @click=${() => setShowContent((v) => !v)}
          >
            ${() => (showContent() ? 'Masquer' : 'Afficher')}
          </button>
          ${Show({
            when: showContent,
            fallback: html`<span class="badge badge-warning">Masqué</span>`,
            children: html`<span class="badge badge-success">Visible ✓</span>`,
          })}
        </div>

        <!-- Valeur nullable — children en fonction -->
        <div class="demo-row mb-3" style="gap:.75rem;align-items:center">
          <button
            class="btn btn-outline btn-sm"
            @click=${() =>
              setUserName((n) => (n ? null : 'Alice'))}
          >
            Toggle utilisateur
          </button>
          ${Show({
            when: userName,
            fallback: html`<em class="text-muted text-sm">Non connecté</em>`,
            children: (name: string) =>
              html`<strong class="text-sm">Bonjour, ${name} !</strong>`,
          })}
        </div>
      </div>

      <!-- ══════════════════════════════════════════════════════════════════ -->
      <!-- For                                                               -->
      <!-- ══════════════════════════════════════════════════════════════════ -->
      <div class="card mb-4">
        <div class="card-header">For — Liste à clé par référence</div>
        <p class="text-sm text-muted mb-3">
          Chaque item est stable par référence. Réorganiser ne re-rend pas —
          seul le signal d'index se met à jour.
        </p>

        <div class="demo-row mb-3" style="gap:.5rem">
          <button class="btn btn-primary btn-sm" @click=${addItem}>
            + Ajouter
          </button>
          <button class="btn btn-outline btn-sm" @click=${removeFirst}>
            − Premier
          </button>
          <button class="btn btn-outline btn-sm" @click=${shuffleItems}>
            ⇄ Mélanger
          </button>
        </div>

        <ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:.4rem">
          ${For({
            each: items,
            fallback: html`<li class="text-muted text-sm">Liste vide</li>`,
            children: (
              item: { id: number; label: string },
              index: () => number
            ) => html`
              <li
                style="display:flex;align-items:center;gap:.75rem;padding:.4rem .6rem;background:var(--surface,#f9f9f9);border-radius:6px;font-size:.875rem"
              >
                <span
                  style="color:var(--text-muted,#888);min-width:1.5rem;text-align:right"
                  >${index}</span
                >
                <span>${item.label}</span>
                <span
                  style="margin-left:auto;font-size:.75rem;color:var(--text-muted,#aaa)"
                  >id=${item.id}</span
                >
              </li>
            `,
          })}
        </ul>
      </div>

      <!-- ══════════════════════════════════════════════════════════════════ -->
      <!-- Index                                                             -->
      <!-- ══════════════════════════════════════════════════════════════════ -->
      <div class="card mb-4">
        <div class="card-header">Index — Liste à clé par position</div>
        <p class="text-sm text-muted mb-3">
          Chaque slot est stable par position. Quand la valeur à une position
          change (ex. rotation), seul le signal <code>item</code> se met à
          jour — pas de re-création du nœud.
        </p>

        <div class="demo-row mb-3" style="gap:.5rem">
          <button class="btn btn-primary btn-sm" @click=${rotateColors}>
            ↻ Rotation
          </button>
          <button class="btn btn-outline btn-sm" @click=${pushColor}>
            + Couleur
          </button>
          <button class="btn btn-outline btn-sm" @click=${popColor}>
            − Dernière
          </button>
        </div>

        <div style="display:flex;gap:.5rem;flex-wrap:wrap">
          ${Index({
            each: indexItems,
            children: (item: () => string, index: number) => html`
              <div
                style="padding:.35rem .75rem;border-radius:20px;background:var(--primary,#3b82f6);color:#fff;font-size:.8rem"
              >
                [${index}] ${item}
              </div>
            `,
          })}
        </div>
      </div>

      <!-- ══════════════════════════════════════════════════════════════════ -->
      <!-- Switch / Match                                                    -->
      <!-- ══════════════════════════════════════════════════════════════════ -->
      <div class="card mb-4">
        <div class="card-header">Switch / Match — Multi-branche</div>
        <p class="text-sm text-muted mb-3">
          Évalue les branches <code>Match</code> dans l'ordre et affiche la
          première truthy. Identique à <code>switch</code> en JS mais réactif.
        </p>

        <div class="demo-row mb-3" style="gap:.75rem;align-items:center">
          <button
            class="btn btn-primary"
            @click=${simulate}
            ?disabled=${loading}
          >
            ${() => (loading() ? 'Simulation…' : 'Simuler une requête')}
          </button>
          <button
            class="btn btn-outline btn-sm"
            @click=${() => setStatus('idle')}
          >
            Reset
          </button>
        </div>

        ${Switch({
          fallback: html`<span class="badge">Inconnu</span>`,
          children: [
            Match({
              when: () => status() === 'idle',
              children: html`<p class="text-sm text-muted">
                En attente d'une action…
              </p>`,
            }),
            Match({
              when: loading,
              children: html`<div
                style="display:flex;align-items:center;gap:.5rem;font-size:.875rem"
              >
                <span
                  style="display:inline-block;width:14px;height:14px;border:2px solid var(--primary,#3b82f6);border-top-color:transparent;border-radius:50%;animation:spin 0.7s linear infinite"
                ></span>
                Chargement…
              </div>`,
            }),
            Match({
              when: () => status() === 'success',
              children: html`<div class="alert alert-success">
                ✓ Requête réussie !
              </div>`,
            }),
            Match({
              when: () => status() === 'error',
              children: html`<div
                class="alert"
                style="background:#fef2f2;border:1px solid #fca5a5;color:#b91c1c;padding:.75rem 1rem;border-radius:8px"
              >
                ✕ Erreur réseau simulée.
              </div>`,
            }),
          ],
        })}
      </div>

      <!-- ══════════════════════════════════════════════════════════════════ -->
      <!-- Dynamic                                                           -->
      <!-- ══════════════════════════════════════════════════════════════════ -->
      <div class="card mb-4">
        <div class="card-header">Dynamic — Composant dynamique</div>
        <p class="text-sm text-muted mb-3">
          Le prop <code>component</code> peut être un signal ou un accesseur.
          Quand il change, l'ancien rendu est abandonné et le nouveau composant
          est appelé.
        </p>

        <div class="demo-row mb-3" style="gap:.5rem">
          ${(['alpha', 'beta', 'gamma'] as const).map(
            (v) => html`
              <button
                class=${() =>
                  `btn btn-sm ${activeView() === v ? 'btn-primary' : 'btn-outline'}`}
                @click=${() => setActiveView(v)}
              >
                ${v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            `
          )}
        </div>

        ${Dynamic({
          component: () => VIEWS[activeView()],
        })}
      </div>

      <!-- ══════════════════════════════════════════════════════════════════ -->
      <!-- Portal                                                            -->
      <!-- ══════════════════════════════════════════════════════════════════ -->
      <div class="card mb-4">
        <div class="card-header">Portal — Rendu hors de l'arbre</div>
        <p class="text-sm text-muted mb-3">
          Rend le contenu dans un nœud cible différent (par défaut
          <code>document.body</code>). Utile pour les modales et tooltips.
        </p>

        <button
          class="btn btn-primary"
          @click=${() => setPortalOpen((v) => !v)}
        >
          ${() => (portalOpen() ? 'Fermer la modale' : 'Ouvrir la modale via Portal')}
        </button>

        ${Show({
          when: portalOpen,
          children: () =>
            Portal({
              children: html`
                <div
                  style="position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:1000"
                  @click=${() => setPortalOpen(false)}
                >
                  <div
                    style="background:#fff;padding:2rem;border-radius:12px;max-width:400px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,.3)"
                    @click=${(e: Event) => e.stopPropagation()}
                  >
                    <h3 style="margin:0 0 .75rem">Modale via Portal</h3>
                    <p style="margin:0 0 1.25rem;font-size:.875rem;color:#666">
                      Ce contenu est rendu directement dans
                      <code>document.body</code>, en dehors de l'arbre du
                      composant — mais reste réactif et sera disposé
                      automatiquement.
                    </p>
                    <button
                      class="btn btn-primary"
                      @click=${() => setPortalOpen(false)}
                    >
                      Fermer
                    </button>
                  </div>
                </div>
              `,
            }),
        })}
      </div>

      <!-- ══════════════════════════════════════════════════════════════════ -->
      <!-- ErrorBoundary                                                     -->
      <!-- ══════════════════════════════════════════════════════════════════ -->
      <div class="card mb-4">
        <div class="card-header">ErrorBoundary — Capture d'erreurs</div>
        <p class="text-sm text-muted mb-3">
          Capture les erreurs synchrones lors du rendu. Le <code>fallback</code>
          reçoit l'erreur et une fonction <code>reset()</code> pour réessayer.
        </p>

        <div class="demo-row mb-3" style="gap:.75rem;align-items:center">
          <button
            class="btn btn-outline btn-sm"
            @click=${() => setShouldThrow((v) => !v)}
          >
            ${() => (shouldThrow() ? 'Réparer le composant' : 'Casser le composant')}
          </button>
        </div>

        ${ErrorBoundary({
          fallback: (err: unknown, reset: () => void) => html`
            <div
              style="padding:.75rem 1rem;background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;font-size:.875rem"
            >
              <strong style="color:#b91c1c">Erreur capturée :</strong>
              <code style="color:#b91c1c;margin-left:.5rem">${String(err)}</code>
              <button
                class="btn btn-sm btn-outline"
                style="margin-left:1rem"
                @click=${() => {
                  setShouldThrow(false);
                  reset();
                }}
              >
                Réinitialiser
              </button>
            </div>
          `,
          children: () => BrokenComponent({ shouldThrow: shouldThrow() }),
        })}
      </div>

      <!-- ══════════════════════════════════════════════════════════════════ -->
      <!-- Navigation                                                        -->
      <!-- ══════════════════════════════════════════════════════════════════ -->
      <div class="mt-3">
        ${A({
          href: '/elements',
          class: 'btn btn-outline',
          children: '← Web Components',
        })}
      </div>
    </div>

    <style>
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      .demo-row {
        display: flex;
        align-items: center;
      }
    </style>
  `;
}
