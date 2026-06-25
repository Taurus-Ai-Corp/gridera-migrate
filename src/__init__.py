     1|"""
     2|GRIDERA Migrate - Python SDK
     3|Ephemeral AI agent orchestration with Hedera blockchain auditability
     4|"""
     5|
     6|from __future__ import annotations
     7|
     8|import asyncio
     9|import json
    10|import uuid
    11|from dataclasses import dataclass, field
    12|from datetime import datetime
    13|from enum import Enum
    14|from typing import Any, Callable, Optional
    15|from event_emitter import Emitter
    16|
    17|
    18|class ModelTier(str, Enum):
    19|    FAST = "fast"
    20|    BALANCED = "balanced"
    21|    DEEP = "deep"
    22|
    23|
    24|class AgentStatus(str, Enum):
    25|    PENDING = "pending"
    26|    RUNNING = "running"
    27|    COMPLETED = "completed"
    28|    FAILED = "failed"
    29|
    30|
    31|class Network(str, Enum):
    32|    TESTNET = "testnet"
    33|    MAINNET = "mainnet"
    34|
    35|
    36|@dataclass
    37|class ModelConfig:
    38|    provider: str
    39|    model: str
    40|    temperature: float
    41|    max_tokens: int
    42|    context_window: int
    43|    cost: str
    44|
    45|
    46|MODEL_REGISTRY = {
    47|    ModelTier.FAST: [
    48|        ModelConfig("groq", "llama-3.1-8b-instant", 0.3, 1024, 8192, "low"),
    49|        ModelConfig("ollama", "qwen3-coder:latest", 0.3, 4096, 32768, "low"),
    50|        ModelConfig("google", "gemini-1.5-flash", 0.3, 4096, 1000000, "low"),
    51|    ],
    52|    ModelTier.BALANCED: [
    53|        ModelConfig(
    54|            "anthropic", "claude-3-5-haiku-20241022", 0.5, 8192, 200000, "medium"
    55|        ),
    56|        ModelConfig("openai", "gpt-4o-mini", 0.5, 16384, 128000, "medium"),
    57|        ModelConfig("google", "gemini-1.5-pro", 0.5, 8192, 2000000, "medium"),
    58|    ],
    59|    ModelTier.DEEP: [
    60|        ModelConfig(
    61|            "anthropic", "claude-sonnet-4-20250514", 0.7, 64000, 200000, "high"
    62|        ),
    63|        ModelConfig("openai", "gpt-4-turbo", 0.7, 32000, 128000, "high"),
    64|        ModelConfig("ollama", "deepseek-coder-v2:latest", 0.7, 16384, 65536, "high"),
    65|    ],
    66|}
    67|
    68|
    69|class ModelRouter:
    70|    def __init__(self):
    71|        self._last_used: dict[ModelTier, int] = {}
    72|        self._cache: dict[str, ModelConfig] = {}
    73|
    74|    def select_model(self, tier: ModelTier) -> ModelConfig:
    75|        models = MODEL_REGISTRY[tier]
    76|        index = self._round_robin_index(tier, len(models))
    77|        model = models[index]
    78|        self._last_used[tier] = index
    79|        return model
    80|
    81|    def _round_robin_index(self, tier: ModelTier, max: int) -> int:
    82|        last = self._last_used.get(tier, -1)
    83|        return (last + 1) % max
    84|
    85|    def get_cached_model(self, cache_key: str) -> Optional[ModelConfig]:
    86|        return self._cache.get(cache_key)
    87|
    88|    def cache_model(self, cache_key: str, model: ModelConfig) -> None:
    89|        self._cache[cache_key] = model
    90|
    91|
    92|@dataclass
    93|class EphemeralAgent:
    94|    id: str
    95|    task: str
    96|    model: ModelConfig
    97|    input: dict[str, Any]
    98|    output: Optional[Any] = None
    99|    status: AgentStatus = AgentStatus.PENDING
   100|    created_at: datetime = field(default_factory=datetime.now)
   101|    completed_at: Optional[datetime] = None
   102|    error: Optional[str] = None
   103|
   104|
   105|@dataclass
   106|class AuditEntry:
   107|    id: str
   108|    timestamp: str
   109|    agent_id: str
   110|    action: str
   111|    payload: str
   112|    signature: Optional[str] = None
   113|    topic_id: Optional[str] = None
   114|    sequence_number: Optional[int] = None
   115|
   116|
   117|class HederaIntegration:
   118|    def __init__(self, network: Network = Network.TESTNET):
   119|        self.network = network
   120|        self._topic_id: Optional[str] = None
   121|
   122|    async def log_swarm_start(self, data: dict) -> AuditEntry:
   123|        return AuditEntry(
   124|            id=f"audit-{datetime.now().timestamp()}",
   125|            timestamp=data.get("timestamp", datetime.now().isoformat()),
   126|            agent_id="swarm-coordinator",
   127|            action="SWARM_START",
   128|            payload=json.dumps(data),
   129|        )
   130|
   131|    async def log_swarm_complete(self, data: dict) -> AuditEntry:
   132|        return AuditEntry(
   133|            id=f"audit-{datetime.now().timestamp()}",
   134|            timestamp=datetime.now().isoformat(),
   135|            agent_id="swarm-coordinator",
   136|            action="SWARM_COMPLETE",
   137|            payload=json.dumps(data),
   138|        )
   139|
   140|    async def sign_and_log(self, agent: EphemeralAgent, key_pair: dict) -> AuditEntry:
   141|        payload = json.dumps(
   142|            {
   143|                "agentId": agent.id,
   144|                "task": agent.task,
   145|                "status": agent.status.value,
   146|            }
   147|        )
   148|        return AuditEntry(
   149|            id=f"audit-{datetime.now().timestamp()}-{agent.id}",
   150|            timestamp=datetime.now().isoformat(),
   151|            agent_id=agent.id,
   152|            action="AGENT_COMPLETE",
   153|            payload=payload,
   154|            signature="pqc-signature-placeholder",
   155|        )
   156|
   157|
   158|class ResultAggregator:
   159|    @staticmethod
   160|    def aggregate(agents: list[EphemeralAgent]) -> dict:
   161|        success_count = sum(1 for a in agents if a.status == AgentStatus.COMPLETED)
   162|        failure_count = sum(1 for a in agents if a.status == AgentStatus.FAILED)
   163|
   164|        results = [
   165|            {
   166|                "agentId": a.id,
   167|                "status": a.status.value,
   168|                "output": a.output,
   169|                "error": a.error,
   170|                "duration": (
   171|                    a.completed_at.timestamp() - a.created_at.timestamp() * 1000
   172|                )
   173|                if a.completed_at
   174|                else 0,
   175|            }
   176|            for a in agents
   177|        ]
   178|
   179|        return {
   180|            "totalAgents": len(agents),
   181|            "successCount": success_count,
   182|            "failureCount": failure_count,
   183|            "successRate": success_count / len(agents) if agents else 0,
   184|            "totalDuration": sum(r["duration"] for r in results),
   185|            "results": results,
   186|            "errors": [
   187|                {"agentId": a.id, "error": a.error}
   188|                for a in agents
   189|                if a.status == AgentStatus.FAILED
   190|            ],
   191|        }
   192|
   193|
   194|@dataclass
   195|class SwarmConfig:
   196|    max_parallel: int = 5
   197|    timeout: int = 120000
   198|    retry_attempts: int = 2
   199|    retry_delay: int = 1000
   200|    enable_audit_trail: bool = True
   201|    hedera_network: Network = Network.TESTNET
   202|    pqc_key_pair: Optional[dict] = None
   203|
   204|
   205|@dataclass
   206|class SpawnTask:
   207|    id: str
   208|    description: str
   209|    input: dict[str, Any]
   210|    model_tier: ModelTier = ModelTier.BALANCED
   211|
   212|
   213|@dataclass
   214|class SpawnRequest:
   215|    tasks: list[SpawnTask]
   216|    strategy: str = "parallel"
   217|
   218|
   219|class SwarmSpawner:
   220|    def __init__(self, config: Optional[SwarmConfig] = None):
   221|        self.config = config or SwarmConfig()
   222|        self.router = ModelRouter()
   223|        self.hedera = HederaIntegration(self.config.hedera_network)
   224|        self._active_agents: dict[str, EphemeralAgent] = {}
   225|        self._emitter = Emitter()
   226|
   227|    def on(self, event: str, handler: Callable) -> None:
   228|        self._emitter.on(event, handler)
   229|
   230|    async def spawn(self, request: SpawnRequest) -> dict:
   231|        start_time = datetime.now()
   232|        audit_entries: list[AuditEntry] = []
   233|
   234|        if self.config.enable_audit_trail:
   235|            entry = await self.hedera.log_swarm_start(
   236|                {
   237|                    "taskCount": len(request.tasks),
   238|                    "strategy": request.strategy,
   239|                    "timestamp": start_time.isoformat(),
   240|                }
   241|            )
   242|            audit_entries.append(entry)
   243|
   244|        agents = self._route_and_spawn(request.tasks)
   245|
   246|        if request.strategy == "sequential":
   247|            await self._run_sequential(agents, audit_entries)
   248|        else:
   249|            await self._run_parallel(agents, audit_entries)
   250|
   251|        result = ResultAggregator.aggregate(list(self._active_agents.values()))
   252|
   253|        if self.config.enable_audit_trail:
   254|            await self.hedera.log_swarm_complete(
   255|                {
   256|                    **result,
   257|                    "duration": (datetime.now() - start_time).total_seconds() * 1000,
   258|                    "auditEntries": len(audit_entries),
   259|                }
   260|            )
   261|
   262|        return result
   263|
   264|    def _route_and_spawn(self, tasks: list[SpawnTask]) -> list[EphemeralAgent]:
   265|        agents = []
   266|        for task in tasks:
   267|            model = self.router.select_model(task.model_tier)
   268|            agent = EphemeralAgent(
   269|                id=f"agent-{uuid.uuid4().hex[:9]}",
   270|                task=task.description,
   271|                model=model,
   272|                input=task.input,
   273|                status=AgentStatus.PENDING,
   274|            )
   275|            self._active_agents[agent.id] = agent
   276|            agents.append(agent)
   277|        return agents
   278|
   279|    async def _run_parallel(
   280|        self, agents: list[EphemeralAgent], audit_entries: list[AuditEntry]
   281|    ) -> None:
   282|        chunks = [
   283|            agents[i : i + self.config.max_parallel]
   284|            for i in range(0, len(agents), self.config.max_parallel)
   285|        ]
   286|        for chunk in asyncio.gather(
   287|            *[self._execute_agent(a, audit_entries) for a in chunk]
   288|        ):
   289|            pass
   290|
   291|    async def _run_sequential(
   292|        self, agents: list[EphemeralAgent], audit_entries: list[AuditEntry]
   293|    ) -> None:
   294|        for agent in agents:
   295|            await self._execute_agent(agent, audit_entries)
   296|
   297|    async def _execute_agent(
   298|        self, agent: EphemeralAgent, audit_entries: list[AuditEntry]
   299|    ) -> None:
   300|        agent.status = AgentStatus.RUNNING
   301|        self._emitter.emit("agent:start", agent)
   302|
   303|        try:
   304|            result = await asyncio.wait_for(
   305|                self._invoke_model(agent), timeout=self.config.timeout / 1000
   306|            )
   307|            agent.output = result
   308|            agent.status = AgentStatus.COMPLETED
   309|            agent.completed_at = datetime.now()
   310|
   311|            if self.config.enable_audit_trail and self.config.pqc_key_pair:
   312|                entry = await self.hedera.sign_and_log(agent, self.config.pqc_key_pair)
   313|                audit_entries.append(entry)
   314|        except Exception as e:
   315|            agent.status = AgentStatus.FAILED
   316|            agent.error = str(e)
   317|            agent.completed_at = datetime.now()
   318|
   319|        self._emitter.emit("agent:complete", agent)
   320|
   321|    async def _invoke_model(self, agent: EphemeralAgent) -> Any:
   322|        await asyncio.sleep(0.1)
   323|        return {"agentId": agent.id, "result": f"Processed: {agent.task}"}
   324|
   325|    def get_active_agents(self) -> list[EphemeralAgent]:
   326|        return list(self._active_agents.values())
   327|
   328|    def destroy(self) -> None:
   329|        self._active_agents.clear()
   330|
   331|
   332|__all__ = [
   333|    "SwarmSpawner",
   334|    "SwarmConfig",
   335|    "SpawnRequest",
   336|    "SpawnTask",
   337|    "ModelTier",
   338|    "ModelConfig",
   339|    "HederaIntegration",
   340|    "AgentStatus",
   341|    "EphemeralAgent",
   342|]
   343|