import {
  onMount,
  useContext,
  useEffect,
  Suspense,
  html,
  $component,
  Component,
  ComponentProps,
  TemplateResult,
  onUnmount,
} from '@awc/kettlejs';
import { ThemeContext } from '../../context.js';
import './dashboard.css';
import './element.js';
const LitComponent = () => {
  const { theme, toggleTheme } = useContext(ThemeContext);
  // console.log('on dashboard lit', theme)
  function handleToggle() {
    toggleTheme();
  }
  useEffect(() => {
    // e();
    // toggleTheme = useContext(ThemeContext).toggleTheme;
    console.log('Dashboard lit theme:', theme.text);
  });
  onMount(() => {
    console.log('on mount dashboard lit fired 🔥');
  });

  return html`<div class="dashboard-page">
    <h1>Dashboard Page Lit</h1>
    <p>
      Welcome to the dashboard page. Theme is
      <button
        @click=${handleToggle}
        class="bg-primary-500 text-white p-2 rounded"
      >
        ${theme.text}
      </button>
    </p>
  </div>`;
};

function LitAsyncComponent() {
  return new Promise<() => Component<ComponentProps>>((resolve) => {
    setTimeout(() => {
      resolve(LitComponent);
    }, 3000);
  });
}

export function LitDashboardPage() {
  // console.log('async c', LitAsyncComponent())
  // return Suspense(
  //   {
  //     children: () => LitAsyncComponent,
  //   fallback: html`<div>Loading suspense...</div>`}
  // );
  return html`${Suspense({
    id: 'lit-dash',
    children: LitAsyncComponent(),
    // children: html`${LitAsyncComponent()}`,
    fallback: html`<div style="font-weight: bold">Loading child...</div>`,
  })}`;
}

// const wrap = ({ children }:{children: () => TemplateResult}) => {
//   return <>{html`${children}`}</>
// }

export function Wrap({
  children,
}: {
  children: JSX.Element | (() => unknown);
}) {
  return (
    <>
      {children}
      {/*<load children={children} />*/}
    </>
  );
}

export function DashboardPage() {
  const { theme, toggleTheme } = useContext(ThemeContext);
  // console.log('on dashboard page', theme)
  useEffect(() => {
    // toggleTheme = useContext(ThemeContext).toggleTheme;
    console.log('Dashboard jsx theme:', theme.text);
  });
  onMount(() => {
    console.log('on mount dashboard jsx fired 🔥');
  });

  onUnmount(() => {
    alert('on unmount');
  });

  function handleToggle() {
    // o.text += 1;
    toggleTheme();
  }

  function Component({ title }: { title?: string }) {
    return (
      <>
        <div class="dashboard-page flex flex-col w-100 gap-2">
          <h1>Dashboard Page JSX {title}</h1>
          <p>
            Welcome to the dashboard page comp. Theme is
            <button onClick={handleToggle}>{theme.text}</button>
          </p>
          <my-counter></my-counter>
        </div>
      </>
    );
  }

  function AsyncComponent() {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(() => Component({ title: 'async' }));
      }, 3000);
    });
  }

  //   return html`<div class="flex flex-col w-100">
  //     ${Component()}
  //     ${LitDashboardPage()}
  // </div>`

  // Working render
  // return ()=> (
  //   <>
  //     <Suspense fallback={<div>Loading...</div>}>
  //       {/*<AsyncComponent />*/}
  //       <Component />
  //       {/*Here the render works*/}
  //         <LitDashboardPage />
  //     </Suspense>
  //   </>
  // );

  // Not Working render
  return (
    <>
      <div class="flex flex-col w-100">
        <Component title="1" />
        {/*{html`${LitDashboardPage}`}*/}
        {/*Here the LitDashboardPage return [object Object]*/}
        <Suspense fallback={<div>Loading...</div>} id="dashboard">
          <LitDashboardPage />
        </Suspense>
      </div>
    </>
  );
}

export default DashboardPage;
