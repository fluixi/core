---
"@fluixi/devtools": minor
---

A snapshot says what the graph is. By the time a panel polls, the propagation is over and everything reads as settled.

- `createTimeline` now shows what happened, grouped into commits. A write with nothing running came from a handler, and opens a commit. Filter, and a pause button.
- Diffs are computed at the write, both sides in hand. An append reports the one row added, not every row after it. Each entry carries JSON for copying.
- DOM targets now show the element and attribute a value writes, with the line, described rather than referenced so a removed subtree is not held alive.
- `createDetailPanel` now shows one commit in full, dragged and resized.
- `graphToJson` / `exportGraph` now exports the whole graph as JSON, referencing nodes by name.
- The graph view now draws cards for bindings and setters behind a toggle, and its zoom ceiling now follows the size of the graph.
