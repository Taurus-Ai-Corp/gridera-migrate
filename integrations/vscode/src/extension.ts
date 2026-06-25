     1|import * as vscode from 'vscode';
     2|import { SwarmSpawner, type SwarmConfig, type SpawnRequest } from '../../src/spawner.js';
     3|
     4|let spawner: SwarmSpawner | undefined;
     5|let statusBar: vscode.StatusBarItem;
     6|
     7|function getConfig(): Partial<SwarmConfig> {
     8|  const workspaceConfig = vscode.workspace.getConfiguration('swarmSpawner');
     9|  return {
    10|    maxParallel: workspaceConfig.get('maxParallel', 5),
    11|    timeout: workspaceConfig.get('timeout', 120000),
    12|    enableAuditTrail: workspaceConfig.get('enableAuditTrail', true),
    13|    hederaNetwork: workspaceConfig.get('hederaNetwork', 'testnet'),
    14|  };
    15|}
    16|
    17|function initSpawner(): SwarmSpawner {
    18|  if (!spawner) {
    19|    spawner = new SwarmSpawner(getConfig());
    20|    
    21|    spawner.on('agent:start', (agent) => {
    22|      vscode.window.showInformationMessage(`[Swarm] Agent ${agent.id} started using ${agent.model.provider}/${agent.model.model}`);
    23|    });
    24|    
    25|    spawner.on('agent:complete', (agent) => {
    26|      updateStatusBar();
    27|    });
    28|    
    29|    spawner.on('complete', (result) => {
    30|      vscode.window.showInformationMessage(
    31|        `Swarm complete: ${result.successCount}/${result.totalAgents} tasks succeeded (${Math.round(result.successRate * 100)}% success rate)`
    32|      );
    33|      updateStatusBar();
    34|    });
    35|  }
    36|  return spawner;
    37|}
    38|
    39|function updateStatusBar(): void {
    40|  if (!statusBar) return;
    41|  const agents = spawner?.getActiveAgents() ?? [];
    42|  const running = agents.filter(a => a.status === 'running').length;
    43|  statusBar.text = `$(hubot) Swarm: ${running} active`;
    44|  statusBar.show();
    45|}
    46|
    47|export function activate(context: vscode.ExtensionContext): void {
    48|  statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    49|  statusBar.text = '$(hubot) Swarm: Ready';
    50|  statusBar.show();
    51|  
    52|  context.subscriptions.push(statusBar);
    53|
    54|  const spawnCommand = vscode.commands.registerCommand('gridera-migrate.spawn', async () => {
    55|    const editor = vscode.window.activeTextEditor;
    56|    if (!editor) {
    57|      vscode.window.showErrorMessage('No active editor');
    58|      return;
    59|    }
    60|
    61|    const selection = editor.selection;
    62|    const taskText = editor.document.getText(selection);
    63|    
    64|    if (!taskText.trim()) {
    65|      vscode.window.showErrorMessage('No task selected. Please select the task description.');
    66|      return;
    67|    }
    68|
    69|    const s = initSpawner();
    70|    
    71|    const request: SpawnRequest = {
    72|      tasks: [
    73|        {
    74|          id: `task-${Date.now()}`,
    75|          description: taskText,
    76|          input: { file: editor.document.uri.fsPath },
    77|          modelTier: 'balanced',
    78|        },
    79|      ],
    80|      strategy: 'parallel',
    81|    };
    82|
    83|    try {
    84|      const result = await s.spawn(request);
    85|      vscode.window.showInformationMessage(`Swarm completed: ${result.successCount}/${result.totalAgents}`);
    86|    } catch (error) {
    87|      vscode.window.showErrorMessage(`Swarm failed: ${error}`);
    88|    }
    89|  });
    90|
    91|  const statusCommand = vscode.commands.registerCommand('gridera-migrate.status', () => {
    92|    const agents = spawner?.getActiveAgents() ?? [];
    93|    if (agents.length === 0) {
    94|      vscode.window.showInformationMessage('No active agents');
    95|      return;
    96|    }
    97|    
    98|    const info = agents.map(a => `${a.id}: ${a.status}`).join('\n');
    99|    vscode.window.showInformationMessage(`Active Agents:\n${info}`);
   100|  });
   101|
   102|  const stopCommand = vscode.commands.registerCommand('gridera-migrate.stop', () => {
   103|    spawner?.destroy();
   104|    spawner = undefined;
   105|    vscode.window.showInformationMessage('All agents stopped');
   106|    statusBar.text = '$(hubot) Swarm: Ready';
   107|  });
   108|
   109|  context.subscriptions.push(spawnCommand, statusCommand, stopCommand);
   110|}
   111|
   112|export function deactivate(): void {
   113|  spawner?.destroy();
   114|  statusBar?.dispose();
   115|}