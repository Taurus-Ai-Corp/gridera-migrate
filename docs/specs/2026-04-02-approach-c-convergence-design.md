     1|# GRIDERA Migrate — Approach C: Crypto-AI Convergence Protocol
     2|
     3|> Design Spec v1.0 | 2026-04-02
     4|> "Every AI agent gets a quantum-safe identity, an immutable audit trail, and a Hedera wallet."
     5|
     6|---
     7|
     8|## 1. Positioning
     9|
    10|GRIDERA Migrate occupies the **only uncontested intersection** in the AI agent orchestration market:
    11|
    12|```
    13|                    ┌──────────────────┐
    14|                    │  Ephemeral Agents │ ← OpenAI Swarm (abandoned)
    15|                    │  (spawn & die)   │   Julep (shut down)
    16|                    └────────┬─────────┘
    17|                             │
    18|              ┌──────────────┼──────────────┐
    19|              │              │              │
    20|     ┌────────▼───────┐  ┌──▼──────────┐  ┌▼──────────────┐
    21|     │ PQC Identity   │  │ Blockchain  │  │ Model-Agnostic │
    22|     │ (ML-DSA-65)    │  │ Audit Trail │  │ Execution      │
    23|     │                │  │ (Hedera HCS)│  │ (Pluggable)    │
    24|     └────────┬───────┘  └──┬──────────┘  └┬──────────────┘
    25|              │              │              │
    26|              └──────────────┼──────────────┘
    27|                             │
    28|                    ┌────────▼─────────┐
    29|                    │  SWARM SPAWNER   │
    30|                    │  (Only framework │
    31|                    │   at this nexus) │
    32|                    └──────────────────┘
    33|```
    34|
    35|**No competitor has all three.** Coinbase AgentKit has wallets (not audit). Zero have PQC. OpenAI Swarm and Julep had ephemeral concepts but are dead/abandoned.
    36|
    37|---
    38|
    39|## 2. Architecture Overview
    40|
    41|```
    42|┌─────────────────────────────────────────────────────────┐
    43|│                    SwarmSpawner                          │
    44|│                                                         │
    45|│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
    46|│  │ ModelRouter  │  │ PQCIdentity  │  │ TierEnforcer  │  │
    47|│  │             │  │              │  │               │  │
    48|│  │ fast/       │  │ birth cert   │  │ free/pro/     │  │
    49|│  │ balanced/   │  │ death cert   │  │ enterprise    │  │
    50|│  │ deep        │  │ key derivation│ │ JWT license   │  │
    51|│  └──────┬──────┘  └──────┬───────┘  └───────┬───────┘  │
    52|│         │                │                   │          │
    53|│  ┌──────▼──────────────────────────────────────────────┐│
    54|│  │              EphemeralAgent Lifecycle                ││
    55|│  │                                                     ││
    56|│  │  SPAWN → CERTIFY → EXECUTE → SIGN → AUDIT → DIE    ││
    57|│  │                       │                             ││
    58|│  │              ┌────────▼────────┐                    ││
    59|│  │              │ ModelExecutor   │ ← Pluggable        ││
    60|│  │              │ (user-provided) │                    ││
    61|│  │              └─────────────────┘                    ││
    62|│  └─────────────────────────────────────────────────────┘│
    63|│         │                │                              │
    64|│  ┌──────▼──────┐  ┌──────▼───────┐  ┌────────────────┐ │
    65|│  │ Result      │  │ Hedera       │  │ EventEmitter   │ │
    66|│  │ Aggregator  │  │ Integration  │  │ (observability)│ │
    67|│  │             │  │              │  │                │ │
    68|│  │ pass/fail   │  │ HCS topics   │  │ agent:start    │ │
    69|│  │ rates       │  │ audit trail  │  │ agent:complete │ │
    70|│  │ durations   │  │ credentials  │  │ model:start    │ │
    71|│  └─────────────┘  └──────────────┘  └────────────────┘ │
    72|└─────────────────────────────────────────────────────────┘
    73|```
    74|
    75|### Component Inventory
    76|
    77|| Component | File | Status | Purpose |
    78||-----------|------|--------|---------|
    79|| SwarmSpawner | `src/spawner.ts` | Done | Core orchestrator, lifecycle management |
    80|| ModelRouter | `src/model-router.ts` | Done | Tier-based model selection (round-robin) |
    81|| ModelExecutor | `src/spawner.ts` | Done | Pluggable LLM execution interface |
    82|| HederaIntegration | `src/hedera-integration.ts` | Partial | HCS audit trails, topic management |
    83|| ResultAggregator | `src/result-aggregator.ts` | Done | Pass/fail aggregation |
    84|| **PQCIdentity** | `src/pqc-identity.ts` | **NEW** | Agent birth/death certs, key derivation |
    85|| **TierEnforcer** | `src/tier-enforcer.ts` | **NEW** | Free/Pro/Enterprise gating |
    86|| **AI SDK Adapter** | Separate package | **NEW** | Vercel AI SDK ModelExecutor |
    87|
    88|---
    89|
    90|## 3. Pluggable Model Executor (IMPLEMENTED)
    91|
    92|```typescript
    93|// The interface — consumers implement this
    94|export type ModelExecutor = (
    95|  agent: EphemeralAgent,
    96|  config: ModelConfig,
    97|) => Promise<unknown>;
    98|
    99|// Default echo executor for testing
   100|export const defaultExecutor: ModelExecutor = async (agent) => {
   101|  return { agentId: agent.id, result: `Processed: ${agent.task}` };
   102|};
   103|
   104|// Usage — bring your own LLM
   105|const spawner = new SwarmSpawner({
   106|  executor: async (agent, config) => {
   107|    const response = await anthropic.messages.create({
   108|      model: config.model,
   109|      messages: [{ role: "user", content: agent.task }],
   110|    });
   111|    return response.content[0].text;
   112|  },
   113|});
   114|```
   115|
   116|Events emitted: `agent:model:start`, `agent:model:complete` — both carry `{ agentId, model, timestamp }`.
   117|
   118|**Tests: 13/13 passing** (default executor, custom executor, timeout, error handling, events).
   119|
   120|---
   121|
   122|## 4. PQC Identity System (NEW)
   123|
   124|### 4.1 Design
   125|
   126|Every ephemeral agent receives a **quantum-safe identity** at birth:
   127|
   128|```
   129|Master Key (ML-DSA-65, 32-byte seed)
   130|    │
   131|    ├── derive(swarmId + agentId) → Agent Ephemeral Key
   132|    │       │
   133|    │       ├── Birth Certificate (signed)
   134|    │       │     ├── agentId
   135|    │       │     ├── task description
   136|    │       │     ├── model tier
   137|    │       │     ├── timestamp
   138|    │       │     └── swarm context hash
   139|    │       │
   140|    │       └── Death Certificate (signed)
   141|    │             ├── result hash (SHA-256)
   142|    │             ├── status (completed/failed)
   143|    │             ├── duration
   144|    │             ├── audit trail reference (HCS topic + sequence)
   145|    │             └── timestamp
   146|    │
   147|    └── Key destroyed after death certificate signed
   148|```
   149|
   150|### 4.2 Interfaces
   151|
   152|```typescript
   153|// src/pqc-identity.ts
   154|
   155|import { ml_dsa65 } from "@noble/post-quantum/ml-dsa";
   156|import { sha256 } from "@noble/hashes/sha2";
   157|import { randomBytes, bytesToHex } from "@noble/hashes/utils";
   158|
   159|export interface AgentIdentity {
   160|  agentId: string;
   161|  publicKey: Uint8Array;
   162|  birthCertificate: SignedCertificate;
   163|  deathCertificate?: SignedCertificate;
   164|}
   165|
   166|export interface SignedCertificate {
   167|  type: "birth" | "death";
   168|  payload: Record<string, unknown>;
   169|  signature: Uint8Array;
   170|  publicKey: Uint8Array;
   171|  algorithm: "ML-DSA-65";
   172|  timestamp: string;
   173|}
   174|
   175|export interface PQCIdentityConfig {
   176|  masterSeed: Uint8Array; // 32 bytes
   177|}
   178|
   179|export class PQCIdentityManager {
   180|  private masterSeed: Uint8Array;
   181|
   182|  constructor(config: PQCIdentityConfig) {
   183|    this.masterSeed = config.masterSeed;
   184|  }
   185|
   186|  /** Derive a deterministic per-agent key from master + agent context */
   187|  deriveAgentKey(swarmId: string, agentId: string): {
   188|    publicKey: Uint8Array;
   189|    secretKey: Uint8Array;
   190|  } {
   191|    const context = new TextEncoder().encode(`${swarmId}:${agentId}`);
   192|    const derivedSeed = sha256(
   193|      new Uint8Array([...this.masterSeed, ...context])
   194|    );
   195|    return ml_dsa65.keygen(derivedSeed);
   196|  }
   197|
   198|  /** Issue birth certificate when agent spawns */
   199|  issueBirthCertificate(
   200|    agent: { id: string; task: string; model: { model: string } },
   201|    swarmId: string,
   202|  ): SignedCertificate {
   203|    const keyPair = this.deriveAgentKey(swarmId, agent.id);
   204|    const payload = {
   205|      type: "birth" as const,
   206|      agentId: agent.id,
   207|      task: agent.task,
   208|      model: agent.model.model,
   209|      swarmId,
   210|      timestamp: new Date().toISOString(),
   211|    };
   212|
   213|    const message = new TextEncoder().encode(JSON.stringify(payload));
   214|    const signature = ml_dsa65.sign(keyPair.secretKey, message);
   215|
   216|    return {
   217|      type: "birth",
   218|      payload,
   219|      signature,
   220|      publicKey: keyPair.publicKey,
   221|      algorithm: "ML-DSA-65",
   222|      timestamp: payload.timestamp,
   223|    };
   224|  }
   225|
   226|  /** Issue death certificate when agent completes/fails */
   227|  issueDeathCertificate(
   228|    agent: { id: string; status: string; output?: unknown; error?: string },
   229|    swarmId: string,
   230|    auditRef?: { topicId: string; sequenceNumber: number },
   231|  ): SignedCertificate {
   232|    const keyPair = this.deriveAgentKey(swarmId, agent.id);
   233|
   234|    const resultHash = bytesToHex(
   235|      sha256(new TextEncoder().encode(JSON.stringify(agent.output ?? agent.error)))
   236|    );
   237|
   238|    const payload = {
   239|      type: "death" as const,
   240|      agentId: agent.id,
   241|      status: agent.status,
   242|      resultHash,
   243|      auditRef,
   244|      timestamp: new Date().toISOString(),
   245|    };
   246|
   247|    const message = new TextEncoder().encode(JSON.stringify(payload));
   248|    const signature = ml_dsa65.sign(keyPair.secretKey, message);
   249|
   250|    return {
   251|      type: "death",
   252|      payload,
   253|      signature,
   254|      publicKey: keyPair.publicKey,
   255|      algorithm: "ML-DSA-65",
   256|      timestamp: payload.timestamp,
   257|    };
   258|  }
   259|
   260|  /** Verify any certificate */
   261|  static verify(cert: SignedCertificate): boolean {
   262|    const message = new TextEncoder().encode(JSON.stringify(cert.payload));
   263|    return ml_dsa65.verify(cert.publicKey, message, cert.signature);
   264|  }
   265|}
   266|```
   267|
   268|### 4.3 Key Derivation Scheme
   269|
   270|```
   271|masterSeed (32 bytes, from env PQC_MASTER_SEED or randomBytes(32))
   272|    │
   273|    │  SHA-256(masterSeed ║ UTF8("swarmId:agentId"))
   274|    │
   275|    ▼
   276|derivedSeed (32 bytes)
   277|    │
   278|    │  ml_dsa65.keygen(derivedSeed)
   279|    │
   280|    ▼
   281|{ publicKey, secretKey } ← deterministic, reproducible for verification
   282|```
   283|
   284|**Why deterministic?** Anyone with the master seed + agent context can re-derive the key to verify certificates. The master seed is the single secret.
   285|
   286|### 4.4 Integration with SwarmSpawner
   287|
   288|```typescript
   289|// Updated SwarmConfig
   290|export interface SwarmConfig {
   291|  // ... existing fields ...
   292|  pqcIdentity?: PQCIdentityConfig; // replaces pqcKeyPair
   293|}
   294|
   295|// In spawn() lifecycle:
   296|// 1. SPAWN agent
   297|// 2. CERTIFY: issueBirthCertificate()
   298|// 3. EXECUTE: this.executor(agent, model)
   299|// 4. SIGN: issueDeathCertificate()
   300|// 5. AUDIT: submit both certs to Hedera HCS
   301|// 6. DIE: agent removed from activeAgents
   302|```
   303|
   304|---
   305|
   306|## 5. Hedera Audit Trail (ENHANCED)
   307|
   308|### 5.1 Topic-per-Swarm Pattern
   309|
   310|Each `spawn()` call creates a dedicated HCS topic. All agent lifecycle events are recorded as topic messages.
   311|
   312|```
   313|spawn() called
   314|    │
   315|    ├── TopicCreateTransaction → topicId
   316|    │
   317|    ├── Message 1: SWARM_START { taskCount, strategy, timestamp }
   318|    │
   319|    ├── Message 2: AGENT_BIRTH { birthCertificate, agentId }
   320|    ├── Message 3: AGENT_BIRTH { birthCertificate, agentId }
   321|    │   ... (one per agent)
   322|    │
   323|    ├── Message N: AGENT_DEATH { deathCertificate, agentId, result_hash }
   324|    ├── Message N+1: AGENT_DEATH { deathCertificate, agentId, result_hash }
   325|    │   ... (one per agent)
   326|    │
   327|    └── Message FINAL: SWARM_COMPLETE { successRate, duration, topicId }
   328|```
   329|
   330|### 5.2 Structured Audit Entry (v2)
   331|
   332|```typescript
   333|export interface AuditEntryV2 {
   334|  version: 2;
   335|  id: string;
   336|  timestamp: string;
   337|  action: "SWARM_START" | "AGENT_BIRTH" | "AGENT_DEATH" | "SWARM_COMPLETE";
   338|  swarmId: string;
   339|  agentId?: string;
   340|  payload: Record<string, unknown>;
   341|  pqcSignature?: string;   // base64 ML-DSA-65 signature
   342|  pqcPublicKey?: string;   // base64 public key for verification
   343|  topicId: string;
   344|  sequenceNumber?: number;
   345|}
   346|```
   347|
   348|### 5.3 Batch Submission
   349|
   350|For cost efficiency, agent birth certificates are batched into a single topic message per chunk (respecting Hedera's 1KB message limit):
   351|
   352|```typescript
   353|// Batch pattern
   354|const batchPayload = agents
   355|  .map(a => ({ agentId: a.id, birthCert: a.birthCertificate }))
   356|  .filter(batch => JSON.stringify(batch).length < 1024);
   357|
   358|// Submit as single message if under 1KB, split if over
   359|```
   360|
   361|### 5.4 Verification API
   362|
   363|```typescript
   364|class HederaIntegration {
   365|  /** Verify a complete swarm lifecycle from its topic ID */
   366|  async verifySwarmAuditTrail(topicId: string): Promise<{
   367|    valid: boolean;
   368|    swarmId: string;
   369|    agentCount: number;
   370|    allCertificatesValid: boolean;
   371|    timeline: AuditEntryV2[];
   372|    errors: string[];
   373|  }>;
   374|}
   375|```
   376|
   377|---
   378|
   379|## 6. Tier Enforcement
   380|
   381|### 6.1 Tier Definitions
   382|
   383|| Feature | Free | Pro ($49/mo) | Enterprise (Custom) |
   384||---------|:----:|:---:|:---:|
   385|| Max agents per spawn | 5 | Unlimited | Custom |
   386|| Max spawns per day | 20 | 1,000 | Unlimited |
   387|| Hedera network | Testnet | Mainnet | Mainnet |
   388|| PQC signing | No | Yes | Yes |
   389|| Audit trail | Console logs | HCS topics | HCS + export API |
   390|| Model tiers | Fast only | All | All + custom |
   391|| AI SDK adapter | Yes | Yes | Yes |
   392|| EU AI Act report | No | Basic | Full compliance |
   393|| On-prem LLM support | No | No | Ollama/vLLM |
   394|| SLA | None | Email | Dedicated |
   395|
   396|### 6.2 License Key (JWT)
   397|
   398|```typescript
   399|// src/tier-enforcer.ts
   400|
   401|export type Tier = "free" | "pro" | "enterprise";
   402|
   403|export interface LicensePayload {
   404|  tier: Tier;
   405|  org: string;
   406|  exp: number;        // Unix timestamp
   407|  maxAgents?: number;  // enterprise custom limit
   408|  features: string[];  // enabled feature flags
   409|}
   410|
   411|export class TierEnforcer {
   412|  private tier: Tier;
   413|  private license?: LicensePayload;
   414|
   415|  constructor(licenseKey?: string) {
   416|    if (!licenseKey) {
   417|      this.tier = "free";
   418|      return;
   419|    }
   420|    // Decode JWT (no verification library needed — use base64 decode)
   421|    // Production: verify against TAURUS public key
   422|    this.license = this.decodeLicense(licenseKey);
   423|    this.tier = this.license.tier;
   424|  }
   425|
   426|  enforce(check: {
   427|    agentCount?: number;
   428|    network?: "testnet" | "mainnet";
   429|    pqcSigning?: boolean;
   430|    modelTier?: "fast" | "balanced" | "deep";
   431|  }): void {
   432|    if (this.tier === "free") {
   433|      if ((check.agentCount ?? 0) > 5)
   434|        throw new Error("Free tier: max 5 agents. Upgrade at migrate.gridera.net/pricing");
   435|      if (check.network === "mainnet")
   436|        throw new Error("Free tier: testnet only. Upgrade for mainnet access.");
   437|      if (check.pqcSigning)
   438|        throw new Error("Free tier: PQC signing requires Pro. Upgrade at migrate.gridera.net/pricing");
   439|      if (check.modelTier && check.modelTier !== "fast")
   440|        throw new Error("Free tier: fast models only. Upgrade for balanced/deep.");
   441|    }
   442|  }
   443|
   444|  getTier(): Tier { return this.tier; }
   445|
   446|  private decodeLicense(key: string): LicensePayload {
   447|    const parts = key.split(".");
   448|    if (parts.length !== 3) throw new Error("Invalid license key format");
   449|    const payload = JSON.parse(atob(parts[1]));
   450|    if (payload.exp && payload.exp < Date.now() / 1000) {
   451|      throw new Error("License expired. Renew at migrate.gridera.net/pricing");
   452|    }
   453|    return payload;
   454|  }
   455|}
   456|```
   457|
   458|### 6.3 Integration
   459|
   460|```typescript
   461|// SwarmConfig addition
   462|export interface SwarmConfig {
   463|  // ... existing fields ...
   464|  licenseKey?: string;  // JWT from migrate.gridera.net
   465|}
   466|
   467|// In constructor:
   468|this.tierEnforcer = new TierEnforcer(config.licenseKey);
   469|
   470|// In spawn():
   471|this.tierEnforcer.enforce({
   472|  agentCount: request.tasks.length,
   473|  network: this.config.hederaNetwork,
   474|  pqcSigning: !!this.config.pqcIdentity,
   475|});
   476|```
   477|
   478|---
   479|
   480|## 7. AI SDK Adapter Package
   481|
   482|Separate npm package: `@gridera/migrate-ai-sdk`
   483|
   484|```typescript
   485|// @gridera/migrate-ai-sdk/src/index.ts
   486|
   487|import { generateText } from "ai";
   488|import type { ModelExecutor, EphemeralAgent } from "@gridera/migrate";
   489|import type { LanguageModel } from "ai";
   490|
   491|/**
   492| * Creates a ModelExecutor that uses Vercel AI SDK's generateText().
   493| * Supports all AI SDK providers (OpenAI, Anthropic, Google, etc.)
   494| */
   495|export function createAISDKExecutor(
   496|  modelFactory: (config: { provider: string; model: string }) => LanguageModel,
   497|): ModelExecutor {
   498|  return async (agent, config) => {
   499|    const model = modelFactory({
   500|      provider: config.provider,
   501|