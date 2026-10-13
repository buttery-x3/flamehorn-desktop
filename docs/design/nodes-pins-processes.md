**Project:** Flamehorn Desktop
**Issue:** [FLAME-140](<https://linear.app/flamehorn-games/issue/FLAME-140/design-node-pin-and-process-specification>)
**Revision:** 0.4 — approval edition of 0.3; accepted behaviour unchanged.
**Date:** 12 October 2026, Australia/Sydney
**Status:** Approved by the user on 13 October 2026 (Australia/Sydney). All recommendations in the reviewed 0.3 draft are accepted. Design approval only; implementation and live checks have not been performed.
**Approved implementation destination:** docs/design/nodes-pins-processes.md in the Flamehorn Desktop repository, after review and approval.

> **Approval record — 13 October 2026:** The user accepted all draft-design recommendations and requested completion of the design issues. References below to “draft”, “proposed”, “recommended”, “review” or future approval preserve the reviewed rationale and are superseded by this approval record. All stated recommendations, numeric defaults, scope exclusions and fixtures are the accepted baseline. Cross-document references to older revision numbers identify the reviewed source; the approval editions indexed by FLAME-145 preserve those rules. Repository publication and final one-shot handoff are tracked in FLAME-145. No application or live provider validation is claimed.



## Reading this draft

This document records the user's decisions from 11–12 October 2026. Revision 0.3 additionally establishes one generic Context node type with a user-adjustable **User / Assistant message-role toggle**. The creation route sets the initial role: toolbar creation defaults to User; creation from a Process output pin or automatic creation on Run defaults to Assistant. Revision 0.2's format, editing, wiring and version decisions remain in effect.

The thirteen Process names and counts, direction/voice/format distinction, full connected context, force inclusion, manual feedback, automatic output creation and corrected behaviours above are decisions from the discussion. The user has accepted the remaining W conventions in section 12. Instruction wording remains reviewable under W8. Input pins accept one connection; only Processes whose operation requires multiple inputs have multiple input pins. Mirror and Reinterpret retain the user's exact base instructions.

Where older project copy or the Desktop Interaction Design draft conflicts with the decisions recorded here, the newer user decisions govern. The UI draft must be reconciled under [FLAME-139](<https://linear.app/flamehorn-games/issue/FLAME-139/design-desktop-interaction-specification-and-approved-ui-reference>); this document does not approve layouts or mockups. The specification remains a working draft and requires review before implementation handoff.

## 1. Purpose and ownership

<issue id="ccef9cfd-4218-46b3-99f4-2176ab79130c" href="https://linear.app/flamehorn-games/issue/FLAME-140/design-node-pin-and-process-specification">FLAME-140</issue> defines the product meaning of nodes, pins, connections, Processes, modifiers and output destinations. It tells the other design areas what behaviour they must preserve.

| Area | Owned here | Coordinated design |
| -- | -- | -- |
| Nodes and pins | Node vocabulary, permitted connections, cardinality, input roles, output slots and editing meaning | UI presentation in 139; stored entities in 143 |
| Context | All Processes receive connected history; cuts stop ordinary ancestry; force inclusion adds selected material | Traversal, ordering, deduplication, exclusions and instruction assembly in 141 |
| Processes | Catalogue, short instructions, required inputs, output count, output identity and examples | Calls, parsing, streaming and execution strategy in 142 |
| Outputs | Missing destinations are created on Run; Replace/Append meanings; retained output versions | Creation lifecycle and partial failure in 142; storage/commit mechanisms in 143 |
| Modifiers | Persona means voice; Format means presentation; built-ins, Custom state, creation defaults and sharing across outputs | Controls in 139; composition in 141; persistence in 143 |
| Feedback | Circular wiring is valid for explicit manual runs against existing material | Finite compilation in 141; coherent reading and writing in 142 |
| Files and providers | References can be direct primary inputs or force-included material; text, images and PDFs fit the product interaction | Import/preparation in 143; provider capabilities and representations in 144 |

This specification does not choose JSON envelopes, model-call counts, database schemas, cancellation policies, provider authentication, or application packaging. Those are owned by the linked design issues in section 11.

## 2. Established design decisions

 1. A Process supplies the direction or action. A Persona supplies the voice. A Format supplies the expression or presentation.
 2. The same persona and format apply to every output of one Process.
 3. Processes use short, editable instructions and leave room for the model to interpret the material. An extensive strategy menu is not required.
 4. Each Process receives the full history available through its current input connections, plus force-included material. Acting on the latest turn is an instruction-level choice; it does not remove earlier context.
 5. Context is one generic node type with an editable User/Assistant message-role toggle. Every Context has one input pin and an output pin. The input accepts at most one connection; the selected message role does not restrict connections.
 6. Populated Context nodes remain useful after incoming connections are removed. Current wiring determines ordinary context for the next run.
 7. Context and Reference nodes can be marked Force include in context. Force inclusion applies to every manually run Process. Under agreed convention W1, its scope is the relevant Conversation Workspace; there are no per-Process supplementary-context pins in this MVP.
 8. Circular paths and direct feedback into an already populated output are allowed. Every run is explicitly initiated and stops when that Process finishes.
 9. Replace is the default output write mode. The optional Process-level Append to output context checkbox places generated text at the end of whatever text is already in each destination.
10. A Context created from the toolbar defaults to User message role. One created by dragging from a Process output pin or automatically by Run defaults to Assistant. The user can change either role. Run creates and wires missing destinations near their corresponding output pins.
11. Context versions are saved in connection with Process runs, preserving the input material used and the outputs produced. If the user edits material already recorded by a run, the earlier material is kept and one editable version is opened. Further edits update that same editable version until another run uses it.
12. Toolbar persona/format defaults seed newly created Processes and follow selection of named presets or None on existing Processes. A local Custom instruction edit does not change the defaults. Other existing Processes are not changed by a default update.
13. Persona and Format instructions can be edited through inspection. Editing one for an individual Process displays Custom with a gear icon on that Process. This is local control over that Process's prompt.
14. The MVP Format choices are Long, Short, Haiku, Bullet Point and Emoji, plus None for no format modifier. Adding more formats is future catalogue expansion.
15. Node copying, copying settings between nodes, saved profiles and reusable user-defined personas are future work. Inspector Custom editing is not the mechanism for creating a reusable persona or a creation default.
16. Creating nodes, wiring connections, changing settings and checking context do not invoke inference. Run belongs to the Process.
17. Generated material remains ordinary Context, available for another Process. Critiques, interpretations and branch outputs do not introduce new Context types. Processes remain editable and unversioned; run records capture the settings actually used.

## 3. Node vocabulary and material

### 3.1 Generic Context

There is **one generic Context node type**, not separate User Context and Model Context node types. A Context holds editable text, supported attachments, or both. It has one input pin and an output pin, may connect directly to another Context regardless of message role, and has the existing version, inspector and Force include in context behaviour.

A Context can be created for the user to write into, or created as the destination of a Process. A generated contribution is still an ordinary, editable Context. An empty Context may be a pending output destination; a populated Context remains useful after its incoming connection is removed. Neither its role nor how it was created changes its allowed connections. Historical run records retain the actual material and generating settings used without restoring disconnected history.

### 3.2 Message-role toggle and creation defaults

**Every Context has a toggle: User message / Assistant message.** This selects how the Context should be represented when the compiler assembles model messages. The role is not a node type, an ownership restriction or an instruction to run a Process.

* **Create Context from toolbar:** default **User message**, ready for user-authored content.
* **Create Context by dragging from a Process output pin into empty space:** default **Assistant message**.
* **Run a Process with an unconnected output and automatically create a Context:** default **Assistant message**.
* **Connect a Process output to an already-existing Context:** preserve that Context's current role. Creation defaults do not overwrite an existing selection.

The user may switch any Context between User and Assistant at any time, including a Context that was generated by a Process or initially written by the user. Switching changes its role for future request compilation; it does not create a new node, change its text, modify its connections or invoke inference. Recorded runs must continue to reflect the roles actually used for their inputs. <issue id="a08b5a6d-dbc3-431d-a6fe-cc5bfaf7f00d" href="https://linear.app/flamehorn-games/issue/FLAME-141/design-context-compilation-and-instruction-assembly">FLAME-141</issue> specifies message assembly; <issue id="95847f80-7888-4691-bf7a-26e732fc9d08" href="https://linear.app/flamehorn-games/issue/FLAME-143/design-data-model-persistence-and-assets">FLAME-143</issue> specifies storage and historical snapshots.

### 3.3 Reference

A Reference is the node representation of a file or other supported reference asset. It exposes the asset identity and Context input/output connections. File presence, node placement and folder membership do not automatically include it in inference.

A Reference can be:

* Chained with other Context nodes, making it part of the connected material supplied to a later Process.
* Wired directly to a Process input, making it that input's primary source.
* Marked Force include in context, making its material supplementary context for runs.
* Connected and force-included, without intending the same material to be inserted repeatedly.
* Left disconnected and unchecked, remaining available on the Desktop without affecting a run.

Chaining a Reference contributes context; it does not write into or modify the underlying file.

Images and PDFs can be direct inputs to Processes such as Explode or Challenge. No intervening Context instruction node is required. Asset preparation, supported file details and provider translation are coordinated with [FLAME-143](<https://linear.app/flamehorn-games/issue/FLAME-143/design-data-model-persistence-and-assets>) and [FLAME-144](<https://linear.app/flamehorn-games/issue/FLAME-144/design-application-architecture-and-provider-integration>).

### 3.4 Process

A Process holds its kind, short editable instruction, input and output bindings, persona and format settings, Append to output context setting, and access to Run and inspection records.

The ordinary node face communicates its Process identity, connections, modifiers and usable state. Detailed instruction editing belongs in inspection. Exact control placement belongs to <issue id="bc7e6bfc-d83e-400c-8356-2e78621aa5d7" href="https://linear.app/flamehorn-games/issue/FLAME-139/design-desktop-interaction-specification-and-approved-ui-reference">FLAME-139</issue>.

A Process is editable and unversioned. A past run retains the exact instruction and modifier values it used, even after the Process has changed.

A Process's declared input and output slots are distinct from the wording of its instruction. Editing Fork's text to request five results does not silently turn two output pins into five. This draft does not require an automatic semantic linter for arbitrary prompt edits; handling nonconforming model output belongs to <issue id="af8ebf82-241b-447a-8c31-5c66a7aa62d3" href="https://linear.app/flamehorn-games/issue/FLAME-142/design-process-execution-and-tool-runtime">FLAME-142</issue>.

### 3.5 Shared material rules

The material currently being worked with in a Context is available for a new run. A user can deliberately select an earlier retained version for use instead. Selecting older material does not reset a Process's current settings, rewrite descendants or invoke a Process.

Ordinary edits update the current editable material. The first edit to material already recorded by a run preserves that earlier material and steps once to an editable version; subsequent edits continue in that same version. Section 6.4 defines this behaviour for all editable Contexts.

Changing presentation, selection for reading, zoom, layout or collapse does not alter inclusion. Force inclusion and connections are explicit controls with separate meanings.

Empty generic Context destinations are valid places to receive output. They are not already generated contributions and cannot provide material that does not yet exist. Missing or unavailable primary input material is different from a missing output destination.

A Context's User/Assistant message role is explicitly user-selectable. <issue id="a08b5a6d-dbc3-431d-a6fe-cc5bfaf7f00d" href="https://linear.app/flamehorn-games/issue/FLAME-141/design-context-compilation-and-instruction-assembly">FLAME-141</issue> owns how that selection maps into compiled messages, and <issue id="d1f8f8e2-212c-48f1-bad7-c607f7830e6f" href="https://linear.app/flamehorn-games/issue/FLAME-144/design-application-architecture-and-provider-integration">FLAME-144</issue> owns provider-specific message formats. The compiler must not infer a fixed role from the node's creation path or from its current connection type.

## 4. Context available to a Process

### 4.1 Full connected history

Every Process receives the context available through its currently connected inputs, following relevant preceding connections until those connections stop. This is the default for transformations as well as Respond and Continue.

That history can be assembled entirely from directly connected Context blocks. Users can arrange text and reference material into a chain without inserting Processes or copying the blocks into one another. A later Process receives that connected material when explicitly run.

For Merge and Compare, inputs A and B remain distinguishable while the histories contributing to both are available. Earlier relevant context must not be discarded just because the immediate input node is the main subject of an instruction.

Current connections and retained provenance have different purposes:

* Current connections determine the ordinarily reachable material for a new run.
* Run records explain the actual inputs to an earlier run.
* Removing an edge stops ordinary traversal across that edge.
* Retained run records must not silently restore that disconnected ancestry.

A populated output with no incoming edge is therefore a valid context origin. This interpretation does not introduce a zero-input executable Process: the catalogue's one-input and two-input requirements still apply.

Cutting an edge changes which node contributions are supplied. It does not rewrite text already present in a retained contribution, including any references that text itself makes to earlier discussion.

### 4.2 Latest turn and additional material

When an instruction refers to the latest turn, that means the immediate Context or Reference connected to the relevant Process input. For a two-input Process, the input identities A and B remain explicit.

It does not mean whichever force-included block happens to be placed last in the compiled request. Additional context must not accidentally replace the primary subject of a Process.

Respond and Continue have proposed latest-turn wording in the catalogue. Other Process instructions deliberately refer to the supplied context and allow interpretation. The exact Mirror and Reinterpret instructions are not silently narrowed to the last turn.

<issue id="a08b5a6d-dbc3-431d-a6fe-cc5bfaf7f00d" href="https://linear.app/flamehorn-games/issue/FLAME-141/design-context-compilation-and-instruction-assembly">FLAME-141</issue> owns the representation that communicates current inputs, history and additional context clearly. There is no required extra subject, notes or supporting-material input pin.

### 4.3 Force include in context

The checkbox label is **Force include in context**. It is available on all Context and Reference nodes. Process instructions are configured through the Process rather than added through this checkbox.

Checked material is supplied as additional context to every manually run Process in the relevant Conversation Workspace, even when it is disconnected from that Process's ordinary history.

**Agreed convention W1:** the relevant scope is the Conversation Workspace in which the Process runs. Checking a node does not silently inject it into unrelated Workspaces.

**Agreed convention W2:** force inclusion contributes the checked node's own selected material, not its entire disconnected ancestry. This follows the user's example of deliberately preserving two recent contributions while bringing back one much earlier contribution.

Consequences:

* Checking a disconnected node does not reconnect the graph.
* Unchecking removes its force-inclusion status; it may still be included through ordinary connections.
* The checkbox is positive inclusion, not an exclusion control for ordinarily connected material.
* Checking a node that is already reachable does not express a request to repeat its text.
* Selection of a different retained version changes which material that checked node contributes to the next run.
* New Context and Reference nodes start unchecked.
* A force-included destination contributes its existing selected material. It does not contribute a result that has not yet been generated.

<issue id="a08b5a6d-dbc3-431d-a6fe-cc5bfaf7f00d" href="https://linear.app/flamehorn-games/issue/FLAME-141/design-context-compilation-and-instruction-assembly">FLAME-141</issue> owns ordering, deduplication, roles, any explicit exclusion precedence and the instruction wording around additional context. A possible explanatory wrapper may describe it as user-provided additional material to consider where relevant; this document does not mandate that wrapper or a first/last placement.

### 4.4 Circular paths and finite context

Circular connections are valid. A Process may use its own already populated Context destination as its next input.

A manual run must resolve a finite body of existing context from the live graph. A cycle does not mean that the compiler unfolds an infinite conversation or that the runtime automatically repeats a Process. Retained versions are not automatically expanded into extra conversational turns merely because a feedback edge exists.

The product contract is that each run reads coherent existing material and then writes its result. A write during that run must not retroactively change that same run's input. The finite traversal and ordering rule belongs to <issue id="a08b5a6d-dbc3-431d-a6fe-cc5bfaf7f00d" href="https://linear.app/flamehorn-games/issue/FLAME-141/design-context-compilation-and-instruction-assembly">FLAME-141</issue>; run input freezing and execution details belong to <issue id="af8ebf82-241b-447a-8c31-5c66a7aa62d3" href="https://linear.app/flamehorn-games/issue/FLAME-142/design-process-execution-and-tool-runtime">FLAME-142</issue>.

For example, a unary Process with an edited instruction to add two can receive an existing value of 2 and write back to that same Context. One explicit Run produces 4; another explicit Run produces 6. These values illustrate the required read/write behaviour, not a claim that model arithmetic has been benchmarked.

## 5. Pins and connection rules

### 5.1 MVP pin matrix

Each input pin accepts one connection. Every generic Context has an input and output pin regardless of its User/Assistant message role. A Process has one input unless its declared operation requires more: Merge and Compare each have two, A and B.

| Node/pin | Meaning | Accepted endpoint | Cardinality |
| -- | -- | -- | -- |
| Context input | Incoming preceding material or generated output destination | Any Context output, a Reference output, or a Process output | One input pin, zero or one connection |
| Context output | Outgoing available material | Another Context input or a Process input | Zero or many connections |
| Reference input/output | File or other reference material within a Context chain | Context or Reference links; Reference output can feed a Process input | One connection per input pin |
| Process input | Material on which the Process operates | Context or Reference output | One connection per pin; all required inputs present at Run |
| Process output | Destination for generated material | Context input | One destination per output; missing destinations created as generic Context with Assistant role |

User/Assistant is a message-role toggle, not a connection compatibility rule. A and B retain their identities regardless of screen position. Full connected history and Force include in context supply the applicable material without additional Process input pins.

Cross-Workspace membership and reference handling are coordinated with [FLAME-141](<https://linear.app/flamehorn-games/issue/FLAME-141/design-context-compilation-and-instruction-assembly>) and [FLAME-143](<https://linear.app/flamehorn-games/issue/FLAME-143/design-data-model-persistence-and-assets>).

### 5.2 Valid connection behaviour

* Contexts can be chained directly regardless of whether either is currently set to User message or Assistant message.
* References have the same ability to participate in Context chains.
* Direct chaining builds available context without modifying the connected blocks' contents or invoking inference.
* One source can feed multiple Context chains and Processes.
* A Context may be both the input and destination of the same Process.
* A populated Context may be detached and reused independently.
* A single Process may have several output slots, but each slot targets a separate output Context. Fork, Explode and Three Experts require distinct output Contexts.
* A Context accepts one incoming connection. Disconnecting it permits another connection without deleting stored content.
* Under agreed convention W3, the same source may be deliberately bound to both A and B. The two input roles remain distinguishable even if they refer to the same node.
* Rewiring changes future runs. It does not reassign the inputs of a past run.

There are no special connections based on User/Assistant role. The role toggle applies to the Context node itself and is respected during message compilation.

### 5.3 Invalid configurations and cases that remain valid

| Configuration | Meaning or response |
| -- | -- |
| Process wired directly to another Process | This catalogue acts through stored Context; executable Process-to-Process routing is not defined |
| Two connections attached to one input pin | Invalid. Each input pin accepts one connection. Processes requiring multiple inputs have separate input pins. |
| Two output slots of a multi-output Process targeting the same Context | Outputs are separately usable Context contributions |
| Required primary input missing or lacking available material | The Process cannot execute its declared operation yet |
| A direct Context-to-Context link to an available input | Valid regardless of message-role selection; References can participate as well |
| Circular connection | Valid; not an error merely because it is circular |
| Output slot has no destination | Valid configuration; Run supplies the missing destination |

Reference chaining does not introduce an operation for overwriting a PDF, image or other source asset with generated text. Generated output is stored in an output Context.

Exact error wording, rewiring gestures and visual feedback belong to [FLAME-139](<https://linear.app/flamehorn-games/issue/FLAME-139/design-desktop-interaction-specification-and-approved-ui-reference>). Missing or unreadable material handling is coordinated with [FLAME-141](<https://linear.app/flamehorn-games/issue/FLAME-141/design-context-compilation-and-instruction-assembly>) and [FLAME-142](<https://linear.app/flamehorn-games/issue/FLAME-142/design-process-execution-and-tool-runtime>).

## 6. Run, destinations and output writes

### 6.1 Creating and running are separate

Creating a Process, wiring its inputs or outputs, editing its instruction, selecting modifiers, and changing force-inclusion checkboxes do not execute it.

Run acts on one selected Process. It fulfils that Process's outputs and stops. It does not automatically run connected descendants or repeat a feedback loop.

### 6.2 Automatic output destinations

A user need not construct every output Context before Run.

On a valid Run, the application creates a generic Context with **Assistant message** selected for each unbound output slot and connects it to that slot. Existing destinations are preserved and used without changing their selected message roles.

New destinations are placed near their corresponding output pins. Exact placement, spacing and collision avoidance belong to <issue id="bc7e6bfc-d83e-400c-8356-2e78621aa5d7" href="https://linear.app/flamehorn-games/issue/FLAME-139/design-desktop-interaction-specification-and-approved-ui-reference">FLAME-139</issue>.

Examples:

* Respond with no destination obtains one.
* Fork with no destinations obtains two.
* Explode with three of eight slots already connected obtains the five missing destinations.
* Three Experts obtains three destinations with the declared expert-role bindings.
* Rerunning reuses the destinations now connected; it does not create another set merely because this is a new run.
* If a destination is disconnected, its material remains. The next Run can supply a new destination for the now-unbound slot.

This replaces the earlier design that disabled Run solely because output storage had not been manually wired. Required inputs, capabilities and other validity checks still apply. Exact lifecycle ordering and treatment of auto-created destinations after failed runs belong to <issue id="af8ebf82-241b-447a-8c31-5c66a7aa62d3" href="https://linear.app/flamehorn-games/issue/FLAME-142/design-process-execution-and-tool-runtime">FLAME-142</issue> and <issue id="95847f80-7888-4691-bf7a-26e732fc9d08" href="https://linear.app/flamehorn-games/issue/FLAME-143/design-data-model-persistence-and-assets">FLAME-143</issue>.

### 6.3 Replace and Append

The Process has an **Append to output context** checkbox. It is unchecked by default and applies to all outputs of that Process.

| Setting | What happens when the generated result is written |
| -- | -- |
| Unchecked: Replace | Replace the destination's current text with the newly generated text |
| Checked: Append | Place the newly generated text at the end of whatever text is already in the destination |
| Either mode, destination initially empty | The destination contains the newly generated text |

Append is literal text placement. Whatever text is already there stays as written; the new text goes after it. Appending does not interpret, reconcile or ask a model to merge the existing and generated material.

Append does not itself add the destination's existing text to the model request. That text is supplied to the model only when current connections or force inclusion include it. The append operation simply writes after the text in the destination.

Earlier material recorded by runs remains available under the version rules in section 6.4. A Process output write is a run-related change; ordinary manual edits have different retention behaviour.

In an explicit feedback loop, the next run receives the material currently in the connected destination, including appended text. There is no hidden rule to supply only the most recently appended fragment.

Partial completion, retries, concurrent edits and atomicity across several destinations belong to [FLAME-142](<https://linear.app/flamehorn-games/issue/FLAME-142/design-process-execution-and-tool-runtime>) and [FLAME-143](<https://linear.app/flamehorn-games/issue/FLAME-143/design-data-model-persistence-and-assets>). These mechanisms must preserve the literal meaning of Append.

### 6.4 Versions and inspection

Context version history is tied to Process runs. A run preserves the input Context material it uses and the outputs it produces, so that those materials remain available later. Ordinary typing, saving or reopening an editor does not create a succession of historical versions.

If the user begins editing Context material already recorded by a run, preserve that earlier material and step once to an editable version. Further edits continue in that same editable version until a Process run uses it. This applies to user-authored and model-produced material.

For example, a Process runs using a Context containing A. The user then makes twenty small edits to that Context. A remains available as the material used by the run, and all twenty edits belong to one editable version. When another Process runs using the edited material, that run preserves what it used. A later edit can then step once again to protect that run's input.

Material that has not yet been used or produced by a run can be edited freely without creating a new historical version for each change. Running an unrelated Process is not a reason to version every edited node in the Workspace.

Generated output is written to its connected destination according to Replace or Append. Earlier run-related versions remain available; no separate automatic version-selection convention is specified here.

Selecting earlier retained material for a future run does not restore an old Process configuration. A historical run view shows the settings and input material that were actually used, rather than substituting the Process's current values.

[FLAME-142](<https://linear.app/flamehorn-games/issue/FLAME-142/design-process-execution-and-tool-runtime>) owns coherent run capture and execution lifecycle. [FLAME-143](<https://linear.app/flamehorn-games/issue/FLAME-143/design-data-model-persistence-and-assets>) owns storage, retention and the representation of an editable version. This specification defines when a user-visible historical version is warranted without prescribing a storage mechanism or a version per edit.

The inspector distinguishes the current editable instruction, the next compiled request and a recorded past run. It does not expose raw private reasoning as a new Context category.

## 7. MVP Process catalogue

The user has accepted these thirteen Processes. The stated counts are part of their structural contracts.

**Instruction status:** Mirror and Reinterpret below are the exact user-specified base strings. All other wording is a first proposed canonical instruction for review. These base strings are ingredients for compilation, not complete provider requests.

Every Process receives full currently connected context and force-included material. A latest-turn target is explicitly stated where proposed; it never means withholding relevant preceding context.

### 7.1 Single-output Processes

| Process | Inputs / outputs | Base instruction | Intended structural result |
| -- | -- | -- | -- |
| Respond | 1 / 1 | Respond to the latest turn in the provided context. | One conversational reply |
| Continue | 1 / 1 | Continue the material in the latest turn of the provided context. | One continuation of the supplied material |
| Narrow | 1 / 1 | Narrow the provided context towards a clearer, more focused conceptual core. | One focused treatment |
| Expand | 1 / 1 | Expand on the provided context, exploring further ideas and possibilities. | One developed result, which may discuss several possibilities |
| Mirror | 1 / 1 | repeat back the context | One repeat-back result |
| Challenge | 1 / 1 | Challenge assumptions in the provided context. | One critical response; no mandatory multi-stage critique-and-repair workflow |
| Reinterpret | 1 / 1 | reinterpret the context from a fresh perspective | One reinterpretation; the model chooses the fresh perspective |
| History | 1 / 1 | Explore the historical context and development of the ideas presented in the provided context. | One historical treatment |

Respond answers; Continue extends. The distinction belongs in their instruction wording, not in different Context types.

Mirror and Reinterpret remain separate. Mirror does not become a summarisation operation by default. Reinterpret does not require a predefined lens or persona-specific analytical role.

The Process instruction and chosen persona/format are applied together. This document does not promise byte-for-byte repetition under every expressive format; the Mirror base instruction remains unchanged. Detailed instruction composition belongs to <issue id="a08b5a6d-dbc3-431d-a6fe-cc5bfaf7f00d" href="https://linear.app/flamehorn-games/issue/FLAME-141/design-context-compilation-and-instruction-assembly">FLAME-141</issue>.

### 7.2 Multiple inputs or outputs

| Process | Inputs / outputs | Base instruction | Output binding |
| -- | -- | -- | -- |
| Fork | 1 / 2 | Identify two distinct themes, identities or directions in the provided context and develop each into a separate exploration. | Slots 1 and 2; two developed Contexts |
| Explode | 1 / 8 | Identify eight distinct themes, identities or directions in the provided context and develop each into a separate exploration. | Slots 1–8; eight developed Contexts |
| Merge | 2 / 1 | Merge the concepts presented in context A and context B. | A and B remain identifiable inputs; one combined Context |
| Compare | 2 / 1 | Compare context A and context B, pointing out similarities and differences. | A and B remain identifiable inputs; one comparison Context |
| Three Experts | 1 / 3 | Give three different expert interpretations of the provided context: one mechanistic; one cognitive-science flavored; and one skeptical, pointing out limits and unknowns. | Mechanistic, cognitive-science flavored, and skeptical; one Context per role |

For Merge and Compare, context A and context B include their relevant connected histories; the compiler must preserve the identity of the two current inputs. Shared or force-included material is available without becoming an accidental third primary input.

Fork and Explode let the model find useful branches. They do not require predefined themes, extra prompt nodes or a second user Run to develop the results. Expand returns one Context; Fork and Explode expose distinct explorations as separate Contexts.

Three Experts is a Process because it determines the analytical directions. It uses one shared persona and format across its three outputs. There is no extra synthesis output or per-expert persona setting in this catalogue.

### 7.3 Common settings and preconditions

Every included Process supports:

* Its editable base instruction through inspection.
* One Persona selection and one optional Format selection.
* One-off Custom Persona and Custom Format instructions through inspection.
* Replace or Append output mode.
* Full connected history and applicable force-included context.
* Explicit Run and retained output versions.

The declared source count must be satisfied with available material. Each source can be a generic Context with either message role, or a supported Reference. Output slots must resolve to distinct Context destinations; missing destinations are created as generic Contexts defaulting to Assistant message on Run.

Instruction text does not silently change source count, output count, source identity or output bindings. A Process has one run action regardless of the number of connections.

Validation of structure and malformed generated results is coordinated with <issue id="af8ebf82-241b-447a-8c31-5c66a7aa62d3" href="https://linear.app/flamehorn-games/issue/FLAME-142/design-process-execution-and-tool-runtime">FLAME-142</issue>. The design does not require model-quality benchmarking or semantic validators for every custom instruction before this issue can be reviewed.

### 7.4 Worked Process examples

These are illustrative scenarios and expected output structures, not required factual answers or claims of tested model quality.

| Process | Supplied material | Expected structural behaviour |
| -- | -- | -- |
| Respond | Earlier discussion of a community workshop, followed by a question about opening hours | One answer at the current endpoint, with earlier discussion available |
| Continue | Character notes followed by an unfinished story passage | One continuation of the passage; the notes remain available |
| Narrow | A discussion containing several possible purposes for a shared creative space | One more focused treatment of that context |
| Expand | A short idea for a workshop that is also a museum | One developed exploration; several ideas may appear within that one Context |
| Mirror | A contribution explaining why a place feels meaningful, with its connected context | One repeat-back result using the selected persona and format |
| Challenge | A proposal whose assumptions have been discussed across earlier turns | One response challenging assumptions in that context |
| Reinterpret | The same supplied context used for Mirror | One fresh interpretation, with no required predetermined perspective |
| History | Discussion of a shared workshop and its social role | One historical treatment, in any selected voice and format |
| Fork | Material containing themes of solitude and connection | Two developed explorations; these themes are examples, not fixed branches |
| Explode | An image connected as the primary source, with relevant earlier or checked material | Eight developed explorations in eight Contexts |
| Merge | A workshop concept at A and a museum concept at B, each with available history | One result combining their concepts |
| Compare | The same A and B inputs | One result describing similarities and differences |
| Three Experts | A description of an unexpected interaction | Three Contexts in the specified analytical roles, all sharing the selected persona/format |

The older candidate names Cross, Refract, Analyse and Looping are not included in this accepted first catalogue. This does not prohibit later additions or editing an existing Process instruction for an individual exploration.

## 8. Personas and formats

### 8.1 Direction, voice and expression

The reference system in ai-app separates Shape, Tone and Style. Flamehorn Desktop uses the same distinction as Process, Persona and Format.

| Control | Responsibility | Example |
| -- | -- | -- |
| Process | Direction, action or analytical approach | Challenge assumptions; explore historically; compare A and B |
| Persona | Voice, phrasing and expressive character | Formal, grandmotherly, goblin, noir, deadpan |
| Format | Presentation, form or length | Long, Short, Haiku, Bullet Point, Emoji |

History is a Process that can use any persona. Three Experts' analytical roles are part of that Process, not three Persona settings.

The intended behaviour permits combinations such as History with Fantasy Goblin voice and Haiku format. Restrictive formats can compress expression; the catalogue does not promise that every such transformation preserves every word or nuance.

There is one Persona and one Format selection per Process in this MVP. Inspector edits to those instructions are local to that Process, as described in section 9.

### 8.2 Proposed initial Persona definitions

This is a reviewable built-in list based on ai-app's existing Tone catalogue. None means no voice modifier. Custom labels an inspector edit on an individual Process, as described in section 9; it is not a built-in Persona. These concise instructions preserve the voice-oriented intent rather than importing the old app's full-session control rules.

| Persona | Proposed instruction |
| -- | -- |
| None | No additional voice instruction |
| Formal | Use polished, measured, academically neutral phrasing with clear syntax and precise word choice. |
| Best Friend | Use warm, casual, supportive phrasing with gentle playfulness and familiar ease. |
| Grandma | Use gentle, nurturing phrasing with slightly old-fashioned warmth. |
| Fantasy Bard | Use melodic, rhythmic phrasing with vivid imagery and light dramatic flair. |
| Fantasy Goblin | Use scrappy, jagged, mischievous phrasing with energetic rhythms and playful rough edges. |
| Schoolyard Bully | Use blunt, impatient, slightly mocking phrasing without directing hostility at the user. |
| Noir Detective | Use dry, clipped sentences with a moody, atmospheric edge; the voice does not itself add an investigative task. |
| Whimsical | Use light, imaginative phrasing with soft metaphor and gentle playfulness. |
| Deadpan | Use spare, dry phrasing and understated wit. |
| Overexcited | Use enthusiastic, high-energy phrasing with quick verbal momentum. |
| Courtly | Use refined, ceremonially polite phrasing and elevated diction. |
| Techno-Minimalist | Use clean, efficient phrasing with minimal ornamentation and compact expression. |

These voices do not select the Process's task. For example, a friendly Challenge still challenges, and a gruff Mirror still has its repeat-back instruction.

### 8.3 MVP Format definitions

The MVP has five Format modifiers: **Long, Short, Haiku, Bullet Point and Emoji**. **None** means no additional format instruction. These are small prompt modifiers; the larger Style catalogue from ai-app is not part of the MVP. More formats can be added later without expanding the current design scope.

The five choices are the user's scope correction. Their concise instruction wording below remains proposed text for review.

| Format | Proposed instruction |
| -- | -- |
| None | No additional format instruction |
| Long | Give a detailed, extended response. |
| Short | Keep the response brief. |
| Haiku | Express the response as a haiku. |
| Bullet Point | Present the response as bullet points. |
| Emoji | Express the response using emoji only. |

Output packaging used to separate multiple results is not a user-selected Format. If the backend uses a structured envelope, the chosen Format applies to each result's content. The envelope and parsing strategy belong to [FLAME-142](<https://linear.app/flamehorn-games/issue/FLAME-142/design-process-execution-and-tool-runtime>) and [FLAME-144](<https://linear.app/flamehorn-games/issue/FLAME-144/design-application-architecture-and-provider-integration>).

Instruction precedence and the representation of absent modifiers belong to [FLAME-141](<https://linear.app/flamehorn-games/issue/FLAME-141/design-context-compilation-and-instruction-assembly>). Each Process still has one Format selection, shared by its outputs.

## 9. Local prompt overrides and defaults

### 9.1 Inspector-only Custom editing

Persona and Format instruction text can be edited through the inspection interface so the user can control the prompt for an individual Process.

When the Persona text is edited for one Process:

1. That Process's Persona display becomes **Custom**, with a gear icon.
2. The edited instruction is used by that Process.
3. The built-in preset and other Processes using it remain unchanged.
4. Toolbar creation defaults remain unchanged.

Editing Format text has the equivalent effect on that Process's Format. Editing Persona does not itself make Format custom, or vice versa. Editing the base Process instruction does not automatically rename either modifier.

Custom describes a local instruction override. It is not a reusable Persona/Format definition, a toolbar default, or an item that other new Processes inherit. Selecting a named preset again uses that preset's instruction for the Process.

### 9.2 Keeping local edits and historical meaning

The edited instruction is saved with the Process so its prompt remains as the user set it. A run record retains the instruction actually used for that run, including any local override.

The Custom label and gear make the changed prompt visible. They do not create a separate persona object or a reusable definition. Keeping the instruction with the Process supports persistence and accurate run inspection; it does not imply a settings-copy feature or custom-persona management in the MVP.

### 9.3 Toolbar defaults

The toolbar has default Persona and Format selections used when a new Process is created.

* Toolbar defaults use named built-in presets or None.
* Selecting a named preset or None on a Process updates the corresponding creation default.
* A default update affects subsequently created Processes.
* Editing instruction text in the inspector makes that modifier Custom only on the edited Process. It leaves the corresponding toolbar default at its existing preset or None.
* Custom is not offered as a toolbar creation default and does not transfer to a newly created Process.
* Merely reading or selecting a node does not change a default.
* Output Context nodes do not acquire persona/format settings; these settings remain on Processes.

For example, if the Persona default is Formal and the user edits one Process's Persona text, that Process displays Custom. The toolbar stays Formal, and a newly created Process starts with Formal.

The initial toolbar defaults are None for Persona and None for Format, as accepted under W7.

An option to stop defaults following preset selections is a later feature.

### 9.4 Future features

The following are outside this MVP:

* Copying and pasting nodes.
* Copying and pasting settings from one node to another.
* A UI for defining reusable personas that can be selected like built-in personas and used as defaults.
* Saved modifier profiles and dedicated custom-setting rollback controls.

These do not become MVP requirements through inspector editing or toolbar defaults.

## 10. Product states and inspection requirements

The product must distinguish these conditions, while <issue id="bc7e6bfc-d83e-400c-8356-2e78621aa5d7" href="https://linear.app/flamehorn-games/issue/FLAME-139/design-desktop-interaction-specification-and-approved-ui-reference">FLAME-139</issue> and <issue id="af8ebf82-241b-447a-8c31-5c66a7aa62d3" href="https://linear.app/flamehorn-games/issue/FLAME-142/design-process-execution-and-tool-runtime">FLAME-142</issue> define their detailed display and lifecycle:

| Object/condition | Required meaning |
| -- | -- |
| Populated Context | Has current material usable as input, whether or not a predecessor remains connected |
| Pending output Context | Exists as storage but has not yet received a contribution |
| Detached Context | Retains material; its disconnected ancestry is not ordinary context |
| Force-included Context/Reference | Adds its selected material to applicable manual runs |
| Configured Process with missing outputs | Can obtain missing destinations through Run |
| Process with missing required source | Cannot perform its declared operation until the source is supplied |
| Running Process | One explicit execution is in progress; changes during execution follow 142's policy |
| Completed output | Generated material has been written into the declared destination(s); run-related material is retained |
| Failed/partial execution | Must not be presented as a completed set of required outputs; detailed policy belongs to 142 |
| Custom modifier | This Process has a local instruction override, shown by Custom and a gear icon; creation defaults remain at their existing presets or None |

The inspector must make current editable settings distinguishable from settings recorded for an earlier version. Source content, compiled request and generated content are different things even when presented in the same inspection area.

## 11. Acceptance scenarios and companion contracts

### 11.1 Acceptance scenarios

These are documentation fixtures for review and later implementation. They do not require live model tests to complete this draft.

| ID | Scenario | Required observable result |
| -- | -- | -- |
| N01 | Create a generic Context from the toolbar, connect it to Respond, and Run with no prewired output | New Context initially selects User message; Run creates its destination with Assistant message and generates into it. Creation and wiring do not execute the Process. |
| N02 | Chain Context nodes with any mixture of User and Assistant message roles, and a Reference, then connect Respond | Every direct link contributes available material. Role selection does not restrict connections, and no Process runs just from wiring. |
| N03 | Have Contexts C1–C10 in a chain; sever history immediately before C9; run from C10 | Ordinary context contains C9 and C10, without recovering C1–C8 from run provenance. |
| N04 | In N03, mark C2 Force include in context | Under W1/W2, C2's selected material is additionally available; checking it does not restore its disconnected ancestors. |
| N05 | Run different Processes with force-included Context nodes of either message role and a checked Reference | All receive the marked material as additional context, regardless of ordinary reachability. |
| N06 | A checked Reference is also directly wired as the primary source | It remains the primary source and is not intentionally duplicated merely because two inclusion routes exist; 141 defines the representation. |
| N07 | Disconnect a populated Context from the Process that produced it, then use it as Challenge's source | Material and versions remain; Challenge can use it as the beginning of a shorter history. |
| N08 | Edit a unary Process to add two; wire an existing output of 2 back as its input and destination | Separate manual runs produce 4, then 6 as current results. Earlier versions remain. No automatic repeated execution occurs. |
| N09 | Output contains A recorded by a previous run; the new result is B and Append is unchecked | The destination text becomes B. A remains available in run-related version history. |
| N10 | Output contains A; the new result is B and Append is checked | B is placed at the end of A. A is left as written. No model merging occurs, and Append alone does not add A to model input. Previously recorded run material remains available. |
| N11 | Run Explode with three output destinations already connected | Five missing destinations are created, and all eight slots receive developed output. A rerun reuses those destinations. |
| N12 | Run Three Experts with a single selected persona and format | Three separate Contexts correspond to the three roles; all use the same persona/format. No fourth synthesis destination appears. |
| N13 | Wire an image to Explode or PDF to Challenge | The reference is accepted as the direct source at the product level; no extra user-instruction node is mandatory. |
| N14 | With Formal as the toolbar Persona default, edit one Process's Persona text | That Process displays Custom with a gear icon. The preset and other Processes remain intact; the toolbar stays Formal and a newly created Process receives Formal. |
| N15 | With Short as the toolbar Format default, edit one Process's Format text and then create another Process | The edited Process displays Custom. The toolbar stays Short and the new Process receives Short. The local edit is retained only with its Process and relevant run records. |
| N16 | Select an older output version and run a downstream Process | The selected older material is used. Existing historical runs keep their actual inputs; upstream Process settings are not reset. |
| N17 | Rearrange nodes on screen or append checked material after ordinary history in the request | A/B bindings and latest-turn identity do not change merely because position or serialization order changes. |
| N18 | Attach two connections to one input pin, or two Process output slots to the same destination | The invalid structure is surfaced. Each input pin accepts one connection; multiple-input Processes have separate pins. |
| N19 | Disconnect an output and run its former producing Process again | The detached output retains its material; the missing slot can receive a newly created destination. |
| N20 | Use an empty, not-yet-generated Context as the only primary source | The application does not pretend it contains completed material or automatically run another Process to supply it. |
| N21 | Make twenty text edits to a Context that has not been used or produced by a run | The edits update the current material. They do not create twenty historical versions. |
| N22 | Run a Process using Context A, then make twenty edits to that Context across saves or editing sessions | The material used by the run remains available. The first edit steps to one editable version; all subsequent edits update that same version until another run uses it. |
| N23 | Select a named Persona or Format preset on a Process, then create another Process | The matching toolbar default follows the preset selection and seeds the new Process. Other existing Processes are unchanged. |
| N24 | Open the MVP Format selector | It offers None, Long, Short, Haiku, Bullet Point and Emoji. A local Custom indicator does not add a reusable format or creation default. |
| N25 | Create a Context by dragging from a Process output pin | The new Context defaults to Assistant message without automatically running the Process. |
| N26 | Toggle a Process-created Context from Assistant message to User message | The Context remains the same node with unchanged material and connections; its new role applies to subsequent requests. |
| N27 | Connect a Process output to an existing Context whose role is User message | The existing User role remains selected; the Assistant default only applies when a new Context is created from a Process output. |

For N08, the edited add-two instruction is an example of using an existing unary Process; it does not add a fourteenth built-in Process to the palette.

### 11.2 Required coordination before final handoff

| Issue | Contract it must reconcile with this draft |
| -- | -- |
| [FLAME-139](<https://linear.app/flamehorn-games/issue/FLAME-139/design-desktop-interaction-specification-and-approved-ui-reference>) — Desktop Interaction | A visible User/Assistant toggle on every generic Context; toolbar User creation default and Process-output Assistant creation default; existing Context roles unchanged by wiring; existing pins, force inclusion, Append, automatic destination placement and circular wiring |
| [FLAME-141](<https://linear.app/flamehorn-games/issue/FLAME-141/design-context-compilation-and-instruction-assembly>) — Context Compilation | Compile each Context using its selected User/Assistant message role, not a separate node type or creation history; preserve roles used by historical runs; full live context, cuts, cycles, force inclusion, A/B binding and persona/format composition |
| [FLAME-142](<https://linear.app/flamehorn-games/issue/FLAME-142/design-process-execution-and-tool-runtime>) — Process Runtime | One manual run and stop; coherent feedback inputs; output auto-creation lifecycle; 1/2/3/8 output fulfilment; literal Replace/Append writes; run-related input/output capture; partial completion, retry, cancellation and malformed output |
| [FLAME-143](<https://linear.app/flamehorn-games/issue/FLAME-143/design-data-model-persistence-and-assets>) — Data, Persistence and Assets | Persist the generic Context's selected message role and the role used in each historical run, separately from material content/version changes; retain history and existing editable-version rules |
| [FLAME-144](<https://linear.app/flamehorn-games/issue/FLAME-144/design-application-architecture-and-provider-integration>) — Application and Providers | Translate selected Context message roles into supported provider-specific message formats, with input modalities, outputs and capability limitations |
| [FLAME-145](<https://linear.app/flamehorn-games/issue/FLAME-145/design-mvp-implementation-brief-and-agent-handoff-documentation>) — MVP Handoff | Reconcile the six design areas, approved revisions and superseded project/UI copy before launching implementation |

The 140 draft can be reviewed before those mechanisms are settled. Final handoff must preserve freely chainable Context blocks, manual feedback, automatic output creation and the corrected scope of modifiers and version retention.

## 12. Review status and remaining design work

### 12.1 Corrections settled in this review

The following earlier draft conventions were corrected by the user. Their identifiers are retained to make the review traceable; they are no longer presented as unanswered choices.

| ID | Corrected rule |
| -- | -- |
| W4 | Append applies to all Process outputs and places generated text at the end of whatever text is already in each destination. It does not ask the model to merge or transform the existing text. |
| W5 | Every generic Context has input/output connections and can be chained directly with any other Context regardless of its selected User/Assistant message role. No Process is needed merely to assemble Context blocks. |
| W6 | Preserve Context material in connection with Process runs. Editing material already recorded by a run steps once to an editable version; further edits update that same version until another run uses it. Ordinary edits do not each create another historical version. |

The five Format choices, local-only Custom overrides and deferral of node/settings copying are also user corrections, recorded in sections 8 and 9.

### 12.2 Accepted conventions

The user accepted W1, W2, W3, W7, W8 and W9 on 12 October 2026. Together with the corrections in section 12.1, all W conventions are settled. W8 retains the ability to review and refine instruction wording.

| ID | Accepted convention |
| -- | -- |
| W1 | Force inclusion is scoped to the relevant Conversation Workspace, not unrelated Workspaces. |
| W2 | A checked node contributes its own selected material, not its disconnected ancestors. |
| W3 | A and B can deliberately refer to the same source; their role bindings remain explicit. |
| W7 | New force-inclusion checkboxes start unchecked; toolbar defaults initially impose no Persona or Format constraint. |
| W8 | Persona seed definitions and instruction wording remain reviewable, including wording for the five scoped Formats and all Process instructions except the two exact user strings. The Format list itself has been narrowed by the user. |
| W9 | Selecting a node for inspection alone does not change creation defaults. Named preset or None selections do; local Custom text edits do not. |

### 12.3 Input connections

Each input pin accepts one connection. A Context has one input pin. Processes have multiple input pins only when their declared operation requires them; Merge and Compare have A and B. This is settled.

Detailed traversal/order, explicit exclusion conflicts, cross-Workspace scope, provider-specific message-role representation, input-size handling, mid-run changes and failure commits remain assigned to their owning specifications. The User/Assistant role toggle on generic Context nodes is approved MVP behaviour; only its request mapping and storage mechanics belong to those other specifications.

Once approved, publish the matching revision to the repository destination and cross-link it from Linear. This working draft does not mark [FLAME-140](<https://linear.app/flamehorn-games/issue/FLAME-140/design-node-pin-and-process-specification>) complete.

## 13. Sources and reference material

* User design decisions in this Flamehorn Desktop discussion, 11–12 October 2026.
* [FLAME-140 issue and documentation remit](<https://linear.app/flamehorn-games/issue/FLAME-140/design-node-pin-and-process-specification>).
* [Desktop Interaction Design — Working Draft, revision 0.1](<https://linear.app/flamehorn-games/document/desktop-interaction-design-working-draft-b28dbc9a83c4>). Some node/run/context rules are superseded as stated above; visual approval remains with <issue id="bc7e6bfc-d83e-400c-8356-2e78621aa5d7" href="https://linear.app/flamehorn-games/issue/FLAME-139/design-desktop-interaction-specification-and-approved-ui-reference">FLAME-139</issue>.
* [ai-app Shape definitions](<https://github.com/buttery-x3/ai-app/blob/main/src/lib/data/shapes.json>).
* [ai-app Tone definitions](<https://github.com/buttery-x3/ai-app/blob/main/src/lib/data/tones.json>).
* [ai-app Style definitions](<https://github.com/buttery-x3/ai-app/blob/main/src/lib/data/styles.json>).
* [ai-app system templates](<https://github.com/buttery-x3/ai-app/blob/main/src/lib/data/system.json>).
* [ai-app prompt compiler](<https://github.com/buttery-x3/ai-app/blob/main/src/lib/utils/compilePrompt.ts>).

The ai-app files were read as reference material on 11 October 2026. Their instruction-composition pattern informs this draft; their session-persistent wording, single-reply requirement and full Style catalogue are not imported into the Desktop MVP.
