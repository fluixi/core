---
"fluixi": minor
---

Add `useLinkNavigation()` — client-side navigation for anchors the app didn't
author.

`<Link>` covers links written as JSX. It can't cover the ones that arrive as
markup: markdown, a CMS payload, anything dropped in through `innerHTML`. Those
are plain anchors with nothing to bind to, so every one of them reloaded the
document. One delegated handler on the container fixes the lot:

```tsx
const onClick = useLinkNavigation();
<article onClick={onClick} innerHTML={doc.html} />
```

The anchors stay anchors — middle-click, open in new tab, copy link address and
crawlers all keep working, because only a plain left-click is taken over.
Modified clicks, `target`, `download`, `rel="external"`, `mailto:`/`tel:`,
another origin and an in-page hash are left to the browser; `shouldNavigate`
opts out a section that must load as a document.
