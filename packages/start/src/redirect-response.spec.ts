import { describe, expect, it } from 'vitest';
import { setResponseRedirect } from '@fluixi/dom';
import { createRequestHandler, streamDocument } from './handler.js';

const page = new TextEncoder().encode('<!--fh:--><main>workspace</main>');
const bodyOf = () =>
  new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(page);
      controller.close();
    },
  });

describe('a redirect a render asked for', () => {
  it('is the response instead of the page', async () => {
    const handler = createRequestHandler((_url, request) => {
      setResponseRedirect('/organisations', 303, request);
      return '<main>workspace</main>';
    });
    const answer = await handler(new Request('http://app.test/app'));
    expect(answer.status).toBe(303);
    expect(answer.headers.get('location')).toBe('/organisations');
    expect(await answer.text()).toBe('');
  });

  it('is the response of a streamed page when it came before the head', async () => {
    const request = new Request('http://app.test/app');
    setResponseRedirect('/organisations', 302, request);
    const answer = await streamDocument('<html><head></head><body>', bodyOf(), '</body></html>', request);
    expect(answer.status).toBe(302);
    expect(answer.headers.get('location')).toBe('/organisations');
  });

  it('leaves a page without one alone', async () => {
    const answer = await streamDocument('<html><head></head><body>', bodyOf(), '</body></html>', new Request('http://app.test/app'));
    expect(answer.status).toBe(200);
    expect(await answer.text()).toContain('workspace');
  });
});
