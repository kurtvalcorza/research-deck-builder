#!/usr/bin/env bash
# validate-contracts.sh — drift guard for the Research Deck Builder skill.
# Pattern: research-writer/scripts/validate-contracts.sh, adapted from a
# subagent architecture to a SKILL.md + scripts toolchain.
#
# Checks:
#   1.  SKILL.md frontmatter sanity (name matches folder; description <=1024 chars)
#   2.  Doc <-> script wiring (every script/template referenced; references exist)
#   3.  Documented --flag drift against the scripts' actual arguments
#   4.  references/*.json all parse
#   5.  Backup phase-name parity (docs <-> scripts: citations / notes / bg)
#   6.  Word-band parity AND arithmetic (SKILL.md <-> embed_notes.py <-> verify_deck.py)
#   7.  Archetype-sample parity (SKILL.md & SLIDE_BLUEPRINTS claims <-> sample IIFEs)
#   8.  Icon-font ban in the build template (the defect verify_deck exists to catch)
#   9.  BG_IMAGE default points at a file that ships with the skill
#   10. "The takeaway:" marker parity (SKILL.md / embed_notes.py / script template)
#   11. FUNCTIONAL: map_references parses an author-date reference list when its
#       docstring claims to (REMEDIATION-PLAN B2)
#   12. FUNCTIONAL: verify_deck's CITATION regex rejects acronym parentheticals
#       and accepts real cites (REMEDIATION-PLAN D1)
#   13. Stale phase vocabulary in scripts (REMEDIATION-PLAN B5)
#   14. Known overclaim strings (REMEDIATION-PLAN A4, E1)
#   15. .gitignore still covers working artifacts (regression guard)
#
# Exit 0 = clean. Exit 1 = violations printed to stdout.
# No dependencies beyond bash + grep/awk + python3 stdlib.

set -uo pipefail
cd "$(dirname "$0")/.."

FAIL=0
err()  { printf 'ERROR: %s\n' "$*"; FAIL=1; }
note() { printf 'note:  %s\n' "$*"; }

# ---------------------------------------------------------------------------
# 1. SKILL.md frontmatter sanity
# ---------------------------------------------------------------------------
DIRNAME=$(basename "$(pwd)")
name=$(awk -F': *' '/^name:/{print $2; exit}' SKILL.md | tr -d '"')
[ "$name" = "$DIRNAME" ] || err "SKILL.md frontmatter name '$name' != folder name '$DIRNAME' (skill won't load under this path)"
grep -q '^description:' SKILL.md || err "SKILL.md: missing 'description:' in frontmatter"
desclen=$(awk '/^---$/{n++; next} n==1 && /^description:/{d=1; next} n==1 && d && /^[a-z-]+:/{d=0} n==1 && d {gsub(/^  /,""); printf "%s ", $0}' SKILL.md | wc -c)
[ "$desclen" -le 1024 ] || err "SKILL.md description is ${desclen} chars (limit 1024)"

# ---------------------------------------------------------------------------
# 2. Doc <-> script wiring
#    (validate-contracts.sh itself is repo tooling, exempt from pipeline docs)
# ---------------------------------------------------------------------------
for f in scripts/*; do
  [ -f "$f" ] || continue            # skip dirs (e.g. a stray __pycache__)
  base=$(basename "$f")
  [ "$base" = "validate-contracts.sh" ] && continue
  grep -q "$base" SKILL.md  || err "scripts/$base exists but SKILL.md never mentions it"
  grep -q "$base" README.md || err "scripts/$base exists but README.md never mentions it"
done
for f in references/*.json; do
  base=$(basename "$f")
  grep -q "$base" SKILL.md || err "references/$base exists but SKILL.md never mentions it"
done
# every scripts/<file> referenced in docs must exist on disk
while IFS= read -r ref; do
  [ -z "$ref" ] && continue
  [ -f "$ref" ] || err "docs reference '$ref' but it does not exist"
done < <(grep -hoE '(scripts|references|assets)/[A-Za-z0-9_.-]+' SKILL.md README.md SLIDE_BLUEPRINTS.md 2>/dev/null | sort -u)

# ---------------------------------------------------------------------------
# 3. Documented --flag drift (command lines naming a script must only use
#    flags that script defines)
# ---------------------------------------------------------------------------
while IFS= read -r line; do
  script=$(printf '%s' "$line" | grep -oE 'scripts/[A-Za-z_]+\.(py|sh)' | head -1)
  [ -n "$script" ] && [ -f "$script" ] || continue
  for flag in $(printf '%s' "$line" | grep -oE '\-\-[a-z][a-z-]+' | sort -u); do
    grep -qF -- "$flag" "$script" || err "docs show '$flag' for $script but the script does not define it"
  done
done < <(grep -hE 'scripts/[A-Za-z_]+\.(py|sh)' SKILL.md README.md)

# ---------------------------------------------------------------------------
# 4. JSON templates parse
# ---------------------------------------------------------------------------
for f in references/*.json; do
  python3 -m json.tool "$f" >/dev/null 2>&1 || err "$f is not valid JSON"
done

# ---------------------------------------------------------------------------
# 5. Backup phase-name parity
# ---------------------------------------------------------------------------
for pair in "reinstate_citations.py:citations" "embed_notes.py:notes" "apply_background.py:bg"; do
  s="scripts/${pair%%:*}"; phase="${pair##*:}"
  grep -qF "\"$phase\"" "$s" || err "$s: backup phase is not '$phase' (docs promise _BACKUP_$phase)"
  grep -qF "_BACKUP_$phase" SKILL.md || err "SKILL.md no longer documents _BACKUP_$phase"
done

# ---------------------------------------------------------------------------
# 6. Word-band parity and arithmetic
# 7. Archetype-sample parity
# 11./12. Functional checks
# ---------------------------------------------------------------------------
pyout=$(python3 - 2>&1 <<'PY'
import ast, json, re, subprocess, sys, tempfile, os

errors = []

# ---- 6. word band ----
embed = open('scripts/embed_notes.py').read()
verify = open('scripts/verify_deck.py').read()
skill = open('SKILL.md').read()

wps  = float(re.search(r'^WPS\s*=\s*([\d.]+)', embed, re.M).group(1))
mn, mx = map(int, re.search(r'^MIN_W,\s*MAX_W\s*=\s*(\d+),\s*(\d+)', embed, re.M).groups())
vmn = int(re.search(r'--min-words.*?default=(\d+)', verify).group(1))
vmx = int(re.search(r'--max-words.*?default=(\d+)', verify).group(1))
if (mn, mx) != (vmn, vmx):
    errors.append(f"word band differs: embed_notes {mn}-{mx} vs verify_deck defaults {vmn}-{vmx}")

# The content-slide band lives in the '**Length:**' bullet of the Phase 1 style
# spec. Take the FIRST words-pair and FIRST seconds-pair inside that bullet
# (order-agnostic, so a D2 rewording survives); the title/closing 30-60 words
# sentence comes later in the bullet and is ignored.
bullet = re.search(r'\*\*Length:\*\*(.*?)(?=\n- \*\*|\n\n)', skill, re.S)
m_w = m_s = None
if bullet:
    m_w = re.search(r'(\d+)[–-](\d+)\s+words', bullet.group(1))
    m_s = re.search(r'(\d+)[–-](\d+)\s+seconds', bullet.group(1))
if not (m_w and m_s):
    errors.append("SKILL.md: cannot locate the words/seconds band in the '**Length:**' bullet")
else:
    w_lo, w_hi = map(int, m_w.groups())
    s_lo, s_hi = map(int, m_s.groups())
    if (w_lo, w_hi) != (mn, mx):
        errors.append(f"SKILL.md word band {w_lo}-{w_hi} != scripts' {mn}-{mx}")
    calc_lo, calc_hi = w_lo / wps, w_hi / wps
    for claimed, calc in ((s_lo, calc_lo), (s_hi, calc_hi)):
        if abs(claimed - calc) / claimed > 0.10:
            errors.append(
                f"word-band arithmetic: SKILL.md claims {s_lo}-{s_hi}s but "
                f"{w_lo}-{w_hi} words at {wps} w/s = {calc_lo:.0f}-{calc_hi:.0f}s (D2)")
            break

# ---- 7. archetype-sample parity ----
js = open('scripts/build_deck_template.js').read()
n_samples = js.count('===== SAMPLE')
m = re.search(r'worked sample\s+slides for archetypes ([^*]+)\*\*', skill)
skill_set = set(re.findall(r'A\d+', m.group(1))) if m else set()
bp = open('SLIDE_BLUEPRINTS.md').read()
m2 = re.search(r'worked IIFE for ([A-Z0-9,\s]+and A\d+)', bp)
bp_set = set(re.findall(r'A\d+', m2.group(1))) if m2 else set()
if not skill_set:
    errors.append("SKILL.md: cannot locate the worked-sample archetype claim")
elif len(skill_set) != n_samples:
    errors.append(f"SKILL.md claims samples for {len(skill_set)} archetypes but template has {n_samples} sample IIFEs")
if skill_set and bp_set and skill_set != bp_set:
    errors.append(f"sample-archetype claims differ: SKILL.md {sorted(skill_set)} vs SLIDE_BLUEPRINTS {sorted(bp_set)}")

# ---- 11. functional: bibliography-format contract (B2, Decision 3: IEEE-only) ----
# On an author-date (APA-style) reference list, map_references must either parse
# entries (if support is ever added) or WARN LOUDLY that the scrambled-bib
# cross-check was skipped. Silent 0-entry output is the failure mode.
apa = ("# Module X\n\nProse cites (Park & Choo, 2024) and a scrambled one (Nash, 2023).\n\n"
       "## References\n\n"
       "Park, J., & Choo, S. (2024). Scholarly prompting. Journal of AI, 12(3), 1-20.\n\n"
       "Sun, T., & Zhao, M. (2025). Structural prompts. AI Review, 8(1), 44-61.\n")
with tempfile.TemporaryDirectory() as td:
    p = os.path.join(td, 'apa.md')
    open(p, 'w').write(apa)
    out = subprocess.run([sys.executable, 'scripts/map_references.py', '--source', p],
                         capture_output=True, text=True)
    try:
        data = json.loads(out.stdout)
    except Exception:
        data = {}
    if not data.get('entries'):
        warns = ' '.join(data.get('warnings', []))
        if not re.search(r'not parsed|skipped|not numbered', warns, re.I):
            errors.append("map_references.py: author-date reference list yields 0 entries "
                          "with no loud skip warning — scrambled-bib check silently "
                          "disabled (B2)")

# ---- 12. functional: CITATION regex acronym guard (D1) ----
pat = None
for node in ast.walk(ast.parse(verify)):
    if isinstance(node, ast.Assign) and any(getattr(t, 'id', None) == 'CITATION' for t in node.targets):
        try:
            pat = node.value.args[0].value
        except Exception:
            pass
if pat is None:
    errors.append("verify_deck.py: cannot locate the CITATION regex for the acronym guard")
else:
    rx = re.compile(pat)
    false_pos = [t for t in ("(REFINE)", "(AI)", "(PARTS)") if rx.search(t)]
    missed = [t for t in ("(Park & Choo, 2024)", "(Sun et al., 2025)", "(Nash)") if not rx.search(t)]
    if false_pos:
        errors.append(f"verify_deck.py CITATION regex treats acronyms as citations: {false_pos} (D1)")
    if missed:
        errors.append(f"verify_deck.py CITATION regex no longer matches real cites: {missed}")

for e in errors:
    print(e)
PY
)
pystatus=$?
if [ "$pystatus" -ne 0 ]; then
  # a crash here means checks 6/7/11/12 did NOT run — never report success
  err "embedded python checks crashed (exit $pystatus); checks 6/7/11/12 did not run:"
  [ -n "$pyout" ] && printf '%s\n' "$pyout" | sed 's/^/       /'
elif [ -n "$pyout" ]; then
  while IFS= read -r line; do err "$line"; done <<< "$pyout"
fi

# ---------------------------------------------------------------------------
# 8. Icon-font ban in the build template
# ---------------------------------------------------------------------------
if grep -niE "fontFace:[^,}]*(material|font ?awesome|glyphicon)" scripts/build_deck_template.js; then
  err "build_deck_template.js sets an icon font as fontFace (verify_deck hard-fails this in built decks)"
fi

# ---------------------------------------------------------------------------
# 9. BG_IMAGE default must ship with the skill
# ---------------------------------------------------------------------------
bgimg=$(grep -oE "const BG_IMAGE = '[^']*'" scripts/build_deck_template.js | sed "s/.*'\(.*\)'/\1/")
if [ -n "$bgimg" ] && [ ! -f "$bgimg" ]; then
  err "build_deck_template.js BG_IMAGE default '$bgimg' does not exist in the skill folder"
fi

# ---------------------------------------------------------------------------
# 10. "The takeaway:" marker parity (topup insertion anchor)
# ---------------------------------------------------------------------------
for f in SKILL.md scripts/embed_notes.py references/script_template.json; do
  grep -qF 'The takeaway:' "$f" || err "$f: 'The takeaway:' marker contract missing (topup anchor)"
done

# ---------------------------------------------------------------------------
# 13. Stale phase vocabulary in scripts (current scheme: Phase 0 intake,
#     1 script, 2 build, 3 QA; REPAIR steps 1-5)  (B5)
# ---------------------------------------------------------------------------
for s in "Phase 1 (citations)" "Phase 2/3 (notes"; do
  while IFS=: read -r file lineno _; do
    [ -z "${file:-}" ] && continue
    err "$file:$lineno: stale phase vocabulary '$s' (B5)"
  done < <(grep -rnF "$s" scripts/ 2>/dev/null | grep -v 'validate-contracts\.sh' || true)
done

# ---------------------------------------------------------------------------
# 14. Known overclaim strings (must not reappear once fixed)
# ---------------------------------------------------------------------------
# (whitespace-normalize first: both phrases are line-wrapped in the sources)
tr -s '[:space:]' ' ' < README.md | grep -qF "renders correctly anywhere" && \
  err "README.md: 'renders correctly anywhere' — fonts substitute off-Windows; only icons are render-safe (E1)"
tr -s '[:space:]' ' ' < SKILL.md | grep -qF "usually preinstalled" && \
  err "SKILL.md: 'usually preinstalled' — replace with a preflight check (A4)"

# ---------------------------------------------------------------------------
# 15. .gitignore regression guard (already thorough at audit time)
# ---------------------------------------------------------------------------
if [ ! -f .gitignore ]; then
  err ".gitignore missing — working artifacts (node_modules, *.pptx, rv_*/, mNN_*.json) must stay out of version control"
else
  for pat in node_modules "*.pptx" "rv_*"; do
    grep -qF "$pat" .gitignore || err ".gitignore no longer covers '$pat'"
  done
fi

# ---------------------------------------------------------------------------
if [ "$FAIL" -eq 0 ]; then
  echo "OK: contracts, claims, and wiring are consistent."
fi
exit "$FAIL"
