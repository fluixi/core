// Bin-independent production build: invoke @fluixi/start's build programmatically. The `fluixi`
// CLI bin isn't symlinked in fresh CI/Cloudflare installs (the @fluixi/cli dist doesn't exist at
// install time), so we import the build function directly instead of relying on `fluixi build`.
import { loadConfig } from '@fluixi/start';
import { build } from '@fluixi/start/commands';

await build(await loadConfig());
