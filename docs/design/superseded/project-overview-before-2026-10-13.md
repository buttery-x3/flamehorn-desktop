> **SUPERSEDED — audit only.** The project overview was replaced on 13 October 2026. Use the approved specs and brief, not this historical copy.

*An open-source, GUI-first LLM harness presented as an interactive desktop for exploring conversations, manipulating context, and composing model interactions.*

Flamehorn Desktop treats conversational material as objects that users can work and play with directly. Contributions, documents, images, and their relationships remain available to inspect, connect, transform, organise, and revisit—not merely scroll past in a transcript.

The desktop describes the experience; the harness makes it work. Underneath the interface, a context compiler assembles selected material, historical context, instructions, personas, and process definitions into model requests. A process executor coordinates the necessary inference and tool calls, then returns the generated contributions to the desktop for further interaction.

This overview records the intended design, not a claim that these capabilities are already implemented.

## Purpose: exploration through direct interaction

The aim is not simply to organise chats or draw a workflow around an agent. It is to make exploring and transforming conversational material a primary way of interacting with language models.

A user might place an image on the desktop, EXPLODE it into four fully generated explorations, CROSS two interesting results, reinterpret the result through a historical perspective or different persona, and continue from it with selected context. Each result remains ordinary material that can be explored again.

Serious work and curiosity-driven play use the same tools. The user need not know the final destination before beginning.

## The interaction model

**Context nodes remain simple.** A Conversation Workspace contains User Context nodes and Agent Context nodes: contributions from the user and model respectively, containing text, supported attachments, or a combination. These describe the contribution's origin, not separate categories for each kind of transformation. There are no specialised prompt-intention, reasoning-step, or process-result Context node categories. Internal planning, structured coordination output, and tool events remain in inspection records rather than becoming conversational material.

**Processes act between Context nodes.** Process is the product term for the instructed behaviour that produces or transforms conversational material; it replaces the earlier term “operation” in this role. The initial vocabulary starts with RESPOND (also described as REPLY), which answers the source instruction or material as a conversational reply, and CONTINUE, which extends the supplied content rather than responding about it. EXPLODE develops several distinct explorations, and CHALLENGE applies the critical behaviour previously discussed as PUSHBACK. CROSS, MERGE, REFRACT, ANALYSE, and other previously discussed behaviours remain candidate Processes; the full MVP set is not yet fixed. Processes and modifiers are composable, and generated results remain ordinary Context nodes available to subsequent Processes. Running EXPLODE generates developed content for all its targets—not prompts that each require a further generation action.

**Every edge has a Process.** Connections are not unlabelled conversational links: each belongs to an explicit Process defining what happens between its source and target Context nodes. The proposed visual representation is a selectable circle along the connection, labelled with the Process name and containing its Run control. A Process can involve several inputs or outputs; those connections belong to the same Process instance rather than creating an independently runnable copy per edge. The circle represents the Process, not another Context contribution. Creating connections configures an interaction; it does not automatically execute it.

**Modifiers support alternative interpretations.** Personas, tones, and perspectives affect generation. Changing a generated node's persona creates or selects a retained version, preserving the original for later selection. New descendants inherit the selected persona until changed; existing outputs are not silently regenerated or assigned a different historical input.

## Process creation, inspection, and execution

The initial interaction is: create a User Context node; drag its output pin to empty space; choose a Process from a small command palette; then create the connected Agent Context target and the labelled Process circle between source and target. The user presses Run on the Process circle to generate the target's content. Run belongs to the Process, not to the Agent Context node.

A multi-output Process such as EXPLODE uses one Run action to populate all of its configured targets, for example four Agent Context nodes. Output nodes awaiting generation are pending contributions, not a new prompt/intention node category. The harness may coordinate several internal calls to fulfil that one Process.

Selecting a Process circle opens the side inspector with its actual instruction/template and settings. The inspector should distinguish that instruction from the complete compiled request, which also contains the resolved source content, historical context, explicit additions, and modifiers. Once run, the recorded request and available execution details remain inspectable. Selecting a Context node continues to expose its full content and associated generation records.

Conversation Workspaces execute one explicitly user-initiated Process at a time. Completion fills or updates the intended Context nodes and then stops; it does not automatically run downstream Processes. Running whole configured workflows remains a future Operation Workspace capability.

## Explicit context and reliable history

The desktop graph is the source material for inference, not a picture of one continuously expanding prompt. Context scope depends on the requested process: continuing from a historical contribution defaults to its branch up to that point, while a merge may use only the selected contributions. Additional material can be deliberately included, including material from later or separate branches.

Ordering, selected node versions, inclusion/exclusion, and process instructions must be resolved explicitly by the harness rather than reconstructed by the model from the workspace's appearance.

Presentation and context are separate. Moving objects, zooming, opening an inspector, or collapsing a group must not silently change the next request. Exclusion retains a node but keeps it out of applicable context until re-included; deletion removes it from the active workspace and future context selection unless restored. Historical records must not secretly reintroduce excluded or deleted material.

Each generation retains the actual inputs and versions used, together with its process settings and available model/tool metadata. This supports inspection and reconstruction of the request without promising that regenerating it will produce identical output. Exact exclusion scope and other detailed selection semantics remain design decisions to resolve.

## The harness underneath

The core responsibilities are separate from the graphical interface:

* **Context compiler:** resolves material, ancestry, versions, explicit additions/exclusions, instructions, modifiers, and ordering into an inspectable inference specification.
* **Process executor:** carries out the requested procedure, coordinates calls and dependencies, handles failures, and produces or updates contributions. Multiple internal steps need not become multiple visible nodes.
* **Provider adapters:** translate requests and responses for the selected backend without assuming identical capabilities. Intended connection paths are ChatGPT-authenticated access and configurable OpenAI-compatible endpoints for API-key-backed or local inference.
* **Persistent state and generation records:** preserve content, relationships, versions, attachments, organisation, and the history needed for inspection and undo, independently of an active model session.

Where a process requires several stages, execution order is enforced by the runtime rather than merely requested in a compound prompt. This guarantees procedural boundaries, not the correctness of the model's conclusions.

## Desktop experience

The desktop is the place where interaction happens—not an operating-system replica or a launcher for separate chat applications. It can contain workspaces, independent conversational origins, loose contributions, groups/folders, and reference files. Grouping and collapse organise material without automatically including it in inference.

Freeform and conversation-oriented layouts present the same underlying material. Semantic zoom is intended to reveal more content as a node gains screen space while keeping text approximately readable; a side inspector provides full content and generation details. Display previews need not require generated summaries and must not substitute for full context implicitly.

A discoverable creation/action palette and a taskbar-like navigation dock are candidate controls alongside direct manipulation, context menus, and keyboard shortcuts. Their purpose is to make creation and navigation accessible, not reproduce conventional desktop furniture.

## Development direction and future extension

The first priority is the usable, human-directed playground: interacting with contributions, controlling context, applying processes and modifiers, and preserving understandable history.

Later extensions may turn discovered sequences into reusable procedures and introduce Operation Workspaces for agents, conditional routing, guards, bounded retries, and external connectors. Executable control flow must remain distinguishable from conversational ancestry. Significant model-selected decisions should be visible in the interface, with detailed records available for inspection; repeated agreement is not proof of correctness.

Automation should grow from the exploratory experience, not become a prerequisite for its usefulness. Detailed implementation choices and unresolved semantics belong in the design documentation and subsequent planning.

**Explore ideas. Shape context. Connect possibilities.**
