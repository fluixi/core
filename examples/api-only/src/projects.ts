import { z } from 'zod';

/** What a project is, on the way in and on the way out. */
export const Project = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(120),
  status: z.enum(['active', 'archived']),
});
export type Project = z.infer<typeof Project>;

export const NewProject = Project.pick({ name: true });

/** In memory: the example is about the API, not storage. */
const projects = new Map<string, Project & { createdBy: string }>();

export function listProjects(): Project[] {
  return [...projects.values()];
}

export function findProject(id: string): (Project & { createdBy: string }) | undefined {
  return projects.get(id);
}

export function createProject(name: string): Project & { createdBy: string } {
  const project = { id: crypto.randomUUID(), name, status: 'active' as const, createdBy: 'internal-user-id' };
  projects.set(project.id, project);
  return project;
}
