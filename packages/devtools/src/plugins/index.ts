// The plugins that ship with devtools.
//
// Importing this registers them. Both halves of a plugin live in one module, so an agent in
// the page and a panel elsewhere import the same thing and each uses the half it can run.
// A host that wants none of them imports `../plugin.js` directly and registers its own.
import './directives.js';

export { directivesPlugin, NAME as DIRECTIVES } from './directives.js';
export type { DirectiveNote } from './directives.js';
