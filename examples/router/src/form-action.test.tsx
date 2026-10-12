// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render } from '@fluixi/core';
import { ActionForm, action, useSubmission } from '@fluixi/core/router';
import { flush } from '@fluixi/reactive/signal';

const tick = async (ms = 20) => { await new Promise((r) => setTimeout(r, ms)); await flush(); };

describe('<ActionForm> action', () => {
  it('submits form fields to the action as a plain object + tracks submission', async () => {
    let received: any;
    const save = action(async (data: any) => { received = data; return { ok: true }; }, 'save');

    let sub: any;
    function Page() {
      sub = useSubmission(save);
      return (
        <ActionForm action={save} class="f">
          <input name="title" value="hello" />
          <input name="n" value="2" />
          <button type="submit">go</button>
        </ActionForm>
      );
    }
    const host = document.createElement('div');
    render(() => <Page />, host);
    await tick();

    const form = host.querySelector('form.f') as HTMLFormElement;
    expect(form.getAttribute('method')).toBe('post');
    form.requestSubmit();
    await tick();

    expect(received).toEqual({ title: 'hello', n: '2' }); // FormData → plain object
    expect(sub()?.result).toEqual({ ok: true });          // submission tracked
    expect(sub()?.pending).toBe(false);
  });
});

