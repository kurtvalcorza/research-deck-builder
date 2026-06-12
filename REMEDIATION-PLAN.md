# Research Deck Builder — Remediation Plan

**Status:** IMPLEMENTED — owner decisions recorded 2026-06-12 (see "Decisions"); all workstreams landed the same day. `scripts/validate-contracts.sh` exits 0; CI (G2) enforces it on PRs.
**Date:** 2026-06-12 (audit, review, approval, and implementation)
**Scope:** Fixes identified by the same four-layer audit applied to `research-writer`: (1) Claude Code platform alignment — here, *skill* packaging rather than subagent architecture; (2) instruction/script executability; (3) cross-file artifact-contract consistency; (4) overclaims in docs — plus repo hygiene and drift prevention. Reference patterns: `research-writer/REMEDIATION-PLAN.md` and `research-writer/scripts/validate-contracts.sh`.

---

## Audit evidence (verified, not speculated)

Every behavioral finding below was reproduced during the audit:

- **APA/author-date bibliography → 0 entries parsed.** `map_references.py` on a synthetic APA-style source returns `"entries": {}` and only warns "no numbered bibliography found"; with zero entries, `bib_surnames` is empty and the scrambled-bib check is **silently skipped** — the same prose cite `(Nash, 2023)` that triggers the "scrambled bib?" warning on a numbered source produces no warning on an APA source. The docstring claims "(or an author-date reference list)" support that does not exist. (→ B2)
- **Acronym parentheticals count as citations.** `verify_deck.py`'s `CITATION` regex matches `(REFINE)`, `(AI)`, and `(PARTS)` — confirmed by running the pattern. The citation-presence check can therefore pass with zero real citations, and acronyms get fidelity-checked as surnames. (→ D1)
- **Word-band arithmetic is self-contradictory.** 180–210 words at the stated 2.3 words/sec is **78–91 seconds**, not the claimed 90–120 s; conversely 90–120 s at ~138 wpm would be 207–276 words. The same wrong equation appears in `SKILL.md` Phase 1, the `embed_notes.py` docstring, and `references/script_template.json` `_house_style`. (→ D2)
- **"soffice/poppler are usually preinstalled" disproven by example.** The POSIX sandbox this audit ran in has `soffice` but **no `pdftoppm`**. (→ A4)
- **Clean checks (the toolchain is largely honest):** all four `references/*.json` templates parse; every `--flag` documented in SKILL.md/README exists in the corresponding script's argparse; backup naming (`_BACKUP_citations`/`_BACKUP_notes`/`_BACKUP_bg`, timestamped never-clobber fallback) is implemented exactly as documented in all three editing scripts; citation reinstatement is genuinely idempotent (`cite in para_text` guard); the "ships worked samples for A1, A2, A3, A5, A7, A8, A10, A11" claim matches the 8 sample IIFEs in `build_deck_template.js`; the `"The takeaway:"` marker contract is consistent across SKILL.md, `embed_notes.py` topup, and the script template; SKILL.md frontmatter is compliant (name matches folder, description 850/1024 chars, trigger-rich, third-person); `.gitignore` already excludes every working artifact the "Naming & deliverables" section promises to keep out of version control (node_modules, `*.pptx`, `m*_*.json`, `rv_*/`, `_review/`).

**Platform note (contrast with research-writer):** this repo has none of research-writer's failure class — no stale `Task tool`/`subagent_type` terminology, no fictional orchestrator tier, and its user checkpoints (e.g. Phase 0 outline approval) are legitimate because a skill runs in the main session, not in a subagent. The platform-alignment gaps here are about *packaging and environment claims*, not impossible tool calls.

---

## Goals

1. Every command in SKILL.md/README runs as written from a user workspace: no crash-by-default asset path, no Windows/POSIX command mixups, environment claims match a preflight check.
2. The QA gate's documented promises match what `verify_deck.py` actually checks, and the gate understands every citation style Phase 0 permits.
3. One honest artifact contract: anything called "source of truth" is enforced or checked by a script, or the claim is downgraded.
4. Docs describe an installable skill with honest rendering/environment claims.
5. `scripts/validate-contracts.sh` (shipped with this audit) exits 0 and guards against re-drift.

## Non-goals (this round)

- No changes to the visual design system, archetype catalog, or the BUILD/REPAIR track structure — these are sound and field-proven.
- No `presentation-studio` integration — the boundary reference gets reworded, not built.
- No new pipeline phases.

---

## Workstream A — Platform & packaging alignment (Claude Code skill)

| # | Fix | Files |
|---|-----|-------|
| A1 | **Add an install section.** README never says where the folder must live for Claude Code to discover it. Document: copy/clone to `~/.claude/skills/research-deck-builder/` (personal) or `<project>/.claude/skills/research-deck-builder/` (project); the directory name must match the frontmatter `name`; plugins are the distribution alternative. *Keep it to a few lines — the owner deliberately simplified the README (commit d71f152), and that commit also removed the only sentence identifying this folder as a skill, so the install section now carries that framing too.* | `README.md`, one line in `SKILL.md` |
| A2 | **Defuse the `presentation-studio` dangling reference.** ~~README~~ *(done — the owner removed the README boundary note in d71f152)*. Remaining: the SKILL.md frontmatter boundary still points to a skill not shipped here and possibly not installed. Reword so it degrades gracefully: "…out of scope for this skill; use a general-purpose presentation skill (e.g. presentation-studio, if available)." | `SKILL.md` frontmatter only |
| A3 | **State the working-directory contract once.** Commands are written `python3 scripts/...` and `BG_IMAGE = 'assets/background.jpeg'` as if CWD were the skill root, but decks and artifacts live in the *user's* workspace (npm install is even documented as "in the dir where you'll build decks"). Add: scripts are invoked by path into the skill folder; Phase 2 gains an explicit step "copy `assets/background.jpeg` next to `build_mNN.js` (or set `BG_IMAGE` to an absolute path, or `''` for solid background)". Today a fresh build in a workspace dir crashes at write time on the missing image (the JS comment admits this; the Phase 2 step list omits the copy). | `SKILL.md` (Environment + Phase 2), `README.md` |
| A4 | **Honest environment preflight.** Replace "soffice/poppler are usually preinstalled" with a check command (`command -v soffice pdftoppm`) plus the existing degradation path (run `verify_deck.py` only). Evidence: this audit's sandbox lacked `pdftoppm`. | `SKILL.md` |

**Acceptance:** README has an install path; the validator's overclaim guard passes. *(Do NOT use a plain `grep -F "usually preinstalled" SKILL.md` as the acceptance test — the phrase is line-wrapped in the file, so that grep returns empty today and would false-pass; the validator whitespace-normalizes before matching.)* Phase 2 step list includes the asset step.

---

## Workstream B — Script & instruction executability

| # | Fix | Files |
|---|-----|-------|
| B1 | **Fail-soft on missing background image.** `build_deck_template.js`: `fs.existsSync(BG_IMAGE)` check at startup — warn loudly and fall back to the solid `BG` color instead of letting pptxgenjs throw at `writeFile` after all slides are built. | `scripts/build_deck_template.js` |
| B2 | **Implement (or stop claiming) author-date bibliography parsing.** `map_references.py` parses only numbered entries (`[1]` / `1.`); an APA-style list yields 0 entries and silently disables the scrambled-bib check — the exact failure the script exists to catch. **Resolved (Decision 3): IEEE/numbered-only** — re-scope the docstring and emit an explicit warning: "author-date reference list detected but not parsed; scrambled-bib check skipped." Validator check 11 changes contract: 0 entries is acceptable only with the loud warning. | `scripts/map_references.py`, `scripts/validate-contracts.sh` |
| B3 | **Bare-name cite collection.** The in-text-forms comment lists `(Nash)` but the `AUTHOR_DATE` regex requires a year, so bare-name cites are never collected. Collect them with a second pattern (and include them in the scrambled-bib cross-check) or correct the comment. | `scripts/map_references.py` |
| B4 | **Run-less paragraph bug in reinstate_citations.** A uniquely matched paragraph with zero runs prints `OK S{n} -> cite` and is counted as applied while nothing is written. Classify as a problem ("matched paragraph has no runs — cannot append") so the apply pass refuses to save. | `scripts/reinstate_citations.py` |
| B5 | **Stale phase vocabulary.** `extract_deck_text.py`'s docstring references "Phase 1 (citations)" and "Phase 2/3 (notes/redesign)" — a numbering that no longer exists (current: Phase 0 intake, 1 script, 2 build, 3 QA; REPAIR steps 1–5). Rewrite against the current scheme. | `scripts/extract_deck_text.py` |
| B6 | **Recolor recipe portability.** `sed … ppt/**/*.xml` needs bash `globstar` (off by default — as written it silently misses nested XML); use `find ppt -name '*.xml' -exec sed -i -E 's/OLDHEX/NEWHEX/Ig' {} +`. Also replace the Windows `copy` with `cp` (or show both) in the Phase 3 recovery line, and note the re-zip must run from inside the extracted dir so `[Content_Types].xml` stays at archive root. | `SKILL.md` |
| B7 | **Render-dir lifecycle clarity.** `render_and_check.sh` leaves `rv_<timestamp>` dirs forever, and the golden rule ("don't try to delete or reuse the old one") reads as *never* delete. Clarify: locked only while soffice runs; safe to delete afterwards. Add one cleanup sentence to SKILL.md and a best-effort `rm -rf "$D"` (or a printed cleanup hint) at script end. | `scripts/render_and_check.sh`, `SKILL.md` |
| B8 | **`_`-key parity between JS and Python.** The build template deletes only `_comment`/`_house_style`; the Python scripts ignore *every* `_`-prefixed key. Filter all `_` keys in the JS (also corrects the "(N slides)" load log). | `scripts/build_deck_template.js` |

**Acceptance:** validator functional check (author-date refmap) and stale-vocab guard pass; a Phase 2 build in an empty workspace dir completes with a solid-BG warning instead of crashing.

---

## Workstream C — Artifact contract reconciliation

The pipeline's artifacts: `mNN_refmap.json` → `mNN_outline.json` → `mNN_script.json` → deck → QA. Only the script JSON has an enforced sync loop (`embed`/`export`).

| # | Fix | Files |
|---|-----|-------|
| C1 | **Enforce the outline's "source of truth" claim — or downgrade it.** No script consumes `mNN_outline.json`: Phase 2 is a manual transcription into `build_mNN.js` IIFEs, and `verify_deck.py` checks the deck against the *source*, never the outline. Outline↔deck drift is undetectable today. *Recommended:* add `--outline mNN_outline.json` to `verify_deck.py` — check slide count (subsuming manual `--expect`), per-slide title presence, and that every outline citation string appears on its slide. *Fallback:* reword the source-of-truth rule to "the script JSON is authoritative for notes; the outline is the reviewed plan". | `scripts/verify_deck.py`, `SKILL.md` |
| C2 | **One citation grammar across the toolchain.** Today: `verify_deck.py` accepts author-date + bare-name (plus the D1 acronym false-positives); `map_references.py` requires author-date-with-year; numbered `[1]` style is **invisible to the QA gate** — yet Phase 0 explicitly permits keeping a numbered style, in which case every slide reports "no inline citation detected" and the fidelity check never fires, silently gutting the headline promise. Fix: state the supported grammar in SKILL.md; *recommended:* add numbered-cite support to `verify_deck.py` (resolve `[n]` → surnames via `--refmap mNN_refmap.json`); *fallback:* constrain Phase 0 to author-date on slides and say the gate enforces only that. | `scripts/verify_deck.py`, `scripts/map_references.py`, `SKILL.md` Phases 0 & 3 |
| C3 | **Unconsumed `citation_style` field.** `outline_template.json` declares `"citation_style"` but nothing reads it — wire it into the C1/C2 checks or drop it from the template. | `references/outline_template.json` |
| C4 | **Slide-reorder hazard.** Script JSON, outline, and the template's `note(s, k)` calls are all keyed by slide number; reordering slides bakes notes onto the wrong slides with nothing detecting it. Add the rule to SKILL.md (after any reorder: re-key the JSONs, re-run `embed_notes.py report`) and optionally a `--script` cross-check in `verify_deck.py` (deck notes == script JSON text). | `SKILL.md`, `scripts/verify_deck.py` (optional) |
| C5 | **Fidelity coverage gaps are an undocumented contract.** Only the *lead* surname of each citation is checked — co-author surnames (`Choo` in `(Park & Choo, 2024)`) and years are never verified against the source; the stat filter is `%`/decimal/comma/`>20` only. Cheap fix: check every capitalized surname in the matched cite plus the year token. At minimum, list what the gate does NOT check in SKILL.md Phase 3. | `scripts/verify_deck.py`, `SKILL.md` |

**Acceptance:** injecting a fake citation or wrong title into a worked-example build is caught by `verify_deck.py --outline`; a numbered-style deck no longer reports "no inline citation detected" on every slide (or SKILL.md explicitly forbids numbered style on slides).

---

## Workstream D — QA-gate honesty & determinism

| # | Fix | Files |
|---|-----|-------|
| D1 | **Tighten the CITATION regex.** `(REFINE)`, `(AI)`, `(PARTS)` currently count as citations (verified). Require a year OR a lowercase letter in the name token — keeps `(Nash)` and `(McDonald)`, drops ALL-CAPS acronyms. The validator's functional check is the acceptance test. **Coupling note:** validator check 12 hardcodes the bare-name policy (`(Nash)` must match; acronyms must not) — if Decisions 2/3 change what counts as a citation, `verify_deck.py` and `validate-contracts.sh` must change in the same commit. | `scripts/verify_deck.py`, `scripts/validate-contracts.sh` (if policy changes) |
| D2 | **Fix the word-band arithmetic everywhere, consistently.** **Resolved (Decision 4): keep the 90–120 s anchor** — the band becomes **200–270 words** (200/2.3 ≈ 87 s, 270/2.3 ≈ 117 s; both within the validator's 10% tolerance of the claimed 90–120 s). Change together: `MIN_W`/`MAX_W` in `embed_notes.py` + its docstring, `verify_deck.py` `--min-words`/`--max-words` defaults, `SKILL.md` Phase 1, and `script_template.json` `_house_style` + sample text. | `SKILL.md`, `scripts/embed_notes.py`, `scripts/verify_deck.py`, `references/script_template.json` |
| D3 | **Re-scope the gate's claims to what it does.** "a programmatic QA gate that verifies citations and stats against the source" (frontmatter) and "faithful citations" (README) overpromise: the implementation checks that cited surnames and stat-like numbers *appear somewhere in the source*, as SOFT warnings by default. It cannot detect a right-surname-wrong-claim attribution, and by default fidelity misses don't fail the build. Reword ("checks every cited surname and on-slide stat appears in the source; `--strict` makes misses fatal") and recommend `--strict` for final delivery in Phase 3. | `SKILL.md` frontmatter + Phase 3, `README.md` |

**Acceptance:** validator word-band-arithmetic and acronym-guard checks pass; frontmatter description matches `verify_deck.py`'s actual checks.

---

## Workstream E — Doc overclaims & quick-start accuracy

| # | Fix | Files |
|---|-----|-------|
| E1 | **"renders correctly anywhere"** → true for icons (vector shapes), not for text: Segoe UI / Consolas substitute on machines without them. Reword to claim exactly the icon guarantee plus graceful font substitution. | `README.md` |
| E2 | **Provenance framing.** The claim (now worded "proven on a seven-module research-training series (94 slides)" after the owner's anonymization) is honestly disclosed as not shipped — keep it, but label Part B of `SLIDE_BLUEPRINTS.md` as the only artifact verifiable from this repo. One-line wording change. | `README.md`, `SLIDE_BLUEPRINTS.md` |
| E3 | **python-pptx version risk.** `apply_background.py` uses `slide.part.get_or_add_image_part` — not a public python-pptx API. Test against current python-pptx (1.x) and pin a verified range (e.g. `python-pptx>=0.6.21,<2`) with a note. | `requirements.txt`, `scripts/apply_background.py` |

**Acceptance:** validator overclaim guards pass; pinned range documented as tested.

---

## Workstream F — Repo hygiene

| # | Fix | Files |
|---|-----|-------|
| F1 | ✅ **DONE (PR #2, merged).** `scripts/validate-contracts.sh` and `REMEDIATION-PLAN.md` are listed in the README folder tree, with a "Repo tooling" section explaining the validator's intentional non-zero exit. | `README.md` |

*(An earlier draft flagged a missing `.gitignore`; on inspection one exists and is thorough — recorded under clean checks instead. The validator keeps it as a regression guard.)*

---

## Workstream G — Drift prevention

| # | Fix | Files |
|---|-----|-------|
| G1 | **`scripts/validate-contracts.sh`** — shipped with this audit (bash + python3 stdlib, no deps). Checks: SKILL.md frontmatter sanity (name↔folder, description ≤1024); doc↔script wiring (every script/template referenced, every referenced file exists); documented `--flag` drift against argparse; JSON template validity; backup-phase parity; word-band parity *and arithmetic*; archetype-sample parity (docs vs sample IIFEs); icon-font ban in the JS; asset existence for `BG_IMAGE`; `"The takeaway:"` marker parity; **two functional checks** (author-date refmap parsing, CITATION-regex acronym rejection); stale-vocab and overclaim guards; `.gitignore` presence. Exit 1 on any violation. | `scripts/validate-contracts.sh` |
| G2 | **CI:** GitHub Actions workflow running G1 on PRs touching `SKILL.md`, `README.md`, `SLIDE_BLUEPRINTS.md`, `scripts/`, `references/`. *Approved (Decision 5) and shipped.* | `.github/workflows/validate.yml` |

---

## Validator status at audit time

`scripts/validate-contracts.sh` currently reports exactly the machine-checkable subset of the findings — these are **expected failures until the mapped fix lands**:

| Failing check | Maps to |
|---|---|
| Functional: author-date reference list parses 0 entries | B2 |
| Functional: CITATION regex accepts `(REFINE)` / `(AI)` / `(PARTS)` | D1 |
| Word-band arithmetic (180–210 w @ 2.3 w/s ≠ 90–120 s) | D2 |
| Stale phase vocabulary in `extract_deck_text.py` | B5 |
| Overclaim guard: "renders correctly anywhere" | E1 |
| Overclaim guard: "usually preinstalled" | A4 |

All other checks pass today. **Overall acceptance for this plan: the validator exits 0.**

**Implementation status (2026-06-12):** all six expected failures cleared — the validator exits 0. Functional verification during implementation: a synthetic deck passed the full gate (`--outline` + `--source` + `--refmap`); injected outline drift (renamed title, phantom citation) produced HARD failures; numbered-cites-without-refmap produced the soft reminder; `apply_background.py` verified working on python-pptx 1.0.2.

---

## Sequencing & PR strategy

Order: **B + D** (script behavior and gate honesty first — code must match its own claims before docs are rewritten) → **C** (contracts; C1/C2 build on the B2/D1 decisions) → **A + E** (docs rewritten once, against the final behavior) → **G2** (CI last; G1 shipped with the audit and goes green as the workstreams land). *(F is already complete — PR #2.)*

Proposed delivery: either one PR per workstream group (3 stacked: ① B+D code fixes, ② C contracts, ③ A/E docs + G2 CI if approved) or a single PR — owner's call (Decision 6).

## Deferred nits (recorded, not scheduled)

Noted during the pre-implementation review; loud or low-impact enough to leave out of scope unless they bite:

- `embed_notes.py check_keys` crashes with a raw `ValueError` on a non-integer, non-underscore key in the script/topups JSON (fails loudly, just ugly).
- The B6 recolor `sed … /Ig` case-insensitive flag is GNU-sed-only; macOS/BSD sed lacks `I` (the skill's documented platforms — Windows/WSL, Linux sandboxes — all have GNU sed).
- `verify_deck.py`'s icon-ligature heuristic exempts a whole slide if *any* run on it uses Consolas, so a code slide can mask a broken icon ligature elsewhere on the same slide.

## Decisions (resolved 2026-06-12)

1. **C1 — outline enforcement:** YES — add `--outline` checks to `verify_deck.py` (slide count, per-slide titles, per-slide citation strings; HARD failures).
2. **C2 — citation grammar:** YES — add numbered-cite (`[n]`) support to the QA gate, with `--refmap mNN_refmap.json` resolving entries for fidelity checks.
3. **B2 — bibliographies:** IEEE/numbered-only. Do NOT implement APA parsing; re-scope the docstring and emit a loud "author-date list not parsed; scrambled-bib check skipped" warning instead. (Owner: sources use IEEE-style numbered references.)
4. **D2 — word band:** keep the **90–120 s** anchor; the word band changes to **200–270 words** (≈90–117 s at ~2.3 w/s) — `MIN_W`/`MAX_W`, `verify_deck` defaults, SKILL.md, and the script template all change together.
5. **G2 — CI:** YES — add the GitHub Actions check.
6. **PR granularity:** sequenced commits (one per workstream group) on the single session branch — true stacked PRs aren't available in this environment; the recommendation is adapted accordingly.
