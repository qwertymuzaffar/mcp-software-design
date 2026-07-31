# mcp-software-design

An [MCP](https://modelcontextprotocol.io) server that teaches and helps apply
**software-design guidance** — the SOLID principles, the OOP pillars, DRY /
KISS / YAGNI / meaningful naming, and the 23 Gang-of-Four design patterns —
plus pattern
scaffolding and heuristic code-smell detection.

It's the companion to
[`mcp-udacity-commit`](../mcp-udacity-commit): same stack (TypeScript, the MCP
SDK, stdio transport), same shape (pure logic modules + thin server wiring).

## Why this exists — and its one honest caveat

The commit server can *lint*: "subject ≤ 50 chars" is objectively checkable.
**Design principles and patterns are not like that** — "does this violate
SRP?" or "should this be a Factory?" are judgment calls, not lint rules.

So this server does **not** pretend to grade your architecture pass/fail.
Instead it does the parts that are genuinely reliable, and hands the judgment
to the model:

| Capability | Primitive | What it gives you |
|---|---|---|
| **Reference** | resources + `explain_concept` | Authoritative, consistent definitions so the model cites the same thing every time. |
| **Scaffolding** | `scaffold_pattern` | A language-agnostic skeleton of a pattern's participants. |
| **Smell heuristics** | `check_smells` | A few genuinely-checkable proxies (long method, deep nesting, …) — **hints, never verdicts**. |
| **Explain / apply** | `review_design`, `apply_pattern` prompts | Prime the model to review or refactor, grounded in the tools + resources above. |

Design analysis is a judgment call, so the "explain/apply helper" is exposed
as MCP **prompts** (which drive the client's model) rather than server code
pretending to understand your snippet.

## Tools

- **`list_catalog`** `{ kind? }` — list concepts, optionally filtered
  (`principle` | `solid` | `oop` | `pattern` | `creational` | `structural` |
  `behavioral`). `solid` / `oop` narrow to the SOLID five / the four OOP pillars.
- **`explain_concept`** `{ name }` — full guidance for one principle or
  pattern (intent, when-to-use, trade-offs, participants). Accepts a slug,
  name, or alias (`"SRP"`, `"open-closed"`, `"pubsub"`).
- **`scaffold_pattern`** `{ pattern, names? }` — pseudo-code skeleton for a GoF
  pattern; `names` optionally renames roles to your domain
  (`{ "Product": "Notification" }`).
- **`check_smells`** `{ code, …thresholds? }` — heuristic scan for long
  method, large class, long parameter list, deep nesting, duplication, and
  large file. Each finding names the principle it hints at plus a suggested
  refactor. All thresholds are overridable per call.

## Resources

- **`design://principles`** — SOLID, OOP pillars, DRY, KISS, YAGNI, meaningful
  naming, and more.
- **`design://patterns`** — the 23 GoF patterns, grouped creational /
  structural / behavioral.
- **`design://smells`** — what `check_smells` detects, its thresholds, and its
  caveats.

## Prompts

- **`review_design`** `{ code, focus? }` — review a snippet against the
  principles/patterns, grounded in `check_smells` + the resources.
- **`apply_pattern`** `{ pattern, code }` — refactor a snippet to apply a named
  pattern (and first judge whether it even fits).

## Install & run

```bash
npm install
npm run build      # compiles src → build
npm start          # runs the stdio server
npm test           # builds, then runs the unit tests
npm run test:client  # end-to-end check against the built server
```

### Register with Claude Code

```bash
claude mcp add software-design -- node /absolute/path/to/mcp-software-design/build/index.js
```

Or in an MCP client config:

```json
{
  "mcpServers": {
    "software-design": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-software-design/build/index.js"]
    }
  }
}
```

## Layout

```
src/
  catalog.ts   # principles + 23 GoF patterns (data + lookup + markdown)
  smells.ts    # pure, testable code-smell heuristics
  scaffold.ts  # renders a pattern's participants into a skeleton
  index.ts     # MCP wiring: resources, tools, prompts
test/
  catalog.test.mjs   # catalog lookup + scaffolder
  smells.test.mjs    # smell detectors (incl. string/comment edge cases)
```

The `src/*.ts` logic modules are pure and side-effect-free, so they're unit
tested directly against the compiled output — the server (`index.ts`) is only
thin wiring on top.

## License

MIT
