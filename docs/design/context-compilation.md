**Project:** Flamehorn Desktop
**Issue:** [FLAME-141 — Context Compilation and Instruction Assembly](<https://linear.app/flamehorn-games/issue/FLAME-141/design-context-compilation-and-instruction-assembly>)
**Revision:** 0.2 — approval edition of 0.1; accepted behaviour unchanged.
**Date:** 12 October 2026, Australia/Sydney
**Status:** Approved by the user on 13 October 2026 (Australia/Sydney). All recommendations in the reviewed 0.1 draft are accepted. Design approval only; implementation and live checks have not been performed.
**After approval:** Intended repository home is `docs/design/context-compilation.md`. No repository publication or implementation is part of this draft.

> **Approval record — 13 October 2026:** The user accepted all draft-design recommendations and requested completion of the design issues. References below to “draft”, “proposed”, “recommended”, “review” or future approval preserve the reviewed rationale and are superseded by this approval record. All stated recommendations, numeric defaults, scope exclusions and fixtures are the accepted baseline. Cross-document references to older revision numbers identify the reviewed source; the approval editions indexed by FLAME-145 preserve those rules. Repository publication and final one-shot handoff are tracked in FLAME-145. No application or live provider validation is claimed.



## 1. What this document settles

For a manually selected Process, Flamehorn compiles the currently connected material, its selected versions and roles, and the current instructions into one inspectable description of what a model should receive.

The MVP has one context rule: **full currently connected history, plus force-included material from the current Conversation Workspace**. Ordinary chains become ordered messages. Merge and Compare preserve both A/B histories, with shared material included once. The compiler does not ask a model to discover the graph.

The user's latest decisions govern this draft. [Node, Pin and Process Specification v0.3](<https://linear.app/flamehorn-games/document/node-pin-and-process-specification-54fb3107d819>), read on 12 October, remains the source for node semantics, pins, the thirteen Processes, their base instructions, Persona/Format definitions and version behaviour. This document consumes those definitions; it does not maintain another Process catalogue.

The four master-template combinations are independently usable:

| Combination | Substituted instruction components |
| -- | -- |
| Process + Persona + Format | Process, Persona, Format |
| Process + Persona | Process, Persona |
| Process + Format | Process, Format |
| Process only | Process |

Compact sequential-transform and explicit natural-language styles are both supported, alongside editable Custom text. Neither is asserted to be universally better.

There are no additional context-policy modes, dedicated exclusion controls, cross-Workspace references, folders, collapsed Workspaces or automatic workflow orchestration in this contract. Cutting connections, changing selected material, and checking/unchecking Force include provide the agreed controls. Unchecking a connected node does not exclude it.

### Ownership

| Owner | Responsibility at this boundary |
| -- | -- |
| <issue id="ccef9cfd-4218-46b3-99f4-2176ab79130c" href="https://linear.app/flamehorn-games/issue/FLAME-140/design-node-pin-and-process-specification">FLAME-140</issue> | Process meanings/instructions, node roles, pin counts, output identities, modifier definitions, Replace/Append meaning |
| <issue id="a08b5a6d-dbc3-431d-a6fe-cc5bfaf7f00d" href="https://linear.app/flamehorn-games/issue/FLAME-141/design-context-compilation-and-instruction-assembly">FLAME-141</issue> — this document | Resolve selected material and order; assemble instructions; preserve roles, branch identity and inspectability; report compilation problems |
| [FLAME-142 — Runtime](<https://linear.app/flamehorn-games/issue/FLAME-142/design-process-execution-and-tool-runtime>) | Freeze a run, prepare its execution, choose internal inference sequencing, stream/validate results, create missing destinations, write outputs and stop |
| [FLAME-143 — Data and Assets](<https://linear.app/flamehorn-games/issue/FLAME-143/design-data-model-persistence-and-assets>) | Retain versions, roles used by runs, asset originals/representations and compact run records |
| [FLAME-144 — Providers](<https://linear.app/flamehorn-games/issue/FLAME-144/design-application-architecture-and-provider-integration>) | Authentication, endpoint/model capabilities, exact request encoding, limits and provider errors |

Fork still has 2 outputs, Explode 8 and Three Experts 3. These counts do not prescribe model-call counts. Prompt wording such as “apply Process, then Persona, then Format” also does not mandate three calls. <issue id="af8ebf82-241b-447a-8c31-5c66a7aa62d3" href="https://linear.app/flamehorn-games/issue/FLAME-142/design-process-execution-and-tool-runtime">FLAME-142</issue> owns enforced call sequencing and output packaging; this document preserves the user's requested prompt sequence.

## 2. Compiler input and result

This is a small logical contract, not a new service or framework.

**Inputs**

* The current Workspace and target Process, with its required input bindings (one input, or A/B for Merge and Compare), declared output slots and current destination bindings.
* A coherent snapshot of relevant current connections; each material node's selected material/version, selected message role and Force include state.
* The target Process's actual current base instruction, Persona and Format instruction values, including local edits, and the selected master-template text.
* Stable asset references and the exact available model-facing representations selected by asset preparation.
* The chosen provider/model and its known capabilities and size limits, supplied by provider integration.

**Result**

| Part | Contents |
| -- | -- |
| Ordered manifest | Exact node/material-version references, role used, content-part order, inclusion reason, primary input binding(s), branch membership and asset-representation references |
| Instruction assembly | Effective template/style/combination, independently resolved components, intentionally omitted components, rendered master instructions and any compiler/runtime framing |
| Request description | Instructions separately from ordered role-labelled text/asset material, plus concise structural framing where needed |
| Validation | Ready, or explicit errors/warnings identifying affected material, unsupported capabilities, missing preparation or size problems |

Output destination bindings are metadata for execution. Their existing text is not automatically input. Append is literal output placement and does not change context inclusion.

Preview compilation is read-only: it does not call a model, execute tools, create destinations, write generated text or create historical versions. It can read the current editable material without first committing a version. At Run, Runtime/Data freeze the exact material used into retained references and compile that coherent snapshot. If edits invalidate a preview, refresh it; never present stale preview content as the actual request.

“Provider-independent” means retaining these few shared concepts until encoding. It does not require a universal provider abstraction or imply that every backend supports every content part.

## 3. Resolve material, versions and order

### Roles and current selections

Every generic Context compiles using its selected **User** or **Assistant** role, regardless of who wrote it, how it was created, or what it is connected to. Consecutive messages with the same role remain legitimate distinct contributions; the compiler does not insert fake replies to force alternation.

Creation defaults remain <issue id="ccef9cfd-4218-46b3-99f4-2176ab79130c" href="https://linear.app/flamehorn-games/issue/FLAME-140/design-node-pin-and-process-specification">FLAME-140</issue>'s: toolbar-created Contexts start as User; new Process-output Contexts start as Assistant; connecting an existing Context preserves its role. The compiler reads the selected role, not those defaults.

A plain Reference is supplied as source material using the User role in this draft. This is a compiler convention, not a new Reference toggle or node type. Attachments belonging to a Context stay with that Context's selected role. If a backend cannot accept a modality under that role, report the unsupported combination rather than silently relabelling it.

For a new run, use the selected version of every reachable node, including deliberately selected older material. Follow today's connections; an older selection does not restore old wiring, upstream settings or the historical inputs that originally produced it. Historical run inspection instead uses that run's frozen references and roles.

### Minimal deterministic traversal

Validate the <issue id="ccef9cfd-4218-46b3-99f4-2176ab79130c" href="https://linear.app/flamehorn-games/issue/FLAME-140/design-node-pin-and-process-specification">FLAME-140</issue> input/pin contract first. Missing required sources, unavailable primary material, multiple connections on a single input pin or an out-of-Workspace source are errors; a missing output destination is left for Runtime's existing auto-creation behaviour. The compiler never runs an upstream Process to fill an empty source.

The following concrete traversal is proposed for review:

1. Snapshot the target Process and relevant Workspace state. Start from its required input pins in fixed order: the single input, or A then B.
2. Walk backwards along current incoming connections. At Context/Reference nodes, visit their predecessor before emitting their selected material. At upstream Processes, visit their inputs in pin order; emit no Process instruction or synthetic Process contribution.
3. Never walk out to sibling output branches. Following one Fork/Explode output upstream reaches the Process's input history, not its other outputs. Reaching a Merge/Compare upstream visits both A and B.
4. Track nodes currently being visited and nodes already completed. Re-entering an active node stops that edge; a completed node reuses its existing manifest entry. Treat the target Process as already active. Record cycle cut-points for inspection. This produces finite, deterministic input even with feedback.
5. Emit each included material identity once, in predecessor-first order. For an ordinary shared-history diamond this is shared history, A-only history, B-only history, then any merged result and later continuation.
6. Resolve force-included nodes separately as described below, then prepend only the additional entries. No screen coordinates, inspection selection or timing of traversal determines order.

The material deduplication key is **node instance + selected material version**; a draft material revision is pinned to a retained version at Run. The role is captured separately. One snapshot has one selected version and role per node. An inconsistent snapshot is an error, not permission to choose the newest version.

The same source deliberately connected to both A and B appears once with both bindings recorded. Distinct node instances remain separate contributions even when their text, or underlying asset bytes, happen to match. Shared asset storage may deduplicate bytes without erasing those contribution identities.

Cycles have no true chronological ordering. The fixed traversal above supplies a stable serialization of existing selected material, not an invented account of repeated past runs. No cycle unfolds old versions into extra turns or causes inference.

### Force-included supplementary context

First determine ordinary reachability. For each checked Context/Reference in the **current Workspace**, add its own selected material only if it is not already present. Do not traverse its ancestors just because it is checked.

Prepend these additional messages, preserving their roles and content parts, before the connected history. Proposed tie-breaker for several supplementary nodes: stored creation order, then stable node ID. This order survives moving nodes or reopening the Workspace.

Mark this prefix as supplementary material. Its contents may inform the result but do not become another Process input. “Latest turn” remains the immediate material bound to the Process input; Merge/Compare retain explicit A/B targets. A node already connected and checked stays at its ordinary position, with both inclusion reasons recorded, and is sent once.

### Branch framing

Ordinary chains need no running narration. Where branches converge, use short application-generated markers such as **Shared**, **A**, **B**, **Joined**, and an explicit current-input binding. These are structural labels, not new API roles or node types.

The manifest retains which material belongs to each branch even when it was emitted earlier through another path. Nested convergences use stable local labels; a reference to an already emitted entry can communicate reuse without repeating its contents. Predecessor-first A-before-B traversal remains the ordering rule for less regular graphs, rather than forcing every shared item into an artificial global prefix.

Only compiler-authored framing may be encoded as developer/application instructions. Context text, filenames and imported document contents remain material at their selected role. The provider adapter uses supported instruction fields/messages for framing and keeps the original User/Assistant material intact. A backend that cannot preserve the required role/structure contract must surface that limitation.

Old Process instructions and modifiers are unnecessary for the next request. Retain them in historical run records, but do not inject them into current instructions or add “produced by Challenge” commentary to every contribution.

## 4. Assemble the current instructions

Process supplies the action/direction; Persona supplies voice; Format supplies presentation. The composition must keep Persona/Format from redirecting the Process. Short, Haiku and Emoji can constrain how much is expressed; this is not a promise to preserve every word under restrictive formats. Neither a modifier nor a Custom template changes declared pin/output counts.

The [old ai-app system templates](<https://github.com/buttery-x3/ai-app/blob/main/src/lib/data/system.json>), inspected for this draft, contain an explicit sequential-transform “Vector Optimized” option. The user found it experimentally useful, particularly with smaller models, because it asked for the behavioral result before voice and formatting could bleed into it. Preserve that intent. Its name does not establish mathematical independence, embedding optimization or guaranteed model behavior.

Do not import the old app's permanent-session rules or universal single-reply restriction. Templates apply to the current Process run and each required output.

### Independent placeholders and editable Custom

Use three independent placeholders:

* `{{PROCESS}}`: the target Process's effective base instruction, owned by <issue id="ccef9cfd-4218-46b3-99f4-2176ab79130c" href="https://linear.app/flamehorn-games/issue/FLAME-140/design-node-pin-and-process-specification">FLAME-140</issue>.
* `{{PERSONA}}`: the selected effective Persona instruction, or no instruction for None.
* `{{FORMAT}}`: the selected effective Format instruction, or no instruction for None.

No component contains another component's placeholder. Substitute literal component text once; do not recursively interpret placeholder-looking text within an inserted instruction or within Context material.

The user can select and edit the master template. Editing produces Custom text while the built-in remains available. The effective text and component values are visible before running and retained with the run. Selector placement and persistence layout belong to UI/Data design; this does not add a reusable-template management system.

Intentional omission of **any** placeholder is permitted in Custom, including Process. Omitted components are visibly listed as “not used by this template”; they are not secretly appended elsewhere. Arbitrary Custom text is the user's experiment, so the compiler does not claim it still expresses the catalogue's intended action. Structural input/output contracts remain in force. Unknown placeholder names are an actionable template error; missing known placeholders are not.

For built-ins, select a complete variant with the required components. Do not assemble the two-component options by deleting paragraphs from a three-component prompt. If an included Persona/Format is None, the template's explicit no-op wording handles it. Selecting a preset for a component omitted by the template leaves it visibly inactive for that run.

### Proposed compact sequential templates

Each block below is a complete selectable master template. P, V and F denote instructions, C the supplied context, and R the required result or results. The notation asks the model to perform the transforms in order within its response; it does not create runtime stages.

**Process + Persona + Format**

```text
P = {{PROCESS}}
V = {{PERSONA}}
F = {{FORMAT}}

C = supplied context; use the bound current input(s).
R = Process(P, C): perform the requested action.
R1 = Voice(V, R): change expression while preserving P's direction.
R2 = Format(F, R1): apply presentation while preserving that direction.
Apply V and F to each required result. An empty V or F is a no-op.
Return the final result(s), without describing these transforms.
```

**Process + Persona**

```text
P = {{PROCESS}}
V = {{PERSONA}}

C = supplied context; use the bound current input(s).
R = Process(P, C): perform the requested action.
R1 = Voice(V, R): change expression while preserving P's direction.
Apply V to each required result; an empty V is a no-op.
Return the final result(s), without describing these transforms.
```

**Process + Format**

```text
P = {{PROCESS}}
F = {{FORMAT}}

C = supplied context; use the bound current input(s).
R = Process(P, C): perform the requested action.
R1 = Format(F, R): apply presentation while preserving P's direction.
Apply F to each required result; an empty F is a no-op.
Return the final result(s), without describing these transforms.
```

**Process only**

```text
P = {{PROCESS}}

C = supplied context; use the bound current input(s).
R = Process(P, C): perform the requested action.
Return the required result(s), without describing this notation.
```

### Proposed explicit natural-language templates

These are equally usable alternatives. They state the relationship directly without claiming simultaneous application is better.

**Process + Persona + Format**

```text
Perform this Process on the supplied context, using the bound current input(s):
{{PROCESS}}

First establish the result required by that action. Then express each required
result in this voice, without letting the voice redirect the action:
{{PERSONA}}

Then apply this presentation to each result, preserving the Process's direction:
{{FORMAT}}

An empty voice or presentation instruction adds no constraint.
Return the finished result(s), without commentary about these instructions.
```

**Process + Persona**

```text
Perform this Process on the supplied context, using the bound current input(s):
{{PROCESS}}

First establish the result required by that action. Then express each required
result in this voice, without letting the voice redirect the action:
{{PERSONA}}

An empty voice instruction adds no constraint.
Return the finished result(s), without commentary about these instructions.
```

**Process + Format**

```text
Perform this Process on the supplied context, using the bound current input(s):
{{PROCESS}}

First establish the result required by that action. Then apply this presentation
to each required result, preserving the Process's direction:
{{FORMAT}}

An empty presentation instruction adds no constraint.
Return the finished result(s), without commentary about these instructions.
```

**Process only**

```text
Perform this Process on the supplied context, using the bound current input(s):
{{PROCESS}}

Return the required result(s), without commentary about these instructions.
```

### Assembly and precedence

Render the selected master text once from the independently resolved values. Add only the application framing actually needed to identify primary inputs, explain structural labels, distinguish supplementary material, and satisfy the output contract supplied by Runtime.

For example, framing for a comparison can say: “A and B identify independent input histories; shared entries apply to both. Structural markers are not conversation topics.” A simple chain does not need that paragraph.

Application/runtime structural requirements govern bindings and required outputs. The selected master text expresses how its included components relate; the built-ins preserve Process direction through later voice/presentation transforms. Source material is never promoted into the instruction layer. The MVP introduces no extra global custom-instruction policy system.

Any runtime output envelope is separate from Format. A Haiku Fork still has two result contents; Haiku does not format the transport envelope or reduce the number of destinations. Do not add duplicate hidden copies of omitted Process/Persona/Format text through framing.

## 5. Text, images, PDFs and request size

The logical material representation is an ordered list of parts: full text and/or references to exact image/PDF asset representations. A filename, thumbnail, excerpt or filesystem path alone is not the document's contents.

| Material | Required compiler behaviour |
| -- | -- |
| Text | Preserve the selected full text and message role; no replacement by a UI preview |
| Image | Keep the original/selected prepared asset identity and image part; require model/endpoint/role support |
| PDF | Keep the PDF identity and explicit chosen representation: directly supported file input, or a disclosed prepared representation supplied by Data/Assets |
| Mixed material | Preserve part order and the selected Context role; validate every part |

A Reference can be the direct primary source for Challenge or Explode. No extra instruction Context is required just to make an image or PDF usable.

<issue id="95847f80-7888-4691-bf7a-26e732fc9d08" href="https://linear.app/flamehorn-games/issue/FLAME-143/design-data-model-persistence-and-assets">FLAME-143</issue> owns import, byte retention, text extraction or page-image preparation. <issue id="d1f8f8e2-212c-48f1-bad7-c607f7830e6f" href="https://linear.app/flamehorn-games/issue/FLAME-144/design-application-architecture-and-provider-integration">FLAME-144</issue> determines the accepted wire representation. The compiler consumes those results and records exactly which representation is used. A conventional parser or supported native file path may be enough; bespoke OCR is not an MVP requirement. An image-only PDF without a supported direct route or suitable prepared representation must produce a clear unsupported/unprepared error. Do not send a blank extraction as if the PDF had been read.

Prepared text must be labelled as text extracted from the asset; if it omits visual information, that limitation is visible. Lossy conversion, selected excerpts, generated summaries and automatic RAG are not silent fallbacks. A different representation requires a visible user choice and a new preview.

Account for the assembled instructions, structural framing, all material parts, provider overhead and generation/reasoning headroom. Use the selected model's usable/configured context size and endpoint limits, not a universal fixed token number. Mark estimates as estimates, especially for images/files.

* If known input/context or file/request-size limits are exceeded, block sending and identify the oversized contributors. The user can shorten/edit material, change connections/force inclusion, select a suitable prepared representation, or choose a capable model.
* If limits cannot be verified, show that uncertainty; do not claim the request is guaranteed to fit. Provider rejection remains an explicit run failure.
* Missing selected material, unreadable assets, incomplete preparation or unsupported role/modality combinations are errors. Do not substitute the latest version, omit the asset or change providers silently.
* No hidden truncation, automatic summarisation or reliance on a provider's rolling context window. Provider integration must establish overflow behaviour; known silent-dropping configurations are incompatible with this contract.

## 6. Verified API boundary — 12 October 2026

These are documentation checks, not live authenticated or local-inference tests.

### LM Studio and other OpenAI-compatible endpoints

LM Studio currently supports both `POST /v1/responses` and `POST /v1/chat/completions`. Responses was added in LM Studio 0.3.29; it did not replace Chat Completions. [Compatibility endpoints](<https://lmstudio.ai/docs/developer/openai-compat>) · [API changelog](<https://lmstudio.ai/docs/developer/api-changelog>).

Responses documents streaming, reasoning, previous-response state and optional MCP tools. Chat Completions accepts message history and automatically applies the model's chat template. [Responses](<https://lmstudio.ai/docs/developer/openai-compat/responses>) · [Chat Completions](<https://lmstudio.ai/docs/developer/openai-compat/chat-completions>).

LM Studio's comparison documents assistant-message input and custom tools for both compatible routes. Responses also supports stateful chat/MCP; Chat Completions does not. Neither compatible route offers its native API's per-request context-length setting or model-load/prompt-processing events. Its native `/api/v1/chat` is a separate interface and the comparison says it cannot include assistant messages in the request, so it is not an interchangeable replacement for this role-preserving contract. [Endpoint comparison](<https://lmstudio.ai/docs/developer/rest>).

Text/image support is documented for Chat Completions, subject to a suitable model. JSON-schema output is documented there, with explicit model-capability caveats. Do not assume every Responses field or every model has equal support. [Compatibility overview](<https://lmstudio.ai/docs/developer/openai-compat>) · [Structured output](<https://lmstudio.ai/docs/developer/openai-compat/structured-output>).

The reviewed compatible-endpoint docs do not establish direct PDF/`input_file` parity. LM Studio's document-chat page describes its app's document ingestion and possible RAG; it does not establish that an external Responses request can send a PDF identically. Treat direct PDF support as unverified until <issue id="d1f8f8e2-212c-48f1-bad7-c607f7830e6f" href="https://linear.app/flamehorn-games/issue/FLAME-144/design-application-architecture-and-provider-integration">FLAME-144</issue> establishes it for the chosen route/version. [Chat with Documents](<https://lmstudio.ai/docs/app/basics/rag>).

**MVP implication:** retain a small Responses/Chat Completions encoding choice for the configured endpoint. Send the compiler's explicit history; do not require LM Studio's server-side response state. Other “OpenAI-compatible” servers may support only Chat Completions. Confirm their actual endpoint, roles and modalities rather than inferring capabilities from the label.

### ChatGPT-authenticated Responses is a distinct pathway

Official Sign in with ChatGPT documentation specifies OAuth-authorized inference at public `https://api.openai.com/v1/responses`, using an account-available model. Authentication and model discovery remain <issue id="d1f8f8e2-212c-48f1-bad7-c607f7830e6f" href="https://linear.app/flamehorn-games/issue/FLAME-144/design-application-architecture-and-provider-integration">FLAME-144</issue>'s work. [Models and inference](<https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference>).

For this HTTP route, current documented constraints include:

* `input` is an array with the needed history; `store: false` and `stream: true`.
* Use `instructions` or developer messages; explicit system-message items are rejected.
* Omit `previous_response_id` and `conversation`. Do not depend on stored server history.
* `max_output_tokens`, `truncation`, `temperature` and `top_p`, among other fields, are unsupported.
* Text, images and files are model-dependent inputs; the Files upload API is unsupported.

These restrictions are specific to ChatGPT plan usage and must not be copied into LM Studio's contract or confused with ordinary API-key Responses. They also mean a generic OpenAI Files-upload workflow cannot be assumed for PDF preparation here. See the full dated source for the adapter's allowlist: [Preview limitations](<https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations>).

**Mapping:** the same compiler result becomes `instructions` plus ordered `input` on ChatGPT-auth Responses, or the supported instruction/message form on a local endpoint. Chat Completions commonly uses a system message followed by `messages`; that encoding is not copied into the ChatGPT-auth request. No provider state substitutes for Flamehorn's versioned material.

## 7. Worked fixtures

These fixtures define expected compilation, not model-quality assertions or executable tests. `C2@v3` means the selected material version; U/A means the Context's selected User/Assistant role. Structural labels below are display notation, not custom API roles. Base instructions are resolved from <issue id="ccef9cfd-4218-46b3-99f4-2176ab79130c" href="https://linear.app/flamehorn-games/issue/FLAME-140/design-node-pin-and-process-specification">FLAME-140</issue> unless a fixture explicitly names a local edit.

### F1 — Ordinary reply, direct continuation and a role change

Graph: `C1@v1(U) → Respond → C2@v3(A) → C3@v1(U) → target Respond`.

Material:

* C1: “We are planning a shared workshop.”
* C2: “Evening sessions could make it accessible after work.”
* C3: “Which opening hours should we try first?”

Manifest: **C1@v1/U, C2@v3/A, C3@v1/U**. Current input is C3. Use Process-only with the target Respond's instruction. Do not include the earlier Respond's instruction, its old Persona/Format, unrelated branches or destination text.

For target Continue with C3 changed to an unfinished invitation, keep the same history and roles but use Continue's instruction. Direct Context chaining requires no extra Process. Toggling C2 to User makes the next sequence U/U/U; it remains the same graph and material. The earlier run retains the role it actually used.

### F2 — Selected older material and historical inspection

C2 has retained v2 and v6; the user selects v2, while C1 currently selects v4. Running downstream through today's intact links uses **C1@v4, C2@v2**, with their roles captured now. It does not substitute C2@v6 or reconstruct the old run that produced v2.

If that old run used C1@v1 and different instructions, inspecting it shows those frozen values. Editing C1, changing C2's role, rewiring or editing the master template later cannot change that record. Missing historical material is reported as missing.

### F3 — Shared ancestry, A/B and continuation after Merge

```text
H1@v1(U) → H2@v1(A) → Fork → A1@v2(A) → A2@v1(U) → Merge.A
                              └────→ B1@v3(A) ─────────→ Merge.B
Merge → M@v1(A) → target Respond
```

When running **Merge**, the order is:

| Order | Material | Meaning |
| -- | -- | -- |
| 1–2 | H1@v1/U, H2@v1/A | Shared history, once |
| 3–4 | A1@v2/A, A2@v1/U | A history; current A = A2 |
| 5 | B1@v3/A | B history; current B = B1 |

Use the current Merge instruction in the selected master template, with explicit A/B bindings. The model must not mistake B1 for a reply to A2. Fork's old instruction/modifiers and unused siblings are omitted.

When running **Respond after M**, the same five material entries precede M@v1/A. Short framing marks the two histories and their join; current input is M. The previous Merge instruction is omitted.

For Compare the input assembly is the same; substitute Compare's current instruction. If A and B both bind A2, include that history once and retain **A = A2, B = A2**.

A possible ChatGPT-auth framing excerpt is a developer marker before each relevant region: `[Shared]`, `[A]`, `[B]`, then `[Joined]` before M on the downstream run. Actual material stays in User/Assistant messages. Use only the markers needed; an ordinary continuation down A alone contains H1, H2, A1, A2 and does not collect B1.

### F4 — A cut, supplementary material and a checked Reference

Sever the connection before C9 in a C1–C10 chain. Check C2 and a PDF Reference R; target Respond reads C10.

Expected order: **Supplementary: C2's selected version, R's selected prepared representation; Connected: C9, C10** (using the stated stable supplementary order). C1 and C3–C8 are absent. Checking C2 does not restore its disconnected ancestors. Current input remains C10.

If R is also wired into that connected chain, it appears once at its connected position. Its manifest records both connected and forced inclusion. If R is the Process's direct source, it remains the primary source, not a second supplementary copy. A checked node in another Workspace is absent.

### F5 — Finite feedback and Append

An existing populated Context C@v1 contains “2”, and is both input and destination of an existing unary Process whose instruction is locally edited to add two.

Compilation includes **C@v1 once** and records the stopped feedback edge. The run reads frozen v1; its subsequent write cannot change that request. A later manually initiated run can use the new selected material. The compiler does not generate 4/6 itself or repeatedly execute the Process.

For a separate destination D containing text, checking Append alone does not add D to this manifest. D is included only if connected or force-included; Runtime performs the literal append.

### F6 — Template independence, omissions and output counts

Use Challenge with a friendly Persona and Bullet Point Format. In Process+Persona+Format, the assembled instructions request the Challenge action, then friendly expression, then bullets. The intended result still challenges assumptions; it is not converted into agreement.

Switch to Process+Format: the Persona placeholder and instruction are absent, while Process and Format resolve independently. Editing Custom to omit Format leaves the Format selection visibly unused and does not append it elsewhere. Omitting Process in Custom is also permitted and disclosed; the UI must not claim its canonical instruction was sent.

Compile Fork, Explode and Three Experts with either style: metadata still declares 2, 8 and 3 destinations respectively, with one shared Persona/Format selection per Process. Templates never force a single output. Call sequencing and parsing are deferred to <issue id="af8ebf82-241b-447a-8c31-5c66a7aa62d3" href="https://linear.app/flamehorn-games/issue/FLAME-142/design-process-execution-and-tool-runtime">FLAME-142</issue>.

### F7 — Assets and size failures

An image Reference directly feeds Explode. The result contains its exact asset representation as the primary material and Explode's current instructions; it declares eight outputs. A text-only backend yields a capability error, not eight results based on its filename.

A PDF directly feeding Challenge succeeds at compilation only with an available representation supported by the chosen route/model. Unverified direct PDF support, an empty extraction from a scanned PDF or an oversized request produces the specific error/uncertainty described in section 5. No bespoke OCR, silent excerpt, automatic summary or provider switch is triggered.

## 8. Inspection, review and reconciliation

Before Run, inspection shows the actual ordered material, selected versions and roles, primary bindings, supplementary/branch labels, exact instruction assembly, omitted components, asset representations and size/capability findings. It distinguishes source content from added framing.

A run retains the frozen ordered input references, roles, binding/structure metadata, effective template text and instruction values, asset-representation identities, compiler/template revision and provider/model settings needed to explain its requests. Runtime records any later internal calls and their actual instructions under <issue id="af8ebf82-241b-447a-8c31-5c66a7aa62d3" href="https://linear.app/flamehorn-games/issue/FLAME-142/design-process-execution-and-tool-runtime">FLAME-142</issue>; Data defines retention under <issue id="95847f80-7888-4691-bf7a-26e732fc9d08" href="https://linear.app/flamehorn-games/issue/FLAME-143/design-data-model-persistence-and-assets">FLAME-143</issue>. Shared immutable material and one shared multi-output run record avoid copying a recursively expanded transcript into every output. Credentials are not part of this record.

Identical frozen state and compiler/template versions should reproduce the same material order and instruction text. This does not promise identical model output. Reproducing a past request is distinct from making a new run against current connections and settings.

**Review focus:** confirm the proposed finite traversal and supplementary tie-breaker, the plain Reference's User-role convention, and the sample master-template wording. Established user decisions—generic Context roles, four component combinations, intentional omission, sequential-transform availability and reduced MVP scope—are preserved, not reopened.

**Original wording to reconcile later:** <issue id="a08b5a6d-dbc3-431d-a6fe-cc5bfaf7f00d" href="https://linear.app/flamehorn-games/issue/FLAME-141/design-context-compilation-and-instruction-assembly">FLAME-141</issue> still mentions multiple context policies, exclusions, cross-Workspace references and an exclusion fixture. <issue id="ccef9cfd-4218-46b3-99f4-2176ab79130c" href="https://linear.app/flamehorn-games/issue/FLAME-140/design-node-pin-and-process-specification">FLAME-140</issue> v0.3 retains some coordination text about exclusions/cross-Workspace scope; <issue id="95847f80-7888-4691-bf7a-26e732fc9d08" href="https://linear.app/flamehorn-games/issue/FLAME-143/design-data-model-persistence-and-assets">FLAME-143</issue> and the project overview contain older folders/collapse and other superseded wording. Those passages do not expand this draft. The project overview also predates the settled generic Context vocabulary and output counts. Reconcile that copy before implementation handoff, without adding those features here.

Approval and implementation remain separate later steps. <issue id="a08b5a6d-dbc3-431d-a6fe-cc5bfaf7f00d" href="https://linear.app/flamehorn-games/issue/FLAME-141/design-context-compilation-and-instruction-assembly">FLAME-141</issue> is not marked approved or complete by publishing this review draft.
