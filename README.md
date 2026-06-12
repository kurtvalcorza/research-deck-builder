# Research Deck Builder

Turn a written research/training module (`.md` with references) into a polished,
presenter-ready PowerPoint deck — outline, source-checked citations, a spoken speaker
script, and a clean dark + blue visual design with no icon-font dependencies (icons are
vector shapes; text fonts substitute gracefully where Segoe UI isn't installed). Also
repairs existing decks (reinstate dropped citations, embed notes, re-skin backgrounds).

## Install as a Claude Code skill

Copy or clone this folder to `~/.claude/skills/research-deck-builder/` (personal) or
`<project>/.claude/skills/research-deck-builder/` (project) — the folder name must
match the `name` in `SKILL.md`'s frontmatter. `SKILL.md` is the method the agent
follows; this README is the human quick start. Work in a separate deck workspace: run
`npm install` there and keep decks and `mNN_*.json` artifacts out of the skill folder.

---

## Folder contents

```
research-deck-builder/
├── SKILL.md                      # full method + design system + golden rules (read this)
├── README.md                     # this file — quick start
├── SLIDE_BLUEPRINTS.md           # layout archetypes (A1–A11) + worked-example slide map
├── REMEDIATION-PLAN.md           # audit findings + staged fix plan (repo tooling)
├── assets/
│   └── background.jpeg           # full-bleed royal-blue background (16:9)
├── references/                   # JSON templates for the pipeline artifacts
│   ├── outline_template.json     # Phase 0 content plan (slide → archetype → blocks → citations)
│   ├── script_template.json      # per-slide speaker script + house style
│   ├── citations_template.json   # reinstatement edits: [slide, substring, citation]
│   └── topups_template.json      # notes top-ups: {"slide": " extra sentence."}
└── scripts/
    ├── map_references.py         # Phase 0: bibliography ↔ in-text map + scrambled-bib warnings
    ├── extract_deck_text.py      # dump slide text (+notes) for cross-check / mapping
    ├── build_deck_template.js    # pptxgenjs design system + archetype sample slides
    ├── reinstate_citations.py    # add dropped citations (idempotent, dry-run default)
    ├── embed_notes.py            # embed/topup/report/export speaker script in Notes
    ├── apply_background.py       # re-skin backgrounds (dry-run default, auto-backup)
    ├── render_and_check.sh       # render to images for visual QA
    ├── verify_deck.py            # QA gate: structure + fidelity vs source (--source)
    └── validate-contracts.sh     # repo tooling: docs↔scripts drift guard (not part of the pipeline)
```

## One-time setup

```bash
pip install -r requirements.txt   # python-pptx (add --break-system-packages on externally-managed envs)
npm install                       # pptxgenjs, from package.json
# Visual QA rendering also needs LibreOffice (soffice) + poppler (pdftoppm);
# on Windows: scoop/choco install, or use WSL — or skip rendering and run verify_deck.py only.
```

---

## BUILD track — from source `.md` to finished deck

```bash
# Phase 0 — intake & outline
python3 scripts/map_references.py --source "01. Module Title.md" --out m01_refmap.json
#   → read the source, select content, author m01_outline.json (see references/outline_template.json)
#   → get the outline approved before building

# Phase 1 — speaker script
#   → author m01_script.json from the outline (style spec in SKILL.md / script_template.json)

# Phase 2 — build (copy build_deck_template.js → build_m01.js, fill slides from the outline)
node build_m01.js m01_script.json "01 Short_Name_REDESIGN.pptx"

# Phase 3 — QA (outline enforcement + structural + fidelity gate, then visual render)
python3 scripts/verify_deck.py --deck "01 Short_Name_REDESIGN.pptx" \
    --outline m01_outline.json --source "01. Module Title.md"   # add --refmap m01_refmap.json for [n] cites
./scripts/render_and_check.sh "01 Short_Name_REDESIGN.pptx" /path/to/viewable/_review
```

## REPAIR track — upgrade an existing deck

Order: visual rebuild first (if needed), then citations, then notes, then QA.

```bash
python3 scripts/extract_deck_text.py --deck deck.pptx --notes        # see what's there
python3 scripts/reinstate_citations.py --deck deck.pptx --edits citations.json          # dry run
python3 scripts/reinstate_citations.py --deck deck.pptx --edits citations.json --apply  # idempotent
python3 scripts/embed_notes.py embed  --deck deck.pptx --script m01_script.json
python3 scripts/embed_notes.py export --deck deck.pptx --out m01_script.json  # after any topup!
python3 scripts/apply_background.py --deck deck.pptx --img assets/background.jpeg --apply
```

All editing scripts auto-backup to phase-named files (`_BACKUP_citations`,
`_BACKUP_notes`, `_BACKUP_bg`) and never overwrite an existing backup.

---

## Reference implementation

This pipeline was proven on a seven-module research-training series (94 slides
total). The source modules and finished decks are **not** included in this repo, but
`SLIDE_BLUEPRINTS.md` Part B reproduces Module 01's full 15-slide map (archetype, title,
content blocks, citations) as a worked example you can follow end to end. Module 01's
trace through the pipeline:
`01. Advanced Prompt Engineering for Research Tasks.md` → outline → script → build →
finished deck. Part B is the only pipeline artifact reproduced (and thus verifiable)
in this repo.

## Golden rules (full list in SKILL.md)

- JSON artifacts (outline, script) are the source of truth — export notes back to JSON
  after any in-deck edit, or a rebuild will revert it.
- Every stat verbatim from the source, with its citation; `verify_deck.py --source`
  checks both.
- Author text in JSON; no double-quotes inside values.
- Source bibliographies are often scrambled — `map_references.py` warns; cite by the
  surname in the source **prose** and flag the mismatch.
- Icons must be **vector shapes**, never an icon font.
- Use a **fresh** render dir each time (LibreOffice locks them) — the render script does this.

## Repo tooling

`scripts/validate-contracts.sh` is a drift guard for this repo, not part of the deck
pipeline: it checks that the docs and scripts stay consistent (documented flags, backup
names, the notes word band, archetype claims) plus two functional checks on the QA
tooling itself. It exits non-zero while the audit findings tracked in
`REMEDIATION-PLAN.md` remain open, and goes green as those fixes land.
