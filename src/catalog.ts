/**
 * The reference data behind the server: design *principles* (SOLID, OOP,
 * DRY, KISS, YAGNI, …) and the 23 Gang-of-Four *patterns*.
 *
 * This module is pure data + pure lookup/rendering helpers, kept separate
 * from the MCP wiring (index.ts) so it can be unit-tested in isolation and
 * reused by the scaffolder (scaffold.ts).
 *
 * Honesty note: principles and patterns are *judgment* tools, not lint
 * rules. Nothing here claims a snippet "passes" or "fails" — the catalog
 * exists so the model cites consistent, authoritative definitions instead of
 * paraphrasing from memory.
 */

export type Category = "principle" | "creational" | "structural" | "behavioral";

/**
 * Sub-group within the principles, so callers can focus on just the SOLID five
 * or the four OOP pillars instead of the whole principle bucket. Everything
 * else — patterns, plus DRY/KISS/YAGNI and the other guidelines — is "general".
 */
export type PrincipleGroup = "solid" | "oop" | "general";

/** One role in a pattern's structure (used by the scaffolder). */
export interface Participant {
  /** Role name, e.g. "Product", "Creator". */
  role: string;
  /** How to declare it in the skeleton. */
  kind: "interface" | "abstract" | "class";
  /** Pseudo-code member signatures, e.g. "factoryMethod(): Product". */
  members?: string[];
  /** Short comment rendered above the declaration. */
  note?: string;
}

export interface Concept {
  /** Stable kebab-case key and primary lookup handle. */
  slug: string;
  /** Display name. */
  name: string;
  category: Category;
  /** Alternate names/abbreviations accepted by lookup (e.g. "srp"). */
  aka?: string[];
  /** One-line gist. */
  summary: string;
  /** A short paragraph on the core idea / intent. */
  intent: string;
  /** When reaching for it is a good idea. */
  whenToUse: string[];
  /** Costs, pitfalls, and "don't overuse" notes. */
  tradeoffs: string[];
  /** Related concept slugs. */
  related?: string[];
  /** Structural roles — patterns only; drives scaffolding. */
  participants?: Participant[];
  /** One line on how the participants collaborate — patterns only. */
  collaboration?: string;
}

/* ------------------------------------------------------------------ *
 * Principles
 * ------------------------------------------------------------------ */

export const PRINCIPLES: Concept[] = [
  {
    slug: "single-responsibility",
    name: "Single Responsibility Principle (SRP)",
    category: "principle",
    aka: ["srp"],
    summary: "A module should have one reason to change.",
    intent:
      "Each class or module should answer to exactly one actor/concern. When " +
      "unrelated responsibilities share a class, a change requested by one " +
      "stakeholder risks breaking another's feature. Split along the axes of " +
      "change, not along nouns.",
    whenToUse: [
      "A class mixes concerns (e.g. business rules + persistence + formatting).",
      "You keep editing the same file for unrelated reasons.",
      "A method name needs an 'and' to describe it.",
    ],
    tradeoffs: [
      "Over-splitting creates anemic, scattered classes and navigation overhead.",
      "'Responsibility' is a judgment call — define it by who requests the change.",
    ],
    related: ["separation-of-concerns", "open-closed", "facade"],
  },
  {
    slug: "open-closed",
    name: "Open/Closed Principle (OCP)",
    category: "principle",
    aka: ["ocp"],
    summary: "Open for extension, closed for modification.",
    intent:
      "You should be able to add new behavior without editing existing, tested " +
      "code — typically by depending on an abstraction and adding a new " +
      "implementation rather than adding another branch to a growing switch.",
    whenToUse: [
      "A switch/if-else grows a new arm every time a variant is added.",
      "New behavior can be expressed as a new implementation of an interface.",
    ],
    tradeoffs: [
      "Premature abstraction for variation that never comes is speculative (YAGNI).",
      "Indirection makes the straight-line path harder to read.",
    ],
    related: ["strategy", "dependency-inversion", "yagni", "factory-method"],
  },
  {
    slug: "liskov-substitution",
    name: "Liskov Substitution Principle (LSP)",
    category: "principle",
    aka: ["lsp"],
    summary: "Subtypes must be usable anywhere their base type is expected.",
    intent:
      "A subclass must honor the base type's contract: no strengthened " +
      "preconditions, no weakened postconditions, no surprising exceptions. If " +
      "callers must check the concrete type, the hierarchy is broken.",
    whenToUse: [
      "A subclass overrides a method to throw 'not supported'.",
      "Callers do `instanceof` checks to special-case a subtype.",
      "The classic Square-extends-Rectangle problem.",
    ],
    tradeoffs: [
      "Sometimes composition beats inheritance — don't force an 'is-a' that isn't.",
    ],
    related: ["composition-over-inheritance", "interface-segregation", "polymorphism"],
  },
  {
    slug: "interface-segregation",
    name: "Interface Segregation Principle (ISP)",
    category: "principle",
    aka: ["isp"],
    summary: "Don't force clients to depend on methods they don't use.",
    intent:
      "Prefer many small, role-specific interfaces over one fat interface. " +
      "Clients then depend only on the operations they actually call, so a " +
      "change to an unrelated method can't ripple into them.",
    whenToUse: [
      "Implementers are forced to stub methods they don't need.",
      "One interface serves several unrelated client roles.",
    ],
    tradeoffs: [
      "Too many micro-interfaces adds ceremony; balance cohesion against granularity.",
    ],
    related: ["single-responsibility", "dependency-inversion"],
  },
  {
    slug: "dependency-inversion",
    name: "Dependency Inversion Principle (DIP)",
    category: "principle",
    aka: ["dip"],
    summary: "Depend on abstractions, not concretions.",
    intent:
      "High-level policy shouldn't depend on low-level detail; both should " +
      "depend on an abstraction. Inject collaborators through an interface so " +
      "the detail (a specific DB, HTTP client, clock) is swappable and testable.",
    whenToUse: [
      "Business logic imports a concrete database/HTTP/file class directly.",
      "You want to unit-test policy without the real dependency.",
    ],
    tradeoffs: [
      "An interface with exactly one impl forever is often needless indirection.",
      "Don't confuse it with a DI framework — the principle needs no container.",
    ],
    related: ["open-closed", "strategy", "abstract-factory", "abstraction"],
  },
  {
    slug: "dry",
    name: "DRY — Don't Repeat Yourself",
    category: "principle",
    aka: ["dont-repeat-yourself"],
    summary: "Every piece of knowledge has one authoritative representation.",
    intent:
      "DRY is about knowledge, not text. Two identical-looking blocks that " +
      "encode the *same* decision should be unified; two that merely look " +
      "alike but change for different reasons should stay apart.",
    whenToUse: [
      "The same business rule is copy-pasted and must be edited in lockstep.",
      "A constant/magic value is duplicated across the codebase.",
    ],
    tradeoffs: [
      "Coupling unrelated code just because it looks similar is worse than duplication.",
      "The 'rule of three' — tolerate two copies; extract on the third.",
    ],
    related: ["single-responsibility", "kiss"],
  },
  {
    slug: "kiss",
    name: "KISS — Keep It Simple",
    category: "principle",
    aka: ["keep-it-simple"],
    summary: "Prefer the simplest design that solves the problem.",
    intent:
      "Complexity is a cost paid on every future read. Favor straightforward, " +
      "boring solutions over clever ones; add structure only when a concrete " +
      "need justifies it.",
    whenToUse: [
      "A design has layers/indirection with no present-day payoff.",
      "A one-liner was replaced by a framework.",
    ],
    tradeoffs: [
      "'Simple' isn't 'easy' — sometimes real simplicity takes design effort.",
    ],
    related: ["yagni", "dry"],
  },
  {
    slug: "yagni",
    name: "YAGNI — You Aren't Gonna Need It",
    category: "principle",
    aka: ["you-arent-gonna-need-it"],
    summary: "Don't build for requirements you don't have yet.",
    intent:
      "Speculative generality is inventory you pay to carry: extra code to " +
      "read, test, and maintain for a future that may never arrive. Build for " +
      "today's requirement and refactor when the real need shows up.",
    whenToUse: [
      "Adding config flags / hooks / abstraction 'just in case'.",
      "Generalizing before a second concrete use case exists.",
    ],
    tradeoffs: [
      "Not a license to ignore obvious, cheap seams that keep options open.",
    ],
    related: ["kiss", "open-closed"],
  },
  {
    slug: "meaningful-names",
    name: "Meaningful Names",
    category: "principle",
    aka: ["intention-revealing-names", "naming", "self-documenting-code"],
    summary: "Names should reveal intent — reach for a word before a comment.",
    intent:
      "A name is the first documentation a reader meets. Prefer intention-" +
      "revealing names that state what a value is or what a function does, so " +
      "the code explains itself without a comment. Single-letter names are fine " +
      "in tiny scopes — loop counters, short lambda parameters, coordinates/math " +
      "— but hide meaning the moment a value outlives a line or two.",
    whenToUse: [
      "A variable needs a comment to explain what it holds.",
      "You reach for `data`, `tmp`, `mgr`, or `x2` because the real name is hard.",
      "A single-letter name is used far from where it was declared.",
    ],
    tradeoffs: [
      "Over-long names (userAccountRepositoryFactoryInstance) hurt readability as much as cryptic ones.",
      "Conventional short names beat forced verbosity — `i` in a for-loop, `e` for an event.",
      "Renaming for clarity is cheap; keep established public/API names stable to avoid churn.",
    ],
    related: ["kiss", "single-responsibility", "separation-of-concerns"],
  },
  {
    slug: "composition-over-inheritance",
    name: "Composition Over Inheritance",
    category: "principle",
    aka: ["favor-composition"],
    summary: "Assemble behavior from parts rather than inheriting it.",
    intent:
      "Inheritance is tight, compile-time coupling to a base class's internals. " +
      "Composing objects (has-a) that delegate to collaborators is more " +
      "flexible, avoids fragile hierarchies, and lets behavior change at runtime.",
    whenToUse: [
      "A hierarchy is deep or exists only to share code.",
      "You need to vary behavior along more than one axis.",
    ],
    tradeoffs: [
      "More small objects and wiring; inheritance is fine for true is-a + polymorphism.",
    ],
    related: ["strategy", "decorator", "liskov-substitution"],
  },
  {
    slug: "law-of-demeter",
    name: "Law of Demeter (Principle of Least Knowledge)",
    category: "principle",
    aka: ["lod", "least-knowledge"],
    summary: "Talk to friends, not strangers — avoid deep object reach-through.",
    intent:
      "A method should only call methods of itself, its parameters, objects it " +
      "creates, and its direct fields. Chains like a.getB().getC().doThing() " +
      "couple you to a structure two objects away; ask the neighbor to do it.",
    whenToUse: [
      "You see train-wreck chains: obj.a().b().c().d().",
      "A change to a distant class breaks callers that never named it.",
    ],
    tradeoffs: [
      "Fluent builders and pipelines are legitimate chains — target reaching, not fluency.",
    ],
    related: ["facade", "single-responsibility"],
  },
  {
    slug: "separation-of-concerns",
    name: "Separation of Concerns",
    category: "principle",
    aka: ["soc"],
    summary: "Keep distinct concerns in distinct places.",
    intent:
      "Partition a system so each part addresses one concern (UI, domain, " +
      "persistence, transport). Concerns can then evolve and be reasoned about " +
      "independently, which is the macro-scale sibling of SRP.",
    whenToUse: [
      "Presentation logic is entangled with business rules or SQL.",
      "You want layers/modules that can be tested and swapped independently.",
    ],
    tradeoffs: [
      "Too many layers for a tiny app is ceremony — match structure to scale.",
    ],
    related: ["single-responsibility", "facade"],
  },
  {
    slug: "encapsulation",
    name: "Encapsulation (OOP pillar)",
    category: "principle",
    aka: ["information-hiding"],
    summary: "Bundle state with behavior and hide the internals.",
    intent:
      "Expose behavior, not data. Keep fields private and mutate them only " +
      "through methods that preserve invariants, so callers depend on a stable " +
      "contract rather than a mutable internal shape.",
    whenToUse: [
      "Public setters let callers put an object into an invalid state.",
      "Invariants are enforced in many call sites instead of one owner.",
    ],
    tradeoffs: [
      "Plain data-transfer objects legitimately have no behavior to hide.",
    ],
    related: ["abstraction", "single-responsibility", "law-of-demeter"],
  },
  {
    slug: "abstraction",
    name: "Abstraction (OOP pillar)",
    category: "principle",
    aka: [],
    summary: "Expose the essential contract; hide the mechanism.",
    intent:
      "Model a thing by what it does, not how. Callers program to an interface " +
      "and stay insulated from implementation churn behind it.",
    whenToUse: [
      "Callers need one concept but several interchangeable implementations.",
      "You want to defer or swap a mechanism (storage, transport).",
    ],
    tradeoffs: [
      "Leaky or premature abstractions add cost without insulation (see YAGNI).",
    ],
    related: ["encapsulation", "dependency-inversion", "polymorphism"],
  },
  {
    slug: "inheritance",
    name: "Inheritance (OOP pillar)",
    category: "principle",
    aka: [],
    summary: "Derive a specialized type from a general one (is-a).",
    intent:
      "Share and specialize behavior via a base type. Powerful for genuine " +
      "is-a relationships that also need polymorphism, but easily abused as a " +
      "code-reuse shortcut — prefer composition when it's only about reuse.",
    whenToUse: [
      "A true is-a relationship where subtypes are substitutable (see LSP).",
      "You want polymorphic dispatch over a family of types.",
    ],
    tradeoffs: [
      "Deep hierarchies are fragile and rigid; reuse alone doesn't justify it.",
    ],
    related: ["polymorphism", "liskov-substitution", "composition-over-inheritance"],
  },
  {
    slug: "polymorphism",
    name: "Polymorphism (OOP pillar)",
    category: "principle",
    aka: [],
    summary: "One interface, many interchangeable implementations.",
    intent:
      "Callers invoke an operation on an abstraction and the right concrete " +
      "behavior runs, chosen by type. It's the mechanism that lets OCP, " +
      "Strategy, and dependency inversion eliminate conditionals.",
    whenToUse: [
      "Behavior varies by a type/kind and you'd otherwise switch on it.",
      "You want to add variants without touching callers.",
    ],
    tradeoffs: [
      "Dispatch you can't see can obscure control flow; keep the set discoverable.",
    ],
    related: ["open-closed", "strategy", "abstraction", "inheritance"],
  },
];

/* ------------------------------------------------------------------ *
 * GoF patterns
 * ------------------------------------------------------------------ */

export const PATTERNS: Concept[] = [
  /* ---------- Creational ---------- */
  {
    slug: "factory-method",
    name: "Factory Method",
    category: "creational",
    summary: "Let subclasses decide which concrete product to instantiate.",
    intent:
      "Define an interface for creating an object but defer the choice of " +
      "concrete class to subclasses, so the creator depends only on the product " +
      "abstraction.",
    whenToUse: [
      "A class can't anticipate the concrete type it must create.",
      "You want subclasses to specify the objects the base class creates.",
    ],
    tradeoffs: [
      "Introduces a parallel Creator hierarchy just to vary one instantiation.",
    ],
    related: ["abstract-factory", "template-method", "open-closed"],
    collaboration:
      "Creator calls its own factoryMethod(); a ConcreteCreator overrides it to return a ConcreteProduct.",
    participants: [
      { role: "Product", kind: "interface", members: ["operation()"], note: "What the factory returns." },
      { role: "ConcreteProduct", kind: "class", members: ["operation()"], note: "implements Product" },
      {
        role: "Creator",
        kind: "abstract",
        members: ["factoryMethod(): Product  // overridden by subclasses", "someOperation()  // uses factoryMethod()"],
      },
      { role: "ConcreteCreator", kind: "class", members: ["factoryMethod(): Product { return new ConcreteProduct() }"], note: "extends Creator" },
    ],
  },
  {
    slug: "abstract-factory",
    name: "Abstract Factory",
    category: "creational",
    aka: ["kit"],
    summary: "Create families of related objects without naming their classes.",
    intent:
      "Provide an interface for creating whole families of related products so " +
      "a client can switch the entire family (e.g. a UI theme) by swapping one " +
      "factory.",
    whenToUse: [
      "Products come in interchangeable families that must stay consistent.",
      "You want to enforce that related products are used together.",
    ],
    tradeoffs: [
      "Adding a new product *kind* means changing every factory interface + impl.",
    ],
    related: ["factory-method", "singleton", "dependency-inversion"],
    collaboration:
      "Client holds an AbstractFactory and asks it for products; a ConcreteFactory returns a matching family.",
    participants: [
      { role: "AbstractFactory", kind: "interface", members: ["createProductA(): AbstractProductA", "createProductB(): AbstractProductB"] },
      { role: "ConcreteFactory1", kind: "class", members: ["createProductA(): AbstractProductA", "createProductB(): AbstractProductB"], note: "implements AbstractFactory" },
      { role: "AbstractProductA", kind: "interface", members: ["useA()"] },
      { role: "AbstractProductB", kind: "interface", members: ["useB()"] },
      { role: "Client", kind: "class", members: ["-factory: AbstractFactory", "run()  // uses factory.createProductA()"] },
    ],
  },
  {
    slug: "builder",
    name: "Builder",
    category: "creational",
    summary: "Construct a complex object step by step.",
    intent:
      "Separate the construction of a complex object from its representation so " +
      "the same steps can build different results, avoiding telescoping " +
      "constructors.",
    whenToUse: [
      "An object needs many optional parts / a long parameter list.",
      "Construction must happen in stages or produce different representations.",
    ],
    tradeoffs: [
      "More moving parts than a plain constructor for simple objects.",
    ],
    related: ["abstract-factory", "kiss"],
    collaboration:
      "Director drives a Builder through build steps; the ConcreteBuilder accumulates state and returns the Product.",
    participants: [
      { role: "Product", kind: "class", members: ["-parts: string[]"] },
      { role: "Builder", kind: "interface", members: ["reset()", "buildPartA()", "buildPartB()", "getResult(): Product"] },
      { role: "ConcreteBuilder", kind: "class", members: ["reset()", "buildPartA()", "buildPartB()", "getResult(): Product"], note: "implements Builder" },
      { role: "Director", kind: "class", members: ["-builder: Builder", "construct()  // calls buildPartA(); buildPartB()"] },
    ],
  },
  {
    slug: "prototype",
    name: "Prototype",
    category: "creational",
    aka: ["clone"],
    summary: "Create new objects by cloning an existing instance.",
    intent:
      "When creation is expensive or the concrete class is decided at runtime, " +
      "copy a pre-built prototype instead of constructing from scratch.",
    whenToUse: [
      "Object setup is costly and many near-identical copies are needed.",
      "The set of concrete types is fixed at runtime, not compile time.",
    ],
    tradeoffs: [
      "Deep vs. shallow copy of graphs is subtle and easy to get wrong.",
    ],
    related: ["abstract-factory", "memento"],
    collaboration: "Client calls clone() on a Prototype to get a new, independent instance.",
    participants: [
      { role: "Prototype", kind: "interface", members: ["clone(): Prototype"] },
      { role: "ConcretePrototype", kind: "class", members: ["-state", "clone(): Prototype  // copy self"], note: "implements Prototype" },
    ],
  },
  {
    slug: "singleton",
    name: "Singleton",
    category: "creational",
    summary: "Ensure a class has exactly one instance with a global access point.",
    intent:
      "Guarantee a single shared instance and provide a way to reach it. Use " +
      "sparingly — it's global mutable state in disguise and complicates " +
      "testing and concurrency.",
    whenToUse: [
      "Exactly one instance must coordinate access to a shared resource.",
    ],
    tradeoffs: [
      "Hidden global state, hard to test, thread-safety pitfalls — often an anti-pattern.",
      "Prefer passing one instance via dependency injection instead.",
    ],
    related: ["abstract-factory", "dependency-inversion"],
    collaboration: "Callers use Singleton.getInstance(); the constructor is private so no other instance can exist.",
    participants: [
      {
        role: "Singleton",
        kind: "class",
        members: ["-static instance: Singleton", "-constructor()  // private", "+static getInstance(): Singleton", "+businessMethod()"],
      },
    ],
  },

  /* ---------- Structural ---------- */
  {
    slug: "adapter",
    name: "Adapter",
    category: "structural",
    aka: ["wrapper"],
    summary: "Make an incompatible interface fit the one a client expects.",
    intent:
      "Wrap an existing class so its interface matches what the client needs, " +
      "letting otherwise-incompatible types work together without changing " +
      "either side.",
    whenToUse: [
      "You want to reuse a class whose interface doesn't match your code.",
      "Integrating a third-party/legacy API behind your own contract.",
    ],
    tradeoffs: [
      "Another layer to trace through; overuse hides a mismatched design.",
    ],
    related: ["facade", "decorator", "bridge"],
    collaboration: "Adapter implements Target and translates each call into one on the wrapped Adaptee.",
    participants: [
      { role: "Target", kind: "interface", members: ["request()"], note: "What the client expects." },
      { role: "Adaptee", kind: "class", members: ["specificRequest()"], note: "Existing, incompatible class." },
      { role: "Adapter", kind: "class", members: ["-adaptee: Adaptee", "request()  // -> adaptee.specificRequest()"], note: "implements Target" },
    ],
  },
  {
    slug: "bridge",
    name: "Bridge",
    category: "structural",
    summary: "Split an abstraction from its implementation so both vary freely.",
    intent:
      "Decouple a hierarchy of abstractions from a hierarchy of implementations " +
      "by composition, avoiding a combinatorial explosion of subclasses.",
    whenToUse: [
      "Behavior varies along two independent dimensions (shape × renderer).",
      "You'd otherwise get an M×N subclass explosion.",
    ],
    tradeoffs: [
      "Up-front indirection; overkill when only one dimension actually varies.",
    ],
    related: ["abstract-factory", "adapter", "composition-over-inheritance"],
    collaboration: "Abstraction delegates the work to its Implementor; each side subclasses independently.",
    participants: [
      { role: "Abstraction", kind: "class", members: ["-impl: Implementor", "operation()  // delegates to impl"] },
      { role: "RefinedAbstraction", kind: "class", members: ["operation()"], note: "extends Abstraction" },
      { role: "Implementor", kind: "interface", members: ["operationImpl()"] },
      { role: "ConcreteImplementor", kind: "class", members: ["operationImpl()"], note: "implements Implementor" },
    ],
  },
  {
    slug: "composite",
    name: "Composite",
    category: "structural",
    summary: "Treat individual objects and compositions uniformly (part-whole trees).",
    intent:
      "Compose objects into tree structures and let clients treat leaves and " +
      "branches through the same interface, so recursive structures are handled " +
      "without special-casing.",
    whenToUse: [
      "You have a part-whole hierarchy (files/folders, UI trees).",
      "Clients should ignore the difference between one item and a group.",
    ],
    tradeoffs: [
      "A uniform interface can make leaf-invalid operations (add/remove) awkward.",
    ],
    related: ["decorator", "iterator", "visitor"],
    collaboration: "Composite forwards operations to its children; a Leaf just does the work.",
    participants: [
      { role: "Component", kind: "interface", members: ["operation()", "add(c: Component)", "remove(c: Component)"] },
      { role: "Leaf", kind: "class", members: ["operation()"], note: "implements Component; no children" },
      { role: "Composite", kind: "class", members: ["-children: Component[]", "operation()  // forwards to each child", "add(c)", "remove(c)"], note: "implements Component" },
    ],
  },
  {
    slug: "decorator",
    name: "Decorator",
    category: "structural",
    aka: ["wrapper"],
    summary: "Add responsibilities to an object dynamically by wrapping it.",
    intent:
      "Attach behavior to an object at runtime by wrapping it in another object " +
      "with the same interface — a flexible alternative to subclassing for " +
      "extension.",
    whenToUse: [
      "You need to add/remove responsibilities without a subclass explosion.",
      "Behaviors should be stackable and chosen at runtime.",
    ],
    tradeoffs: [
      "Many small wrappers; deep stacks are hard to debug and identity-sensitive.",
    ],
    related: ["composite", "adapter", "composition-over-inheritance", "open-closed"],
    collaboration: "Decorator implements Component, holds a wrapped Component, and adds behavior around delegating to it.",
    participants: [
      { role: "Component", kind: "interface", members: ["operation()"] },
      { role: "ConcreteComponent", kind: "class", members: ["operation()"], note: "implements Component" },
      { role: "Decorator", kind: "abstract", members: ["-wrappee: Component", "operation()  // -> wrappee.operation()"], note: "implements Component" },
      { role: "ConcreteDecorator", kind: "class", members: ["operation()  // extra behavior + super"], note: "extends Decorator" },
    ],
  },
  {
    slug: "facade",
    name: "Facade",
    category: "structural",
    summary: "Provide one simple entry point over a complex subsystem.",
    intent:
      "Offer a unified, high-level interface that hides the wiring of a " +
      "subsystem, giving clients an easy default path while leaving the " +
      "internals reachable for advanced use.",
    whenToUse: [
      "A subsystem is complex and most clients want a simple common path.",
      "You want to decouple clients from many internal classes.",
    ],
    tradeoffs: [
      "Can become a god-object if it accretes logic instead of just delegating.",
    ],
    related: ["adapter", "mediator", "separation-of-concerns", "law-of-demeter"],
    collaboration: "Facade delegates client requests to the appropriate subsystem classes and orchestrates them.",
    participants: [
      { role: "Facade", kind: "class", members: ["-a: SubsystemA", "-b: SubsystemB", "operation()  // orchestrates a + b"] },
      { role: "SubsystemA", kind: "class", members: ["opA()"] },
      { role: "SubsystemB", kind: "class", members: ["opB()"] },
    ],
  },
  {
    slug: "flyweight",
    name: "Flyweight",
    category: "structural",
    summary: "Share fine-grained objects to fit many of them in memory.",
    intent:
      "Split state into shared intrinsic state (stored once in a flyweight) and " +
      "context-specific extrinsic state (passed in), so huge numbers of objects " +
      "cost little memory.",
    whenToUse: [
      "You need a very large number of similar objects (glyphs, tiles, particles).",
      "Most object state can be shared and the rest passed at call time.",
    ],
    tradeoffs: [
      "Trades CPU (passing extrinsic state) for memory; adds real complexity.",
    ],
    related: ["factory-method", "singleton", "composite"],
    collaboration: "FlyweightFactory returns a shared Flyweight per key; callers pass extrinsic state into operation().",
    participants: [
      { role: "Flyweight", kind: "interface", members: ["operation(extrinsicState)"] },
      { role: "ConcreteFlyweight", kind: "class", members: ["-intrinsicState  // shared", "operation(extrinsicState)"], note: "implements Flyweight" },
      { role: "FlyweightFactory", kind: "class", members: ["-pool: Map<key, Flyweight>", "getFlyweight(key): Flyweight  // create-if-absent"] },
    ],
  },
  {
    slug: "proxy",
    name: "Proxy",
    category: "structural",
    summary: "Stand in for another object to control access to it.",
    intent:
      "Provide a surrogate with the same interface as the real object to add " +
      "access control, lazy loading, caching, remoting, or logging without " +
      "changing the real subject or its clients.",
    whenToUse: [
      "You need lazy init, caching, access checks, or a remote stand-in.",
      "Cross-cutting access concerns shouldn't live in the real object.",
    ],
    tradeoffs: [
      "Extra indirection and possible latency; can hide surprising behavior.",
    ],
    related: ["decorator", "adapter", "facade"],
    collaboration: "Proxy implements Subject and forwards to the RealSubject after doing its access/lazy/caching work.",
    participants: [
      { role: "Subject", kind: "interface", members: ["request()"] },
      { role: "RealSubject", kind: "class", members: ["request()  // the real work"], note: "implements Subject" },
      { role: "Proxy", kind: "class", members: ["-real: RealSubject", "request()  // checks/caches, then real.request()"], note: "implements Subject" },
    ],
  },

  /* ---------- Behavioral ---------- */
  {
    slug: "chain-of-responsibility",
    name: "Chain of Responsibility",
    category: "behavioral",
    aka: ["cor", "chain"],
    summary: "Pass a request along a chain until a handler deals with it.",
    intent:
      "Decouple sender from receiver by giving several objects a chance to " +
      "handle a request; each either handles it or forwards it to the next.",
    whenToUse: [
      "More than one object may handle a request and the handler isn't known upfront.",
      "Middleware / event-handling / approval pipelines.",
    ],
    tradeoffs: [
      "No guarantee a request is handled; chains can be hard to trace.",
    ],
    related: ["command", "composite", "decorator"],
    collaboration: "Each Handler holds a next handler; it handles the request or delegates to next.",
    participants: [
      { role: "Handler", kind: "interface", members: ["setNext(h: Handler): Handler", "handle(request)"] },
      { role: "BaseHandler", kind: "abstract", members: ["-next: Handler", "setNext(h)", "handle(request)  // -> next?.handle(request)"], note: "implements Handler" },
      { role: "ConcreteHandler", kind: "class", members: ["handle(request)  // if canHandle: do it; else super"], note: "extends BaseHandler" },
    ],
  },
  {
    slug: "command",
    name: "Command",
    category: "behavioral",
    aka: ["action", "transaction"],
    summary: "Turn a request into a first-class object.",
    intent:
      "Encapsulate a request as an object so you can parameterize, queue, log, " +
      "and undo operations, decoupling the invoker from the receiver that does " +
      "the work.",
    whenToUse: [
      "You need undo/redo, queuing, scheduling, or logging of operations.",
      "You want to parameterize objects with an action to run later.",
    ],
    tradeoffs: [
      "A class per operation; simple direct calls don't need it.",
    ],
    related: ["chain-of-responsibility", "memento", "strategy"],
    collaboration: "Invoker triggers a Command's execute(); the Command calls the Receiver that performs the action.",
    participants: [
      { role: "Command", kind: "interface", members: ["execute()", "undo()  // optional: only when supporting undo/redo"] },
      { role: "ConcreteCommand", kind: "class", members: ["-receiver: Receiver", "execute()  // -> receiver.action()", "undo()"], note: "implements Command" },
      { role: "Receiver", kind: "class", members: ["action()  // the real work"] },
      { role: "Invoker", kind: "class", members: ["-command: Command", "invoke()  // -> command.execute()"] },
    ],
  },
  {
    slug: "interpreter",
    name: "Interpreter",
    category: "behavioral",
    summary: "Represent a small language's grammar and evaluate its sentences.",
    intent:
      "Given a simple, stable language, model each grammar rule as a class and " +
      "interpret expressions by walking the resulting tree.",
    whenToUse: [
      "A simple, well-defined grammar (filters, rules, arithmetic) recurs.",
      "The grammar is stable and efficiency isn't critical.",
    ],
    tradeoffs: [
      "A class per rule doesn't scale to complex grammars — use a real parser.",
    ],
    related: ["composite", "visitor"],
    collaboration: "Each Expression interprets itself against a Context; nonterminals recurse into sub-expressions.",
    participants: [
      { role: "Expression", kind: "interface", members: ["interpret(context): value"] },
      { role: "TerminalExpression", kind: "class", members: ["interpret(context)"], note: "implements Expression" },
      { role: "NonterminalExpression", kind: "class", members: ["-children: Expression[]", "interpret(context)  // combines children"], note: "implements Expression" },
      { role: "Context", kind: "class", members: ["-variables"] },
    ],
  },
  {
    slug: "iterator",
    name: "Iterator",
    category: "behavioral",
    aka: ["cursor"],
    summary: "Traverse a collection without exposing its representation.",
    intent:
      "Provide a uniform way to walk elements of an aggregate sequentially " +
      "without revealing whether it's an array, tree, or list underneath.",
    whenToUse: [
      "You want a standard traversal API decoupled from the container's shape.",
      "Multiple simultaneous or alternative traversals are needed.",
    ],
    tradeoffs: [
      "Most languages provide iterators natively — rarely hand-rolled today.",
    ],
    related: ["composite", "factory-method"],
    collaboration: "Aggregate creates an Iterator; the client advances it via hasNext()/next().",
    participants: [
      { role: "Iterator", kind: "interface", members: ["hasNext(): boolean", "next(): T"] },
      { role: "Aggregate", kind: "interface", members: ["createIterator(): Iterator"] },
      { role: "ConcreteIterator", kind: "class", members: ["-collection", "-cursor", "hasNext()", "next()"], note: "implements Iterator" },
      { role: "ConcreteAggregate", kind: "class", members: ["createIterator(): Iterator"], note: "implements Aggregate" },
    ],
  },
  {
    slug: "mediator",
    name: "Mediator",
    category: "behavioral",
    aka: ["controller"],
    summary: "Centralize how a set of objects interact.",
    intent:
      "Replace many-to-many object references with a hub: colleagues talk to " +
      "the mediator, not each other, reducing coupling and taming interaction " +
      "logic.",
    whenToUse: [
      "Objects reference each other in a tangled web (e.g. form widgets).",
      "Interaction logic is scattered and hard to reuse.",
    ],
    tradeoffs: [
      "The mediator can swell into a god-object holding all the logic.",
    ],
    related: ["facade", "observer", "command"],
    collaboration: "A Colleague notifies its Mediator of events; the ConcreteMediator coordinates the other colleagues.",
    participants: [
      { role: "Mediator", kind: "interface", members: ["notify(sender, event)"] },
      { role: "ConcreteMediator", kind: "class", members: ["-colleagues", "notify(sender, event)  // coordinates"], note: "implements Mediator" },
      { role: "Colleague", kind: "class", members: ["-mediator: Mediator", "changed()  // -> mediator.notify(this, ...)"] },
    ],
  },
  {
    slug: "memento",
    name: "Memento",
    category: "behavioral",
    aka: ["token", "snapshot"],
    summary: "Capture and restore an object's state without breaking encapsulation.",
    intent:
      "Externalize a snapshot of an object's internal state into an opaque " +
      "memento so it can be restored later (undo), without exposing the " +
      "object's internals to the caretaker.",
    whenToUse: [
      "You need undo/rollback or checkpoints of an object's state.",
    ],
    tradeoffs: [
      "Snapshots can be memory-heavy; defining what to save is fiddly.",
    ],
    related: ["command", "prototype"],
    collaboration: "Originator writes its state into a Memento; a Caretaker stores mementos and hands one back to restore().",
    participants: [
      { role: "Originator", kind: "class", members: ["-state", "save(): Memento", "restore(m: Memento)"] },
      { role: "Memento", kind: "class", members: ["-state  // opaque to Caretaker", "getState()  // Originator-only"] },
      { role: "Caretaker", kind: "class", members: ["-history: Memento[]", "backup()", "undo()"] },
    ],
  },
  {
    slug: "observer",
    name: "Observer",
    category: "behavioral",
    aka: ["publish-subscribe", "pubsub", "dependents"],
    summary: "Notify many dependents automatically when a subject changes.",
    intent:
      "Define a one-to-many dependency so that when one object changes state, " +
      "all its observers are notified and updated — the backbone of event and " +
      "reactive systems.",
    whenToUse: [
      "A change to one object requires updating an unknown number of others.",
      "You want loose coupling between an event source and its listeners.",
    ],
    tradeoffs: [
      "Update storms, ordering surprises, and leaks from un-detached observers.",
    ],
    related: ["mediator", "state", "separation-of-concerns"],
    collaboration: "Subject keeps a list of Observers and calls update() on each when it changes.",
    participants: [
      { role: "Subject", kind: "class", members: ["-observers: Observer[]", "attach(o)", "detach(o)", "notify()  // for each o: o.update(this)"] },
      { role: "Observer", kind: "interface", members: ["update(subject)"] },
      { role: "ConcreteObserver", kind: "class", members: ["update(subject)  // react to change"], note: "implements Observer" },
    ],
  },
  {
    slug: "state",
    name: "State",
    category: "behavioral",
    summary: "Let an object change its behavior when its internal state changes.",
    intent:
      "Encapsulate state-specific behavior in separate state objects and " +
      "delegate to the current one, so the object appears to change class — " +
      "replacing sprawling state conditionals.",
    whenToUse: [
      "Behavior depends on state and there are many state-dependent conditionals.",
      "State transitions form a clear machine.",
    ],
    tradeoffs: [
      "A class per state; overkill for two trivial states.",
    ],
    related: ["strategy", "observer"],
    collaboration: "Context delegates to its current State; a state can switch the Context to another state.",
    participants: [
      { role: "Context", kind: "class", members: ["-state: State", "request()  // -> state.handle(this)", "setState(s: State)"] },
      { role: "State", kind: "interface", members: ["handle(context)"] },
      { role: "ConcreteState", kind: "class", members: ["handle(context)  // behavior + maybe context.setState(...)"], note: "implements State" },
    ],
  },
  {
    slug: "strategy",
    name: "Strategy",
    category: "behavioral",
    aka: ["policy"],
    summary: "Make a family of algorithms interchangeable at runtime.",
    intent:
      "Define each algorithm in its own class behind a common interface and let " +
      "the context pick one at runtime — the go-to way to satisfy OCP for " +
      "varying behavior.",
    whenToUse: [
      "You have several interchangeable ways to do one thing (sort, pricing, routing).",
      "You'd otherwise select behavior with a conditional.",
    ],
    tradeoffs: [
      "Clients must know the strategies to choose; extra objects for trivial cases.",
    ],
    related: ["state", "open-closed", "dependency-inversion", "command"],
    collaboration: "Context holds a Strategy and calls execute() on it; swap the strategy to change behavior.",
    participants: [
      { role: "Strategy", kind: "interface", members: ["execute(data): result"] },
      { role: "ConcreteStrategy", kind: "class", members: ["execute(data): result"], note: "implements Strategy" },
      { role: "Context", kind: "class", members: ["-strategy: Strategy", "setStrategy(s)", "doWork()  // -> strategy.execute(...)"] },
    ],
  },
  {
    slug: "template-method",
    name: "Template Method",
    category: "behavioral",
    summary: "Fix an algorithm's skeleton, let subclasses fill in the steps.",
    intent:
      "Define the invariant structure of an algorithm in a base method and " +
      "defer specific steps to subclasses, so the overall flow is shared and " +
      "only the varying steps are overridden.",
    whenToUse: [
      "Several algorithms share a structure but differ in a few steps.",
      "You want to localize the common flow and forbid changing its order.",
    ],
    tradeoffs: [
      "Inheritance-based — less flexible than Strategy's composition.",
    ],
    related: ["strategy", "factory-method", "inheritance"],
    collaboration: "The base templateMethod() calls primitive steps; subclasses override the steps, not the flow.",
    participants: [
      { role: "AbstractClass", kind: "abstract", members: ["templateMethod()  // final: step1(); step2()", "step1()  // abstract", "step2()  // abstract"] },
      { role: "ConcreteClass", kind: "class", members: ["step1()", "step2()"], note: "extends AbstractClass" },
    ],
  },
  {
    slug: "visitor",
    name: "Visitor",
    category: "behavioral",
    summary: "Add operations to an object structure without changing its classes.",
    intent:
      "Represent an operation to perform on the elements of an object structure. " +
      "Visitor lets you add new operations by adding a visitor class instead of " +
      "editing every element type.",
    whenToUse: [
      "A stable set of element types needs many unrelated operations.",
      "Operations should live together, separate from the element classes.",
    ],
    tradeoffs: [
      "Adding a new *element* type forces changing every visitor (dual to OCP).",
      "Double-dispatch boilerplate; breaks element encapsulation somewhat.",
    ],
    related: ["composite", "interpreter", "iterator"],
    collaboration: "Element.accept(visitor) calls back visitor.visitElementX(this) — double dispatch selects the operation.",
    participants: [
      { role: "Visitor", kind: "interface", members: ["visitElementA(a: ElementA)", "visitElementB(b: ElementB)"] },
      { role: "ConcreteVisitor", kind: "class", members: ["visitElementA(a)", "visitElementB(b)"], note: "implements Visitor" },
      { role: "Element", kind: "interface", members: ["accept(v: Visitor)"] },
      { role: "ElementA", kind: "class", members: ["accept(v)  // -> v.visitElementA(this)"], note: "implements Element" },
      { role: "ElementB", kind: "class", members: ["accept(v)  // -> v.visitElementB(this)"], note: "implements Element — a second element type is what makes double dispatch worthwhile" },
    ],
  },
];

/* ------------------------------------------------------------------ *
 * Lookup + rendering
 * ------------------------------------------------------------------ */

export const ALL: Concept[] = [...PRINCIPLES, ...PATTERNS];

/** The five SOLID principles, by slug. */
const SOLID_SLUGS = new Set<string>([
  "single-responsibility",
  "open-closed",
  "liskov-substitution",
  "interface-segregation",
  "dependency-inversion",
]);

/** The four classic OOP pillars, by slug. */
const OOP_SLUGS = new Set<string>([
  "encapsulation",
  "abstraction",
  "inheritance",
  "polymorphism",
]);

/**
 * Which sub-group a concept belongs to. Patterns and the remaining principles
 * (DRY, KISS, YAGNI, composition-over-inheritance, law-of-demeter,
 * separation-of-concerns) are "general". Drives the "solid"/"oop" filters on
 * the list_catalog tool.
 */
export function principleGroup(concept: Concept): PrincipleGroup {
  if (SOLID_SLUGS.has(concept.slug)) return "solid";
  if (OOP_SLUGS.has(concept.slug)) return "oop";
  return "general";
}

/** Normalize a query for fuzzy matching: lowercase, strip non-alphanumerics. */
function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

const CONCEPTS_BY_KEY = new Map<string, Concept>();
for (const concept of ALL) {
  CONCEPTS_BY_KEY.set(normalize(concept.slug), concept);
  CONCEPTS_BY_KEY.set(normalize(concept.name), concept);
  for (const alias of concept.aka ?? []) CONCEPTS_BY_KEY.set(normalize(alias), concept);
}

/**
 * Resolve a concept by slug, display name, alias, or a close-enough query
 * (e.g. "SRP", "single responsibility", "factory"). Returns null if nothing
 * matches confidently.
 */
export function findConcept(query: string): Concept | null {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return null;
  const exactMatch = CONCEPTS_BY_KEY.get(normalizedQuery);
  if (exactMatch) return exactMatch;
  // Too short for a safe fuzzy match — an exact hit was the only chance.
  if (normalizedQuery.length < 3) return null;

  // Score each concept by its best key overlap. Two directions:
  //   • query is a substring of a key  ("factory" ⊂ "factorymethod") — strong.
  //   • key is a substring of the query ("factorymethod" ⊂ "factory method
  //     pattern") — weaker, and only for keys long enough (≥5) to be
  //     meaningful, so short aliases like "dry"/"soc" can't match unrelated
  //     long queries.
  let best: { concept: Concept; score: number } | null = null;
  for (const concept of ALL) {
    const keys = [concept.slug, concept.name, ...(concept.aka ?? [])]
      .map(normalize)
      .filter((key) => key.length >= 3);
    let score = Infinity;
    for (const key of keys) {
      if (key.includes(normalizedQuery)) {
        score = Math.min(score, key.length - normalizedQuery.length);
      } else if (key.length >= 5 && normalizedQuery.includes(key)) {
        score = Math.min(score, 100 + (normalizedQuery.length - key.length));
      }
    }
    if (score === Infinity) continue;
    if (
      !best ||
      score < best.score ||
      (score === best.score && concept.name.length < best.concept.name.length)
    ) {
      best = { concept, score };
    }
  }
  return best?.concept ?? null;
}

export const CATEGORY_LABEL: Record<Category, string> = {
  principle: "Principle",
  creational: "Creational pattern",
  structural: "Structural pattern",
  behavioral: "Behavioral pattern",
};

/** Render a single concept as Markdown (used by explain_concept + resources). */
export function conceptToMarkdown(concept: Concept): string {
  const lines: string[] = [];
  lines.push(`## ${concept.name}`);
  lines.push(`_${CATEGORY_LABEL[concept.category]}_ — ${concept.summary}`);
  lines.push("");
  lines.push(concept.intent);
  lines.push("");
  lines.push("**When to use**");
  for (const useCase of concept.whenToUse) lines.push(`- ${useCase}`);
  lines.push("");
  lines.push("**Trade-offs & cautions**");
  for (const tradeoff of concept.tradeoffs) lines.push(`- ${tradeoff}`);
  if (concept.collaboration) {
    lines.push("");
    lines.push(`**How it works** — ${concept.collaboration}`);
  }
  if (concept.participants?.length) {
    lines.push("");
    lines.push("**Participants**");
    for (const participant of concept.participants) {
      lines.push(
        `- \`${participant.role}\` (${participant.kind})${participant.note ? ` — ${participant.note}` : ""}`
      );
    }
  }
  if (concept.related?.length) {
    lines.push("");
    lines.push(`**See also**: ${concept.related.join(", ")}`);
  }
  return lines.join("\n");
}

/** One-line catalog entry: "`slug` — Name: summary". */
export function conceptLine(concept: Concept): string {
  return `\`${concept.slug}\` — ${concept.name}: ${concept.summary}`;
}

/** Render the principles reference (design://principles). */
export function principlesMarkdown(): string {
  return (
    "# Software-Design Principles\n\n" +
    "SOLID, the OOP pillars, and the day-to-day heuristics (DRY, KISS, YAGNI, …). " +
    "These are judgment tools, not lint rules — apply them where they earn their keep.\n\n" +
    PRINCIPLES.map(conceptToMarkdown).join("\n\n---\n\n") +
    "\n"
  );
}

/** Render the GoF pattern catalog (design://patterns). */
export function patternsMarkdown(): string {
  const categories: Category[] = ["creational", "structural", "behavioral"];
  const sections = categories.map((category) => {
    const patternsInCategory = PATTERNS.filter((pattern) => pattern.category === category);
    const heading = category[0].toUpperCase() + category.slice(1);
    return (
      `# ${heading} patterns\n\n` +
      patternsInCategory.map(conceptToMarkdown).join("\n\n---\n\n")
    );
  });
  return (
    "# Gang-of-Four Design Patterns (23)\n\n" +
    "Named, reusable solutions to recurring design problems. A pattern is a " +
    "vocabulary, not a goal — reach for one only when the problem it solves is " +
    "actually present.\n\n" +
    sections.join("\n\n") +
    "\n"
  );
}
