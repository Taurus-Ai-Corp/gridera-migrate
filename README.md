# GRIDERA Migrate

**Every AI agent gets a quantum-safe identity, an immutable audit trail, and a Hedera wallet.**

Spawn. Certify. Execute. Sign. Audit. Die.

<p align="center">
  <img src="demo.gif" alt="GRIDERA Migrate Demo" width="900" />
</p>

[![npm version](https://img.shields.io/npm/v/@gridera/migrate)](https://www.npmjs.com/package/@gridera/migrate)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![CI](https://github.com/Taurus-Ai-Corp/gridera-migrate/actions/workflows/ci.yml/badge.svg)](https://github.com/Taurus-Ai-Corp/gridera-migrate/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-first-blue)]()
[![codecov](https://codecov.io/gh/Taurus-Ai-Corp/gridera-migrate/graph/badge.svg)](https://codecov.io/gh/Taurus-Ai-Corp/gridera-migrate)
[![Try it live](https://img.shields.io/badge/Playground-Try_it_live-00ffa3?style=for-the-badge)](https://taurus-ai-corp.github.io/gridera-migrate/)

---

## Interactive Playground

**[Try the playground](https://taurus-ai-corp.github.io/gridera-migrate/)** — spawn PQC-certified agents in your browser with real ML-DSA-65 cryptography. No backend, no API keys, no signup.

- Configure tasks, strategy, model tiers, and pricing tiers
- Watch the full lifecycle: ENFORCE -> ROUTE -> CERTIFY BIRTH -> EXECUTE -> CERTIFY DEATH -> AUDIT -> DIE
- Inspect real ML-DSA-65 signatures (3,309 bytes) and verify them live
- Copy generated TypeScript code directly into your project

---

## Why GRIDERA Migrate?

No other agent framework has all three:

| Feature | GRIDERA Migrate | CrewAI | LangGraph | AutoGen | OpenAI Swarm |
|---------|:---:|:---:|:---:|:---:|:---:|
| Ephemeral agents (spawn & die) | **Yes** | No | No | No | Abandoned |
| PQC identity (ML-DSA-65) | **Yes** | No | No | No | No |
| Blockchain audit trail (Hedera HCS) | **Yes** | No | No | No | No |
| Model-agnostic (bring your own LLM) | **Yes** | Yes | Yes | Yes | No |
| TypeScript-first | **Yes** | No | No | No | No |
| EU AI Act compliant audit logs | **Yes** | No | No | No | No |

> Built for the **EU AI Act deadline (August 2, 2026)**. Your AI agents need auditable, tamper-proof decision logs. Yesterday.

---

## Quick Start

```bash
npm install @gridera/migrate
```

```typescript
import { SwarmSpawner } from "@gridera/migrate";

const spawner = new SwarmSpawner({
  executor: async (agent, model) => {
    // Bring your own LLM — Anthropic, OpenAI, Ollama, anything
    return await yourLLM.generate(agent.task);
  },
});

const result = await spawner.spawn({
  tasks: [
    { id: "analyze", description: "Find vulnerabilities in this code", input: { code }, modelTier: "deep" },
    { id: "review",  description: "Check code style and patterns", input: { code }, modelTier: "balanced" },
    { id: "test",    description: "Generate unit tests", input: { code }, modelTier: "fast" },
  ],
  strategy: "parallel",
});

console.log(`${result.successCount}/${result.totalAgents} agents completed`);
// Each agent got a PQC-signed birth/death certificate
// Full lifecycle recorded on Hedera HCS
```

---

## Core Concepts

### Ephemeral Agents

Agents are born, execute one task, and die. No persistent state. No memory leaks. No zombie processes. Each agent gets:

- A **birth certificate** (PQC-signed at spawn)
- A **model assignment** (routed by tier)
- A **death certificate** (PQC-signed at completion/failure)
- An **audit trail entry** (recorded on Hedera HCS)

### Pluggable Model Executor

GRIDERA Migrate doesn't lock you into any LLM provider. Pass your own executor:

```typescript
import { SwarmSpawner, type ModelExecutor } from "@gridera/migrate";

// Use any LLM provider
const executor: ModelExecutor = async (agent, config) => {
  const response = await anthropic.messages.create({
    model: config.model,
    messages: [{ role: "user", content: agent.task }],
  });
  return response.content[0].text;
};

const spawner = new SwarmSpawner({ executor });
```

### PQC Identity (ML-DSA-65)

Real post-quantum cryptography, not stubs. Every agent gets a quantum-safe identity:

```typescript
import { PQCIdentityManager } from "@gridera/migrate";
import { randomBytes } from "@noble/hashes/utils.js";

const pqc = new PQCIdentityManager({ masterSeed: randomBytes(32) });

// Issue certificates
const birthCert = pqc.issueBirthCertificate(agent, swarmId);
const deathCert = pqc.issueDeathCertificate(completedAgent, swarmId);

// Verify — returns true only if signature + payload are untampered
const isValid = PQCIdentityManager.verify(birthCert); // true
```

### Tier Enforcement

Built-in licensing for Free / Pro / Enterprise:

```typescript
import { TierEnforcer } from "@gridera/migrate";

const enforcer = new TierEnforcer(); // no key = free tier
enforcer.enforce({ type: "agentCount", count: 10 });
// throws: "Agent limit exceeded: 10 requested, max 5 on free tier"
```

---

## Model Tiers

| Tier | Use Case | Example Models |
|------|----------|----------------|
| **Fast** | Simple checks, listings, formatting | Groq Llama 3.1, Ollama Qwen, Gemini Flash |
| **Balanced** | Standard analysis, code review | Claude Haiku, GPT-4o Mini, Gemini Pro |
| **Deep** | Complex reasoning, architecture | Claude Sonnet, GPT-4 Turbo, DeepSeek Coder |

The `ModelRouter` uses round-robin selection within each tier:

```typescript
import { ModelRouter } from "@gridera/migrate";

const router = new ModelRouter();
const model = router.selectModel("deep"); // rotates through deep-tier models
```

---

## Hedera Blockchain Audit Trail

```typescript
const spawner = new SwarmSpawner({
  enableAuditTrail: true,
  hederaNetwork: "testnet",
  executor: yourExecutor,
});

// Every spawn() call:
// 1. Creates an HCS topic (one per swarm)
// 2. Logs SWARM_START, AGENT_BIRTH, AGENT_DEATH, SWARM_COMPLETE
// 3. All entries are PQC-signed and immutable
```

### Environment Variables

```bash
HEDERA_OPERATOR_ID=0.0.12345
HEDERA_OPERATOR_KEY=302e...
PQC_MASTER_SEED=<32-byte-hex>  # for PQC identity
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    SwarmSpawner                          │
│                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ ModelRouter  │  │ PQCIdentity  │  │ TierEnforcer  │  │
│  │ fast/bal/deep│  │ birth/death  │  │ free/pro/ent  │  │
│  └──────┬──────┘  └──────┬───────┘  └───────┬───────┘  │
│         │                │                   │          │
│  ┌──────▼──────────────────────────────────────────────┐│
│  │         SPAWN → CERTIFY → EXECUTE → SIGN → DIE     ││
│  │                            │                        ││
│  │                   ┌────────▼────────┐               ││
│  │                   │ ModelExecutor   │ ← Your LLM    ││
│  │                   │ (pluggable)     │               ││
│  │                   └─────────────────┘               ││
│  └─────────────────────────────────────────────────────┘│
│                           │                             │
│  ┌────────────────┐  ┌────▼───────────┐                │
│  │ ResultAggregator│  │ Hedera HCS    │                │
│  │ pass/fail rates │  │ audit trail   │                │
│  └────────────────┘  └────────────────┘                │
└─────────────────────────────────────────────────────────┘
```

---

## Pricing

| | Free | Pro ($49/mo) | Enterprise |
|---|:---:|:---:|:---:|
| Max agents per spawn | 5 | Unlimited | Custom |
| Hedera network | Testnet | Mainnet | Mainnet |
| PQC signing | No | Yes | Yes |
| Model tiers | Fast only | All | All |
| Audit export | Console | HCS topics | HCS + API |
| EU AI Act reports | No | Basic | Full |
| Support | GitHub Issues | Email | Dedicated |

---

## Roadmap

- [x] **v0.1.0** — Core spawner, model router, Hedera integration
- [x] **v0.2.0** — Pluggable executor, PQC identity (ML-DSA-65), tier enforcement
- [ ] **v0.3.0** — AI SDK adapter (`@gridera/migrate-ai-sdk`), `npx init` CLI
- [ ] **v0.4.0** — EU AI Act compliance reports, topic-per-swarm audit
- [x] **v0.5.0** — Interactive playground with real PQC crypto ([live](https://taurus-ai-corp.github.io/gridera-migrate/))

---

## Events

Monitor agent lifecycle with EventEmitter:

```typescript
spawner.on("agent:start", (agent) => console.log(`Started: ${agent.id}`));
spawner.on("agent:model:start", ({ agentId, model }) => console.log(`Model: ${model.model}`));
spawner.on("agent:model:complete", ({ agentId }) => console.log(`Model done: ${agentId}`));
spawner.on("agent:complete", (agent) => console.log(`Done: ${agent.id} — ${agent.status}`));
spawner.on("complete", (result) => console.log(`Swarm: ${result.successRate * 100}%`));
```

---

## Security

All dependencies pass `npm audit` with **zero vulnerabilities**. GRIDERA Migrate uses:

- **ML-DSA-65** (NIST FIPS 204) via `@noble/post-quantum` for all cryptographic operations
- **Hiero SDK** (`@hiero-ledger/sdk`) for Hedera HCS audit trails — migrated from the deprecated `@hashgraph/sdk` namespace

To verify: `npm audit` should report 0 vulnerabilities.

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Run `npm test` (46 tests must pass)
4. Submit a PR

See [CHANGELOG.md](CHANGELOG.md) for release history.

## License

MIT License with Patent Notice — See [LICENSE](LICENSE) for details.

---

**TAURUS AI Corp** | [GitHub](https://github.com/Taurus-Ai-Corp/gridera-migrate) | [npm](https://www.npmjs.com/package/@gridera/migrate)
