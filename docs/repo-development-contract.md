# Repository development contract

**Revision:** 1.0 — requested by the user, 13 October 2026 (Australia/Sydney)

**Repository:** [buttery-x3/flamehorn-desktop](https://github.com/buttery-x3/flamehorn-desktop)
**Local checkout:** `D:\dev\flamehorn-desktop`

This contract governs all implementation agents and repository contributors. It supplements the [MVP brief](agent-brief-mvp.md); it does not change the approved product scope.

## 1. Branches and authority

```text
feature/<short-name>  ── reviewed PR ──>  development
                                              │
                         model-approved usable candidate
                                              │
                                              ▼
                                           testing
                                              │
                      user tests and explicitly approves
                                              │
                                              ▼
                                             main
```

| Branch | Purpose | Who can authorise its advancement |
| --- | --- | --- |
| `main` | User-approved implementation only | The human user, after testing the exact candidate |
| `development` | Integrated work in progress; the base for new features | Implementation agent after review and appropriate checks |
| `testing` | Model-reviewed, runnable and usable milestone candidates for the user to try | A documented model review of the exact proposed snapshot |
| `feature/<short-name>` | One coherent feature or change, branched from current development | The working agent/contributor within the authorised task |
| `fix/<short-name>` or `docs/<short-name>` | Focused fixes or documentation changes; same route as features | The working agent/contributor within the authorised task |

The existing documentation-only commit on main is the starting baseline. Keep main at that baseline until the entire MVP is complete, the user has tested it, and the user explicitly approves the exact implementation candidate. Documentation work from this point also follows the development route; it is not an exception allowing incidental main changes.

Never develop directly on main or testing. No agent may infer main approval from silence, passing tests, model approval, a Linear Done status, acceptance of design documents, or permission to start implementation. “Ready for user testing” and “approved for main” are distinct states.

Development may contain incomplete MVP features. Testing may contain an incomplete MVP only when its advertised milestone is usable and its missing scope is explicit. Main's first implementation promotion requires the full accepted MVP, not merely the latest useful milestone.

## 2. Feature work → development

1. Inspect working-tree changes and current remote branches. Fetch current refs without resetting another person's work.
2. Start a feature/fix/docs branch from current development. Keep each branch focused; use separate worktrees if concurrent work is actually authorised.
3. Implement the coherent change with its documentation and relevant checks. Changes to product requirements still follow the brief's user-approval rule.
4. Open a pull request targeting development. Explain the problem, resulting behavior, scope, relevant issue, verification and remaining limitations.
5. Review the final diff and checks in a deliberate review pass. Resolve material findings. Record the reviewed commit and result in the PR. “I finished writing it” is not review evidence.
6. Merge into development after that review and appropriate checks pass. Preserve the feature's change history through the PR. Integration conflicts or substantive merge changes require another check/review of the resulting state.
7. Keep development's current limitations visible. A merged feature is not automatically a testing candidate or user-accepted implementation.

Use ordinary merge commits for feature PRs so integration and review provenance remain visible. Do not force-push or reset shared development/testing/main history. Keep user work intact; resolve conflicts explicitly. A fix for any branch travels through this same route.

Human permission is not required for each routine feature merge or testing promotion once implementation work is authorised, provided these gates pass. Only the user may approve changes to the agreed product scope or promotion to main.

## 3. Development → testing: the model review gate

Promote meaningful, coherent milestones—not every development commit. A candidate must be startable with its documented setup and usable for the scenarios it advertises. There is no fixed calendar cadence; promote when a new worthwhile testable state is ready.

Before promotion:

- Select a fixed development snapshot. Review its complete difference from the previous testing candidate, including merged features, fixes, dependencies, setup and data-format changes.
- Build/start the candidate using the documented path and exercise the advertised happy paths plus relevant failure/regression checks. Run the applicable automated checks. Record actual results and limitations.
- Confirm new changes do not break previously advertised testing functionality without a clearly justified, disclosed limitation. A known blocker in an advertised test path prevents promotion of that path/candidate.
- Verify the intended entry point and artifact/source instructions work for this candidate. Keep credentials, private data and generated local state out of the repository.
- Add the candidate's test note and update the running [testing index](testing/README.md) as part of development, using the [note template](testing/TEMPLATE.md). Use ordinary reviewed documentation work to add the note before freezing the final candidate.
- Perform a separate model review pass over the final candidate and its note. Record the model/reviewer identity, time, reviewed full commit SHA, scope, checks, findings, unresolved limitations and **Approve for testing** or **Do not promote** in the promotion PR.
- If any candidate content changes after approval, review the new final SHA. Earlier approval cannot float onto newer development.

A separate review pass is mandatory; it can be performed by the responsible model with a fresh review of its work. An independent reviewer is welcome when already available/authorised, but this contract does not require spawning agents. Record who actually reviewed it.

Model approval is evidence about the stated candidate, not a claim that the human user has accepted it or that every MVP capability is complete. Missing live credentials may be a disclosed limitation for an offline milestone; do not advertise unverified sign-in or inference as working. A candidate whose setup itself was never exercised is not ready for the user to test.

### Exact snapshot and promotion mechanics

1. Create `promotion/testing-YYYY-MM-DD-NN` pointing to the approved development SHA. Do not edit product code on this branch.
2. For an existing testing branch, open a promotion PR targeting testing; record the exact approved SHA and previous testing SHA. Keep later development commits out of this candidate.
3. Require the previous testing head to be an ancestor of the candidate. If it is not, reconcile history on development and review again. Do not resolve this by force-pushing testing or making an unreviewed merge directly on testing.
4. Advance testing to the exact approved development SHA using a fast-forward, and push normally. The PR is the review record; do not use a merge strategy that creates an unreviewed product snapshot. Confirm the remote testing SHA matches the approval.
5. Tag the candidate commit `testing/YYYY-MM-DD-NN` after successful publication. Tags are immutable; corrections use a new candidate. Record full SHA and artifact hashes in the promotion record.
6. Verify the remote refs and publish the user-facing update described below. A local merge or failed push is not a published testing update.

**First candidate:** there is no testing branch until a runnable milestone passes this gate. Record the initial candidate review in the development/review PR, then create and push testing at that exact SHA and tag it. Subsequent promotions use the testing PR flow.

The candidate note identifies its runtime/source revision and changed feature PRs. The final candidate SHA is recorded in the promotion PR and immutable tag, because a file cannot contain its own final Git commit hash. Notes-only commits may follow the runtime source revision; any code/build/configuration change requires refreshed evidence. The final model review always names the complete candidate SHA.

Do not copy selected feature files straight to testing, cherry-pick unreviewed fixes there, or move testing automatically whenever development moves.

## 4. The running testing update

Every successful update of remote testing—including a corrective candidate—must have:

1. A permanent note in `docs/testing/YYYY-MM-DD-NN.md`, committed with the candidate.
2. A newest-first entry in `docs/testing/README.md`, showing candidate ID/date, main usable change, note link and applicable promotion/review reference.
3. A concise update to the user in the active implementation chat, linking the note and candidate/PR/tag. If there is no active chat, surface it in the task's final result; do not silently mark the work finished.
4. A matching factual update to its tracking issue when that issue is being managed in the authorised task. The repository note is canonical; do not maintain incompatible parallel instructions.

The user-facing update answers:

- **What changed since the previous testing candidate?**
- **What works now?** Include the cumulative usable surface, not just new features.
- **How do I get/start this exact candidate?** Give a working artifact or exact checkout/setup/run instructions and prerequisites.
- **What should I test in this push?** Give short numbered actions and expected results.
- **What is still missing or unreliable?** Distinguish known defects, deferred milestone scope and checks not run.
- **What feedback is useful?** Ask for candidate ID, test step, observed behavior and safe diagnostic evidence; never ask for secrets.

Use Australia/Sydney dates and include the UTC offset in publication times. Link the comparison against the previous testing candidate. Call a milestone an early/partial candidate where appropriate; never call it the complete MVP until the full scope/evidence gates are satisfied.

Do not announce a testing promotion until the remote update succeeds. If the push or artifact upload fails, report that publication failure and retain the prior testing candidate as current. No recurring automation or background monitor is implied: these updates are an obligation of the agent performing each promotion.

## 5. Testing → main: human acceptance only

For the first implementation release, all required MVP scope and completion evidence must be ready. The user must test the intended release candidate and explicitly approve it for main.

Record approval against an exact immutable testing tag/full SHA, including the user's approval text or a link to the trusted approval record and date. Approval of an earlier candidate does not cover later changes.

- Prepare a release PR from the exact approved testing snapshot to main, with the full MVP status/evidence and user approval reference.
- Do not substitute the latest development head, include additional changes, enable an automatic merge before approval, or self-approve on the user's behalf.
- After explicit approval, promote only that approved snapshot using a fast-forward when ancestry permits. If an integration conflict or unexpected main change prevents this, reconcile on development and obtain review/testing/approval of the new candidate.
- Tag the approved release and record the actual main SHA. User approval to merge does not automatically authorise paid services, public deployment, signing purchases or other separate actions.
- Keep development and subsequent features descended from the accepted release.

Later implementation releases follow the same user-tested, explicitly approved promotion rule. Urgent fixes are not an exception. Do not advance main merely to keep it visually in sync with development.

## 6. Rejected candidates and recovery

If the user or later evidence finds a serious problem, record it against that candidate and mark its testing status withdrawn or superseded in the running index. Preserve the historical test note and review record; append corrections rather than rewriting what was claimed at publication.

Fix or revert on a feature/fix branch into development, run relevant checks and promote a new reviewed candidate. Use a new candidate ID/tag even for a rollback. Do not force-reset testing or change an old tag. Let the user pin the last usable tag while the correction is prepared.

Keep releases reproducible. Record migration/backup/reset requirements per candidate; never tell the user to erase a library merely to make a test pass without explaining the impact and obtaining authorisation for destructive steps.

## 7. Repository enforcement and present state

This file and AGENTS.md establish the contributor contract. They do not themselves install GitHub branch protection, status checks or a CI system.

When repository enforcement is configured, protect main/testing/development against deletion and history rewrites; require the appropriate review/check records; restrict main advancement to the human-authorised release path. Do not invent a GitHub approval or bypass a protection rule to make the written workflow work. Select checks only after real runnable checks exist.

Current state: the repository contains specifications and static reference artwork only. Development starts from the existing main documentation baseline. The contract change travels through its own feature branch. **No runnable testing candidate or main implementation release exists yet.** Do not create a fake first testing entry for this documentation change.
