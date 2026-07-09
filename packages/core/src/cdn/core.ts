/**
 * CDN entry: the Fluixi framework runtime as a browser global.
 *
 *   <script src="https://.../@fluixi/core/core.global.js"></script>
 *   const [count, setCount] = Fluixi.createSignal(0);
 *   Fluixi.startClient(App);   // or Fluixi.mount(App, root)
 *
 * Self-contained: the whole client runtime — reactive (createSignal/createMemo/…),
 * components + lifecycle, control flow (Show/For/Switch/Suspense), the router, and
 * the client bootstrap (startClient/mount/hydrate) — bundled into one <script>.
 * Server/compiler/vite tooling is NOT included (it isn't part of the browser runtime).
 */
export * from '../lib/index.js';
export { startClient, mount } from '../lib/client/index.js';
export {
  Router,
  Outlet,
  Redirect,
  Link,
  A,
  useRouter,
  useNavigate,
  useLocation,
  useParams,
  useParam,
  useMatch,
  useSearchParams,
  createMemoryHistory,
  createBrowserHistory,
} from '../lib/router-next/index.js';
