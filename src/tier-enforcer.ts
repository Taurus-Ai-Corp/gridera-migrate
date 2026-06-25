     1|/**
     2| * TierEnforcer — License-based tier enforcement for GRIDERA Migrate.
     3| *
     4| * Free / Pro ($49/mo) / Enterprise (custom).
     5| * License keys are simple JWTs (base64-encoded JSON, no crypto verification in v1).
     6| */
     7|
     8|export type Tier = "free" | "pro" | "enterprise";
     9|
    10|export interface LicensePayload {
    11|  tier: Tier;
    12|  org: string;
    13|  exp: number; // Unix timestamp (seconds)
    14|  maxAgents?: number; // enterprise custom limit
    15|  features: string[]; // enabled feature flags
    16|}
    17|
    18|export interface TierLimits {
    19|  maxAgentsPerSpawn: number;
    20|  maxSpawnsPerDay: number;
    21|  allowedNetworks: Array<"testnet" | "mainnet">;
    22|  pqcSigningEnabled: boolean;
    23|  allowedModelTiers: Array<"fast" | "balanced" | "deep">;
    24|}
    25|
    26|export type TierCheck =
    27|  | { type: "agentCount"; count: number }
    28|  | { type: "network"; network: "testnet" | "mainnet" }
    29|  | { type: "pqcSigning" }
    30|  | { type: "modelTier"; modelTier: "fast" | "balanced" | "deep" }
    31|  | { type: "feature"; feature: string };
    32|
    33|const UPGRADE_URL = "https://migrate.gridera.net/pricing";
    34|
    35|const TIER_LIMITS: Record<Tier, TierLimits> = {
    36|  free: {
    37|    maxAgentsPerSpawn: 5,
    38|    maxSpawnsPerDay: 10,
    39|    allowedNetworks: ["testnet"],
    40|    pqcSigningEnabled: false,
    41|    allowedModelTiers: ["fast"],
    42|  },
    43|  pro: {
    44|    maxAgentsPerSpawn: Infinity,
    45|    maxSpawnsPerDay: Infinity,
    46|    allowedNetworks: ["testnet", "mainnet"],
    47|    pqcSigningEnabled: true,
    48|    allowedModelTiers: ["fast", "balanced", "deep"],
    49|  },
    50|  enterprise: {
    51|    maxAgentsPerSpawn: Infinity, // overridden by license maxAgents
    52|    maxSpawnsPerDay: Infinity,
    53|    allowedNetworks: ["testnet", "mainnet"],
    54|    pqcSigningEnabled: true,
    55|    allowedModelTiers: ["fast", "balanced", "deep"],
    56|  },
    57|};
    58|
    59|export class TierEnforcer {
    60|  private readonly tier: Tier;
    61|  private readonly payload: LicensePayload;
    62|  private readonly limits: TierLimits;
    63|
    64|  constructor(licenseKey?: string) {
    65|    if (!licenseKey) {
    66|      this.tier = "free";
    67|      this.payload = {
    68|        tier: "free",
    69|        org: "",
    70|        exp: 0,
    71|        features: [],
    72|      };
    73|      this.limits = { ...TIER_LIMITS.free };
    74|      return;
    75|    }
    76|
    77|    this.payload = TierEnforcer.decodeLicense(licenseKey);
    78|
    79|    // Check expiry
    80|    const nowSeconds = Math.floor(Date.now() / 1000);
    81|    if (this.payload.exp <= nowSeconds) {
    82|      throw new Error(
    83|        `License expired. Renew at ${UPGRADE_URL}`,
    84|      );
    85|    }
    86|
    87|    this.tier = this.payload.tier;
    88|    this.limits = { ...TIER_LIMITS[this.tier] };
    89|
    90|    // Enterprise: honour custom maxAgents from license
    91|    if (
    92|      this.tier === "enterprise" &&
    93|      this.payload.maxAgents !== undefined
    94|    ) {
    95|      this.limits.maxAgentsPerSpawn = this.payload.maxAgents;
    96|    }
    97|  }
    98|
    99|  /** Decode the middle segment of a JWT (base64-encoded JSON). */
   100|  private static decodeLicense(key: string): LicensePayload {
   101|    const parts = key.split(".");
   102|    if (parts.length !== 3) {
   103|      throw new Error(
   104|        `Malformed license key: expected 3 JWT segments, got ${parts.length}. Upgrade at ${UPGRADE_URL}`,
   105|      );
   106|    }
   107|
   108|    try {
   109|      const json = atob(parts[1]!);
   110|      const parsed: unknown = JSON.parse(json);
   111|      return TierEnforcer.validatePayload(parsed);
   112|    } catch (err) {
   113|      if (err instanceof Error && err.message.startsWith("Malformed license")) {
   114|        throw err;
   115|      }
   116|      if (err instanceof Error && err.message.startsWith("License expired")) {
   117|        throw err;
   118|      }
   119|      if (err instanceof Error && err.message.startsWith("Invalid license")) {
   120|        throw err;
   121|      }
   122|      throw new Error(
   123|        `Malformed license key: unable to decode payload. Upgrade at ${UPGRADE_URL}`,
   124|      );
   125|    }
   126|  }
   127|
   128|  private static validatePayload(data: unknown): LicensePayload {
   129|    if (
   130|      typeof data !== "object" ||
   131|      data === null ||
   132|      !("tier" in data) ||
   133|      !("org" in data) ||
   134|      !("exp" in data) ||
   135|      !("features" in data)
   136|    ) {
   137|      throw new Error(
   138|        `Invalid license payload: missing required fields. Upgrade at ${UPGRADE_URL}`,
   139|      );
   140|    }
   141|
   142|    const d = data as Record<string, unknown>;
   143|
   144|    if (
   145|      d["tier"] !== "free" &&
   146|      d["tier"] !== "pro" &&
   147|      d["tier"] !== "enterprise"
   148|    ) {
   149|      throw new Error(
   150|        `Invalid license payload: unknown tier "${String(d["tier"])}". Upgrade at ${UPGRADE_URL}`,
   151|      );
   152|    }
   153|
   154|    return {
   155|      tier: d["tier"] as Tier,
   156|      org: String(d["org"]),
   157|      exp: Number(d["exp"]),
   158|      maxAgents:
   159|        d["maxAgents"] !== undefined ? Number(d["maxAgents"]) : undefined,
   160|      features: Array.isArray(d["features"])
   161|        ? (d["features"] as string[])
   162|        : [],
   163|    };
   164|  }
   165|
   166|  /**
   167|   * Enforce a tier check. Throws a descriptive error on violation.
   168|   */
   169|  enforce(check: TierCheck): void {
   170|    switch (check.type) {
   171|      case "agentCount": {
   172|        if (check.count > this.limits.maxAgentsPerSpawn) {
   173|          throw new Error(
   174|            `Agent limit exceeded: ${check.count} requested, max ${this.limits.maxAgentsPerSpawn} on ${this.tier} tier. Upgrade at ${UPGRADE_URL}`,
   175|          );
   176|        }
   177|        break;
   178|      }
   179|      case "network": {
   180|        if (
   181|          !(this.limits.allowedNetworks as string[]).includes(check.network)
   182|        ) {
   183|          throw new Error(
   184|            `Network "${check.network}" is not available on ${this.tier} tier. Upgrade at ${UPGRADE_URL}`,
   185|          );
   186|        }
   187|        break;
   188|      }
   189|      case "pqcSigning": {
   190|        if (!this.limits.pqcSigningEnabled) {
   191|          throw new Error(
   192|            `PQC signing is not available on ${this.tier} tier. Upgrade at ${UPGRADE_URL}`,
   193|          );
   194|        }
   195|        break;
   196|      }
   197|      case "modelTier": {
   198|        if (
   199|          !(this.limits.allowedModelTiers as string[]).includes(
   200|            check.modelTier,
   201|          )
   202|        ) {
   203|          throw new Error(
   204|            `Model tier "${check.modelTier}" is not available on ${this.tier} tier. Upgrade at ${UPGRADE_URL}`,
   205|          );
   206|        }
   207|        break;
   208|      }
   209|      case "feature": {
   210|        if (!this.isFeatureEnabled(check.feature)) {
   211|          throw new Error(
   212|            `Feature "${check.feature}" is not enabled for your license. Upgrade at ${UPGRADE_URL}`,
   213|          );
   214|        }
   215|        break;
   216|      }
   217|    }
   218|  }
   219|
   220|  /** Returns the current tier. */
   221|  getTier(): Tier {
   222|    return this.tier;
   223|  }
   224|
   225|  /** Returns the TierLimits for the current tier. */
   226|  getLimits(): TierLimits {
   227|    return { ...this.limits };
   228|  }
   229|
   230|  /** Checks whether a feature flag is enabled in the license. */
   231|  isFeatureEnabled(feature: string): boolean {
   232|    return this.payload.features.includes(feature);
   233|  }
   234|}
   235|