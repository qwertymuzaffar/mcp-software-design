// Minimal end-to-end check: spawn the built stdio server and exercise it.
// Run with `npm run test:client` (after `npm run build`).
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: "node",
  args: ["build/index.js"],
});
const client = new Client({ name: "test-client", version: "1.0.0" });
await client.connect(transport);

const { tools } = await client.listTools();
console.log("TOOLS:", tools.map((t) => t.name).join(", "));

const { resources } = await client.listResources();
console.log("RESOURCES:", resources.map((r) => r.uri).join(", "));

const { prompts } = await client.listPrompts();
console.log("PROMPTS:", prompts.map((p) => p.name).join(", "));

const explained = await client.callTool({
  name: "explain_concept",
  arguments: { name: "SRP" },
});
console.log("\n[explain_concept SRP]");
console.log(explained.content[0].text.split("\n").slice(0, 3).join("\n"));

const scaffold = await client.callTool({
  name: "scaffold_pattern",
  arguments: { pattern: "strategy", names: { Strategy: "PricingRule", Context: "Checkout" } },
});
console.log("\n[scaffold_pattern strategy]");
console.log(scaffold.content[0].text);

const smells = await client.callTool({
  name: "check_smells",
  arguments: { code: "function f(a, b, c, d, e, f) {\n  return a;\n}" },
});
console.log("\n[check_smells — long parameter list]");
console.log(smells.content[0].text);

const review = await client.getPrompt({
  name: "review_design",
  arguments: { code: "class God { doA(){} doB(){} doC(){} }", focus: "SOLID" },
});
console.log("\n[prompt review_design — first 120 chars]");
console.log(review.messages[0].content.text.slice(0, 120) + "…");

await client.close();
console.log("\n✅ e2e client ok");
