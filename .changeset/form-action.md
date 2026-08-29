---
"@fluixi/core": minor
---

Add a `<Form action={...}>` component (`@fluixi/core/router-next`) for form-driven
actions. On submit it builds the form's fields into a plain object and calls the action
(typically wrapping a `"use server"` function), preventing a full navigation and tracking
submission state via `useSubmission`:

```tsx
<Form action={save}>
  <input name="title" />
  <button>Save</button>
</Form>
```

The markup carries `method="post"` + `action={action.url}` so it's progressive-
enhancement-ready. (Multipart/file uploads and no-JS submission are follow-ups.)
