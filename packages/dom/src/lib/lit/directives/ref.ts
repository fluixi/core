import {
  directive,
  Directive,
  ElementPart,
  PartInfo,
  PartType,
} from 'lit/directive.js';

import { ref as litRef } from 'lit/directives/ref.js';

import { rxDirective } from './utils.js';
import { litrx } from './litrx.js';

export interface RefObject<T> {
  current: T | null;
}

class RefDirective extends Directive {
  constructor(partInfo: PartInfo) {
    super(partInfo);
    if (partInfo.type !== PartType.ELEMENT) {
      throw new Error('useRef directive can only be used on elements');
    }
  }

  override update(part: ElementPart, [refObject]: [RefObject<any>]) {
    // This runs when the element is created/updated in the DOM
    refObject.current = part.element;
    return this.render(refObject);
  }

  render(refObject: RefObject<any>) {
    return undefined;
  }
}

// Export the directive to be used in templates
export const bindRef = directive(RefDirective);

export const ref = rxDirective(litRef, litrx);
