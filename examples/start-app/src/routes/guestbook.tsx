// Showcase route: combines a Form action + "use server" functions (with getRequestEvent)
// + a data-loaded resource. The message list is SSR'd (awaited), the secret field is
// redacted from __FX_DATA__ (see entry-server.ts), and signing posts via the RPC endpoint
// then updates the list in place.
import { createResource } from '@fluixi/reactive/signal';
import { For } from '@fluixi/core';
import { Form, action } from '@fluixi/core/router-next';
import { addMessage, getMessages, type Message } from '../actions.js';

export default function Guestbook() {
  // SSR-loaded list (seeded on the client from __FX_DATA__, no refetch).
  const [messages, { mutate }] = createResource<Message[]>(getMessages);

  // The action calls the server function (RPC), then mutates the resource with the
  // returned list so the UI updates immediately. <Form> tracks submission state.
  const sign = action(async (data: { text?: string }) => {
    const updated = await addMessage(data);
    mutate(() => updated);
    return updated;
  }, 'guestbook');

  return (
    <section class="guestbook">
      <h1>Guestbook</h1>
      <p>Server function + Form action + getRequestEvent + redacted SSR data.</p>

      <Form action={sign}>
        <input name="text" placeholder="Leave a message…" />
        <button type="submit">Sign</button>
      </Form>

      <ul>
        <For each={() => messages() ?? []}>
          {(m: Message) => (
            <li>
              {m.text} <small>— {m.ua}</small>
            </li>
          )}
        </For>
      </ul>
    </section>
  );
}
