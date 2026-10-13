**Project:** Flamehorn Desktop
**Issue:** [FLAME-144 — Application Architecture and Provider Integration](<https://linear.app/flamehorn-games/issue/FLAME-144/design-application-architecture-and-provider-integration>)
**Revision:** 0.2 — approval edition of 0.1; accepted behaviour unchanged.
**Date / external documentation checked:** 13 October 2026, Australia/Sydney
**Status:** Approved by the user on 13 October 2026 (Australia/Sydney). All recommendations in the reviewed 0.1 draft are accepted. Design approval only; implementation and live checks have not been performed.
**After approval:** Publish the matching revision to `docs/design/application-providers.md`.

> **Approval record — 13 October 2026:** The user accepted all draft-design recommendations and requested completion of the design issues. References below to “draft”, “proposed”, “recommended”, “review” or future approval preserve the reviewed rationale and are superseded by this approval record. All stated recommendations, numeric defaults, scope exclusions and fixtures are the accepted baseline. Cross-document references to older revision numbers identify the reviewed source; the approval editions indexed by FLAME-145 preserve those rules. Repository publication and final one-shot handoff are tracked in FLAME-145. No application or live provider validation is claimed.



**Companion review drafts:** [FLAME-142 — Process Execution and Tool Runtime](<https://linear.app/flamehorn-games/document/process-execution-and-tool-runtime-6a2e7e536f52>) · [FLAME-143 — Data Model, Persistence and Assets](<https://linear.app/flamehorn-games/document/data-model-persistence-and-assets-fbd0c1d6490f>). Read these v0.1 drafts together; none is an approved implementation instruction.

## 1. Recommended first release

Build a local, open-source, packaged Windows desktop application using Electron, Svelte, Svelte Flow and TypeScript. Keep application state, context compilation, execution and storage on the user's machine. Call providers directly from the privileged local runtime.

The intended primary connection remains **Continue with ChatGPT**, using the documented open-source Sign in with ChatGPT flow. The second connection is a configurable OpenAI-compatible endpoint, including local servers with no key. Both are real implementation requirements; a successful local demo cannot stand in for the ChatGPT path.

The official documentation now establishes a direct OAuth-authorised Responses route for open-source/local applications. This is documentation-backed feasibility, not proof of access for this user's account, a completed registration, or a working Flamehorn integration. Account eligibility, permission and capabilities still need the later authorised verification below. The published scope does not grant ChatGPT conversation history or memory, and paid/remotely hosted distribution has a different participation path. [Official open-source overview](<https://developers.openai.com/siwc/token-sharing-open-source>).

### Why this arrangement

| Option | Assessment for this MVP |
| -- | -- |
| **Packaged Electron — recommended** | One launchable app with owned local storage, credential lifecycle and file import. Keeps compiler/runtime code in TypeScript alongside the Svelte UI. Costs more download/memory and requires careful renderer isolation and updates. |
| Browser plus local service | Viable, but introduces two launch/lifecycle surfaces, local HTTP access controls and browser-to-service credential boundaries. A useful later distribution option, not the proposed first one. |
| Tauri/native shell | Viable alternative with a smaller shell in principle, but adds a second implementation language/platform boundary. Reconsider if package size outweighs the proposed shared TypeScript stack. |
| Hosted web app | Adds server operations and remote storage/credential responsibilities beyond the local playground. Not proposed. |

**Supported target proposal:** Windows 11 x64, one local user and one active library per app instance. macOS, Linux, Windows ARM and mobile are not claimed supported by this first release. This is a scope recommendation based on a concrete initial target, not a conclusion inferred from the word Desktop.

The existing [Node specification v0.3](<https://linear.app/flamehorn-games/document/node-pin-and-process-specification-54fb3107d819>) and [Compiler draft v0.1](<https://linear.app/flamehorn-games/document/context-compilation-and-instruction-assembly-2eb0f3b948a0>) govern graph and request semantics. [Runtime](<https://linear.app/flamehorn-games/issue/FLAME-142/design-process-execution-and-tool-runtime>) and [Data](<https://linear.app/flamehorn-games/issue/FLAME-143/design-data-model-persistence-and-assets>) draft v0.1 provide the matching lifecycle and storage proposals. No diagram library becomes an agent orchestrator.

## 2. Components and communication boundary

```text
Packaged Svelte UI / Svelte Flow canvas
        | narrow validated commands + ordered status events
Electron preload boundary
        |
Local application controller
  |-- Workspace / history / library service --> SQLite + managed assets
  |-- Context compiler                     --> immutable request description
  |-- Process runtime                      --> bounded stages and slot commits
  |-- Provider adapters / account manager   --> selected provider only
  |-- credential service                   --> protected local secret records
  |-- bounded file preparation worker      --> retained representations

System browser <--> OpenAI sign-in <--> temporary 127.0.0.1 callback
```

These are responsibility boundaries inside one application, not independently deployed microservices.

| Boundary | Contract |
| -- | -- |
| Renderer → application | Validated commands such as save draft, connect pins, preview, run, stop, import, extract and export; IDs and revision checks |
| Application → renderer | Authoritative state and Runtime's ordered events; no bearer tokens or general filesystem handles |
| Compiler → runtime | Frozen manifest, exact effective instructions, output contract, capability/size findings |
| Runtime → adapter | Complete call specification and abort signal, selected connection/model, stage metadata |
| Adapter → runtime | Text deltas, summaries where available, usage, terminal outcome and normalised error |
| Runtime → data | Admit snapshot, stage complete result, commit slot, finish/recover run |
| Preparation worker | Explicit selected asset bytes and mode; bounded output/timeout, no provider credentials or arbitrary network access |

Keep SQLite work and expensive parsing off the UI thread. Model requests are asynchronous and must not block reading or moving the graph. A renderer reload reattaches to persisted run state, not a fresh execution.

There is no public local REST service in this arrangement. OAuth's temporary loopback callback is the sole listener, open only during an active sign-in attempt. Dev-server ports are development-only, not production launch dependencies.

## 3. Framework and dependency decisions

Recommended library families are concrete, while exact release pins belong to the implementation lockfile after compatibility verification. Do not select arbitrary “latest” packages independently or infer version compatibility from this table.

| Component | Proposed choice / reason | Primary licence evidence checked 13 October |
| -- | -- | -- |
| UI | Svelte 5 family; existing candidate suited to editable node components | [Svelte — MIT](<https://github.com/sveltejs/svelte/blob/main/LICENSE.md>) |
| Canvas | @xyflow/svelte; custom nodes/pins and graph interaction, with Flamehorn semantics outside the library | [Svelte Flow package — MIT](<https://github.com/xyflow/xyflow/blob/main/packages/svelte/package.json>) |
| Language | TypeScript across UI/compiler/runtime contracts | [TypeScript — Apache-2.0](<https://github.com/microsoft/TypeScript/blob/main/LICENSE.txt>) |
| Build | Vite for local UI assets; no production server requirement | [Vite — MIT](<https://github.com/vitejs/vite/blob/main/LICENSE>) |
| Desktop/package | Electron plus Electron Forge for a distributable build | [Electron — MIT](<https://github.com/electron/electron/blob/main/LICENSE>), [Forge — MIT](<https://github.com/electron/forge/blob/main/LICENSE>) |
| Storage | SQLite with better-sqlite3 in a controlled worker/service; transaction and backup support | [SQLite — public domain](<https://sqlite.org/copyright.html>), [better-sqlite3 — MIT](<https://github.com/WiseLibs/better-sqlite3/blob/master/LICENSE>) |
| PDF preparation | PDF.js for local rendering and text extraction | [PDF.js — Apache-2.0](<https://github.com/mozilla/pdf.js/blob/master/LICENSE>) |
| ID-token verification | jose for standards-based JWT/JWKS validation; OAuth lifecycle remains explicit application logic | [jose — MIT](<https://github.com/panva/jose/blob/main/LICENSE.md>) |

Svelte Flow's [custom-node documentation](<https://svelteflow.dev/learn/customization/custom-nodes>) supports custom node components; it does not establish Flamehorn's semantic zoom, circular layout, performance or interaction fidelity. Those remain implementation checks against <issue id="bc7e6bfc-d83e-400c-8356-2e78621aa5d7" href="https://linear.app/flamehorn-games/issue/FLAME-139/design-desktop-interaction-specification-and-approved-ui-reference">FLAME-139</issue>.

Maintain third-party licences/notices and inspect the actual locked dependency tree, including bundled Electron/Chromium and native binaries, before distribution. This is an initial direct-dependency review, not a completed transitive audit or a choice of Flamehorn's own licence. The later release must preserve the intended open-source eligibility.

Use a thin HTTP/SSE adapter, not an agent framework or Codex app-server, for the proposed core. This keeps the exact compiler manifest and stateless call boundaries under Flamehorn's control. The existence of supported shell/agent features in another harness does not add them to this MVP. No LangChain, graph executor, vector database or orchestration server is required.

## 4. Sign in with ChatGPT contract

### Registration and consent — documented, not exercised

Use the system browser. First registration uses `dynamic_agent_client`, Flamehorn Desktop's consistent name and a persistent opaque host ID. Later sign-ins use the issued account-bound client ID. Each attempt has fresh state, nonce and S256 PKCE; the callback is HTTP on 127.0.0.1, with its exact URI preserved through exchange.

Request identity scopes (openid, profile, email) plus `offline_access resource.invoke chatgpt.tokens.use.direct`. Validate returned state; exchange code at OpenAI's token endpoint using the issued client ID and verifier, without a client secret. Validate ID-token signature/JWKS, issuer, audience, expiry and nonce; verify returning identity before replacing credentials. Granted plan-use scope is required for inference.

The callback path stays stable across sign-ins; only an available port may change. Denial, incomplete registration and identity mismatch end the attempt without switching the active account. Follow the full parameter contract in [Registration and sign-in](<https://developers.openai.com/siwc/token-sharing-open-source/sign-in>).

**Flamehorn choice:** use `http://127.0.0.1:<available-port>/auth/callback` and a UUID-based host identifier persisted separately from library exports. Bind only to loopback, expire the attempt after ten minutes, consume the callback once and close the listener. No ChatGPT token is read from another application's files.

### Accounts, refresh and sign-out

Separate registrations by verified identity plus issued client ID, even when emails match. Keep one active selection and distinct saved connection labels. Refresh near expiry with the saved issued client ID, refresh token and API resource; serialise refresh for that session and atomically replace rotating credentials. Never combine one registration's client ID with another's tokens.

Sign-out stops that account's requests, attempts refresh-token revocation through the discovered endpoint, then clears its local access/refresh/ID tokens. Retain the registration mapping and host identity for later reauthorisation. If remote revocation cannot be confirmed, say so and link to account controls. Temporary network failures alone must not erase otherwise valid credentials. [Accounts and sessions](<https://developers.openai.com/siwc/token-sharing-open-source/profiles-and-sessions>).

**Flamehorn choice:** one refresh attempt before a send; no automatic inference replay after a failed request. A terminal invalid grant requires sign-in again. Switching saved connections changes the next run selection; it cannot swap the provider underneath an active run. Signing out an in-use connection first stops the run through Runtime's cancellation boundary.

### Model discovery and inference

Fetch the selected account's `GET https://api.openai.com/v1/models` with its bearer access token. This route returns `models`; preserve server ordering, display listed entries' `display_name`, and send their `slug`. Do not assume ordinary API-key catalogue shape or hardcode a particular model.

Send to `POST https://api.openai.com/v1/responses`. Process streaming through the terminal event: text is provisional; only `response.completed` establishes normal completion. Failure or incomplete events and an interrupted stream remain distinct outcomes, including errors after text begins. [Models and inference](<https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference>).

**Flamehorn choice:** require a deliberate initial model selection. Refresh discovery after account change and expose manual Refresh. A stale/unavailable model blocks with a specific action; do not substitute a newer or cheaper model. Keep the last catalogue for display, labelled stale, not as proof of current permission.

### Request allowlist and route restrictions

For this HTTP pathway use array `input`, `store:false`, `stream:true`, and `instructions` or developer messages. Do not send explicit system-message items, `previous_response_id` or `conversation`. Fields such as `temperature`, `top_p`, `max_output_tokens` and `truncation` are unsupported. Files/images depend on the selected model; the Files upload API and audio/video input are unavailable. Hosted tools have separate restrictions and are not presumed available. [Preview limitations](<https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations>).

**Flamehorn choice:** start with an allowlisted body of model, input, instructions, store and stream. Add reasoning settings or structured-text configuration only for a documented and verified route/model combination; arbitrary request-body passthrough is not an MVP setting. Reject unsupported user-selected fields before sending, rather than silently ignoring them.

A minimal logical request is:

```text
model: selected account catalogue slug
instructions: effective master instructions + disclosed stage framing
input: ordered User/Assistant material + compiler-owned developer markers
store: false
stream: true
```

Each call supplies its full required material. The app owns conversation history; neither an account session nor a response ID replaces the compiler manifest.

## 5. Configurable OpenAI-compatible connections

A connection profile contains a display name, base URL including its API prefix, encoding mode (**Responses** or **Chat Completions**), optional key reference, model selection and explicit capability profile. Store nonsecret configuration separately from secrets. The selected connection/model is a Workspace preference captured at Run.

Example local base: `http://127.0.0.1:1234/v1`. Example paths are descriptive, not evidence a server is currently running. Accept loopback HTTP for local services; require HTTPS for non-loopback hosts in the proposed MVP. Do not disable certificate checks. Remote plain HTTP and arbitrary custom headers are deferred.

Validate URL scheme/host and reject embedded credentials, secret query strings and fragments. Append the selected route exactly once. Do not forward authorisation across redirects or silently discover an alternate host. API keys are sent only to their selected profile's exact origin. Editing the origin invalidates its prior data-transfer consent and requires choosing/re-entering a key deliberately.

**Connect / Refresh models** may contact the configured server for metadata; it sends no Workspace content and performs no generation. Standard-compatible discovery uses `GET /models` and `data[].id` where supported. Permit manual model ID when discovery is unsupported, marked unverified. A connection test that generates text is a separate explicit later action with the destination and possible billing visible.

LM Studio documents compatible Responses and Chat Completions endpoints. Its Chat Completions path accepts explicit history and model chat templates; Responses adds its own stateful features. Flamehorn uses the supplied complete history and does not require server-side state. Its native chat API is not a drop-in role-preserving replacement. [Compatibility](<https://lmstudio.ai/docs/developer/openai-compat>), [Responses](<https://lmstudio.ai/docs/developer/openai-compat/responses>), [Endpoint comparison](<https://lmstudio.ai/docs/developer/rest>).

These documents do not establish full direct-PDF parity for every compatible route. A compatibility label does not prove file, image, reasoning, schema or error support.

### Encoding

| Responses profile | Chat Completions profile |
| -- | -- |
| Ordered input messages/items and a supported instruction field; route-specific field allowlist | Ordered `messages` with supported instruction-role encoding |
| Normalise output-text deltas and explicit terminal response status | Assemble selected choice's content deltas; require documented normal finish reason and clean stream termination |
| Preserve recognised summary/usage metadata separately | Preserve supported reasoning/usage metadata separately; no guessing from visible text |
| Do not use prior server responses as implicit history | Do not insert fake alternating turns or merge distinct Context identities |
| Validate model/role/modality capability before send | Same check; consecutive same-role messages must remain supported |

Single-output text success needs normal completion and nonempty text. For Chat Completions, `length`, tool calls, content filtering and missing finish state are not ordinary successful completion. `[DONE]` alone does not prove that the content completed normally. Unknown event fields are ignored safely; unknown terminal semantics become an unsupported-protocol error until a profile defines them.

Generic API-key OpenAI Responses is configured through this second path with its own profile. Its supported fields/billing differ from ChatGPT plan use. No API key is silently requested or used to bypass a plan limit.

## 6. Capability matrix and multimodal contract

Capabilities are keyed by connection, route, model and profile revision. Track each as **documented**, **verified in Flamehorn**, **user-declared/unverified**, or **unsupported**. Model-list membership alone proves neither modalities nor schema support.

| Capability | ChatGPT OAuth Responses | Compatible Responses | Compatible Chat Completions |
| -- | -- | -- | -- |
| Text input/output and explicit history | Documented route; chosen model/account still required | Profile-specific; LM Studio documents route | Baseline proposed text route; verify server/model |
| User/Assistant roles, including consecutive same roles | Preserve compiler roles; reject unsupported content-part combination | Verify exact item support | Verify template/server preserves messages; no synthetic alternation |
| Images | Conditional on model and role | Unknown by default | LM Studio documents text/image support with suitable models; generic endpoint unknown |
| Direct PDF | Conditional file input, model/role support | Unverified by default | Unverified by default, even if another vendor supports it |
| Extracted PDF text | Ordinary text with disclosed loss of visuals | Ordinary text | Ordinary text |
| Strict JSON schema | Optional only after exact route/model confirmation | Optional profile capability | LM Studio documents schema output with model caveats; generic endpoint unknown |
| Planner JSON as text | Proposed portable fallback, strictly validated | Same | Same |
| Model-requested tools | Excluded by Flamehorn MVP | Excluded | Excluded |
| Reasoning effort/summary | Only documented supported values; account route must accept them | Profile-specific | Profile-specific; no universal field mapping |
| Opaque continuation | No dependence across independent MVP calls | No dependence | No dependence |
| Hard output-token cap | Not available through the documented plan-use field | Only if supported | Only if supported |
| Automatic context truncation | Not permitted by Flamehorn contract | Must be disabled or shown incompatible | Must be disabled or shown incompatible |

The [LM Studio structured-output guide](<https://lmstudio.ai/docs/developer/openai-compat/structured-output>) documents schema-constrained responses but warns that capability varies by model. It is an optimisation to improve planner conformance, not a prerequisite that silently narrows the thirteen-Process catalogue. Invalid fallback JSON still fails clearly.

### Files and images

<issue id="95847f80-7888-4691-bf7a-26e732fc9d08" href="https://linear.app/flamehorn-games/issue/FLAME-143/design-data-model-persistence-and-assets">FLAME-143</issue> owns copied originals, extraction and selected representations. The adapter receives exact ordered content parts; it may encode them but cannot select a lossy replacement.

For ChatGPT-authenticated file input, propose inline PDF bytes using the Responses file-data representation, avoiding an upload API this route does not support. The ordinary [File inputs guide](<https://developers.openai.com/api/docs/guides/file-inputs>) documents inline file data; applying it to the plan-use route is supported by that route's documented file-input capability but still requires a chosen-model integration check. Do not extrapolate every ordinary API file option to this route.

Images similarly use the profile's supported inline encoding. No public asset URL is created. Selected bytes, filename/media type and required context go only to the chosen provider. Do not send local absolute paths, sibling files, the library database or credentials as material.

If an Assistant-role Context attachment is unsupported by a route, block that combination. Do not silently relabel it User. A plain Reference uses the compiler's User-role convention. Text-only PDF conversion requires the user's representation choice and a fresh preview; scanned/blank extraction is not a successful read.

### Reasoning and continuation

Supported effort settings describe a provider option, not a guaranteed reasoning quality. Summaries, when returned, go to inspection; private reasoning is not exposed as a Context.

OpenAI documents opaque encrypted reasoning items for stateless continuation. They must be treated as provider-specific items, not readable or portable explanation. [Reasoning guide](<https://developers.openai.com/api/docs/guides/reasoning>). The recommended runtime uses independent complete requests for planning and each output, so it passes the accepted plan as explicit data and does not require those items for subsequent stages. This is a deliberate stateless execution design, not dropping required state mid-tool-cycle. A future continuing/tool sequence must preserve the provider-required item order and compatibility boundary.

## 7. Errors, limits and user-controlled fallback

Normalised errors retain category, stage/call, HTTP status, known provider code/parameter, safe message, request ID, retry guidance and whether any output had already streamed. Unknown response bodies remain diagnostic text, never instructions or guessed stable codes. Sanitise and bound them before display/storage.

| Category | App action |
| -- | -- |
| Needs sign-in / consent missing | Stop; preserve local work; offer the appropriate explicit account action |
| Permission / ineligible / region | Stop; explain restriction; do not loop sign-in |
| Usage or billing limit | Stop new calls; show actual provider message and available usage link |
| Unsupported capability / bad request | Identify affected field/material; correct configuration before another run |
| Transient server / network | Stop this attempt; preserve history; offer manual recovery |
| Incomplete / refusal / malformed output | Keep it distinct from completed text; Runtime controls slot retention |
| Local endpoint offline / missing model | Show endpoint/model and setup action; do not switch to remote inference |
| Save conflict / disk failure | Local recovery path; no replacement inference just to retry saving |

OpenAI's documented codes distinguish ineligibility, plan/app usage limits, unsupported capabilities, unavailable routing and invalid identity. A limit error alone does not reveal a reset time or prove the entire plan is exhausted. Admission failures may use a `detail` body rather than the usual error object; errors can also arrive after streaming begins. Preserve the actual code/request ID and do not switch billing automatically. [Errors and recovery](<https://developers.openai.com/siwc/token-sharing-open-source/errors-and-recovery>).

The Runtime proposal supplies one concurrent call, no automatic inference retries, bounded time/call/response-size limits and explicit recovery. Adapter/SDK default retry behaviour must be disabled so it cannot multiply those calls invisibly.

Show returned usage when available and mark missing values unknown. Do not invent remaining quota, exact costs or hard spending guarantees from token estimates. Link ChatGPT usage/account controls through the documented [UI/UX guidance](<https://developers.openai.com/siwc/ui-ux-guidelines>). App settings cannot authorise extra account credits on the user's behalf.

### Switching providers

The selector shows connection, local/remote destination, model and billing basis before Run. First use of a remote origin discloses that the complete compiled material and selected attachments will be sent there. Selecting that destination and explicitly running authorises that transfer; no generic perpetual “all providers” permission is implied.

When a connection fails, offer Wait/retry later, change model/representation, or choose a configured alternate. Choosing an alternate invalidates the preview and requires another explicit Run. It never continues remaining slots automatically. Switching from local to remote or to API billing is a visible choice.

Workspace material and retained history survive switching. Opaque continuation state does not migrate. An unfinished-output recovery using the old snapshot requires its old provider/model; choosing a different backend means a new run under Runtime's rules.

## 8. Credentials, imported content and local authority

**Proposed secret storage:** use Electron safeStorage's OS-backed encryption and current-user file permissions for separate atomic credential records. Keep tokens/keys out of SQLite library exports, browser storage, the renderer's persistent state, logs and crash reports. Windows protection is against other OS users, not a security boundary against all applications running as the same logged-in user. [safeStorage documentation](<https://www.electronjs.org/docs/latest/api/safe-storage>).

If protected storage is unavailable, offer session-only credentials or block persistence; never fall back to plaintext. Token exchange/refresh runs in the local credential service. Key entry reaches that service through a narrow IPC command; normal UI reads return labels/status only. Redact token-bearing authorisation URLs as well as headers. No telemetry or remote error-report upload is proposed for MVP.

**Renderer posture:** packaged local content only; Node integration disabled, context isolation and renderer sandbox enabled, restrictive CSP, denied unsolicited permissions/windows, validated IPC sender and arguments. Expose only purpose-specific methods through preload. External links require a user gesture, URL validation and the system browser. These choices follow [Electron security guidance](<https://www.electronjs.org/docs/latest/tutorial/security>).

Imported Markdown/HTML-like text and model output are untrusted display material. Render sanitised Markdown with raw HTML and embedded executable content disabled; never evaluate code blocks or load remote images automatically. Use safe local image/PDF previews. PDF parsing runs with explicit byte/page/time bounds and no credential access; documents cannot request arbitrary local paths or execute scripts.

Filesystem authority comes from explicit import/export actions and the managed library. An LLM response cannot name a path and thereby read/write it. No shell, native computer control, connectors or external issue-tracker writes are model capabilities in this proposed release.

Security measures protect the local boundary; they do not make model text trustworthy or establish factual correctness.

## 9. Setup, launch and later verification

### User launch contract

A packaged Windows build launches directly without the user installing Node, Python, Docker, a database server or a graph framework. First launch creates the local library and opens an editable Workspace. Reading, writing, wiring, history and file import work without signing in.

To generate, the user chooses Continue with ChatGPT or configures a compatible endpoint and model. Local inference needs a separately installed/running server and suitable model; Flamehorn does not silently download or load models. Internet access is needed for ChatGPT and remote endpoints, not for offline library use.

Use manual application updates in the first release. Do not add an auto-updater or paid signing purchase through this design. A later public distribution needs an explicit packaging/signing decision and dependency notice bundle; an unsigned internal review build must be identified honestly.

Implementation documentation must give exact source-build prerequisites, pinned runtime/package-manager versions, clean install/build/package steps, data-directory location, backup/restore instructions and how to remove/reconnect credentials. Native SQLite compatibility must be verified against the packaged Electron runtime. None of that packaging has been tested by writing this draft.

### Verification ledger

| Item | Evidence now | Required later evidence |
| -- | -- | -- |
| ChatGPT OSS registration/inference route | Official documentation checked 13 October | User-authorised first registration, consent, account-specific discovery and completed text generation |
| Token lifecycle | Official refresh/revocation contract read | Restart, expiry/refresh rotation, account mismatch, denied consent and sign-out tests |
| LM Studio routes | Official compatible endpoint documentation read | Named server/model/version; text, roles, streaming and known overflow behaviour |
| Images/PDFs | Representation design plus documented conditional support | Real fixtures on the chosen route/model/role; unsupported cases block without conversion |
| Structured planner output | Optional documented capability and strict text fallback design | Valid/malformed/missing/duplicate slots, with no unintended follow-on calls |
| Svelte Flow/Electron stack | Direct capabilities/licences reviewed | Approved UI behaviours, packaged native dependency loading and responsive interaction |
| SQLite/assets | Written transaction/backup/recovery design | Crash points, disk failure, repeated commit, export/import hash closure and migration recovery |
| Tool scope | Explicit no-tools recommendation | Outbound calls expose no tools; unexpected calls never execute |

### Acceptance scenarios

| ID | Scenario / required outcome |
| -- | -- |
| AP01 | Clean Windows install starts an editable local Workspace without credentials or developer tools |
| AP02 | ChatGPT sign-in validates identity/scope and lists the selected account's models |
| AP03 | ChatGPT text stream commits only after normal terminal completion; mid-stream failure remains incomplete |
| AP04 | Restart refreshes the correct saved session without mixing account/client IDs |
| AP05 | Denied consent, revoked refresh token and temporary network error take distinct recovery paths |
| AP06 | Local endpoint with no key handles explicit mixed-role history without fake turns |
| AP07 | Responses versus Chat Completions settings encode differently; unsupported fields never leak between profiles |
| AP08 | Local offline/usage-limit errors do not trigger remote or API-key fallback |
| AP09 | Image/PDF capability mismatch, excessive context and unverified silent truncation are surfaced before trusting a result |
| AP10 | Changing connection/model/representation refreshes the preview and requires explicit Run |
| AP11 | Malicious rendered material cannot invoke IPC, fetch remote images, expose credentials or execute a tool |
| AP12 | Export/diagnostics contain no credentials; sign-out reports unconfirmed remote revocation honestly |
| AP13 | Single-output, Fork, Explode and Three Experts follow the same provider contract and bounded runtime |
| AP14 | Missing capability evidence is labelled unknown; successful sign-in alone is not a passed inference test |

The first authenticated or live-inference experiment remains a separately authorised implementation/feasibility step. This document does not invoke it.

## 10. Review decisions and handoff boundary

**Recommended decisions**

* **A-A:** Packaged Windows 11 x64 Electron app with Svelte/Svelte Flow and a local TypeScript runtime.
* **A-B:** Direct official Sign in with ChatGPT Responses as the primary path; configurable Responses/Chat Completions profiles as the second.
* **A-C:** SQLite plus managed assets and protected separate credentials, matching <issue id="95847f80-7888-4691-bf7a-26e732fc9d08" href="https://linear.app/flamehorn-games/issue/FLAME-143/design-data-model-persistence-and-assets">FLAME-143</issue>.
* **A-D:** Explicit capabilities and user-selected representations, stateless full-context calls, no model tools or automatic provider/billing fallback.
* **A-E:** Manual updates and local-first operation; additional platforms/hosting remain later work.

**Release gates, not claims of completed work:** confirm access with the intended account; pass the dated provider and clean-package checks; verify role/modality/overflow behaviour for the supported local profile; reconcile <issue id="bc7e6bfc-d83e-400c-8356-2e78621aa5d7" href="https://linear.app/flamehorn-games/issue/FLAME-139/design-desktop-interaction-specification-and-approved-ui-reference">FLAME-139</issue>'s UI controls; approve the exact runtime/data/provider revision set and dependency lockfile before distribution.

The documentation supports proceeding to review rather than declaring the ChatGPT path impossible or replacing it with an API-only stub. If a later authenticated check fails because access or the contract changed, record that blocker and return it for an explicit scope decision. Do not silently ship a substitute.

Operation Workspaces, scheduled agents, cloud sync, conversation/memory import, hosted connectors, model downloads, provider-specific tool ecosystems and multi-agent orchestration remain outside this MVP. <issue id="1ceec787-1ac1-404b-9142-3f7d2d6a6ad5" href="https://linear.app/flamehorn-games/issue/FLAME-145/design-mvp-implementation-brief-and-agent-handoff-documentation">FLAME-145</issue> should cite approved revisions and dated evidence; it must not present this draft's recommendations or unexecuted tests as user approval or completed feasibility.
