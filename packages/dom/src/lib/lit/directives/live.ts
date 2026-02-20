import { live as litLive } from 'lit/directives/live.js';
import { rxDirective } from './utils.js';
import { litrx } from './litrx.js';

export const reactiveLive = rxDirective(litLive, litrx);
