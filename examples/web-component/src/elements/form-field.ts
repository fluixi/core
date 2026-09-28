/**
 * A mixin: turns an element into a form control.
 *
 * Written the standard way, a function from a base class to a class that extends it, so it
 * composes over `HTMLReactiveElement` or anything built on it. It uses the base's protected
 * `internals` (the element's `ElementInternals`) and gives its subclasses protected members
 * of their own, which is what a mixin is for.
 *
 * With `static formAssociated = true` the browser treats the element like an `<input>`: the
 * value set through `commit` is submitted with the form, `reset` resets it, and it shows up
 * in `FormData` under the element's `name` attribute.
 */
import type { HTMLReactiveElement } from '@fluixi/web-components';

type Base = abstract new (...args: any[]) => HTMLReactiveElement;

export function FormField<B extends Base>(Base: B) {
  abstract class Field extends Base {
    static formAssociated = true;

    /** The value the form submits, and whether it is valid. For subclasses only. */
    protected commit(value: string | null, missing: string | null = null): void {
      this.internals.setFormValue(value);
      // Not in every environment yet; the value still submits without it.
      this.internals.setValidity?.(missing ? { valueMissing: true } : {}, missing ?? '');
    }

    /** Put the value back to how the page wrote it. */
    protected abstract resetValue(): void;

    /** The browser calls this when the form is reset. */
    formResetCallback(): void {
      this.resetValue();
    }

    /** The form this control belongs to, like `input.form`. */
    get form(): HTMLFormElement | null {
      return this.internals.form;
    }
  }
  return Field;
}
