// Unit tests for the code-smell heuristics. Run with `npm test` (builds
// first, then `node --test`). Tests import the COMPILED module so they
// exercise the artifact that actually ships.
import test from "node:test";
import assert from "node:assert/strict";

import { detectSmells, sanitize, DEFAULTS } from "../build/smells.js";

const idsOf = (smells) => smells.map((s) => s.id);
const has = (smells, id) => smells.some((s) => s.id === id);

test("clean small snippet trips nothing", () => {
  const code = `function add(a, b) {\n  return a + b;\n}`;
  assert.deepEqual(detectSmells(code), []);
});

test("long method is detected and blamed on SRP", () => {
  const body = Array.from({ length: 50 }, (_, i) => `  doStep${i}();`).join("\n");
  const code = `function big() {\n${body}\n}`;
  const smells = detectSmells(code);
  const lm = smells.find((s) => s.id === "long-method");
  assert.ok(lm, "expected a long-method smell");
  assert.equal(lm.principle, "single-responsibility");
  assert.equal(lm.line, 1);
});

test("a method just under the threshold is not flagged", () => {
  const body = Array.from({ length: DEFAULTS.longMethod - 2 }, () => "  x();").join("\n");
  const code = `function ok() {\n${body}\n}`;
  assert.equal(has(detectSmells(code), "long-method"), false);
});

test("too many parameters is detected", () => {
  const code = `function f(a, b, c, d, e, f) {\n  return a;\n}`;
  const smells = detectSmells(code);
  const p = smells.find((s) => s.id === "too-many-params");
  assert.ok(p);
  assert.match(p.detail, /6 parameters/);
});

test("`this`/`self` receiver is not counted as a parameter", () => {
  const code = `def method(self, a, b, c, d):\n    return a`;
  // 4 real params == threshold, so NOT flagged (self excluded).
  assert.equal(has(detectSmells(code), "too-many-params"), false);
});

test("control-flow headers are not mistaken for methods", () => {
  const code = `function f(a) {\n  if (a) {\n    return 1;\n  }\n  for (x) {\n    y();\n  }\n}`;
  // Only `f` is a method; if/for must not be flagged as too-many-params etc.
  const headers = detectSmells(code, { maxParams: 0 }).filter((s) => s.id === "too-many-params");
  assert.equal(headers.length, 1);
  assert.equal(headers[0].line, 1);
});

test("deep nesting is detected and blamed on KISS", () => {
  const code = `function f() {\n  if (a) {\n    if (b) {\n      if (c) {\n        if (d) {\n          if (e) {\n            go();\n}}}}}\n}`;
  const smells = detectSmells(code);
  const nest = smells.find((s) => s.id === "deep-nesting");
  assert.ok(nest);
  assert.equal(nest.principle, "kiss");
});

test("large class is detected by method count", () => {
  const methods = Array.from({ length: 15 }, (_, i) => `  m${i}() {\n    return ${i};\n  }`).join("\n");
  const code = `class Big {\n${methods}\n}`;
  const smells = detectSmells(code);
  const lc = smells.find((s) => s.id === "large-class");
  assert.ok(lc);
  assert.match(lc.detail, /15 methods/);
});

test("duplication is detected and blamed on DRY", () => {
  const line = "  total = total + computeTax(order);";
  const code = `function f() {\n${line}\n${line}\n${line}\n}`;
  const smells = detectSmells(code);
  const dup = smells.find((s) => s.id === "duplication");
  assert.ok(dup);
  assert.equal(dup.principle, "dry");
});

test("duplicated lines inside string literals are ignored", () => {
  // Same text three times but only as a string constant — sanitize() blanks
  // it, so it must NOT be flagged as duplicated logic.
  const code = `const a = "the quick brown fox jumped";\nconst b = "the quick brown fox jumped";\nconst c = "the quick brown fox jumped";`;
  assert.equal(has(detectSmells(code), "duplication"), false);
});

test("braces inside strings/comments don't break method-length counting", () => {
  const code = `function f() {\n  const s = "}{}{";\n  // stray } { braces\n  return s;\n}\nfunction g(a, b, c, d, e) {\n  return a;\n}`;
  const smells = detectSmells(code);
  // g's over-long param list must still be found at its real line (6).
  const p = smells.find((s) => s.id === "too-many-params");
  assert.ok(p);
  assert.equal(p.line, 6);
});

test("large file respects an overridden threshold", () => {
  const code = Array.from({ length: 20 }, () => "x();").join("\n");
  assert.equal(has(detectSmells(code, { maxFileLines: 10 }), "large-file"), true);
  assert.equal(has(detectSmells(code, { maxFileLines: 100 }), "large-file"), false);
});

test("sanitize blanks comments and strings but preserves line count", () => {
  const lines = ["a(); // comment", "/* block", "still block */ b();", 'c("string");'];
  const out = sanitize(lines);
  assert.equal(out.length, lines.length);
  assert.doesNotMatch(out[0], /comment/);
  assert.doesNotMatch(out[1], /block/);
  assert.doesNotMatch(out[3], /string/);
});

// --- Regression tests for the senior-review findings ---

test("deep-nesting ignores class + method structural braces (review High)", () => {
  // One class → one method → for/if/try = 3 real control levels. Must NOT trip
  // the default depth-4 threshold the way raw brace-counting did.
  const code = [
    "class OrderService {",
    "  process(order) {",
    "    for (const item of order.items) {",
    "      if (item.qty > 0) {",
    "        try { charge(item); } catch (e) { log(e); }",
    "      }",
    "    }",
    "  }",
    "}",
  ].join("\n");
  assert.equal(has(detectSmells(code), "deep-nesting"), false);
});

test("deep-nesting still fires on genuinely deep control flow", () => {
  const code = `function f() {\n  if (a) {\n    if (b) {\n      if (c) {\n        if (d) {\n          if (e) {\n            go();\n}}}}}\n}`;
  const nest = detectSmells(code).find((s) => s.id === "deep-nesting");
  assert.ok(nest);
  assert.equal(nest.principle, "kiss");
});

test("long-method body count is exact at the threshold boundary (off-by-one)", () => {
  const mk = (bodyLines) =>
    `function f() {\n${Array.from({ length: bodyLines }, () => "  x();").join("\n")}\n}`;
  assert.equal(has(detectSmells(mk(DEFAULTS.longMethod)), "long-method"), false); // exactly 40 body lines
  const flagged = detectSmells(mk(DEFAULTS.longMethod + 1)).find((s) => s.id === "long-method");
  assert.ok(flagged); // 41 body lines
  assert.match(flagged.detail, new RegExp(`${DEFAULTS.longMethod + 1} lines`));
});

test("`/*` inside a string does not blank the rest of the file (review High)", () => {
  const code = [
    'const RE = "a/*b";',
    "function pay(user, cart, coupon, tax, ship, gift) {",
    "  return 1;",
    "}",
    'const CLOSER = "x*/y";',
  ].join("\n");
  const p = detectSmells(code).find((s) => s.id === "too-many-params");
  assert.ok(p, "the 6-param signature after a string must still be seen");
  assert.equal(p.line, 2);
});

test("multi-line template literals do not create phantom nesting", () => {
  const code = "function f() {\n  const t = `\n    { { { {\n  `;\n  return 1;\n}";
  assert.equal(has(detectSmells(code), "deep-nesting"), false);
});

test("JS/TS private fields are not eaten as `#` comments", () => {
  // `#secret` must survive so brace/param accounting stays intact.
  const out = sanitize(["class C {", "  #secret = 1;", "  get(this) { return this.#secret; }", "}"]);
  assert.match(out[1], /#secret/);
  assert.match(out[2], /#secret/);
});

test("multi-line signatures are still checked for too-many-params (review Medium)", () => {
  const code = "function foo(\n  a, b, c, d, e, f\n) {\n  return a;\n}";
  const p = detectSmells(code).find((s) => s.id === "too-many-params");
  assert.ok(p);
  assert.match(p.detail, /6 parameters/);
  assert.equal(p.line, 1);
});

test("one-line-bodied methods count toward large-class (review Medium)", () => {
  const methods = Array.from({ length: 13 }, (_, i) => `  m${i}() { return ${i}; }`).join("\n");
  const code = `class Terse {\n${methods}\n}`;
  const lc = detectSmells(code).find((s) => s.id === "large-class");
  assert.ok(lc);
  assert.match(lc.detail, /13 methods/);
});

test("non-string input returns no findings instead of throwing (review Critical)", () => {
  for (const bad of [undefined, null, 42, {}, ["a"]]) {
    assert.deepEqual(detectSmells(bad), []);
  }
});

test("pathological unclosed block comments run in linear time, not O(n²) (review Critical)", () => {
  // `/*a` repeated with no `*/` was a quadratic hang with the old regex. This
  // completes near-instantly with the single-pass tokenizer.
  const code = "/*a".repeat(200000);
  const start = process.hrtime.bigint();
  const out = detectSmells(code);
  const ms = Number(process.hrtime.bigint() - start) / 1e6;
  assert.ok(Array.isArray(out));
  assert.ok(ms < 2000, `expected linear-time completion, took ${ms.toFixed(0)}ms`);
});

test("oversized input is truncated with a note rather than analyzed wholesale", () => {
  const code = "x();\n".repeat(600000); // > MAX_CHARS
  assert.equal(has(detectSmells(code), "input-truncated"), true);
});
