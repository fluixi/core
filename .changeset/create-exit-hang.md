---
"@fluixi/create": patch
---

Fix `create-fluixi` hanging after scaffolding in interactive mode.

The app-mode select menu calls `emitKeypressEvents(stdin)`, which resumes stdin to
read keypresses. After a choice was made the keypress listener was removed and raw
mode reset, but stdin was left resumed — a live handle that keeps the event loop
alive, so the CLI printed "Created …" and then never exited. Pause stdin when the
menu finishes so the process exits cleanly. (Non-interactive `--spa`/`--ssr` runs
were unaffected — they never open the keypress menu.)
