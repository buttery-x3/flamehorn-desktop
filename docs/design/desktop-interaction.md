# Desktop Interaction Specification

**Project:** Flamehorn Desktop

**Issue:** [FLAME-139](https://linear.app/flamehorn-games/issue/FLAME-139/design-desktop-interaction-specification-and-approved-ui-reference)

**Revision:** 0.2 — reconciled approval edition, 13 October 2026 (Australia/Sydney)

**Status:** Existing design recommendations accepted by the user on 13 October 2026. This edition reconciles that acceptance with the approved Node, Compiler, Runtime, Data and Provider specifications. Final packet and launch instructions remain under FLAME-145 review.

**Canonical destination:** `docs/design/desktop-interaction.md` in `D:\dev\flamehorn-desktop`.

## 1. Experience and document authority

Flamehorn Desktop is a local place to read, connect, transform and revisit conversational material. The graph is the working surface, with a right inspector for full content and details. It is not an operating-system replica or a launcher for separate chat applications.

The original Desktop draft 0.1 is superseded and retained in `docs/design/superseded/desktop-interaction-v0.1.md` for audit only. The accepted semantics are in Node 0.4, Compiler 0.2, Runtime 0.2, Data 0.2 and Providers 0.2. This document owns their presentation. The original atlas is visual source material, qualified by the panel register in `docs/design/mockups/README.md`; old text within drawings is not an alternate product contract.

The MVP contains Conversation Workspaces. Each owns its nodes and connections; navigation selects the Workspace shown in the canvas. Several independent origins and disconnected islands may coexist in one Workspace. A compact Workspace navigation dock and creation/action controls support this surface. Desktop/library navigation does not imply floating OS windows, nested canvases, folders, groups or collapsed Workspaces.

Folders, groups, collapsed Workspaces, dedicated exclusion controls, live cross-Workspace references and Operation Workspaces are deferred by the accepted Compiler/Data scope. Semantic zoom, explicit Reference nodes and historical extraction remain required.

## 2. Visual baseline

Use the compact workbench treatment in atlas revision 0.6, Sites version 8, source commit `c971a92599bbc2e823b11af0de8c5bcc16d3231c`.

- Square Context and Reference cards; subtly rounded rectangular Process nodes.
- Compact typography, restrained borders, neutral layered surfaces, blue selection emphasis and colored square input/output pins.
- Canvas-first composition, edge creation/action controls, compact navigation at the bottom and a right inspector.
- Everyday Process controls on the node; full instruction text in inspector Advanced settings.
- Unboxed idle modifier triggers with a compact picker, following W2; use the approved Persona and Format names rather than the old Tone catalogue.
- Context content retains its light border, version selector and readable excerpt. No Persona, Format or Run controls on Context.
- Both Charcoal and Light assets are supplied. Use their corresponding artwork as the visual references; theme mechanics, exact spacing and accessibility adjustments are bounded implementation choices.

The original drawing colors, dimensions and typography are catalogued in the mockup index. Do not copy the gallery header, sheet navigation, annotations, Draft badges, review notes or skin-review controls into product chrome. Example prose and personas illustrate placement; they do not expand the catalogue.

## 3. Nodes and connections

| Object | Visible controls and information |
| --- | --- |
| Context | Editable content, User/Assistant message-role toggle, version selection, one input pin and an output pin, Force include in context, inspector/menu access |
| Reference | Filename/type and safe preview, input/output pins, Force include in context, asset/representation selection and preparation/error state |
| Process | Kind, declared pins/slots, compact Persona and Format controls, Run/Stop and phase/count feedback; inspector for instructions, template, Append and recorded runs |

There is one generic Context node type. Toolbar creation starts as User; creation from a Process output or automatic output creation starts as Assistant. Existing destinations preserve their selected role. Role changes do not change material, connections or historical roles.

Each input pin accepts one connection. Merge and Compare have A and B inputs; other catalogue Processes have one. References participate in direct Context/Reference chains and can be primary Process inputs. Process outputs target Context, never overwrite a Reference file. Process-to-Process connections and duplicate destinations for multiple slots are invalid. Cycles and deliberate A=B are valid.

Use visible valid/invalid connection feedback. Connecting to an occupied input must not silently replace it: explicitly disconnect/reconnect, or show a clear replacement action before committing. Rejected gestures leave the graph unchanged and identify the incompatible endpoint or cardinality. Exact gesture shortcuts may be chosen during implementation.

## 4. Create, wire and run

| Action | State change | Preserved boundary |
| --- | --- | --- |
| Create Context from toolbar | New editable User-role Context | No inference |
| Drag a material output to empty space and choose a Process | New Process with that input wired | No destination or inference merely from choosing |
| Drag a Process output to empty space and create Context | New Assistant-role destination | No inference |
| Connect to existing Context | Bind destination, retaining its role/material | No overwrite until a successful run |
| Press Run with valid inputs and missing destinations | Runtime admission creates/wires missing Contexts near matching output slots | Missing outputs alone do not disable Run |
| Press Run with missing input, invalid structure, unavailable material or unsupported capability | Actionable blocked explanation | No send; preflight creates no destinations |
| Direct Context/Reference chaining | Changes future connected history | No transformation or automatic execution |
| Change settings, role, selected version or Force include | Changes the next applicable preview/run | Existing run records and outputs stay intact |

The creation palette contains all thirteen accepted Processes: Respond, Continue, Narrow, Expand, Mirror, Challenge, Reinterpret, History, Fork, Explode, Merge, Compare and Three Experts. Counts and exact instructions are owned by Node §7. Fork has two outputs, Explode eight and Three Experts three.

Auto-created destinations are placed near corresponding output pins, in stable slot order, with reasonable collision avoidance and enough room to inspect each. Placement is presentation; it cannot determine A/B identity or compiler order. Reruns reuse connected destinations.

Run is one deliberate Process execution. It completes or terminates and stops. No automatic downstream execution, feedback repetition or hidden queue. The application permits one active run across Workspaces.

## 5. Visible run states and recovery

Show Preparing, Planning where applicable, Generating, Validating/Committing as needed, and terminal Completed, Partial, Failed, Cancelled or Interrupted. Compact node status and an inspector provide details; do not bury failure behind an unexplained disabled control.

- Streaming text is a temporary preview, distinguishable from retained material. Only durable slot commitment creates/selects a completed Context version.
- Show progress such as “3 of 8 saved,” the active slot, and failures/not-attempted slots separately.
- Fork normally requires three calls; Explode nine; Three Experts three. Show planned output/call counts before Run.
- Offer Stop while active. Explain temporary locks on active Process configuration/bindings, destination content/role/version and deletion of the active Process/Workspace.
- Other source edits affect the next run; current inspection can show “This run uses the captured version.”
- After failure, Run again uses current state. Retry unfinished outputs uses the original frozen snapshot only when recovery conditions hold. Save recovered result is a local save only, when a durable complete result exists.
- Stop/crash leaves already committed outputs visible. No partial stream masquerades as a version, and no automatic resume occurs.
- Close during a run offers Stay or Stop and close. Saving/Saved/Save failed reflect durable acknowledgement.

Runtime §§3–7 owns lifecycle, locks, retry, budgets and transaction order. The drawings B5/B7 only illustrate basic state treatment; they do not leave these mechanisms open.

## 6. Inspector, modifiers and templates

Selecting an object for reading changes the inspector subject, not inference membership or creation defaults.

Context inspection separates Content from Generation/history. Show full selected material, editable draft/retained state, role, attachments and version selector. Historical inspection identifies actual source versions/roles, generating settings, stage calls and outcomes. Current upstream selections/settings must not substitute for historical ones.

Process inspection distinguishes:

1. Current configuration: effective base instruction, Persona/Format preset or local Custom text, Append checkbox, selected master template and its text.
2. Next request preview: ordered selected material, input identities, supplementary reasons, asset representations, effective instruction assembly, omitted components and capability/size findings.
3. Recorded runs: frozen inputs/settings and actual stage request recipes, outputs, failures and returned usage or summaries.

Use both compact sequential and explicit natural-language master-template families, each with four complete component combinations, plus local Custom editing as specified in Compiler §4. Components intentionally omitted by Custom remain visibly unused. Unknown placeholders are errors. Do not silently add omitted components back.

Persona means voice; Format means presentation. The approved preset text and five Formats live in Node §8. Selecting a named preset or None updates the matching toolbar creation default and seeds future Processes. Merely selecting a node does not. Inspector text edits show Custom plus a gear only on that Process and do not alter toolbar defaults or other nodes.

Changing instructions/modifiers does not generate. Replace is default; Append is literal existing text plus generated text. Neither mode silently includes destination content in model input. Versions belong to Context; Processes stay editable and unversioned while run records retain their effective settings.

## 7. Reading, navigation and inclusion

Semantic zoom changes the camera scale for all world geometry: nodes, pin anchors, wires and spacing share one transform. Keep body text approximately constant in screen pixels while larger on-screen cards reveal more retained text. At very small scales reduce detail rather than shrinking text into illegibility. A3's 65%/100% views and 13 px body text demonstrate the intended behavior, not mandatory threshold values.

The inspector shows full material at any zoom. A clipped excerpt is presentation only; it cannot replace input text or cause a summary request. Opening an inspector, zooming, moving, selecting for reading and switching layouts must leave material, versions, bindings and inclusion unchanged.

Freeform and conversation-oriented arrangements show the same graph. Conversation arrangement reads broadly top-to-bottom with divergent paths beside one another. A layout operation changes geometry only.

Use the exact label Force include in context on Context and Reference. It adds only that node's selected material to every manually run Process in the same Workspace. Unchecking removes supplementary inclusion, not ordinary reachability. A checked and connected node is emitted once under Compiler §3. Do not add an exclusion checkbox. Disconnect removes an ordinary ancestry path without deleting content or resurrecting old provenance.

## 8. Files, persistence and extraction

Import selected UTF-8 text/Markdown, PNG, JPEG or PDF into the managed library. Show type/preparation status and the representation intended for the chosen provider. PDF text-only loss and blank pages must be visible. Reading/import alone sends no data to a model. Unsupported modalities or role combinations block rather than silently convert or relabel.

Save drafts without per-keystroke version creation. The first edit of run-retained material opens one editable version; subsequent edits reuse it until another run. Older-version selection and current role remain explicit. Show the existing-draft conflict choice required by Data §3.

New Workspace from Here begins on a deliberately selected Context version and previews available historical evidence. Creation opens fresh editable objects with retained historical versions/roles/settings and independently editable state, without inference. The source stays unchanged.

Data §8 governs exact reconstruction: copied historical occurrences, supplementary material, isolated conflicting provenance, missing-material placeholders and omitted unused sibling outputs. An extracted Explode output keeps its original slot; unused slots remain unbound and are created only by a later Run. Display the extraction report. Do not imply restoration of the entire old desktop or exact model replay.

Removal, Trash, Undo, reference-aware purge, backup/export/import and migration follow Data §§6–9. These are separate from Force include and disconnection. Provider connection, setup and error UX follows Providers §§4–9; offline editing remains usable without credentials.

## 9. Acceptance and visual evidence

These are requirements for later implementation, not tests executed during design.

| ID | Scenario and evidence |
| --- | --- |
| UI01 | Create/wire/run via toolbar and drag palettes; screenshots plus interaction trace show no inference before Run and automatic missing destinations at valid admission |
| UI02 | Any User/Assistant role combination chains; occupied input and Process-to-Process attempts show actionable rejection; cycles remain accepted |
| UI03 | Process node shows compact modifiers/Run; inspector owns prompt text; Context shows role/version without Process controls |
| UI04 | A3 comparison uses one graph and fixed camera center at two zooms; all world geometry transforms together, text stays readable and more content appears |
| UI05 | Freeform/conversation layouts and navigation preserve compiler manifest, selected versions and inclusion |
| UI06 | Reference primary input and Force include agree with Compiler fixtures; checked-and-connected input is not duplicated |
| UI07 | Rerun/version selection and local Custom modifier behavior agree with Node N14–N16, N21–N27 and Data DA01–DA04 |
| UI08 | Pending, streaming, completed, failed/partial, stopped and interrupted states agree with Runtime; completed appearance requires durable output |
| UI09 | Historical extraction preview/report and new Workspace agree with DA11/DA12; no inference and source unchanged |
| UI10 | Visual comparisons against the qualified A1/A3/B/C/D/W panels at native reference sizes; test readability/focus/keyboard access without copying review-only chrome |
| UI11 | Preview shows exact instruction components, omitted Custom components, ordered context and capability/size findings; current and historical requests remain distinct |
| UI12 | Offline save/reopen, Save failed and provider/auth/capability errors remain visible and actionable |

## 10. Reconciliation record

| Superseded draft/artwork | Accepted rule |
| --- | --- |
| User Context / Model Context as separate types | Generic Context with User/Assistant role toggle |
| Circular Process decoration or Process on every edge | Rounded rectangular Process node; direct material chains allowed |
| Missing output disables Run | Valid Run automatically creates missing destinations |
| Four-output Explode | Eight-output Explode; Fork 2; Three Experts 3 |
| Tone/lens controls or Cowboy persona as catalogue authority | Persona/Format controls and Node §8 catalogue |
| Extra supplementary Respond pins | Unary Respond; same-Workspace Force include for supplementary material |
| Include as context attachment with unresolved scope | Force include in context, settled Compiler §3 rules |
| Groups/folders/collapsed explorations in A1/D1 | Deferred from MVP |
| Unresolved runtime, extraction and provider behavior | Accepted Runtime/Data/Provider contracts |
| Gallery annotations, draft stamps or review controls | Documentation only |

Fine typography, spacing, exact semantic-zoom thresholds, keyboard shortcuts and collision avoidance may be refined within this behavior and visual style. Adding/removing product scope, changing counts/roles/history or replacing either provider pathway requires user approval. No implementation, authenticated sign-in, live inference or packaging is claimed by this document.
