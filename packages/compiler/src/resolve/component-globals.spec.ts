import { describe, it, expect } from 'vitest';
import { componentGlobals } from './component-globals.js';

const ui = { components: { Button: '@ui/button', Stack: '@ui/layout' } };

describe('componentGlobals', () => {
  it('declares a named export as an alias, so hover keeps the declaration', () => {
    const { source, declared } = componentGlobals([ui], { builtins: false });
    expect(declared).toEqual(['Button', 'Stack']);
    expect(source).toContain("import * as __ui_button from '@ui/button';");
    expect(source).toContain('export import Button = __ui_button.Button;');
  });

  it('falls back to a const for a default export', () => {
    // `import X = ns.default` is a syntax error: `default` is reserved in that position.
    const rules = [{ components: { Card: { module: './Card.js', export: 'default' } } }];
    const { source } = componentGlobals(rules, { builtins: false });
    expect(source).toContain('const Card: typeof ___Card_js.default;');
    expect(source).not.toContain('= ___Card_js.default;');
  });

  it('renames when the export differs from the tag', () => {
    const rules = [{ components: { Btn: { module: '@ui/button', export: 'Button' } } }];
    const { source } = componentGlobals(rules, { builtins: false });
    expect(source).toContain('export import Btn = __ui_button.Button;');
  });

  it('leaves out names lib.dom already claims, and says so', () => {
    const rules = [{ components: { Text: '@ui/text', Button: '@ui/button' } }];
    const { source, declared, shadowedByDom } = componentGlobals(rules, { builtins: false });
    expect(shadowedByDom).toEqual(['Text']);
    expect(declared).toEqual(['Button']);
    expect(source).toContain("import { Text } from '@ui/text';");
  });

  it('drops components from packages the project does not depend on', () => {
    const { declared, unavailable } = componentGlobals([ui], {
      builtins: false,
      available: ['@ui/button'],
    });
    // Declaring @ui/layout would resolve to nothing and degrade Stack to `any`.
    expect(declared).toEqual(['Button']);
    expect(unavailable).toEqual(['Stack']);
  });

  it('never filters relative or alias specifiers — there is no package to check', () => {
    const rules = [{ components: { Local: './Local.js', Aliased: '@/widgets/Aliased.js' } }];
    const { declared, unavailable } = componentGlobals(rules, {
      builtins: false,
      available: ['@ui/button'],
    });
    expect(declared).toEqual(['Aliased', 'Local']);
    expect(unavailable).toEqual([]);
  });

  it('scopes the availability check to the package, not the subpath', () => {
    const rules = [{ components: { Deep: '@ui/button/sub/path' } }];
    const { declared } = componentGlobals(rules, { builtins: false, available: ['@ui/button'] });
    expect(declared).toEqual(['Deep']);
  });

  it('declares the builtins by default', () => {
    const { declared, source } = componentGlobals([]);
    expect(declared).toContain('Show');
    expect(source).toContain("import * as __fluixi_dom from '@fluixi/dom';");
  });

  it('lets an explicit rule retarget a builtin', () => {
    const rules = [{ components: { Router: '@app/router' } }];
    const { source } = componentGlobals(rules);
    expect(source).toContain('export import Router = __app_router.Router;');
    expect(source).not.toContain('__fluixi_core_router_next.Router;');
  });

  it('reports pattern rules rather than silently emitting nothing for them', () => {
    const rules = [ui, { match: /^Icon(.+)$/, module: '@/icons/$1' }];
    const { patternRules, source } = componentGlobals(rules, { builtins: false });
    expect(patternRules).toBe(1);
    expect(source).toContain('1 pattern rule cannot be declared');
  });

  it('emits a valid empty body when nothing resolves', () => {
    const { source, declared } = componentGlobals([], { builtins: false });
    expect(declared).toEqual([]);
    expect(source).toContain('declare global {');
  });
});

describe('the $ intrinsics', () => {
  it('declares them, so the editor stops reporting "Cannot find name"', () => {
    const { source } = componentGlobals([]);
    expect(source).toContain('const $signal: typeof');
    expect(source).toContain('const $memo: typeof');
    expect(source).toContain('const $effect: typeof');
    expect(source).toContain('const $store: typeof');
  });

  it('types them from what they compile to', () => {
    // `$signal` stands for `signal`, so it borrows that signature rather than a copy.
    const { source } = componentGlobals([]);
    expect(source).toMatch(/const \$signal: typeof \w+\.signal;/);
    expect(source).toContain("from '@fluixi/reactive/signal'");
  });

  it('can be left out', () => {
    const { source } = componentGlobals([], { intrinsics: false });
    expect(source).not.toContain('$signal');
  });
});
