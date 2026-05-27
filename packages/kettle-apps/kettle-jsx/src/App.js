import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "@awc/kettlejs/jsx-runtime";
import { createSignal, createStore } from '@awc/reactive';
import './styles/main.css';
import { onMount } from '@awc/kettlejs';
export function App() {
    const [count, setCount] = createSignal(0);
    const [store, setStore] = createStore({ name: 'John' });
    function increment() {
        setCount(count() + 1);
        setStore('name', `Jane ${count()}`);
    }
    function decrement() {
        console.log('Decrementing count');
        setCount(count() - 1);
    }
    onMount(() => {
        console.log('component mounted');
    });
    return (_jsx(_Fragment, { children: _jsxs("div", { class: "app", children: [_jsxs("header", { children: [_jsx("h1", { children: "Welcome to KettleJS" }), _jsx("p", { children: "A reactive framework powered by signals" })] }), _jsx("main", { children: _jsxs("div", { class: "counter", children: [_jsx("h2", { children: "Counter Example" }), _jsxs("div", { class: "controls", children: [_jsx("button", { onClick: decrement, children: "-" }), _jsx("span", { class: "count", children: store.name }), _jsx("button", { onClick: increment, children: "+" })] }), _jsx("p", { class: "info", children: "Click the buttons to see reactive updates in action!" })] }) }), _jsx("footer", { children: _jsx("p", { children: "Built with KettleJS JSX" }) })] }) }));
}
export default App;
