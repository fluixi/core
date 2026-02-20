import { repeat as litRepeat } from 'lit/directives/repeat.js';
import { rxDirective } from './utils.js';
import { litrx } from './litrx.js';

export const repeat = rxDirective(litRepeat, litrx);
