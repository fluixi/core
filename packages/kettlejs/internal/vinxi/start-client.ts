// // internal/vinxi/start-client.tsx
// import { createComponent } from '../../src/index.js';
// import { Router, RouterContext, Routes } from '../../src/lib/router/router';
// import { setHydrationData } from '../../src/lib/server';
// import { createNode, FrameworkNode } from './runtime/node';

// // export function StartClient() {
// //   const route = window.__vinxi.route;
// //   const Route = route.module.default;

// //   return (
// //     <RouterContext.Provider value={{
// //       url: new URL(window.location.href),
// //       params: route.params
// //     }}>
// //       <Route />
// //     </RouterContext.Provider>
// //   );
// // }
// //
// /// internal/vinxi/start-client.ts

// // export function StartClient(): FrameworkNode {
// //   const payload = JSON.parse(
// //     document.getElementById("__ROUTE_PAYLOAD__")!.textContent!
// //   );

// //   const Route = resolveRoute(payload);

// //   return createNode("provider", {
// //     context: RouterContext,
// //     value: payload,
// //     children: () =>
// //       createNode("component", {
// //         render: Route
// //       })
// //   });
// // }
// // import { Router } from "../router/router.js";

// export function StartClient() {
//   const payload = JSON.parse(
//     document.getElementById('__KETTLE_PAYLOAD__')!.textContent!
//   );

//   // Restore cached data
//   for (const [k, v] of Object.entries(payload.data || {})) {
//     setHydrationData(k, v);
//   }

//   return createComponent(Router, {
//     base: '',
//     children: () =>
//       createComponent(Routes, {
//         children: () => (import.meta as any).env.ROUTES,
//       }),
//   });
// }
