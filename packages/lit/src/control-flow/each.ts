import { createEffect } from '@fluixi/reactive';
import { noChange } from 'lit';
import {
  ChildPart,
  Directive,
  directive,
  PartInfo,
  PartType,
} from 'lit/directive.js';

type Accessor<T> = () => T;
type Key = string | number | symbol;
let EACH_ID = 0;

class EachDirective<T> extends Directive {
  private dispose?: () => void;
  private part!: ChildPart;
  private readonly id = ++EACH_ID;

  // keyed cache
  private keyed = new Map<Key, unknown>();
  private value: unknown[] = [];

  constructor(partInfo: PartInfo) {
    super(partInfo);

    if (partInfo.type !== PartType.CHILD) {
      throw new Error('each() can only be used in child expressions');
    }
  }

  render<T>(
    _items: Accessor<readonly T[]> | readonly T[],
    _key: (item: T, index: number) => Key,
    _render: (item: T, index: number) => unknown
  ) {
    const itemsAccessor: Accessor<readonly T[]> =
      typeof _items === 'function' ? _items : () => _items;

    // Cleanup previous effect
    if (this.dispose) {
      this.dispose();
    }
    const __DEV__ = true;

    this.dispose = createEffect(() => {
      try {
        const items = itemsAccessor();
        const next: unknown[] = [];
        const nextKeyed = new Map<Key, unknown>();

        // for (let i = 0; i < items.length; i++) {
        //   const item = items[i];
        //   const key = _key(item, i);

        //   let tpl = this.keyed.get(key);
        //   if (!tpl) {
        //     tpl = _render(item, i);
        //   }

        //   next.push(tpl);
        //   nextKeyed.set(key, tpl);
        // }
        const seenKeys = __DEV__ ? new Set<Key>() : null;

        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const key = _key(item, i);

          if (__DEV__) {
            if (key === i) {
              console.warn(`[each] Using index as key is unstable.`, {
                directiveId: this.id,
                index: i,
              });
            }

            if (seenKeys!.has(key)) {
              console.warn(`[each] Duplicate key "${String(key)}" detected.`, {
                directiveId: this.id,
                key,
              });
            }

            seenKeys!.add(key);
          }

          let tpl = this.keyed.get(key);
          if (!tpl) {
            tpl = _render(item, i);
          }

          next.push(tpl);
          nextKeyed.set(key, tpl);
          if (__DEV__) {
            if (this.keyed.size && nextKeyed.size) {
              const prevKey = this.keyed.keys().next().value;
              const nextKey = nextKeyed.keys().next().value;

              if (typeof prevKey !== typeof nextKey) {
                console.warn(
                  `[each] Key type changed between renders (${typeof prevKey} → ${typeof nextKey}).`,
                  { directiveId: this.id }
                );
              }
            }
          }
        }

        // Optimization: only update if identity changed
        let changed =
          next.length !== this.value.length ||
          next.some((v, i) => v !== this.value[i]);

        if (changed) {
          this.value = next;
          this.keyed = nextKeyed;

          if (this.part) {
            this.part._$setValue(next);
          }
        } else {
          // keys reused but order changed
          this.keyed = nextKeyed;
        }
      } catch (err) {
        console.error('Error in each() directive:', err);
      }
    });

    // Initial render
    const initItems = itemsAccessor();
    return initItems.map((item, i) => _render(item, i));
  }

  override update(
    part: ChildPart,
    [items, key, render]: [
      Accessor<readonly T[]> | readonly T[],
      (item: T, index: number) => Key,
      (item: T, index: number) => unknown
    ]
  ) {
    this.part = part;
    return this.render(items, key, render);
  }

  disconnected() {
    if (this.dispose) {
      this.dispose();
      this.dispose = undefined;
    }
    this.keyed.clear();
    this.value = [];
  }

  reconnected() {
    // Effect recreated on next update
  }
}

// export const each = directive(EachDirective);
export const $each = <T>() => directive(EachDirective<T>);
// class EachDirective<T> extends Directive {
//   private dispose?: () => void;
//   private part!: ChildPart;
//   private value: unknown = noChange;

//   constructor(partInfo: PartInfo) {
//     super(partInfo);

//     if (partInfo.type !== PartType.CHILD) {
//       throw new Error('each() can only be used in child expressions');
//     }
//   }

//   render(
//     _items: Accessor<readonly T[]> | readonly T[],
//     _render: (item: T, index: number) => unknown
//   ) {
//     let itemsAccessor: Accessor<readonly T[]>;

//     // Normalize to accessor
//     if (typeof _items === 'function') {
//       itemsAccessor = _items;
//     } else {
//       itemsAccessor = () => _items;
//     }

//     // Cleanup previous effect
//     if (this.dispose) {
//       this.dispose();
//     }

//     // Track array reactively
//     this.dispose = createEffect(() => {
//       try {
//         const items = itemsAccessor();

//         // Map items → TemplateResults / Nodes
//         const nextValue = items.map((item, i) => _render(item, i));

//         if (nextValue !== this.value) {
//           this.value = nextValue;
//           if (this.part) {
//             this.part._$setValue(nextValue);
//           }
//         }
//       } catch (err) {
//       }
//     });

//     // Initial render
//     return itemsAccessor().map(_render);
//   }

//   override update(
//     part: ChildPart,
//     [items, render]: [
//       Accessor<readonly T[]> | readonly T[],
//       (item: T, index: number) => unknown
//     ]
//   ) {
//     this.part = part;
//     return this.render(items, render);
//   }

//   disconnected() {
//     if (this.dispose) {
//       this.dispose();
//       this.dispose = undefined;
//     }
//   }

//   reconnected() {
//     // Effect recreated on next update
//   }
// }

// export const each = directive(EachDirective);
