---
"@fluixi/compiler": minor
"@fluixi/start": minor
"@fluixi/cli": minor
---

The compiler now sets JSX through oxc when Vite bundles with Rolldown and through esbuild otherwise, start now builds single-file bundles with the option each bundler expects, the env check now includes the file name in its error under Vite 8, and fluixi check and fluixi doctor now work in a TypeScript 7 app by falling back to the CLI's classic TypeScript.
