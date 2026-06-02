// import { Accessor, createEffect } from '@fluixi/reactive';

// import { Directive, directive, PartInfo, PartType } from 'lit/directive.js';

// class ReadDirective extends Directive {
//   private dispose?: () => void;

//   constructor(partInfo: PartInfo) {
//     super(partInfo);

//     if (partInfo.type !== PartType.CHILD) {
//       throw new Error('read() can only be used in text bindings');
//     }
//   }

//   render(_getter: () => unknown) {
//     // Initial render only
//     return '';
//   }

//   override update(_part: any, [getter]: [() => unknown]) {
//     if (!this.dispose) {
//       // bridge to YOUR fine-grained system
//       this.dispose = createEffect(() => {
//         _part.setValue(getter());
//         _part.commit();
//       });
//     }

//     return noChange;
//   }

//   disconnected() {
//     this.dispose?.();
//     this.dispose = undefined;
//   }
// }

// export const read = directive(ReadDirective);
