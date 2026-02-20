import { registerGlobal } from '../dom/utils.js';
import { litrx } from './directives/litrx.js';

export * from './directives/index.js';
export * from './templates/index.js';
export * from './control-flow/index.js';
registerGlobal('litrx', litrx);
