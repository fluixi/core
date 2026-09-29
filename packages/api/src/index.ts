/**
 * `@fluixi/api`: schema-first API routes on top of `@fluixi/start`'s file-based API routes.
 *
 * @example
 * ```ts
 * // src/api/v1/projects/[id].ts
 * import { route, notFound } from '@fluixi/api';
 * import { z } from 'zod';
 *
 * export const GET = route({
 *   params: z.object({ id: z.string().uuid() }),
 *   response: z.object({ id: z.string(), name: z.string() }),
 *   async handler({ params }) {
 *     const project = await projects.find(params.id);
 *     if (!project) throw notFound();
 *     return project;
 *   },
 * });
 * ```
 */
export { route, contractOf, setErrorReporter, CONTRACT } from './route.js';
export type { RouteContract, RouteHandler, RouteInput } from './route.js';

export { ApiError, badRequest, unauthorized, forbidden, notFound, conflict, errorResponse, toApiError } from './errors.js';
export type { ApiErrorBody, ValidationIssue } from './errors.js';

export { readJson, readQuery, DEFAULT_BODY_LIMIT } from './input.js';

export { createOpenApiDocument, openApiRoute, describedBy, includeDocument, setJsonSchemaConverter } from './openapi.js';
export type { OpenApiInfo, DescribedRoute, JsonSchemaConverter } from './openapi.js';

export type { StandardSchemaV1 } from './standard-schema.js';
