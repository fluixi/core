// Layout racine — enveloppe TOUTES les routes de l'application
// Contient la barre latérale, l'en-tête et le slot <Outlet> pour les pages
import { Outlet } from '@awc/kettlejs/router';
import { html } from '@awc/kettlejs';
import { Sidebar } from '../components/ui/jsx/layout/Sidebar';
// import { Sidebar } from '../components/ui/Sidebar';
// import { Header } from '../components/ui/Header';
import { Header } from '../components/ui/jsx/layout/Header';

export default function RootLayout() {
  // Interop : le layout JSX utilise des composants lit-html (Sidebar, Header)
  return (
    <div class="app-shell">
      <Sidebar />
      <div class="app-main">
        <Header />
        <div class="app-content">
          <Outlet />
        </div>
      </div>
    </div>
  )
  // return html`
  //   <div class="app-shell">
  //     ${Sidebar()}
  //     <div class="app-main">
  //       ${Header()}
  //       <div class="app-content">
  //         ${Outlet()}
  //       </div>
  //     </div>
  //   </div>
  // `;
}
