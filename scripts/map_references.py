#!/usr/bin/env python3
"""Phase 0 tool: map a source module's bibliography and in-text citations.

Parses the source .md, extracts the NUMBERED (IEEE-style) bibliography ([1] / 1.
entries), collects every in-text citation from the prose, and cross-checks the two.
Author-date (APA-style) reference lists are NOT parsed: if the references section is
not numbered, the script warns loudly that the scrambled-bib cross-check was skipped.
This mechanizes the scrambled-bibliography detection the method used to do entirely by
hand: numbered references frequently do NOT match the surnames used in the prose, and
citing by the wrong entry is the exact failure the citations phase exists to prevent.

Output JSON (write with --out, else stdout):
  {
    "entries":  {"1": {"raw": "...", "surnames": ["Park", "Choo"], "year": "2024"}, ...},
    "in_text":  {"numbered": ["1", "3", ...],
                 "author_date": ["(Park & Choo, 2024)", ...],
                 "bare_name": ["(Nash)", ...]},
    "warnings": ["prose cites surname 'Nash' not found in any bibliography entry", ...]
  }

Usage:
  python3 map_references.py --source "01. Module Title.md"
  python3 map_references.py --source module.md --out m01_refmap.json
"""
import argparse
import json
import re
import sys
from pathlib import Path

# Heading may be a markdown heading (## References) or just bold/plain text (**References:**)
BIB_HEADING = re.compile(
    r"^\s*(?:#{1,6}\s*)?(?:\*\*)?\s*(references|bibliography|works cited|sources)\s*:?\s*(?:\*\*)?\s*$",
    re.I)
BIB_ENTRY = re.compile(r"^\s*(?:\[(\d+)\]|(\d+)\.)\s+(.*\S)")
YEAR = re.compile(r"\b(19|20)\d{2}[a-z]?\b")
# In-text forms: [1], [1, 3], (Park & Choo, 2024), (Sun et al., 2025), (Nash)
NUMBERED_CITE = re.compile(r"\[(\d+(?:\s*,\s*\d+)*)\]")
AUTHOR_DATE = re.compile(
    r"\(([A-Z][A-Za-zÀ-ſ.'-]+(?:\s+et al\.|\s+(?:&|and)\s+[A-Z][A-Za-zÀ-ſ.'-]+)?)"
    r"\s*,\s*((?:19|20)\d{2}[a-z]?)\)"
)
# Bare-name cites like (Nash) or (Park & Choo): require a lowercase letter in the
# surname so ALL-CAPS acronym parentheticals like (REFINE) don't count.
BARE_NAME = re.compile(
    r"\(([A-Z][A-Za-zÀ-ſ.'-]*[a-zà-ſ][A-Za-zÀ-ſ.'-]*"
    r"(?:\s+(?:&|and)\s+[A-Z][A-Za-zÀ-ſ.'-]*[a-zà-ſ][A-Za-zÀ-ſ.'-]*)?)\)"
)
SURNAME = re.compile(r"\b([A-Z][A-Za-zÀ-ſ'-]{2,})\b")
# words that look like surnames but aren't (sentence-initial words, common title words)
STOPWORDS = {"The", "This", "These", "And", "For", "Using", "From", "With", "Available",
             "Journal", "University", "Press", "Retrieved", "Vol", "In", "Proceedings"}


def split_bibliography(text):
    """Return (prose, bib_lines). Bibliography = everything after the references heading."""
    lines = text.splitlines()
    for i, ln in enumerate(lines):
        if BIB_HEADING.match(ln.strip()):
            return "\n".join(lines[:i]), lines[i + 1:]
    return text, []


def parse_entries(bib_lines):
    entries, current = {}, None
    for ln in bib_lines:
        m = BIB_ENTRY.match(ln)
        if m:
            num = m.group(1) or m.group(2)
            entries[num] = m.group(3)
            current = num
        elif current and ln.strip():            # continuation line of the previous entry
            entries[current] += " " + ln.strip()
    return entries


def entry_surnames(raw):
    """Guess author surnames from the author segment of an entry.

    IEEE-style entries quote the title ([1] T. Sun et al., "Title...", Journal, 2025),
    so cut at the first quote character; otherwise fall back to text before the year
    (or the first period). Initials like 'T.' are filtered by the 3+ char requirement.
    """
    qm = re.search(r'["“‘]', raw)
    if qm:
        head = raw[:qm.start()]
    else:
        ym = YEAR.search(raw)
        head = raw[:ym.start()] if ym else raw.split(".")[0]
    return [s for s in SURNAME.findall(head) if s not in STOPWORDS and len(s) > 1]


def main():
    ap = argparse.ArgumentParser(description="Map source bibliography <-> in-text citations.")
    ap.add_argument("--source", required=True, help="source module .md")
    ap.add_argument("--out", help="write JSON here instead of stdout")
    args = ap.parse_args()

    src = Path(args.source)
    if not src.is_file():
        sys.exit(f"ERROR: source not found: {src}")
    text = src.read_text(encoding="utf-8", errors="replace")

    prose, bib_lines = split_bibliography(text)
    raw_entries = parse_entries(bib_lines)

    entries = {}
    for num, raw in raw_entries.items():
        ym = YEAR.search(raw)
        entries[num] = {"raw": raw, "surnames": entry_surnames(raw),
                        "year": ym.group(0) if ym else None}

    numbered = sorted({n.strip() for m in NUMBERED_CITE.findall(prose)
                       for n in m.split(",")}, key=int)
    author_date = sorted({f"({a}, {y})" for a, y in AUTHOR_DATE.findall(prose)})
    # bare-name cites, minus the spans already counted as author-date
    dated = {a for a, _ in AUTHOR_DATE.findall(prose)}
    bare_name = sorted({f"({a})" for a in BARE_NAME.findall(prose) if a not in dated})

    warnings = []
    if not entries:
        if any(ln.strip() for ln in bib_lines):
            warnings.append("reference list found but not numbered (IEEE-style [n] / n.); "
                            "author-date lists are NOT parsed — scrambled-bib "
                            "cross-check skipped")
        else:
            warnings.append("no bibliography found in source")
    bib_surnames = {s for e in entries.values() for s in e["surnames"]}
    for n in numbered:
        if n not in entries:
            warnings.append(f"prose cites [{n}] but bibliography has no entry {n}")
    # Scrambled-bib warning is driven by author-date cites only: bare-name
    # parentheticals are collected for visibility (in_text.bare_name) but not
    # warned on, since "(Optional)"-style prose would be indistinguishable noise.
    for a, y in AUTHOR_DATE.findall(prose):
        lead = SURNAME.search(a)
        if lead and bib_surnames and lead.group(1) not in bib_surnames:
            warnings.append(f"prose cites surname '{lead.group(1)}' "
                            f"not found in any bibliography entry (scrambled bib?)")
    odd = [s for s in bib_surnames if s in STOPWORDS or len(s) <= 2]
    if odd:
        warnings.append(f"suspicious surname tokens in bibliography: {sorted(odd)}")

    out = {"entries": entries,
           "in_text": {"numbered": numbered, "author_date": author_date,
                       "bare_name": bare_name},
           "warnings": warnings}
    payload = json.dumps(out, ensure_ascii=False, indent=2)
    if args.out:
        Path(args.out).write_text(payload, encoding="utf-8")
        print(f"Wrote {args.out}: {len(entries)} entries, "
              f"{len(numbered)} numbered + {len(author_date)} author-date "
              f"+ {len(bare_name)} bare-name in-text cites, "
              f"{len(warnings)} warnings")
    else:
        print(payload)
    for w in warnings:
        print(f"  [warn] {w}", file=sys.stderr)


if __name__ == "__main__":
    main()
