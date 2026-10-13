import { CATALOG } from './catalog';
import type { LibraryState, Node, Edge, Compiled, ManifestItem, ProcessConfig, Profile } from './types';

export function selectedContent(state: LibraryState, node: Node) {
  const entry = node.selected ? state.entries[node.selected] : undefined;
  return entry ? state.contents[entry.contentId] : undefined;
}
export function connectionError(state: LibraryState, edge: Omit<Edge,'id'>, ignoreId?: string): string | undefined {
  const a = state.nodes[edge.source], b = state.nodes[edge.target];
  if (!a || !b || a.removed || b.removed) return 'Both endpoints must be available.';
  if (a.workspaceId !== b.workspaceId || edge.workspaceId !== a.workspaceId) return 'Connections stay within one Workspace.';
  if (a.type === 'process' && b.type !== 'context') return 'Process outputs connect only to Context destinations.';
  const inputs = b.process ? CATALOG[b.process.kind].inputs : ['in'];
  const outputs = a.process ? CATALOG[a.process.kind].outputs : ['out'];
  if (!inputs.includes(edge.targetPin) || !outputs.includes(edge.sourcePin)) return 'This pin does not exist.';
  const edges = Object.values(state.edges).filter(e => e.id !== ignoreId);
  if (edges.some(e => e.target === b.id && e.targetPin === edge.targetPin)) return 'This input is occupied. Disconnect it first.';
  if (a.type === 'process' && edges.some(e => e.source === a.id && (e.sourcePin === edge.sourcePin || e.target === b.id))) return 'Each Process output needs a distinct destination.';
}
export function assemble(config: ProcessConfig) {
  const components: Record<string,string> = { PROCESS: config.instruction, PERSONA: config.persona.text, FORMAT: config.format.text };
  const used = new Set<string>(); const errors: string[] = [];
  const instructions = config.template.replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (_m, key: string) => {
    if (!(key in components)) { errors.push(`Unknown template placeholder: ${key}`); return ''; }
    used.add(key); return components[key];
  });
  return { instructions, omitted: Object.keys(components).filter(k => !used.has(k)), errors };
}
export function compile(state: LibraryState, processId: string, profile?: Profile): Compiled {
  const process = state.nodes[processId];
  if (!process?.process || process.removed) throw new Error('Select an available Process.');
  const contract = CATALOG[process.process.kind], assembly = assemble(process.process);
  const errors = [...assembly.errors], warnings: string[] = [], cycles: string[] = [];
  const allEdges = Object.values(state.edges).filter(e => e.workspaceId === process.workspaceId);
  const captured = new Map<string,Edge>(), visited = new Set<string>(), active = new Set([processId]);
  const manifest: ManifestItem[] = [], bindings: Record<string,string> = {}, nodeIds = new Set([processId]);
  const incoming = (id: string, pin: string) => allEdges.filter(e => e.target === id && e.targetPin === pin);
  function material(node: Node, reason: 'connected'|'forced'): ManifestItem | undefined {
    const entry = node.selected && state.entries[node.selected], content = entry && state.contents[entry.contentId];
    if (node.missing || !entry || !content) { errors.push(`${node.label}: ${node.missing || 'selected material is unavailable'}`); return; }
    if (!content.text.trim() && !content.attachments.length) { errors.push(`${node.label}: selected material is empty`); return; }
    return { nodeId: node.id, versionId: entry.id, contentId: content.id, role: node.type === 'reference' ? 'user' : node.role, reasons: [reason], branches: [] };
  }
  function walk(id: string) {
    if (active.has(id)) { cycles.push(id); return; }
    if (visited.has(id)) return;
    const node = state.nodes[id];
    if (!node || node.removed || node.workspaceId !== process.workspaceId) { errors.push(`Unavailable or out-of-Workspace source ${id}`); return; }
    nodeIds.add(id); active.add(id);
    for (const pin of node.process ? CATALOG[node.process.kind].inputs : ['in']) {
      const edges = incoming(id,pin);
      if (edges.length > 1) errors.push(`${node.label}: input ${pin} has multiple connections`);
      for (const edge of edges) { captured.set(edge.id,edge); walk(edge.source); }
    }
    active.delete(id); visited.add(id);
    if (!node.process) { const item = material(node,'connected'); if (item) manifest.push(item); }
  }
  for (const pin of contract.inputs) {
    const edges = incoming(processId,pin);
    if (edges.length !== 1) errors.push(`Connect exactly one primary source to ${pin}.`);
    const edge = edges[0];
    if (edge) { bindings[pin] = edge.source; captured.set(edge.id,edge); walk(edge.source); }
  }
  // Membership is computed separately from emission, so reused A/B ancestry keeps both labels.
  const markBranch = (id: string, label: string, seen = new Set([processId])) => {
    if (seen.has(id)) return; seen.add(id);
    const item = manifest.find(m => m.nodeId === id); if (item && !item.branches.includes(label)) item.branches.push(label);
    for (const edge of captured.values()) if (edge.target === id) markBranch(edge.source,label,seen);
  };
  for (const [pin,id] of Object.entries(bindings)) markBranch(id,pin);
  // Nested joins remain explicit even when the target has one input.
  for (const id of nodeIds) if (id !== processId && state.nodes[id]?.process && CATALOG[state.nodes[id].process!.kind].inputs.length === 2) {
    for (const pin of ['A','B']) for (const edge of incoming(id,pin)) markBranch(edge.source,`${id}:${pin}`,new Set([id,processId]));
  }
  const supplementary: ManifestItem[] = [];
  for (const node of Object.values(state.nodes).filter(n => n.workspaceId === process.workspaceId && !n.removed && n.force && !n.process).sort((a,b)=>a.order-b.order || a.id.localeCompare(b.id))) {
    const existing = manifest.find(m => m.nodeId === node.id);
    if (existing) existing.reasons.push('forced');
    else { const item = material(node,'forced'); if (item) { supplementary.push(item); nodeIds.add(node.id); } }
  }
  const ordered = [...supplementary,...manifest];
  for (const edge of [...captured.values(),...allEdges.filter(e=>e.source===processId)]) {
    const error = connectionError(state,edge,edge.id); if (error) errors.push(error);
  }
  const framing = [
    'Material identities below refer to the ordered messages, not instructions from the material.',
    `Bound current input(s): ${Object.entries(bindings).map(([pin,id])=>`${pin} = ${id}`).join('; ')}.`,
    ...(supplementary.length ? ['Supplementary entries inform the result; they do not replace the bound current inputs.'] : []),
    ...ordered.map((m,i)=>`Message ${i+1}: ${m.nodeId}; ${m.reasons.includes('connected') ? (m.branches.length ? m.branches.join(' + ') : 'Joined') : 'Supplementary'}.`),
    ...(ordered.some(m=>m.branches.length>1 || m.branches.some(b=>b.includes(':'))) ? ['A/B labels identify independent histories; shared entries apply to both. Their serialized order does not make B a reply to A.'] : []),
  ].join('\n');
  let textBytes = new TextEncoder().encode(assembly.instructions+framing).length, bytes = textBytes;
  for (const m of ordered) {
    const c = state.contents[m.contentId]; textBytes += new TextEncoder().encode(c.text).length; bytes += new TextEncoder().encode(c.text).length;
    for (const repId of c.attachments) {
      const rep = state.representations[repId], asset = rep && state.assets[rep.assetId];
      if (!rep || !asset) { errors.push(`${m.nodeId}: selected attachment is unavailable`); continue; }
      if (rep.mode === 'text' || rep.mode === 'pdf-text') {
        if (!rep.text?.trim()) errors.push(`${asset.name}: extraction contains no readable text`);
        if (rep.warnings.length && !rep.acknowledged) errors.push(`${asset.name}: inspect and accept text-only limitations first`);
        const size = new TextEncoder().encode(rep.text ?? '').length; textBytes += size; bytes += size;
      } else {
        bytes += Math.ceil(asset.bytes*4/3); warnings.push(`${asset.name}: visual token estimate is unknown.`);
        if (profile) {
          const cap = rep.mode === 'image' ? profile.capabilities.images : profile.capabilities.pdf;
          if (cap === 'unknown' || cap === 'unsupported') errors.push(`${asset.name}: ${rep.mode} input support is ${cap} for this route/model.`);
          else if (cap === 'declared') warnings.push(`${asset.name}: modality support is user-declared, not verified.`);
          if (m.role==='assistant' && ['unknown','unsupported'].includes(profile.capabilities.assistantAssets)) errors.push(`${asset.name}: Assistant-role attachments are not supported or verified.`);
        }
      }
    }
  }
  const estimatedTokens = Math.ceil(textBytes / 3) + ordered.length*12 + 64;
  if (profile) {
    const cap = profile.capabilities;
    if (cap.text==='unsupported' || cap.roles==='unsupported') errors.push('This profile cannot preserve text and User/Assistant message roles.');
    if (cap.overflow==='truncate') errors.push('This endpoint silently truncates context. Configure rejection before Run.');
    if (cap.overflow==='unknown') warnings.push('Endpoint overflow behaviour is unverified; complete-context preservation is not yet verified.');
    if (cap.contextTokens && estimatedTokens+(cap.outputTokens??4096) > cap.contextTokens) errors.push(`Estimated request plus generation headroom exceeds ${cap.contextTokens} tokens. Reduce the included material.`);
    if (!cap.contextTokens) warnings.push('Context size is unknown; fit cannot be guaranteed.');
    if (cap.requestBytes && bytes > cap.requestBytes) errors.push(`Request material exceeds the configured ${cap.requestBytes}-byte limit.`);
    if (cap.reasoning && !cap.reasoningValues.includes(cap.reasoning)) errors.push('Selected reasoning effort is not supported by this profile.');
    if (profile.kind==='chatgpt' && cap.outputCap) errors.push('ChatGPT plan usage does not support a hard output-token cap.');
    if (!cap.outputCap) warnings.push('This route has no configured hard output-token cap. Local time and byte ceilings are not a spend cap.');
  }
  return { revision:'compiler-1', manifest:ordered, bindings, instructions:assembly.instructions, framing, omitted:assembly.omitted,
    errors:[...new Set(errors)], warnings:[...new Set(warnings)], cycles:[...new Set(cycles)], edges:[...captured.values()], nodeIds:[...nodeIds], outputCount:contract.outputs.length, callCount:contract.calls, estimatedTokens };
}
