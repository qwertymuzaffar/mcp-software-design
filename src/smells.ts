/**
 * Heuristic code-smell detection. Pure and side-effect-free so it can be
 * unit-tested in isolation and reused by the MCP `check_smells` tool.
 *
 * IMPORTANT — these are HEURISTICS, not proofs. A smell is a hint that a
 * design principle *might* be strained; it is never a verdict. Detection is
 * language-agnostic and best-effort: it reasons about braces, parentheses,
 * and indentation, not a real parser, so it favors "obvious" findings and
 * accepts occasional misses on exotic syntax. Every finding is mapped to the
 * principle it hints at and a concrete refactoring suggestion.
 *
 * Robustness: all scanning is done with single-pass character loops and
 * `indexOf`, never backtracking regexes over the whole input, so runtime is
 * linear in the source length even on adversarial input.
 */

export type Severity = "high" | "medium" | "low";

export interface Smell {
  /** Stable detector id, e.g. "long-method". */
  id: string;
  title: string;
  severity: Severity;
  /** 1-based line the finding points at, when applicable. */
  line?: number;
  /** What was measured and why it tripped. */
  detail: string;
  /** Slug of the principle this smell most directly hints at. */
  principle: string;
  /** A concrete next step. */
  suggestion: string;
}

export interface SmellOptions {
  /** Max lines in a function/method body before it's "long". */
  longMethod: number;
  /** Max parameters before a signature is "too long". */
  maxParams: number;
  /** Max control-flow nesting depth before "deeply nested". */
  maxDepth: number;
  /** Max lines in a whole file before "large file". */
  maxFileLines: number;
  /** Max methods in a class before "large class". */
  largeClassMethods: number;
  /** How many identical non-trivial lines count as duplication. */
  dupThreshold: number;
}

export const DEFAULTS: SmellOptions = {
  longMethod: 40,
  maxParams: 4,
  maxDepth: 4,
  maxFileLines: 400,
  largeClassMethods: 12,
  dupThreshold: 3,
};

/** Max source size we'll analyze; larger input is truncated with a note. */
export const MAX_CHARS = 2_000_000;

const CONTROL_KEYWORDS = new Set([
  "if", "for", "while", "switch", "catch", "else", "do", "elif", "except",
  "finally", "with", "when", "try", "return", "await", "yield", "throw",
]);

const TYPE_KEYWORDS = new Set([
  "class", "interface", "enum", "struct", "namespace", "module", "record",
  "trait", "object", "protocol", "extension",
]);

/**
 * Blank out string literals, line comments, and block comments so structural
 * counters (braces, commas, numbers) don't trip over their contents. Returns
 * one sanitized string per input line; line indices are preserved.
 *
 * This is a single left-to-right tokenizer that tracks whether we're inside a
 * block comment or an unterminated template literal ACROSS lines — so `/*`
 * or a brace that appears inside a string never affects the code view, and a
 * multi-line template literal is fully blanked. String/comment scanning uses
 * `indexOf`/char loops (no backtracking regex), so it is linear-time.
 */
export function sanitize(lines: string[]): string[] {
  const sanitizedLines: string[] = [];
  // Carry-over state between lines. `"` / `'` strings do NOT carry (an
  // unterminated one ends at the newline) to avoid runaway blanking; only
  // block comments and template literals span lines.
  let mode: "code" | "block" | "template" = "code";

  for (const rawLine of lines) {
    let codeOnly = "";
    let cursor = 0;
    const lineLength = rawLine.length;

    while (cursor < lineLength) {
      if (mode === "block") {
        const closeIndex = rawLine.indexOf("*/", cursor);
        if (closeIndex === -1) { cursor = lineLength; } else { cursor = closeIndex + 2; mode = "code"; }
        continue;
      }
      if (mode === "template") {
        let scanIndex = cursor;
        let closed = false;
        while (scanIndex < lineLength) {
          const char = rawLine[scanIndex];
          if (char === "\\") { scanIndex += 2; continue; }
          if (char === "`") { closed = true; break; }
          scanIndex++;
        }
        if (closed) { cursor = scanIndex + 1; mode = "code"; } else { cursor = lineLength; }
        continue;
      }

      // mode === "code"
      const char = rawLine[cursor];
      const nextChar = cursor + 1 < lineLength ? rawLine[cursor + 1] : "";

      if (char === "/" && nextChar === "/") { cursor = lineLength; continue; } // line comment
      if (char === "/" && nextChar === "*") { mode = "block"; cursor += 2; continue; } // block comment open

      // `#`: a Python/shell line comment, EXCEPT a JS/TS private member
      // (`#field`, `this.#field`). Treat as code when it names an identifier
      // or follows a `.`/identifier; otherwise it's a comment.
      if (char === "#") {
        const prevChar = codeOnly.length ? codeOnly[codeOnly.length - 1] : "";
        const looksPrivate =
          /[A-Za-z_$]/.test(nextChar) || prevChar === "." || /[A-Za-z0-9_$]/.test(prevChar);
        if (!looksPrivate) { cursor = lineLength; continue; }
        codeOnly += char; cursor++; continue;
      }

      if (char === '"' || char === "'") {
        const quote = char;
        let scanIndex = cursor + 1;
        let closed = false;
        while (scanIndex < lineLength) {
          const stringChar = rawLine[scanIndex];
          if (stringChar === "\\") { scanIndex += 2; continue; }
          if (stringChar === quote) { closed = true; break; }
          scanIndex++;
        }
        cursor = closed ? scanIndex + 1 : lineLength; // drop the string content
        continue;
      }

      if (char === "`") {
        let scanIndex = cursor + 1;
        let closed = false;
        while (scanIndex < lineLength) {
          const stringChar = rawLine[scanIndex];
          if (stringChar === "\\") { scanIndex += 2; continue; }
          if (stringChar === "`") { closed = true; break; }
          scanIndex++;
        }
        if (closed) { cursor = scanIndex + 1; } else { mode = "template"; cursor = lineLength; }
        continue;
      }

      codeOnly += char;
      cursor++;
    }

    sanitizedLines.push(codeOnly);
  }
  return sanitizedLines;
}

/** Split `text` on `separator` only at bracket-nesting depth 0. */
function topLevelSplit(text: string, separator: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  // `<`/`>` are counted so generics like `Map<string, number>` read as one
  // argument. This mis-splits the rarer case of `<`/`>` used as comparison
  // operators in a default value; generics in a type position are the common
  // case in typed languages, so we optimize for them.
  for (const char of text) {
    if ("([{<".includes(char)) depth++;
    else if (")]}>".includes(char)) depth = Math.max(0, depth - 1);
    if (char === separator && depth === 0) {
      parts.push(current);
      current = "";
    } else current += char;
  }
  parts.push(current);
  return parts;
}

/** Leading identifier of a trimmed line, or "" if it doesn't start with one. */
function leadingIdentifier(trimmedLine: string): string {
  const match = trimmedLine.match(/^([A-Za-z_$][\w$]*)/);
  return match ? match[1] : "";
}

/** True if the (possibly multi-line-joined) text is a function/method header opening a `{`. */
function isBraceMethodHeader(headerText: string): boolean {
  const trimmed = headerText.trim();
  if (!trimmed.endsWith("{")) return false;
  if (!trimmed.includes("(")) return false;
  const leadingWord = leadingIdentifier(trimmed);
  if (leadingWord && (CONTROL_KEYWORDS.has(leadingWord) || TYPE_KEYWORDS.has(leadingWord))) return false;
  // Must contain a completed `(...)` param group before the trailing brace.
  return /\)[^()]*\{$/.test(trimmed);
}

/** True if the text starts a Python-style `def` signature. */
function isDefHeader(headerText: string): boolean {
  return /^\s*(async\s+)?def\s+\w+\s*\(/.test(headerText);
}

/**
 * A method/function declaration on a single line, INCLUDING one-line bodies
 * (`m() { return 1 }`). Global so callers can count several on one line.
 * The negative lookahead keeps control-flow headers (`if (x) {`) from being
 * miscounted as methods.
 */
const METHOD_DECL_G =
  /(^|[^.\w$])(?!(?:if|for|while|switch|catch|do|else|when|try|finally|return|function)\b)[A-Za-z_$][\w$]*\s*\([^()]*\)\s*(?::[^{;]*)?\{/g;

/** Count parameters declared in the first `(...)` group of a header. */
function countParams(headerText: string): number {
  const openParen = headerText.indexOf("(");
  if (openParen === -1) return 0;
  let depth = 0;
  let closeParen = -1;
  for (let index = openParen; index < headerText.length; index++) {
    const char = headerText[index];
    if (char === "(") depth++;
    else if (char === ")") {
      depth--;
      if (depth === 0) { closeParen = index; break; }
    }
  }
  if (closeParen === -1) return 0;
  const paramList = headerText.slice(openParen + 1, closeParen).trim();
  if (!paramList) return 0;
  return topLevelSplit(paramList, ",")
    .map((param) => param.trim())
    .filter(Boolean)
    .filter((param) => param !== "this" && param !== "self" && !/^self\b/.test(param)).length;
}

/** Net paren delta of a line ('(' minus ')'). */
function parenBalance(text: string): number {
  let balance = 0;
  for (const char of text) {
    if (char === "(") balance++;
    else if (char === ")") balance--;
  }
  return balance;
}

/**
 * A logical line: a source line joined with its continuations when a `(` is
 * left open (so multi-line signatures read as one header). `startLine`/`endLine`
 * are 0-based indices into the sanitized lines.
 */
interface LogicalLine {
  text: string;
  startLine: number;
  endLine: number;
}

function logicalLines(sanitized: string[]): LogicalLine[] {
  const result: LogicalLine[] = [];
  let lineIndex = 0;
  while (lineIndex < sanitized.length) {
    const startLine = lineIndex;
    let text = sanitized[lineIndex];
    let balance = parenBalance(text);
    // Merge following lines while parens are left open (cap the reach).
    let mergedCount = 0;
    while (balance > 0 && lineIndex + 1 < sanitized.length && mergedCount < 50) {
      lineIndex++;
      mergedCount++;
      text += " " + sanitized[lineIndex];
      balance += parenBalance(sanitized[lineIndex]);
    }
    result.push({ text, startLine, endLine: lineIndex });
    lineIndex++;
  }
  return result;
}

/**
 * Find the 1-based end line of a brace block that opens on `startLine`
 * (0-based) in the sanitized lines, or -1 if unbalanced.
 */
function braceBlockEnd(sanitized: string[], startLine: number): number {
  let depth = 0;
  let seenBrace = false;
  for (let lineIndex = startLine; lineIndex < sanitized.length; lineIndex++) {
    for (const char of sanitized[lineIndex]) {
      if (char === "{") { depth++; seenBrace = true; }
      else if (char === "}") {
        depth--;
        if (seenBrace && depth === 0) return lineIndex + 1;
      }
    }
  }
  return -1;
}

/** Detect over-long functions/methods (brace-style + Python `def`). */
function detectLongMethods(sanitized: string[], options: SmellOptions): Smell[] {
  const findings: Smell[] = [];
  for (let lineIndex = 0; lineIndex < sanitized.length; lineIndex++) {
    const line = sanitized[lineIndex];
    if (isBraceMethodHeader(line)) {
      const endLine = braceBlockEnd(sanitized, lineIndex);
      if (endLine === -1) continue;
      // Body = lines strictly between the header (lineIndex+1, 1-based) and the
      // closing brace line (endLine): count = endLine - (lineIndex+1) - 1.
      const bodyLength = Math.max(0, endLine - lineIndex - 2);
      if (bodyLength > options.longMethod) {
        findings.push({
          id: "long-method",
          title: "Long method",
          severity: bodyLength > options.longMethod * 2 ? "high" : "medium",
          line: lineIndex + 1,
          detail: `Function/method body spans ${bodyLength} lines (threshold ${options.longMethod}).`,
          principle: "single-responsibility",
          suggestion:
            "Extract cohesive chunks into well-named helper methods; a function " +
            "that does one thing rarely needs this much room.",
        });
      }
      lineIndex = endLine - 1; // skip past the body so nested blocks aren't re-reported
    } else if (isDefHeader(line)) {
      const headerIndent = line.match(/^(\s*)/)![1].length;
      let endLine = lineIndex;
      for (let scanLine = lineIndex + 1; scanLine < sanitized.length; scanLine++) {
        if (sanitized[scanLine].trim() === "") continue;
        const scanIndent = sanitized[scanLine].match(/^(\s*)/)![1].length;
        if (scanIndent <= headerIndent) break;
        endLine = scanLine;
      }
      const bodyLength = endLine - lineIndex; // body lines (excludes the `def` header line)
      if (bodyLength > options.longMethod) {
        findings.push({
          id: "long-method",
          title: "Long function",
          severity: bodyLength > options.longMethod * 2 ? "high" : "medium",
          line: lineIndex + 1,
          detail: `Function body spans ${bodyLength} lines (threshold ${options.longMethod}).`,
          principle: "single-responsibility",
          suggestion: "Split the function along its distinct steps into helpers.",
        });
      }
    }
  }
  return findings;
}

/** Detect signatures with too many parameters (handles multi-line signatures). */
function detectTooManyParams(sanitized: string[], options: SmellOptions): Smell[] {
  const findings: Smell[] = [];
  for (const { text, startLine } of logicalLines(sanitized)) {
    if (!isBraceMethodHeader(text) && !isDefHeader(text)) continue;
    const paramCount = countParams(text);
    if (paramCount > options.maxParams) {
      findings.push({
        id: "too-many-params",
        title: "Long parameter list",
        severity: paramCount > options.maxParams + 2 ? "high" : "medium",
        line: startLine + 1,
        detail: `Signature takes ${paramCount} parameters (threshold ${options.maxParams}).`,
        principle: "single-responsibility",
        suggestion:
          "Group related arguments into a parameter object / options struct, or " +
          "split the function — a long list often signals it does too much.",
      });
    }
  }
  return findings;
}

/**
 * Detect deep CONTROL-FLOW nesting. Braces that open a type body (class/…) or
 * a method/function body are NOT counted — only `if/for/while/switch/catch/…`
 * blocks add to the depth. This measures the nesting a reader must hold in
 * their head, without penalizing ordinary class → method structure.
 */
function detectDeepNesting(sanitized: string[], options: SmellOptions): Smell[] {
  // Classify a `{` by the clause that precedes it on its logical statement.
  const controlClause =
    /(^|[^.\w$])(?:else\s+if|if|for|foreach|while|switch|catch|do|try|finally|when|else)\s*(\(|\{|$)/;

  const braceStack: boolean[] = []; // true = this brace opened a control block
  let controlDepth = 0;
  let maxControlDepth = 0;
  let deepestLine = 0;
  let clause = "";

  for (let lineIndex = 0; lineIndex < sanitized.length; lineIndex++) {
    for (const char of sanitized[lineIndex]) {
      if (char === "{") {
        const opensControlBlock = controlClause.test(clause);
        braceStack.push(opensControlBlock);
        if (opensControlBlock) {
          controlDepth++;
          if (controlDepth > maxControlDepth) { maxControlDepth = controlDepth; deepestLine = lineIndex + 1; }
        }
        clause = "";
      } else if (char === "}") {
        if (braceStack.pop()) controlDepth = Math.max(0, controlDepth - 1);
        clause = "";
      } else if (char === ";") {
        clause = "";
      } else {
        clause += char;
      }
    }
    clause += " "; // preserve a word boundary across the newline
  }

  if (maxControlDepth > options.maxDepth) {
    return [
      {
        id: "deep-nesting",
        title: "Deep nesting",
        severity: maxControlDepth > options.maxDepth + 2 ? "high" : "medium",
        line: deepestLine,
        detail: `Control-flow nesting reaches depth ${maxControlDepth} (threshold ${options.maxDepth}).`,
        principle: "kiss",
        suggestion:
          "Flatten with guard clauses / early returns, or extract the inner block " +
          "into its own function. Deep nesting hides the happy path.",
      },
    ];
  }
  return [];
}

/** Detect large classes by method count (one-line and multi-line methods). */
function detectLargeClass(sanitized: string[], options: SmellOptions): Smell[] {
  const findings: Smell[] = [];
  for (let lineIndex = 0; lineIndex < sanitized.length; lineIndex++) {
    const trimmed = sanitized[lineIndex].trim();
    const leadingWord = leadingIdentifier(trimmed);
    if (!TYPE_KEYWORDS.has(leadingWord) || !trimmed.endsWith("{")) continue;
    const endLine = braceBlockEnd(sanitized, lineIndex);
    if (endLine === -1) continue;
    let methodCount = 0;
    for (let bodyLine = lineIndex + 1; bodyLine < endLine - 1; bodyLine++) {
      METHOD_DECL_G.lastIndex = 0;
      const matches = sanitized[bodyLine].match(METHOD_DECL_G);
      if (matches) methodCount += matches.length;
    }
    if (methodCount > options.largeClassMethods) {
      findings.push({
        id: "large-class",
        title: "Large class",
        severity: methodCount > options.largeClassMethods * 2 ? "high" : "medium",
        line: lineIndex + 1,
        detail: `Type declares ${methodCount} methods (threshold ${options.largeClassMethods}).`,
        principle: "single-responsibility",
        suggestion:
          "Split responsibilities into collaborating classes; a class with many " +
          "methods usually serves more than one actor.",
      });
    }
    lineIndex = endLine - 1;
  }
  return findings;
}

/** Detect duplicated non-trivial lines (a DRY proxy). */
function detectDuplication(sanitized: string[], options: SmellOptions): Smell[] {
  const lineCounts = new Map<string, { count: number; firstLine: number }>();
  for (let lineIndex = 0; lineIndex < sanitized.length; lineIndex++) {
    const trimmed = sanitized[lineIndex].trim();
    if (trimmed.length < 15) continue; // too short to be meaningful
    if (/^[{}()\[\];,]+$/.test(trimmed)) continue; // pure punctuation
    if (/^(import|from|export|package|using|#include|@)/.test(trimmed)) continue;
    const record = lineCounts.get(trimmed) ?? { count: 0, firstLine: lineIndex + 1 };
    record.count++;
    lineCounts.set(trimmed, record);
  }
  const findings: Smell[] = [];
  for (const [text, record] of lineCounts) {
    if (record.count >= options.dupThreshold) {
      findings.push({
        id: "duplication",
        title: "Duplicated logic",
        severity: record.count >= options.dupThreshold + 2 ? "high" : "medium",
        line: record.firstLine,
        detail: `Line repeated ${record.count}× (threshold ${options.dupThreshold}): \`${text.slice(0, 60)}\``,
        principle: "dry",
        suggestion:
          "If these copies encode the same decision, extract them into one " +
          "named function/constant. (If they only look alike, leave them.)",
      });
    }
  }
  return findings.sort((left, right) => (left.line ?? 0) - (right.line ?? 0));
}

/** Detect a very large file (a coarse separation-of-concerns proxy). */
function detectLargeFile(lineCount: number, options: SmellOptions): Smell[] {
  if (lineCount <= options.maxFileLines) return [];
  return [
    {
      id: "large-file",
      title: "Large file",
      severity: lineCount > options.maxFileLines * 2 ? "high" : "low",
      detail: `File has ${lineCount} lines (threshold ${options.maxFileLines}).`,
      principle: "separation-of-concerns",
      suggestion:
        "Consider splitting unrelated concerns into separate modules so each " +
        "file has a single reason to change.",
    },
  ];
}

/**
 * Run every heuristic over a snippet and return the findings, sorted by line.
 * `code` is treated as a single file's worth of source. Non-string input
 * yields no findings (the caller's schema should already enforce a string).
 * Input longer than {@link MAX_CHARS} is truncated with a `large-file` note.
 */
export function detectSmells(code: unknown, options?: Partial<SmellOptions>): Smell[] {
  if (typeof code !== "string") return [];
  const config: SmellOptions = { ...DEFAULTS, ...(options ?? {}) };

  let truncated = false;
  let source = code;
  if (source.length > MAX_CHARS) {
    source = source.slice(0, MAX_CHARS);
    truncated = true;
  }

  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const sanitized = sanitize(lines);

  const findings: Smell[] = [
    ...detectLargeFile(lines.length, config),
    ...detectLongMethods(sanitized, config),
    ...detectTooManyParams(sanitized, config),
    ...detectDeepNesting(sanitized, config),
    ...detectLargeClass(sanitized, config),
    ...detectDuplication(sanitized, config),
  ];

  if (truncated) {
    findings.unshift({
      id: "input-truncated",
      title: "Input truncated",
      severity: "low",
      detail: `Input exceeded ${MAX_CHARS} chars and was truncated before analysis.`,
      principle: "separation-of-concerns",
      suggestion: "Analyze one file at a time for complete results.",
    });
  }

  return findings.sort(
    (left, right) => (left.line ?? 0) - (right.line ?? 0) || left.id.localeCompare(right.id)
  );
}
