**Project:** Flamehorn Desktop
**Issue:** [FLAME-142 — Process Execution and Tool Runtime](<https://linear.app/flamehorn-games/issue/FLAME-142/design-process-execution-and-tool-runtime>)
**Revision:** 0.2 — approval edition of 0.1; accepted behaviour unchanged.
**Date:** 13 October 2026, Australia/Sydney
**Status:** Approved by the user on 13 October 2026 (Australia/Sydney). All recommendations in the reviewed 0.1 draft are accepted. Design approval only; implementation and live checks have not been performed.
**After approval:** Publish the matching revision to `docs/design/process-runtime.md`. This review draft does not start implementation or live inference.

> **Approval record — 13 October 2026:** The user accepted all draft-design recommendations and requested completion of the design issues. References below to “draft”, “proposed”, “recommended”, “review” or future approval preserve the reviewed rationale and are superseded by this approval record. All stated recommendations, numeric defaults, scope exclusions and fixtures are the accepted baseline. Cross-document references to older revision numbers identify the reviewed source; the approval editions indexed by FLAME-145 preserve those rules. Repository publication and final one-shot handoff are tracked in FLAME-145. No application or live provider validation is claimed.



**Companion review drafts:** [FLAME-143 — Data Model, Persistence and Assets](<https://linear.app/flamehorn-games/document/data-model-persistence-and-assets-fbd0c1d6490f>) · [FLAME-144 — Application Architecture and Provider Integration](<https://linear.app/flamehorn-games/document/application-architecture-and-provider-integration-a65654c130cc>). Read these v0.1 drafts together; none is an approved implementation instruction.

## 1. The proposed MVP

Pressing Run executes one selected Process against a frozen set of material, fills its declared outputs, records what happened, and stops. The user remains in control of the exploration.

This draft recommends one active run across the application, sequential internal calls, incremental commitment of complete outputs, and no model-requested tools in the first release. File import, PDF preparation and persistence are ordinary application operations. The no-tools scope is an explicit proposal for approval, not an unimplemented tool interface presented as working.

The baseline is [Node, Pin and Process Specification v0.3](<https://linear.app/flamehorn-games/document/node-pin-and-process-specification-54fb3107d819>) and [Context Compilation and Instruction Assembly v0.1](<https://linear.app/flamehorn-games/document/context-compilation-and-instruction-assembly-2eb0f3b948a0>), read on 13 October. Their newer rules override conflicting older issue/project/UI prose: generic Context with selectable User/Assistant role; full current connected history and Workspace-scoped Force include; valid manual feedback; automatic missing destinations; thirteen Processes; Fork 2, Explode 8, Three Experts 3.

The compiler draft's proposed traversal and templates are consumed as that revision's contract; publication here does not approve them. [Data and Assets](<https://linear.app/flamehorn-games/issue/FLAME-143/design-data-model-persistence-and-assets>) owns retained identities and transactions; [Architecture and Providers](<https://linear.app/flamehorn-games/issue/FLAME-144/design-application-architecture-and-provider-integration>) owns transport, credentials and capability evidence. Visual placement remains <issue id="bc7e6bfc-d83e-400c-8356-2e78621aa5d7" href="https://linear.app/flamehorn-games/issue/FLAME-139/design-desktop-interaction-specification-and-approved-ui-reference">FLAME-139</issue>'s work.

## 2. Responsibilities and invariants

| Component | Responsibility |
| -- | -- |
| UI | Save current edits; show preview, Run, Stop, per-output progress and history; never decide completion from displayed text |
| Runtime | Admit one run, freeze configuration, coordinate bounded stages, validate results, request commits and terminate |
| Compiler | Resolve the coherent snapshot into ordered material, roles, A/B bindings, exact instructions and capability/size findings |
| Asset preparation | Produce or resolve the explicitly selected representations before sending |
| Provider adapter | Encode the call, authenticate, stream normalised events, distinguish terminal completion from disconnect |
| Data service | Preserve frozen inputs and settings; atomically commit each complete output and its provenance; recover after restart |

All model calls in a run use the same selected provider registration, endpoint, model and effective settings. No automatic downstream runs, sibling exploration outside the selected Process, provider switching, account switching, or paid fallback occurs.

The run records what was used. Current edits do not rewrite it. Successful parsing and completed transport establish procedural completion, not factual correctness, useful diversity, or superior reasoning.

## 3. Admission, snapshot and edit boundary

### Before a request

1. Flush current editor drafts and obtain a coherent Workspace revision. Disable Run while required saves or selected asset preparation are pending.
2. Validate required inputs, single-connection pin cardinality, distinct output destinations, current provider/model selection and selected representations. Empty primary material is invalid; a missing output destination is valid.
3. Produce a fresh preview/compile plan from this revision, including output count, internal call count and known size limits. Refresh stale previews. Do not silently shorten material.
4. Acquire the single application run lease and compare the revision. If relevant state changed, revalidate before admission.
5. In one local transaction, retain only the material this run uses, retain output bases needed for undo/Append, create and wire missing destinations, freeze instructions/settings/bindings, and create the run record. New destinations default to Assistant; existing roles stay unchanged.
6. Compile the retained snapshot and verify the final encoded request before the first send. A late capability or encoding error ends the admitted run without generated versions.

Pure preflight failure creates neither destinations nor a historical run. Failure after admission keeps the run record and any new empty destinations, clearly marked as awaiting a successful result. Rerun reuses them. The user can remove them after the run ends.

Run admission uses a client action ID. Double-clicks or repeated delivery of the same action return the same run ID. A second distinct Run while busy is rejected with “Another Process is running” and a way to navigate to it. There is no hidden queue.

### While running

The active Process's settings and input/output bindings, all destination material/version selections/roles, and deletion of that Process or its Workspace are temporarily locked. The inspector explains the lock and offers Stop. A destination that is also an input is locked under the destination rule.

Other source content, roles, force-inclusion choices and unrelated graph material may be edited. Those changes affect future runs only. Removing a source from the active graph does not retract bytes already frozen or sent; the run continues from its retained snapshot. Show “This run uses the captured version” when relevant. Moving nodes, reading history and navigating Workspaces remain available.

The write transaction still checks destination identity, binding and revision. An unexpected conflict, missing destination or storage failure never recreates a deleted destination or overwrites newer content. It retains a complete, uncommitted result for recovery and ends with an actionable failure.

Closing the app while running offers Stay or Stop and close. Stop records intent before aborting network activity. A crash or forced termination follows restart recovery; there is no background daemon or automatic resume.

## 4. Lifecycle and observable events

| State | What happens | Exit / UI meaning |
| -- | -- | -- |
| Ready / blocked | Preview only; no admitted run | Run enabled only when preflight can succeed |
| Preparing | Retain snapshot, bind destinations, compile, refresh credentials if needed | “Preparing”; no generated version yet |
| Planning | Fork/Explode allocate output briefs | Progress shows planning, not a fake Context output |
| Generating | One call supplies one output; stream is a temporary preview | Show slot and completed count |
| Validating | Require transport completion and valid stage result | A text delta is not a completed version |
| Committing | Data transaction records complete result/version and updates destination | Emit committed only after durable success |
| Completed | Every required slot committed | Release locks; stop |
| Partial | Some slots committed, others failed or were not attempted | Keep completed versions; show exact outcomes and reason |
| Failed | No output committed and run cannot proceed | Keep prior destination contents and diagnostic record |
| Cancelled | User stopped the run | Retain already committed slots; label incomplete set |
| Interrupted | Runtime ended without a terminal record | Recovered on next launch; never imply completion |
| Saving failed | Completed response could not be committed | Treat as failure/partial with recoverable result, not successful generation |

Cancelled and Interrupted can carry a nonzero committed count; the user sees, for example, “Stopped — 3 of 8 saved.” Failed/Partial carry a reason such as authentication, limit, malformed output, or disk error.

The UI consumes a small ordered event contract:

```text
run.admitted(runId, snapshotId, outputSlots)
run.phaseChanged(runId, phase)
call.started(runId, callId, stage, slotId?)
call.delta(runId, callId, slotId?, text)       // ephemeral preview
call.finished(runId, callId, outcome, usage?)
slot.committed(runId, slotId, versionId)
run.finished(runId, outcome, slotOutcomes, reason?)
```

Every event has a monotonic sequence within the run. Renderer reconnect reads the persisted run/slot state; it does not replay model requests. Only committed events assert durable material. Provider reasoning summaries and planner information go to the inspector, not output text.

## 5. Internal sequencing for all thirteen Processes

The catalogue's exact base instructions live in <issue id="ccef9cfd-4218-46b3-99f4-2176ab79130c" href="https://linear.app/flamehorn-games/issue/FLAME-140/design-node-pin-and-process-specification">FLAME-140</issue>. Runtime adds only disclosed stage/output framing. It must not silently replace Mirror, Reinterpret or local Custom instructions with its own longer behavioural prompt.

| Process | Required calls in a normal successful run | Destination mapping |
| -- | -- | -- |
| Respond | One text-generation call | output 1 |
| Continue | One text-generation call | output 1 |
| Narrow | One text-generation call | output 1 |
| Expand | One text-generation call | output 1 |
| Mirror | One text-generation call | output 1 |
| Challenge | One text-generation call; no mandatory critique/repair loop | output 1 |
| Reinterpret | One text-generation call | output 1 |
| History | One text-generation call; no implicit web research | output 1 |
| Merge | One call with explicit A/B and their compiled histories | output 1 |
| Compare | One call with explicit A/B and their compiled histories | output 1 |
| Fork | One plan call, then two sequential development calls | fixed slots 1–2 |
| Explode | One plan call, then eight sequential development calls | fixed slots 1–8 |
| Three Experts | Three sequential calls, one for each declared role | mechanistic; cognitive-science flavored; skeptical |

Persona/Format transforms in a master template remain instructions within a call. They do not independently multiply the call count. The same effective selections apply to every output.

### Fork and Explode: plan once, then develop

Choose a small structured planning stage so directions are allocated together and each output gets its own generation budget. One Run performs the entire sequence.

The plan request contains the full frozen compiler manifest and effective assembled instructions, plus visible runtime framing that asks for output allocation rather than finished prose at this stage. For the built-in instructions this yields two/eight distinct directions. Development receives the same full manifest, the complete accepted plan, and the assigned slot, then returns only that slot's finished text. It does not receive previously developed sibling text and does not treat another slot as a new user turn.

This costs three/nine model requests and repeats the input context across calls. Show that count before Run; do not promise lower cost than one large response. The benefit proposed is explicit, independently recoverable output boundaries.

Logical plan shape:

```json
{
  "slots": [
    {"slot": 1, "brief": "Explore the idea through one allocated direction"},
    {"slot": 2, "brief": "Explore a different allocated direction"}
  ]
}
```

For Explode, require exactly slots 1–8. Reject duplicate/unknown/missing IDs, extra fields, non-string or blank briefs, and oversized planner output. Limit each brief to 2,000 characters and the entire decoded plan to 32 KiB. Briefs are inspectable coordination data, not private reasoning or new Context nodes.

Use schema-constrained output only when the route/model supports it. Otherwise request this exact JSON shape and validate strictly. The text fallback accepts a JSON object with surrounding whitespace only; it does not guess labels, split prose by headings, repair broken JSON heuristically, or turn a function call into a result. There is no automatic paid model repair. Malformed planning stops before any development calls.

Development and all single-output calls return plain text; Format applies to that text, not the planner envelope. A normal terminal response must contain non-whitespace text. Emoji and Haiku are valid. No semantic classifier certifies whether an exploration is sufficiently developed or distinct; the user judges that.

### Three Experts and Custom omissions

Three Experts uses fixed slot identities. Each call sees full frozen context and the effective current instructions, plus a slot selector. There is no fourth synthesis.

Custom master templates may omit Process, Persona or Format as specified in <issue id="a08b5a6d-dbc3-431d-a6fe-cc5bfaf7f00d" href="https://linear.app/flamehorn-games/issue/FLAME-141/design-context-compilation-and-instruction-assembly">FLAME-141</issue>. Runtime must not smuggle an omitted component back through stage framing. Slot count/IDs, mapping and stage boundaries still apply; behavioural wording such as expert interpretation or thematic exploration is not reinserted when its Process component is omitted. The inspector lists unused components and explains that arbitrary Custom text may no longer express the named catalogue behaviour.

## 6. Output writes and partial success

A completed output commits in one transaction: retained generated text, resulting Context version, run/slot relationship, destination selection, and commit event marker. A uniqueness rule on run ID plus slot ID prevents duplicate commitment, including double append.

Replace changes only destination text. Append is exactly existing selected text plus generated text, without an invented separator, model merge, trim or rewrite. If a separator is wanted, it belongs in the text. Destination attachments and their order are preserved in either mode. Generated image/file outputs are not part of this MVP.

The destination's captured selected material is the write base, even when an older version was selected. Preserve that base as a retained version if it was an editable draft; no unrecorded user text is discarded by Replace. This is a run-related write boundary. After successful commit, select the new resulting version. Switching history later does not change the Process configuration.

Commit complete outputs independently, in slot order. If Explode saves slots 1–3 and slot 4 fails, keep 1–3; leave prior material or emptiness in 4–8. Stop scheduling further calls. This conservative policy avoids spending after an error; the remaining slots are “not attempted,” not falsely “failed.”

Partial streamed text is never an ordinary Context version. It may remain as a clearly labelled bounded recovery preview under <issue id="95847f80-7888-4691-bf7a-26e732fc9d08" href="https://linear.app/flamehorn-games/issue/FLAME-143/design-data-model-persistence-and-assets">FLAME-143</issue>'s policy. Copying it manually into editable material is a user action and does not mark the slot complete.

### Retry and recover

* **Run again** creates a new run against current graph, material, settings and selected provider. All outputs are targeted again.
* **Retry unfinished outputs** is an explicit action creating a linked recovery run, not reopening a terminal run. It uses the original frozen inputs/settings/provider/model, accepted plan and original bases for unfinished destinations, and targets only uncommitted slots.
* Recovery requires those inputs/representations to remain available and unfinished destinations/bindings/bases to be unchanged. Otherwise disable this action and explain the conflict; ordinary Run remains available after correction.
* Successful original slots are referenced as carried-forward results. They are not rewritten or appended again. If planning failed, recovery repeats planning and all unfulfilled slots. No opaque provider session is resumed.
* The recovery run is independently bounded and linked to its predecessor; inspection presents the original attempt and recovery separately. The original outcome never changes retrospectively.
* A complete result retained after a storage error may offer **Save recovered result**, which performs only the validated commit after matching the base/binding. It makes no inference call. If a result was not durably staged before a crash, do not claim it can be recovered.

## 7. Failure and usage limits

Proposed first-release defaults: one active network inference call; no automatic inference retries; connect timeout 30 seconds; no-event timeout 5 minutes; maximum 15 minutes per call and 60 minutes per Run action. Transport heartbeats count as activity; a local timeout records that the provider may still have consumed allowance. These are application ceilings, not promises about provider response time.

Normal maxima are 1 call for a single-output Process, 3 for Fork or Three Experts, and 9 for Explode. Recovery permits only the calls needed by its recorded plan and missing slots. One credential-refresh attempt may precede a call without adding an inference retry. No polling or repeated auth loop is allowed.

Apply provider-supported output limits when available, otherwise disclose that a hard token/spend cap cannot be enforced by that route. Local time, byte and call ceilings still apply. Proposal: stop a response at 4 MiB decoded output, retain no completed result from that truncated call, and report the limit. Do not advertise the ceiling as a cost cap. Record usage only when returned; unavailable usage is unknown, never zero.

| Failure | User-visible result | Retention and next action |
| -- | -- | -- |
| Missing input, invalid pins, known oversize or unsupported representation | Blocked before send | Correct input/configuration; no hidden upstream run or conversion |
| Authentication/consent unavailable | Sign-in required or permission unavailable | Keep workspace and run snapshot; explicitly authenticate, then recover/rerun |
| Allowance, quota or policy rejection | Specific limit/restriction, including mid-stream failure | No automatic retry or paid/provider fallback; retain committed slots |
| Rate limit, temporary server or network error | Failed/Partial with request ID if available | Manual bounded recovery; show Retry-After if supplied, no invented reset time |
| Malformed plan, empty output, explicit provider refusal or incomplete response | Stage/slot-specific failure | No version for that stage; preserve earlier complete slots; distinguish refusal from transport failure |
| Stream ends without valid terminal completion | Incomplete, even if prose looks finished | Retain bounded preview only; no success from EOF |
| Stop | Cancelled with committed count | Abort active call, schedule nothing more, preserve completed versions |
| Timeout | Failed/Partial with timeout reason | Treat in-flight result as incomplete; no automatic resend |
| Disk/full, write conflict or missing destination | Saving failed | Preserve staged complete result where possible; retry local save only after resolution |
| App crash/restart | Interrupted unless commit journal proves completion | Load saved material, reconcile committed slots, never automatically send |
| Unexpected model-requested tool call | Unsupported tool request | Do not execute or fabricate a tool result; fail the call clearly |

The durable cancellation flag and output commit use serialised transactions: if cancellation is recorded first, later output cannot commit; if a commit wins first, that complete version remains. Late deltas after termination are ignored.

## 8. Explicit tool and reasoning boundary

**Recommendation T1: approve a no-model-tools MVP.** The thirteen transformations can operate on supplied material without shell access, search, MCP, filesystem tools or GitHub/Linear writes. “History” does not claim current research. This removes effectful retry/approval machinery from the first release while retaining the proposed exploration experience.

The model-visible tool registry is empty. Adapters omit tool declarations; they use a supported no-tools setting only where appropriate. There is no approval queue or hidden stub. A returned tool call is a capability/protocol error.

Application-owned contracts remain explicit:

| Operation | Input / result | Authority and failure |
| -- | -- | -- |
| Import asset | User-selected bytes → immutable asset ID | File chooser/drop; type/size checks; no remote upload on import |
| Prepare representation | Asset ID + chosen mode → representation ID and limitations | Local parser; bounded resource use; errors block affected runs |
| Commit output | Run/slot/base + complete text → version ID | Data transaction and destination lease; never arbitrary file writing |

Adding model-requested tools later requires separately approved schemas, executor permissions, effect classification, confirmation UX, call/time budgets, idempotency and continuation contracts. Registration alone will not authorise effects.

Reasoning effort is sent only when the chosen route/model supports the selected value. Unsupported non-default settings block with an explanation. Available provider summaries belong in inspection; raw private reasoning is neither promised nor requested as a canvas contribution.

Each MVP planner/development call is a fresh complete request. A completed plan is explicit application data; later calls do not depend on its encrypted reasoning or provider response ID. Thus independent calls remain valid after stateless transport.

If a future approved adapter sequence needs opaque continuation items, preserve all provider-required items, order and IDs within that same valid sequence. Never splice them across accounts, models, changed context or providers. Current provider-specific constraints and supporting references are owned by <issue id="d1f8f8e2-212c-48f1-bad7-c607f7830e6f" href="https://linear.app/flamehorn-games/issue/FLAME-144/design-application-architecture-and-provider-integration">FLAME-144</issue>. Opaque data is not a portable context history.

## 9. Worked traces

### R1 — Ordinary success and rerun

C1 draft “Which opening hours should we try?” feeds Respond; its output is unbound. Run A freezes C1 as v1, creates C2 with Assistant role, compiles, receives normal completion, and commits C2 v1. The run ends.

The user changes Persona and runs again. Run B freezes the new settings and uses the still-selected C1 v1. It reuses C2 and commits v2. C2 v1 and Run A remain inspectable; no downstream Process runs.

### R2 — Feedback and Append

C4 v2 contains “2” and is both input and destination. The edited unary instruction adds two. Run C freezes v2 before sending, receives illustrative “4,” and replaces text in v3. Another explicit Run can read v3. No self-trigger occurs.

In a separate Append example, captured base is “A\\n” and generated text is “B.” The committed version is “A\\nB.” Replaying the commit event cannot produce “A\\nBB.”

### R3 — Explode success

Three destinations already exist. Valid admission creates five more. The planner returns slots 1–8; each development call receives the same frozen image/history and accepted plan. Eight complete responses become eight retained versions, all attached to one run. Progress finishes 8/8 after nine inference calls.

### R4 — Explode partial and recovery

Slots 1–3 commit. Slot 4 loses its stream; slots 5–8 are not attempted. The run is Partial, 3/8 saved. Recovery, explicitly chosen with unchanged bases, uses the retained plan and inputs and calls only 4–8. Original slots 1–3 receive no new versions. If slot 6 was edited meanwhile, recovery is blocked rather than overwriting it.

### R5 — Stop, crash and late completion

Stop during slot 2 records cancellation, aborts the call and keeps slot 1. Slot 2's preview is not a Context version. A late terminal event cannot commit after cancellation. If the app instead crashes after slot 1's transaction, restart displays that version and an Interrupted run; it does not resend slot 2.

### R6 — Source edits and storage failure

While Respond reads C1 v1, the user edits C1 into an editable v2. The response still records v1. If disk storage fails after a complete response, C2 keeps its old selected material; the inspector offers local recovery only if a complete staged result exists. Editing C1 never changes the historical request.

## 10. Acceptance scenarios and review decisions

These are written fixtures for later implementation, not executed tests.

| ID | Scenario / required evidence |
| -- | -- |
| RT01 | Run with missing output creates it only after valid preflight; missing source blocks without inference |
| RT02 | All thirteen catalogue entries use the declared slot mapping and stop at their own outputs |
| RT03 | Double-click Run creates one run; Run in another Workspace while busy is not queued |
| RT04 | Freeze mixed User/Assistant inputs; later role/version edits do not change recorded requests |
| RT05 | Fork/Explode plan validates exact IDs; malformed JSON cannot populate destinations |
| RT06 | Custom omitted components remain omitted in every internal call |
| RT07 | Complete output commits once; repeated event/commit delivery cannot double Append |
| RT08 | Partial multi-output results remain available; untouched destinations keep prior material |
| RT09 | Manual recovery targets only missing slots and refuses changed bases or missing history |
| RT10 | EOF, incomplete, refusal, quota failure and timeout never become completed versions |
| RT11 | Stop versus commit has a deterministic transaction outcome; crash recovery sends nothing |
| RT12 | No tool is exposed or executed; preparation errors are distinct from model-tool events |
| RT13 | Inspection can reconstruct each stage's material/instructions without copying full transcripts per output |
| RT14 | Usage/capability uncertainty is visible; provider/model changes require a new explicit run |

**Recommended decisions for review**

* **R-A:** One active Process across all Workspaces, with sequential internal calls and no queue.
* **R-B:** Plan-then-develop Fork/Explode; three fixed calls for Three Experts; no automatic inference retry.
* **R-C:** Commit complete slots independently; offer explicit recovery for unfinished outputs.
* **R-D:** Lock active Process/destinations, allow source edits against the next run, and select new committed versions.
* **R-E:** Approve T1's no-model-tools first release and the bounded defaults above.

Approval should accept or amend those recommendations, reconcile <issue id="bc7e6bfc-d83e-400c-8356-2e78621aa5d7" href="https://linear.app/flamehorn-games/issue/FLAME-139/design-desktop-interaction-specification-and-approved-ui-reference">FLAME-139</issue>'s visible states and controls, and match the Data/Provider revision set before <issue id="1ceec787-1ac1-404b-9142-3f7d2d6a6ad5" href="https://linear.app/flamehorn-games/issue/FLAME-145/design-mvp-implementation-brief-and-agent-handoff-documentation">FLAME-145</issue> handoff. Scheduled operations, autonomous graph construction, agent frameworks, external writes and benchmarking remain deferred.
