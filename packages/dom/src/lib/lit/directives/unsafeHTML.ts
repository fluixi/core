import { unsafeHTML as litUnsafeHTML } from 'lit/directives/unsafe-html.js';
import { rxDirective } from './utils.js';
import { litrx } from './litrx.js';
export const unsafeHTML = rxDirective(litUnsafeHTML, litrx);
