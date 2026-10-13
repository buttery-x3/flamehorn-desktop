> **SUPERSEDED — reference only.** Replaced by ../desktop-interaction.md revision 0.2. Do not implement this historical draft.

# Flamehorn Desktop

## Desktop Interaction Design — Working Draft

**Revision:** 0.1 · 10 October 2026
**Status:** Behaviour draft for review; visual layout not yet approved.
**Purpose:** Give the MVP implementation agent an explicit interaction specification, supplemented by static mockups the user can approve. This is not a runnable UI prototype, a full architecture specification, or a final MVP feature list.

**Basis and precedence — updated after the 12 October 2026 review:** This remains the UI behaviour draft from 10 October, with visual layout awaiting approval. The user's newer node, context and Run decisions supersede conflicting rules below and are recorded in the [Node, Pin and Process Specification — draft v0.2](<https://linear.app/flamehorn-games/document/node-pin-and-process-specification-54fb3107d819>).

**Reconcile under [FLAME-139](<https://linear.app/flamehorn-games/issue/FLAME-139/design-desktop-interaction-specification-and-approved-ui-reference>):** all Processes receive full currently connected history; disconnected Context retains material; Force include in context applies to User Context, Model Context and References; circular wiring supports manual feedback; Run creates missing output Contexts near their output pins. Fork has two outputs, Explode eight and Three Experts three.

**The latest review also supersedes the affected rules below:** every Context has input/output connections and can chain directly with any other kind of Context. There is no special Model-to-User continuation connection type or origin-based chaining restriction. Any provider message-role control is a separate, conditional design question. Append places generated text at the end of whatever text is in the output Context. Context versions are retained in connection with Process runs; the first edit to run-recorded material opens one editable version, and subsequent edits continue in it until another run uses it.

The MVP Format modifiers are Long, Short, Haiku, Bullet Point and Emoji, plus None. Toolbar creation defaults follow named preset or None selections. Inspector instruction edits display Custom locally on that Process and leave defaults unchanged. Node/settings copying and a UI for reusable persona definitions are future work.

This notice records the newer user decisions; it does not approve revised mockups or the remaining drafting conventions in the Node specification. Other interaction details still require reconciliation before implementation handoff.

## 1. Experience and vocabulary

Flamehorn Desktop is the shared surface where users explore and play with conversational material. Objects are directly readable, connectable and transformable; the Desktop is not merely a launcher for separate chats. Its harness compiles selected material and instructions, executes a requested Process, and returns the result to that surface.

| Term | Meaning in this draft |
| -- | -- |
| **Desktop** | The shared environment containing Workspaces, loose material, groups/folders and references. Not an operating-system replica. |
| **Conversation Workspace** | A place to manipulate Context and Process nodes. Execution is user-directed: run one Process, finish its work, then wait. |
| **Operation Workspace** | Future Workspace type for executable procedures, triggers and automation. It shares the Desktop and may reference the same material; it is not a separate application. |
| **User Context** | User-authored material, potentially including attachments. |
| **Model Context** | Model-produced material, or a destination awaiting that material. Earlier discussion also called this Agent Context; this draft uses Model Context consistently. |
| **Process** | An executable, editable node with input/output pins, instructions, modifiers and a Run control. |
| **Context version** | Retained content selectable through a control such as `‹ 2/3 ›`. |
| **Run record** | Historical inputs, generating settings and results, available through inspection rather than a separate canvas node. |

There are no specialised Context categories for an explosion result, a critique, a prompt suggestion, hidden reasoning or a tool event. A Process is a genuinely different node type, not a specialised contribution.

### Corrections to earlier documentation

| Superseded description | Current rule |
| -- | -- |
| Every edge must have a Process. | Process connections and direct conversational-continuation connections both exist. |
| A Process is only a circle attached to an edge, not a node. | A Process is a selectable node with its own pins and Run control. |
| Choosing a Process creates its output and immediately generates. | Creating/wiring configures the interaction. The user supplies an output destination and explicitly runs the Process. |
| Personas belong on Context nodes and changing them regenerates content. | Modifiers belong on Process nodes. A later run produces another Context version. |
| Inspecting a run requires copying its whole input history. | Run records reference retained input versions and snapshot generating settings; inspection need not duplicate all content. |

## 2. Desktop composition

**Established intent:** Several independent explorations can coexist, alongside references and collapsed material. Organisation is not inference: proximity, grouping, collapse, selection for reading and viewport changes must not silently alter context inclusion.

**Initial layout proposal — for static review, not yet approved:** Give the spatial surface most of the screen. Place a persistent creation/action control at the edge of the Desktop, a compact navigation dock along the bottom, and an inspector on the right. Selecting an object changes the inspector's subject; opening the inspector does not navigate away from the material.

```text
Flamehorn Desktop                         [Create / actions] [Settings]
+------------------------------------------------+--------------------+
| Spatial surface                                | Selected object    |
|                                                | inspector          |
| Conversation Workspace: Story seeds             |                    |
|   [User Context] -> (Respond / Run) -> [Model]  | Full content OR    |
|                                                | Process settings   |
| [Collapsed exploration]   [Reference folder]    |                    |
|                                                | Historical details |
+------------------------------------------------+--------------------+
| Navigation dock: pinned objects / Workspaces                         |
+---------------------------------------------------------------------+
```

This is a composition sketch, not an approved screen. Workspace boundaries might be spatial containers, focused surfaces or another arrangement; floating windows, tabs and nested canvases are not established requirements. Do not infer their behaviour from this sketch.

A creation palette and a taskbar-like navigation dock are useful candidates, not requirements to imitate a Start menu or operating-system taskbar. Pinned shortcuts should navigate to objects, not duplicate them or include them in context. Back/forward navigation and numbered shortcuts remain candidates.

## 3. Nodes and connections

**Context nodes:** Use a consistent card treatment, distinguish user/model origin with a label or icon, show a readable content preview, and expose connection pins. Retained versions have a selector. Context cards do not carry persona controls or Run buttons. Their content may be text, an attachment or a supported combination, without introducing a different conversational taxonomy for each medium.

**Process nodes:** Use a visibly different shape, with a circle as the current direction. Show the Process name, pins, Run control and an understandable execution state. Detailed instructions and modifiers live in its inspector. Modifiers may have a compact indicator on the Process, not on the Context result.

The ordinary conversation pattern is:

```text
[User Context] -> (Respond) -> [Model Context] -> [User Context] -> (Respond) -> ...
```

`Context → Process` supplies material. `Process → Model Context` specifies where generated material is stored. `Model Context → User Context` establishes a user-authored continuation: it contributes ancestry without invoking a model.

A Process can accept several inputs or produce several outputs. CROSS and MERGE illustrate many-to-one use; EXPLODE illustrates one-to-many. One Process owns the action and Run control regardless of its number of connections.

Arrows in these sketches describe relationships, not a mandatory left-to-right layout. Other permissible connection combinations, rewiring behaviour, cycle handling and invalid-connection feedback need a detailed connection policy before implementation.

## 4. Create, wire and run

### Ordinary reply

1. Create a User Context node and enter material.
2. Drag its output pin into empty space. A node-creation palette appears at that location.
3. Choose Respond. Create the Process node and connect the source to it. Do not silently create a destination or start inference.
4. Drag from the Process output, create a Model Context destination, and connect it. It is an empty/pending contribution, not a prompt-intention node.
5. Press Run on the Process. Resolve its actual inputs and settings, generate into the destination, then stop.
6. To write a follow-up, connect the Model Context directly to a new User Context. A subsequent Respond Process handles the next generated reply.

Run is unavailable without a valid output destination. The interface must explain that missing destination instead of leaving an unexplained disabled button. A mockup should also distinguish configured-but-not-run, running, completed and failed states. Detailed cancellation and retry behaviour is not yet agreed.

### Multi-output exploration

Connect the selected material to EXPLODE and provide destinations for its outputs; show four in the initial mockup. One Run develops all four outputs. Internal direction selection, structured JSON and separate model calls do not become visible prompt nodes requiring additional user actions.

EXPLODE does not automatically run downstream Processes. Creating more connections never authorises autonomous progression in a Conversation Workspace. The count control, destination-count mismatch handling and partial-failure behaviour remain open.

### Initial Process vocabulary

| Process | Behaviour |
| -- | -- |
| **Respond** | Reply to the supplied instruction, question or material. Use this label consistently rather than alternating with Reply. |
| **Continue** | Extend the supplied material itself, rather than discuss it or announce a continuation. |
| **Explode** | Generate several developed, distinct explorations of the source material. |
| **Challenge** | Examine assumptions, weaknesses and counterarguments; the earlier name was Pushback. |

CROSS, MERGE, REFRACT, ANALYSE and other discussed behaviours remain candidates. This list does not finalise the MVP Process set. Images and PDFs fit the intended interaction model, but their first-release support also needs explicit scoping.

## 5. Selection and inspection

Selecting a node opens its relevant side-panel content. Merely selecting it for reading does not change what another Process receives. Multi-selection may supply targets for an explicit action; it is not implicit permission to run or restructure anything.

**Context inspector:** Show full content and the selected version, with further generation information available separately. For a generated version, expose the ordered input-version references, generating instruction and modifier values, and available model/tool details. Distinguish a historical input from the currently displayed version of that source node. A pending destination must not look like a completed empty response.

**Process inspector:** Show its current editable instruction, persona/tone/perspective settings, connected inputs and destinations. Distinguish the Process instruction from the whole compiled model request, which also contains resolved context and other applicable instructions. A pre-run view describes the next request; a run-history view describes an actual past execution. They must not silently substitute for one another.

Generated summaries of reasoning or tool records, when available, belong in inspection—not as automatic Context nodes. The interface must not promise access to private model reasoning.

**Panel arrangement proposal:** Use separate Content/Generation sections for Context inspection and Configuration/Inputs/Run details for Process inspection. Exact tabs, placement of editing controls and panel pinning await visual approval.

## 6. Modifiers, versions and historical context

A Process stores its current persona, tone and other modifiers. Changing one does not itself invoke inference. Running the Process again creates a new output version, leaving earlier content available through `‹ 1/2 ›`, `‹ 2/2 ›`, and so on.

The selected Context version is used when that node is included in a subsequent run. Switching versions does not restore old Process settings, rewrite existing descendants or rerun downstream Processes. Historical records continue to point to the versions they actually used.

For example: Respond with no persona produces Model Context `M4` version 1. Changing Respond to Gambling Cowboy and running again produces version 2. Selecting version 1 restores the original contribution for further exploration while Respond can still be configured as Gambling Cowboy.

Retain content versions used by runs, including user-authored inputs. The UI need not save every keystroke as a visible version. Process nodes remain editable and unversioned; run records capture their actual instruction and modifier values, including customised persona text. Input history is recorded using ordered references to retained versions, not a full duplicated transcript per output.

A new Process's default modifier settings—None or copied from another Process—remain unresolved. Do not reintroduce hidden persona inheritance on Context nodes.

**Context selection:** Historical branching normally uses the relevant branch up to the selected point, subject to the Process's context policy. Later or separate material must be deliberately added. Inclusion/exclusion is distinct from visual collapse, and a preview is not a summary substituted into inference. The UI for ordered additions, exclusions and version conflicts is not yet final.

## 7. Reading, navigation and organisation

**Semantic zoom:** Aim for approximately consistent screen-space text size while zooming gives a node more room and reveals more of its contents. At very small scales, reduce detail sensibly. Show the same node at two zoom levels in a static mockup; exact thresholds and typography are not fixed. Node geometry need not grow whenever output grows.

**Full reading:** The inspector remains available regardless of zoom. Compact previews may use the opening text or a clipped excerpt; automatic model-generated summaries are not required. Any preview is presentation only.

**Layouts:** Freeform and conversation-oriented layouts arrange the same objects. A conversation arrangement reads broadly top-to-bottom, placing divergent paths alongside one another rather than hiding them behind paginated chat histories. Switching layout does not rewrite connections, versions or inference order.

**Organisation:** Groups/folders can hold related material. Collapsing an exploration or group reduces its footprint without deleting or excluding its contents. Workspaces may have multiple origins and disconnected islands. Physical nearness and folder membership do not confer input status. How shared descendants and external connections appear when collapsed still needs design.

**Deletion and exclusion:** Exclusion keeps material stored but out of the applicable context until re-included. Deletion removes an active object from future selection unless restored. Historical retention is separate; old records must not silently reintroduce deleted or excluded material. The scope of an exclusion control needs an explicit decision, not a visually ambiguous universal checkbox.

## 8. New Workspace from Here

Right-click a Context node, choose its intended version and invoke **New Workspace from Here**.

Create a fresh Conversation Workspace from that version's actual contributing history: retained Context versions, historical relationships, explicit supplementary inputs and the relevant generating Process settings. Do not copy the whole current Workspace or recompute history from today's connections. Open the result without running any Processes or asking a model to summarise it.

The new Workspace has independently editable objects and selections. Stored immutable content can be shared rather than duplicated. Reconstructed Process nodes are editable copies of the settings used historically. The source Workspace remains unchanged.

This is extraction for further exploration, not restoration of the entire desktop to an earlier moment. Unrelated branches, original positioning and folder arrangements are not automatically restored. Missing permanently purged material must be disclosed rather than replaced by newer content.

The exact presentation of multiple historical versions of one source node, and treatment of unused sibling outputs from a multi-output run, remain open. The mockup must show a simple unambiguous case first, not pretend those cases are settled.

## 9. Static mockup pack — next visual deliverable

Use annotated stills or simple SVG drawings, not a functional site. Each sheet should show concrete content, control labels and the relevant before/after states. These are specifications for pictures to review; no mockup artwork is approved or supplied with this draft.

| Sheet | Views to draw | What approval must establish |
| -- | -- | -- |
| **A — Desktop and reading** | One active Conversation Workspace, a collapsed exploration, reference material, creation control and candidate dock. A zoomed detail of the same Context card. | The Desktop feels like the place of interaction; reading detail increases without making the graph merely a launcher for chat panels. |
| **B — Wire and run** | Source-pin drag and palette; Respond with no output and disabled Run; connected empty Model Context; completed reply with a direct User Context continuation. | Process and Context are visibly different nodes. Destination creation and execution are separate. Run is on the Process. |
| **C — Inspect and rerun** | Process selected with instruction/persona controls; result selected with full content; a rerun showing `‹ 2/2 ›` and access to historical generation details. | Modifiers belong to Processes, versions to Context, and current settings are not confused with past inputs. |
| **D — Branch and extract** | One EXPLODE connected to four populated results inside a busier Workspace; a selected result's New Workspace from Here action; its smaller reconstructed history. | One Run fills several targets; extraction retains relevant historical material without taking the entire mess or executing again. |

Use the same small example throughout: a User Context asking, “Why do abandoned places feel full of stories?” Example model text is illustrative, not evidence of a working implementation. This keeps interface review independent of authentication, generation quality and provider integration.

Approve object shapes, control placement and interaction meaning before decorative polish. If later mockups conflict with this text, record and reconcile the decision before agent handoff; do not ask the implementation agent to choose whichever interpretation it prefers.

## 10. Decisions before implementation handoff

The first review should settle the Desktop/Workspace containment model, node shapes and pin placement, inspector arrangement, and palette/dock inclusion. Subsequent scope decisions should settle the Process set, destination-count rules, context-selection UX, new-Process modifier defaults, failure/retry/version behaviour, and the less common extraction cases above.

Record each mockup's status as **Draft**, **Approved**, or **Superseded**. Approved drawings supplement the behavioural specification; decoration does not silently introduce features. Maintain this Markdown and its Linear counterpart as the same revision during review, rather than independently evolving specifications.

Operation Workspaces, scheduled runs, autonomous routing and agent-authored graphs remain future work. They must not appear as working features in the initial Conversation Workspace mockups. Provider implementation, desktop packaging, framework selection and a final MVP issue plan are outside this document; this omission neither removes nor replaces the previously chosen connection goals.

**Handoff standard:** The agent should be able to identify what each object holds, what each connection means, where the user acts, when inference happens, where output goes, and what remains unchanged—without inventing those answers from a generic node-editor example.
