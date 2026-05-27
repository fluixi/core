/** Standard envelope returned by every API endpoint. */

export interface ApiResponse<T> {
  status:      'ok' | 'error';
  status_code: number;
  data:              T;
}
export interface Paginated<T> {
  data:               T extends Array<any> ? T : T[];
  count:             number;
  limit:             number;
  next_page_token?:  string;
  /** Derived: Math.ceil(count / limit) */
  totalPages?:       number;
  /** Derived: page index (1-based), only meaningful with offset-based pagination */
  page?:             number;
}


export interface ListParams {
  id?: string;
  accountId?: string
  page?:     number;
  limit?:    number;
  pageSize?: number;
  search?:   string;
  sortBy?:   string;
  sortDir?:  'asc' | 'desc';
}

export class HttpError extends Error {
  constructor(
    public readonly status:  number,
    public readonly code:    string,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

/**
 * Build a comma-separated `fields` query value.
 * @example fields('id', 'name', 'objective.obj_id') → "id,name,objective.obj_id"
 */
export function fields(...keys: string[]): string {
  return keys.join(',');
}


import { Accessor, Setter } from "@awc/kettlejs";

export interface BaseStore<T> {
    readonly items: Accessor<T[]>;
    readonly total: Accessor<number>;
    readonly page: Accessor<number>;
    readonly loading: Accessor<boolean>;
    readonly error: Accessor<string | null>;
    readonly selectedId: Accessor<string | null>;
    readonly selected: Accessor<T | null>;
    readonly setLoading: Setter<boolean>
    readonly setError: Setter<string | null>
    readonly select: Setter<string | null>
    load(page: ApiResponse<T>): void
    upsert(campaign: T): void
    remove(id: string): void
}


export interface ApiActions<T, CreateInput, UpdateInput> {
  list(params: ListParams): Promise<ApiResponse<T>>;
  get(id: string): Promise<ApiResponse<T>>;
  create(input: CreateInput): Promise<ApiResponse<T>>;
  update(id: string, input: UpdateInput): Promise<ApiResponse<T>>;
  archive(id: string): Promise<ApiResponse<T>>;
  delete(id: string): Promise<ApiResponse<T>>;
  publish(id: string): Promise<ApiResponse<T>>;
  refetch(): void;
}

export type GadsCampaignTypes = 'display' | 'search'