# Testing candidate YYYY-MM-DD-NN — short milestone name

Copy this template to `docs/testing/YYYY-MM-DD-NN.md` before the final candidate review. Replace every placeholder; remove instructions. Do not claim published until remote testing and the candidate tag are verified.

## Identity and review

- Publication time: YYYY-MM-DD HH:mm UTC+offset (Australia/Sydney)
- Candidate tag: `testing/YYYY-MM-DD-NN`
- Runtime/source revision: full SHA before any final notes-only commits
- Previous testing tag/SHA: exact value, or first candidate
- Change comparison: link from previous testing candidate to this tag
- Feature/fix PRs included: links
- Promotion/review record: PR link or first-candidate review reference
- Model reviewer and result: identity, review time, Approve for testing; final reviewed SHA is recorded in the promotion record/tag
- Artifact: exact download/path, version/hash, or verified source instructions
- User acceptance for main: not requested for this partial milestone / pending / reference to explicit acceptance

## What changed in this push

Describe user-visible changes since the previous testing candidate, including relevant fixes and compatibility changes.

## What is usable now

List the cumulative working journeys in this snapshot. Identify simulated behavior and live capabilities separately.

## Get it and start it

Give exact tested prerequisites, artifact/checkout instructions, install/start commands, provider requirements and the initial workspace/fixture. Say whether existing data is compatible and whether a backup is needed. Identify any live inference, remote transfer or potential cost before its test.

## Tests to try

| Step | Action / starting state | Expected result | Evidence or scenario ID |
| --- | --- | --- | --- |
| 1 | Concrete action | Observable result | Owning scenario |

Include the new paths, important regressions and a relevant failure/recovery path. Do not list a path as testable if setup or known defects prevent it.

## Checks already performed

| Check | Environment / fixture | Result | Evidence |
| --- | --- | --- | --- |

Use Passed / Failed / Blocked / Not tested. Identify mocks and their limits, untested live providers, and the commit/artifact actually checked.

## Known issues and not yet available

Describe defects, expected limits, incomplete MVP areas and checks requiring user participation. State whether this is an early/partial milestone or a complete MVP candidate.

## Feedback requested

Ask for candidate ID, test step, expected versus actual result and safe screenshots/logs. Do not request tokens, keys or private workspace exports.

## Later corrections

Append withdrawals, superseding candidates and corrections with dates. Preserve the original publication claims as history.
