/**
 * Form association in a real browser: jsdom has none of the form half of ElementInternals.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { FormAssociated, prop, typedElement } from './index.js';

let n = 0;
const tag = () => `fx-field-${++n}`;
const tick = () => new Promise((r) => setTimeout(r, 0));

class Score extends FormAssociated(typedElement({ value: prop.number(0), required: prop.boolean(false) })) {
  static resets = 0;
  #initial = 0;

  protected override render(): unknown {
    this.#initial = this.value;
    return null;
  }

  /** What a real control does when its value changes. */
  set(value: number): void {
    this.value = value;
    this.setFormValue(value ? String(value) : null);
    this.setValidity(this.required && !value ? { valueMissing: true } : {}, 'Pick a score');
  }

  get disabledByForm(): boolean {
    return this.formDisabled;
  }

  protected override resetValue(): void {
    Score.resets++;
    this.set(this.#initial);
  }
}
const SCORE = tag();
customElements.define(SCORE, Score);

function mount(html: string): HTMLFormElement {
  const form = document.createElement('form');
  form.innerHTML = html;
  document.body.append(form);
  return form;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('a form-associated element', () => {
  it('submits its value under its name and belongs to its form', () => {
    const form = mount(`<${SCORE} name="score"></${SCORE}>`);
    const el = form.querySelector(SCORE) as Score;
    el.set(4);
    expect(new FormData(form).get('score')).toBe('4');
    expect(el.form).toBe(form);
    expect(el.name).toBe('score');
  });

  it('is invalid while required and empty, and blocks checkValidity on the form', () => {
    const form = mount(`<${SCORE} name="score" required></${SCORE}>`);
    const el = form.querySelector(SCORE) as Score;
    el.set(0);
    expect(el.validity.valueMissing).toBe(true);
    expect(el.validationMessage).toBe('Pick a score');
    expect(form.checkValidity()).toBe(false);
    el.set(3);
    expect(el.checkValidity()).toBe(true);
    expect(form.checkValidity()).toBe(true);
  });

  it('lays a custom message over its own validity, and lifts it again', () => {
    const form = mount(`<${SCORE} name="score"></${SCORE}>`);
    const el = form.querySelector(SCORE) as Score;
    el.set(2);
    el.setCustomValidity('Taken');
    expect(el.validity.customError).toBe(true);
    expect(el.validationMessage).toBe('Taken');
    el.setCustomValidity('');
    expect(el.validity.valid).toBe(true);
  });

  it('follows a disabled fieldset, reactively, and leaves FormData', async () => {
    const form = mount(`<fieldset><${SCORE} name="score"></${SCORE}></fieldset>`);
    const el = form.querySelector(SCORE) as Score;
    el.set(5);
    form.querySelector('fieldset')!.disabled = true;
    await tick();
    expect(el.disabledByForm).toBe(true);
    expect(el.matches(':disabled')).toBe(true);
    expect(new FormData(form).has('score')).toBe(false);
    form.querySelector('fieldset')!.disabled = false;
    await tick();
    expect(el.disabledByForm).toBe(false);
  });

  it('resets to what the page wrote when the form resets, clearing a custom message', async () => {
    const form = mount(`<${SCORE} name="score" value="2"></${SCORE}>`);
    const el = form.querySelector(SCORE) as Score;
    el.set(5);
    el.setCustomValidity('Nope');
    form.reset();
    await tick();
    expect(Score.resets).toBe(1);
    expect(el.value).toBe(2);
    expect(new FormData(form).get('score')).toBe('2');
    expect(el.validity.customError).toBe(false);
  });

  it('is named by a <label for>', () => {
    const form = mount(`<label for="s">Score</label><${SCORE} id="s" name="score"></${SCORE}>`);
    const el = form.querySelector(SCORE) as Score;
    expect(Array.from(el.labels, (l) => l.textContent)).toEqual(['Score']);
  });
});
