# Implementation record

Implementation was authorised in the MVP implementation chat on 13 October 2026 (Australia/Sydney): “I have reviewed the documentation and approve its implementation. You have permission to proceed.”

Approved starting development commit: `cd3776d`. All 62 entries in baseline manifest 1.1 matched SHA-256 before application changes. Synced project source files are read-only and are not used as an implementation checkout.

Work follows the repository development contract. Main remains at `96ef228` pending full MVP verification and explicit human approval of an exact tested candidate. Live sign-in/inference is a separate verification gate. No provider credential is read from another application.

The user selected **MIT** in the implementation chat. The repository licence and packaged third-party notices record this decision. Live verification was separately authorised: browser sign-in/model discovery and one non-private ChatGPT text response; the user supplied `http://127.0.0.1:1234` and `gemma4-12b-qat-uncensored-hauhaucs-balanced` for local verification. No inference authorisation is inferred from the design packet alone.

See the [evidence ledger](README.md), [scope status](scope-status.md) and [visual review](visual-review.md). These records distinguish controlled fixtures, live observations and remaining gates. No implementation tracking issue was created; FLAME-145 remains a design-handoff reference, not an invented implementation issue.

## Implementation paths

1. Offline graph, drafts, SQLite and managed files.
2. Deterministic compilation, templates and capability preview.
3. Bounded runtime, versions, partial failure and recovery.
4. Protected provider accounts and both encodings.
5. Historical extraction, library archives, backups and retention.
6. Desktop interaction, visual comparisons and Windows packaging.

## Concrete implementation choices

- One Electron main process owns protected credentials and narrow IPC. A worker owns SQLite, managed files, snapshots, the compiler and bounded inference. PDF preparation uses another bounded worker; the renderer has no Node access.
- SQLite schema 1 uses normalized identity tables with validated JSON payloads, foreign keys, WAL and synchronous FULL. A content hash fixes each retained text/attachment list. Whole-library snapshots sanitize provider credential references and discovery caches without changing the open library.
- All thirteen Processes share the same compiler, provider encoders and runtime. No tools, fallback model, provider queue or hidden automatic retries were added.
- Exact encoded byte ceilings and conservative UTF-8 text bounds supplement the visibly approximate token estimate. A profile with unknown limits reports uncertainty; silent-truncation profiles block Run.
- Semantic zoom preserves world dimensions and pin positions. Lower zoom omits secondary card controls while keeping the inspector available; it does not reflow graph geometry or change compilation.
- Dependencies are exact pins in the lockfile. The notices generator collects runtime and bundled renderer licences; Electron/Chromium notices remain beside the executable. The build is unsigned and has no installer/automatic updater.

The source code and README implement these choices. The approved specification files retain their original handoff wording and hashes; their historical “no application yet” statements are not the current implementation status.
