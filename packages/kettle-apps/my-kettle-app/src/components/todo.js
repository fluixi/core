import { html, onMount, useCallback, useEffect, useMemo, useReducer, useContext, } from '@awc/kettlejs';
import { ThemeContext } from '../context';
import { TaskComponent } from './task';
const todoReducer = (state, action) => {
    switch (action.type) {
        case 'add':
            // ❌ WRONG: state.push(action.text); return state;
            // ✅ CORRECT: Return a NEW array
            return [...state, action.text];
        case 'toggle':
            return state.map((todo) => todo.type === action.type ? { ...todo, done: !todo.done } : todo);
        default:
            return state;
    }
};
export const TodoApp = () => {
    console.log('todo component');
    const [todos, dispatch] = useReducer(todoReducer, []);
    const { theme, toggleTheme } = useContext(ThemeContext);
    // Memoize the count
    const count = useMemo(() => todos().length);
    // Stable callback for the click handler
    const handleAdd = useCallback(() => {
        dispatch({ type: 'add', text: 'New Task' });
    });
    onMount(() => {
        console.log('mount elemet', toggleTheme);
    });
    useEffect(() => {
        console.log('Logged only on mount and when count changes:', count());
    });
    return html `
    <div class="todo-wrapper">
      <p>Tasks: ${count}</p>
      <button @click=${toggleTheme}>${theme.text}</button>
      <button @click=${handleAdd}>Add Task</button>
    </div>
    ${TaskComponent()}
  `;
};
