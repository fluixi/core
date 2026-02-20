import { unsafeSVG as litUnsafeSVG } from 'lit/directives/unsafe-svg.js';
import { rxDirective } from './utils.js';
import { litrx } from './litrx.js';
export const unsafeSVG = rxDirective(litUnsafeSVG, litrx);
