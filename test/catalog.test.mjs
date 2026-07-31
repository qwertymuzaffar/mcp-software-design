// Unit tests for the catalog lookup + the pattern scaffolder. Imports the
// COMPILED modules so it exercises the shipped artifact.
import test from "node:test";
import assert from "node:assert/strict";

import {
  ALL,
  PRINCIPLES,
  PATTERNS,
  findConcept,
  conceptToMarkdown,
  principleGroup,
} from "../build/catalog.js";
import { scaffoldPattern } from "../build/scaffold.js";

test("catalog has the SOLID five plus the 23 GoF patterns", () => {
  assert.equal(PATTERNS.length, 23);
  const creational = PATTERNS.filter((p) => p.category === "creational");
  const structural = PATTERNS.filter((p) => p.category === "structural");
  const behavioral = PATTERNS.filter((p) => p.category === "behavioral");
  assert.equal(creational.length, 5);
  assert.equal(structural.length, 7);
  assert.equal(behavioral.length, 11);
  for (const slug of [
    "single-responsibility", "open-closed", "liskov-substitution",
    "interface-segregation", "dependency-inversion",
  ]) {
    assert.ok(PRINCIPLES.some((p) => p.slug === slug), `missing principle ${slug}`);
  }
});

test("principleGroup partitions SOLID and the OOP pillars", () => {
  const bySlug = (concepts) => concepts.map((c) => c.slug).sort();
  const solid = PRINCIPLES.filter((p) => principleGroup(p) === "solid");
  const oop = PRINCIPLES.filter((p) => principleGroup(p) === "oop");

  assert.deepEqual(bySlug(solid), [
    "dependency-inversion", "interface-segregation", "liskov-substitution",
    "open-closed", "single-responsibility",
  ]);
  assert.deepEqual(bySlug(oop), [
    "abstraction", "encapsulation", "inheritance", "polymorphism",
  ]);
  // Patterns are never solid/oop; the rest of the principles are "general".
  assert.ok(PATTERNS.every((p) => principleGroup(p) === "general"));
  assert.equal(
    PRINCIPLES.filter((p) => principleGroup(p) === "general").length,
    PRINCIPLES.length - solid.length - oop.length
  );
});

test("meaningful-names is a general-group principle, resolvable by alias", () => {
  const concept = findConcept("meaningful-names");
  assert.ok(concept, "meaningful-names concept exists");
  assert.equal(concept.category, "principle");
  assert.equal(principleGroup(concept), "general");
  assert.equal(findConcept("intention-revealing-names")?.slug, "meaningful-names");
});

test("every concept slug is unique", () => {
  const slugs = ALL.map((c) => c.slug);
  assert.equal(new Set(slugs).size, slugs.length);
});

test("every pattern has participants so it is scaffoldable", () => {
  for (const p of PATTERNS) {
    assert.ok(p.participants && p.participants.length > 0, `${p.slug} has no participants`);
  }
});

test("findConcept resolves slug, alias, and fuzzy queries", () => {
  assert.equal(findConcept("srp")?.slug, "single-responsibility");
  assert.equal(findConcept("SRP")?.slug, "single-responsibility");
  assert.equal(findConcept("open-closed")?.slug, "open-closed");
  assert.equal(findConcept("factory method")?.slug, "factory-method");
  assert.equal(findConcept("pubsub")?.slug, "observer");
  assert.equal(findConcept("totally-not-a-thing"), null);
});

test("conceptToMarkdown includes the essentials", () => {
  const md = conceptToMarkdown(findConcept("strategy"));
  assert.match(md, /## Strategy/);
  assert.match(md, /When to use/);
  assert.match(md, /Trade-offs/);
  assert.match(md, /Participants/);
});

test("scaffoldPattern renders participants as pseudo-code", () => {
  const r = scaffoldPattern("observer");
  assert.equal(r.slug, "observer");
  assert.match(r.code, /class Subject/);
  assert.match(r.code, /interface Observer/);
  assert.ok(r.roles.includes("Subject"));
});

test("scaffoldPattern applies role renames verbatim", () => {
  const r = scaffoldPattern("strategy", { Strategy: "PricingRule", Context: "Checkout" });
  assert.match(r.code, /interface PricingRule/);
  assert.match(r.code, /class Checkout/);
  assert.doesNotMatch(r.code, /interface Strategy\b/);
  assert.equal(r.renamed.Strategy, "PricingRule");
});

test("scaffolding a principle is rejected with a helpful message", () => {
  assert.throws(() => scaffoldPattern("dry"), /not a scaffoldable pattern/);
});

test("scaffolding an unknown name is rejected", () => {
  assert.throws(() => scaffoldPattern("nonsense-pattern"), /No design concept matches/);
});

test("role renames with `$` sequences are inserted literally (review Low)", () => {
  const r = scaffoldPattern("observer", { Subject: "A$&B", Observer: "O$1" });
  assert.match(r.code, /class A\$&B/);
  assert.match(r.code, /interface O\$1/);
});

test("visitor models a second concrete element so double dispatch is complete", () => {
  const visitor = PATTERNS.find((p) => p.slug === "visitor");
  const roles = visitor.participants.map((p) => p.role);
  assert.ok(roles.includes("ElementA") && roles.includes("ElementB"));
  const r = scaffoldPattern("visitor");
  assert.match(r.code, /class ElementB/);
});
