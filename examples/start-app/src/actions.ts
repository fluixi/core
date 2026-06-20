// A server function: body runs only on the server. getRequestEvent() exposes the
// request (headers, url, cookies) inside it.
import { getRequestEvent } from '@fluixi/server';

export const whoami = async (): Promise<{ url: string; ua: string }> => {
  'use server';
  const event = getRequestEvent();
  const req = event?.request as Request | undefined;
  return {
    url: event?.url ?? '?',
    ua: req?.headers.get('user-agent') ?? 'unknown',
  };
};
