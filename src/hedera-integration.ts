     1|// Hiero SDK imports (formerly @hashgraph/sdk — migrated to Linux Foundation namespace)
     2|import {
     3|  Client,
     4|  AccountId,
     5|  PrivateKey,
     6|  TopicId,
     7|  TopicCreateTransaction,
     8|  TopicMessageSubmitTransaction,
     9|} from "@hiero-ledger/sdk";
    10|
    11|export interface AuditEntry {
    12|  id: string;
    13|  timestamp: string;
    14|  agentId: string;
    15|  action: "SWARM_START" | "SWARM_COMPLETE" | "AGENT_BIRTH" | "AGENT_DEATH" | "AGENT_COMPLETE";
    16|  payload: string;
    17|  signature?: string;
    18|  topicId?: string;
    19|  sequenceNumber?: number;
    20|}
    21|
    22|export interface PQCSigningResult {
    23|  signature: string;
    24|  publicKey: string;
    25|  timestamp: string;
    26|}
    27|
    28|export class HederaIntegration {
    29|  private client: Client;
    30|  private topicId?: TopicId;
    31|  private operatorId?: AccountId;
    32|  private operatorKey?: PrivateKey;
    33|
    34|  constructor(network: "testnet" | "mainnet" = "testnet") {
    35|    const envVar =
    36|      network === "testnet"
    37|        ? "HEDERA_OPERATOR_ID"
    38|        : "HEDERA_MAINNET_OPERATOR_ID";
    39|    const keyVar =
    40|      network === "testnet"
    41|        ? "HEDERA_OPERATOR_KEY"
    42|        : "HEDERA_MAINNET_OPERATOR_KEY";
    43|
    44|    const operatorId = process.env[envVar];
    45|    const operatorKey = process.env[keyVar];
    46|
    47|    if (operatorId && operatorKey) {
    48|      this.operatorId = AccountId.fromString(operatorId);
    49|      this.operatorKey = PrivateKey.fromString(operatorKey);
    50|      this.client =
    51|        network === "mainnet"
    52|          ? Client.forMainnet().setOperator(this.operatorId, this.operatorKey)
    53|          : Client.forTestnet().setOperator(this.operatorId, this.operatorKey);
    54|    } else {
    55|      this.client =
    56|        network === "mainnet" ? Client.forMainnet() : Client.forTestnet();
    57|    }
    58|  }
    59|
    60|  async createAuditTopic(description: string): Promise<string> {
    61|    if (!this.operatorId || !this.operatorKey) {
    62|      throw new Error(
    63|        "Operator credentials required. Set HEDERA_OPERATOR_ID and HEDERA_OPERATOR_KEY",
    64|      );
    65|    }
    66|
    67|    const transaction = new TopicCreateTransaction().setTopicMemo(
    68|      `GRIDERA Migrate Audit: ${description}`,
    69|    );
    70|
    71|    const response = await transaction.execute(this.client);
    72|    const receipt = await response.getReceipt(this.client);
    73|
    74|    if (receipt.topicId) {
    75|      this.topicId = receipt.topicId;
    76|      return this.topicId.toString();
    77|    }
    78|    throw new Error("Failed to create topic");
    79|  }
    80|
    81|  async logSwarmStart(data: {
    82|    taskCount: number;
    83|    strategy: string;
    84|    timestamp: string;
    85|  }): Promise<AuditEntry> {
    86|    const entry: AuditEntry = {
    87|      id: `audit-${Date.now()}`,
    88|      timestamp: data.timestamp,
    89|      agentId: "swarm-coordinator",
    90|      action: "SWARM_START",
    91|      payload: JSON.stringify(data),
    92|    };
    93|
    94|    return this.submitAuditEntry(entry);
    95|  }
    96|
    97|  async logSwarmComplete(data: {
    98|    successCount: number;
    99|    failureCount: number;
   100|    duration: number;
   101|    auditEntries: AuditEntry[];
   102|  }): Promise<AuditEntry> {
   103|    const entry: AuditEntry = {
   104|      id: `audit-${Date.now()}`,
   105|      timestamp: new Date().toISOString(),
   106|      agentId: "swarm-coordinator",
   107|      action: "SWARM_COMPLETE",
   108|      payload: JSON.stringify(data),
   109|    };
   110|
   111|    return this.submitAuditEntry(entry);
   112|  }
   113|
   114|  async signAndLog(
   115|    agent: { id: string; task: string; status: string },
   116|    keyPair: { publicKey: string; privateKey: string },
   117|  ): Promise<AuditEntry> {
   118|    const payload = JSON.stringify({
   119|      agentId: agent.id,
   120|      task: agent.task,
   121|      status: agent.status,
   122|    });
   123|    const pqcResult = await this.signWithPQC(payload, keyPair);
   124|
   125|    const entry: AuditEntry = {
   126|      id: `audit-${Date.now()}-${agent.id}`,
   127|      timestamp: new Date().toISOString(),
   128|      agentId: agent.id,
   129|      action: "AGENT_COMPLETE",
   130|      payload,
   131|      signature: pqcResult.signature,
   132|    };
   133|
   134|    return this.submitAuditEntry(entry);
   135|  }
   136|
   137|  /**
   138|   * @deprecated Use PQCIdentityManager for real ML-DSA-65 signing.
   139|   * This legacy method is retained only for backward compatibility
   140|   * with v0.1.0 consumers. It provides NO cryptographic security.
   141|   */
   142|  async signWithPQC(
   143|    payload: string,
   144|    _keyPair: { publicKey: string; privateKey: string },
   145|  ): Promise<PQCSigningResult> {
   146|    console.warn(
   147|      "[Hedera] signWithPQC() is deprecated and provides no security. Use PQCIdentityManager instead.",
   148|    );
   149|    return {
   150|      signature: "(deprecated-no-crypto)",
   151|      publicKey: _keyPair.publicKey,
   152|      timestamp: new Date().toISOString(),
   153|    };
   154|  }
   155|
   156|  /**
   157|   * @deprecated Use PQCIdentityManager.verify() for real ML-DSA-65 verification.
   158|   * This method always returns false to prevent false-positive trust.
   159|   */
   160|  async verifyPQCSignature(
   161|    _payload: string,
   162|    _signature: string,
   163|    _publicKey: string,
   164|  ): Promise<boolean> {
   165|    console.warn(
   166|      "[Hedera] verifyPQCSignature() is deprecated. Use PQCIdentityManager.verify() instead.",
   167|    );
   168|    return false;
   169|  }
   170|
   171|  private async submitAuditEntry(entry: AuditEntry): Promise<AuditEntry> {
   172|    if (!this.topicId || !this.operatorId || !this.operatorKey) {
   173|      // Silently skip — no topic configured. Caller gets the entry back without HCS metadata.
   174|      return entry;
   175|    }
   176|
   177|    try {
   178|      const transaction = new TopicMessageSubmitTransaction({
   179|        topicId: this.topicId,
   180|        message: JSON.stringify(entry),
   181|      });
   182|
   183|      const response = await transaction.execute(this.client);
   184|      const receipt = await response.getReceipt(this.client);
   185|
   186|      entry.topicId = this.topicId.toString();
   187|      entry.sequenceNumber = receipt.topicSequenceNumber?.low ?? 0;
   188|    } catch (error) {
   189|      console.error("[Hedera] Failed to submit audit entry:", error);
   190|    }
   191|
   192|    return entry;
   193|  }
   194|
   195|  async close(): Promise<void> {
   196|    await this.client.close();
   197|  }
   198|}
   199|
   200|