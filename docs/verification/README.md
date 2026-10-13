# Verification record

Date: 13 October 2026 (Australia/Sydney, UTC+11). Platform: Windows 11 Pro x64, build 10.0.26300. Node 24.15.0, npm 11.12.1, Electron 44.7.0. The immutable testing note identifies the delivered source and package hashes; these checks describe the first implementation preview, not human acceptance for main.

## Results and reproducibility

| Scenarios | Check / fixture | Observed outcome | Evidence |
| --- | --- | --- | --- |
| N01–N27, F1–F6 | Compiler, graph, preset and draft tests; literal approved templates | Passed: finite predecessor-first order; A before B; shared ancestry once; Force own material; selected versions; feedback; independent component omissions; fixed pin contracts | `tests/compiler.test.ts` |
| RT01–RT11, DA01–DA04, DA08–DA09 | Native SQLite with controlled adapters, all thirteen Processes | Passed: exact 1/2/3/8 slots and bounded counts; admission before destination creation; input/base freeze; literal Append; idempotency; three-of-eight partial recovery; cancellation race; interrupted restart; durable local save after commit/phase failure | `tests/runtime.test.ts` |
| AP06–AP10, AP13–AP14, RT10 | HTTP stream fixtures; both wire encodings | Passed: roles preserved; ChatGPT allowlist; normal terminal required; refusal/tools/length/EOF rejected; redirect/fallback absent; 30s/5m/15m deadlines; 4 MiB stream and bounded JSON | `tests/provider.test.ts` |
| AP02–AP05, AP12 | Synthetic credentials, signed synthetic RSA JWT, controlled OAuth endpoints | Passed: PKCE callback binding, issued-client reuse after invalid grant, issuer/audience/nonce check, serialized rotating refresh, transient error preservation, origin isolation and local disconnect despite revocation failure. Safe-storage cipher is a fixture here, not a DPAPI claim | `tests/credentials.test.ts` |
| DA06–DA07, F7, AP09 | UTF-8 and small PDF fixtures, real PDF.js/canvas | Passed: byte retention, malformed UTF-8 rejection, local PDF preview/extraction, explicit text-only acknowledgement, blank/page-limit failures; model capability isolation | `tests/assets.test.ts` |
| DA06–DA16, UI09 | Actual SQLite snapshots, archive corruption and query-only write failure, historical graph fixtures | Passed: checksummed archive round trip; secret/cache exclusion; unknown schema refusal; rollback; selected historical settings/roles; feedback input separate from output; mutable draft extraction capture | `tests/storage.test.ts` |
| DA05, DA13–DA16 | Removed material and provenance reference graphs | Passed: surviving history protected, exclusive data removed, purged material cannot be restored from Trash, active-run guard, removed frozen input does not change run | `tests/purge.test.ts` |
| UI01–UI05, UI08–UI11, AP01 | Real packaged Electron, synthetic local HTTP server, native SQLite/PDF, fixture file chooser | Passed: 12 desktop checks, zero renderer errors; creation, actual pointer wiring, save/reopen, safe Markdown, two encodings, history/drafts, semantic zoom, managed file preview and extraction | `scripts/ui-test.mjs`; retained screenshots and desktop results |
| RT08–RT09, UI08–UI09, D1–D3 | Real Electron, delayed synthetic eight-output stream | Passed: three committed outputs survive Stop; recovery issues only five unfinished calls; original accepted plan reused; slot-six extraction omits seven siblings and makes no inference | `scripts/gallery-test.mjs`; gallery results and screenshots |
| AP02–AP03, AP12, AP14 | User-authorised live ChatGPT registration, consent and discovery; public Responses endpoint | Passed: eligible plan permission, seven listed models, one `gpt-6-luna` response, expected non-private marker retained. 222 input / 11 output tokens reported. First attempt failed after the app closed before callback; a fresh attempt succeeded | Live provider record below |
| AP06–AP08, AP14 | User's loopback `/v1`, Gemma model, no key | Passed: discovered requested model; one Responses and one Chat Completions fixture response completed and persisted. Responses reported 271 input / 8 output tokens; Chat usage unknown | Live provider record below |
| Build / licences | Exact lockfile, native rebuild, TypeScript/Svelte validation, Forge x64 package, dependency audit | Passed: check has zero errors/warnings; 67 unit tests across seven files; native SQLite/PDF work in package; 32 runtime package notices collected; production audit reports zero vulnerabilities | Source scripts, lockfile, `dependencies.json`, testing note |

The named scenario ranges identify related contracts, not a claim that every possible variant of every scenario was independently tested. Controlled model output proves orchestration and durability, not model quality or real provider capability. Usage that is absent remains unknown.

## Live provider record

Both checks were explicitly authorised in the implementation chat. Only non-private marker fixtures were sent. Credentials remained under Windows protected storage outside the repository. No existing application's credential store was read.

- Local endpoint: `http://127.0.0.1:1234/v1`; model `gemma4-12b-qat-uncensored-hauhaucs-balanced`. Native metadata reported `gemma4`, GGUF `Q4_K_M`, loaded context 20,319 tokens, maximum context 262,144. The server product/build number was not provided or verified. Overflow behavior remains **unknown**, and the app visibly warns about it. Vision/PDF support is not inferred from the `vlm` metadata label. Check started at 18:01 UTC+11; expected marker `FLAMEHORN_LOCAL_OK` was retained through both routes.
- ChatGPT: official public Responses route `https://api.openai.com/v1/responses`, issued app registration and plan-use consent, selected discovered model `gpt-6-luna`. Successful retry began at 18:07 UTC+11; exactly one harness generation returned `FLAMEHORN_CHATGPT_OK`. No file inputs, tools, API billing fields or fallback were used. Context size remained unknown and there was no route output-token cap; both limitations appeared in preview.
- First sign-in attempt: browser displayed `ERR_CONNECTION_REFUSED` at the final loopback redirect after the app closed. No ChatGPT inference occurred. The app now warns before closing an in-progress sign-in and keeps browser consent outside the local editing command queue. A fresh browser flow completed successfully.
- Raw local harness records stay under ignored `artifacts/live/`. Public evidence contains no account identity, token, callback code, host registration identity or complete private model catalogue.

## Remaining verification gates

| Check | Status / consequence |
| --- | --- |
| Live access-token expiry/refresh rotation and remote revocation | Not tested live; controlled protocol/identity tests pass. Do not describe these as live-verified |
| Live image/PDF inference for an exact route/model/role | Not tested; import, preview, byte identity, deliberate PDF representation and capability blocking are exercised locally. Unknown modalities remain blocked |
| Local server build and overflow rejection configuration | Not verified. Exact model/quantization/context were observed; complete-context preservation at provider limits remains uncertain |
| Pristine second Windows 11 machine, display scaling and hardware variety | Not tested; packaged launch/relaunch/native modules pass on the implementation machine |
| Human end-to-end acceptance of exact candidate | Pending. Main must stay at its documentation baseline |

Early instrumented launches occasionally reported a Playwright launch failure; fresh isolated launches and subsequent packaged reopen checks passed. This is retained as a test-harness limitation, not erased from the record. Normal launch must still be included in user acceptance.

See [scope status](scope-status.md), [visual comparison](visual-review.md), [implementation decisions](implementation.md) and the permanent [testing notes](../testing/README.md).
