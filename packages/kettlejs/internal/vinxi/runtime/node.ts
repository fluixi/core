// // runtime/node.ts
// export type FrameworkNode =
//   | {
//       type: 'script';
//       props: {
//         id: string;
//         type: string;
//         text: string;
//       };
//     }
//   | {
//       type: 'provider';
//       context: any;
//       value: any;
//       children: () => FrameworkNode;
//     }
//   | {
//       type: 'component';
//       render: () => FrameworkNode;
//     };

// // runtime/node.ts
// export function createNode(type: string, props: any) {
//   return { type, ...props };
// }
