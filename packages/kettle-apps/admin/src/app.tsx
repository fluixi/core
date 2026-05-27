import { Router, Routes } from '@awc/kettlejs/router';
import { Suspense } from '@awc/kettlejs';
import { routes } from 'virtual:kettle-routes';
import { AuthProvider } from './store/auth.js';
import { PageSpinner } from './shared/components/ui/Spinner.js';
import './styles.css';
import '@awc/components/index.js';
import '@awc/adf-icon/registry.js';

export default function App(props?: { url?: string }) {
  return (
    <AuthProvider>
      <AppShell url={props?.url} />
    </AuthProvider>
  );
}

function AppShell(props?: { url?: string }) {
  return (
    <Router url={props?.url}>
      <Suspense id="root" fallback={<PageSpinner />}>
        <Routes children={routes} />
      </Suspense>
    </Router>
  );
}
