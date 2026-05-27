import { env } from '../../config/env.js';
import { ApiResponse, HttpError } from './types.js';

// Token injector — set by store/auth.ts after login
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

/**
 * Core fetch wrapper.
 * - Injects Bearer token from configureApiClient
 * - Unwraps the standard `{data, status, status_code}` envelope
 * - Throws HttpError on non-ok responses or when status === 'error'
 */
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
  
  if (!res.ok || !json || res.status === 404) {
    console.log('res', res, json)
    const msg = (json as any)?.message ?? `HTTP ${res.status}`;
    const code = (json as any)?.code ?? 'UNKNOWN';
    throw new HttpError(res.status, code, msg);
  }

  if (json.status === 'error') {
    console.log('request error')
    throw new HttpError(
      json.status_code,
      'API_ERROR',
      (json as any).message ?? 'API returned an error',
    );
  }

  return json.data;
}

export const apiClient = {
  get<T>(endpoint: string, params?: RequestOptions['params']) {
    return request<T>(endpoint, { method: 'GET', params });
  },
  post<T>(endpoint: string, body?: unknown, params?: RequestOptions['params']) {
    return request<T>(endpoint, { method: 'POST', body, params });
  },
  put<T>(endpoint: string, body?: unknown, params?: RequestOptions['params']) {
    return request<T>(endpoint, { method: 'PUT', body, params });
  },
  patch<T>(endpoint: string, body?: unknown) {
    return request<T>(endpoint, { method: 'PATCH', body });
  },
  delete<T = void>(endpoint: string) {
    return request<T>(endpoint, { method: 'DELETE' });
  },

  /** POST with FormData — does NOT set Content-Type (browser adds multipart boundary) */
  async form<T>(endpoint: string, formData: FormData): Promise<T> {
    const url   = `${env.apiUrl}${endpoint}`;
    const token = _getToken();
    const res   = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    if (res.status === 401) {
      // _onUnauthorized();
      throw new HttpError(401, 'UNAUTHORIZED', 'Session expired. Please log in again.');
    }
    if (res.status === 204) return undefined as T;

    const json = await res.json().catch(() => null);
    if (!res.ok) {
      const msg  = (json as any)?.message ?? `HTTP ${res.status}`;
      const code = (json as any)?.code    ?? 'UNKNOWN';
      throw new HttpError(res.status, code, msg);
    }
    if ((json as any)?.status === 'error') {
      throw new HttpError(
        (json as any).status_code,
        'API_ERROR',
        (json as any).message ?? 'API returned an error',
      );
    }
    // Support both envelope {data: ...} and raw responses
    return ((json as any)?.data ?? json) as T;
  },
} as const;
