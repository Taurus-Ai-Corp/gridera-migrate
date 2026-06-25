#!/usr/bin/env node

/**
 * CLI for GRIDERA Migrate — scaffolds a project with config + example.
 * Usage: npx @gridera/migrate init
 */

import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const BOLD = "\x1b[1m";
const GREEN = "\x1b[32m";
const CYAN = "\x1b[36m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";
const YELLOW = "\x1b[33m";

function log(msg: string) {
  console.log(msg);
}

function banner() {
  log("");
  log(`${BOLD}${CYAN}  ╔═══════════════════════════════════════╗${RESET}`);
  log(`${BOLD}${CYAN}  ║        🐝  GRIDERA Migrate  🐝          ║${RESET}`);
  log(`${BOLD}${CYAN}  ║  Ephemeral AI Agents + PQC + Hedera   ║${RESET}`);
  log(`${BOLD}${CYAN}  ╚═══════════════════════════════════════╝${RESET}`);
  log("");
}

const EXAMPLE_TS = `import { SwarmSpawner, type ModelExecutor } from "@gridera/migrate";

// Bring your own LLM — replace this with your provider
const executor: ModelExecutor = async (agent, config) => {
  // Example: Anthropic
  // const response = await anthropic.messages.create({
  //   model: config.model,
  //   messages: [{ role: "user", content: agent.task }],
  // });
  // return response.content[0].text;

  // Default: echo executor for testing
  return { result: \`Processed: \${agent.task}\`, model: config.model };
};

const spawner = new SwarmSpawner({
  executor,
  enableAuditTrail: false, // set true + HEDERA_OPERATOR_ID for blockchain audit
  // licenseKey: "...",    // Pro tier — get at migrate.gridera.net/pricing
});

async function main() {
  console.log("Spawning 3 agents in parallel...\\n");

  const result = await spawner.spawn({
    tasks: [
      { id: "analyze", description: "Analyze code for security vulnerabilities", input: {}, modelTier: "fast" },
      { id: "review",  description: "Review code style and best practices", input: {}, modelTier: "fast" },
      { id: "test",    description: "Generate comprehensive unit tests", input: {}, modelTier: "fast" },
    ],
    strategy: "parallel",
  });

  console.log(\`Results: \${result.successCount}/\${result.totalAgents} agents completed\`);
  console.log(\`Success rate: \${(result.successRate * 100).toFixed(0)}%\`);

  for (const r of result.results) {
    console.log(\`  [\${r.status}] \${r.agentId.slice(0, 25)}... — \${r.duration}ms\`);
  }

  spawner.destroy();
}

main().catch(console.error);
`;

const EXAMPLE_PQC = `import {
  SwarmSpawner,
  PQCIdentityManager,
  LicenseManager,
} from "@gridera/migrate";

async function main() {
// Generate a PQC key pair (do this ONCE, store securely)
const keyPair = LicenseManager.generateKeyPair();
console.log("PQC Key Pair generated (ML-DSA-65 / NIST FIPS 204)");
console.log(\`  Public key: \${keyPair.publicKey.length} bytes\`);
console.log(\`  Secret key: \${keyPair.secretKey.length} bytes\\n\`);

// Create a license key (billing server would do this)
const issuer = LicenseManager.fromKeyPair(keyPair.secretKey, keyPair.publicKey);
const licenseKey = issuer.generate({
  tier: "pro",
  org: "demo",
  durationDays: 30,
  features: ["pqc-signing", "mainnet"],
});
console.log("License key generated (ML-DSA-65 signed)");
console.log(\`  Length: \${licenseKey.length} chars\\n\`);

// Verify the license (consumer side — only needs public key)
const verifier = LicenseManager.fromPublicKey(keyPair.publicKey);
const payload = verifier.verify(licenseKey);
console.log("License verified successfully:");
console.log(\`  Tier: \${payload.tier}\`);
console.log(\`  Org: \${payload.org}\`);
console.log(\`  Features: \${payload.features.join(", ")}\\n\`);

// Spawn with PQC identity — every agent gets birth/death certificates
const spawner = new SwarmSpawner({
  licenseKey,
  pqcIdentity: { masterSeed: keyPair.publicKey.slice(0, 32) },
  enableAuditTrail: false,
});

const result = await spawner.spawn({
  tasks: [
    { id: "scan", description: "PQC vulnerability scan", input: {}, modelTier: "deep" },
    { id: "audit", description: "Generate compliance report", input: {}, modelTier: "balanced" },
  ],
  strategy: "sequential",
});

// Check certificates
const agents = spawner.getActiveAgents();
for (const agent of agents) {
  const birthValid = agent.birthCertificate
    ? PQCIdentityManager.verify(agent.birthCertificate)
    : false;
  const deathValid = agent.deathCertificate
    ? PQCIdentityManager.verify(agent.deathCertificate)
    : false;

  console.log(\`Agent \${agent.id.slice(0, 25)}...\`);
  console.log(\`  Birth cert: \${birthValid ? "VALID" : "N/A"} (ML-DSA-65)\`);
  console.log(\`  Death cert: \${deathValid ? "VALID" : "N/A"} (ML-DSA-65)\`);
  console.log(\`  Status: \${agent.status}\`);
}

console.log(\`\\nAll \${result.totalAgents} agents certified with quantum-safe identity.\`);
spawner.destroy();
}

main().catch(console.error);
`;

const GITIGNORE = `node_modules/
dist/
.env
*.env
`;

function init(cwd: string) {
  banner();

  const dir = cwd;
  const srcDir = join(dir, "src");

  // Create directories
  if (!existsSync(srcDir)) {
    mkdirSync(srcDir, { recursive: true });
    log(`${GREEN}  created${RESET} src/`);
  }

  // Write files
  const files: Array<[string, string, string]> = [
    [join(srcDir, "example.ts"), EXAMPLE_TS, "src/example.ts"],
    [join(srcDir, "pqc-demo.ts"), EXAMPLE_PQC, "src/pqc-demo.ts"],
  ];

  // Only write .gitignore if not exists
  if (!existsSync(join(dir, ".gitignore"))) {
    files.push([join(dir, ".gitignore"), GITIGNORE, ".gitignore"]);
  }

  for (const [path, content, display] of files) {
    if (existsSync(path)) {
      log(`${YELLOW}  skipped${RESET} ${display} (already exists)`);
    } else {
      writeFileSync(path, content, "utf-8");
      log(`${GREEN}  created${RESET} ${display}`);
    }
  }

  log("");
  log(`${BOLD}  Done!${RESET} Next steps:`);
  log("");
  log(`${DIM}  # Run the basic example${RESET}`);
  log(`  ${CYAN}npx tsx src/example.ts${RESET}`);
  log("");
  log(`${DIM}  # Run the PQC identity demo${RESET}`);
  log(`  ${CYAN}npx tsx src/pqc-demo.ts${RESET}`);
  log("");
  log(`${DIM}  # Add your own LLM provider${RESET}`);
  log(`  ${CYAN}Edit src/example.ts → replace the executor function${RESET}`);
  log("");
  log(`${DIM}  # Get a Pro license for PQC signing + mainnet${RESET}`);
  log(`  ${CYAN}https://migrate.gridera.net/pricing${RESET}`);
  log("");
}

// --- Main ---

const args = process.argv.slice(2);
const command = args[0];

if (command === "init") {
  init(process.cwd());
} else if (command === "demo") {
  log("Running demo... Use 'npx tsx src/example.ts' after init.");
} else {
  log(`${BOLD}@gridera/migrate${RESET} — Ephemeral AI agents with PQC identity`);
  log("");
  log("Commands:");
  log(`  ${CYAN}npx @gridera/migrate init${RESET}  Scaffold example project`);
  log("");
  log("Docs: https://github.com/Taurus-Ai-Corp/gridera-migrate");
}
