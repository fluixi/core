import { AsyncDirective, directive } from 'lit/async-directive.js';
import { noChange } from 'lit';
import { isPromise } from './utils.js';
import { isTemplateResult } from 'lit/directive-helpers.js';
import { html } from '../index.js';
import { iterateFn } from '../../dom/runtime.js';

class SuspenseDirective extends AsyncDirective {
  private pending: Set<Promise<any>> = new Set();
  private isDisconnected = false;

  async render(children: () => any, fallback: any) {
    this.isDisconnected = false;
    this.resolveChildren(children, fallback);
    if (isPromise(fallback)) {
      let r = await fallback;
      console.log('susp', children, r);
      this.setValue(r);
      return r;
    }
    return fallback;
  }

  private async resolveChildren(children: () => any, fallback: any) {
    try {
      const result = iterateFn(children);
      // console.log('resolving', result);

      if (isPromise(result)) {
        this.pending.add(result);
        let resolved = iterateFn(await result);
        if (isPromise(resolved)) {
          resolved = iterateFn(await resolved);
        }
        // console.log('res', resolved);
        this.pending.delete(result);

        if (!this.isDisconnected && this.pending.size === 0) {
          this.setValue(resolved);
        }
      } else if (isTemplateResult(result)) {
        // Check for promises in template values
        const promises = this.extractPromises(result);

        if (promises.length > 0) {
          for (const promise of promises) {
            this.pending.add(promise);
            promise
              .then(() => {
                this.pending.delete(promise);
                if (!this.isDisconnected && this.pending.size === 0) {
                  this.resolveTemplate(result).then((resolved) => {
                    // console.log('resolved', resolved);
                    this.setValue(resolved);
                  });
                }
              })
              .catch(() => {
                this.pending.delete(promise);
              });
          }
        } else {
          this.setValue(result);
        }
      } else {
        this.setValue(result);
      }
    } catch (error) {
      if (isPromise(error)) {
        this.pending.add(error);
        error
          .then(() => {
            this.pending.delete(error);
            if (!this.isDisconnected && this.pending.size === 0) {
              this.resolveChildren(children, fallback);
            }
          })
          .catch(() => {
            this.pending.delete(error);
          });
      }
    }
  }

  private extractPromises(template: any): Promise<any>[] {
    const promises: Promise<any>[] = [];
    if (template.values) {
      for (const value of template.values) {
        if (isPromise(value)) {
          promises.push(value);
        } else if (Array.isArray(value)) {
          for (const item of value) {
            if (isPromise(item)) {
              promises.push(item);
            }
          }
        }
      }
    }
    return promises;
  }

  private async resolveTemplate(template: any): Promise<any> {
    if (!template.values) return template;

    const resolvedValues = [];
    for (const value of template.values) {
      if (isPromise(value)) {
        resolvedValues.push(await value);
      } else if (Array.isArray(value)) {
        const resolvedArray = [];
        for (const item of value) {
          if (isPromise(item)) {
            resolvedArray.push(await item);
          } else {
            resolvedArray.push(item);
          }
        }
        resolvedValues.push(resolvedArray);
      } else {
        resolvedValues.push(value);
      }
    }

    return {
      ...template,
      values: resolvedValues,
    };
  }

  override disconnected() {
    this.isDisconnected = true;
    this.pending.clear();
  }

  override reconnected() {
    this.isDisconnected = false;
  }
}

export const $Suspense = directive(SuspenseDirective);
