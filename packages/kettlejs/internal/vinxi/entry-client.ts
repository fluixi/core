// internal/vinxi/entry-client.ts
// import { hydrate } from "@fluixi/kettlejs";
import { hydrate } from '@fluixi/dom';
import {
  deserializeHydrationData,
  setHydrating,
} from '../../src/lib/server/index.js';
import app from './app.js';
import 'vinxi/client';
// import { StartClient } from "./start-client";

// hydrate(() => <StartClient />);
export default function entryClient() {
  console.log('entry client', app);
  setHydrating(true);
  deserializeHydrationData();

  // const app = createApp({
  //   url: {
  //     pathname: window.location.pathname,
  //     search: window.location.search,
  //   },
  //   params: {},
  // });

  hydrate(app, document.getElementById('app')!);
}
