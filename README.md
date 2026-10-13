# Flamehorn Desktop

A local Windows desktop for exploring conversational material with explicit, inspectable model requests. MIT-licensed; [third-party notices](THIRD_PARTY_NOTICES.md) retain upstream licences.

**Implementation preview.** Offline editing, retained history, managed files, deterministic compilation and both provider workflows are implemented. Authorised text checks passed with ChatGPT and the user's local Gemma model on 13 October 2026. This is not yet an accepted full MVP release; remaining verification and human acceptance are listed in the [verification record](docs/verification/README.md) and [testing candidates](docs/testing/README.md).

## Start the Windows build

Target: Windows 11 x64. No Node installation or database server is needed for the packaged application.

Extract the entire candidate ZIP to a writable local folder, then open **Flamehorn Desktop.exe** inside it. Keep the surrounding resources and DLLs together. This is an **unsigned internal testing build**, not an installer or a signed public release.

The local build is produced at:

```text
D:\dev\flamehorn-desktop\out\Flamehorn Desktop-win32-x64\Flamehorn Desktop.exe
D:\dev\flamehorn-desktop\out\make\zip\win32\x64\Flamehorn Desktop-win32-x64-0.1.0.zip
```

Use the exact candidate tag and artifact hash in its testing note. Rebuilding overwrites the local `out` folder; immutable copies of delivered candidates live in `artifacts/candidates` on the implementation machine.

## First exploration

1. Create a **Context**, write a short idea in the right inspector, and wait for **Saved**.
2. Add a **Process**, such as Respond. Drag the Context's gold output pin to the Process's blue input pin. An output dragged onto empty canvas opens a creation palette.
3. Select the Process and open **Next request**. Inspect the complete ordered material, roles, effective instructions and capability warnings.
4. Set up a connection and choose its model. **Run** opens a request summary; **Run now** sends it. Missing destinations are created only after validation. Nothing downstream runs automatically.
5. Select a result to inspect full text, versions or recorded history. **New Workspace from Here** reconstructs historical inputs in a separate Workspace without inference.

Contexts have explicit User/Assistant roles. References always contribute as User material. **Force include in context** adds only that node's selected material within its Workspace. Wiring and inclusion are independent of layout, selection and zoom.

All thirteen Processes are included. Fork uses one allocation call and two development calls; Explode uses one allocation call and eight development calls; Three Experts uses three calls with no synthesis. Other Processes use one call. Only one Process runs at a time. Stop keeps committed results; unfinished streaming text never becomes a saved version. History offers deliberate recovery when the original destinations are unchanged.

## Connections

### ChatGPT plan

Open **Connections & library → Continue with ChatGPT**. Complete consent in the system browser, return to Flamehorn, then **Refresh models** for that account. Choose the connection and model in the Workspace. This uses the official Sign in with ChatGPT public Responses route and requires eligible access plus plan-use consent. Signing in is not proof that a particular model or modality is available.

The implementation uses issued client registration IDs, PKCE, state/nonce and signed identity validation, serialized refresh-token rotation, and discovered revocation. Tokens are kept in Windows protected storage, separate from the library. Reconnect the intended saved registration after expiry/revocation. Disconnect clears its local tokens even if remote revocation cannot be confirmed; the UI reports that distinction. No other application's login is read.

The authorised live check passed browser consent, issued registration, protected credential storage, account model discovery and one completed `gpt-6-luna` text response. Live token expiry/rotation, remote revocation and image/PDF inference have not been exercised. During agent-led verification, sign-in and inference require the separate authorisation specified in the approved brief. Keep Flamehorn open until the browser returns; closing it stops the local callback. Never paste tokens or keys into chat or an issue.

### Compatible server

Start a compatible model server separately; Flamehorn does not download or start models. Add its API **base URL**, including `/v1` when required, and choose **Responses** or **Chat Completions**. HTTP is allowed only on loopback; remote endpoints require HTTPS. Credentials, queries and fragments in URLs are rejected. Redirects and provider fallback are disabled.

Refresh the model catalogue or explicitly enter a manual model ID. Set capability evidence for the **exact model**, including context size, overflow rejection, attachment support and any supported reasoning setting. These declarations are visibly unverified until exercised against that named server/model/version. Changing models does not carry over vision or reasoning support. Saving settings or refreshing model metadata does not generate.

To remove an API key, edit its saved connection, select **Remove saved API key when saving**, and save. This stops an active run and clears the protected key. Enter a replacement key deliberately to reconnect. ChatGPT registrations use their separate Disconnect/Reconnect controls.

A Run sends the complete selected material and attachments to the displayed origin. Remote providers may bill or consume plan allowance. Local byte/time ceilings are not spend caps. Unsupported representations block; no automatic conversion, truncation, retry or route substitution occurs.

## Files, saving and recovery

Import UTF-8 `.txt`/`.md`, PNG, JPEG or PDF. Files are copied into the library and identified by their retained bytes; moving the original file does not alter history. Limits are 25 MiB per file, 100 PDF pages and 60 seconds per preparation job. PDF preview is local. Direct PDF and extracted text are separate explicit representations; text-only selection requires acknowledging page warnings and loss of layout/diagrams. Blank extraction blocks generation.

Edits autosave after 500 ms and flush before navigation, Run and closing. **Saved** means a database acknowledgement. One editable draft exists per node. A run retains the material it actually uses and its output bases; subsequent edits create or reuse one draft. Selecting an older version does not rewind current wiring or settings. If another draft exists, the inspector offers an explicit continue/replace choice.

Default storage is `%LOCALAPPDATA%\FlamehornDesktop`:

| Location | Purpose |
| --- | --- |
| `library\library.sqlite` and `library\assets\` | Initial library and immutable original files |
| `libraries\import-*\` | Separate imported libraries |
| `library-selection.json` | Current local library selection |
| `credentials\protected.bin` | Windows-protected credentials; excluded from archives |
| `credentials\host-id` | Local registration identity; excluded from archives |
| `backups\` | Last three daily library snapshots; visible and explicitly removable in Settings |
| `shell\` | Electron host data, separate from portable library records |

**Export library** takes a coherent database/asset snapshot with checksums. It includes private content, retained history and Trash, but excludes credentials, credential-store references, host identity and model-discovery caches. Archives are not encrypted. Portable archives are bounded to 512 MiB expanded data. **Open library archive** verifies it, opens a separate library and restarts; it never overwrites the current library. To restore a daily snapshot, choose its `.flamehorn` file through the same command. Configure connections again after import. Keep exports on another drive if protection from drive loss matters.

Removal goes to Trash. Undo retains up to 100 workspace actions across restart. Emptying Trash previews impact and protects records referenced by surviving history or extraction. Backup/export copies may retain removed material; purge is not secure erasure. Current schema is 1. Unknown newer or unversioned legacy libraries are refused rather than converted; there is no released older application schema to migrate.

## Build from source

Verified toolchain: Windows 11 Pro x64, Node **24.15.0**, npm **11.12.1**, Electron **44.7.0**, Svelte **5.57.2**, Svelte Flow **1.7.0** and TypeScript **6.0.3**. Exact dependencies are in `package-lock.json`. A native SQLite rebuild may require Visual Studio C++ Build Tools and Python if a compatible prebuild is unavailable.

From the exact candidate checkout, in PowerShell:

```powershell
npm ci
npm run rebuild
npm run check
npm test
npm run build
npm run test:ui
npm start
```

`npm run dev` builds and opens the app. `npm run notices` regenerates runtime notices from the installed locked dependencies. `npm run make` builds the Windows x64 folder and ZIP. `npm run package` builds only the folder. These commands were exercised on the implementation machine; a pristine Windows machine remains a human acceptance check.

Unit tests run under Electron's Node runtime so SQLite uses the same native ABI as the application. Desktop tests launch real Electron windows against a **synthetic local HTTP fixture**; they do not run a real model or use ChatGPT. The system file chooser is substituted only for known fixture paths. Test libraries and screenshots stay under ignored `artifacts/`.

The optional `scripts/live-check.mjs` is an authorization-gated verification harness for this implementation session, not a routine test command. It uses a separate `%LOCALAPPDATA%\FlamehornDesktop-LiveVerification` library. Ordinary launches use the default library above and require their own connection setup. Live checks do not transfer credentials between these data roots.

To exercise the packaged app with the same desktop checks:

```powershell
$env:FLAMEHORN_TEST_EXECUTABLE = (Resolve-Path 'out\Flamehorn Desktop-win32-x64\Flamehorn Desktop.exe').Path
npm run test:ui
Remove-Item Env:FLAMEHORN_TEST_EXECUTABLE
```

`FLAMEHORN_DATA_DIR` selects an isolated local data root for testing; omit it for ordinary use. Do not point it at shared/network storage or use it to bypass the single-instance library lock.

## Design and contribution contract

The [approved brief](docs/agent-brief-mvp.md), [six owning specifications](docs/README.md), and [qualified artwork](docs/design/mockups/README.md) define scope. The implementation was authorised on 13 October 2026, and the user selected MIT.

Follow the [repository contract](docs/repo-development-contract.md): reviewed feature PRs enter development; an exact model-reviewed usable snapshot moves to testing with a permanent test note; main remains at its documentation baseline until the complete MVP is tested and explicitly accepted by the human user. A passing test suite or model review is not that acceptance.
