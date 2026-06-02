---
sidebar_position: 2
---

# Resources

Resources in KettleJS provide a powerful way to manage asynchronous data fetching with automatic dependency tracking, loading states, error handling, and cache management.

## Basic Usage

### Creating a Resource

```typescript
import { createResource } from '@fluixi/kettlejs/resources';
import { createSignal } from '@fluixi/reactive/signal';

interface User {
  id: number;
  name: string;
  email: string;
}

async function fetchUser(id: string): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  if (!response.ok) throw new Error('Failed to fetch user');
  return response.json();
}

const [userId, setUserId] = createSignal('1');

const [user, { refetch, mutate }] = createResource(
  userId,        // Source signal
  fetchUser      // Fetcher function
);

// Access resource data
console.log(user());         // The fetched data
console.log(user.loading);   // Loading state
console.log(user.error);     // Error if any
```

## API Reference

### createResource()

```typescript
function createResource<S, T>(
  source: Accessor<S> | S,
  fetcher: (source: S, info: FetcherInfo<T>) => Promise<T> | T,
  options?: ResourceOptions<T>
): [
  ResourceReturn<T>,
  {
    refetch: () => void;
    mutate: (value: T | ((prev: T | undefined) => T)) => void;
  }
]
```

**Parameters:**
- `source` - Source signal or value that triggers refetch
- `fetcher` - Async function that fetches data
- `options` - Configuration options

**Returns:** Tuple of `[resource, actions]`

### ResourceReturn Type

```typescript
interface ResourceReturn<T> {
  (): T | undefined;
  loading: boolean;
  error: Error | undefined;
  state: 'pending' | 'ready' | 'refreshing' | 'errored';
  latest: T | undefined;
}
```

**Properties:**
- `()` - Call as function to get current data
- `loading` - True when fetching
- `error` - Error object if fetch failed
- `state` - Current resource state
- `latest` - Latest successful data (persists during refetch)

### ResourceOptions

```typescript
interface ResourceOptions<T> {
  initialValue?: T;
  onError?: (error: Error) => void;
  onSuccess?: (data: T) => void;
  deferStream?: boolean;
  name?: string;
}
```

**Options:**
- `initialValue` - Initial data before first fetch
- `onError` - Callback when fetch fails
- `onSuccess` - Callback when fetch succeeds
- `deferStream` - Defer fetch on server (SSR)
- `name` - Debug name for the resource

## Resource States

Resources go through different states during their lifecycle:

```typescript
const [data] = createResource(source, fetcher);

// pending - Initial state or refetching
data.state === 'pending'

// ready - Data successfully loaded
data.state === 'ready'

// refreshing - Refetching with existing data
data.state === 'refreshing'

// errored - Fetch failed
data.state === 'errored'
```

## Loading States

### Basic Loading

```typescript
import { html } from 'lit';
import { Show } from '@fluixi/kettlejs/control-flow';

const [data] = createResource(() => userId(), fetchUser);

html`
  <div>
    ${Show({
      when: () => data.loading,
      children: html`<div class="spinner">Loading...</div>`
    })}
    
    ${Show({
      when: () => data.error,
      children: html`<div class="error">${data.error?.message}</div>`
    })}
    
    ${Show({
      when: () => data(),
      children: html`
        <div class="user-profile">
          <h2>${data()!.name}</h2>
          <p>${data()!.email}</p>
        </div>
      `
    })}
  </div>
`;
```

### Using Latest Data

The `latest` property keeps the last successful data during refetch:

```typescript
const [user, { refetch }] = createResource(userId, fetchUser);

html`
  <div>
    ${user.latest ? html`
      <div class="user-card ${user.loading ? 'refreshing' : ''}">
        <h3>${user.latest.name}</h3>
        <p>${user.latest.email}</p>
        ${user.loading ? html`<span>Updating...</span>` : ''}
      </div>
    ` : html`
      <div>Loading initial data...</div>
    `}
    
    <button @click=${refetch}>Refresh</button>
  </div>
`;
```

## Refetching

### Manual Refetch

```typescript
const [user, { refetch }] = createResource(userId, fetchUser);

// Refetch with same source
html`<button @click=${refetch}>Refresh User</button>`;
```

### Automatic Refetch

Resources automatically refetch when the source changes:

```typescript
const [userId, setUserId] = createSignal('1');
const [user] = createResource(userId, fetchUser);

// Changes userId, automatically triggers refetch
html`
  <button @click=${() => setUserId('2')}>
    Load User 2
  </button>
`;
```

### Conditional Refetch

Use `undefined` or `null` source to prevent fetching:

```typescript
const [shouldFetch, setShouldFetch] = createSignal(false);
const [id, setId] = createSignal('1');

const [data] = createResource(
  () => shouldFetch() ? id() : undefined,
  fetchData
);

html`
  <button @click=${() => setShouldFetch(true)}>
    Start Fetching
  </button>
`;
```

## Mutations

### Optimistic Updates

Update data immediately before server confirms:

```typescript
const [user, { mutate, refetch }] = createResource(userId, fetchUser);

async function updateName(newName: string) {
  // Optimistic update
  mutate(prev => prev ? { ...prev, name: newName } : prev);
  
  try {
    await fetch(`/api/users/${userId()}`, {
      method: 'PATCH',
      body: JSON.stringify({ name: newName })
    });
  } catch (error) {
    // Revert on error
    refetch();
  }
}

html`
  <input 
    .value=${user()?.name || ''}
    @change=${(e: Event) => updateName((e.target as HTMLInputElement).value)}
  />
`;
```

### Direct Mutation

```typescript
const [data, { mutate }] = createResource(source, fetcher);

// Set new value
mutate({ id: 1, name: 'Updated' });

// Update based on previous
mutate(prev => ({ ...prev, updated: true }));
```

## Error Handling

### With Callbacks

```typescript
const [data] = createResource(
  userId,
  fetchUser,
  {
    onError: (error) => {
      console.error('Failed to load user:', error);
      showNotification('Failed to load user data');
    },
    onSuccess: (user) => {
      console.log('User loaded:', user.name);
    }
  }
);
```

### With Templates

```typescript
html`
  <div>
    ${Show({
      when: () => data.error,
      children: html`
        <div class="error-card">
          <h3>Error Loading Data</h3>
          <p>${data.error?.message}</p>
          <button @click=${refetch}>Try Again</button>
        </div>
      `
    })}
  </div>
`;
```

### Error Recovery

```typescript
const [data, { refetch }] = createResource(userId, fetchUser);

createEffect(() => {
  if (data.error) {
    // Automatic retry after 5 seconds
    setTimeout(() => {
      console.log('Retrying...');
      refetch();
    }, 5000);
  }
});
```

## Multiple Resources

### Parallel Fetching

```typescript
const [userId] = createSignal('1');

const [user] = createResource(
  userId,
  (id) => fetch(`/api/users/${id}`).then(r => r.json())
);

const [posts] = createResource(
  userId,
  (id) => fetch(`/api/users/${id}/posts`).then(r => r.json())
);

const [comments] = createResource(
  userId,
  (id) => fetch(`/api/users/${id}/comments`).then(r => r.json())
);

// All fetch in parallel when userId changes
html`
  <div>
    ${user.loading || posts.loading || comments.loading
      ? html`<div>Loading...</div>`
      : html`
        <div>
          <h2>${user()?.name}</h2>
          <p>${posts()?.length} posts</p>
          <p>${comments()?.length} comments</p>
        </div>
      `
    }
  </div>
`;
```

### Sequential Fetching

```typescript
const [userId] = createSignal('1');

const [user] = createResource(userId, fetchUser);

const [posts] = createResource(
  () => user() ? user()!.id : undefined,
  (userId) => fetchUserPosts(userId)
);

// Posts fetch only after user loads
```

### Dependent Resources

```typescript
const [searchQuery, setSearchQuery] = createSignal('');

const [searchResults] = createResource(
  searchQuery,
  async (query) => {
    if (!query) return [];
    const response = await fetch(`/api/search?q=${query}`);
    return response.json();
  }
);

const [selectedId, setSelectedId] = createSignal<string | null>(null);

const [selectedItem] = createResource(
  () => selectedId(),
  async (id) => {
    if (!id) return null;
    const response = await fetch(`/api/items/${id}`);
    return response.json();
  }
);
```

## Advanced Patterns

### Pagination

```typescript
interface PaginatedResponse<T> {
  items: T[];
  page: number;
  totalPages: number;
  total: number;
}

const [page, setPage] = createSignal(1);
const [pageSize] = createSignal(20);

const [data] = createResource(
  () => ({ page: page(), pageSize: pageSize() }),
  async ({ page, pageSize }) => {
    const response = await fetch(
      `/api/items?page=${page}&size=${pageSize}`
    );
    return response.json() as Promise<PaginatedResponse<Item>>;
  }
);

html`
  <div>
    ${Show({
      when: () => data(),
      children: () => html`
        <div>
          ${For({
            each: () => data()!.items,
            children: (item) => html`<div>${item.name}</div>`
          })}
          
          <div class="pagination">
            <button 
              @click=${() => setPage(p => Math.max(1, p - 1))}
              ?disabled=${page() === 1}
            >
              Previous
            </button>
            <span>Page ${page()} of ${data()!.totalPages}</span>
            <button 
              @click=${() => setPage(p => p + 1)}
              ?disabled=${page() === data()!.totalPages}
            >
              Next
            </button>
          </div>
        </div>
      `
    })}
  </div>
`;
```

### Infinite Scroll

```typescript
const [items, setItems] = createSignal<Item[]>([]);
const [page, setPage] = createSignal(1);
const [hasMore, setHasMore] = createSignal(true);

const [newItems] = createResource(
  page,
  async (page) => {
    const response = await fetch(`/api/items?page=${page}`);
    const data = await response.json();
    return data;
  }
);

createEffect(() => {
  if (newItems() && !newItems.loading) {
    setItems(prev => [...prev, ...newItems()!.items]);
    setHasMore(newItems()!.hasMore);
  }
});

function loadMore() {
  if (!newItems.loading && hasMore()) {
    setPage(p => p + 1);
  }
}

html`
  <div>
    ${For({
      each: items,
      children: (item) => html`<div>${item.name}</div>`
    })}
    
    ${Show({
      when: hasMore,
      children: html`
        <button @click=${loadMore} ?disabled=${newItems.loading}>
          ${newItems.loading ? 'Loading...' : 'Load More'}
        </button>
      `
    })}
  </div>
`;
```

### Search with Debounce

```typescript
import { debounce } from '@fluixi/kettlejs/utils';

const [searchInput, setSearchInput] = createSignal('');
const [debouncedSearch, setDebouncedSearch] = createSignal('');

const debouncedUpdate = debounce((value: string) => {
  setDebouncedSearch(value);
}, 300);

createEffect(() => {
  debouncedUpdate(searchInput());
});

const [results] = createResource(
  debouncedSearch,
  async (query) => {
    if (!query) return [];
    const response = await fetch(`/api/search?q=${query}`);
    return response.json();
  }
);

html`
  <div>
    <input 
      type="search"
      .value=${searchInput()}
      @input=${(e: Event) => setSearchInput((e.target as HTMLInputElement).value)}
      placeholder="Search..."
    />
    
    ${Show({
      when: () => results.loading,
      children: html`<div>Searching...</div>`
    })}
    
    ${Show({
      when: () => results(),
      children: () => html`
        <div class="results">
          Found ${results()!.length} results
          ${For({
            each: results,
            children: (item) => html`<div>${item.name}</div>`
          })}
        </div>
      `
    })}
  </div>
`;
```

### Caching Strategy

```typescript
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function cachedFetch<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const cached = cache.get(key);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  const data = await fetcher();
  cache.set(key, { data, timestamp: Date.now() });
  return data;
}

const [userId] = createSignal('1');

const [user] = createResource(
  userId,
  (id) => cachedFetch(`user-${id}`, () => fetchUser(id))
);
```

### Polling

```typescript
const [autoRefresh, setAutoRefresh] = createSignal(true);
const [data, { refetch }] = createResource(source, fetcher);

createEffect(() => {
  if (autoRefresh()) {
    const interval = setInterval(() => {
      refetch();
    }, 5000); // Poll every 5 seconds
    
    return () => clearInterval(interval);
  }
});

html`
  <div>
    <label>
      <input 
        type="checkbox"
        .checked=${autoRefresh()}
        @change=${(e: Event) => setAutoRefresh((e.target as HTMLInputElement).checked)}
      />
      Auto-refresh
    </label>
    <div>Last updated: ${data.latest?.updatedAt}</div>
  </div>
`;
```

## SSR and Hydration

### Server-Side Rendering

```typescript
import { renderToString } from '@fluixi/kettlejs/core';
import { createResource } from '@fluixi/kettlejs/resources';

// Server
const [data] = createResource(
  () => userId,
  fetchUser,
  { deferStream: true }
);

const html = await renderToString(template);
```

### Initial Data

```typescript
import { getHydrationData } from '@fluixi/kettlejs/core';

const initialUser = getHydrationData<User>('user');

const [user] = createResource(
  userId,
  fetchUser,
  { initialValue: initialUser }
);
```

## Best Practices

### 1. Use Source Signals

Always use signals as sources for automatic refetching:

```typescript
// ✅ Good - refetches when userId changes
const [userId, setUserId] = createSignal('1');
const [user] = createResource(userId, fetchUser);

// ❌ Avoid - won't refetch automatically
const userId = '1';
const [user] = createResource(() => userId, fetchUser);
```

### 2. Handle Loading States

Always show loading feedback:

```typescript
// ✅ Good
${Show({
  when: () => data.loading,
  children: html`<spinner></spinner>`
})}

// ❌ Avoid - no loading feedback
${data() ? html`<div>${data()}</div>` : ''}
```

### 3. Handle Errors

Provide error recovery:

```typescript
// ✅ Good
${Show({
  when: () => data.error,
  children: html`
    <div>
      Error: ${data.error?.message}
      <button @click=${refetch}>Retry</button>
    </div>
  `
})}
```

### 4. Use Latest for Refresh UX

Show stale data during refresh:

```typescript
// ✅ Good - shows old data while refreshing
${data.latest ? html`
  <div class="${data.loading ? 'refreshing' : ''}">
    ${data.latest.content}
  </div>
` : html`<loading></loading>`}
```

### 5. Clean Up Resources

Resources automatically clean up, but be mindful of intervals:

```typescript
// ✅ Good - cleanup returned
createEffect(() => {
  if (autoRefresh()) {
    const interval = setInterval(refetch, 5000);
    return () => clearInterval(interval);
  }
});
```

## Performance Tips

1. **Use Latest**: Keep showing old data during refetch
2. **Debounce Sources**: Prevent excessive fetching
3. **Cache Data**: Implement caching for frequently accessed data
4. **Conditional Fetching**: Use `undefined` source to prevent unnecessary fetches
5. **Parallel Resources**: Fetch independent data in parallel

## See Also

- [Core Concepts](../core-concepts.md) - Understanding reactivity
- [Control Flow](./control-flow.md) - Show, For components
- [API Reference](../api/resources.md) - Complete API docs
- [Examples](../examples/data-fetching.md) - Real-world examples

---

**Next:** [Routing →](./routing.md)