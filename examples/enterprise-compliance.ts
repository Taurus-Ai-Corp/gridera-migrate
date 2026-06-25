     1|/**
     2| * Enterprise Integration Example — GRIDERA Migrate
     3| *
     4| * Shows how a fintech compliance team would use GRIDERA Migrate
     5| * to run auditable AI agent swarms for regulatory compliance.
     6| *
     7| * Architecture:
     8| *   Enterprise App → SwarmSpawner → LLM Provider (pluggable)
     9| *                  → PQC Identity (ML-DSA-65 certs)
    10| *                  → Hedera HCS (immutable audit trail)
    11| *                  → TierEnforcer (Pro license)
    12| */
    13|
    14|import {
    15|  SwarmSpawner,
    16|  PQCIdentityManager,
    17|  LicenseManager,
    18|  type ModelExecutor,
    19|  type EphemeralAgent,
    20|} from "@gridera/migrate";
    21|
    22|// ─── Simulate an enterprise LLM executor ───────────────────────
    23|// In production, replace with Anthropic/OpenAI/Ollama SDK calls
    24|const enterpriseExecutor: ModelExecutor = async (agent, config) => {
    25|  const start = Date.now();
    26|
    27|  // Simulate different processing times based on task complexity
    28|  const delay = config.cost === "high" ? 200 : config.cost === "medium" ? 100 : 50;
    29|  await new Promise((r) => setTimeout(r, delay));
    30|
    31|  return {
    32|    agentId: agent.id,
    33|    task: agent.task,
    34|    model: config.model,
    35|    provider: config.provider,
    36|    result: `[${config.provider}/${config.model}] Analysis complete for: ${agent.task}`,
    37|    latencyMs: Date.now() - start,
    38|    timestamp: new Date().toISOString(),
    39|  };
    40|};
    41|
    42|// ─── Enterprise compliance swarm ───────────────────────────────
    43|async function runComplianceAudit() {
    44|  console.log("╔══════════════════════════════════════════════════════════╗");
    45|  console.log("║  Enterprise Compliance Audit — GRIDERA Migrate Demo      ║");
    46|  console.log("║  EU AI Act Readiness Assessment                        ║");
    47|  console.log("╚══════════════════════════════════════════════════════════╝\n");
    48|
    49|  // Step 1: Generate PQC key pair (done ONCE, stored in HSM/vault)
    50|  console.log("Step 1: PQC Key Generation (ML-DSA-65 / NIST FIPS 204)");
    51|  const keyPair = LicenseManager.generateKeyPair();
    52|  console.log(`  ✓ Public key:  ${keyPair.publicKey.length} bytes`);
    53|  console.log(`  ✓ Secret key:  ${keyPair.secretKey.length} bytes`);
    54|  console.log(`  ✓ Algorithm:   ML-DSA-65 (lattice-based, quantum-resistant)\n`);
    55|
    56|  // Step 2: Generate Pro license (billing server does this on Stripe webhook)
    57|  console.log("Step 2: License Activation (ML-DSA-65 signed)");
    58|  const issuer = LicenseManager.fromKeyPair(keyPair.secretKey, keyPair.publicKey);
    59|  const licenseKey = issuer.generate({
    60|    tier: "pro",
    61|    org: "AcmeFintech Corp",
    62|    durationDays: 30,
    63|    features: ["pqc-signing", "mainnet", "audit-export", "all-model-tiers"],
    64|  });
    65|  console.log(`  ✓ License:     Pro tier (ML-DSA-65 signed)`);
    66|  console.log(`  ✓ Org:         AcmeFintech Corp`);
    67|  console.log(`  ✓ Valid:       30 days`);
    68|  console.log(`  ✓ Key length:  ${licenseKey.length} chars (PQC signature = ~4.4KB)\n`);
    69|
    70|  // Step 3: Verify license (consumer side — only public key needed)
    71|  console.log("Step 3: License Verification (public key only)");
    72|  const verifier = LicenseManager.fromPublicKey(keyPair.publicKey);
    73|  const payload = verifier.verify(licenseKey);
    74|  console.log(`  ✓ Tier:        ${payload.tier}`);
    75|  console.log(`  ✓ Org:         ${payload.org}`);
    76|  console.log(`  ✓ Features:    ${payload.features.join(", ")}`);
    77|  console.log(`  ✓ Signature:   VALID (ML-DSA-65 verified)\n`);
    78|
    79|  // Step 4: Create spawner with PQC identity + Pro license
    80|  console.log("Step 4: Initialize GRIDERA Migrate");
    81|  const spawner = new SwarmSpawner({
    82|    licenseKey,
    83|    executor: enterpriseExecutor,
    84|    pqcIdentity: { masterSeed: keyPair.publicKey.slice(0, 32) },
    85|    enableAuditTrail: false, // set true with HEDERA_OPERATOR_ID for blockchain
    86|    timeout: 30000,
    87|  });
    88|  console.log(`  ✓ Tier:        ${spawner.getTier()}`);
    89|  console.log(`  ✓ PQC:         ML-DSA-65 agent identity enabled`);
    90|  console.log(`  ✓ Executor:    Enterprise LLM (pluggable)\n`);
    91|
    92|  // Step 5: Spawn compliance audit swarm
    93|  console.log("Step 5: Spawning EU AI Act Compliance Swarm");
    94|  console.log("  ─────────────────────────────────────────\n");
    95|
    96|  // Track lifecycle events
    97|  spawner.on("agent:start", (agent: EphemeralAgent) => {
    98|    console.log(`  🚀 SPAWN   ${agent.id.slice(0, 20)}... → ${agent.task.slice(0, 50)}`);
    99|  });
   100|  spawner.on("agent:certified", (evt: { agentId: string; type: string }) => {
   101|    console.log(`  🔐 CERT    ${evt.agentId.slice(0, 20)}... → ${evt.type} certificate (ML-DSA-65)`);
   102|  });
   103|  spawner.on("agent:complete", (agent: EphemeralAgent) => {
   104|    console.log(`  ${agent.status === "completed" ? "✅" : "❌"} DONE    ${agent.id.slice(0, 20)}... → ${agent.status}`);
   105|  });
   106|
   107|  const result = await spawner.spawn({
   108|    tasks: [
   109|      {
   110|        id: "risk-classification",
   111|        description: "Classify AI system risk level per EU AI Act Article 6",
   112|        input: { system: "automated lending decisions", sector: "financial services" },
   113|        modelTier: "deep",
   114|      },
   115|      {
   116|        id: "transparency-check",
   117|        description: "Verify AI transparency obligations per EU AI Act Article 13",
   118|        input: { checkpoints: ["model card", "data provenance", "decision explainability"] },
   119|        modelTier: "balanced",
   120|      },
   121|      {
   122|        id: "data-governance",
   123|        description: "Audit training data governance per EU AI Act Article 10",
   124|        input: { datasets: ["credit_scores", "transaction_history", "demographic_data"] },
   125|        modelTier: "balanced",
   126|      },
   127|      {
   128|        id: "human-oversight",
   129|        description: "Evaluate human oversight mechanisms per EU AI Act Article 14",
   130|        input: { mechanisms: ["kill switch", "appeal process", "manual review threshold"] },
   131|        modelTier: "fast",
   132|      },
   133|      {
   134|        id: "pqc-readiness",
   135|        description: "Assess post-quantum cryptography readiness for AI model signing",
   136|        input: { current_crypto: ["RSA-2048", "ECDSA-P256"], target: ["ML-DSA-65", "ML-KEM-768"] },
   137|        modelTier: "deep",
   138|      },
   139|    ],
   140|    strategy: "parallel",
   141|  });
   142|
   143|  // Step 6: Results + Certificate verification
   144|  console.log("\n  ─────────────────────────────────────────");
   145|  console.log("\nStep 6: Audit Results\n");
   146|
   147|  console.log(`  Total agents:  ${result.totalAgents}`);
   148|  console.log(`  Succeeded:     ${result.successCount}`);
   149|  console.log(`  Failed:        ${result.failureCount}`);
   150|  console.log(`  Success rate:  ${(result.successRate * 100).toFixed(0)}%`);
   151|  console.log(`  Total time:    ${result.totalDuration}ms\n`);
   152|
   153|  // Verify all certificates
   154|  console.log("Step 7: Certificate Verification\n");
   155|  const agents = spawner.getActiveAgents();
   156|  let allValid = true;
   157|
   158|  for (const agent of agents) {
   159|    const birthValid = agent.birthCertificate
   160|      ? PQCIdentityManager.verify(agent.birthCertificate)
   161|      : false;
   162|    const deathValid = agent.deathCertificate
   163|      ? PQCIdentityManager.verify(agent.deathCertificate)
   164|      : false;
   165|
   166|    const status = birthValid && deathValid ? "✅ VALID" : "❌ INVALID";
   167|    if (!birthValid || !deathValid) allValid = false;
   168|
   169|    console.log(`  ${status}  ${agent.id.slice(0, 25)}...`);
   170|    console.log(`           Birth: ${birthValid ? "ML-DSA-65 ✓" : "MISSING"}  Death: ${deathValid ? "ML-DSA-65 ✓" : "MISSING"}`);
   171|  }
   172|
   173|  console.log(`\n  All certificates valid: ${allValid ? "YES ✅" : "NO ❌"}`);
   174|  console.log(`  Algorithm:              ML-DSA-65 (NIST FIPS 204)`);
   175|  console.log(`  Quantum-safe:           YES`);
   176|  console.log(`  Audit trail:            Ready for Hedera HCS (enable with HEDERA_OPERATOR_ID)`);
   177|
   178|  console.log("\n╔══════════════════════════════════════════════════════════╗");
   179|  console.log("║  EU AI Act Compliance Audit Complete                    ║");
   180|  console.log("║  All agent decisions PQC-signed + verifiable            ║");
   181|  console.log("║  Ready for regulatory submission                       ║");
   182|  console.log("╚══════════════════════════════════════════════════════════╝\n");
   183|
   184|  spawner.destroy();
   185|}
   186|
   187|runComplianceAudit().catch(console.error);
   188|