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

test("a closing brace before a control keyword is not a method header (review: else-if)", () => {
  // Each control line below is followed by a long tail; a header mistaken here
  // would report a long method starting at that line.
  const tail = Array.from({ length: 45 }, (_, index) => `    value = step${index}(value);`).join("\n");
  for (const control of ['} else if (kind === "a" || kind === "b") {', "} catch (error) {", "} else {", "} finally {"]) {
    const code = `function f(kind) {\n  let value = 0;\n  if (kind) {\n    value = 1;\n  ${control}\n${tail}\n  }\n  return value;\n}`;
    const longMethods = detectSmells(code, { longMethod: 40 }).filter((s) => s.id === "long-method");
    assert.equal(longMethods.length, 1, control);
    assert.equal(longMethods[0].line, 1, control);
  }
  const catchParams = "function g() {\n  try {\n    run();\n  } catch (first, second, third, fourth, fifth) {\n    fail();\n  }\n}";
  assert.equal(has(detectSmells(catchParams), "too-many-params"), false);
});

test("a genuine method after a closing brace on its own line is still detected", () => {
  const body = Array.from({ length: 45 }, (_, index) => `    this.value = step${index}(this.value);`).join("\n");
  const code = `class A {\n  small() {\n    return 1;\n  }\n  big(input) {\n${body}\n  }\n}`;
  const longMethod = detectSmells(code).find((s) => s.id === "long-method");
  assert.ok(longMethod);
  assert.equal(longMethod.line, 5);
});

test("rows of a multi-line object table are not duplicated logic", () => {
  const row = "  alpha: { input: 5, output: 25, cached: 1 },";
  const code = `export const PRICES = {\n${row}\n${row}\n${row}\n${row}\n};`;
  assert.equal(has(detectSmells(code), "duplication"), false);
});

test("entries of a multi-line array of tuples are not duplicated logic", () => {
  const row = "  { name: 'x', words: 'Subjective|Chief', short: 'S' },";
  const code = `const HEADERS = [\n${row}\n${row}\n${row}\n${row}\n];\nfunction f() {\n  return HEADERS;\n}`;
  assert.equal(has(detectSmells(code), "duplication"), false);
});

test("consecutive push calls with string arguments are not duplicated logic", () => {
  const line = "  lines.push('| --- | --- |', '');";
  const code = `function render(lines) {\n${line}\n${line}\n${line}\n  return lines;\n}`;
  assert.equal(has(detectSmells(code), "duplication"), false);
});

test("a repeated throw guard with a message is not duplicated logic", () => {
  const guard = "  throw new RangeError('dimension must be positive');";
  const code = `function check(bad) {\n${guard}\n${guard}\n${guard}\n}`;
  assert.equal(has(detectSmells(code), "duplication"), false);
});

test("a genuinely repeated statement is still flagged", () => {
  const line = "  const state = await load(this.core, this.id);";
  const code = `async function f() {\n${line}\n${line}\n${line}\n${line}\n${line}\n}`;
  const dup = detectSmells(code).find((s) => s.id === "duplication");
  assert.ok(dup);
  assert.equal(dup.line, 2);
});

test("members of interface, type and enum bodies are not duplicated logic", () => {
  const code = [
    "interface A { depthTest?: boolean; altitudeMode?: string; [key: string]: any; }",
    "export interface B {",
    "  depthTest?: boolean;",
    "  altitudeMode?: string;",
    "  [key: string]: any;",
    "}",
    "type C = {",
    "  depthTest?: boolean;",
    "  altitudeMode?: string;",
    "  [key: string]: any;",
    "};",
    "enum Mode { Point, Line, Polygon }",
  ].join("\n");
  assert.equal(has(detectSmells(code), "duplication"), false);
});

test("class fields and typed parameters are not duplicated logic", () => {
  const code = [
    "class P { enabled = true; highlighted = false; readonly mode = input<Mode | undefined>(undefined); }",
    "class Q {",
    "  enabled = true;",
    "  highlighted = false;",
    "  readonly mode = input<Mode | undefined>(undefined);",
    "  private label = 'x';",
    "}",
    "class R {",
    "  enabled = true;",
    "  highlighted = false;",
    "  readonly mode = input<Mode | undefined>(undefined);",
    "  private label = 'y';",
    "}",
    "function createPath(",
    "  worldWind: WorldWindStatic,",
    "  options: PathOptions,",
    ") { return 1; }",
    "function createPolygon(",
    "  worldWind: WorldWindStatic,",
    "  options: PolygonOptions,",
    ") { return 2; }",
    "function createCircle(",
    "  worldWind: WorldWindStatic,",
    "  onDone: (shape: Shape) => void,",
    ") { return 3; }",
  ].join("\n");
  assert.equal(has(detectSmells(code), "duplication"), false);
});

test("callback openers are not duplicated logic but the statements inside still are", () => {
  const opener = ["useEffect(() => {", "  const globe = useGlobe();", "  globe.redraw(frame, options);", "});"];
  const code = [...opener, ...opener, ...opener, "effect((onCleanup) => {", "  onCleanup(() => {", "  });", "});"].join("\n");
  const findings = detectSmells(code).filter((s) => s.id === "duplication");
  assert.equal(findings.some((s) => s.detail.includes("useEffect(() => {")), false);
  assert.equal(findings.some((s) => s.detail.includes("effect((onCleanup) => {")), false);
  assert.equal(findings.some((s) => s.detail.includes("globe.redraw(frame, options);")), true);
});

test("a repeated statement, and a callback call with other arguments, are still flagged", () => {
  const body = ["  const state = await load(this.core, this.id);", "  return this.core.run(this.id, async () => {", "  });"];
  const code = ["class S {", ...["a", "b", "c", "d", "e"].flatMap((name) => [`  async ${name}() {`, ...body, "  }"]), "}"].join("\n");
  const findings = detectSmells(code).filter((s) => s.id === "duplication");
  assert.equal(findings.some((s) => s.detail.includes("const state = await load(this.core, this.id);")), true);
  assert.equal(findings.some((s) => s.detail.includes("return this.core.run(this.id, async () => {")), true);
});

test("a method header with a return type opens a block, not a literal", () => {
  const line = "    const state = await load(this.core, this.id);";
  const code = `class Session {\n  add(input: Message): Promise<AddResult> {\n${line}\n${line}\n${line}\n  }\n}`;
  assert.equal(has(detectSmells(code), "duplication"), true);
  const union = `function toKey(value: unknown): string | null {\n${line}\n${line}\n${line}\n}`;
  assert.equal(has(detectSmells(union), "duplication"), true);
  const ternary = `const shape = ready ? build(a) : {\n  alpha: { input: 5, output: 25, cached: 1 },\n  alpha: { input: 5, output: 25, cached: 1 },\n  alpha: { input: 5, output: 25, cached: 1 },\n};`;
  assert.equal(has(detectSmells(ternary), "duplication"), false);
});

test("statements inside a callback that lives in an object literal are still counted", () => {
  const line = "      total = total + computeTax(order);";
  const code = `const handlers = {\n  onOrder: (order) => {\n${line}\n${line}\n${line}\n  },\n};`;
  assert.equal(has(detectSmells(code), "duplication"), true);
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
