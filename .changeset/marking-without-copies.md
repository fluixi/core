---
"@fluixi/reactive": patch
---

Effect runs now drain pending without allocating an array and dirty marking walks observer sets without copying them.
