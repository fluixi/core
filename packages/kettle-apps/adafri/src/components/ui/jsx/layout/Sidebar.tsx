// Barre latérale de navigation — composant lit-html partagé
import { html } from '@awc/kettlejs';
import { A } from '@awc/kettlejs/router';
import { useAuth } from '../../../../store/auth';

function navLink(href: string, label: string) {
    return <A href={href} children={label} activeClass="active" />
}
// function navLink(href: string, label: string, location: Location) {
//   const isActive = () => location.pathname === href;
//   return A({
//     href,
//     class: ()=> isActive() ? 'active' : '',
//     children: label
//   });
// }

export function Sidebar() {
  const { isAuthenticated } = useAuth();

  return (
    <>
        <aside className="app-sidebar">
            <div className="logo">KettleJS</div>

            <div className="nav-section">Navigation</div>
            {navLink('/', 'Accueil')}
            {navLink('/about', 'À propos')}
            {navLink('/blog', 'Blog')}
            {navLink('/elements', 'Web Components')}
            {navLink('/flow', 'Control Flow')}

            <div className="nav-section">Application</div>
            {navLink('/dashboard', 'Tableau de bord')}
            {navLink('/dashboard/analytics', 'Analytiques')}
            {navLink('/dashboard/settings', 'Paramètres')}

            <div className="nav-section">Compte</div>
            {() =>
              isAuthenticated()
                ? html`
                    ${navLink('/profile', 'Mon profil')}
                    <a href="#" @click=${(e: Event) => { e.preventDefault(); useAuth().logout(); }}>
                      Déconnexion
                    </a>
                  `
                : html`
                    ${navLink('/login', 'Connexion')}
                    ${navLink('/register', 'Inscription')}
                  `}
        </aside>
    </>
  )
}

export default Sidebar;
