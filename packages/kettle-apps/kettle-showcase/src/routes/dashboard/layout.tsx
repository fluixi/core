// Layout dashboard — layout imbriqué avec onglets de navigation
// Démontre : layout imbriqué, navigation par onglets, Outlet
import { Outlet, A, useLocation } from '@awc/kettlejs/router';
import { html, classMap } from '@awc/kettlejs';


export default function DashboardLayoutJSX() {
  const location = useLocation();

  // Détermine l'onglet actif en fonction du chemin
  const isActive = (path: string) => {
    // if (path === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname === path;
  };
  return (
    <div class="dashboard-layout">
      <div class="tabs">
        {[
          { path: '/dashboard', label: 'Vue d\'ensemble' },
          { path: '/dashboard/analytics', label: 'Analytiques' },
          { path: '/dashboard/settings', label: 'Paramètres' },
        ].map((tab) => (
          <div class={`tab ${isActive(tab.path) ? 'active' : ''}`}>
            <A href={tab.path}>{tab.label}</A>
          </div>
        ))}
      </div>
      <Outlet />
    </div>
  );
}

// export default function DashboardLayout() {
//   const location = useLocation();

//   // Détermine l'onglet actif en fonction du chemin
//   const isActive = (path: string) => {
//     // if (path === '/dashboard') return location.pathname === '/dashboard';
//     return location.pathname === path;
//   };

//   return html`
//     <div class="dashboard-layout">
//       <!-- Onglets de navigation du dashboard -->
//       <div class="tabs">
//         ${[
//           { path: '/dashboard', label: 'Vue d\'ensemble' },
//           { path: '/dashboard/analytics', label: 'Analytiques' },
//           { path: '/dashboard/settings', label: 'Paramètres' },
//         ].map(
//           (tab) => html`
//             <div class="tab ${()=>isActive(tab.path) ? 'active' : ''}"
//                  @click=${() => {/* la navigation se fait via le lien A */}}>
//               ${A({ href: tab.path, children: tab.label })}
//             </div>
//           `
//         )}
//       </div>

//       <!-- Contenu de la sous-route -->
//       ${Outlet()}
//     </div>
//   `;
// }
