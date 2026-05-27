import {
  onMount,
  useContext,
  useEffect,
  Suspense,
  html,
  $component,
} from '@awc/kettlejs';
import { ThemeContext } from '../../context.js';
import './dashboard.css';
import { $Suspense } from '@awc/dom';

const LitComponent = $component(() => {
  const { theme, toggleTheme } = useContext(ThemeContext, true);
  function handleToggle() {
    toggleTheme();
  }
  useEffect(() => {
    // e();
    // toggleTheme = useContext(ThemeContext).toggleTheme;
    console.log('Dashboard lit mounted, current theme:', theme.text);
  });
  onMount(() => {
    console.log('on mount dashboard lit fired 🔥');
  });

  return html` <div class="dashboard-page">
    <h1>Dashboard Page</h1>
    <p>
      Welcome to the dashboard page. Theme is
      <button @click=${handleToggle}>${theme.text}</button>
    </p>
  </div>`;
});

function LitAsyncComponent() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(LitComponent);
    }, 3000);
  });
}

export function LitDashboardPage() {
  return $Suspense(
    () => LitAsyncComponent,
    html`<div>Loading suspense...</div>`
  );
  // return () =>
  //   html`${Suspense({
  //     children: LitAsyncComponent,
  //     // children: html`${LitAsyncComponent()}`,
  //     fallback: <div style="font-weight: bold">Loading child...</div>,
  //   })}`;
}

export function DashboardPage() {
  const { theme, toggleTheme } = useContext(ThemeContext);
  useEffect(() => {
    // toggleTheme = useContext(ThemeContext).toggleTheme;
    console.log('Dashboard jsx mounted, current theme:', toggleTheme);
  });
  onMount(() => {
    console.log('on mount dashboard jsx fired 🔥');
  });

  function handleToggle() {
    // o.text += 1;
    toggleTheme();
  }

  function Component() {
    return (
      <>
        <div class="dashboard-page">
          <h1>Dashboard Page</h1>
          <p>
            Welcome to the dashboard page. Theme is
            <button onClick={handleToggle}>{theme.text}</button>
          </p>
        </div>
      </>
    );
  }

  function AsyncComponent() {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(Component);
      }, 3000);
    });
  }

  return (
    <>
      <Suspense fallback={<div>Loading...</div>} id="jsx">
        <AsyncComponent />
      </Suspense>
    </>
  );
}

export default DashboardPage;
