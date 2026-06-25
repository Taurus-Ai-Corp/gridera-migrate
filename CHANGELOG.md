     1|# Changelog
     2|
     3|## [0.4.0] - 2026-04-04
     4|
     5|### Added
     6|- `LicenseManager` — ML-DSA-65 signed license keys (asymmetric PQC, NIST FIPS 204)
     7|- `npx @gridera/migrate init` CLI — scaffolds example project
     8|- Demo GIF in README (recorded with vhs)
     9|- Stripe billing reference implementation (`examples/stripe-billing/server.ts`)
    10|- `exports.default` field for CJS/tsx compatibility
    11|- `CLAUDE.md` project instructions for future sessions
    12|- GitHub Actions CI workflow
    13|
    14|### Changed
    15|- License keys upgraded from HMAC-SHA256 to ML-DSA-65 (quantum-safe, asymmetric)
    16|- PQC key derivation now cached between birth/death certificates (2x faster)
    17|- `activeAgents` cleared between `spawn()` calls (bug fix)
    18|- `mergeResults()` computes correct weighted success rate (bug fix)
    19|- Removed dead code: `ModelRouter.cache`, `selectModelForTask`, `mintCredential`, SDK re-exports
    20|- `AuditEntry.action` type-narrowed to union literal
    21|- Agent/swarm IDs use `crypto.randomUUID()` instead of `Math.random()`
    22|- Deprecated `signWithPQC()` / `verifyPQCSignature()` — use PQCIdentityManager instead
    23|
    24|### Security
    25|- Removed fake PQC stubs (generatePQCKeyPair, pqcSign) — replaced by real ML-DSA-65
    26|- `verifyPQCSignature()` now returns `false` (was always returning `true`)
    27|- License keys are asymmetric — public key embedded in npm package cannot forge keys
    28|
    29|## [0.2.0] - 2026-04-03
    30|
    31|### Breaking Changes
    32|- Package entry point now correctly resolves (`dist/index.js` barrel export)
    33|
    34|### Added
    35|- `ModelExecutor` type — pluggable model execution interface
    36|- `defaultExecutor` — echo executor for testing
    37|- `SwarmConfig.executor` — optional custom executor in config
    38|- `PQCIdentityManager` — real ML-DSA-65 birth/death certificates (NIST FIPS 204)
    39|- `TierEnforcer` — Free/Pro/Enterprise tier gating with JWT license keys
    40|- `agent:model:start` and `agent:model:complete` observability events
    41|- `.npmignore` — clean tarball (dist/ only)
    42|
    43|### Fixed
    44|- `createAuditTopic()` uses `TopicCreateTransaction` (was incorrectly using `TopicMessageSubmitTransaction`)
    45|- Hedera client respects `mainnet` parameter (was always testnet)
    46|- npm tarball no longer includes source files, IDE integrations, or Go/Rust code
    47|
    48|### Changed
    49|- Package size: 90.5 KB → 54.4 KB (40% smaller)
    50|- Test suite: 13 → 46 tests across 3 files
    51|
    52|## [0.1.0] - 2026-04-01
    53|
    54|### Added
    55|- Initial release
    56|- SwarmSpawner with parallel/sequential execution
    57|- ModelRouter with fast/balanced/deep tier selection
    58|- HederaIntegration for audit trails (PQC stubs)
    59|- ResultAggregator for pass/fail metrics
    60|- Multi-language stubs (Python, Rust, Go)
    61|- IDE integrations (Claude Code, Cursor, VS Code)
    62|