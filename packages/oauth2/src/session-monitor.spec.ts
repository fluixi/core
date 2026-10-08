// @vitest-environment jsdom
/**
 * The page's half of Session Management: frames the provider's check page, asks it, and
 * acts once on `changed`.
 */
import { describe, expect, it, vi, afterEach } from 'vitest';
import { watchProviderSession, type SessionCheck } from './session-monitor.js';

const CHECK: SessionCheck = { frame: 'https://idp.test/check-session', clientId: 'portal', state: 'abc.01' };

const fetcherFor = (body: SessionCheck) => vi.fn(async () => Response.json(body)) as unknown as typeof fetch;

async function framed(): Promise<HTMLIFrameElement> {
  await vi.waitFor(() => expect(document.querySelector('iframe')).not.toBeNull());
  return document.querySelector('iframe')!;
}

const say = (frame: HTMLIFrameElement, data: string, origin = 'https://idp.test') =>
  window.dispatchEvent(new MessageEvent('message', { data, origin, source: frame.contentWindow }));

afterEach(() => {
  document.body.innerHTML = '';
  sessionStorage.clear();
});

describe('watching the provider session', () => {
  it('asks the check page with the client and the last session_state', async () => {
    const stop = watchProviderSession({ fetcher: fetcherFor(CHECK), onChange: vi.fn() });
    const frame = await framed();
    expect(frame.src).toBe(CHECK.frame);
    const post = vi.spyOn(frame.contentWindow!, 'postMessage');
    frame.dispatchEvent(new Event('load'));
    expect(post).toHaveBeenCalledWith('portal abc.01', 'https://idp.test');
    stop();
    expect(document.querySelector('iframe')).toBeNull();
  });

  it('acts on a change once, and only on an answer from the check page', async () => {
    const onChange = vi.fn();
    watchProviderSession({ fetcher: fetcherFor(CHECK), onChange });
    const frame = await framed();
    say(frame, 'changed', 'https://evil.test');
    say(frame, 'unchanged');
    expect(onChange).not.toHaveBeenCalled();
    say(frame, 'changed');
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(document.querySelector('iframe')).toBeNull();
  });

  it('stops when the first answer after acting is changed again, so it cannot loop', async () => {
    const first = vi.fn();
    watchProviderSession({ fetcher: fetcherFor(CHECK), onChange: first });
    say(await framed(), 'changed');
    const second = vi.fn();
    watchProviderSession({ fetcher: fetcherFor(CHECK), onChange: second });
    say(await framed(), 'changed');
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();
  });

  it('acts on a real change right after acting: one that follows an unchanged', async () => {
    watchProviderSession({ fetcher: fetcherFor(CHECK), onChange: vi.fn() });
    say(await framed(), 'changed');
    const next = vi.fn();
    watchProviderSession({ fetcher: fetcherFor(CHECK), onChange: next });
    const frame = await framed();
    say(frame, 'unchanged');
    say(frame, 'changed');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('watches nothing without a check page or a state', async () => {
    const fetcher = fetcherFor({ ...CHECK, state: null });
    watchProviderSession({ fetcher, onChange: vi.fn() });
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(document.querySelector('iframe')).toBeNull();
  });
});
