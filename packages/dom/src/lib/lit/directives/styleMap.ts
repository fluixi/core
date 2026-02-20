import { styleMap as litStyleMap } from 'lit/directives/style-map.js';
import { rxDirective } from './utils.js';
import { litrx } from './litrx.js';

export const styleMap = rxDirective(litStyleMap, litrx);
