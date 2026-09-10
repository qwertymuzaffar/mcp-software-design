---
'mcp-software-design': patch
---

`check_smells` no longer reports declarations as duplicated logic: members of `interface`, `type` and `enum` bodies, typed member and parameter lines, fields initialized with a literal or declared with a modifier such as Angular signal inputs, and callback openers whose only argument is the callback (`useEffect(() => {`). Repeated statements, and calls that pass other arguments before a callback, are still reported.
