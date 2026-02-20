import { ifDefined as litIfDefined } from 'lit/directives/if-defined.js';
import { rxDirective } from './utils.js';
import { litrx } from './litrx.js';

export const ifDefined = rxDirective(litIfDefined, litrx);
