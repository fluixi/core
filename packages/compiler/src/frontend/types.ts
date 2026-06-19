import type { CompilerOptions } from '../options.js';

/**
 * A front-end adapter parses source (TS/JSX) and runs the Fluixi JSX transform
 * for one module, producing code (and a source map). Front-ends are the swap
 * point at the *parsing* end of the pipeline, mirroring CodegenBackend at the
 * emit end:
 *
 *   FrontEnd (babel now, swc later) -> IR -> CodegenBackend -> code
 *
 * The babel front-end (frontend/babel) is the reference implementation. An SWC
 * front-end would implement this same interface (see the compiler README for the
 * feasibility notes).
 */
export interface FrontEndResult {
  code: string;
  map?: unknown;
}

export interface FrontEnd {
  /** stable id, e.g. 'babel' | 'swc' */
  name: string;
  /** file extensions this front-end can handle, e.g. ['.tsx', '.jsx', '.ts'] */
  extensions: readonly string[];
  /** parse + transform a single module */
  transform(
    code: string,
    filename: string,
    options: CompilerOptions,
  ): FrontEndResult | Promise<FrontEndResult>;
}
