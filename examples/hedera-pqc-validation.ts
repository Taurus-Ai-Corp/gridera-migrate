     1|import { SwarmSpawner } from '../src/spawner.js';
     2|import type { SwarmConfig } from '../src/spawner.js';
     3|
     4|const config: Partial<SwarmConfig> = {
     5|  maxParallel: 3,
     6|  timeout: 60000,
     7|  enableAuditTrail: true,
     8|  hederaNetwork: 'testnet',
     9|  pqcKeyPair: {
    10|    publicKey: process.env.PQC_PUBLIC_KEY ?? 'demo-public-key',
    11|    privateKey: process.env.PQC_PRIVATE_KEY ?? 'demo-private-key',
    12|  },
    13|};
    14|
    15|async function runPQCValidationExample() {
    16|  console.log('=== GRIDERA Migrate: Hedera PQC Validation Example ===\n');
    17|
    18|  const spawner = new SwarmSpawner(config);
    19|
    20|  spawner.on('agent:start', (agent) => {
    21|    console.log(`[Start] Agent ${agent.id} using ${agent.model.provider}/${agent.model.model}`);
    22|  });
    23|
    24|  spawner.on('agent:complete', (agent) => {
    25|    console.log(`[Complete] Agent ${agent.id}: ${agent.status}`);
    26|  });
    27|
    28|  spawner.on('complete', (result) => {
    29|    console.log('\n=== Swarm Results ===');
    30|    console.log(`Total: ${result.totalAgents}, Success: ${result.successCount}, Failed: ${result.failureCount}`);
    31|    console.log(`Success Rate: ${(result.successRate * 100).toFixed(1)}%`);
    32|    console.log(`Duration: ${result.totalDuration}ms`);
    33|    if (result.errors.length > 0) {
    34|      console.log('Errors:', result.errors);
    35|    }
    36|  });
    37|
    38|  const request = {
    39|    tasks: [
    40|      {
    41|        id: 'pqc-validate-1',
    42|        description: 'Validate RSA-2048 key is quantum-vulnerable',
    43|        input: { keyType: 'RSA', keySize: 2048 },
    44|        modelTier: 'balanced' as const,
    45|      },
    46|      {
    47|        id: 'pqc-validate-2',
    48|        description: 'Scan SSL certificates for post-quantum readiness',
    49|        input: { targets: ['example.com', 'api.example.com'] },
    50|        modelTier: 'fast' as const,
    51|      },
    52|      {
    53|        id: 'pqc-validate-3',
    54|        description: 'Generate PQC migration recommendations',
    55|        input: { currentConfig: { algorithm: 'ECDSA-P256' } },
    56|        modelTier: 'deep' as const,
    57|      },
    58|      {
    59|        id: 'pqc-validate-4',
    60|        description: 'Audit cryptographic supply chain',
    61|        input: { providers: ['cloudflare', 'aws', 'azure'] },
    62|        modelTier: 'balanced' as const,
    63|      },
    64|    ],
    65|    strategy: 'parallel' as const,
    66|  };
    67|
    68|  console.log('Spawning swarm with', request.tasks.length, 'tasks...\n');
    69|  
    70|  const result = await spawner.spawn(request);
    71|  
    72|  console.log('\n=== Output Results ===');
    73|  result.results.forEach((r) => {
    74|    console.log(`- ${r.agentId}: ${r.status} (${r.duration}ms)`);
    75|  });
    76|
    77|  spawner.destroy();
    78|}
    79|
    80|runPQCValidationExample().catch(console.error);