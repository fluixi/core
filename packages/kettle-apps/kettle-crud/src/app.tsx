import { Router, Routes } from '@awc/kettlejs/router';
import { createMemo, Suspense } from '@awc/kettlejs';
import { html } from '@awc/kettlejs';
import { routes } from 'virtual:kettle-routes';
import './index.css'
import { ThemeProvider } from './context';

const JSXCmp = () => {


  return (
    <>
      <div>Normal jsx content</div>
    </>
  );
};

function JSXAsyncComponent() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(JSXCmp);
    }, 3000);
  });
}
export function LitApp(props?: { url?: string }) {
  // Routing navigation works here
  // return html`
  //   <${Router} url=${props?.url} />
  //   `
  return html`
    ${Router({
      url: props?.url,
      children: () =>
        Suspense({
          id: 'main',
          fallback: html`<div class="p-4">Loading app...</div>`,
          children: Routes({ children: routes }),
        }),
    })}
  `;

  // Routing navigation does not works here
  return (
    <>
      <Router url={props?.url}>
        <Suspense id="app" fallback={<div class="p-4">Loading app...</div>}>
          <Routes>
            {routes}
          </Routes>
        </Suspense>
      </Router>
    </>
  )
}
export default function App(props?: { url?: string }) {
  return  (
    <ThemeProvider>
      <LitApp url={props?.url} />
    </ThemeProvider>
  );
}
