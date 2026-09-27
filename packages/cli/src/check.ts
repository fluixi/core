/**
 * `fluixi check`: the editor's env and auth rules over the whole project, for CI.
 *
 * The rules are the ts-plugin's own, so the terminal and the editor never disagree. TypeScript
 * comes from the app: its version is the one the project compiles with, and the CLI does not
 * ship a second copy.
 */
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative, resolve } from 'node:path';
import type * as TS from 'typescript';
import { envAuthDiagnostics } from '@fluixi/ts-plugin/rules';
import { c } from '@fluixi/start/ui';

export interface Finding {
  file: string;
  line: number;
  column: number;
  code: number;
  severity: 'error' | 'warning' | 'suggestion';
  message: string;
}

function loadTypeScript(root: string): typeof TS {
  try {
    return createRequire(join(root, 'package.json'))('typescript');
  } catch {
    throw new Error('fluixi check needs typescript in the app: npm install -D typescript');
  }
}

/** Source files a tsconfig names, following project references one level down. */
function rootFiles(ts: typeof TS, configPath: string, seen = new Set<string>()): { files: string[]; options: TS.CompilerOptions } {
  seen.add(configPath);
  const read = ts.readConfigFile(configPath, ts.sys.readFile);
  if (read.error) throw new Error(ts.flattenDiagnosticMessageText(read.error.messageText, '\n'));
  const parsed = ts.parseJsonConfigFileContent(read.config, ts.sys, dirname(configPath));
  const files = [...parsed.fileNames];
  let options = parsed.options;
  for (const ref of parsed.projectReferences ?? []) {
    const path = ts.resolveProjectReferencePath(ref);
    if (seen.has(path) || !existsSync(path)) continue;
    const child = rootFiles(ts, path, seen);
    files.push(...child.files);
    if (!parsed.fileNames.length) options = child.options;
  }
  return { files, options };
}

export function checkProject(root = process.cwd(), ts: typeof TS = loadTypeScript(root)): Finding[] {
  const configPath = ts.findConfigFile(root, ts.sys.fileExists, 'tsconfig.json');
  if (!configPath) throw new Error(`no tsconfig.json in ${root}`);
  const { files, options } = rootFiles(ts, configPath);
  // fluixi.config.ts is rarely in `include`, and it is where env.public is declared.
  for (const name of ['fluixi.config.ts', 'fluixi.config.mts', 'fluixi.config.js']) {
    const path = resolve(root, name);
    if (existsSync(path) && !files.includes(path)) files.push(path);
  }
  const compilerOptions = { ...options, noEmit: true };
  // The rules walk up through `parent`, which a bare program only sets once it binds a file.
  const host = ts.createCompilerHost(compilerOptions, true);
  const program = ts.createProgram({ rootNames: [...new Set(files)], options: compilerOptions, host });

  const out: Finding[] = [];
  for (const sf of program.getSourceFiles()) {
    if (sf.isDeclarationFile || /[\\/]node_modules[\\/]/.test(sf.fileName)) continue;
    for (const d of envAuthDiagnostics(ts, program, sf.fileName, ts.sys)) {
      const at = sf.getLineAndCharacterOfPosition(d.start ?? 0);
      out.push({
        file: relative(root, sf.fileName),
        line: at.line + 1,
        column: at.character + 1,
        code: d.code,
        severity: d.category === ts.DiagnosticCategory.Error ? 'error' : d.category === ts.DiagnosticCategory.Warning ? 'warning' : 'suggestion',
        message: ts.flattenDiagnosticMessageText(d.messageText, ' '),
      });
    }
  }
  return out.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.column - b.column);
}

/** Print the findings. Returns the exit code: 1 on an error, or on a warning with `--strict`. */
export function check(root = process.cwd(), strict = false): number {
  const found = checkProject(root);
  const shown = found.filter((f) => f.severity !== 'suggestion');
  const mark = { error: c.red('error'), warning: c.yellow('warning'), suggestion: c.gray('note') };
  const lines = shown.map(
    (f) => `  ${c.cyan(`${f.file}:${f.line}:${f.column}`)}  ${mark[f.severity]}  ${c.gray(`FX${f.code}`)}  ${f.message}`,
  );
  const errors = shown.filter((f) => f.severity === 'error').length;
  const warnings = shown.length - errors;
  const notes = found.length - shown.length;
  const tally = [`${errors} error${errors === 1 ? '' : 's'}`, `${warnings} warning${warnings === 1 ? '' : 's'}`];
  if (notes) tally.push(`${notes} note${notes === 1 ? '' : 's'}`);
  console.log(['', ...lines, ...(lines.length ? [''] : []), `  ${shown.length ? c.bold(tally.join(', ')) : `${c.green('✓')} no env or auth findings`}`, ''].join('\n'));
  return errors || (strict && warnings) ? 1 : 0;
}
