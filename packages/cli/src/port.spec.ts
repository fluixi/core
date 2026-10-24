import { describe, expect, it } from 'vitest';
import { portOverride } from './port.js';

describe('portOverride', () => {
  it('reads --port in either form', () => {
    expect(portOverride(['dev', '--port=4000'], {})).toBe(4000);
    expect(portOverride(['start', '--port', '4001'], {})).toBe(4001);
  });

  it('takes PORT, which hosts set, when no flag is given', () => {
    expect(portOverride(['start'], { PORT: '8080' })).toBe(8080);
  });

  it('lets the flag win over PORT', () => {
    expect(portOverride(['start', '--port=4000'], { PORT: '8080' })).toBe(4000);
  });

  it('leaves the port to the config without either', () => {
    expect(portOverride(['start'], {})).toBeUndefined();
    expect(portOverride(['start'], { PORT: '' })).toBeUndefined();
  });

  it('refuses a port that is not one', () => {
    expect(() => portOverride(['dev', '--port=abc'], {})).toThrow(/--port/);
    expect(() => portOverride(['dev', '--port'], {})).toThrow(/--port/);
    expect(() => portOverride(['start'], { PORT: '70000' })).toThrow(/PORT/);
    expect(() => portOverride(['start'], { PORT: '80.5' })).toThrow(/PORT/);
  });
});
