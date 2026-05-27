import { jsx as _jsx, jsxs as _jsxs } from "@awc/kettlejs/jsx-runtime";
import { createSignal } from '@awc/reactive/signal';
import './counter.css';
export function Counter({ initialCount = 0 }) {
    const [count, setCount] = createSignal(initialCount);
    const increment = () => setCount(count() + 1);
    const decrement = () => setCount(count() - 1);
    const reset = () => setCount(initialCount);
    return (_jsxs("div", { class: "counter", children: [_jsx("h2", { children: "Counter Component" }), _jsxs("div", { class: "counter", children: [_jsx("button", { onClick: decrement, children: "-" }), _jsx("span", { class: "count", children: count() }), _jsx("button", { onClick: increment, children: "+" })] }), _jsx("button", { onClick: reset, children: "Reset" })] }));
}
export default Counter;
