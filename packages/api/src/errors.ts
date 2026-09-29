/**
 * One error model for every contracted route.
 *
 * A failure is always `{ error: { code, message, details? } }` with a matching HTTP status. The
 * code is for programs, the message for people. Nothing from the server's internals reaches the
 * response: an error that is not an `ApiError` becomes a 500 with a generic message, and the
 * original is handed to `onError` for logging.
 */

/** A failure a handler means to report, with the status and code the caller gets. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/** The body of every error response. */
export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}

/** One problem with the input, as reported in `details` of a `validation_failed` error. */
export interface ValidationIssue {
  /** Where: `body.items.0.name`, `query.page`, `params.id`. */
  path: string;
  message: string;
}

export const badRequest = (message: string, details?: unknown) => new ApiError(400, 'bad_request', message, details);
export const unauthorized = (message = 'Sign in to continue.') => new ApiError(401, 'unauthorized', message);
export const forbidden = (message = 'Not allowed.') => new ApiError(403, 'forbidden', message);
export const notFound = (message = 'Not found.') => new ApiError(404, 'not_found', message);
export const conflict = (message: string, details?: unknown) => new ApiError(409, 'conflict', message, details);

/**
 * Anything thrown by a handler, as the `ApiError` the caller sees.
 *
 * Auth refusals from `@fluixi/auth` (`requireUser` and its siblings) carry a 401 or 403 and are
 * matched by shape, the way `@fluixi/start` matches them, so neither package depends on the other.
 */
export function toApiError(error: unknown): { error: ApiError; internal: boolean } {
  if (error instanceof ApiError) return { error, internal: false };
  const status = (error as { status?: unknown } | null)?.status;
  if (status === 401) return { error: unauthorized(), internal: false };
  if (status === 403) return { error: forbidden(), internal: false };
  return { error: new ApiError(500, 'internal', 'Something went wrong on our side.'), internal: true };
}

/** An `ApiError` as a JSON response. */
export function errorResponse(error: ApiError): Response {
  const body: ApiErrorBody = { error: { code: error.code, message: error.message } };
  if (error.details !== undefined) body.error.details = error.details;
  return new Response(JSON.stringify(body), {
    status: error.status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
