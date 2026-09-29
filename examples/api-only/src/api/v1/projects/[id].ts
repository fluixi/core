import { notFound, route } from '@fluixi/api';
import { z } from 'zod';
import { Project, findProject } from '../../../projects.js';

export const GET = route({
  params: z.object({ id: z.string().uuid() }),
  response: Project,
  handler: ({ params }) => {
    const project = findProject(params.id);
    if (!project) throw notFound('No project with that id.');
    return project;
  },
});
