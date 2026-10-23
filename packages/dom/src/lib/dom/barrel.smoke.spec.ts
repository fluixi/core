import { describe, it, expect } from 'vitest';
// Loading the package barrel used to crash (src/index.ts read _DOM.createComponent
// while the template/control-flow files were mid-cycle through '@fluixi/dom').
// After repointing those to relative imports, the barrel must load cleanly.
import * as DOM from '@fluixi/dom';

describe('@fluixi/dom barrel loads (no circular crash)', () => {
  it('exposes the runtime API', () => {
    expect(typeof DOM.createNativeElement).toBe('function');
    expect(typeof DOM.insert).toBe('function');
    expect(typeof DOM.render).toBe('function');
  });
});
