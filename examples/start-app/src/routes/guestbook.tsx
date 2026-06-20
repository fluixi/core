// Showcase route: combines a Form action + a "use server" function (with getRequestEvent)
// + a data-loaded resource. The message list is SSR'd (awaited), the secret field is
// redacted from __FX_DATA__ (see entry-server.ts), and signing posts via the RPC endpoint.
import { createResource } from '@fluixi/reactive/signal';
import { For } from '@fluixi/core';
import { Form, action } from '@fluixi/core/router-next';
import { addMessage, getMessages, type Message } from '../actions.js';

// action() wraps the server function with submission tracking; <Form> posts the fields.
const sign = action(addMessage, 'guestbook');

export default function Guestbook() {
  const [messages, { refetch }] = createResource<Message[]>(getMessages);

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
