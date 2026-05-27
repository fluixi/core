import { Outlet, A, useLocation } from '@awc/kettlejs/router';
import { html } from '@awc/kettlejs';

export default function RootLayout() {
  // console.log('resolving layout')
  const location = useLocation();

  return (
    <>
      <div class="min-h-screen bg-gray-50 font-sans">
        <nav class="bg-white border-b px-4 py-3 mb-4">
          <div class="max-w-4xl mx-auto flex gap-4 items-center">
            <A
              href ='/'
              class = 'font-bold text-gray-800'
              children='Kettle CRUD' />
            {A({
              href: '/dashboard',
              class: 'text-blue-500 hover:underline',
              children: 'Dashboard',
            })}
            {A({
              href: '/about',
              class: 'text-blue-500 hover:underline',
              children: 'About',
            })}
            {A({
              href: '/settings',
              class: 'text-blue-500 hover:underline',
              children: 'Settings',
            })}
            {A({
              href: '/login',
              class: 'text-blue-500 hover:underline',
              children: 'Login',
            })}
            {A({
              href: '/register',
              class: 'text-blue-500 hover:underline',
              children: 'Register',
            })}
          </div>
        </nav>

        <main class="max-w-4xl mx-auto">
          <Outlet />
        </main>

        <footer class="max-w-4xl mx-auto mt-8 py-4 border-t text-sm text-gray-400 text-center">
          KettleJS Router Demo &mdash; Current path: {location.pathname}
        </footer>
      </div>
    </>
  )
  // return (
  //     html`
  //       <div class="min-h-screen bg-gray-50 font-sans">
  //         <nav class="bg-white border-b px-4 py-3 mb-4">
  //           <div class="max-w-4xl mx-auto flex gap-4 items-center">
  //             ${A({
  //               href: '/',
  //               class: 'font-bold text-gray-800',
  //               children: 'Kettle CRUD',
  //             })}
  //             ${A({
  //               href: '/dashboard',
  //               class: 'text-blue-500 hover:underline',
  //               children: 'Dashboard',
  //             })}
  //             ${A({
  //               href: '/about',
  //               class: 'text-blue-500 hover:underline',
  //               children: 'About',
  //             })}
  //             ${A({
  //               href: '/settings',
  //               class: 'text-blue-500 hover:underline',
  //               children: 'Settings',
  //             })}
  //             ${A({
  //               href: '/login',
  //               class: 'text-blue-500 hover:underline',
  //               children: 'Login',
  //             })}
  //             ${A({
  //               href: '/register',
  //               class: 'text-blue-500 hover:underline',
  //               children: 'Register',
  //             })}
  //           </div>
  //         </nav>

  //         <main class="max-w-4xl mx-auto">
  //           ${Outlet()}
  //         </main>

  //         <footer class="max-w-4xl mx-auto mt-8 py-4 border-t text-sm text-gray-400 text-center">
  //           KettleJS Router Demo &mdash; Current path: ${location.pathname}
  //         </footer>
  //       </div>
  //     `
  // );
}
