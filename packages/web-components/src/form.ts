/**
 * Form controls: an element that takes part in a `<form>` the way `<input>` does.
 *
 * `static formAssociated = true` is what the browser checks, and `ElementInternals` does the
 * rest: the value submitted, validity, `:disabled` from a `<fieldset>`, reset and restore. This
 * mixin puts the native control API on the element, so page code treats it like any input
 * (`el.form`, `el.checkValidity()`, `new FormData(form)`), and gives subclasses the protected
 * half: `setFormValue`, `setValidity`, and hooks for reset and restore.
 */
import { signal } from '@fluixi/reactive/signal';
import type { HTMLReactiveElement } from './element.js';

type Base = abstract new (...args: any[]) => HTMLReactiveElement;

interface FormCallbacks {
  formAssociatedCallback?(form: HTMLFormElement | null): void;
  formDisabledCallback?(disabled: boolean): void;
  formResetCallback?(): void;
  formStateRestoreCallback?(state: string | File | FormData | null, mode: 'restore' | 'autocomplete'): void;
}

/**
 * What `FormAssociated` adds, public and protected. Declared apart from the class because a
 * function returning a class with protected members cannot be written to a declaration file.
 */
export declare abstract class FormAssociatedMembers {
  static formAssociated: boolean;
  get form(): HTMLFormElement | null;
  get labels(): NodeList;
  get name(): string;
  set name(value: string);
  get validity(): ValidityState;
  get validationMessage(): string;
  get willValidate(): boolean;
  checkValidity(): boolean;
  reportValidity(): boolean;
  setCustomValidity(message: string): void;
  protected get formDisabled(): boolean;
  protected setFormValue(value: File | string | FormData | null, state?: File | string | FormData | null): void;
  protected setValidity(flags: ValidityStateFlags, message?: string, anchor?: HTMLElement): void;
  protected resetValue(): void;
  protected restoreValue(state: string | File | FormData | null, mode: 'restore' | 'autocomplete'): void;
  formAssociatedCallback(form: HTMLFormElement | null): void;
  formDisabledCallback(disabled: boolean): void;
  formResetCallback(): void;
  formStateRestoreCallback(state: string | File | FormData | null, mode: 'restore' | 'autocomplete'): void;
}

export function FormAssociated<B extends Base>(Base: B): B & (abstract new (...args: any[]) => FormAssociatedMembers) & { formAssociated: boolean } {
  abstract class FormAssociatedElement extends Base {
    static formAssociated = true;

    #formDisabled = signal(false);
    /** The last validity the subclass set, kept so a custom message can be laid over it and lifted. */
    #flags: ValidityStateFlags = {};
    #message = '';
    #anchor: HTMLElement | undefined;
    #custom = '';

    /** The form this control belongs to, like `input.form`. */
    get form(): HTMLFormElement | null {
      return this.internals.form;
    }

    /** The `<label>`s that name this control. */
    get labels(): NodeList {
      return this.internals.labels;
    }

    /** The key the value is submitted under: the `name` attribute, as on an input. */
    get name(): string {
      return this.getAttribute('name') ?? '';
    }
    set name(value: string) {
      this.setAttribute('name', value);
    }

    get validity(): ValidityState {
      return this.internals.validity;
    }

    get validationMessage(): string {
      return this.internals.validationMessage;
    }

    get willValidate(): boolean {
      return this.internals.willValidate;
    }

    checkValidity(): boolean {
      return this.internals.checkValidity();
    }

    reportValidity(): boolean {
      return this.internals.reportValidity();
    }

    /** As on an input: a non-empty message makes the control invalid until it is cleared. */
    setCustomValidity(message: string): void {
      this.#custom = message;
      this.#applyValidity();
    }

    /**
     * Whether a disabled `<fieldset>` or form covers this control. Reactive: read it in a
     * binding and the control follows. A disabled control is also left out of `FormData`.
     */
    protected get formDisabled(): boolean {
      return this.#formDisabled();
    }

    /** What the form submits for this control. `null` submits nothing. */
    protected setFormValue(value: File | string | FormData | null, state?: File | string | FormData | null): void {
      this.internals.setFormValue(value, state);
    }

    /**
     * The control's own validity: `{ valueMissing: true }` and a message, or `{}` when valid.
     * `anchor` is the inner element the browser points its bubble at.
     */
    protected setValidity(flags: ValidityStateFlags, message = '', anchor?: HTMLElement): void {
      this.#flags = flags;
      this.#message = message;
      this.#anchor = anchor;
      this.#applyValidity();
    }

    /** Put the value back to what the page wrote. Called when the form resets. */
    protected resetValue(): void {}

    /** Take back a value the browser saved, on back/forward navigation or autofill. */
    protected restoreValue(_state: string | File | FormData | null, _mode: 'restore' | 'autocomplete'): void {}

    formAssociatedCallback(form: HTMLFormElement | null): void {
      up(FormAssociatedElement).formAssociatedCallback?.call(this, form);
    }

    formDisabledCallback(disabled: boolean): void {
      up(FormAssociatedElement).formDisabledCallback?.call(this, disabled);
      this.#formDisabled.set(disabled);
    }

    formResetCallback(): void {
      up(FormAssociatedElement).formResetCallback?.call(this);
      this.setCustomValidity('');
      this.resetValue();
    }

    formStateRestoreCallback(state: string | File | FormData | null, mode: 'restore' | 'autocomplete'): void {
      up(FormAssociatedElement).formStateRestoreCallback?.call(this, state, mode);
      this.restoreValue(state, mode);
    }

    #applyValidity(): void {
      // Not in every environment; the value still submits without it.
      if (typeof this.internals.setValidity !== 'function') return;
      if (this.#custom) this.internals.setValidity({ ...this.#flags, customError: true }, this.#custom, this.#anchor);
      else if (Object.values(this.#flags).some(Boolean)) this.internals.setValidity(this.#flags, this.#message, this.#anchor);
      else this.internals.setValidity({});
    }
  }
  return FormAssociatedElement as unknown as B & (abstract new (...args: any[]) => FormAssociatedMembers) & { formAssociated: boolean };
}

/** The form callbacks of whatever sits above the mixin, so a mixin under it still runs. */
function up(cls: { prototype: object }): FormCallbacks {
  return Object.getPrototypeOf(cls.prototype) as FormCallbacks;
}
