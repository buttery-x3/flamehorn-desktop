# Testing updates

This is the running, newest-first history of usable candidates published to the testing branch.

**Current candidate:** [2026-10-13-03](2026-10-13-03.md), the first desktop implementation preview. Exact promotion approval and verified remote publication are recorded in [PR #2](https://github.com/buttery-x3/flamehorn-desktop/pull/2). Main remains at its documentation baseline pending full verification and human acceptance.

Each future testing push must add a dated [test note](TEMPLATE.md), an index entry below and a concise update in the implementation chat, under the [repository development contract](../repo-development-contract.md). Every candidate is pinned by an immutable `testing/YYYY-MM-DD-NN` tag and exact SHA in its promotion review.

| Candidate / publication time (Australia/Sydney) | Main change / usable milestone | Test note | Review / promotion | Status |
| --- | --- | --- | --- | --- |
| 2026-10-13-03 · 13 October 2026 (UTC+11; exact time in promotion record) | Offline graph/history/files, all thirteen Processes, Stop/recovery/extraction, live text on both providers | [Test note](2026-10-13-03.md) | [PR #2](https://github.com/buttery-x3/flamehorn-desktop/pull/2) · [immutable tag](https://github.com/buttery-x3/flamehorn-desktop/tree/testing/2026-10-13-03) | Implementation preview; human acceptance pending |

## Reading a candidate

Use the candidate's tag or published artifact to reproduce the state described by its note; testing may move later. Read setup, test steps and known gaps before trying it. Report feedback with the candidate ID, step and observed result, excluding credentials/private material.

A model-approved candidate is ready for the advertised tests. It is not human acceptance for main. Rejected candidates stay in this history with a withdrawn/superseded status and a link to the correction.
