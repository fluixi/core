// internal/vinxi/entry-server.ts
import {
  renderToString,
  serializeHydrationData,
  setHydrating,
} from '../../src/lib/server/index.js';
import app from './app.js';
// import { StartServer } from './start-server';

// export default async function handle(event: any) {
//   const html = await renderToString(() => StartServer(event));
//   // const html = await renderToString(() => (
//   //   <StartServer event={event} />
//   // ));

//   return new Response('<!DOCTYPE html>' + html, {
//     headers: { 'Content-Type': 'text/html' },
//   });
// }

export default async function handle(event: any) {
  setHydrating(false);

  // const app = createApp({
  //   url: {
  //     pathname: new URL(event.request.url).pathname,
  //     search: new URL(event.request.url).search,
  //   },
  //   params: event.params || {},
  // });

  console.log('render to string', event);
  const html = await renderToString(app as any);
  const hydration = serializeHydrationData();

  return new Response(
    `<!DOCTYPE html>
<html>
  <body>
    <div id="app">${html}</div>
    ${hydration}
    <script type="module" src="/entry-client.js"></script>
  </body>
</html>`,
    { headers: { 'content-type': 'text/html' } }
  );
}
