#!/usr/bin/env node
import { readFileSync } from "node:fs";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import {
  ALL,
  CATEGORY_LABEL,
  conceptLine,
  conceptToMarkdown,
  findConcept,
  principlesMarkdown,
  patternsMarkdown,
  type Category,
} from "./catalog.js";
import { detectSmells, DEFAULTS, type Smell } from "./smells.js";
import { scaffoldPattern } from "./scaffold.js";

/**
 * Single source of truth: read the version from package.json at startup so it
 * can never drift from the published package. Resolved relative to this module,
 * so it works both from `build/` in the repo and from the installed package
 * (npm ships package.json alongside build/).
 */
const VERSION = (
  JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
    version: string;
  }
).version;

/** Human-readable summary of what the smell checker looks for. */
const SMELLS_GUIDE = `# Code-smell heuristics (design://smells)

These detectors are **heuristics, not proofs**. A finding means a principle
*might* be strained — it is never a verdict, and a clean run does not certify
good design. Detection is language-agnostic and best-effort (it reasons about
braces, parentheses, and indentation, not a real parser).

| Smell | Default trigger | Hints at |
|-------|-----------------|----------|
| long-method | body > ${DEFAULTS.longMethod} lines | single-responsibility |
| large-class | > ${DEFAULTS.largeClassMethods} methods | single-responsibility |
| too-many-params | > ${DEFAULTS.maxParams} parameters | single-responsibility |
| deep-nesting | nesting depth > ${DEFAULTS.maxDepth} | kiss |
| duplication | identical line ≥ ${DEFAULTS.dupThreshold}× | dry |
| large-file | > ${DEFAULTS.maxFileLines} lines | separation-of-concerns |

All thresholds are overridable per call on the \`check_smells\` tool.
`;

/** Render smells as a compact text report. */
function renderSmells(smells: Smell[]): string {
  if (smells.length === 0) {
    return "✅ No heuristic smells tripped. (Heuristics only — not a proof of good design.)";
  }
  const severityIcon: Record<Smell["severity"], string> = { high: "🔴", medium: "🟡", low: "⚪" };
  const renderedFindings = smells
    .map((smell) => {
      const location = smell.line ? ` (line ${smell.line})` : "";
      return (
        `${severityIcon[smell.severity]} ${smell.title}${location} — ${smell.detail}\n` +
        `    ↳ hints at ${smell.principle}: ${smell.suggestion}`
      );
    })
    .join("\n\n");
  return `${smells.length} heuristic smell(s) found (hints, not verdicts):\n\n${renderedFindings}`;
}

export function createServer(): McpServer {
  const server = new McpServer({ name: "software-design", version: VERSION });

  /* ---------------------------- Resources ---------------------------- */

  server.registerResource(
    "principles",
    "design://principles",
    {
      title: "Software-Design Principles",
      description: "SOLID, the OOP pillars, DRY, KISS, YAGNI, and related heuristics.",
      mimeType: "text/markdown",
    },
    async (uri) => ({ contents: [{ uri: uri.href, text: principlesMarkdown() }] })
  );

  server.registerResource(
    "patterns",
    "design://patterns",
    {
      title: "Gang-of-Four Design Patterns",
      description: "The 23 GoF patterns, grouped creational / structural / behavioral.",
      mimeType: "text/markdown",
    },
    async (uri) => ({ contents: [{ uri: uri.href, text: patternsMarkdown() }] })
  );

  server.registerResource(
    "smells",
    "design://smells",
    {
      title: "Code-Smell Heuristics",
      description: "What the check_smells tool detects, its thresholds, and caveats.",
      mimeType: "text/markdown",
    },
    async (uri) => ({ contents: [{ uri: uri.href, text: SMELLS_GUIDE }] })
  );

  /* ------------------------------ Tools ------------------------------ */

  server.registerTool(
    "list_catalog",
    {
      title: "List design principles & patterns",
      description:
        "List the catalog of software-design concepts, optionally filtered by " +
        "kind. Returns each concept's slug, name, category, and one-line summary.",
      inputSchema: {
        kind: z
          .enum(["all", "principle", "pattern", "creational", "structural", "behavioral"])
          .optional()
          .describe('Filter by kind. "pattern" = all GoF patterns. Default "all".'),
      },
      outputSchema: {
        count: z.number(),
        concepts: z.array(
          z.object({
            slug: z.string(),
            name: z.string(),
            category: z.string(),
            summary: z.string(),
          })
        ),
      },
    },
    async ({ kind }) => {
      const selectedKind = kind ?? "all";
      const matchesKind = (concept: (typeof ALL)[number]): boolean => {
        if (selectedKind === "all") return true;
        if (selectedKind === "principle") return concept.category === "principle";
        if (selectedKind === "pattern") return concept.category !== "principle";
        return concept.category === (selectedKind as Category);
      };
      const matched = ALL.filter(matchesKind);
      const concepts = matched.map((concept) => ({
        slug: concept.slug,
        name: concept.name,
        category: CATEGORY_LABEL[concept.category],
        summary: concept.summary,
      }));
      const text =
        `${concepts.length} concept(s):\n` +
        matched.map((concept) => `- ${conceptLine(concept)}`).join("\n");
      return {
        content: [{ type: "text", text }],
        structuredContent: { count: concepts.length, concepts },
      };
    }
  );

  server.registerTool(
    "explain_concept",
    {
      title: "Explain a principle or pattern",
      description:
        "Return an authoritative explanation of one design principle or GoF " +
        "pattern: intent, when to use it, trade-offs, participants, and related " +
        "concepts. Accepts a slug, full name, or alias (e.g. \"SRP\", \"factory\").",
      inputSchema: {
        name: z.string().describe('Concept to explain, e.g. "open-closed", "SRP", "observer".'),
      },
      outputSchema: {
        found: z.boolean(),
        slug: z.string().optional(),
        name: z.string().optional(),
        category: z.string().optional(),
        summary: z.string().optional(),
        markdown: z.string().optional(),
      },
    },
    async ({ name }) => {
      const concept = findConcept(name);
      if (!concept) {
        const text =
          `❓ No concept matches "${name}". Use list_catalog to see valid slugs.`;
        return {
          content: [{ type: "text", text }],
          structuredContent: { found: false },
        };
      }
      const markdown = conceptToMarkdown(concept);
      return {
        content: [{ type: "text", text: markdown }],
        structuredContent: {
          found: true,
          slug: concept.slug,
          name: concept.name,
          category: CATEGORY_LABEL[concept.category],
          summary: concept.summary,
          markdown,
        },
      };
    }
  );

  server.registerTool(
    "scaffold_pattern",
    {
      title: "Scaffold a GoF pattern",
      description:
        "Generate a language-agnostic pseudo-code skeleton for a GoF pattern, " +
        "showing its participants and how they collaborate. Optionally rename " +
        "roles to your domain (e.g. Product -> Notification). Translate the " +
        "result into your target language.",
      inputSchema: {
        pattern: z.string().describe('Pattern slug/name/alias, e.g. "observer", "factory-method".'),
        names: z
          .record(z.string())
          .optional()
          .describe('Optional role→name map, e.g. {"Product":"Notification","Creator":"Dispatcher"}.'),
      },
      outputSchema: {
        ok: z.boolean(),
        slug: z.string().optional(),
        name: z.string().optional(),
        roles: z.array(z.string()).optional(),
        code: z.string().optional(),
        error: z.string().optional(),
      },
    },
    async ({ pattern, names }) => {
      try {
        const result = scaffoldPattern(pattern, names ?? {});
        const rolesNote = `\n\n// Roles you can rename: ${result.roles.join(", ")}`;
        return {
          content: [{ type: "text", text: result.code + rolesNote }],
          structuredContent: {
            ok: true,
            slug: result.slug,
            name: result.name,
            roles: result.roles,
            code: result.code,
          },
        };
      } catch (caught) {
        const error = caught instanceof Error ? caught.message : String(caught);
        return {
          content: [{ type: "text", text: `❌ ${error}` }],
          structuredContent: { ok: false, error },
        };
      }
    }
  );

  server.registerTool(
    "check_smells",
    {
      title: "Detect code smells (heuristic)",
      description:
        "Scan a code snippet for heuristic design smells (long method, large " +
        "class, long parameter list, deep nesting, duplication, large file). " +
        "Each finding maps to the principle it hints at plus a suggested " +
        "refactor. HEURISTICS ONLY — hints, never verdicts; a clean run does " +
        "not certify good design.",
      inputSchema: {
        code: z.string().describe("The source snippet to analyze (one file's worth)."),
        longMethod: z.number().int().positive().optional().describe(`Max method lines (default ${DEFAULTS.longMethod}).`),
        maxParams: z.number().int().positive().optional().describe(`Max parameters (default ${DEFAULTS.maxParams}).`),
        maxDepth: z.number().int().positive().optional().describe(`Max nesting depth (default ${DEFAULTS.maxDepth}).`),
        maxFileLines: z.number().int().positive().optional().describe(`Max file lines (default ${DEFAULTS.maxFileLines}).`),
        largeClassMethods: z.number().int().positive().optional().describe(`Max methods per class (default ${DEFAULTS.largeClassMethods}).`),
        dupThreshold: z.number().int().positive().optional().describe(`Duplicate-line count (default ${DEFAULTS.dupThreshold}).`),
      },
      outputSchema: {
        count: z.number(),
        smells: z.array(
          z.object({
            id: z.string(),
            title: z.string(),
            severity: z.string(),
            line: z.number().optional(),
            detail: z.string(),
            principle: z.string(),
            suggestion: z.string(),
          })
        ),
      },
    },
    async ({ code, ...thresholds }) => {
      const smells = detectSmells(code, thresholds);
      return {
        content: [{ type: "text", text: renderSmells(smells) }],
        structuredContent: { count: smells.length, smells },
      };
    }
  );

  /* ----------------------------- Prompts ----------------------------- *
   * The "explain / apply" helper. Design analysis is a judgment call, so it
   * belongs to the client's model, not deterministic server code. These
   * prompts prime that model with the right task, and point it at the tools
   * and resources above to ground its answer.
   * ------------------------------------------------------------------ */

  server.registerPrompt(
    "review_design",
    {
      title: "Review a snippet against design principles",
      description:
        "Prime the model to review a code snippet against SOLID/OOP/DRY and the " +
        "GoF patterns, grounded in this server's catalog and check_smells output. " +
        "Assumes the client lets its model call this server's tools; where it " +
        "doesn't, the model reviews from the inlined code alone.",
      argsSchema: {
        code: z.string().describe("The code to review."),
        focus: z
          .string()
          .optional()
          .describe('Optional focus, e.g. "SOLID", "coupling", "a specific pattern".'),
      },
    },
    ({ code, focus }) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text:
              "Review the code below for software-design quality" +
              (focus ? ` with a focus on: ${focus}.` : ".") +
              "\n\nGround your review in this server's catalog:\n" +
              "1. Run the `check_smells` tool on the code and treat its output as HINTS, not verdicts.\n" +
              "2. Read the `design://principles` and `design://patterns` resources for the concepts you cite.\n" +
              "3. For each issue: name the principle at stake, explain why it applies HERE (not in the abstract), " +
              "and give a concrete, minimal refactor. If a GoF pattern would help, name it and say why; " +
              "if the code is already fine, say so plainly — do not invent problems.\n\n" +
              "```\n" + code + "\n```",
          },
        },
      ],
    })
  );

  server.registerPrompt(
    "apply_pattern",
    {
      title: "Refactor a snippet to apply a pattern",
      description:
        "Prime the model to refactor a snippet to apply a named GoF pattern, " +
        "using the server's scaffold_pattern + explain_concept as reference. " +
        "Assumes the client lets its model call this server's tools; where it " +
        "doesn't, the model works from the inlined code and pattern name alone.",
      argsSchema: {
        pattern: z.string().describe('The pattern to apply, e.g. "strategy", "observer".'),
        code: z.string().describe("The code to refactor."),
      },
    },
    ({ pattern, code }) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text:
              `Refactor the code below to apply the ${pattern} pattern.\n\n` +
              `1. Call \`explain_concept\` with "${pattern}" and \`scaffold_pattern\` with "${pattern}" for the canonical structure.\n` +
              "2. First judge whether the pattern genuinely fits this code. If it would be over-engineering " +
              "(see the YAGNI/KISS principles), say so and stop — do not force it.\n" +
              "3. If it fits, map the pattern's participants onto the domain here and produce the refactored code, " +
              "preserving existing behavior. Briefly note what improved and any trade-off introduced.\n\n" +
              "```\n" + code + "\n```",
          },
        },
      ],
    })
  );

  return server;
}

async function main(): Promise<void> {
  const server = createServer();
  await server.connect(new StdioServerTransport());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
