#!/usr/bin/env node

import { exec } from 'child_process';
import { execa } from 'execa';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
async function run() {
  const args = process.argv.slice(2);
  const cwd = process.cwd();
  // Map CLI commands
  switch (args[0]) {
    case 'dev':
      const command =
        'vinxi dev --config ' +
        path.resolve(__dirname, '../internal/vinxi/app.js');
      const dev = exec(command, (err) => {
        console.log('exec err', err);
      });
      break;

    case 'build':
      // Run Vinxi build with internal entry
      await execa(
        'vinxi',
        [
          'build',
          '--config',
          path.resolve(__dirname, '../internal/vinxi/app.js'),
        ],
        {
          stdio: 'inherit',
          cwd,
        }
      );
      break;

    default:
      console.log(`Unknown command: ${args[0]}`);
      console.log('Usage: fluixi [dev|build]');
      process.exit(1);
  }
}

run();
