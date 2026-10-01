/** Server adapters. A separate entry, so a browser bundle never loads them. */
export { cookieStorage, type CookieStorageOptions } from './cookie.js';
export { requestStorage } from './request.js';
export {
  toStorageRequest,
  toStorageResponse,
  type StorageRequest,
  type StorageResponse,
  type RequestLike,
  type ResponseLike,
} from './contracts.js';
