---
"@fluixi/start": patch
---

Link the SSR-rendered CSS in dev, so a page stops flashing unstyled.

The dev server sent a fully rendered page with no stylesheets at all — the styles
arrived with the client bundle, so every load painted unstyled first. The build had
no such gap, which is why this only ever showed up in the environment you look at
most.

It now walks the SSR module graph from the server entry, collects the styles the
render pulled in, and links them with `?direct` (dev serves a `.css` URL as a JS
module otherwise).
