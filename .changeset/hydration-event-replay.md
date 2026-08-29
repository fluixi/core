---
"@fluixi/server": minor
"@fluixi/core": patch
---

Add hydration event-replay. The server emits a small capture script (`eventCaptureScript()`, included in `createHtmlDocument` by default; toggle with `eventReplay: false`) that records discrete events (click/input/change/submit/keydown) fired before hydration into `window.__FX_REPLAY__`. After `domHydrate()`, `startClient` replays them on their original targets (still live, since hydration reuses the server DOM) so the now-wired delegated handlers fire — early clicks/inputs aren't lost during the hydration window.
