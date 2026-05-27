export interface ApiResponse<T> {
  data:        T;
  status:      'ok' | 'error';
  status_code: number;
  message?:    string;
}

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code:   string,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export interface PaginatedResponse<T> {
  data:            T[];
  count:           number;
  limit:           number;
  page:            number | null;
  totalPages:      number;
  next_page_token: string | null;
}
