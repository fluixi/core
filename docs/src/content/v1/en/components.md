# Components

A component is just a function that returns markup. There is no base class and no lifecycle of
re-renders — a component runs **once** to create its DOM, and reactivity keeps it up to date.

```tsx
function Greeting(props: { name: string }) {
  return <h1>Hello, {props.name}</h1>;
}

<Greeting name="Ada" />;
```

## Props are reactive

Because a component runs only once, read props **where you use them** so updates flow through —
don't destructure reactive props up front:

```tsx
function Hello(props: { name: string }) {
  return <p>{props.name}</p>;   // ✅ stays reactive
}
// const { name } = props;       // ✗ snapshots the value once
```

## Children

`props.children` holds whatever you nest inside a component:

```tsx
function Card(props: { children?: any }) {
  return <div class="card">{props.children}</div>;
}

<Card><p>Body</p></Card>;
```

Next: **[Control flow](/v1/en/control-flow)**.
