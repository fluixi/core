/**
 * `@fluixi/cli/scaffold`: the code generators share with create-fluixi. No dependencies and
 * no output of its own, so a bundler can carry it into a package that has neither.
 */
export * from './auth.js';
export * from './edit.js';
export {
  PROVIDERS,
  SERVER_ONLY,
  PROVIDER_VARS,
  type ProviderName,
} from './templates.js';
export * as templates from './templates.js';
export { askSelect, askText, BAR, type Choice } from './prompt.js';
