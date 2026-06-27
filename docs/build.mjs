// Bin-independent SSG build (the fluixi bin isn't linked in fresh CI/Cloudflare installs).
import { loadConfig, build } from '@fluixi/start';

await build(await loadConfig());
