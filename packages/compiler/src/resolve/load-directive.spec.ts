import { describe, it, expect } from 'vitest';
import {
  parseLoadDirective,
  isLoadDirective,
  isDeferred,
  strategyKey,
  LoadDirectiveError,
  EAGER,
} from './load-directive.js';

describe('parseLoadDirective', () => {
  it('parses the valueless strategies', () => {
    expect(parseLoadDirective('load:eager', null)).toEqual({ kind: 'eager' });
    expect(parseLoadDirective('load:idle', null)).toEqual({ kind: 'idle' });
    expect(parseLoadDirective('load:never', null)).toEqual({ kind: 'never' });
    expect(parseLoadDirective('load:visible', null)).toEqual({ kind: 'visible' });
  });

  it('reads a root margin, so the fetch starts before the element arrives', () => {
    expect(parseLoadDirective('load:visible', '200px')).toEqual({
      kind: 'visible',
      rootMargin: '200px',
    });
  });

  it('defaults interaction events', () => {
    const s = parseLoadDirective('load:interaction', null);
    expect(s).toEqual({ kind: 'interaction', events: ['pointerdown', 'focusin', 'keydown'] });
  });

  it('splits named events on spaces or commas', () => {
    expect(parseLoadDirective('load:interaction', 'click, focus')).toEqual({
      kind: 'interaction',
      events: ['click', 'focus'],
    });
  });

  it('rejects an unknown strategy', () => {
    expect(() => parseLoadDirective('load:soon', null)).toThrow(LoadDirectiveError);
  });

  it('rejects load:media without a query', () => {
    expect(() => parseLoadDirective('load:media', null)).toThrow(/needs a query/);
  });

  it('rejects load:interaction with an empty event list', () => {
    expect(() => parseLoadDirective('load:interaction', '  ')).toThrow(/no event names/);
  });
});

describe('helpers', () => {
  it('recognises the namespace', () => {
    expect(isLoadDirective('load:visible')).toBe(true);
    expect(isLoadDirective('loading')).toBe(false);
    expect(isLoadDirective('onClick')).toBe(false);
  });

  it('treats eager and never as not-deferred', () => {
    // `never` means no client code at all, so there is nothing to schedule.
    expect(isDeferred(EAGER)).toBe(false);
    expect(isDeferred({ kind: 'never' })).toBe(false);
    expect(isDeferred({ kind: 'idle' })).toBe(true);
  });

  it('keys strategies so equivalent ones group together', () => {
    expect(strategyKey({ kind: 'visible', rootMargin: '100px' })).toBe('visible:100px');
    expect(strategyKey({ kind: 'interaction', events: ['b', 'a'] })).toBe(
      strategyKey({ kind: 'interaction', events: ['a', 'b'] }),
    );
    expect(strategyKey({ kind: 'visible' })).not.toBe(strategyKey({ kind: 'idle' }));
  });
});
