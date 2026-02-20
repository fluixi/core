#!/usr/bin/env node
// // cli/dev.ts
// import { createApp } from 'vinxi';
// import { frameworkVinxiConfig } from '../preset/vinxi';

// export async function dev() {
//   const config = frameworkVinxiConfig();
//   await createApp({
//     server: ()
//   }).listen();
// }

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
      // console.log('run dev', command);
      const dev = exec(command, (err) => {
        console.log('exec err', err);
      });
      // Run Vinxi dev with your internal entry
      // const dev = await execa({ stdio: 'inherit', cwd })`${command}`;
      // const dev = await execa(
      //   'vinxi',
      //   [
      //     'dev',
      //     '--config',
      //     path.resolve(__dirname, '../internal/vinxi/app.mjs'),
      //   ],
      //   {
      //     stdio: 'inherit',
      //     cwd,
      //   }
      // );
      // console.log('run dev end', dev);
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
      console.log('Usage: kettle [dev|build]');
      process.exit(1);
  }
}

run();
