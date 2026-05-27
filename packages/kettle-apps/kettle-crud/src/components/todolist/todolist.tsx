import { createSignal, createStore, unwrap } from '@awc/reactive/rx';
// import { createReactiveJSX,} from '@awc/kettlejs';
import './todolist.css';
import { useContext } from '@awc/kettlejs';
import { ThemeContext } from '../../context';

// const rt = createReactiveJSX({ createSignal });
function TodoList() {
  const [todos, setTodos] = createStore<string[]>(['Task 1', 'Task 2']);
  const [item, setItems] = createStore({ user: 'ibou' });
  const [input, setInput] = createSignal('');
  const [count, setCount] = createSignal(0);
  const { theme } = useContext(ThemeContext);

  const addTodo = () => {
    setCount(count() + 1);
    setItems('user', `ibou ${count() + 1}`);
    if (input().trim()) {
      // Use array push or spread with proper typing
      const currentTodos = [...todos];
      currentTodos.push(input());
      setTodos(unwrap(currentTodos));
      setInput('');
    }
  };

  const deleteTodo = (index: number) => {
    const currentTodos = [...todos];
    currentTodos.splice(index, 1);
    setTodos(unwrap(currentTodos));
    console.log('remove todo', todos);
  };

  return (
    <div class="todolist">
      <h2>
        Todo List {count} {item.user} {theme.text}
      </h2>
      <div class="input-group">
        <input
          type="text"
          value={input}
          onInput={(e) => setInput((e.target as HTMLInputElement).value)}
          placeholder="Add a todo..."
        />
        <button onClick={addTodo}>Add</button>
      </div>
      <ul>
        {todos.map((todo, index) => (
          <li key={index}>
            <span>{todo}</span>
            <button onClick={() => deleteTodo(index)}>Delete</button>
          </li>
        ))}
      </ul>
      <p>Total todos: {todos.length}</p>
    </div>
  );
}

export default TodoList;
