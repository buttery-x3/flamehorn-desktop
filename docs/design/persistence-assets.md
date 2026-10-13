**Project:** Flamehorn Desktop
**Issue:** [FLAME-143 — Data Model, Persistence and Assets](<https://linear.app/flamehorn-games/issue/FLAME-143/design-data-model-persistence-and-assets>)
**Revision:** 0.2 — approval edition of 0.1; accepted behaviour unchanged.
**Date:** 13 October 2026, Australia/Sydney
**Status:** Approved by the user on 13 October 2026 (Australia/Sydney). All recommendations in the reviewed 0.1 draft are accepted. Design approval only; implementation and live checks have not been performed.
**After approval:** Publish the matching revision to `docs/design/persistence-assets.md`. Schemas and records here are explanatory, not code to execute.

> **Approval record — 13 October 2026:** The user accepted all draft-design recommendations and requested completion of the design issues. References below to “draft”, “proposed”, “recommended”, “review” or future approval preserve the reviewed rationale and are superseded by this approval record. All stated recommendations, numeric defaults, scope exclusions and fixtures are the accepted baseline. Cross-document references to older revision numbers identify the reviewed source; the approval editions indexed by FLAME-145 preserve those rules. Repository publication and final one-shot handoff are tracked in FLAME-145. No application or live provider validation is claimed.



**Companion review drafts:** [FLAME-142 — Process Execution and Tool Runtime](<https://linear.app/flamehorn-games/document/process-execution-and-tool-runtime-6a2e7e536f52>) · [FLAME-144 — Application Architecture and Provider Integration](<https://linear.app/flamehorn-games/document/application-architecture-and-provider-integration-a65654c130cc>). Read these v0.1 drafts together; none is an approved implementation instruction.

## 1. Recommended storage model

Use one local application library: SQLite for structured state and text, with a managed directory for immutable file bytes and retained derived representations. Keep credentials in a separate protected store. A Workspace owns its editable objects; multiple Workspaces may reference the same immutable material without sharing their edits.

This gives the MVP durable history, straightforward local transactions and portable backup without a database server or recursively copied transcripts. The trade-off is that the database and asset files must be backed up as one coherent library. It is not a cloud service or a folder of independently editable Markdown files.

The product baseline is [Node, Pin and Process Specification v0.3](<https://linear.app/flamehorn-games/document/node-pin-and-process-specification-54fb3107d819>) and [Context Compilation and Instruction Assembly v0.1](<https://linear.app/flamehorn-games/document/context-compilation-and-instruction-assembly-2eb0f3b948a0>), read 13 October. The compiler draft's proposed conventions remain reviewable. Coordinate this revision with [Runtime](<https://linear.app/flamehorn-games/issue/FLAME-142/design-process-execution-and-tool-runtime>) and [Architecture](<https://linear.app/flamehorn-games/issue/FLAME-144/design-application-architecture-and-provider-integration>), both draft v0.1.

The later compiler discussion narrows the MVP: no folders, groups, collapsed Workspaces, dedicated exclusion controls or cross-Workspace live references. Older <issue id="95847f80-7888-4691-bf7a-26e732fc9d08" href="https://linear.app/flamehorn-games/issue/FLAME-143/design-data-model-persistence-and-assets">FLAME-143</issue>/project/UI wording does not reintroduce them. Workspace membership and layout are stored separately from inference. Every Context remains generic, with its selected User/Assistant role stored independently of content.

## 2. Logical entities and ownership

IDs below are opaque stable IDs. Human labels such as C4, v2 and “Story seeds” are display metadata, never relational keys. A stored object may outlive its active canvas instance.

| Entity | Essential fields / responsibility |
| -- | -- |
| Library / Desktop | Library ID, schema version, Workspace list, app creation defaults and navigation preferences |
| Workspace | ID, name, creation order, active/removed state; owns its current nodes, connections and layout |
| Context instance | ID, Workspace ID, label, selected material entry, User/Assistant role, Force include, creation order, edit revision |
| Context material entry | Node-local visible version identity; either one mutable draft or a retained immutable content reference; origin and timestamp |
| Immutable content | Ordered text/attachment parts and content identity; shared safely across instances |
| Reference instance | ID, Workspace ID, asset-selection draft/history, chosen representation policy, Force include, creation order; no role toggle in this MVP |
| Asset | Original byte hash, byte count, detected media type, original name metadata; managed immutable bytes |
| Representation | Asset ID, mode, parser/version/options, resulting text/blob references, page/part order, limitations and preparation status |
| Process instance | Kind, pin/slot declarations, editable instruction, Persona/Format selection and effective text, master-template selection/text, Append flag, edit revision |
| Connection | Workspace ID; source node/pin and destination node/pin; stable identity and creation order |
| Run snapshot | Ordered material/role manifest, input bindings, captured relevant wiring, actual Process/template/modifier values, provider/configuration snapshot and output bases |
| Run / call records | Run state; ordered stages/calls; actual instruction framing; request recipe; complete results/plan; usage/errors; output outcomes |
| Run output | Slot ID, destination instance ID, captured base, generated text reference, committed result version or recovery status |
| Removal / undo record | Removed objects/edges or prior selection, operation ID, inverse action; historical retention is separate |
| Layout / navigation | Node geometry, viewport, active Workspace, reading selection, inspector state; never context inclusion |
| Provider configuration | Endpoint/mode/model choices, declared capabilities, nonsecret connection ID; credential reference only |

Built-in Process/Persona/Format definitions and compiler/adapter versions have immutable revision identifiers. A Process keeps effective local values, including Custom edits. Old runs retain actual strings even after application updates change a built-in. Named presets/None update creation defaults as <issue id="ccef9cfd-4218-46b3-99f4-2176ab79130c" href="https://linear.app/flamehorn-games/issue/FLAME-140/design-node-pin-and-process-specification">FLAME-140</issue> specifies; local Custom text does not. No reusable user persona catalogue or settings-copy feature is added.

### Relationships

```text
Library
  -> Workspace -> Node instances, Processes, Connections, Layout
Context instance -> material entries -> immutable content -> asset parts
Reference instance -> selected asset/representation -> immutable bytes
Run -> one frozen snapshot -> ordered input version/role references
Run -> calls and coordination results
Run -> output slots -> generated content + resulting Context versions
New Workspace -> fresh instances -> shared immutable content
```

A Reference node is not the file, and the original file is not necessarily the representation sent to a model. An image thumbnail is a cache, not an inference input. A model response fragment is not automatically a material version.

The proposed physical storage supports transactions, but database atomicity does not make asset-file writes part of a SQL transaction. The file protocol in section 6 closes that boundary. SQLite's [atomic commit](<https://sqlite.org/atomiccommit.html>) and [backup API](<https://sqlite.org/backup.html>) inform the mechanism; the application still owns its snapshot and recovery rules.

## 3. Material versions, drafts and selections

### Run-related retention

A new Context starts with one editable material entry. Autosave updates that entry; it does not create versions for keystrokes, editor sessions or reopening the app.

When a Process run actually uses that entry, freeze its exact material into immutable content and make the entry retained. The first subsequent edit opens one new editable entry based on the selected retained material. Further edits keep updating that same draft until a run uses it. A node has at most one mutable draft; selecting older retained material does not discard an existing draft. Editing an older selection while a different draft exists requires an explicit choice to continue the existing draft or replace that unsaved-to-history draft; never silently merge them or create unlimited parallel drafts.

A successful generated output always creates a retained resulting version. Runtime first captures the selected destination base, including previously unretained text, because Replace/Append must be undoable and historical output placement must be explainable. This is a run-related boundary, not a new save-every-edit rule.

On commit select the new output version. Earlier versions remain selectable. A draft preserved as a write base becomes retained before replacement; empty auto-created output placeholders need no synthetic empty version.

Selecting v2 when v6 exists selects v2 for the next request. It does not rewind current wiring, modifiers, role or descendants. Editing v2 creates/uses the one draft under the rule above, without changing v2.

Role changes do not create content versions. Each historical manifest captures the role used at that time. Reference material compiles under <issue id="a08b5a6d-dbc3-431d-a6fe-cc5bfaf7f00d" href="https://linear.app/flamehorn-games/issue/FLAME-141/design-context-compilation-and-instruction-assembly">FLAME-141</issue>'s proposed User-role convention; attachments inherit their containing Context's selected role.

### Origin and composition

Retained entries distinguish user-authored, generated, manually edited and extracted provenance without introducing new node types. A manual edit of generated text keeps a `basedOn` reference, while marking the edited material as manual; it must not masquerade as the unaltered model response.

Append stores both the generated fragment and resulting combined material. The result references its captured base and generated fragment; it need not duplicate the bytes physically. Replace preserves existing attachments and changes text only. Content-part order remains explicit.

Inputs that were not used and unrelated drafts are not versioned merely because a run occurred elsewhere. Failed admitted runs still retain their actual inputs and any output bases they captured; there may have been a real external request to explain.

### Example: changed material and role

C4 has retained versions v2 and v6. The user selects v2 and sets its role to User. Run R10 records C4@v2/User, even if v2 originated as a model response. Later edits create a draft v7; twenty saves keep updating v7. R10 still resolves v2/User. Selecting v6 later does not mutate R10 or reset the producing Process.

## 4. Compact provenance and request reconstruction

Retain one shared run snapshot for a multi-output Process. Each resulting version points to its run/slot. Do not place an expanded prompt or recursive transcript beside every output.

A required snapshot contains:

* Ordered node/material-version references, role used, part order, inclusion reasons and primary A/B/single-input bindings.
* Captured traversed edges/pins, branch membership and cycle cut-points, plus force-included roots. Capture the relevant graph only, not the entire Desktop. Retain upstream Process configurations only where needed to explain captured wiring or reconstruct an unexecuted configuration; mark those as configuration snapshots, distinct from the settings of actual producer runs.
* The target Process's actual kind, declared slot contract, base instruction, Persona/Format values, Custom state, master-template text, omitted components, Append mode and compiler revision.
* Each output's destination and selected base/version/revision, including attachment references.
* Exact selected asset representations and their preparation metadata.
* Nonsecret provider identity, endpoint, account-registration reference, model, effective supported settings, adapter revision and request recipe.
* Per-call stage framing, accepted planner output, result text, terminal outcome, timestamps, provider request/response IDs when supplied, and reported usage.
* Producer links and manual `basedOn` links for material, enough to inspect contributing history without following today's graph.

A request recipe is a retained, ordered structure of literal application instructions and references to immutable material/representations/coordination data. It includes the effective wire fields and adapter version. It must remain interpretable after code updates, rather than relying solely on rerunning a retired compiler. Inline images/PDFs are represented by retained byte references and encoding metadata, not repeated base64 in every record.

The inspector can render this as the request content actually sent, with credentials redacted. It is not necessarily a byte-for-byte HTTP packet capture: transport headers, server processing and private reasoning are outside that promise.

Illustrative record, abbreviated to show relationships:

```json
{
  "runId": "R10",
  "process": {
    "instanceId": "P3",
    "kind": "Compare",
    "instruction": "Compare context A and context B, pointing out similarities and differences.",
    "persona": {"name": "None", "text": ""},
    "format": {"name": "Short", "text": "Keep the response brief."},
    "masterTemplateRef": "instruction-snapshot-10",
    "append": false
  },
  "manifest": [
    {"node": "C1", "version": "v1", "role": "user", "branches": ["A", "B"]},
    {"node": "C4", "version": "v2", "role": "user", "branches": ["A"]},
    {"node": "C8", "version": "v3", "role": "assistant", "branches": ["B"]}
  ],
  "bindings": {"A": "C4@v2", "B": "C8@v3"},
  "capturedWiringRef": "wiring-10",
  "calls": [{"id": "R10-call1", "recipeRef": "request-10", "outcome": "completed"}],
  "outputs": [{"slot": "1", "node": "C9", "base": "v1", "result": "v2"}]
}
```

The real record also includes asset representations, output fragment identity and timing/provider metadata where applicable. These omissions in the example are not permission to omit required fields.

### Retention classes

| Class | Proposed retention |
| -- | -- |
| Retained content/assets, referenced representations, run snapshots and complete outputs | Until explicitly removed through the safe purge policy; no age-based silent pruning |
| Process/current Workspace state and mutable drafts | Autosaved local state |
| Accepted planner output, completed call text and summaries returned for inspection | Part of the compact run record |
| Complete uncommitted recovery result | Retain until saved or explicitly discarded; show storage use |
| Incomplete stream preview | Optional recovery buffer, at most 1 MiB per active call, 7 days after termination; never a Context version |
| Opaque provider continuation payload | Do not retain in this no-tools independent-call MVP; if later needed, protect for the valid sequence and define an approved retention change |
| Thumbnails and unreferenced derived previews | Disposable cache; evict and regenerate locally |
| Raw transport/debug capture | Off by default; explicit temporary diagnostic mode, redacted, maximum 20 MiB total or 24 hours, whichever expires first |

Debug deletion cannot remove required history. Summaries are labelled as provider-returned summaries, never raw private reasoning. Credentials, auth headers and token-bearing URLs are excluded from every class above, including debug capture.

Storage UI reports retained material, assets, recovery data and cache separately. If space is insufficient, fail a save/import visibly; do not reclaim referenced history to make room.

## 5. Imports and model-facing representations

### Supported first-release material

Recommendation: editable text plus local UTF-8 .txt/.md, PNG, JPEG and PDF imports. Unsupported file types produce an explanation before creating a usable reference. No audio/video, URL fetch, office-document conversion, OCR pipeline, cloud drive linking or automatic retrieval index in this MVP.

Imports copy bytes into the managed library. The source path can be remembered locally as optional metadata, but it is not a live dependency. Moving, deleting or editing the original later does not change existing material. **Replace imported file** performs a new explicit import/selection; it does not mutate the old asset. No filesystem watcher reloads it.

Hash original bytes with SHA-256 and check byte count for deduplication. Two References may share bytes while remaining different contributions with separate identities, selections and Force include flags. Filenames are metadata, not storage paths. Distinct node instances remain distinct compiler inputs even with identical asset bytes.

Reference asset selection follows draft/retained boundaries: an unused import can be replaced in its current editable selection; a selection used by a run remains retained when replaced. A run points to the exact old asset/representation.

### Representation choices

| Material | Default / explicit options | Required disclosure |
| -- | -- | -- |
| UTF-8 text/Markdown | Complete decoded text; Markdown remains material, not instructions | Encoding errors block; no partial decode or remote embedded resource loading |
| PNG/JPEG | Original image bytes through a capable route/model | A display thumbnail is not the model input; unsupported vision blocks |
| PDF on a confirmed capable route | Original PDF bytes as direct file input | Destination provider, whole-file transfer and model/route constraints |
| PDF on a text route | User-selected full extracted-text representation, prepared locally with PDF.js | Text only; diagrams/layout/handwriting may be absent or misread |
| Scanned or mixed PDF with inadequate extraction | Direct PDF on a capable route, or user explicitly chooses the limited extraction after inspecting warnings | Never treat blank extraction as a read document |

Show per-page extraction status and preview. A mixed document with blank or image-only pages warns before a text-only run; no pages disappear silently. Page-rendering for local preview is a cache; sending page images as a model input is deferred rather than a hidden alternate mode. The user can import an image separately.

Default representation selection is stored with the material instance. Switching providers does not silently switch from direct PDF to extracted text. The user selects the new representation and sees an updated preview. A Context attachment under Assistant role may be unsupported even where a plain User-role Reference works; report it without changing roles.

Proposed import limits: 25 MiB per file, 100 PDF pages, and 60 seconds per local preparation job. These are adjustable product proposals for review, not provider guarantees. Enforce stricter actual provider/request/context limits at Run. An imported file may be storable but too large for the chosen model. Text extraction never automatically truncates to fit.

Retain exact derived text used by a run together with parser version/options and original asset identity. Re-extracting after a parser update creates a different representation; it cannot rewrite history. Thumbnails can be regenerated because they were never the recorded inference representation.

### Example: replacing a PDF

R1 initially selects asset A1, imported from proposal.pdf. Run Q uses A1 with text representation T1. The external file is edited and moved; Q still resolves A1/T1. The user imports the revised file as A2 and chooses it on R1. A later run records A2 and its chosen representation. Q's inspector never substitutes A2 or newly extracted T2.

## 6. Physical storage and atomic boundaries

Architecture proposes packaged Electron on Windows 11 x64. Use its local app-data directory, proposed as `%LOCALAPPDATA%/FlamehornDesktop/`, rather than the install folder or repository:

| Location | Contents |
| -- | -- |
| library/library.sqlite | Workspaces, graph state, drafts, retained text/records, manifests and references |
| library/assets/ | Managed immutable original bytes, addressed by hash |
| library/representations/ | Large retained derived outputs used by runs |
| cache/ | Disposable previews and unreferenced preparation results |
| recovery/ | Bounded incomplete previews and complete uncommitted results |
| credentials/ | OS-protected secret records; outside library/export scope |
| backups/ | Bounded local recovery snapshots, visibly counted separately |

Small extracted text can live in the database; the representation identity and retention rules do not depend on its physical placement. Settings live in the database unless they must be available before opening it. No layout folder implies a filesystem directory. This is single-user local storage, not a shared network database.

Use one writer and a transactional relational schema with foreign-key checks. Native SQLite access runs off the UI thread. The graph library's JSON is not the authoritative database model.

### Save and import protocol

Autosave editable content after a short debounce, proposed 500 ms, and flush before Run, navigation away from an editor and normal exit. Save graph commands transactionally at completion; batch drag positions. Display Saving, Saved or Save failed. A crash may lose edits not yet acknowledged as Saved; never claim every keystroke was durable.

For an asset, stream into a temporary file under the library, validate/hash, flush and rename into its managed immutable location, then commit its database reference. A crash before the database commit leaves an unreferenced blob, which can be collected later. The reverse order must not create a committed record pointing to bytes that were never durably placed. Do not overwrite an existing immutable object with different bytes.

Run admission atomically stores frozen inputs/output bases, settings, new output nodes/connections and the run. Each slot commit atomically stores complete output content/version, selection and run outcome marker. The whole eight-output run is intentionally not one transaction.

Stage a completed uncommitted result durably before offering recovery, with run/slot/base IDs and checksum. Commit using the same uniqueness key as ordinary output. On restart, reconcile database commits before offering recovery so the same Append cannot happen twice. If disk failure prevented staging, state that the result was not saved.

## 7. Removal, undo, retention and purge

| Action | Meaning |
| -- | -- |
| Disconnect | Remove current edge only; material/history remain; later compilation stops following that edge |
| Uncheck Force include | Stop supplementary inclusion; still-connected material remains included |
| Remove node/Process | Remove from active Workspace and detach active edges; retain a tombstone and undo record; no future inclusion from that instance |
| Remove Workspace | Move to local Trash; stop/block while a run owns it; retain contents until explicitly purged |
| Undo edit/graph action | Apply inverse current-state change; never erase an already-sent request or rewrite retained versions |
| Undo a completed output write | Restore previous selection/base; keep the generated version and run inspectable |
| Clear caches/recovery previews | Delete disposable class only, without breaking required history |
| Permanent purge | Explicit destructive storage operation after an impact preview; not ordinary Remove |

Proposed undo history: latest 100 local editing/graph actions per Workspace across restart. Autosave checkpoints are not separate undo steps. Run admission/output commitment clears incompatible redo entries; undo cannot resurrect an in-progress call or cross an active destination lock.

Trash remains until explicitly emptied. Emptying Trash removes active-object recovery but must not delete bytes referenced by surviving Workspaces, retained runs, recovery results or extraction records. Garbage collection deletes only unreferenced objects after database reference checks. It should offer an estimate, because a removed node may free no bytes while retained history still uses them.

Targeted destruction of material still referenced by retained runs is deferred. The MVP refuses it and explains the retaining references. A later destructive history-redaction feature would need tombstones and a clear inspection-loss contract. A user can purge a whole removed Workspace's exclusive history after seeing the impact, while shared records remain protected. Deleting all local data is a separately confirmed whole-library operation, not a node menu shortcut.

Backups may still contain removed material; show this in the purge impact. The MVP does not claim forensic secure erasure. Missing bytes from corruption, an incomplete legacy import or external manual deletion are labelled unavailable and never replaced with current/newer material.

## 8. New Workspace from Here

### Contract

Input: one Context and its deliberately selected material entry. If it is an editable draft, capture its current text/attachments for extraction without falsely labelling it as a generated output; preserve its `basedOn` lineage if any.

Output: a newly opened Conversation Workspace with fresh editable node/Process/connection IDs, selected retained material and captured historical roles, and shared immutable bytes. The source Workspace, its selections and global creation defaults do not change. No inference, summary generation, provider connection or remote upload occurs.

Extraction uses historical evidence. It never looks at today's graph and pretends that graph produced an older output.

### Reconstruction algorithm

1. Identify the selected material's producer run/slot, or manual origin/`basedOn` record. An unrun, never-derived manual draft has no recorded contributing history; extract that material alone.
2. For a generated root, load the producer's recorded request manifest, contributing wiring, actual settings and output slot. Include its actual input versions/roles, relevant direct Context chains, and explicitly supplementary material.
3. Include available contributing producer/manual-base history recursively as historical evidence, deduplicated by historical occurrence rather than node ID alone. Stop at manual origins, explicit provenance cut-points and unavailable records. Current edges are not consulted.
4. Create fresh material occurrences when the same source instance appears at different versions, roles or incompatible historical predecessor contexts. Label them clearly, for example “C4 — source v2” and “C4 — source v6.” Share stored content; do not force contradictory history into a single input pin.
5. Recreate the target run's captured input graph as the active continuation graph. Where deeper producer history conflicts with that graph or was cut before the target run, place it as a separate, labelled provenance island with inspector links, not a newly connected ancestor. This keeps extraction from silently putting historically interesting but unsent material into the next request.
6. Copy generating Process configurations from their actual run snapshots. Distinct historical runs of the same Process become distinct editable Process instances when both are needed. Purely configured-but-never-run upstream Processes may be represented only where their captured wiring is needed; label any copied settings as captured configuration, not executed behaviour.
7. Mark supplementary nodes checked only when they were force-only inputs of the root run. Connected-and-forced nodes can retain their captured flag. Extra provenance islands start unchecked. Persist branch/input ordering and role choices.
8. Attach the root's historical run to inspection. Lay out a readable graph, not the original Desktop coordinates. Return a short extraction report listing missing material, duplicate historical occurrences and isolated provenance.

Before creation, the extraction preview names the selected version and what history is available. It explicitly says that editable reconstruction is not exact request replay. The retained historical manifest remains authoritative for the old request; later Run uses the new Workspace's current graph and compiler rules.

Do not automatically revive unrelated branches merely because they share an ancestor. Cut ancestry is visible in inspection, not silently rewired into active context. This distinction preserves <issue id="a08b5a6d-dbc3-431d-a6fe-cc5bfaf7f00d" href="https://linear.app/flamehorn-games/issue/FLAME-141/design-context-compilation-and-instruction-assembly">FLAME-141</issue>'s separation of current compilation and historical provenance.

### Multi-output and missing history

For one selected Explode/Fork/Three Experts output, include the shared run and contributing inputs but do not populate unused sibling outputs as active nodes. Keep the Process's declared slots. The selected output keeps its slot; other slots are unbound. Show “This Process originally produced other outputs; they were not included.” A later explicit Run auto-creates those missing destinations as usual.

If another sibling actually contributed to a later selected root, include that sibling as well. Run inspection may reference omitted sibling metadata, but it is not future input merely because it exists in the historical record.

Unavailable material becomes an explicit placeholder carrying the known identity and missing reason, not invented replacement content. A placeholder is a missing-record UI state, not a new generative Context taxonomy. A run depending on missing required material is blocked; the user can provide material or deliberately change connections. Missing force-included material is also a compilation error until resolved or unchecked.

### Worked extraction

Current Workspace now has C1@v6, Process P with a newly edited persona, and C4@v5. The user selects C4@v2. Its producer R7 recorded C1@v1/User, C2@v3/Assistant, force-only Reference F@asset1/text1, and P's old Formal persona.

The new Workspace contains fresh instances selecting those historical inputs, a fresh P with R7's settings, and a result selecting C4@v2. F is supplementary. It does not substitute C1@v6, C4@v5 or P's current persona. Moving, editing, removing or rerunning these new objects cannot change the source Workspace.

If R7 was Explode slot 6, only slot 6's output is materialised. The other seven slots remain unbound. If another contributing run used C1@v4 instead of v1, reconstruction gives the incompatible historical occurrence its own instance. If asset1 is missing, the extraction report and reference placeholder say so.

## 9. Restart, backup, export and migration

On launch, obtain a single-instance library lock, open the supported schema, validate required metadata and reconcile incomplete transactions/staged outputs. A run without a terminal marker is Interrupted unless durable slot records prove all outputs completed. Preserve committed versions, mark remaining slots unfinished and never automatically infer or resume.

**MVP export/import recommendation:** one whole-library archive containing a schema manifest, consistent SQLite snapshot, referenced immutable assets/representations and durable recovery results. Include removed material/retained history and clearly say so. Exclude credentials, host identity, caches, raw debug logs and transient stream previews. Strip optional original absolute paths and endpoint secrets; retained requests keep only safe configuration metadata. The archive contains private content and is not encrypted in this proposed MVP.

Export pauses mutations briefly to establish the database snapshot and blob manifest; immutable bytes can then be copied. Prevent purge while export reads its manifest. Use SQLite's backup facility rather than copying a live database file alone. Validate checksums before reporting success.

Import validates schema, checksums, sizes, relative paths and reference closure in staging. Reject absolute paths, traversal, duplicate-conflicting IDs and archive expansion beyond declared limits. Import opens as a separate library after explicit selection; it does not merge into or overwrite the current library. Credentials must be configured again.

Provide manual export plus automatic pre-migration backup and one daily local recovery snapshot, proposed retention of the last three daily snapshots and the latest pre-migration snapshot. Local backups do not protect against drive loss; the user chooses where exported archives go. Show backup storage use and allow explicit removal. Workspace-only portable export and cross-library merge are deferred.

Every library/export has a schema version. Migrations are ordered, transactional where possible, and run only after a verified backup with sufficient free space. Asset transformations create new immutable objects before switching references. A failed migration leaves the prior usable library/backup and reports the failure. A newer unknown schema opens neither writable nor with guessed defaults. Downgrading by destructive conversion is unsupported.

## 10. Acceptance fixtures and review

These are design fixtures for later verification.

| ID | Scenario / expected result |
| -- | -- |
| DA01 | Twenty edits before use, across autosaves/restarts, remain one editable entry |
| DA02 | First edit after a run preserves its input; later edits reuse one draft |
| DA03 | Old-version selection and role changes affect future compilation but not historical inputs |
| DA04 | Replace/Append preserve the selected base and attachments; undo retains the generated version |
| DA05 | Eight Explode outputs share one run/manifest; shared material is not recursively copied |
| DA06 | Reimport changed PDF retains the old asset/representation used by earlier runs |
| DA07 | Unsupported/blank extraction blocks; known lossy representation requires visible selection |
| DA08 | Crash at asset staging, admission and slot commit leaves either committed state or a visible recoverable interruption |
| DA09 | Repeated recovery cannot double-commit or double-append |
| DA10 | Remove/disconnect/uncheck have distinct effects; neither cache cleanup nor Trash purge destroys referenced material |
| DA11 | Extraction uses historical versions/settings, duplicates incompatible occurrences, and isolates provenance cut from the actual request |
| DA12 | Extraction excludes unused siblings; missing history is disclosed; source Workspace remains unchanged |
| DA13 | Backup/import preserves graph, drafts, retained history and asset hashes while excluding secrets |
| DA14 | Migration failure and unsupported schema do not silently rewrite the library |
| DA15 | Deleted required bytes yield missing-material errors, never substitution with a newer version |
| DA16 | Save failed is visible; content is not labelled Saved before the durable acknowledgement |

**Recommended decisions for review:** SQLite plus managed assets; run-related retained entries plus one mutable draft; copy-on-import with text/image/PDF scope; per-slot atomic commitment and bounded diagnostics; historical extraction with isolated conflicting provenance; safe reference-aware purge; whole-library archives and the stated backup defaults.

The principal review trade-offs are simplicity versus parallel drafts, preserving complete outputs versus all-or-nothing runs, and retaining compact history versus aggressive automatic cleanup. No cloud sync, collaboration, filesystem-linked documents, folders/collapse, hidden exclusions or full Desktop time travel is included. Publish only the user-approved matching revision set for <issue id="1ceec787-1ac1-404b-9142-3f7d2d6a6ad5" href="https://linear.app/flamehorn-games/issue/FLAME-145/design-mvp-implementation-brief-and-agent-handoff-documentation">FLAME-145</issue> handoff.
