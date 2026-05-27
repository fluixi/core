// Garde de route — redirige vers /login si l'utilisateur n'est pas connecté
// Simule un middleware d'authentification côté client
import { useAuth } from '../store/auth';
import { useNavigate } from '@awc/kettlejs/router';
import { createEffect } from '@awc/kettlejs';

export function useAuthGuard() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirige si non authentifié — exécuté comme effet réactif
  createEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login', { replace: true });
    }
  });

  return { isAuthenticated };
}
