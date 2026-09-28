// Client entry: hydrate the server-rendered page, then register the custom elements.
//
// Registering after hydration is deliberate. The server renders `<fx-counter step="2">`
// as a plain tag with nothing inside; hydration adopts that tag and sets its props as
// properties, and only then does the element upgrade and render its own content. Registered
// first, the elements would render into tags hydration still expects to find empty.
import { startClient } from '@fluixi/core/client';
import App from './app.js';

startClient(App, { root: '#root' });

void Promise.all([
  import('./elements/counter.js'),
  import('./elements/bounded-counter.js'),
  import('./elements/rating.js'),
  import('./elements/disclosure.js'),
]);
