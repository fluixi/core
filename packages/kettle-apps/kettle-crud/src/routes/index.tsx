import { useRouteData, A, useAction, createAsync } from '@awc/kettlejs/router';
import { getUsers, deleteUser } from '../api';
import { $show, For, html, Show } from '@awc/kettlejs';

// Route Data Loader
export const routeData = () => {
  return getUsers();
};

export default function UserList() {
  const users = useRouteData<typeof getUsers>();
  const deleteAction = useAction(deleteUser);

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure?')) {
      await deleteAction(id);
    }
  };

  return html`
    <div>
      ${Show({
        when: users,
        children: (u) => {
          return html`${u.map(
            (usr) => html`
              <div>${usr.name}</div>
              ${A({
                children: html`<div>Href element</div>`,
                href: `/${usr.id}`,
                class: 'a',
              })}
            `
          )}`;
        },
        fallback: html`<p>Loading users list...</p>`,
      })}
    </div>
  `;
}
// export default function UserList() {
//   const users = useRouteData<typeof getUsers>();
//   const deleteAction = useAction(deleteUser);

//   const handleDelete = async (id: string) => {
//     if (confirm('Are you sure?')) {
//       await deleteAction(id);
//     }
//   };

//   return html`
//     <div class="p-4">
//       <div class="flex justify-between items-center mb-6">
//         <h1 class="text-2xl font-bold">Users</h1>
//         <!-- Using A component for client-side navigation -->
//         <${A} href="/new" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
//           Add User
//         <//>
//       </div>

//       <div class="grid gap-4">
//         <${Show} when=${() => users()} fallback=${html`<p>Loading users...</p>`}>
//           <${For} each=${() => users()}>
//             ${(user) => html`
//               <div class="border p-4 rounded shadow flex justify-between items-center">
//                 <div>
//                   <h3 class="font-bold text-lg">${user.name}</h3>
//                   <p class="text-gray-600">${user.email}</p>
//                   <span class="text-sm bg-gray-200 px-2 py-1 rounded">${user.role}</span>
//                 </div>
//                 <div class="flex gap-2">
//                   <${A} href=${`/users/${user.id}`} class="text-blue-500 hover:underline">
//                     Edit
//                   <//>
//                   <button
//                     @click=${() => handleDelete(user.id)}
//                     class="text-red-500 hover:underline"
//                   >
//                     Delete
//                   </button>
//                 </div>
//               </div>
//             `}
//           <//>
//         <//>
//       </div>
//     </div>
//   `;
// }
