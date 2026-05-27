import { env } from '../../config/env.js';
import { ApiResponse, HttpError } from './types.js';

let _getToken: (() => string | null) = () => null;
let _onUnauthorized: (() => void) = () => {};

export function configureApiClient(
  getToken: () => string | null,
  onUnauthorized: () => void,
): void {
  _getToken = getToken;
  _onUnauthorized = onUnauthorized;
}

type RequestOptions = Omit<RequestInit, 'body'> & {
  params?: Record<string, string | number | boolean | undefined>;
  body?:   unknown;
};

async function request<T>(
  endpoint: string,
  { params, body, ...init }: RequestOptions = {},
): Promise<T> {
  let url = `${env.apiUrl}${endpoint}`;

  if (params) {
    const qs = new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)]),
    );
    if (qs.size) url += `?${qs}`;
  }

  const token = _getToken();

  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Accept:         'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  if (res.status === 401) {
    // _onUnauthorized();
    throw new HttpError(401, 'UNAUTHORIZED', 'Session expired. Please log in again.');
  }

  if (res.status === 204) return undefined as T;

  const json = await res.json().catch(() => null) as ApiResponse<T> | null;

  if (!res.ok || !json) {
    const msg  = (json as any)?.message ?? `HTTP ${res.status}`;
    const code = (json as any)?.code    ?? 'UNKNOWN';
    throw new HttpError(res.status, code, msg);
  }

  if (json.status === 'error') {
    throw new HttpError(
      json.status_code,
      'API_ERROR',
      (json as any).message ?? 'API returned an error',
    );
  }

  return json as T;
}

export const apiClient = {
  get<T>(endpoint: string, params?: RequestOptions['params']) {
    return request<T>(endpoint, { method: 'GET', params });
  },
  post<T>(endpoint: string, body?: unknown) {
    return request<T>(endpoint, { method: 'POST', body });
  },
  put<T>(endpoint: string, body?: unknown) {
    return request<T>(endpoint, { method: 'PUT', body });
  },
  patch<T>(endpoint: string, body?: unknown) {
    return request<T>(endpoint, { method: 'PATCH', body });
  },
  delete<T = void>(endpoint: string) {
    return request<T>(endpoint, { method: 'DELETE' });
  },
} as const;
