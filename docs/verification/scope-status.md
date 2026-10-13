# MVP scope status

This table follows every row of the approved brief's scope matrix. “Implemented” describes source behavior, not final human acceptance. See the evidence ledger for controlled versus live checks.

| Area | Implementation status | Evidence / remaining limits |
| --- | --- | --- |
| Application | Implemented Windows 11 x64 unpacked desktop; local offline library; manual replacement of builds | Real packaged launch, native SQLite/PDF and reopen tested locally. Unsigned; pristine-machine acceptance pending |
| Workspace surface | Implemented navigation, multiple islands, create/wire/drag, right inspector and conversation arrangement | Desktop pointer checks and screenshots. Very large graphs/performance are not benchmarked |
| Reading | Implemented one-transform semantic zoom, stable screen text and full inspector | Same-scene geometry/font/manifest assertions at 100% and 70%; secondary controls collapse at lower zoom |
| Material | Implemented generic Context, explicit User/Assistant role, References, direct chains | Compiler and desktop checks; original byte and representation identity retained |
| Graph | Implemented one input binding, Merge/Compare A/B, distinct outputs, valid cycles and A=B | Exact ordered manifest/pin checks; no cross-workspace or Process-to-Process live edges |
| Catalogue | Implemented all thirteen approved Processes | Individual fixed-slot/call tests for every Process; generated quality not assessed |
| Counts | Implemented 2/8/3 Fork/Explode/Three Experts, valid-admission auto destinations | Exact tests and eight-output desktop recovery scene |
| Modifiers | Implemented approved named catalogues/defaults and local Custom edits | Compiler preset tests and compact card/inspector controls |
| Templates | Implemented exact two styles × four component combinations and local Custom | Literal seeded spec templates; all combinations/omissions tested, no recursive substitution |
| Context | Implemented finite full live history, Force own material, A/B/shared deduplication | F1–F6 exact manifests; unknown capability and size findings surfaced |
| Execution | Implemented manual bounded single active Process, frozen inputs, per-slot commit, Stop/recovery | Deadline/error/stop/save-failure fixtures, no hidden retry or downstream execution |
| Multi-output | Implemented validated plan/develop Fork/Explode and fixed three-expert calls | Malformed plans block development; no extra synthesis; actual partial recovery UI |
| Writes/history | Implemented Replace/literal Append, retained bases/files, one draft, actual run history | Native SQLite, duplicate commit, selected older version and restart checks |
| Files | Implemented managed UTF-8 txt/md, PNG/JPEG/PDF, preview and explicit PDF text representation | Parser/preview/corruption/limits tested; live multimodal inference remains unverified |
| Storage | Implemented SQLite/assets, save acknowledgements, Undo/Trash/purge, whole-library archives and daily backups | Corruption/ref-integrity/rollback/round-trip fixtures. Schema 1 is first release; unsupported schemas refuse instead of guessing a migration |
| Extraction | Implemented recorded contributors, roles/settings, independent occurrences, provenance islands and missing-record report | Historical/feedback/draft fixtures; selected multi-output slot copied without siblings or inference |
| Providers | Implemented ChatGPT authentication and compatible Responses/Chat Completions, per-model profiles, protected storage | Live text and protected-session restart passed; live expiry/revocation/files and local overflow policy remain unverified |
| Tools/reasoning | Implemented empty tool capability, recorded returned usage/summaries and profile-specific reasoning | Unsupported tool requests rejected. No raw private reasoning requested; absent usage shown unknown |
| Future work | Excluded as approved | No Operation Workspaces, schedules, autonomous graphs, reasoning benchmark, or conversation/memory import was introduced |

No required product path has been replaced by a permanent mock. Test fixtures are isolated test adapters and HTTP servers. This remains an implementation preview until the outstanding verification and exact-candidate human gate are satisfied.
