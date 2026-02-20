// // internal/vinxi/start-server.tsx
// import { createComponent } from '../../src';
// import { RouterContext, Router, Routes } from '../../src/lib/router/router';
// import { createNode, FrameworkNode } from './runtime/node';

// // internal/vinxi/start-server.ts
// // import { RouterContext } from "../runtime/context";
// // import { createNode } from "../runtime/node";
// // runtime/node.ts

// // import { collectHydrationData } from "../server/hydration.js";

// export function StartServer(event: {
//   request: Request;
//   params: Record<string, string>;
// }) {
//   const url = new URL(event.request.url);

//   const app = createComponent(Router, {
//     base: '',
//     children: () =>
//       createComponent(Routes, {
//         children: () => (import.meta as any).env.ROUTES,
//       }),
//   });

//   const hydration = null;
//   // collectHydrationData();

//   return {
//     app,
//     hydration,
//     url: {
//       pathname: url.pathname,
//       search: url.search,
//     },
//     params: event.params,
//   };
// }
// // export function StartServer(event: any): FrameworkNode {
// //   const Route = event.route.module.default;

// //   const payload = {
// //     url: new URL(event.request.url),
// //     params: event.params,
// //   };

// //   return createNode('fragment', {
// //     children: [
// //       createNode('script', {
// //         id: '__ROUTE_PAYLOAD__',
// //         type: 'application/json',
// //         text: JSON.stringify(payload),
// //       }),

// //       createNode('provider', {
// //         context: RouterContext,
// //         value: payload,
// //         children: () =>
// //           createNode('component', {
// //             render: Route,
// //           }),
// //       }),
// //     ],
// //   });
// // }
// // export function StartServer({ event }: { event: any }) {
// //   const Route = event.route.module.default;

// //   return createComponent(RouterContext.Provider, {
// //     value: {
// //       url: new URL(event.request.url),
// //       params: event.params,
// //     },
// //     children: Route,
// //   });
// //   // (
// //   //   <RouterContext.Provider value={{
// //   //     url: new URL(event.request.url),
// //   //     params: event.params
// //   //   }}>
// //   //     <Route />
// //   //   </RouterContext.Provider>
// //   // );
// // }

// // // internal/vinxi/start-server.tsx
// // export function StartServer({ event }) {
// //   const Route = event.route.module.default;

// //   const payload = {
// //     routeId: event.route.id,
// //     params: event.params,
// //     url: event.request.url
// //   };

// //   return (
// //     <>
// //       <script
// //         type="application/json"
// //         id="__ROUTE_PAYLOAD__"
// //       >
// //         {JSON.stringify(payload)}
// //       </script>

// //       <RouterContext.Provider value={payload}>
// //         <Route />
// //       </RouterContext.Provider>
// //     </>
// //   );
// // }
