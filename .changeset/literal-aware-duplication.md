---
'mcp-software-design': patch
---

`check_smells` no longer reports rows of multi-line object and array literals, or calls and throws whose arguments were all string literals, as duplicated logic. Lookup tables, message lines and state names used to account for a third of duplication findings on real code.
