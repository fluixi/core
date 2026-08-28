---
"fluixi": patch
---

Make the router-next hooks SSR-safe. On the server, `useRouter` (and therefore `useNavigate`/`useParams`/`useLocation`) returns a no-op stub instead of throwing when no `RouterContext` is on the owner chain. This happens during a late/detached re-render — e.g. a slow data resource settling after `renderToStringAsync` already serialized the response and disposed the root — whose output is discarded; previously it threw a floating rejection that crashed the dev server / showed an error overlay seconds after the page rendered. On the client, a missing router is still genuine misuse and throws.
