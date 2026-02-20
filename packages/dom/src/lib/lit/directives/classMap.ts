import { classMap as litClassMap } from 'lit/directives/class-map.js';
import { rxDirective } from './utils.js';
import { litrx } from './litrx.js';

export const classMap = rxDirective(litClassMap, litrx);
