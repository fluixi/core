import { createSignal, For, Show } from '@fluixi/core';

interface Todo { id: number; text: string; }

/** A small todo list — reactive array with For, empty-state with Show. */
export function TodoApp() {
  const [todos, setTodos] = createSignal<Todo[]>([]);
  const [text, setText] = createSignal('');
  let nextId = 1;

  const add = () => {
    const t = text().trim();
    if (!t) return;
    setTodos([...todos(), { id: nextId++, text: t }]);
    setText('');
  };

  const remove = (id: number) => setTodos(todos().filter((t) => t.id !== id));

  return (
    <div class="todo">
      <h1>Fluixi Todos</h1>
      <input class="new" value={text()} onInput={(e: any) => setText(e.target.value)} />
      <button class="add" onClick={add}>Add</button>

      {/* Control-flow props aren't auto-wrapped (unlike native attrs), so pass
          reactive accessors: a thunk for `when`, the signal itself for `each`. */}
      <Show when={() => todos().length > 0} fallback={<p class="empty">No todos yet</p>}>
        <ul class="list">
          <For each={todos}>
            {(t: Todo) => (
              <li class="item">
                <span class="text">{t.text}</span>
                <button class="rm" onClick={() => remove(t.id)}>x</button>
              </li>
            )}
          </For>
        </ul>
      </Show>

      <p class="count">{todos().length}</p>
    </div>
  );
}
