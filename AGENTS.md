# Flamehorn Desktop

- Begin at docs/agent-brief-mvp.md, docs/README.md and docs/repo-development-contract.md.
- Follow feature/fix/docs branch -> reviewed PR into development -> model-approved usable snapshot on testing -> user-tested and explicitly approved snapshot on main. Keep main at its existing documentation baseline until the full MVP passes the user gate.
- Never work directly on main/testing or infer human approval from model review. Review the exact candidate SHA and preserve shared branch history.
- Every remote testing update needs a permanent docs/testing/YYYY-MM-DD-NN.md note, an updated docs/testing/README.md index and a user-facing update with changes, setup, concrete tests/expected results and known gaps. Verify remote publication before announcing it.
- No testing branch/candidate is needed for documentation-only work. Read the contract for first-candidate bootstrap and exact promotion mechanics.
- The approved design and qualified mockup register define scope. Preserve owning-spec boundaries and report unresolved conflicts rather than choosing by date.
- This initial repository is a documentation handoff, not an application. Do not start implementation merely because the brief contains a future launch prompt; act on the user's later explicit build instruction.
- Original artwork and superseded documents are provenance. Their outdated labels and annotations are not product requirements.
- Record actual tests, live-access limitations and source/package evidence honestly. Never place provider credentials in source, logs, test fixtures or exports.
