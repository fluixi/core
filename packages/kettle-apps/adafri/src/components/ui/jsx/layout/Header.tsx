// En-tête de l'application — affiche le fil d'Ariane et le menu utilisateur
import { html } from '@awc/kettlejs';
import { useLocation } from '@awc/kettlejs/router';
import { useAuth } from '../../../../store/auth';

export function Header() {
  console.log('load header')
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  //   function isAuthenticated(){
  //   return false
  // }
  // function user(){
  //   return null
  // }

  // Construit le fil d'Ariane à partir du pathname
  const breadcrumb = () => {
    const parts = location.pathname.split('/').filter(Boolean);
    if (parts.length === 0) return 'Accueil';
    return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' / ');
  };

  return (
    <header class="app-header">
      <span class="breadcrumb">{breadcrumb()}</span>
      <div class="user-menu">
        {isAuthenticated()
          ? html`
              <span class="text-sm">${user()!.name}</span>
              <div class="avatar">${user()!.avatar}</div>
            `
          : html`<span class="text-sm text-muted">Non connecté</span>`}
      </div>
    </header>
  );
}
