import { Router, Routes } from '@awc/kettlejs/router';
import { Suspense } from '@awc/kettlejs';
import { routes } from 'virtual:kettle-routes';
import { AuthProvider } from './store/auth.js';
import { ThemeProvider } from './store/theme.js';
import { AccountProvider } from './store/account.js';
import { PageSpinner } from './shared/components/ui/Spinner.js';
import './styles.css';
import '@awc/components/index.js';
import '@awc/adf-icon/registry.js';

export default function App(props?: { url?: string }) {
  console.log('routeMatch appShell')
  return (
    <ThemeProvider>
      <AuthProvider>
        <AccountProvider>
          <AppShell url={props?.url} />
        </AccountProvider>
      </AuthProvider>
    </ThemeProvider>
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
