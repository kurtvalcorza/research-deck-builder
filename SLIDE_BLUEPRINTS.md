# Slide Blueprints

The per-slide *content structure* used in this deck system. Part A is the catalog of
reusable slide **archetypes** (the layout recipes). Part B is the **worked example** —
exactly how Module 01's 15 slides map onto those archetypes. Part C notes reuse across the
other modules.

**Where this fits in the pipeline:** archetype assignment happens in **Phase 0**
(Intake & Outline) and is recorded per slide in `mNN_outline.json` (see
`references/outline_template.json`). Part B below is exactly what a finished Phase 0
outline looks like, rendered as a table. Assignment rules: open with A1, close with A11,
never two adjacent slides with the same archetype, one A3 stat + one A5 matrix per
module where the content supports it.

Build each slide as its own IIFE in the pptxgenjs script; pick an archetype per slide and
**vary them** so the deck never repeats the same layout twice in a row. Helpers referenced
below (`title`, `card`, `chip`, `arrow`, `circle`, `vcheck`, `warnIcon`, `flowNode`) are
defined in `scripts/build_deck_template.js`. Canvas is 13.333 × 7.5 in; margin `M = 0.62`.

**Ready-made samples:** the template ships a worked IIFE for A1, A2, A3, A5, A7, A8, A10,
and A11 — copy the closest one and refill it rather than laying out from scratch (the
"avoid" sizing rules are already baked in). A4, A6, and A9 are described below; build them
from the same helpers (`flowNode` + `arrow` give you A6/A9 pipelines). After building, run
`scripts/verify_deck.py` — it fails the build if any icon-font text survived (the defect
the vector-icon rule exists to prevent).

---

## Part A — Archetype catalog

### A1. Title / section opener
**Use:** slide 1, major section breaks.
**Structure:** four teal corner brackets; teal vertical bar; eyebrow (`MODULE NN`, teal,
letter-spaced); 1–2 line title (~42pt); one muted subtitle line. No cards.

### A2. Two-column compare + callout band
**Use:** contrast a wrong/old way vs. a right/new way.
**Structure:** two equal `card`s at `y≈1.35`, height ~3.35. Left = muted `PANEL` (eyebrow +
heading + body + citation). Right = `PANEL2` with teal border (eyebrow + 3–4 numbered
`chip` rows). Bottom = full-width `card` with a teal left bar holding a one-line synthesis +
citation.

### A3. Stat callout + supporting cards
**Use:** lead with a number or before/after metric.
**Structure:** left `PANEL2` panel with eyebrow, two large stats (44–60pt) joined by an
`arrow` (e.g., `85% → 98%`), a label under each, and a caption+citation. Right = two
stacked `card`s (e.g., a risk in `AMBER`, a conclusion in `TEAL`). **Size the stat box to
the text** — `44pt "85%"` needs ~1.9 in or it wraps.

### A4. Code/example panel + framework rows
**Use:** show a concrete example beside a named framework.
**Structure:** left dark panel (`10203A`/`PANEL`) with eyebrow + several `Consolas` lines,
each in a different category color. Right = 5-ish rows, each a letter/number `chip` + bold
label + one-line description. Footer citation via `foot()`.

### A5. Multi-column matrix
**Use:** compare 3–4 parallel options on the same dimensions.
**Structure:** N equal `card`s; each gets a thin colored top border (category color), a
colored category title, then repeated labelled segments (`MECHANISM` / `BEST FOR` /
`IMPACT`, muted small-caps label + body), and a per-card citation at the bottom.

### A6. Process / pipeline flow
**Use:** show a sequence or a loop.
**Structure:** a band `card` containing horizontal nodes (rounded rects) joined by
`arrow`s; the final node highlighted in `PANEL2`+teal. Optional small italic label above an
arrow (e.g., "iterate"). Often paired with explanatory cards above or below.

### A7. Step row (icon/number row)
**Use:** an N-step framework or method.
**Structure:** a row of equal `card`s, each with a centered letter/number `chip`, a bold
step name, and a short caption. Optionally a callout band beneath (big `chip` + heading +
body) for a rule or key stat.

### A8. Stacked checklist rows
**Use:** a documentation checklist or standards list.
**Structure:** full-width `card` rows stacked with a small gap; each row = a `vcheck` chip +
big index number + bold label + description (with inline citation). Use the drawn `vcheck`,
never a font tick.

### A9. Phase model (with arrows)
**Use:** an end-to-end model in 3 phases.
**Structure:** 3 `card`s, each with a number `chip`, phase title, one-line description, and
2 bulleted sub-points (`circle` bullet + text); `arrow`s between cards; a centered caption +
citation beneath.

### A10. Warning cards
**Use:** risks / cautions.
**Structure:** 2–3 `card`s, each with a `triangle` + `!` icon, a heading, a body paragraph,
and a citation. Amber accent.

### A11. Closing mandate
**Use:** final slide.
**Structure:** corner brackets (like A1); eyebrow (`THE MANDATE`); one bold statement; 3
small support `card`s (each a short teal tick + label + line); centered citation.

---

## Part B — Worked example: Module 01 (15 slides)

*(The only pipeline artifact reproduced in this repo — the source modules and finished
decks of the reference series are not shipped.)*

| # | Archetype | Title | Content blocks | Citation(s) |
|---|-----------|-------|----------------|-------------|
| 1 | A1 Title | Advanced Prompt Engineering for Research Tasks | eyebrow MODULE 01; subtitle "A methodological playbook…" | — |
| 2 | A2 Compare + band | From Search Engine to Experimental Protocol | L: Zero-Shot Risk; R: Structural Prompting (Contextual Rules / AI Reasoning / Source Database / Human Logic); band: The Paradigm Shift | Sun et al. 2025; Qian 2025; Kulkarni 2024; Kawakita et al. 2025 |
| 3 | A3 Stat | The Mathematical Impact of Prompt Architecture | L: 85% → 98% (Generic vs Structured); R: Cost of Poor Design, The Bottom Line | Kulkarni 2024; Kawakita et al. 2025 |
| 4 | A4 Code + rows | Anatomy of a Scholarly Prompt | L: system-prompt construction (5 color-coded lines); R: PARTS rows (Persona/Aim/Recipients/Theme/Structure) | Park & Choo 2024 |
| 5 | A4 Rows + cards | The Language of Rigor | L: CLEAR rows (Concise/Logical/Explicit/Adaptive/Restrictive); R: Pitfall card + Enforce Boundaries card | Park & Choo 2024; Kulkarni 2024 |
| 6 | A5 Matrix (4-col) | Diagnostic Matrix: Research Prompting | Role-based / Few-shot / Chain-of-thought / Context-Constraint, each MECHANISM·BEST FOR·IMPACT | Qian 2025; Sun et al. 2025; Magana et al. 2025; Leung 2024; Kulkarni 2024 |
| 7 | A6 Flow + 2 cards | Iterative Prompting: The Self-Refine Engine | cards: Self-Refine Model, RCI; flow: Generic Output →(iterate)→ Rigorous Academic Insight | Cohen & Aperstein 2024 |
| 8 | A6 Flow + 2 cards | The R-HiTL Paradigm | flow: Draft Generation → Human Gate → Refinement Loop; cards: Algorithmic Coaches, Diagnosing Blind Spots | Saravi et al. 2025 |
| 9 | A7 Step row + callout | The REFINE Framework in Practice | 6 letter chips (R/E/F/I/N/E); callout: The Rule of Four | Park & Choo 2024; Tour & Zadorozhnyy 2025 |
| 10 | A6/A10 bands | Taming Complexity via Modular Decomposition | The Error band; 3 sub-task chips (Lit Synthesis / Methodology / Tone) with arrows; The Solution band | Chow 2025; Olla et al. 2025 |
| 11 | A10 Warning cards | The Imperative of Transparency | Reproducibility Crisis; Data Privacy Risks (warning triangle + body each) | Kawakita et al. 2025; Lund et al. 2024 |
| 12 | A8 Checklist rows | The Reproducibility Ledger | 4 rows: Verbatim Prompts / Model & Version / Parameter Settings / Limitations & Errors | Magana et al. 2025; Sun et al. 2025; Bai et al. 2026 |
| 13 | A6 Pipeline + 3 cards | Quality Assurance & Bias Mitigation | pipeline: Raw → Filtering → Verified; cards: Cross-Validation / Domain Expert Review / Bias Mitigation via XAI | Kawakita et al. 2025; Saravi et al. 2025; Magana et al. 2025 |
| 14 | A9 Phase model | The Accountable AI Integration Model | 3 phases: Structured Input / Human–AI Recursive Loop / Validation & Output (2 sub-points each) | Sun et al. 2025 |
| 15 | A11 Closing | Maintaining Scientific Integrity | THE MANDATE "Apply with accountability"; 3 cards: Harness / Hold / Keep it human | Park & Choo 2024 |

---

## Part C — Reuse across the other modules

The same archetypes carry the whole series; only the content changes:

- **A1/A11** open and close every module.
- **A5 matrix** — Module 02 "Domains of Authority" and "Calibration Matrix"; Module 03
  "Evolving the Protocol"; Module 04 "Methodological Boundary"; Module 05 "IMRAD Utility
  Matrix"; Module 06 "Bibliometric Decoder"; Module 07 "Diagnostic Matrix" / "Division of
  Labor".
- **A6 flow / A9 phase model** — any "lifecycle", "funnel", "pipeline", "workflow", or
  "engine" slide (Module 02 AKD lifecycle & methodology engine; Module 03 phases &
  verification protocol; Module 06 AI Handshake; Module 07 revision lifecycle).
- **A3 stat** — headline numbers (Module 03 18,000→65; Module 04 147.5h vs 40h; Module 06
  60%/80%, 87%, 81%).
- **A7 step row / A8 checklist** — rules lists and checklists (Module 05 "6 Rules"; Module
  03 & 07 verification checklists).
- **A10 warning cards** — risk/ethics slides (Module 05 fraud; Module 06 ethical traps;
  Module 07 danger zone & guardrails).

**Rule of thumb per deck:** open with A1, alternate A2–A10 so no two adjacent slides share a
layout, and close with A11. Aim for one stat slide (A3) and one matrix (A5) per module where
the content supports it.
