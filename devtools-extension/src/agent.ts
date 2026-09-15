/**
 * Runs in the page, before the application does.
 *
 * The manifest puts this in the MAIN world at `document_start`, which is the whole reason the
 * extension can watch an app that imports nothing: the hook is left on the window, and when
 * the app's own copy of @fluixi/reactive is first evaluated it finds it and hands over its
 * `observeReactiveNodes`. Arriving late means the runtime has already looked and moved on.
 *
 * Nothing is sent from here. The panel reads the hook through `inspectedWindow.eval`, which
 * runs in this same world — so there is no relay, no service worker and no message protocol
 * to keep in step.
 */
import { installDevtoolsHook } from '@fluixi/devtools';
// Collecting happens here, so the plugins have to be registered here too.
import '@fluixi/devtools/plugins';

installDevtoolsHook();
