---
name: research-deck-builder
description: >
  End-to-end pipeline that turns a written research/training module (Markdown with
  references and a bibliography) into a polished, presenter-ready PowerPoint deck:
  source intake and slide outline, accurate inline citations, ready-to-read speaker
  notes, a consistent dark + blue visual system with vector icons, and a programmatic
  QA gate that enforces the approved outline and checks that every cited surname and
  on-slide stat appears in the source. Also repairs/upgrades
  existing decks (reinstate dropped citations, embed notes, re-skin backgrounds).
  Triggers: "turn this module into slides", "build a deck from this research",
  "cross-check citations in the deck", "write speaker notes", "redesign these slides",
  "make a presenter script". Boundary: use this for decks built from a cited
  research/training source document; for event, policy, keynote, or general-purpose
  decks, use presentation-studio instead.
---

# Research Deck Builder

Complete pipeline for converting a source module (`.md` with a bibliography) into a
finished, branded, presenter-ready deck (`.pptx`). Proven on a seven-module
research-training series (94 slides).

## Two tracks

- **BUILD track** (the pipeline): no deck exists yet. Phase 0 Intake & Outline →
  Phase 1 Speaker Script → Phase 2 Build → Phase 3 QA. Run in that order — the
  outline and script JSONs are *inputs* to the build.
- **REPAIR track**: a deck already exists (often AI-generated elsewhere) and needs
  citations reinstated, notes embedded, or a visual re-skin. See "Repair track" below.

**Source-of-truth rule:** the JSON artifacts (`mNN_outline.json`, `mNN_script.json`)
are authoritative for any (re)build. After ANY in-deck notes edit (topup, hand edit),
immediately re-sync with `embed_notes.py export` — otherwise a later rebuild bakes the
stale JSON and silently reverts your edits.

---

## Environment assumptions & setup

Phases 0–2 need only Python 3.9+ (`python-pptx`) and Node (`pptxgenjs`). Phase 3's
visual render additionally needs LibreOffice (`soffice`) and poppler (`pdftoppm`).

```bash
pip install python-pptx        # add --break-system-packages on externally-managed envs
npm install pptxgenjs          # run in the dir where you'll build decks
```

- **Windows (local):** run python/node natively. For Phase 3 rendering, install
  LibreOffice + poppler (`scoop install libreoffice poppler` or choco), or use WSL;
  `render_and_check.sh` is a bash script. If rendering isn't available, still run
  `verify_deck.py` (structural + fidelity gates) and inspect the deck in PowerPoint.
- **POSIX sandbox (e.g. a cloud agent shell):** soffice/poppler are usually
  preinstalled. If file tools and the shell see different mount paths, copy renders
  into a folder the file tools can reach before viewing, and clean up after.
- Always work on a **copy** of the deck in a working dir, never the only original.

---

## Golden rules (learned the hard way)

- **Backups are automatic and phase-named.** The citation/notes/background scripts back
  up to `_BACKUP_citations` / `_BACKUP_notes` / `_BACKUP_bg` and never overwrite an
  existing backup. For the XML recolor pass, still `cp deck.pptx deck_PRECOLOR.pptx`
  yourself first.
- **JSON artifacts are the source of truth** for builds; export notes back to JSON
  after any in-deck edit (see source-of-truth rule above).
- **Author text in JSON files**, then embed via script. Avoid double-quotes inside the
  JSON string values (use single quotes for quoted phrases).
- **The source bibliography may be scrambled** — numbered references frequently don't
  match the in-text author surnames. `map_references.py` detects this. Cite by the
  surname used in the source *prose*, flag the mismatch to the user, and recommend
  repairing the `.md` reference list separately.
- **Every stat verbatim, every claim attributed.** Numbers go onto slides exactly as
  the source states them, with their citation; `verify_deck.py --source` enforces both.
- **Append citations before the final period**, to the paragraph's **last run**, so the
  new text inherits that run's formatting (`reinstate_citations.py` does this).
- **Icons = vector shapes, never an icon font** — fonts break on machines without them;
  `verify_deck.py` hard-fails any leftover icon-font text.
- **Render dirs get locked** by LibreOffice while it runs. Use a fresh timestamped dir
  each render (`render_and_check.sh` does this, and cleans it up afterwards — the lock
  only persists while soffice is running); never reuse a previous render dir.

---

## BUILD track

### Phase 0 — Intake & outline (the content plan)

Goal: a reviewed `mNN_outline.json` — the authoritative slide-by-slide content plan.

1. **Read the source `.md` in full.** Note the in-text citation style (numbered `[1]`
   vs author-date) and the module's core argument.
2. **Map the references:**

   ```bash
   python3 scripts/map_references.py --source "NN. Module Title.md" --out mNN_refmap.json
   ```

   This extracts the bibliography, collects in-text citations, and **warns on scrambled
   bibliographies** (prose surnames missing from the reference list, cites to
   nonexistent entry numbers). Surface any warnings to the user before proceeding.
3. **Select the content.** Work through the source section by section:
   - **One idea per slide**, stated as a takeaway, not a topic ("Structure beats
     cleverness", not "About prompting"). Target **12–18 slides** per module.
   - Carry over **every load-bearing stat verbatim** with its citation; drop decorative
     detail. Prefer the source's own contrasts, frameworks, and sequences — they map
     directly onto archetypes.
   - **Decide the citation style** for the deck: match the source's author-date style if
     it has one; if the bibliography has duplicate or odd surnames, prefer author-date
     `(Park & Choo, 2024)` for disambiguation.
4. **Assign an archetype to every slide** from the catalog in `SLIDE_BLUEPRINTS.md`
   (A1–A11). Rules: open with **A1**, close with **A11**, never two adjacent slides
   with the same archetype, aim for one **A3 stat** and one **A5 matrix** per module
   where the content supports it.
5. **Author `mNN_outline.json`** (see `references/outline_template.json`): per slide —
   archetype, title, content blocks (mirroring the archetype's structure), exact
   citation strings, a `source_anchor` (heading or unique phrase in the source this
   slide traces to), and a 1–2 line `notes_brief`.
6. **Checkpoint: present the outline to the user** (slide list + archetypes + citations)
   and get approval before building. Outline changes are cheap; rebuilds are not.

### Phase 1 — Speaker script

Goal: `mNN_script.json` — a spoken script for every slide, written from the outline.

**Style spec (see `references/script_template.json` for a worked example):**

- **Length:** content slides 90–120 seconds ≈ **200–270 words** (~2.3 words/sec,
  ~138 wpm). **Title and closing slides: 30–60 words** — they are exempt from the band.
- **Tone:** clear, concise, professional, spoken aloud. Audience = researchers learning
  to use AI rigorously.
- **Rules:** get straight to the point; short sentences; sound like a real presenter;
  **avoid** academic openers ("This slide marks…", "At the heart of the module…");
  focus on each slide's main contrast or takeaway; **end every slide with one strong
  takeaway sentence** (literally start it "The takeaway: …").
- Keep citations on the slides, not spoken (unless the user wants them voiced).

Write `{"1": "...", "2": "..."}` keyed by slide number, matching the outline. No
double-quotes inside values.

### Phase 2 — Build

Goal: `NN Short_Name_REDESIGN.pptx` built from the outline, with citations in the slide
text and notes baked in.

1. Copy `scripts/build_deck_template.js` to a per-module `build_mNN.js`.
2. Fill one IIFE per slide from `mNN_outline.json`. The template ships **worked sample
   slides for archetypes A1, A2, A3, A5, A7, A8, A10, A11** — copy the closest sample
   and refill it (the sizing "avoid" rules are baked in). A4/A6/A9 build from the same
   helpers (`flowNode` + `arrow` give you pipelines). **Citations from the outline go
   into the slide text now** — they are content, not decoration.
3. Build, passing the script JSON explicitly (it warns loudly if missing):

   ```bash
   node build_mNN.js mNN_script.json "NN Short_Name_REDESIGN.pptx"
   ```

**Design system (dark + blue accent) — reuse these tokens:**

| Token | Hex | Use |
|---|---|---|
| BG | `0E1A2B` | slide background (solid fallback) |
| PANEL / PANEL2 | `16263F` / `1B3150` | cards / accent cards |
| STROKE | `2A3F5F` | card borders |
| ACCENT | `5EA8FF` | primary accent (`TEAL` is a back-compat alias) |
| ACCENT_SOFT | `8FC4FF` | secondary accent (`TEALSOFT` alias) |
| INK / MUTE / MUTE2 | `FFFFFF` / `9DB0C9` / `6F829C` | headings / body / captions+citations |
| AMBER | `F2B45A` | warnings |
| BLUE/PINK/GOLD/GREEN | `5EA8FF`/`FF7E9D`/`F2B45A`/`49D6A0` | category colors |

- **Fonts:** headings `Segoe UI Semibold`, body `Segoe UI`, code `Consolas`. Title
  30pt, section header 16–19pt, body 12–14pt, captions 9.5–10pt, big stats 44–60pt.
- **Background:** full-bleed royal-blue radial-gradient image (`assets/background.jpeg`,
  16:9), set via `BG_IMAGE` in the template (`BG_IMAGE=''` falls back to solid BG).
- **Motif:** accent vertical bar left of titles; corner brackets on title/closing;
  cards = rounded rects (`rectRadius ~0.09`) with subtle outer shadow.
- **Layout:** 13.333 × 7.5 in (16:9); margins ≥ 0.6 in. Full archetype catalog and the
  Module 01 worked example are in `SLIDE_BLUEPRINTS.md`.

**Avoid (these read as AI slop / caused defects):** full-width colored header/footer
bars; accent lines *under* titles; stat numbers in boxes too narrow (44pt "85%" needs
~1.9 in or it wraps); two-digit chips (`01`) wrapping in narrow boxes.

### Phase 3 — QA (required)

Two gates plus a visual check. Run all three before delivery.

1. **Structural + fidelity gate** — `verify_deck.py`:

   ```bash
   python3 scripts/verify_deck.py --deck "NN Short_Name_REDESIGN.pptx" \
       --source "NN. Module Title.md" --expect <N>
   ```

   - **HARD failures** (non-zero exit): a slide with no speaker notes; slide count ≠
     `--expect`/`--baseline`; any leftover icon-font text.
   - **SOFT warnings:** notes outside the word band (title/closing exempt by default);
     a content slide with no citation; suspected icon-ligature artifacts; **fidelity
     misses** — a cited surname or an on-slide stat that does not appear in the source.
     Use `--strict` to fail on these too; `--no-require-notes` for a citations-only pass.
2. **Visual render check** — `render_and_check.sh deck.pptx <viewable-dir>` renders
   per-slide JPGs in a fresh dir. Inspect every slide for: text overflow/wrap, overlap,
   citations colliding with content, broken icons, low contrast, uneven gaps, < 0.5 in
   edge margins. Fix, re-render only affected slides. **Stop after one fix-and-verify
   cycle** unless a new user-visible defect appears. Delete the review folder when done.
3. **Recovery:** if a gate fails after an apply, restore the phase backup
   (`cp deck_BACKUP_<phase>.pptx deck.pptx`; `copy` on Windows), fix the JSON artifact,
   re-apply. Never iterate on a deck whose last gate run failed.

Finally present the finished deck with a short change summary, and report any fidelity
warnings you accepted (with reasons).

---

## REPAIR track (existing decks)

For decks built elsewhere that need upgrading. **Order matters: do any visual rebuild
FIRST** (it recreates slides from scratch), then citations, then notes, then QA.

1. **Inspect:** `extract_deck_text.py --deck deck.pptx [--notes] [--json]` — dumps
   slide text (walking groups), optionally notes.
2. **Rebuild visuals (optional):** if the deck uses icon fonts or inconsistent layout,
   rebuild via the BUILD track Phases 0–2, treating the old deck + source `.md` as
   Phase 0 inputs. If only the background needs changing:

   ```bash
   python3 scripts/apply_background.py --deck deck.pptx --img assets/background.jpeg          # dry run
   python3 scripts/apply_background.py --deck deck.pptx --img assets/background.jpeg --apply  # auto-backup
   ```

   To recolor the accent across a built deck: the accent is one hex everywhere, so
   unzip the `.pptx`, run `find ppt -name '*.xml' -exec sed -i -E 's/OLDHEX/NEWHEX/Ig' {} +`
   (GNU sed), then re-zip from inside the extracted dir so `[Content_Types].xml` stays
   at the archive root — back up to `_PRECOLOR.pptx` first.
3. **Citations:** compare deck text against the source (use `map_references.py` for the
   reference map), list dropped attributions, author `citations.json`
   (`[[slide, "unique substring", "(Cite, YYYY)"], …]` — see
   `references/citations_template.json`), then:

   ```bash
   python3 scripts/reinstate_citations.py --deck deck.pptx --edits citations.json           # dry run
   python3 scripts/reinstate_citations.py --deck deck.pptx --edits citations.json --apply
   ```

   Idempotent: already-present citations are skipped, so re-runs never double-append.
4. **Notes:** author `mNN_script.json` (Phase 1 style spec), then:

   ```bash
   python3 scripts/embed_notes.py embed  --deck deck.pptx --script mNN_script.json
   python3 scripts/embed_notes.py report --deck deck.pptx
   python3 scripts/embed_notes.py topup  --deck deck.pptx --topups topups.json   # lengthen short slides
   python3 scripts/embed_notes.py export --deck deck.pptx --out mNN_script.json  # re-sync JSON after topup
   ```

   Topups insert a sentence *before* the final "The takeaway:" line (see
   `references/topups_template.json`). **Always export after topup** (source-of-truth rule).
5. **QA:** Phase 3 as above (pass `--source` whenever the source `.md` is available).

---

## Naming & deliverables

- Source: `NN. Module Title.md`
- Reference map: `mNN_refmap.json` · Outline: `mNN_outline.json` · Script: `mNN_script.json`
  (keep these in a scratch/outputs dir, not under version control)
- Working deck: `NN Short_Name.pptx` → auto-backups `NN Short_Name_BACKUP_<phase>.pptx`
- Final: `NN Short_Name_REDESIGN.pptx`
- Worked example: a seven-module research-training series (sources and finished decks not
  shipped in this repo). `SLIDE_BLUEPRINTS.md` Part B reproduces Module 01's slide map in full.

## Companion files

- `SLIDE_BLUEPRINTS.md` — archetype catalog (A1–A11) + the Module 01 worked example map
  + cross-module reuse notes. **Read during Phase 0 archetype assignment.**
- `assets/background.jpeg` — full-bleed royal-blue background (16:9).
- `scripts/map_references.py` — Phase 0: bibliography ↔ in-text citation map + scrambled-bib warnings.
- `scripts/extract_deck_text.py` — dump slide text/notes (`--json` for tooling).
- `scripts/build_deck_template.js` — design system + helpers + archetype samples;
  args: `[script.json] [out.pptx]`; warns loudly if the script JSON is missing.
- `scripts/reinstate_citations.py` — idempotent citation reinstatement; dry-run default.
- `scripts/embed_notes.py` — `embed` / `topup` / `report` / `export`; band-exempts
  first/last slides; auto-backup.
- `scripts/apply_background.py` — re-skin backgrounds; dry-run default; auto-backup.
- `scripts/render_and_check.sh` — render JPGs in a fresh dir for visual QA.
- `scripts/verify_deck.py` — structural gate + `--source` fidelity gate; non-zero exit
  on hard failures.
- `references/` — `outline_template.json`, `script_template.json`,
  `citations_template.json`, `topups_template.json`.
