import { route } from '@fluixi/api';
import { z } from 'zod';
import { NewProject, Project, createProject, listProjects } from '../../../projects.js';

export const GET = route({
  query: z.object({ status: Project.shape.status.optional() }),
  response: z.array(Project),
  handler: ({ query }) => listProjects().filter((p) => !query.status || p.status === query.status),
});

export const POST = route({
  body: NewProject,
  // `createdBy` stays on the server: the response schema has no such field.
  response: Project,
  status: 201,
  handler: ({ body }) => createProject(body.name),
});
