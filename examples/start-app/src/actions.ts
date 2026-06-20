// Server functions: bodies run only on the server, called from the client over RPC.
// getRequestEvent() exposes the request (headers, url, cookies) inside them.
import { getRequestEvent } from '@fluixi/server';

export interface Message {
  text: string;
  ua: string;     // captured server-side from the request
  secret: string; // server-only — redacted from __FX_DATA__ before it reaches the page
}

// In-memory store (a real app would hit a DB). Module-level → shared across requests.
const messages: Message[] = [
  { text: 'Welcome to the Fluixi guestbook!', ua: 'system', secret: 'seed-token' },
];

/** Add a message. Captures the caller's user-agent from the request event. */
export const addMessage = async (data: { text?: string }): Promise<Message[]> => {
  'use server';
  const text = (data?.text ?? '').toString().trim();
  if (text) {
    const req = getRequestEvent()?.request as Request | undefined;
    messages.push({
      text,
      ua: req?.headers.get('user-agent')?.slice(0, 40) ?? 'unknown',
      secret: `tok-${Math.random().toString(16).slice(2, 8)}`,
    });
  }
  return messages;
};

/** List messages (also used as the route loader). */
export const getMessages = async (): Promise<Message[]> => {
  'use server';
  return messages;
};
