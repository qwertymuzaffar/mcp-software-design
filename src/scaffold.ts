/**
 * Language-agnostic pattern scaffolding. Renders a GoF pattern's participants
 * (declared in catalog.ts) into a pseudo-code skeleton the model can then
 * translate into the target language.
 *
 * Pure and side-effect-free so it can be unit-tested in isolation. The output
 * is deliberately pseudo-code, not any real language: it names the roles,
 * their kind (interface / abstract / class), members, and how they collaborate
 * — the structural decisions — and leaves syntax to the caller.
 */

import { Concept, Participant, findConcept } from "./catalog.js";

export interface ScaffoldResult {
  slug: string;
  name: string;
  /** The rendered pseudo-code skeleton. */
  code: string;
  /** Role → concrete name substitutions that were applied. */
  renamed: Record<string, string>;
  /** Roles the caller could still rename (all pattern roles). */
  roles: string[];
}

const KIND_KEYWORD: Record<Participant["kind"], string> = {
  interface: "interface",
  abstract: "abstract class",
  class: "class",
};

/** Apply role→name substitutions to a member signature (whole-word only). */
function applyRenames(text: string, renamed: Record<string, string>): string {
  let result = text;
  for (const [role, name] of Object.entries(renamed)) {
    // A function replacer, so `$`-sequences in the user-supplied name (`$&`,
    // `$1`, …) are inserted literally rather than interpreted as replacement
    // patterns.
    result = result.replace(new RegExp(`\\b${role}\\b`, "g"), () => name);
  }
  return result;
}

/** Render one participant as a pseudo-code declaration block. */
function renderParticipant(participant: Participant, renamed: Record<string, string>): string {
  const roleName = renamed[participant.role] ?? participant.role;
  const lines: string[] = [];
  if (participant.note) lines.push(`// ${applyRenames(participant.note, renamed)}`);
  const header = `${KIND_KEYWORD[participant.kind]} ${roleName} {`;
  lines.push(applyRenames(header, renamed));
  for (const member of participant.members ?? []) {
    lines.push(`  ${applyRenames(member, renamed)}`);
  }
  lines.push("}");
  return lines.join("\n");
}

/**
 * Build a scaffold for the pattern identified by `query` (slug / name /
 * alias). `names` optionally maps a role (e.g. "Product") to a concrete name
 * (e.g. "Notification"). Throws if the query doesn't resolve to a *pattern*
 * with participants.
 */
export function scaffoldPattern(
  query: string,
  names: Record<string, string> = {}
): ScaffoldResult {
  const concept: Concept | null = findConcept(query);
  if (!concept) {
    throw new Error(
      `No design concept matches "${query}". Try a pattern slug like "observer" or "factory-method".`
    );
  }
  if (concept.category === "principle" || !concept.participants?.length) {
    throw new Error(
      `"${concept.name}" is a ${concept.category === "principle" ? "principle" : "concept"}, ` +
        `not a scaffoldable pattern. Use explain_concept for guidance instead.`
    );
  }

  const roles = concept.participants.map((participant) => participant.role);
  // Keep only rename keys that actually name a role in this pattern.
  const renamed: Record<string, string> = {};
  for (const [role, name] of Object.entries(names)) {
    if (roles.includes(role) && name.trim()) renamed[role] = name.trim();
  }

  const body = concept.participants
    .map((participant) => renderParticipant(participant, renamed))
    .join("\n\n");

  const header =
    `// ${concept.name} — pseudo-code skeleton (language-agnostic).\n` +
    `// Intent: ${concept.summary}\n` +
    (concept.collaboration ? `// Collaboration: ${concept.collaboration}\n` : "") +
    `// Translate the roles below into your target language.\n`;

  return {
    slug: concept.slug,
    name: concept.name,
    code: `${header}\n${body}\n`,
    renamed,
    roles,
  };
}
