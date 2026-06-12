#!/usr/bin/env python3
"""Programmatic QA gate for a finished/edited deck (Phase 3).

Structural checks (always): slide count, speaker notes present on every slide (and within
the word band), inline citations present, and NO leftover icon-font glyphs (the exact
failure mode the visual rebuild exists to fix).

Fidelity checks (with --source <module.md>): the gate the method's headline promise
("faithful citations") previously lacked. Verifies against the source text that
  * every surname cited on a slide actually appears in the source, and
  * every stat-like number on a slide (85%, 18,000, 147.5 ...) appears in the source --
so a wrong attribution or a transposed digit no longer passes QA silently.

Exit code is non-zero when a HARD invariant fails, so it can gate a build:
  HARD  : missing/empty notes (when required); slide-count mismatch; icon-font text.
  SOFT  : notes outside the word band; content slide with no citation; suspicious
          icon-ligature tokens; fidelity misses. With --strict these also fail the run.

The title and closing slides are exempt from the word band and the citation-presence
check by default (house style keeps them short); override with --band-exempt/--cite-exempt.

Usage:
  python3 verify_deck.py --deck deck_REDESIGN.pptx
  python3 verify_deck.py --deck deck_REDESIGN.pptx --baseline deck_BACKUP_notes.pptx
  python3 verify_deck.py --deck deck_REDESIGN.pptx --source "01. Module Title.md" --strict
  python3 verify_deck.py --deck deck.pptx --no-require-notes   # citations-only pass
"""
import argparse
import re
import sys
from pathlib import Path
from pptx import Presentation
from pptx.enum.shapes import MSO_SHAPE_TYPE

# Icon fonts that render as broken text where they are not installed. Any run using one
# of these is a hard failure: rebuild that slide with vector shapes instead (see SKILL.md).
ICON_FONTS = re.compile(r"material\s*(symbols|icons)|font\s*awesome|glyphicons", re.I)

# Material-Symbols ligatures look like normal snake_case words once the font drops out
# (e.g. 'check_circle', 'arrow_forward'). Flag short all-lowercase underscore tokens that
# sit alone in a run -- a soft signal, since legitimate code samples also use snake_case.
LIGATURE = re.compile(r"^[a-z]{2,}(?:_[a-z]{2,}){1,3}$")

# Inline citation shapes the deck uses: author-date and bare author-name.
#   (Park & Choo, 2024) | (Sun et al., 2025) | (Kulkarni, 2024) | (Nash)
CITATION = re.compile(
    r"\(([A-Z][A-Za-zÀ-ſ.'-]+)"
    r"(?:\s+et al\.|\s+(?:&|and)\s+[A-Z][A-Za-zÀ-ſ.'-]+)?"
    r"(?:\s*,\s*\d{4}[a-z]?)?\)"
)

# Stat-like numbers worth checking against the source: has %, a decimal, a thousands
# comma, or an integer value > 20 (filters out chip/step/index numerals).
NUMBER = re.compile(r"\b\d{1,3}(?:,\d{3})+(?:\.\d+)?%?|\b\d+\.\d+%?|\b\d+%|\b\d+\b")


def walk(shapes):
    for s in shapes:
        if s.shape_type == MSO_SHAPE_TYPE.GROUP:
            yield from walk(s.shapes)
        else:
            yield s


def parse_exempt(spec, n_slides):
    out = set()
    for tok in (spec or "").split(","):
        tok = tok.strip().lower()
        if not tok:
            continue
        if tok == "first":
            out.add(1)
        elif tok == "last":
            out.add(n_slides)
        else:
            out.add(int(tok))
    return out


def stat_numbers(text):
    """Stat-like number tokens in text (citations should be stripped beforehand)."""
    keep = []
    for tok in NUMBER.findall(text):
        plain = tok.rstrip("%").replace(",", "")
        try:
            val = float(plain)
        except ValueError:
            continue
        if "%" in tok or "." in tok or "," in tok or val > 20:
            keep.append(tok)
    return keep


def verify(args):
    p = Presentation(args.deck)
    slides = list(p.slides)
    n = len(slides)
    band_exempt = parse_exempt(args.band_exempt, n)
    cite_exempt = parse_exempt(args.cite_exempt, n)

    source_text = source_flat = None
    if args.source:
        sp = Path(args.source)
        if not sp.is_file():
            sys.exit(f"ERROR: --source not found: {sp}")
        source_text = sp.read_text(encoding="utf-8", errors="replace")
        source_flat = source_text.replace(",", "")     # match 18000 against "18,000" too

    hard, soft = [], []

    # --- slide count ---
    expected = args.expect
    if expected is None and args.baseline:
        expected = len(Presentation(args.baseline).slides)
    if expected is not None and n != expected:
        hard.append(f"slide count is {n}, expected {expected}")

    for i, s in enumerate(slides, 1):
        # collect text + fonts on this slide
        texts, fonts = [], set()
        for sh in walk(s.shapes):
            if not sh.has_text_frame:
                continue
            for para in sh.text_frame.paragraphs:
                for r in para.runs:
                    if r.text:
                        texts.append(r.text)
                    if r.font.name:
                        fonts.add(r.font.name)
        slide_text = " ".join(texts)

        # --- icon-font (hard) ---
        bad_fonts = [f for f in fonts if ICON_FONTS.search(f or "")]
        if bad_fonts:
            hard.append(f"S{i}: icon font still in use -> {', '.join(sorted(bad_fonts))}")
        for tok in texts:
            t = tok.strip()
            if LIGATURE.match(t) and "Consolas" not in fonts:
                soft.append(f"S{i}: possible icon-ligature artifact text '{t}'")

        # --- notes (hard if required) ---
        notes = s.notes_slide.notes_text_frame.text.strip() if s.has_notes_slide else ""
        wc = len(notes.split())
        if args.require_notes and not notes:
            hard.append(f"S{i}: no speaker notes")
        elif notes and i not in band_exempt and not (args.min_words <= wc <= args.max_words):
            soft.append(f"S{i}: notes {wc} words (band {args.min_words}-{args.max_words})")

        # --- citations present (soft, informational) ---
        cites = CITATION.findall(slide_text)
        if not cites and i not in cite_exempt:
            soft.append(f"S{i}: no inline citation detected")

        # --- fidelity vs source (soft) ---
        if source_text is not None:
            for surname in set(cites):
                lead = re.match(r"[A-Z][A-Za-zÀ-ſ'-]+", surname)
                if lead and lead.group(0) not in source_text:
                    soft.append(f"S{i}: cited surname '{lead.group(0)}' not found in source")
            no_cite_text = CITATION.sub(" ", slide_text)
            for num in set(stat_numbers(no_cite_text)):
                plain = num.replace(",", "")
                if num not in source_text and plain not in source_flat:
                    soft.append(f"S{i}: number '{num}' not found in source")

    # --- report ---
    print(f"Deck: {args.deck}")
    print(f"Slides: {n}" + (f" (expected {expected})" if expected is not None else ""))
    if args.source:
        print(f"Source fidelity: checked against {args.source}")
    print(f"HARD failures: {len(hard)} | SOFT warnings: {len(soft)}\n")
    for h in hard:
        print(f"  [FAIL] {h}")
    for w in soft:
        print(f"  [warn] {w}")
    if not hard and not soft:
        print("  All checks passed.")

    failed = bool(hard) or (args.strict and bool(soft))
    print("\nRESULT:", "FAIL" if failed else "PASS")
    return 1 if failed else 0


def main():
    ap = argparse.ArgumentParser(description="QA gate for a research deck (.pptx).")
    ap.add_argument("--deck", required=True, help="deck to check")
    ap.add_argument("--source", help="source module .md for fidelity checks (names, numbers)")
    ap.add_argument("--expect", type=int, help="expected slide count")
    ap.add_argument("--baseline", help="another deck to read the expected slide count from")
    ap.add_argument("--min-words", type=int, default=180, help="notes word floor (default 180)")
    ap.add_argument("--max-words", type=int, default=210, help="notes word ceiling (default 210)")
    ap.add_argument("--band-exempt", default="first,last",
                    help="slides exempt from the word band (default: first,last)")
    ap.add_argument("--cite-exempt", default="first,last",
                    help="slides exempt from the citation-presence check (default: first,last)")
    ap.add_argument("--require-notes", dest="require_notes", action="store_true", default=True,
                    help="fail if any slide lacks notes (default)")
    ap.add_argument("--no-require-notes", dest="require_notes", action="store_false",
                    help="don't require notes (e.g. citations-only pass)")
    ap.add_argument("--strict", action="store_true", help="treat SOFT warnings as failures")
    sys.exit(verify(ap.parse_args()))


if __name__ == "__main__":
    main()
