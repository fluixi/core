/** Browser adapters. A separate entry, so a server bundle never loads them. */
export { localStorageAdapter, sessionStorageAdapter } from './web-storage.js';
export { documentCookieAdapter, type DocumentCookieOptions } from './document-cookie.js';
