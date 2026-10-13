# Mockup reference pack — qualified visual baseline

**Pack revision:** 1.0, 13 October 2026.

**Source:** [Flamehorn Desktop mockup atlas](https://flamehorn-desktop-design-review.tpilepich.chatgpt.site), artwork revision 0.6, Sites saved version 8.

**Source commit:** `c971a92599bbc2e823b11af0de8c5bcc16d3231c`.

**Saved version ID:** `appgprj_6ac99328622481918ceeb7146f88f672~appgver_6d1a76d135c4819198e22ec2e8d0ba49`.

**Local source:** Original full-size SVGs copied unchanged from that source commit. 19 panels × Charcoal/Light = 38 files. Site access remains private; the local pack is usable offline.

Open [the local visual index](index.html). Each image links to its full-size source; the table below is the authoritative status and qualification register. The upstream artwork/manifest retains its historical Draft annotations. User acceptance on 13 October and this register qualify its visual use; they do not retroactively make obsolete drawn behavior correct.

## Status and annotation legend

- **Approved visual reference:** preserve style, composition and valid interaction meanings, applying the correction stated here.
- **Superseded interaction:** B2's missing-output disabled state and D1's four-output/group semantics must not be implemented. Their original drawings are retained for traceability and style only.
- **Review only:** letter/number sheet labels, explanatory side notes, Draft stamps, gallery header/navigation, example content and the website's skin controls are documentation—not product requirements.
- New controls not pictured, including role toggle, master templates and recovery, use the accepted specifications and this compact style. Do not invent functionality from an annotation.
- Both skins are supplied. Typography/focus/contrast refinements are allowed while preserving the established hierarchy. A dark/light theme switch is a bounded presentation choice, not a requirement inferred solely from gallery controls.

## Panel register

| Panel | Original title | Full-size Charcoal | Full-size Light | Approval / required reconciliation |
| --- | --- | --- | --- | --- |
| A1 | Desktop & reading | [SVG](art/w1-dark.svg) | [SVG](art/w1-light.svg) | Visual composition approved. Groups, folders and collapsed Workspaces are deferred; generic Context roles replace separate User/Model types. |
| A3 | Semantic zoom / two Workspace views | [SVG](art/a3-dark.svg) | [SVG](art/a3-light.svg) | Semantic-zoom geometry approved: same camera center/world graph, 65% and 100%, 13 px body text. Old labels, extra Respond input and Reference checkbox wording are superseded. |
| B1 | Source-pin creation palette | [SVG](art/b1-dark.svg) | [SVG](art/b1-light.svg) | Palette placement approved. Use the complete thirteen-Process catalogue; choosing a Process still does not run it. |
| B2 | Process without output | [SVG](art/b2-dark.svg) | [SVG](art/b2-light.svg) | SUPERSEDED interaction state: missing output does not block Run. Retain style only; valid admission creates missing destinations. |
| B3 | Destination creation palette | [SVG](art/b3-dark.svg) | [SVG](art/b3-light.svg) | Optional manual destination gesture approved. Create generic Context with Assistant role; manual destination creation is not required before Run. |
| B4 | Configured, not run | [SVG](art/b4-dark.svg) | [SVG](art/b4-light.svg) | Pending-state visual treatment approved. Generic Context, not a separate Model Context type. |
| B5 | Running | [SVG](art/b5-dark.svg) | [SVG](art/b5-light.svg) | State treatment approved. Runtime defines Stop, provisional streaming, locks and per-slot progress. |
| B6 | Completed & continued | [SVG](art/b6-dark.svg) | [SVG](art/b6-light.svg) | Direct continuation approved for any Context roles, not only Model-to-User. |
| B7 | Failed first run | [SVG](art/b7-dark.svg) | [SVG](art/b7-light.svg) | Failure-state treatment approved. Runtime defines retry, partial results and recovery; a failure is not an empty completed version. |
| C1 | Current Process configuration | [SVG](art/c1-dark.svg) | [SVG](art/c1-light.svg) | Inspector placement approved. Use Persona/Format, Append and master-template controls from accepted specs; no inline prompt editor. |
| C2 | Full Context reading | [SVG](art/c2-dark.svg) | [SVG](art/c2-light.svg) | Full content and separate history inspection approved; add the generic Context role toggle. |
| C3 | Rerun → version 2 | [SVG](art/c3-dark.svg) | [SVG](art/c3-light.svg) | Rerun/version behavior approved. Cowboy is illustrative text, not an extra built-in Persona. |
| C4 | Selected content vs history | [SVG](art/c4-dark.svg) | [SVG](art/c4-light.svg) | Historical/current distinction approved. Future runs use selected versions and current wiring; historical inspection uses frozen evidence. |
| D1 | Explode into four outputs | [SVG](art/d1-dark.svg) | [SVG](art/d1-light.svg) | SUPERSEDED count/group semantics: Explode has eight slots; groups/collapse are deferred. Preserve compact multi-output layout style. |
| D2 | New Workspace from Here | [SVG](art/d2-dark.svg) | [SVG](art/d2-light.svg) | Extraction entry gesture approved. Data §8 settles version/role conflicts, missing records and unused siblings. |
| D3 | A smaller independent branch | [SVG](art/d3-dark.svg) | [SVG](art/d3-light.svg) | Independent extracted Workspace approved. Data §8 governs isolated provenance and retained historical roles. |
| W2 | Node detail & persona picker | [SVG](art/w2-dark.svg) | [SVG](art/w2-light.svg) | Compact picker and node anatomy approved. Replace old Tone/preset examples with approved Persona/Format; local Custom plus gear in inspector. |
| W3 | Multi-input Merge | [SVG](art/w3-dark.svg) | [SVG](art/w3-light.svg) | Two distinct Merge A/B pins approved. Merge is in MVP; Compiler §3 settles order and shared ancestry. |
| W4 | Reference nodes & inclusion | [SVG](art/w4-dark.svg) | [SVG](art/w4-light.svg) | Explicit Reference-node treatment approved. Label Force include in context; use same-Workspace scope, deduplication and Reference input/output pins. |

## Visual tokens from the original drawing source

These are the drawing tokens, not the gallery stylesheet.

| Token | Charcoal | Light |
| --- | --- | --- |
| Background | #181a1e | #d8dce0 |
| Surface | #202328 | #e5e8eb |
| Panel | #25282e | #eceef0 |
| Card | #292d33 | #f4f5f6 |
| Text block | #202328 | #ffffff |
| Border | #454c57 | #b1bac5 |
| Text | #dedfe3 | #29333e |
| Muted text | #a2a9b3 | #616d7b |
| Selection outline | #318bd4 | #0875b9 |
| Selection fill | #073f64 | #d3e7f6 |
| Input pin | #56b8e9 | #1483b7 |
| Output pin | #e2ae51 | #b67a0b |

Original SVGs use DejaVu Sans/sans-serif; body text is usually 13 px with 18 px leading. W2 illustrates 27 px picker filter and 23 px rows. Most panels are 1360×830; A3 is 1360×1370 and W2 1220×720. The implementation may use an available readable system font and adjust sizing for accessibility; do not shrink the entire window like a bitmap.

A3's geometry fixture is retained in [zoom-geometry.json](zoom-geometry.json). All nodes and connections share the camera transform while text remains approximately constant in screen space. This geometric property remains valid even though some labels and pin counts in the old scene are superseded.

## Provenance and validation

[pack.source.json](pack.source.json) preserves the original panel metadata and unresolved notes as historical evidence. It is not an independent specification. [asset-manifest.json](asset-manifest.json) records dimensions, byte counts and SHA-256 for every SVG. Verify artwork against that manifest before launch.

The copied SVGs are original reference drawings; no new product mockup or application was built in FLAME-145. The documentation index only displays reference artwork.
