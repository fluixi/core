/**
 * `fluixi generate <kind> <name>` (alias `g`) — scaffold a piece into the current app.
 *   fluixi g component Button        → src/components/Button.tsx
 *   fluixi g route about             → src/routes/about.tsx  (a file route)
 *   fluixi g route blog/[id]         → src/routes/blog/[id].tsx
 *   fluixi g middleware              → src/middleware.ts
 */
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname, relative, basename } from 'node:path';

const GEN_USAGE = `Usage: fluixi generate <kind> <name>

Kinds:
  component <Name>      a reusable component        → src/components/<Name>.tsx
  route <path>          a file-based route page     → src/routes/<path>.tsx
  middleware            the request middleware file → src/middleware.ts
`;

function pascal(s: string): string {
  return s
    .replace(/\[(.+?)\]/g, '$1') // drop dynamic-segment brackets
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join('') || 'Component';
}

function write(file: string, content: string): void {
  if (existsSync(file)) {
    console.error(`✗ ${relative(process.cwd(), file)} already exists`);
    process.exit(1);
  }
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
  console.log(`✓ created ${relative(process.cwd(), file)}`);
}

const component = (Name: string) =>
  `export function ${Name}() {
  return <div class="${Name.toLowerCase()}">${Name}</div>;
}
`;

const route = (Name: string) =>
  `export default function ${Name}() {
  return (
    <section>
      <h1>${Name}</h1>
    </section>
  );
}
`;

const middleware = () =>
  `import { defineMiddleware } from '@fluixi/start';

export default defineMiddleware([
  (request, next) => {
    // return a Response to short-circuit (auth/redirect), or next() to continue.
    return next();
  },
]);
`;

export function generate(kind: string | undefined, name: string | undefined): void {
  switch (kind) {
    case 'component':
    case 'c': {
      if (!name) return fail('component name required, e.g. `fluixi g component Button`');
      const Name = pascal(name);
      write(resolve('src/components', `${Name}.tsx`), component(Name));
      break;
    }
    case 'route':
    case 'r': {
      if (!name) return fail('route path required, e.g. `fluixi g route about`');
      write(resolve('src/routes', `${name}.tsx`), route(pascal(basename(name))));
      break;
    }
    case 'middleware':
    case 'm':
      write(resolve('src/middleware.ts'), middleware());
      break;
    default:
      console.error(GEN_USAGE);
      process.exit(1);
  }
}

function fail(msg: string): void {
  console.error(`✗ ${msg}`);
  process.exit(1);
}
