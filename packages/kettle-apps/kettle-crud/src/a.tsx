import { createSignal } from '@awc/reactive/signal';
import './styles/main.css';
import { DashboardPage, LitDashboardPage } from './pages/dashboard/dashboard';
import TodoList from './components/todolist/todolist';
import { ThemeProvider } from './context';

export function App() {
  const [count, setCount] = createSignal(0);
  return (
    <>
      <div class="counter">
        <h2>Counter Example</h2>
        <div class="controls">
          <button onClick={() => setCount(count() - 1)}>-</button>
          <span class="count">{count()}</span>
          <button onClick={() => setCount(count() + 1)}>+</button>
        </div>
      </div>
      <ThemeProvider>
        <DashboardPage />
        <TodoList />
        {LitDashboardPage()}
      </ThemeProvider>
    </>
  );
}

export default App;
// <div class="app">
//   <header>
//     <h1>Welcome to KettleJS</h1>
//     <p>A reactive framework powered by signals</p>
//   </header>

//   <main>
//     {/*{ctx.primaryColor}*/}
//     <DashboardPage />
//     <TodoList />
//     <div class="counter">
//       <h2>Counter Example</h2>
//       <div class="controls">
//         <button onClick={() => setCount(count() - 1)}>-</button>
//         <span class="count">{count()}</span>
//         <button onClick={() => setCount(count() + 1)}>+</button>
//       </div>
//     </div>
//   </main>

//   <footer>
//     <p>Built with KettleJS JSX</p>
//   </footer>
// </div>
