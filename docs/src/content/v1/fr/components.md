# Les composants

Un composant n'est qu'une fonction qui renvoie du balisage. Pas de classe de base, pas de cycle de
réaffichage — un composant s'exécute **une seule fois** pour créer son DOM, et la réactivité le
maintient à jour.

```tsx
function Greeting(props: { name: string }) {
  return <h1>Bonjour, {props.name}</h1>;
}

<Greeting name="Ada" />;
```

## Les props sont réactives

Comme un composant ne s'exécute qu'une fois, lisez les props **là où vous les utilisez** pour que
les mises à jour circulent — ne déstructurez pas les props réactives en amont :

```tsx
function Hello(props: { name: string }) {
  return <p>{props.name}</p>;   // ✅ reste réactif
}
// const { name } = props;       // ✗ fige la valeur une fois
```

## Les enfants

`props.children` contient ce que vous imbriquez dans un composant :

```tsx
function Card(props: { children?: any }) {
  return <div class="card">{props.children}</div>;
}

<Card><p>Contenu</p></Card>;
```

Suivant : **[Le flux de contrôle](/v1/fr/control-flow)**.
