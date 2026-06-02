#!/bin/sh
set -e

echo "[worker] Starting Leuzman BullMQ worker (mode: ${WORKER_MODE:-all})"
echo "[worker] Queues: ${WORKER_QUEUES:-all}"

# Run Medusa's worker command which boots the container and executes loaders
# The register.ts loader reads WORKER_MODE to start only the relevant workers
exec node -e "
const { MedusaApp } = require('@medusajs/framework');
MedusaApp({ workerMode: true }).then(() => {
  console.log('[worker] Workers running. Press Ctrl+C to stop.');
}).catch(err => {
  console.error('[worker] Fatal error:', err);
  process.exit(1);
});
"
