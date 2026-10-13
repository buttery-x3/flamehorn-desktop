export type Role = 'user' | 'assistant';
export type Kind = 'Respond' | 'Continue' | 'Narrow' | 'Expand' | 'Mirror' | 'Challenge' | 'Reinterpret' | 'History' | 'Fork' | 'Explode' | 'Merge' | 'Compare' | 'Three Experts';
export type Modifier = { name: string; text: string };
export interface ProcessConfig {
  kind: Kind; instruction: string; persona: Modifier; format: Modifier;
  template: string; templateName: string; append: boolean;
}
export interface Node {
  id: string; workspaceId: string; type: 'context' | 'reference' | 'process'; label: string;
  order: number; x: number; y: number; revision: number; removed: boolean;
  role: Role; force: boolean; selected?: string; process?: ProcessConfig;
  missing?: string; provenance?: string; purged?: boolean;
}
export interface Edge { id: string; workspaceId: string; source: string; sourcePin: string; target: string; targetPin: string; }
export interface Workspace { id: string; name: string; order: number; removed: boolean; purged?: boolean; profileId?: string; model?: string; viewport: { x: number; y: number; zoom: number }; report?: string[]; }
export interface Content { id: string; text: string; attachments: string[]; }
export interface Entry {
  id: string; nodeId: string; number: number; retained: boolean; contentId: string;
  origin: 'manual' | 'generated' | 'edited' | 'extracted'; created: string;
  basedOn?: string; producer?: { runId: string; slot: string };
}
export interface Asset { id: string; name: string; mime: string; bytes: number; }
export interface Representation {
  id: string; assetId: string; mode: 'text' | 'image' | 'pdf' | 'pdf-text';
  text?: string; pages?: { page: number; characters: number }[];
  warnings: string[]; acknowledged: boolean; parser: string;
}
export type Evidence = 'documented' | 'verified' | 'declared' | 'unsupported' | 'unknown';
export interface Capabilities {
  text: Evidence; roles: Evidence; images: Evidence; pdf: Evidence; assistantAssets: Evidence;
  overflow: 'reject' | 'unknown' | 'truncate'; contextTokens?: number; requestBytes?: number;
  outputTokens?: number; outputCap: boolean; reasoningValues: string[]; reasoning?: string;
  source: string; revision: number;
}
export interface Profile {
  id: string; name: string; kind: 'chatgpt' | 'compatible'; baseUrl: string;
  mode: 'responses' | 'chat'; capabilities: Capabilities; credentialId?: string;
  models: { id: string; name: string }[]; discoveredAt?: string; manualModel?: string;
  modelCapabilities?: Record<string, Capabilities>;
}
export interface ManifestItem {
  nodeId: string; versionId: string; contentId: string; role: Role;
  reasons: ('connected' | 'forced')[]; branches: string[];
}
export interface Compiled {
  revision: 'compiler-1'; manifest: ManifestItem[]; bindings: Record<string, string>;
  instructions: string; framing: string; omitted: string[]; errors: string[]; warnings: string[];
  cycles: string[]; edges: Edge[]; nodeIds: string[]; outputCount: number; callCount: number;
  estimatedTokens: number;
}
export interface OutputSlot {
  id: string; nodeId: string; baseVersionId?: string; baseContentId: string; revision: number;
  edgeId: string; resultVersionId?: string; carried?: boolean; staged?: string;
  outcome: 'pending' | 'generating' | 'completed' | 'failed' | 'not-attempted';
}
export interface Recipe { adapter: 'http-1'; mode: Profile['mode']; model: string; instructions: string; manifest: ManifestItem[]; settings: Record<string, unknown>; }
export interface CallRecord {
  id: string; stage: 'plan' | 'generate'; slot?: string; started: string; ended?: string;
  recipe: Recipe; outcome: 'running' | 'completed' | 'failed'; error?: string;
  text?: string; usage?: unknown; summaries?: string[]; requestId?: string;
}
export interface Run {
  id: string; actionId: string; workspaceId: string; processId: string; created: string;
  state: 'Preparing' | 'Planning' | 'Generating' | 'Validating' | 'Committing' | 'Completed' | 'Partial' | 'Failed' | 'Cancelled' | 'Interrupted';
  compiled: Compiled; config: ProcessConfig; profile: Profile; model: string;
  graph: { nodes: Node[]; edges: Edge[] }; outputs: OutputSlot[]; calls: CallRecord[];
  plan?: { slots: { slot: number; brief: string }[] }; parentId?: string; error?: string;
  cancelled: boolean; sequence: number;
}
export interface UndoRecord { id: string; workspaceId: string; label: string; nodes: Node[]; edges: Edge[]; material: Record<string, Content>; }
export interface LibraryState {
  schema: 1; id: string; revision: number; activeWorkspace: string;
  defaults: { persona: string; format: string }; theme: 'dark' | 'light';
  workspaces: Record<string, Workspace>; nodes: Record<string, Node>; edges: Record<string, Edge>;
  entries: Record<string, Entry>; contents: Record<string, Content>; assets: Record<string, Asset>;
  representations: Record<string, Representation>; profiles: Record<string, Profile>;
  runs: Record<string, Run>; undo: UndoRecord[];
}
export type Command = { type: string; [key: string]: unknown };
export interface RuntimeEvent { runId: string; sequence: number; type: string; slot?: string; text?: string; }
export interface CredentialStatus { id: string; label: string; kind: 'chatgpt' | 'key'; connected: boolean; planAllowed?: boolean; }
export interface DesktopAPI {
  command(command: Command): Promise<unknown>;
  state(): Promise<LibraryState>;
  subscribe(listener: (event: { type: string; data?: unknown }) => void): () => void;
}
