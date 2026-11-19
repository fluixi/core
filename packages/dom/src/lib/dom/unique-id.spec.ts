// @vitest-environment jsdom
/** `createUniqueId`: the same id on the server and in the hydrated page. */
import { describe, it, expect } from 'vitest';
import { createRoot } from '@fluixi/reactive/signal';
import { createComponent, createNativeElement, createUniqueId, hydrate, insert, render, renderToString } from '../index.js';

function Field(props: { label: string }) {
  const id = createUniqueId();
  const hint = createUniqueId();
  const wrap = createNativeElement('div');
  const label = createNativeElement('label');
  label.setAttribute('for', id);
  insert(label, props.label);
  const input = createNativeElement('input');
  input.setAttribute('id', id);
  input.setAttribute('aria-describedby', hint);
  insert(wrap, [label, input]);
  return wrap;
}
const Form = () => {
  const form = createNativeElement('form');
  insert(form, [createComponent(Field, { label: 'Name' }), createComponent(Field, { label: 'Email' })]);
  return form;
};

describe('createUniqueId', () => {
  it('gives each call its own id, and the browser the server ids when it hydrates', () => {
    const html = renderToString(() => Form());
    const ids = [...html.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(ids).size).toBe(2);
    expect(html).toContain(`for="${ids[0]}"`);

    const container = document.createElement('div');
    container.innerHTML = html;
    document.body.append(container);
    hydrate(() => Form(), container);
    const inputs = [...container.querySelectorAll('input')].map((i) => i.id);
    expect(inputs).toEqual(ids);
    expect(container.querySelector('label')!.getAttribute('for')).toBe(ids[0]);
  });

  it('is unique in a page rendered in the browser', () => {
    const host = document.createElement('div');
    createRoot(() => render(() => Form(), host));
    const ids = [...host.querySelectorAll('input')].map((i) => i.id);
    expect(new Set(ids).size).toBe(2);
    expect(ids.every((id) => id.startsWith('fx-'))).toBe(true);
  });
});
