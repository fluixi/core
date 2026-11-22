// The homepage tour: one tab per area of the framework, one pill per feature. Every snippet is
// taken from the docs page of that feature, or compiled by scripts/hero-compile.mjs.
import { HERO_COMPILED, HERO_HTML, HERO_JSX } from '../generated/hero.js';

/** What sits beside the code: nothing, or one of the live previews. */
export const PREVIEWS = ['code', 'compiled', 'counter', 'form', 'skins'] as const;
export type Preview = (typeof PREVIEWS)[number];

export interface Pill {
  label: string;
  title: string;
  text: string;
  file: string;
  code: string;
  preview?: Exclude<Preview, 'code'>;
}

export interface Tab {
  id: string;
  label: string;
  /** Light and dark shades, taken along the logo's green-to-cyan gradient. */
  color: { light: string; dark: string };
  title: string;
  text: string;
  pills: Pill[];
}

const lines = (...l: string[]) => l.join('\n');

export const TABS: Tab[] = [
  {
    id: 'compiler',
    label: 'Compiler',
    color: { light: '#0f7c6d', dark: '#3ddbc8' },
    title: 'Write TypeScript. The compiler finds what is reactive.',
    text: 'The compiler reads ordinary TypeScript, works out which values can change, and generates direct DOM code with one binding per changing value.',
    pills: [
      {
        label: 'Source and output',
        preview: 'compiled',
        file: 'stepper.tsx',
        title: 'Your code, and what runs',
        text: 'Destructured props, intrinsics and JSX go in; a template cloned once and precise bindings come out. The output on the right is the compiler’s own, generated when this site was built.',
        code: HERO_JSX,
      },
      {
        label: 'Destructured props',
        file: 'card.tsx',
        title: 'Destructure as usual',
        text: 'The compiler rewrites each binding to a live read of the prop, defaults included, and warns where it cannot.',
        code: lines(
          "function Card({ title, size = 'md', ...rest }) {",
          '  return <h2 data-size={size} {...rest}>{title}</h2>;',
          '}',
          '',
          '// title and size compile to reads of props: still live',
        ),
      },
      {
        label: 'Intrinsics',
        file: 'counter.tsx',
        title: 'No imports for the basics',
        text: 'In an app, $signal, $memo, $effect and the rest resolve at compile time: nothing to import, nothing extra at run time.',
        code: lines('const count = $signal(0);', 'const doubled = $memo(() => count() * 2);', '$effect(() => console.log(doubled()));'),
      },
      {
        label: 'html`` templates',
        file: 'stepper.ts',
        title: 'No JSX required',
        text: 'The same component as a tagged template compiles to identical code, or runs from a script tag through the CDN build.',
        code: HERO_HTML,
      },
      {
        label: 'Directives',
        file: 'list.tsx',
        title: 'Control flow on the element',
        text: 'Branches and lists can sit on an element as attributes; the compiler turns them into the control-flow components.',
        code: lines(
          '<ul each={rows()}>{(row: Row) => <li>{row.name}</li>}</ul>',
          '<p if={user()}>Welcome back</p>',
          '<container else><a href="/login">Sign in</a></container>',
        ),
      },
      {
        label: 'Load strategies',
        file: 'dashboard.tsx',
        title: 'Ship less JavaScript',
        text: 'Mark a component and its code moves to its own chunk, loaded when it is seen, idle, matched or used.',
        code: lines(
          '<Summary total={total()} />',
          '<ExportDialog load:interaction />',
          '<AuditLog load:media="(min-width: 1024px)" />',
          '<RevenueChart load:visible="200px" />',
        ),
      },
    ],
  },
  {
    id: 'reactivity',
    label: 'Reactivity',
    color: { light: '#15803d', dark: '#5ee08f' },
    title: 'Fine-grained state, no re-renders',
    text: 'Signals hold state, memos derive from it, effects act on it. Components run once; a change reaches only what reads it.',
    pills: [
      {
        label: 'Signals',
        preview: 'counter',
        file: 'counter.tsx',
        title: 'Read it, set it',
        text: 'A signal is one handle: call it to read, .set to write. Reading it in JSX is the subscription. The counter on the right is this code, running.',
        code: lines(
          'function Counter() {',
          '  const count = $signal(0);',
          '',
          '  return (',
          '    <button onClick={() => count.set((c) => c + 1)}>',
          '      Clicked {count()} times',
          '    </button>',
          '  );',
          '}',
        ),
      },
      {
        label: 'Derived values',
        file: 'catalog.tsx',
        title: 'Derive, never sync',
        text: 'A memo recomputes when what it reads changes, only when someone reads it, and once per change.',
        code: lines("const query = $signal('');", 'const shown = $memo(() =>', '  products().filter((p) => p.name.includes(query())),', ');'),
      },
      {
        label: 'Effects',
        file: 'sales-chart.tsx',
        title: 'Act on changes',
        text: 'Effects run after a change and on the server too; browser-only setup goes in onMount.',
        code: lines(
          'let chart: Chart | undefined;',
          'onMount(() => (chart = new Chart(canvas)));',
          'onCleanup(() => chart?.destroy());',
          '$effect(() => chart?.update(sales()));',
        ),
      },
      {
        label: 'Stores',
        file: 'cart.tsx',
        title: 'Nested state, precise updates',
        text: 'A store tracks each property on its own: changing one line’s quantity updates that line and the total.',
        code: lines(
          'const cart = $store({ lines: [] as Line[] });',
          "cart.set('lines', 0, 'qty', 2);",
          '',
          'const total = $memo(() =>',
          '  cart.lines.reduce((sum, l) => sum + l.qty * l.price, 0),',
          ');',
        ),
      },
      {
        label: 'Async data',
        file: 'user-card.tsx',
        title: 'Loading and errors built in',
        text: 'A resource tracks its loading and error state, suspends the nearest Suspense, and is awaited on the server.',
        code: lines(
          'const user = $resource(() => props.id, (id) =>',
          '  fetch(`/api/users/${id}`).then((r) => r.json()),',
          ');',
          '',
          '<Suspense fallback={<Skeleton />}>',
          '  <h3>{user()?.name}</h3>',
          '</Suspense>',
        ),
      },
      {
        label: 'Transitions',
        file: 'tabs.tsx',
        title: 'Keep the page while it loads',
        text: 'A change inside a transition keeps the current content on screen until the next one has loaded.',
        code: lines('const [isPending, startTransition] = useTransition();', 'const open = (next: string) => startTransition(() => tab.set(next));'),
      },
    ],
  },
  {
    id: 'components',
    label: 'Components',
    color: { light: '#0369a1', dark: '#38bdf8' },
    title: 'Components that run once',
    text: 'A component is a function that builds its DOM one time. Control flow, context and lifecycle keep it current without running it again.',
    pills: [
      {
        label: 'Component model',
        file: 'greeting.tsx',
        title: 'Props are live reads',
        text: 'The function runs once; each prop is read where it is used, so a change in the parent reaches only that spot.',
        code: lines('function Greeting(props: { name: string }) {', '  return <h1>Hello, {props.name}</h1>;', '}', '', '<Greeting name={user().name} />'),
      },
      {
        label: 'Control flow',
        file: 'todos.tsx',
        title: 'Branches and lists',
        text: 'Show, Switch, For and Index keep what stays and build only what changed; keyed rows keep their DOM and focus.',
        code: lines(
          '<Show when={user()} fallback={<a href="/login">Sign in</a>}>',
          '  {(u) => <p>Welcome back, {u.name}</p>}',
          '</Show>',
          '',
          '<For each={todos()} by={(t) => t.id}>',
          '  {(todo) => <li>{todo().title}</li>}',
          '</For>',
        ),
      },
      {
        label: 'Lifecycle',
        file: 'search.tsx',
        title: 'Mount and clean up',
        text: 'onMount runs in the browser once the element is in the page; what it returns runs when the component goes.',
        code: lines(
          'function Search() {',
          '  let input!: HTMLInputElement;',
          '  onMount(() => {',
          '    input.focus();',
          '    const id = setInterval(refresh, 30_000);',
          '    return () => clearInterval(id);',
          '  });',
          '  return <input ref={input} type="search" />;',
          '}',
        ),
      },
      {
        label: 'Context',
        file: 'theme.tsx',
        title: 'Values down the tree',
        text: 'A provider hands a value to every component below it, without passing it through each one.',
        code: lines(
          "const Theme = createContext<'light' | 'dark'>('light', 'theme');",
          '',
          '<Theme.Provider value="dark">',
          '  <Toolbar />',
          '</Theme.Provider>',
          '',
          'const theme = useContext(Theme);',
        ),
      },
      {
        label: 'Web components',
        file: 'fx-counter.ts',
        title: 'Custom elements, same reactivity',
        text: 'Typed props, attributes and events, rendered by the same runtime, usable in any page.',
        code: lines(
          'const counterProps = {',
          '  step: prop.number(1),',
          "  label: prop.string('Count'),",
          '};',
          '',
          'export class FxCounter extends typedElement(counterProps) {',
          '  #count = signal(0);',
          '}',
        ),
      },
      {
        label: 'Hot reload',
        file: 'fluixi.config.ts',
        title: 'Edit without losing state',
        text: 'A changed component is swapped in place; with keepState its signals keep their values.',
        code: lines('export default defineConfig({', '  vitePlugin: { hot: { keepState: true } },', '});'),
      },
    ],
  },
  {
    id: 'server',
    label: 'Server',
    color: { light: '#0f766e', dark: '#2dd4bf' },
    title: 'Server code next to the page',
    text: 'File routes, server functions, API routes with typed contracts, middleware and environment checks, in one start package.',
    pills: [
      {
        label: 'Routing',
        file: 'src/routes/blog/[slug].tsx',
        title: 'Routes from files',
        text: 'Each file in src/routes is a page; brackets name the parameters.',
        code: lines('export default function Post() {', '  const params = useParams<{ slug: string }>();', '  return <h1>{params().slug}</h1>;', '}'),
      },
      {
        label: 'Server functions',
        file: 'users.ts',
        title: 'Call the server like a function',
        text: 'The body runs on the server and never reaches the browser; the call is a typed request.',
        code: lines('async function getUser(id: string) {', "  'use server';", '  return db.users.find(id);', '}', '', "const user = await getUser('42');"),
      },
      {
        label: 'API routes',
        file: 'src/api/hello.ts',
        title: 'Plain Request and Response',
        text: 'Export a handler per method; the file path is the address.',
        code: lines('export function GET() {', "  return Response.json({ message: 'hello' });", '}'),
      },
      {
        label: 'Contracts',
        file: 'src/api/v1/projects/index.ts',
        title: 'Typed, validated endpoints',
        text: 'Declare the body and the response once: input is checked, the handler is typed.',
        code: lines(
          'export const POST = route({',
          "  summary: 'Create a project',",
          '  body: z.object({ name: z.string().min(1).max(80) }),',
          '  response: Project,',
          '  status: 201,',
          '  handler: ({ body }) => createProject(body.name),',
          '});',
        ),
      },
      {
        label: 'OpenAPI',
        file: 'src/api/openapi.json.ts',
        title: 'A spec from the routes',
        text: 'The contracts already describe the API; one route serves them as OpenAPI.',
        code: lines('export const GET = openApiRoute(() => apiRoutes, {', "  title: 'Acme API',", "  version: '1.0.0',", '});'),
      },
      {
        label: 'Middleware',
        file: 'src/middleware.ts',
        title: 'Before every request',
        text: 'Middleware sees each request first and can answer, redirect or continue.',
        code: lines(
          'export default defineMiddleware([',
          '  async (request, next) => {',
          '    if (!isAuthed(request)) {',
          "      return new Response(null, { status: 302, headers: { location: '/login' } });",
          '    }',
          '    return next();',
          '  },',
          ']);',
        ),
      },
      {
        label: 'Environment',
        file: 'fluixi.config.ts',
        title: 'Secrets stay on the server',
        text: 'Only names listed as public reach the browser; a secret read in browser code fails the build.',
        code: lines('export default defineConfig({', '  env: {', "    public: ['API_URL', 'APP_URL'],", '  },', '});'),
      },
    ],
  },
  {
    id: 'data',
    label: 'Data',
    color: { light: '#166534', dark: '#86efac' },
    title: 'Cache, store and stream data',
    text: 'Cached reads invalidated by name, typed storage, realtime connections and forms that validate every field.',
    pills: [
      {
        label: 'Caching',
        file: 'src/data/orgs.ts',
        title: 'Named, shared reads',
        text: 'A cached read is shared by every route that needs it and refreshed by name after a change.',
        code: lines("const organisations = cache(() => api.get('/api/v1/organizations'), 'orgs', { ttl: 30_000 });", '', 'export const routeData = () => organisations();'),
      },
      {
        label: 'Storage',
        file: 'prefs.ts',
        title: 'Typed storage',
        text: 'One typed API over local storage, cookies or the server, chosen by adapter.',
        code: lines("const prefs = createStorage<Prefs>({ adapter: localStorageAdapter(), namespace: 'app' });", '', "prefs.set('theme', 'dark');", "prefs.get('theme');"),
      },
      {
        label: 'Realtime',
        file: 'live.ts',
        title: 'Live updates',
        text: 'A typed WebSocket with its connection state as a signal and messages queued until it opens.',
        code: lines(
          "const live = createWebSocket('/live', { serializer: json<Incoming, Outgoing>() });",
          '',
          'live.status();',
          "live.send({ type: 'watch', project: 'p-12' });",
          'live.subscribe((message) => refresh(message.id));',
        ),
      },
      {
        label: 'Forms',
        preview: 'form',
        file: 'sign-up.tsx',
        title: 'Every field its own cell',
        text: 'Forms validate with any Standard Schema; a keystroke updates one field, not the form.',
        code: lines(
          'const form = createForm({',
          "  email: createField('', { validators: [standardValidator(Email)] }),",
          '});',
          '',
          '<Form form={form} action={signUp} novalidate>',
          '  <FormField control={form.get(\'email\')} label="Email">',
          '    {(b) => <Input type="email" value={b.value()} onInput={b.onInput} />}',
          '  </FormField>',
          '</Form>',
        ),
      },
    ],
  },
  {
    id: 'auth',
    label: 'Auth',
    color: { light: '#0e7490', dark: '#22d3ee' },
    title: 'Sign people in, verify every call',
    text: 'Sessions, OAuth2 and OpenID Connect, token verification on the API and tokens between services.',
    pills: [
      {
        label: 'Sessions',
        file: 'auth.ts',
        title: 'Your own login',
        text: 'A session wraps your login call and keeps the token, its expiry and the user.',
        code: lines(
          'export const auth = createSession<User, { email: string; password: string }>({',
          '  async login(creds) {',
          "    const response = await fetch('/api/login', { method: 'POST', body: JSON.stringify(creds) });",
          '    const { access_token, expires_in } = await response.json();',
          '    return { token: access_token, expiresAt: Date.now() + expires_in * 1000 };',
          '  },',
          '});',
        ),
      },
      {
        label: 'OAuth2',
        file: 'auth.ts',
        title: 'Any OpenID provider',
        text: 'Sign in through an identity provider, with tokens kept in the browser or on the server.',
        code: lines(
          'export const auth = createAuthService<User>({',
          '  config: {',
          "    tokens: 'browser',",
          "    issuer: 'https://id.example.com/realms/app',",
          "    clientId: 'admin-spa',",
          '    redirectUri: `${appUrl}/callback`,',
          '  },',
          '});',
        ),
      },
      {
        label: 'Token verification',
        file: 'api.ts',
        title: 'Check every request',
        text: 'The API verifies the token’s signature, issuer and audience before it trusts a claim.',
        code: lines(
          'const verify = createTokenVerifier({',
          '  issuer: process.env.OIDC_ISSUER!,',
          "  audience: 'admin-spa',",
          '});',
          '',
          'const claims = await verify.fromRequest(request);',
        ),
      },
      {
        label: 'Service to service',
        file: 'reports-job.ts',
        title: 'Machines with their own identity',
        text: 'A service gets its own token, scoped and refreshed, to call another API.',
        code: lines(
          'const orders = createServiceClient({',
          '  issuer: process.env.OIDC_ISSUER!,',
          "  clientId: 'reports-job',",
          '  clientSecret: process.env.REPORTS_SECRET!,',
          "  scopes: ['orders:read'],",
          '});',
        ),
      },
    ],
  },
  {
    id: 'ui',
    label: 'UI',
    color: { light: '#115e59', dark: '#5eead4' },
    title: 'Accessible components, switchable skins',
    text: 'Fluixi UI gives every control its keyboard, focus and ARIA behaviour; a skin decides how it looks, and switching skins leaves the markup alone.',
    pills: [
      {
        label: 'Skins',
        preview: 'skins',
        file: 'new-project.tsx',
        title: 'One markup, many looks',
        text: 'Soft, Material, Paper and Glass restyle the same components; a brand sets fonts, radii and colours on top.',
        code: lines(
          '<Card>',
          '  <Stack>',
          '    <Input placeholder="Project name" />',
          '    <Row>',
          '      <Button>Create</Button>',
          '      <Button variant="ghost">Cancel</Button>',
          '    </Row>',
          '  </Stack>',
          '</Card>',
        ),
      },
      {
        label: 'Brand',
        file: 'app.tsx',
        title: 'Your brand over any skin',
        text: 'A brand layer sets type, radii and neutrals once, rendered on the server with its font preloads.',
        code: lines('<AppearanceProvider brand={brand}>', '  <App />', '</AppearanceProvider>'),
      },
      {
        label: 'Colour scheme',
        file: 'app.tsx',
        title: 'Light, dark and system',
        text: 'The scheme is stored, applied before paint and switchable from anywhere.',
        code: lines(
          '<ColorSchemeProvider storageKey="app-scheme">',
          '  <Header />',
          '</ColorSchemeProvider>',
          '',
          'const scheme = useColorScheme();',
          '<button onClick={() => scheme.toggle()}>Switch theme</button>',
        ),
      },
      {
        label: 'Layout',
        file: 'page.tsx',
        title: 'Layout without layout CSS',
        text: 'Stack, Row and Column place blocks; app CSS keeps to shape and spacing.',
        code: lines('<Stack>', '  <Row>', '    <Column><Summary /></Column>', '    <Column><Activity /></Column>', '  </Row>', '</Stack>'),
      },
    ],
  },
];

export const COMPILED = HERO_COMPILED;

/** Token kinds the code view colours; anything else is plain text. */
export const TOKEN_KINDS = ['comment', 'string', 'intrinsic', 'tag', 'keyword', 'number'] as const;
export type TokenKind = (typeof TOKEN_KINDS)[number];
export interface Token {
  text: string;
  kind?: TokenKind;
}

const TOKEN =
  /(\/\/.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`[^`]*`?)|(\$[A-Za-z]+)|(<\/?[A-Za-z][\w.:-]*)|\b(import|from|export|default|const|let|function|return|async|await|new|class|extends|if|as)\b|\b(\d[\d_]*)\b/g;

/** One array of tokens per line. Text only: the view renders them as text nodes. */
export function tokenize(code: string): Token[][] {
  return code.split('\n').map((line) => {
    const out: Token[] = [];
    let last = 0;
    TOKEN.lastIndex = 0;
    for (let m = TOKEN.exec(line); m; m = TOKEN.exec(line)) {
      if (m.index > last) out.push({ text: line.slice(last, m.index) });
      const kind = TOKEN_KINDS[[1, 2, 3, 4, 5, 6].findIndex((g) => m![g] !== undefined)];
      out.push({ text: m[0], kind });
      last = m.index + m[0].length;
    }
    if (last < line.length) out.push({ text: line.slice(last) });
    return out.length ? out : [{ text: ' ' }];
  });
}
