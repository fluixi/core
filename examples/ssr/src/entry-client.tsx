import { render } from '@fluixi/kettlejs';
import { App } from './App';

// Client takeover. The server sent fully-rendered HTML for first paint/SEO;
// the client renders the same App into the container to wire up interactivity.
// (DOM-reuse hydration is a tracked follow-up; this re-renders once.)
const root = document.getElementById('root')!;
render(() => <App url={location.pathname} />, root);
