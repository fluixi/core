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

Comme un composant ne s'exécute qu'une fois, une prop est une lecture vivante plutôt qu'une
valeur transmise à l'appel. Lisez-les **là où vous les utilisez** et les mises à jour circulent :

```tsx
function Hello(props: { name: string }) {
  return <p>{props.name}</p>;   // reste réactif
}
// const { name } = props;       // lit une seule fois — voir plus bas
```

La déstructuration recopie la valeur à cet instant : `name` cesse alors de suivre la prop. C'est
du JavaScript ordinaire, pas une règle inventée par Fluixi.

### Déstructurer quand même

Activez `propsDestructure` et le compilateur retransforme les liaisons en lectures, ce qui rend
la syntaxe simple utilisable :

```tsx
// vite.config.ts
fluixi({ propsDestructure: true })
```

```tsx
function Hello({ name, tone = 'calm' }) {
  return <p data-tone={tone}>{name}</p>;   // les deux restent réactifs
}
```

Le compilateur écrit `props.name` à chaque usage : la liaison garde son type, donc rien d'autre
ne change dans la fonction. Alias, valeurs par défaut et motifs imbriqués fonctionnent, et une
valeur par défaut ne s'applique toujours qu'à `undefined`, exactement comme en JavaScript.

`...rest` devient l'appel à `splitProps` que vous auriez écrit :

```tsx
function Field({ label, ...rest }) {
  return <input aria-label={label} {...rest} />;
}
```

`splitProps` transmet les props restantes sous forme de getters au lieu de les lire, donc un
signal derrière une prop transmise atteint toujours l'élément.

Là où le compilateur ne peut pas prouver que la réécriture est sûre, il laisse votre code tel
quel et explique pourquoi : une liaison réassignée, une clé calculée, une valeur par défaut
qu'il faudrait réévaluer à chaque lecture. Celles-là gardent le sens JavaScript qu'elles ont
toujours eu.

Un point de vigilance : cela dépend de **la façon dont le code est compilé**, pas du code
lui-même. Si vous publiez un paquet qui livre ses sources pour que d'autres les compilent,
écrivez les props explicitement — un consommateur sans l'option les lirait une seule fois. La
sortie compilée, elle, convient dans tous les cas.

L'[exemple props](https://github.com/fluixi/core/tree/main/examples/props) montre le tout en
fonctionnement ; désactiver l'option dans sa configuration est le moyen le plus rapide de voir
la différence.

## Les enfants

`props.children` contient ce que vous imbriquez dans un composant :

```tsx
function Card(props: { children?: any }) {
  return <div class="card">{props.children}</div>;
}

<Card><p>Contenu</p></Card>;
```

Suivant : **[Le flux de contrôle](/v1/fr/control-flow)**.
