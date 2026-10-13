# Visual and interaction review

Reviewed against the approved [qualified panel register](../design/mockups/README.md), using the original full-size Charcoal and Light panels. Original annotations, deferred groups/folders and superseded restrictions were not copied into the product.

| Reference | Implemented scene and observation | Evidence |
| --- | --- | --- |
| A1, W1, C1 | Compact top controls, bottom Workspace navigation, restrained charcoal surfaces, square material cards, rounded Processes, square coloured pins and right inspector | `screenshots/03-preview-offline.png`, `screenshots/07-connected-result.png` |
| A3 | Same scene at 100%/70%; card width follows camera scale and readable text remains approximately constant in screen pixels. Ordered compiler manifest is unchanged. At lower zoom, secondary card controls give way to the full inspector | `screenshots/03-preview-offline.png`, `screenshots/04-zoom-70.png`; asserted in desktop test |
| Light theme, C2–C4, W2 | Full reading/editing stays in inspector. Version selection and one draft are separate from recorded historical inputs/settings; theme uses the same geometry | `screenshots/05-light.png`, `screenshots/06-run-history.png`, `screenshots/08-version-draft.png` |
| B1, B3–B7 | Actual pointer connection succeeds. Valid Run creates missing output destinations; completed outputs are ordinary Contexts. The obsolete missing-output restriction in B2 is excluded | `screenshots/07-connected-result.png`; desktop test |
| W3, W4 | A/B pins, deliberate A=B, explicit References, role controls and Force-own-material semantics are implemented. Reference and attachment previews are local | `screenshots/09-attachment.png`, `screenshots/10-pdf-preview.png`; exact compiler tests |
| D1 | Eight-output Explode, stable numbered slots, partial Stop and recovery state. No groups/collapse or obsolete four-output assumption | `screenshots/11-explode-running.png`, `screenshots/12-explode-stopped.png`, `screenshots/13-explode-recovered.png` |
| D2, D3 | Extraction opens a separate Workspace, shows its reconstruction report and connects only selected output slot six. Historical provenance is not current execution | `screenshots/14-extracted-slot-six.png`; no-inference assertion |

Screenshots contain synthetic fixture material. Desktop captures are 1424×891; the large multi-output scene is 1600×1000. The supplied reference panels are 1360×830. These are structural/interaction comparisons, not a pixel-identical claim. The canvas can extend beyond the window and supports panning; the full inspector remains the reading surface. Very small zoom intentionally omits secondary detail instead of changing graph geometry.

During review, a 70% Process card clipped its Run button. The final source collapses secondary controls below 85%, preserving the primary action. The final desktop test verifies that the visible Run control fits its card at 70%. An extraction screenshot initially captured the old Workspace before its asynchronous render; the harness now waits for the new breadcrumb and zooms out for the evidence image.

Native Windows file dialogs and the system browser use their platform appearance. Authentication screenshots are deliberately excluded to avoid publishing account identity.
