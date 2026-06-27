# Server functions

Mark a function `"use server"` and its body runs **only on the server**. The compiler strips it
from the client bundle and replaces the call with a typed RPC — so secrets and database access
never reach the browser.

```ts
async function getUser(id: string) {
  "use server";
  return db.users.find(id); // runs on the server
}

// call it anywhere like a normal async function:
const user = await getUser("42"); // POSTs to /_server under the hood
```

## Request context

Inside a server function you can reach the current request — headers, cookies, the URL:

```ts
import { getRequestEvent } from '@fluixi/server';

async function whoAmI() {
  "use server";
  const event = getRequestEvent();
  return event?.request.headers.get('authorization');
}
```

## Form actions

`@fluixi/forms` turns a server function into a progressive-enhancement `<form action>`, so it works
before JavaScript loads.

Next: **[API routes](/v1/en/api-routes)**.
