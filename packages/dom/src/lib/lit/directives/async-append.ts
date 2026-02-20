import { asyncAppend as litAsyncAppend } from 'lit/directives/async-append.js';
import { asyncRxDirective, rxDirective } from './utils.js';
import { litrx } from './litrx.js';
import { directive, PartInfo, PartType } from 'lit/directive.js';
import { AsyncDirective } from 'lit/async-directive.js';
import { html } from '../templates/index.js';
import { ChildPart, noChange, nothing } from 'lit';
import { iterateFn } from '../../dom/runtime.js';

class AsyncFnDirective extends AsyncDirective {
  private value: any = noChange;
  private dispose?: () => void;
  private part!: ChildPart;

  constructor(partInfo: PartInfo) {
    super(partInfo);

    // Validate part type
    if (
      partInfo.type !== PartType.CHILD &&
      partInfo.type !== PartType.ATTRIBUTE &&
      partInfo.type !== PartType.PROPERTY
    ) {
      console.error('part error', partInfo);
      throw new Error(
        'The `reactive` directive can only be used in text content, attributes, or properties'
      );
    }
  }

  async render(fn: any, fallback = nothing) {
    console.log('render directive', fn, fallback, this);
    this.setValue(fallback);

    try {
      const result = iterateFn(await fn);
      console.log('result', result);
      if (this.part) {
        this.part._$setValue(result);
      } else {
        this.setValue(result);
      }
      // this.setValue(html`${result}`);
    } catch (e) {
      console.log('e', e);
      this.setValue(html`<pre>Error</pre>`);
    }

    return fallback;
  }
}

export const asyncFn = directive(AsyncFnDirective);
export const asyncAppend = asyncFn;
// export const asyncAppend = asyncRxDirective(litAsyncAppend, asyncFn);

// export { litAsyncAppend as asyncAppend };
