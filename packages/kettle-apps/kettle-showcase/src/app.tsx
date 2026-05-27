// Point d'entrée de l'application — assemble le Router, Suspense et les providers
import { Router, Routes } from '@awc/kettlejs/router';
import { Suspense } from '@awc/kettlejs';
import { html } from '@awc/kettlejs';
// import { html } from 'lit';
import { routes } from 'virtual:kettle-routes';
import { AuthProvider } from './store/auth';
import { ThemeProvider } from './store/theme';
import './styles.css';

export default function App(props?: { url?: string }) {
  // On empile les providers : Theme → Auth → Router
  // return html`${ThemeProvider({ children: ()=> AuthProvider({ children: ()=> AppShell({ url: props?.url }) }) })}`
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppShell url={props?.url} />
      </AuthProvider>
    </ThemeProvider>
  );
}

// Le shell principal utilise lit-html pour montrer l'interopérabilité JSX ↔ lit
function AppShell(props?: { url?: string }) {
  // return html`
  //   ${Router({
  //     url: props?.url,
  //     children: () =>
  //       Suspense({
  //         id: 'root',
  //         fallback: html`<div class="auth-page"><p>Chargement...</p></div>`,
  //         children: Routes({ children: routes }),
  //       }),
  //   })}
  // `;
  return (
    <Router url={props?.url}>
      <Suspense id="root" fallback={<div>Loading...</div>}>
        <Routes children={routes} />
      </Suspense>
    </Router>
  )
}
