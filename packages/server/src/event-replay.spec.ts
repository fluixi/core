import { describe, it, expect } from 'vitest';
import {
  eventCaptureScript,
  EVENT_REPLAY_TYPES,
  createHtmlDocument,
} from './index.js';

describe('event-replay: server capture script', () => {
  it('emits a self-contained capture IIFE for the discrete event types', () => {
    const s = eventCaptureScript();
    expect(s.startsWith('<script>')).toBe(true);
    expect(s.endsWith('</script>')).toBe(true);
    // sets up the queue + a stop hook the client uses
    expect(s).toContain('window.__FX_REPLAY__');
    expect(s).toContain('window.__FX_REPLAY_STOP__');
    expect(s).toContain('addEventListener');
    expect(s).toContain('true'); // capture phase
    // records exactly the agreed event types
    for (const t of EVENT_REPLAY_TYPES) expect(s).toContain(`"${t}"`);
  });

  it('createHtmlDocument includes the capture script in <head> by default', () => {
    const html = createHtmlDocument('<div id="app">hi</div>', { title: 'T' });
    expect(html).toContain('window.__FX_REPLAY__');
    // before the app content (so it captures from first paint)
    expect(html.indexOf('__FX_REPLAY__')).toBeLessThan(html.indexOf('id="app"'));
  });

  it('eventReplay:false omits the capture script', () => {
    const html = createHtmlDocument('<div id="app">hi</div>', { eventReplay: false });
    expect(html).not.toContain('__FX_REPLAY__');
  });
});
