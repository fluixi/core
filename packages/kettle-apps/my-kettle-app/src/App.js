// App.ts
import { createSignal, createStore, $each, onMount, useEffect, } from '@awc/kettlejs';
import { TodoApp } from './components/todo';
import { ThemeProvider } from './context.js';
import { html } from 'lit';
export const App = () => {
    console.log('app component');
    const [store, setStore] = createStore({ name: 'World' });
    const [items, setItem] = createStore([{ name: 'World' }]);
    const [count, setCount] = createSignal(0);
    function increment() {
        setCount(count() + 1);
        setItem([...items, { name: `${count()}` }]);
        setStore('name', `Counter triggered ${count()}`);
    }
    useEffect(() => {
        console.log('Count is now:', count());
        // Optional cleanup
        return () => console.log('Cleaning up effect...');
    });
    // console.log('items', store);
    // console.log('items', store.$('name'));
    // Use reactive() directive to make signal values reactive in the template
    // This ensures the DOM updates when signals change
    // return (
    //   <div class="app">
    //     <h1>Welcome to KettleJS</h1>
    //     <p>A reactive framework for lit-html</p>
    //     <div class="counter">
    //       <p>
    //         Count: ${count} ${store.name} ${items.length}
    //       </p>
    //       <button onClick={increment}>Increment</button>
    //       <ul>
    //         {items.map((i) => (
    //           <li>{i.name}</li>
    //         ))}
    //       </ul>
    //     </div>
    //   </div>
    // );
    onMount(() => {
        console.log('Mounted');
    });
    return html `
    <div class="app">
      <h1>Welcome to KettleJS</h1>
      <p>A reactive framework for lit-html</p>
      ${ThemeProvider({
        children: () => html `
          ${TodoApp()}
          <div class="counter">
            <p>Count: ${store.name}</p>
            <button @click=${increment}>Increment</button>
            <ul>
              ${$each()((() => items), (item) => item.name, (item) => html `<li>${item.name}</li>`)}
            </ul>
          </div>
        `,
    })}
    </div>
  `;
};
// export const App = () => {
// };
export default App;
