// import { BaseFileSystemRouter } from 'vinxi/fs-router';

// export class MyFileSystemRouter extends BaseFileSystemRouter {
//   toPath(filePath: string) {
//     return filePath.replace(/\.js$/, '');
//   }

//   toRoute(filePath: string) {
//     return {
//       path: this.toPath(filePath),
//       $handler: {
//         src: filePath,
//         pick: ['default'],
//       },
//     };
//   }
// }
