---
"@fluixi/start": patch
---

`@fluixi/start` now replays clicks, input and key presses that occur on a server-rendered page before hydration by inserting an event-capture script at the top of `<head>`, and you can disable this with the new `eventReplay` option (default true).
