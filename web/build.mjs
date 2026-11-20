// Bin-independent production build: invoke @fluixi/start's build programmatically. The `fluixi`
// CLI bin isn't symlinked in fresh CI/Cloudflare installs (the @fluixi/cli dist doesn't exist at
// install time), so we import the build function directly instead of relying on `fluixi build`.
import { loadConfig } from '@fluixi/start/config';
import { build } from '@fluixi/start/commands';
import { copyFileSync } from 'node:fs';

await build(await loadConfig());

// The rules for coding assistants, the same file the package ships; it links to the docs' guide.
copyFileSync('../packages/core/llms.txt', 'dist/client/llms.txt');
