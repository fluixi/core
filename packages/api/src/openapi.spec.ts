/**
 * The OpenAPI document, written from the contracts routes already validate with.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { z } from 'zod';
import * as v from 'valibot';
import { createOpenApiDocument, describedBy, openApiRoute, route, setJsonSchemaConverter } from './index.js';

const Project = z.object({ id: z.string().uuid(), name: z.string().min(1), status: z.enum(['active', 'archived']) });

const routes = [
  {
    path: '/api/v1/projects',
    mod: {
      GET: route({
        query: z.object({ status: z.enum(['active', 'archived']).optional(), tag: z.array(z.string()).optional() }),
        response: z.array(Project),
        summary: 'List projects',
        handler: () => [],
      }),
      POST: route({ body: Project.pick({ name: true }), response: Project, status: 201, handler: () => ({}) as never }),
    },
  },
  {
    path: '/api/v1/projects/{id}',
    mod: {
      GET: route({ params: z.object({ id: z.string().uuid() }), response: Project, handler: () => ({}) as never }),
      DELETE: route({ params: z.object({ id: z.string().uuid() }), handler: () => undefined }),
    },
  },
  { path: '/api/v1/legacy', mod: { GET: () => new Response('ok') } },
];

const info = { title: 'Test API', version: '1.0.0', servers: [{ url: 'http://localhost:3301' }] };

afterEach(() => setJsonSchemaConverter(undefined));

describe('the OpenAPI document', () => {
  const doc = createOpenApiDocument(routes, info) as any;

  it('is OpenAPI 3.1 with the info and servers given, and a shared error schema', () => {
    expect(doc.openapi).toBe('3.1.0');
    expect(doc.info).toEqual({ title: 'Test API', version: '1.0.0' });
    expect(doc.servers).toEqual([{ url: 'http://localhost:3301' }]);
    expect(doc.components.schemas.Error.required).toEqual(['error']);
  });

  it('describes query parameters from the query schema, arrays exploded', () => {
    const list = doc.paths['/api/v1/projects'].get;
    expect(list.summary).toBe('List projects');
    expect(list.operationId).toBe('getProjects');
    expect(list.tags).toEqual(['projects']);
    const byName = Object.fromEntries(list.parameters.map((p: any) => [p.name, p]));
    expect(byName.status).toMatchObject({ in: 'query', required: false, schema: { enum: ['active', 'archived'] } });
    expect(byName.tag).toMatchObject({ style: 'form', explode: true, schema: { type: 'array' } });
  });

  it('describes a JSON body, the declared status, and the errors a body can cause', () => {
    const create = doc.paths['/api/v1/projects'].post;
    const body = create.requestBody.content['application/json'].schema;
    expect(body.properties.name.type).toBe('string');
    expect(body.required).toEqual(['name']);
    expect(Object.keys(create.responses)).toEqual(expect.arrayContaining(['201', '400', '413', '415', '500']));
    expect(create.responses['201'].content['application/json'].schema.properties.status.enum).toEqual(['active', 'archived']);
    expect(create.responses['400'].content['application/json'].schema).toEqual({ $ref: '#/components/schemas/Error' });
  });

  it('describes path parameters as required, and a 404 for a path with parameters', () => {
    const get = doc.paths['/api/v1/projects/{id}'].get;
    expect(get.operationId).toBe('getProjectsById');
    expect(get.summary).toBe('Get projects by id');
    expect(get.parameters).toEqual([expect.objectContaining({ name: 'id', in: 'path', required: true })]);
    expect(get.responses['404']).toBeDefined();
    expect(doc.paths['/api/v1/projects/{id}'].delete.responses['204'].description).toMatch(/no content/i);
  });

  it('lists a route with no contract, marked as such', () => {
    expect(doc.paths['/api/v1/legacy'].get['x-fluixi-contract']).toBe(false);
  });

  it('marks what no converter can describe, and takes a converter for other validators', () => {
    const valibotRoutes = [{ path: '/api/v1/x', mod: { POST: route({ body: v.object({ a: v.string() }), handler: () => undefined }) } }];
    const unconverted = createOpenApiDocument(valibotRoutes, info) as any;
    expect(unconverted.paths['/api/v1/x'].post.requestBody.content['application/json'].schema).toEqual({ 'x-fluixi-unconverted': 'valibot' });

    setJsonSchemaConverter(() => ({ type: 'object', properties: { a: { type: 'string' } } }));
    const converted = createOpenApiDocument(valibotRoutes, info) as any;
    expect(converted.paths['/api/v1/x'].post.requestBody.content['application/json'].schema.properties.a.type).toBe('string');
  });

  it('describes a Date as any value instead of failing', () => {
    const dated = [{ path: '/api/v1/d', mod: { GET: route({ response: z.object({ at: z.date() }), handler: () => ({ at: new Date() }) }) } }];
    const out = createOpenApiDocument(dated, info) as any;
    expect(out.paths['/api/v1/d'].get.responses['200'].content['application/json'].schema.properties).toHaveProperty('at');
  });
});

describe('the route that serves it', () => {
  it('serves the document as JSON and leaves itself out of it', async () => {
    const GET = openApiRoute(() => table, info);
    const table = [...routes, { path: '/api/openapi.json', mod: { GET } }];
    const res = await GET();
    expect(res.headers.get('content-type')).toContain('application/json');
    const doc = await res.json();
    expect(doc.paths['/api/openapi.json']).toBeUndefined();
    expect(doc.paths['/api/v1/projects']).toBeDefined();
  });
});

describe('a route a library describes', () => {
  const library = {
    openapi: '3.1.1',
    info: { title: 'Auth', version: '1' },
    servers: [{ url: 'http://localhost:3301/api/auth' }],
    tags: [{ name: 'Default' }],
    paths: {
      '/sign-in/email': {
        post: {
          tags: ['Default'],
          operationId: 'signInEmail',
          description: 'Sign in with email and password.',
          requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          responses: { 200: { description: 'ok', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } } },
        },
      },
    },
    components: {
      schemas: {
        User: { type: 'object', properties: { image: { type: 'string', nullable: true }, team: { $ref: '#/components/schemas/Error', nullable: true } } },
        Error: { type: 'string' },
      },
      securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer' } },
    },
  };

  it('replaces the route with the library paths under its mount, served once for all methods', async () => {
    let calls = 0;
    const handler = describedBy(() => (calls++, library), () => new Response('ok'));
    const table = [...routes, { path: '/api/auth/{all}', mod: { GET: handler, POST: handler } }];
    const GET = openApiRoute(() => table, info);
    const doc = await (await GET()).json();

    expect(calls).toBe(1);
    expect(doc.paths['/api/auth/{all}']).toBeUndefined();
    const op = doc.paths['/api/auth/sign-in/email'].post;
    expect(op.summary).toBe('Sign in with email and password');
    expect(doc.tags).toEqual([{ name: 'Default' }]);
    expect(doc.components.securitySchemes.bearerAuth.scheme).toBe('bearer');
    expect(doc.components.schemas.User.properties.image).toEqual({ type: ['string', 'null'] });
    expect(doc.paths['/api/v1/projects']).toBeDefined();
  });

  it('renames a component whose name is taken, references included', async () => {
    const handler = describedBy(async () => library, () => new Response('ok'));
    const GET = openApiRoute(() => [{ path: '/api/auth/{all}', mod: { POST: handler } }], info);
    const doc = await (await GET()).json();

    expect(doc.components.schemas.Error.required).toEqual(['error']);
    expect(doc.components.schemas.AuthError).toEqual({ type: 'string' });
    const op = doc.paths['/api/auth/sign-in/email'].post;
    expect(op.requestBody.content['application/json'].schema.$ref).toBe('#/components/schemas/AuthError');
    expect(op.responses[200].content['application/json'].schema.$ref).toBe('#/components/schemas/User');
    expect(doc.components.schemas.User.properties.team).toEqual({ anyOf: [{ $ref: '#/components/schemas/AuthError' }, { type: 'null' }] });
  });

  it('tries again on the next request when the library fails', async () => {
    let fail = true;
    const handler = describedBy(() => {
      if (fail) throw new Error('not ready');
      return library;
    }, () => new Response('ok'));
    const GET = openApiRoute(() => [{ path: '/api/auth/{all}', mod: { POST: handler } }], info);
    await expect(GET()).rejects.toThrow('not ready');
    fail = false;
    expect((await GET()).status).toBe(200);
  });
});
