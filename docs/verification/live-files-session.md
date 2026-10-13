# Live file and session checks — candidate 2026-10-13-03

Additional verification of the preserved testing artifact on 13 October 2026 (Australia/Sydney, UTC+11). This adds evidence to candidate `testing/2026-10-13-03`, commit `91dc4db562e3dbd0634eb420559e9b99a059cff7`; it does not change the application or move the immutable tag. Runtime source remains `d818295a1d2e3e05465c78d6b47717320855c2ae`. The executable hash was checked before inference against the [published note](../testing/2026-10-13-03.md).

The user separately authorized exactly two non-private requests (one small image and one single-page PDF), renewal, disconnect and reconnect. Tests used the existing separate verification library and Flamehorn's own protected account. No other application's credentials were accessed. No additional inference was used for the session checks.

## Image and direct PDF

Both requests completed at 18:57 UTC+11 through the packaged application, public Responses route `https://api.openai.com/v1/responses`, discovered model `gpt-6-luna`, **User role**. Each used one Respond call with the ordinary importer, compiler, adapter and durable output commit.

| Fixture | Request | Observed output | Reported input / output tokens |
| --- | --- | --- | --- |
| [128 × 128 PNG](fixtures/shape.png), 1,584 bytes | Name the color and shape, at most five words | `Blue circle` | 240 / 6 |
| [One-page PDF](fixtures/marker.pdf), 583 bytes | Read the printed marker, answer only that marker | `PDF_OK_731` | 258 / 8 |

The answer was not included in either request's text. The manifest contained one User Context with one attachment. The PDF retained its direct `pdf` representation; the extracted `pdf-text` alternative was not selected. SHA-256 and exact outcomes are in the [sanitized machine-readable record](results/2026-10-13-03-live-files-session.json).

The harness temporarily declared the specific model's modality for the authorized probe, recorded the preview's unverified-support warning, and marked that modality verified only after a matching completed response. Evidence applies to these fixture types, model, route and role; it does not establish Assistant-role assets, arbitrary complex PDFs, every image format, local-model vision or other models. Context capacity remains unknown; no hard output-token cap is claimed.

## Renewal

At 18:58 UTC+11, a separate Electron 44.7.0 main-process harness bundled the unchanged product `Credentials` class (Git blob `0f1ab870c4ed0fae5d1cbc37c1067e6e82d602f3`). The packaged app was closed to prevent competing refreshes. The harness opened only Flamehorn's verification credential store using Windows protected storage.

The original access token had not naturally expired: expiry was 19:10:41 UTC+11. The harness set **only the in-memory expiry field** to zero, then called the ordinary token method twice concurrently. This exercised the real OAuth endpoint and rotating credentials, with a deliberately injected timing boundary. It is not evidence of waiting through natural expiry in the packaged UI.

One exchange served both callers. The replacement refresh token changed, account/client mapping stayed intact, and the protected replacement reopened in a fresh Credentials instance. Read-only model discovery using the renewed access token returned HTTP 200 and still listed the selected model. No token values, identity, registration IDs or authorization URLs were written into the evidence.

## Disconnect, reconnect and restart

The packaged app disconnected the selected verification account and confirmed remote revocation at 18:59 UTC+11. The user completed browser sign-in at 19:06 UTC+11. The same account registration, existing profile and stable host identity were preserved; no duplicate registration was added. Plan permission and model discovery succeeded.

The harness then closed and reopened the preserved packaged application. The protected session remained connected, discovery still listed `gpt-6-luna`, and both exact file results were retained. The run count was unchanged throughout disconnect/reconnect/restart: **zero additional inference requests**.

## Interpretation and remaining checks

These checks supplement the earlier single text request and protected-session restart. They follow the documented [input limits](https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations), [completed-response requirement](https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference) and [session protocol](https://developers.openai.com/siwc/token-sharing-open-source/profiles-and-sessions), rechecked on 13 October 2026.

Local server overflow policy, a second pristine Windows/DPI environment and human acceptance of the exact candidate remain pending. The automated expiry boundary does not replace natural-expiry soak testing. No product code changed, so this documentation-only evidence update needs no replacement binary or testing promotion. Main remains at its documentation baseline.
