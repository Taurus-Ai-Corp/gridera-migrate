     1|# GRIDERA Migrate Playground — Design Spec
     2|
     3|> Single-file HTML playground that lets enterprises try real PQC agent spawning in-browser.
     4|
     5|## Purpose
     6|
     7|Interactive demo for GRIDERA Migrate SDK. Two audiences:
     8|- **Enterprise buyers** (CTOs/CISOs): see the PQC lifecycle, understand what they're buying
     9|- **Developers**: configure a spawn, watch it run, copy working TypeScript
    10|
    11|## Decisions
    12|
    13|| Aspect | Choice |
    14||--------|--------|
    15|| Audience | Hybrid — buyer + developer |
    16|| Layout | Stacked Hero: header → controls+animation → code output |
    17|| Visual style | Cyberpunk Terminal — #0a0a0f dark, neon green/purple/amber, monospace |
    18|| Interaction | Choreographed ~4s animation + timeline scrubber for replay/inspection |
    19|| Controls | All 8 configs exposed + 4 presets |
    20|| PQC crypto | **Real** — @noble/post-quantum bundled inline as IIFE (21KB) |
    21|| Code output | Live TypeScript generation, syntax highlighted, copy button |
    22|| Dependencies | **Zero** — fully self-contained single HTML file |
    23|
    24|## Architecture
    25|
    26|### File Structure
    27|
    28|Single file: `playground.html` (~2000-2500 lines estimated)
    29|
    30|Sections:
    31|1. Inlined `<script>` — Noble PQC bundle (21KB IIFE, exposes `Noble.ml_dsa65`, `Noble.sha256`, `Noble.bytesToHex`)
    32|2. Inlined `<style>` — all CSS (cyberpunk theme, animations, layout)
    33|3. HTML structure — header, controls panel, animation stage, code output
    34|4. Inlined `<script>` — application logic (state, animation engine, code generator)
    35|
    36|### Noble PQC Bundle
    37|
    38|Built from gridera-migrate's own `node_modules/`:
    39|
    40|```bash
    41|NODE_PATH=./node_modules npx esbuild entry.js --bundle --format=iife --global-name=Noble --minify --outfile=noble-bundle.js --platform=browser
    42|```
    43|
    44|Entry:
    45|```js
    46|export { ml_dsa65 } from "@noble/post-quantum/ml-dsa.js";
    47|export { sha256 } from "@noble/hashes/sha2.js";
    48|export { bytesToHex } from "@noble/hashes/utils.js";
    49|```
    50|
    51|Verified: keygen→1952/4032B, sign→3309B, verify→true.
    52|
    53|### What Runs for Real
    54|
    55|- `ml_dsa65.keygen(seed)` — deterministic per-agent key derivation (masterSeed + SHA-256)
    56|- `ml_dsa65.sign(message, secretKey)` — birth/death certificate signing
    57|- `ml_dsa65.verify(signature, message, publicKey)` — live verification in certificate inspector
    58|- `sha256()` — result hashing for death certificates
    59|- `bytesToHex()` — hex display of signatures and keys
    60|
    61|### What Is Simulated
    62|
    63|- **Hedera HCS** — requires network/API keys. Show mock topic IDs and sequence numbers.
    64|- **Model execution** — no LLM calls. Executor returns `{ agentId, result: "Processed: <task>" }` after a randomized delay (200-800ms).
    65|- **Agent IDs** — generated with `crypto.randomUUID()` (real browser API).
    66|- **Failure simulation** — one random agent per spawn fails (demonstrates error handling).
    67|
    68|## Layout
    69|
    70|### 1. Header Bar
    71|
    72|```
    73|┌──────────────────────────────────────────────────────────┐
    74|│  ⬡ SWARM SPAWNER v0.3.1     Free│Pro│Enterprise   [SPAWN]│
    75|└──────────────────────────────────────────────────────────┘
    76|```
    77|
    78|- Logo: hex icon + monospace title, neon green, letter-spacing: 3px
    79|- Tier selector: 3 pill buttons. Active tier has neon glow matching tier color:
    80|  - Free = green (#00ffa3)
    81|  - Pro = purple (#a78bfa)
    82|  - Enterprise = amber (#f59e0b)
    83|- Changing tier instantly updates: locked controls, code output, tier color accents
    84|- SPAWN button: large, pulsing neon border, disabled until ≥1 task configured
    85|
    86|### 2. Controls Panel (Left, ~280px)
    87|
    88|8 controls + 4 presets:
    89|
    90|**Presets** (snap all controls):
    91|- Quick Demo: 3 tasks, parallel, fast, free tier
    92|- PQC Showcase: 5 tasks, parallel, balanced, pro tier, PQC on
    93|- Stress Test: 20 tasks, parallel, fast, timeout 5s
    94|- Enterprise: 10 tasks, adaptive, deep, PQC on, mainnet, enterprise tier
    95|
    96|**Controls:**
    97|| Control | Type | Range | Default |
    98||---------|------|-------|---------|
    99|| Tasks | Slider | 1-20 | 5 |
   100|| Strategy | Radio | parallel/sequential/adaptive | parallel |
   101|| Model Tier | Radio | fast/balanced/deep | fast |
   102|| PQC Identity | Toggle | on/off | off |
   103|| Hedera Audit | Toggle | on/off | on |
   104|| Max Parallel | Slider | 1-10 | 5 |
   105|| Timeout | Slider | 5-120s | 30s |
   106|| Network | Radio | testnet/mainnet | testnet |
   107|
   108|**Tier gating:** Controls unavailable on current tier are visible but grayed with a 🔒 icon. Clicking shows tooltip: "Upgrade to Pro — $49/mo". Gating rules:
   109|- Free: only fast model tier, no PQC, testnet only, max 5 agents
   110|- Pro: all model tiers, PQC enabled, testnet+mainnet, unlimited agents
   111|- Enterprise: same as Pro + custom maxAgents
   112|
   113|### 3. Animation Stage (Main Area)
   114|
   115|**Initial state:** Centered text "Click SPAWN to begin" with config summary.
   116|
   117|**Choreographed sequence (~4 seconds):**
   118|
   119|| Time | Phase | Visual |
   120||------|-------|--------|
   121|| 0-0.5s | ENFORCE | Tier badge flashes, green checkmark animates in |
   122|| 0.5-1.5s | ROUTE + CERTIFY BIRTH | Agent circles spawn from center with ripple. Each gets colored ring (green/purple/amber by model tier). Birth cert icon (🔏) pulses if PQC on. Model label fades in below each. |
   123|| 1.5-2.5s | EXECUTE | Agents pulse while "running". Progress ring fills around each. One random agent fails (red flash). |
   124|| 2.5-3.5s | CERTIFY DEATH + AUDIT | Completed = green glow, failed = red. Death cert icon appears. Hedera audit line animates if enabled. |
   125|| 3.5-4s | DIE | Agents fade with dissolve. Summary stats: "4/5 completed · 247ms avg · 2 certs issued" |
   126|
   127|**Agent node design:** 48px circles with 2px colored border. Agent number centered. During execution, a conic-gradient progress ring fills clockwise.
   128|
   129|**After sequence — Timeline Scrubber:**
   130|- Horizontal range input snapping to 6 labeled points: ENFORCE / ROUTE / BIRTH / EXECUTE / DEATH / AUDIT
   131|- Dragging replays animation to that point (state is frozen)
   132|- Click any agent circle to inspect individual journey
   133|
   134|**Certificate Inspector** (expandable panel below scrubber):
   135|- Appears when scrubber is on BIRTH or DEATH, or when an agent is clicked
   136|- Shows real data:
   137|  - Type: birth/death
   138|  - Agent ID
   139|  - Algorithm: ML-DSA-65 (FIPS 204)
   140|  - Signature: hex (truncated with expand, full 3309 bytes)
   141|  - Public Key: hex (truncated, full 1952 bytes)
   142|  - Payload: JSON
   143|  - [Verify] button → runs `ml_dsa65.verify()` live → shows ✓ Valid / ✗ Invalid
   144|
   145|### 4. Code Output Panel (Bottom)
   146|
   147|- Dark code block with faint neon border glow matching tier color
   148|- Syntax highlighting via CSS classes (no library):
   149|  - Keywords (const, await, import, from) → neon green
   150|  - Strings → amber
   151|  - Comments → dim gray (#555)
   152|  - Types → purple
   153|- Live updates on every control change
   154|- Only includes non-default config values (clean output)
   155|- Shows `pqcIdentity` block only when PQC is on
   156|- When tier is free and PQC-locked features are relevant, adds comment: `// Upgrade to Pro for PQC identity`
   157|- Copy button with "Copied!" flash
   158|- Install line: `npm i @gridera/migrate` with its own copy button
   159|
   160|### Code Template
   161|
   162|```typescript
   163|import { SwarmSpawner } from "@gridera/migrate";
   164|
   165|const spawner = new SwarmSpawner({
   166|  // Only non-default values shown
   167|  maxParallel: 5,
   168|  timeout: 30000,
   169|  enableAuditTrail: true,
   170|  hederaNetwork: "testnet",
   171|  pqcIdentity: {
   172|    masterSeed: crypto.getRandomValues(new Uint8Array(32)),
   173|  },
   174|});
   175|
   176|const result = await spawner.spawn({
   177|  tasks: [
   178|    { id: "task-1", description: "Analyze data",
   179|      input: { source: "api" }, modelTier: "fast" },
   180|    // ... N more tasks
   181|  ],
   182|  strategy: "parallel",
   183|});
   184|
   185|console.log(result);
   186|// { total: 5, passed: 4, failed: 1, duration: 1247 }
   187|```
   188|
   189|## State Management
   190|
   191|Single state object, every control writes to it, every render reads from it:
   192|
   193|```javascript
   194|const DEFAULTS = {
   195|  tasks: 5, strategy: 'parallel', modelTier: 'fast',
   196|  tier: 'free', pqc: false, audit: true,
   197|  maxParallel: 5, timeout: 30, network: 'testnet'
   198|};
   199|
   200|const state = { ...DEFAULTS };
   201|// + animation state: phase, progress, agents[], certs[], scrubberPosition
   202|```
   203|
   204|`updateAll()` called on every control change → re-renders code panel + updates locked states.
   205|
   206|## CSS Theme
   207|
   208|```css
   209|:root {
   210|  --bg: #0a0a0f;
   211|  --bg-card: #111118;
   212|  --bg-input: #16161e;
   213|  --border: #1e1e2a;
   214|  --text: #c8c8d0;
   215|  --text-dim: #555566;
   216|  --neon-green: #00ffa3;
   217|  --neon-purple: #a78bfa;
   218|  --neon-amber: #f59e0b;
   219|  --neon-red: #ef4444;
   220|  --font-mono: 'SF Mono', 'Fira Code', 'JetBrains Mono', monospace;
   221|}
   222|```
   223|
   224|Neon glow effect: `box-shadow: 0 0 12px var(--neon-green), 0 0 24px rgba(0,255,163,0.15);`
   225|
   226|## Performance Constraints
   227|
   228|- Animation: CSS transitions + requestAnimationFrame only, no animation libraries
   229|- PQC keygen is ~50-100ms per agent — run in sequence, not blocking UI (use setTimeout batching)
   230|- Total page weight target: <100KB (21KB noble + ~30KB CSS + ~40KB JS + ~5KB HTML)
   231|
   232|## Out of Scope
   233|
   234|- Mobile responsive layout (desktop-first enterprise tool)
   235|- Auth / signup forms
   236|- Actual Hedera network calls
   237|- Actual LLM execution
   238|- Backend of any kind
   239|