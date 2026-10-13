# MVP Implementation Brief and Handoff

**Revision:** 0.1 — ready for final handoff review

**Date:** 13 October 2026 (Australia/Sydney)

**Tracking:** [FLAME-145](https://linear.app/flamehorn-games/issue/FLAME-145/design-mvp-implementation-brief-and-agent-handoff-documentation)

**Repository:** `D:\dev\flamehorn-desktop`, local Git repository on `main`. No remote repository is assumed.

**Status:** The user accepted all six draft-design recommendations and requested their completion. This packet records that approved baseline; this new final launch prompt awaits review. Approval of the packet closes preparation only. Implementation requires a later explicit go-ahead.

## 1. Product goal and launch target

Build a local, open-source, GUI-first playground for exploring conversational material: write or import material, connect it to a Process, inspect the complete request, explicitly Run, inspect/version the resulting Contexts, branch and extract useful historical work.

The approved first release is a packaged **Windows 11 x64 desktop application**, with Electron, Svelte 5, Svelte Flow and TypeScript; SQLite and managed asset files; protected local credentials. One local user, one active library and one active Process run across the application. It launches as an installed/unpacked desktop application without requiring Node, Python, Docker or a database server for end users. It is not the mockup website, a browser-only prototype or an agent framework.

Primary generation path: Continue with ChatGPT through the documented official open-source flow. Second required path: configurable OpenAI-compatible Responses/Chat Completions endpoints, including a local no-key endpoint. Live eligibility/capabilities are verification gates, not scope substitutes.

This repository currently contains documentation and static reference artwork only. It has no application entry point, dependency lockfile, executable or tested build command. The implementation agent must create and document the actual source run/build/package commands and exact packaged executable location. Do not pretend these exist before implementation.

## 2. Pinned reading order and source precedence

Read this brief, then [the documentation index](README.md), the six owning specs below, and [the visual qualification register](design/mockups/README.md). Open full-size panels; do not rely on a thumbnail or the website alone. [baseline-manifest.json](baseline-manifest.json) pins local file hashes.

| Order | Canonical file | Approved revision | Owning issue |
| --- | --- | --- | --- |
| 1 | [Desktop interaction](design/desktop-interaction.md) | 0.2, reconciliation edition | FLAME-139 |
| 2 | [Nodes, pins and Processes](design/nodes-pins-processes.md) | 0.4, approval edition of 0.3 | FLAME-140 |
| 3 | [Context compilation](design/context-compilation.md) | 0.2, approval edition of 0.1 | FLAME-141 |
| 4 | [Process runtime](design/process-runtime.md) | 0.2, approval edition of 0.1 | FLAME-142 |
| 5 | [Persistence and assets](design/persistence-assets.md) | 0.2, approval edition of 0.1 | FLAME-143 |
| 6 | [Application and providers](design/application-providers.md) | 0.2, approval edition of 0.1 | FLAME-144 |
| 7 | [Mockup register and full-size assets](design/mockups/README.md) | Pack 1.0; original art 0.6 / Sites v8 | FLAME-139 / FLAME-145 |

Precedence is by explicit ownership and recorded reconciliation, not timestamp or issue number:

1. The approved repository specifications and qualified artwork in this pinned set are the build baseline. Node owns semantics/counts, Compiler request composition, Runtime execution, Data retention/extraction, Providers connection contracts and Desktop interaction/visual presentation.
2. The mockup register explicitly supersedes obsolete labels, pins, counts and controls in the original artwork. Use approved visual qualities together with current behavior.
3. This brief selects scope and execution discipline and points to owning rules. It does not maintain competing copies of the full catalogues/templates/schemas.
4. Linear records approval, review and status. Full Linear specification mirrors identify matching approval revisions. Historical issue remits and discussion are not additional features when the approved scope expressly defers them.
5. Superseded Desktop/overview/DSVL material and older atlas archives are historical context only. Do not import them as requirements.
6. If two current owning rules actually conflict, stop the dependent work, state the exact conflicting sections and request a decision. Continue independent work. Do not choose whichever example is easiest.

The “proposed/recommended/draft” wording retained in five approval editions describes their reviewed rationale. Their top approval record accepts all recommendations, defaults and exclusions; it does not claim any live checks passed.

## 3. Explicit MVP boundary

| Area | Required in this attempt | Explicitly deferred / excluded | Owner |
| --- | --- | --- | --- |
| Application | Packaged Windows 11 x64 local app; offline reading/editing/import; manual updates | Hosted app, macOS/Linux/ARM/mobile support, auto-update/signing purchase | Providers §§1–3,9 |
| Workspace surface | Workspace navigation, multiple origins/islands, creation controls, right inspector, freeform/conversation layouts | OS replica, floating/nested window system, folders/groups/collapsed Workspaces | Desktop §§1–2,7; Data §1 |
| Reading | Semantic zoom with one camera transform and approximately screen-constant readable text; full inspector | Automatic generated preview summaries | Desktop §7; A3 |
| Material | One generic Context; User/Assistant role toggle; explicit Reference nodes; direct material chains | Special critique/planner/tool Context categories | Node §§3–5 |
| Graph | One connection per input, A/B on Merge/Compare, distinct output destinations, valid cycles and deliberate A=B | Process-to-Process routing, cross-Workspace live edges | Node §5; Compiler §3 |
| Catalogue | All thirteen accepted Processes with exact fixed slot contracts | Cross/Refract/Analyse/Looping and speculative additions | Node §7 |
| Counts | Fork 2, Explode 8, Three Experts 3; automatic missing destinations at valid Run | Four-output Explode, count changes inferred from Custom text | Node §§6–7 |
| Modifiers | Approved Persona catalogue; None/Long/Short/Haiku/Bullet Point/Emoji Format; local Custom text; following creation defaults | Context modifiers, reusable custom-persona UI, node/settings copy, saved profiles | Node §§8–9 |
| Templates | Two built-in styles × four independent component combinations; local editable Custom; visible intentional omission | Hidden reinsertion of omitted components, global policy framework | Compiler §4 |
| Context | Deterministic finite full live history; same-Workspace Force include; A/B/shared framing and deduplication | Exclusion controls, alternative history policies, provenance resurrecting cuts, implicit input from geometry | Compiler §§2–3 |
| Execution | Explicit one-Process Run; sequential bounded calls; freeze inputs; per-slot commits; Stop; manual recovery | Hidden queue, automatic downstream runs/retry/provider fallback | Runtime §§3–7 |
| Multi-output | Fork/Explode plan then develop each slot; Three Experts fixed three calls; all results ordinary Context | Extra user Run to develop branches; planner nodes; fourth expert synthesis | Runtime §5 |
| Writes/history | Literal Replace/Append text, retained bases/attachments; run-related versions; one mutable draft; actual historical role/settings | Per-keystroke versions, model merge for Append, output selected text silently added to input | Node §6; Data §§3–4 |
| Files | Copy-in UTF-8 txt/md, PNG/JPEG and PDF; exact retained bytes/representations; visible PDF text-only choice | OCR, Office conversion, audio/video, URL/cloud imports, generated image/file outputs, watched file links | Data §5; Providers §6 |
| Storage | SQLite + managed assets; visible autosave failures; Undo/Trash/reference-aware purge; whole-library export/import/backups/migrations | Cloud sync/collaboration, workspace-only portable export, cross-library merge, targeted history destruction | Data §§6–9 |
| Extraction | New Workspace from Here using recorded contributing versions/roles/settings, missing-record report, provenance islands, no inference | Whole-desktop rewind, current-graph masquerading as old history, automatic unused siblings | Data §8 |
| Providers | Both ChatGPT-auth and configurable compatible profiles; explicit model and capability selection; protected secrets | API-only substitute, mock sign-in presented as real, automatic billing/local-to-remote fallback | Providers §§4–8 |
| Tools/reasoning | Empty model tool registry; provider-returned summaries/usage when available; capability-specific settings | Shell/search/MCP/connector tools, raw private reasoning, agent frameworks | Runtime §8 |
| Future work | Clearly labelled future notes only | Operation Workspaces, schedules, autonomous graphs, reasoning benchmark, conversation/memory import | All owning specs |

Accepted numeric defaults (runtime time/call/byte limits; import/preparation caps; save debounce, undo and backup retention) remain as specified in Runtime and Data. Do not quietly relax them while preserving the labels.

## 4. Visual style and panel use

Open [the offline visual index](design/mockups/index.html). The original [Flamehorn Desktop site](https://flamehorn-desktop-design-review.tpilepich.chatgpt.site) is the provenance source; local originals make access independent of a private site session.

- A1: overall compact workbench, card hierarchy, right inspector and navigation. Omit deferred groups/folders/collapse.
- A3: semantic zoom. Same graph/camera center, world geometry transformed consistently, text approximately constant in screen pixels.
- B1/B3/B4/B6: create, wire, pending and direct continuation. Generic Context role labels apply.
- B2: superseded missing-output restriction. Run auto-creates missing destinations after validation.
- B5/B7: running/failure appearance; Runtime now defines streaming, Stop, partial results and recovery.
- C1–C4 and W2: compact everyday controls, inspector-only instruction editing, full content, versions and historical/current separation. Use current Persona/Format catalogue.
- D1: multi-output layout style, but eight Explode outputs and no groups/collapse.
- D2/D3: extraction entry and independent historical branch, qualified by Data §8.
- W3: distinct A/B Merge inputs. W4: explicit Reference nodes, corrected Force include scope and pin rules.

Preserve square Context/Reference cards, rounded rectangular Processes, colored square pins, restrained borders and charcoal/light palette references. Gallery controls, Draft badges and annotations are not app UI. The register, not image text, states which interactions are approved or superseded.

## 5. Dependency-based implementation plan

These are usable paths, not six isolated services or an issue-number waterfall.

1. **Foundation and offline round trip.** Establish the Electron/Svelte/TypeScript app boundary, validated preload commands, SQLite/assets and library lock. Implement Workspace creation/navigation, editable Context/Reference/Process graph, draft saves and reopen. Preserve semantics before adding inference.
2. **Compile and inspect.** Implement catalogues, roles, pins, current selections, finite traversal and Force include; instruction templates and capability/size findings; preview/history distinctions. Use the owning fixtures to verify exact material order and omission.
3. **One complete run path.** Implement admission/snapshot/lease, provider adapter event contract, durable single-output commit, versions, Stop, failure and restart. Use controllable adapters for deterministic failure evidence; separately wire both real provider pathways. Do not leave one as a permanent stub.
4. **Full Process catalogue and recovery.** Build plan/develop Fork/Explode, Three Experts, exact output identity, partial commit/recovery, feedback and literal Append. Preserve source edits versus locked destinations.
5. **Complete material/history paths.** Finish image/PDF representation choices, role/capability checks, safe import/export/backups, historical extraction and missing records. These are MVP requirements, not optional polish.
6. **Visual and launch readiness.** Compare the complete paths with qualified panels, including semantic zoom and compact inspectors; build/package Windows x64; run clean launch, native SQLite, save/reopen and representative live provider checks when explicitly authorised.

Develop across these paths as dependencies permit. Keep compiler, runtime, storage and provider boundaries understandable inside one application; do not introduce separately deployed services or speculative plug-in frameworks. Choose compatible exact dependency pins and commit a lockfile; reviewed library families are not proof of a compatible packaged build.

## 6. Discipline, discretion and blockers

Allowed small choices: internal module names, schemas implementing the logical contracts, exact dependency versions after compatibility checks, test framework, component boundaries, ordinary error wording, layout collision avoidance, keyboard shortcuts, font fallback and precise semantic-zoom thresholds. Record material choices and verify their effects.

Product changes requiring a user decision include removing an in-scope path, changing fixed counts/role/version/context semantics, dropping extraction/semantic zoom/References, replacing a provider pathway, changing accepted security/storage/retention policy, adding automatic execution, making private material remote by default, adding tools, or expanding platforms/billing.

When blocked:

- Give the exact failing condition, affected requirement, evidence and smallest decision/action needed. Mark it blocked/not tested; continue independent implementation.
- Do not read another app's credentials, invent account capability, ask the user to paste secrets into a ticket, silently buy capacity, or treat a local demo as proof of ChatGPT access.
- Implement auth/account/adapter behavior and controlled tests before requesting an interactive account step. Live sign-in, inference and billing remain subject to the later explicit authorisation; this design task grants none.
- Check official provider documentation during implementation for changes. The specs retain dated 12–13 October evidence. A changed contract is a reported compatibility blocker, not permission to ship an API-only replacement.
- A mock response proves the code exercised by that test. It cannot prove consent, refresh, account model access, remote execution or file support.
- Do not treat successful parsing or eight generated outputs as proof of accuracy, useful diversity or superior reasoning.

## 7. Acceptance and evidence matrix

The owning fixtures define exact behavior. Do not duplicate or weaken them in a new test-only interpretation.

| Journey | Owning scenarios | Evidence that counts |
| --- | --- | --- |
| Create / wire / automatic destinations / roles | UI01–UI03; N01–N02,N18–N20,N25–N27; RT01–RT04 | UI trace/screenshots and assertion of admission/snapshot/no premature calls |
| All catalogue contracts | Node §7; N11–N12; RT02,RT05–RT06 | Slot/call-count tests and complete 1/2/3/8-output paths; malformed planner cases |
| Current history, cuts, force and Reference inclusion | N03–N07,N13,N17; F1,F3–F4,F7 | Exact ordered manifest/roles/bindings; file bytes/representation identity; no duplicate or hidden ancestry |
| Selected older versions and reruns | N16,N21–N23,N26; F2; DA01–DA04 | Retained input/output comparison before and after edits/reopen; current versus historical settings |
| Feedback and Append | N08–N10; F5; RT07; DA04,DA09 | Finite frozen request, literal text concatenation, duplicate commit safety |
| Templates and defaults | N14–N15,N23–N24; F6; RT06; UI11 | Both styles/all four combinations; local Custom omissions and named-default behavior |
| Partial results / stop / failure / recovery | RT08–RT11,RT14; DA08–DA09; UI08 | Controlled EOF/refusal/timeout/save-conflict/Stop races, durable slot counts and no resend after restart |
| Offline save / reopen / backup / import | DA06–DA10,DA13–DA16; AP01,AP11–AP12 | Fresh-library round trip, asset hashes, injected failure/migration cases and secret-free archive inspection |
| Historical extraction | DA11–DA12; UI09 | Old versions/roles/settings, incompatible occurrence duplication, cut provenance islands, omitted siblings, unchanged source/no inference |
| Visual and semantic zoom | UI04–UI05,UI10; A1,A3,C,W panels | Same scene at two zooms, geometry/manifest invariance and readable screenshots at native reference sizes |
| ChatGPT authentication and inference | AP02–AP05,AP12,AP14 | Real authorised registration/consent/model discovery/completed response; refresh/restart/sign-out evidence separately identified |
| Compatible local endpoint and both encodings | AP06–AP10,AP13–AP14 | Named endpoint/server/model/version, actual completed request, role preservation, overflow and capability evidence |
| Images/PDFs and unsupported cases | F7; DA06–DA07; AP09 | Named route/model/role and exact representation fixture; clear block without silent conversion |
| Packaged target | Providers §9; AP01 | Clean Windows x64 launch of packaged artifact; native SQLite loads; offline material survives relaunch |

Every result records scenario ID, date, application commit, environment, input fixture, observed outcome and evidence path. Use Passed / Failed / Blocked / Not tested. For provider tests record route/model/server and relevant capability source; redact secrets and private content. Missing usage is unknown, not zero.

Suggested implementation evidence home: `docs/verification/`, with an evidence ledger, screenshots and reproducible fixture descriptions. Do not put credentials in source, logs, exports or reports. Deterministic tests need not assert the exact wording or factual quality of real model output.

## 8. Required implementation deliverables

- Source implementing the complete approved boundary, a dependency lockfile and third-party notices/licence record.
- A source README with verified prerequisites and exact install, development, build, test and package commands; an actual packaged Windows x64 executable with its launch location.
- User instructions for first launch, provider setup, local-server prerequisite, storage directory, backup/restore and credential disconnect/reconnect.
- Tests and results traced to the matrix, including failures/recovery and what mocks actually exercised.
- Visual comparison evidence against the qualified panels, especially A3, versions/history, References and multi-output progress.
- An implementation status table for every scope row, with remaining defects, blocked live checks and known limitations. Do not label the whole MVP complete while a required path is missing or unverified.
- Git commit/reference identifying the delivered source and instructions to reproduce the artifact.

A signed public release, purchased signing identity or remote deployment is not authorised by this packet. An unsigned internal review build must be labelled honestly.

## 9. Exact candidate launch prompt

**Review this text now; do not execute it until the user later explicitly authorises the MVP build.** When approval is recorded, pin this packet by its repository commit and manifest. No later implementation ticket currently exists in the project; add its actual link when created rather than inventing one.

```text
Implement the Flamehorn Desktop MVP in D:\dev\flamehorn-desktop.

Begin at docs/agent-brief-mvp.md and docs/README.md. Read all six owning
specifications and docs/design/mockups/README.md, inspect the full-size
reference panels, and verify docs/baseline-manifest.json before making
application changes. Use the approved revision set identified there.
If the packet differs from the user's approved baseline, report the difference.

Build the complete scope matrix in the brief as a packaged Windows 11 x64
Electron/Svelte/Svelte Flow/TypeScript application with SQLite and managed
assets. Preserve one generic Context with User/Assistant roles, explicit
Reference and Process nodes, the thirteen-Process catalogue and fixed
1/2/3/8 slot contracts, current-graph context compilation, manual bounded
execution, run-related versions, save/reopen, historical extraction and both
required provider pathways. Follow the original visual style only through
the qualification register; obsolete artwork labels/counts do not govern.

Follow the dependency-based implementation plan and preserve the compiler,
runtime, data and adapter boundaries inside one application. Small choices
are allowed only within the brief's discretion rules. Reconcile or report
conflicts; do not quietly remove requirements, add automatic execution,
substitute a different product, or claim future Operation Workspaces.

Implement and test the full usable paths. Use mocks for deterministic
contract/failure tests and label their limits. Before any live account,
inference or billing step, verify the user's explicit authorisation for that
step. If credentials/access are unavailable, finish independent work and
report the exact remaining gate without calling the path passed.

Deliver the source, lockfile, real setup/run/package instructions and
Windows artifact, traced tests/results, visual comparisons, current
implementation status and known limitations. Report actual evidence and
the delivered commit. Design approval is not evidence of a working app.
Do not claim completion while required behavior or release checks remain
failed, blocked or untested.
```

## 10. Design readiness and approval record

- [x] User accepted all recommendations in the six design drafts on 13 October 2026; FLAME-139–144 are complete as design issues.
- [x] User named `D:\dev\flamehorn-desktop` and requested creation of the repository.
- [x] Scope matrix preserves required semantic zoom, References, extraction and both providers; accepted exclusions are explicit.
- [x] Original atlas identified as artwork 0.6 / Sites v8 / commit c971a92599bbc2e823b11af0de8c5bcc16d3231c; qualified local reference set supplied.
- [x] Acceptance/evidence matrix references owning scenarios and distinguishes live from controlled checks.
- [x] [Reconciliation audit](design/reconciliation-audit.md) marks stale overview, Desktop and atlas claims; repository contains no old application/DSVL source to port.
- [ ] User approves this exact brief, reconciled panel register and final one-shot text. Until then FLAME-145 is In Review.
- [ ] Later explicit implementation go-ahead. This is a separate action after design preparation and is not granted by this document.

The packet's file/link/hash checks are documentation checks, not application tests. No account sign-in, model call, package build or executable prototype was performed under FLAME-145.
