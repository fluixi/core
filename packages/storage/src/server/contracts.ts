/**
 * What a server adapter needs from the request and the response. Any framework fits: a fetch
 * `Request` and `Headers` are accepted as they are, anything else adapts in one line.
 */

export interface StorageRequest {
  getHeader(name: string): string | null | undefined;
}

export interface StorageResponse {
  /** Adds a header value without replacing earlier ones (one `Set-Cookie` per cookie). */
  appendHeader(name: string, value: string): void;
}

interface HeadersLike {
  get(name: string): string | null;
}
interface MutableHeadersLike {
  append(name: string, value: string): void;
}

export type RequestLike = StorageRequest | HeadersLike | { headers: HeadersLike };
export type ResponseLike = StorageResponse | MutableHeadersLike | { headers: MutableHeadersLike };

export function toStorageRequest(request: RequestLike): StorageRequest {
  if ('getHeader' in request) return request;
  const headers = 'headers' in request ? request.headers : request;
  return { getHeader: (name) => headers.get(name) };
}

export function toStorageResponse(response: ResponseLike): StorageResponse {
  if ('appendHeader' in response) return response;
  const headers = 'headers' in response ? response.headers : response;
  return { appendHeader: (name, value) => headers.append(name, value) };
}
