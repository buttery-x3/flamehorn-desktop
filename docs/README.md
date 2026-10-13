# Flamehorn Desktop documentation

Start with [MVP Implementation Brief and Handoff](agent-brief-mvp.md). It contains the scope boundary, candidate launch prompt and evidence checklist. Final handoff approval is pending; no application exists yet.

**Canonical local repository:** `D:\dev\flamehorn-desktop`

**Remote:** [buttery-x3/flamehorn-desktop](https://github.com/buttery-x3/flamehorn-desktop) · current preparation on development; main stays at the original documentation baseline.

**Linear review:** [MVP Implementation Brief and Handoff](https://linear.app/flamehorn-games/document/mvp-implementation-brief-and-handoff-a5ec8958adc5)

**Baseline:** [file hashes](baseline-manifest.json) · [reconciliation audit](design/reconciliation-audit.md)

**Repository workflow:** [development contract](repo-development-contract.md) · [testing updates](testing/README.md) · [test-note template](testing/TEMPLATE.md)

| Owning specification | Revision | Linear mirror |
| --- | --- | --- |
| [Desktop interaction](design/desktop-interaction.md) | 0.2 | [FLAME-139 document](https://linear.app/flamehorn-games/document/desktop-interaction-specification-b28dbc9a83c4) |
| [Nodes, pins and Processes](design/nodes-pins-processes.md) | 0.4 | [FLAME-140 document](https://linear.app/flamehorn-games/document/node-pin-and-process-specification-54fb3107d819) |
| [Context compilation](design/context-compilation.md) | 0.2 | [FLAME-141 document](https://linear.app/flamehorn-games/document/context-compilation-and-instruction-assembly-2eb0f3b948a0) |
| [Process runtime](design/process-runtime.md) | 0.2 | [FLAME-142 document](https://linear.app/flamehorn-games/document/process-execution-and-tool-runtime-6a2e7e536f52) |
| [Persistence and assets](design/persistence-assets.md) | 0.2 | [FLAME-143 document](https://linear.app/flamehorn-games/document/data-model-persistence-and-assets-fbd0c1d6490f) |
| [Application and providers](design/application-providers.md) | 0.2 | [FLAME-144 document](https://linear.app/flamehorn-games/document/application-architecture-and-provider-integration-a65654c130cc) |

## Visual reference pack

[Open local visual index](design/mockups/index.html) · [Panel status/qualification register](design/mockups/README.md) · [Original private atlas](https://flamehorn-desktop-design-review.tpilepich.chatgpt.site)

The pack contains 19 full-size panels in both Charcoal and Light (38 original SVGs), source artwork 0.6 / Sites version 8. B2 and D1 have explicitly superseded interaction details; all panels must be read with the qualification register.

## Approval and implementation

FLAME-139–144 are complete design reviews following the user's acceptance on 13 October 2026. The technical approval editions preserve the accepted recommendations. The reconciled UI, scope matrix and candidate one-shot prompt are collected for final review under FLAME-145.

Approval of final instructions does not itself execute them. Later implementation must record source/runtime pins, commands, artifact path, tests and known limitations. Until then, there are no setup/build commands to run.

Historical documents under [superseded/](design/superseded/) are audit material. [The reconciliation audit](design/reconciliation-audit.md) prevents their rules from expanding MVP scope.
