#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Migrazione unificata (Concerti + Repertorio) → seed SQL per main.sqlite

Legge:
  - cms/data/legacy/repertoire-structured-expanded.json
  - cms/data/legacy/repertoire-composers-index.json
  - cms/data/concerts.json   (se manca, usa cms/data/legacy/concerts.json)

Scrive (non tocca il DB direttamente):
  - cms/db/seed_unified.sql
  - cms/db/migrate_report.txt

Applica poi con:
  sqlite3 cms/db/main.sqlite < cms/db/seed_unified.sql
"""

import json
import re
import unicodedata
from datetime import date
from pathlib import Path
from typing import Any

# -------------------------------------------------------------------
# Percorsi
# -------------------------------------------------------------------
CMS_DIR = Path(__file__).resolve().parents[1]     # cms/
DATA_DIR = CMS_DIR / "data"
LEGACY_DIR = DATA_DIR / "legacy"
DB_DIR = CMS_DIR / "db"

REPERTOIRE_EXP = LEGACY_DIR / "repertoire-structured-expanded.json"
COMPOSERS_INDEX = LEGACY_DIR / "repertoire-composers-index.json"
CONCERTS_JSON_1 = DATA_DIR / "concerts.json"
CONCERTS_JSON_2 = LEGACY_DIR / "concerts.json"

SEED_SQL = DB_DIR / "seed_unified.sql"
REPORT_TXT = DB_DIR / "migrate_report.txt"

# -------------------------------------------------------------------
# Utility
# -------------------------------------------------------------------
def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)

def strip_accents_lower(s: str) -> str:
    s = s or ""
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn").lower()

def slugify(s: str) -> str:
    s = strip_accents_lower(s or "")
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")

def esc(s: str | None) -> str:
    if s is None:
        return ""
    return s.replace("'", "''")

def short_name(full: str | None) -> str:
    if not full:
        return ""
    parts = full.strip().split()
    if len(parts) == 1:
        return parts[0]
    # "Johann Strauss II" → "Strauss II"
    if re.search(r"\bI{1,3}\b|IV|V$", parts[-1]):
        return f"{parts[-2]} {parts[-1]}"
    return parts[-1]

def sort_key(full: str | None) -> str:
    if not full:
        return ""
    parts = full.strip().split()
    if len(parts) == 1:
        return parts[0]
    particles = {"de", "del", "della", "di", "da", "van", "von", "der"}
    last = parts[-1]
    first = " ".join(parts[:-1])
    if last.lower() in particles and len(parts) >= 3:
        last = parts[-2] + " " + parts[-1]
        first = " ".join(parts[:-2])
    return f"{last}, {first}"

# # -------------------------------------------------------------------
# Helpers compositori (ROBUSTI: accettano list/str/dict)
# -------------------------------------------------------------------
def to_list(x: Any) -> list[str]:
    """Normalizza qualsiasi forma (list/str/dict/None) in lista di stringhe."""
    if x is None:
        return []
    if isinstance(x, list):
        return [y for y in x if isinstance(y, str)]
    if isinstance(x, str):
        return [x]
    if isinstance(x, dict):
        out: list[str] = []
        for v in x.values():
            out += to_list(v)
        return out
    return []

def build_composer_map(index_json: Any) -> dict[str, str]:
    """
    mapping chiave normalizzata → nome canonico completo
    supporta:
      - [{"full_name": "...", "aliases": ["...", ...]}, ...]
      - ["Wolfgang Amadeus Mozart", ...]
      - { "Wolfgang Amadeus Mozart": ["W.A. Mozart", "Mozart"] , ...}
      - varianti dove "aliases" è un oggetto con chiavi lingua → liste
    """
    m: dict[str, str] = {}

    if isinstance(index_json, list):
        for item in index_json:
            if isinstance(item, str):
                canon = item
                aliases_list: list[str] = []
            else:
                canon = item.get("full_name") or item.get("name") or item.get("composer") or ""
                aliases_list = (
                    to_list(item.get("aliases"))
                    + to_list(item.get("aka"))
                    + to_list(item.get("variants"))
                    + to_list(item.get("alt"))
                )
            for k in [canon] + aliases_list:
                if k:
                    m[strip_accents_lower(k)] = canon

    elif isinstance(index_json, dict):
        for canon, aliases in index_json.items():
            aliases_list = to_list(aliases)
            for k in [canon] + aliases_list:
                if k:
                    m[strip_accents_lower(k)] = canon

    # scorciatoie comuni + normalizzazioni frequenti
    extra = [
        ("w.a. mozart", "Wolfgang Amadeus Mozart"),
        ("mozart", "Wolfgang Amadeus Mozart"),
        ("b. britten", "Benjamin Britten"),
        ("elgar", "Edward Elgar"),
        ("g. rossini", "Gioachino Rossini"),
        ("f. mendelssohn", "Felix Mendelssohn"),
        ("f. mendelssohn bartholdy", "Felix Mendelssohn"),
        ("respighi", "Ottorino Respighi"),
        ("warlock", "Peter Warlock"),
        ("schubert", "Franz Schubert"),
        ("händel", "George Frideric Handel"),
        ("handel", "George Frideric Handel"),
    ]
    for k, v in extra:
        m.setdefault(k, v)

    return m

# -------------------------------------------------------------------
# Categorie
# -------------------------------------------------------------------
CATEGORY_MAP: dict[str, tuple[str, str]] = {
    "sinfonie": ("Sinfonie", "Symphonies"),
    "ouverture": ("Ouverture", "Overtures"),
    "concerti": ("Concerti", "Concertos"),
    "suite": ("Suite", "Suites"),
    "vocale": ("Vocale", "Vocal"),
    "altri-generi": ("Altri generi", "Other"),
}

def guess_category_slug(work_title: str) -> str:
    s = strip_accents_lower(work_title)
    if re.search(r"\bsinfon", s) or re.search(r"\bsymph", s) or re.search(r"\bk\.?\s*\d", s):
        return "sinfonie"
    if "ouvert" in s or "overture" in s:
        return "ouverture"
    if "concerto" in s:
        return "concerti"
    if "suite" in s:
        return "suite"
    if any(x in s for x in ["messa", "mass", "requiem", "cantata", "aria"]):
        return "vocale"
    return "altri-generi"

# -------------------------------------------------------------------
# Euristica Mozart (Köchel / titolo concerto)
# -------------------------------------------------------------------
def guess_composer_from_context(concert_title: str | None, work_title: str | None) -> str | None:
    ctx = strip_accents_lower((concert_title or "") + " " + (work_title or ""))
    # basta la parola "mozart" in qualsiasi parte del contesto
    if "mozart" in ctx:
        return "Wolfgang Amadeus Mozart"
    # oppure presenza di K/K. + numero (Köchel) nel titolo del pezzo
    if re.search(r"\bk\.?\s*\d+[a-z]?\b", work_title or "", flags=re.IGNORECASE):
        return "Wolfgang Amadeus Mozart"
    # opzionale: “symphonies challenge”
    if "symphonies challenge" in ctx or "symphony challenge" in ctx:
        return "Wolfgang Amadeus Mozart"
    return None

# -------------------------------------------------------------------
# Helpers programma
# -------------------------------------------------------------------
KNUM_RE = re.compile(r"\bk\.?\s*([0-9]+[a-z]?)\b", re.IGNORECASE)

def extract_catalogue(work_title: str) -> str:
    m = KNUM_RE.search(work_title or "")
    if m:
        return f"K{m.group(1)}"
    m2 = re.search(r"\b(op\.?\s*\d+[a-z]?)\b", work_title or "", flags=re.IGNORECASE)
    if m2:
        return m2.group(1).replace(" ", "")
    return ""

def normalize_piece_title(s: str) -> str:
    s = (s or "").strip()
    s = re.sub(r"^\s*[-–—]\s*", "", s)
    s = re.sub(r"\s+", " ", s)
    return s

def split_program(program_str: str) -> list[str]:
    lines = [l.strip() for l in (program_str or "").split("\n")]
    return [l for l in lines if l]

def parse_program_line(line: str) -> tuple[str | None, str]:
    m = re.match(r"^\s*([^,]+)\s*,\s*(.+)$", line)
    if m:
        return m.group(1).strip(), normalize_piece_title(m.group(2))
    return None, normalize_piece_title(line)

# -------------------------------------------------------------------
# Collezioni temporanee
# -------------------------------------------------------------------
composers_set: dict[str, dict[str, str]] = {}  # slug → {full_name, short_name, sort_key}
works_set: dict[tuple[str, str], dict[str, str]] = {}  # (composer_slug, work_key) → meta
concerts_set: list[dict] = []
program_links: list[dict] = []
unmatched: list[dict] = []

def ensure_composer(full: str) -> str:
    slug = slugify(full)
    if slug not in composers_set:
        composers_set[slug] = {
            "full_name": full,
            "short_name": short_name(full),
            "sort_key": sort_key(full),
        }
    return slug

def add_work(composer_full: str, work_title: str, category_slug: str, catalogue: str = "", subtitle: str = ""):
    comp_slug = ensure_composer(composer_full)
    title_norm = normalize_piece_title(work_title)
    work_key = slugify(title_norm + ("-" + catalogue if catalogue else ""))
    k = (comp_slug, work_key)
    if k not in works_set:
        works_set[k] = {
            "composer_slug": comp_slug,
            "title": title_norm,
            "subtitle": subtitle,
            "catalogue": catalogue,
            "category_slug": category_slug,
            "work_key": work_key,
        }
    return k

# -------------------------------------------------------------------
# Import repertorio
# -------------------------------------------------------------------
def import_repertoire(rep_exp: Any, composer_map: dict[str, str]) -> None:
    by_category = rep_exp.get("by_category") if isinstance(rep_exp, dict) else None
    if by_category:
        for cat_slug, items in (by_category or {}).items():
            for it in items or []:
                comp_full = canonical_composer(it.get("composer"), composer_map)
                title = it.get("title") or it.get("name") or ""
                if not comp_full or not title:
                    continue
                catalogue = it.get("catalogue") or extract_catalogue(title)
                add_work(comp_full, title, cat_slug or guess_category_slug(title), catalogue)
    else:
        for it in rep_exp:
            comp_full = canonical_composer(it.get("composer"), composer_map)
            title = it.get("title") or ""
            if not comp_full or not title:
                continue
            cat = it.get("category_slug") or guess_category_slug(title)
            add_work(comp_full, title, cat, it.get("catalogue") or extract_catalogue(title))

# -------------------------------------------------------------------
# Import concerti
# -------------------------------------------------------------------
def import_concerts(concerts_json: Any, composer_map: dict[str, str]) -> None:
    today = date.today().isoformat()
    for year_block in concerts_json:
        for ev in year_block.get("concerts", []):
            d = ev.get("date") or f"{year_block.get('year')}-01-01"
            title = ev.get("title") or "Concerto"
            loc = ev.get("location") or ""
            poster_local = ev.get("poster") or ev.get("poster_local_filename") or ""
            poster_cloud = ev.get("poster_cloudinary_id") or ""
            is_future = 1 if d >= today else 0

            concerts_set.append({
                "date": d,
                "title": title,
                "location": loc,
                "poster_local": poster_local,
                "poster_cloud": poster_cloud,
                "program_notes": ev.get("notes") or "",
                "is_future": is_future,
            })

            pos = 1
            for ln in split_program(ev.get("program") or ""):
                comp_raw, piece = parse_program_line(ln)
                comp_full = canonical_composer(comp_raw, composer_map) if comp_raw else None
                if not comp_full:
                    moz = guess_composer_from_context(title, piece)
                    if moz:
                        comp_full = canonical_composer(moz, composer_map)

                if comp_full:
                    cat_slug = guess_category_slug(piece)
                    catalogue = extract_catalogue(piece)
                    add_work(comp_full, piece, cat_slug, catalogue)
                    program_links.append({
                        "concert_key": (title, d),
                        "position": pos,
                        "work_title_raw": piece,
                        "composer_full": comp_full,
                        "category_slug": cat_slug,
                        "catalogue": catalogue,
                    })
                else:
                    unmatched.append({
                        "concert_key": [title, d],
                        "composer_full": comp_raw,
                        "work_title_raw": piece,
                        "position": pos,
                        "reason": "composer_not_resolved" if comp_raw else "missing_composer_or_title",
                    })
                pos += 1

# -------------------------------------------------------------------
# SQL
# -------------------------------------------------------------------
def sql_insert_categories() -> list[str]:
    out = ["-- Categories (idempotent)"]
    for slug, (it, en) in CATEGORY_MAP.items():
        out.append(
            "INSERT OR IGNORE INTO categories(slug, label_it, label_en, position)\n"
            f"VALUES('{esc(slug)}','{esc(it)}','{esc(en)}',NULL);"
        )
    out.append("")
    return out

def sql_insert_composers() -> list[str]:
    out = ["-- Composers"]
    for slug, meta in sorted(composers_set.items(), key=lambda x: x[1]["sort_key"]):
        out.append(
            "INSERT OR IGNORE INTO composers(slug, full_name, short_name, sort_key)\n"
            f"VALUES('{esc(slug)}','{esc(meta['full_name'])}','{esc(meta['short_name'])}','{esc(meta['sort_key'])}');"
        )
    out.append("")
    return out

def sql_insert_works() -> list[str]:
    out = ["-- Works"]
    for (comp_slug, work_key), meta in sorted(works_set.items(), key=lambda x: (x[0][0], x[1]["title"])):
        out.append(
            "INSERT OR IGNORE INTO works(composer_id, category_id, title, subtitle, catalogue, work_key, year, notes_it, notes_en, media_video, media_audio, created_at, updated_at)\n"
            f"SELECT c.id, cat.id, '{esc(meta['title'])}', '{esc(meta['subtitle'])}', '{esc(meta['catalogue'])}', '{esc(meta['work_key'])}', NULL, '', '', '', '', DATETIME('now'), DATETIME('now')\n"
            "FROM composers c, categories cat\n"
            f"WHERE c.slug='{esc(comp_slug)}' AND cat.slug='{esc(meta['category_slug'])}';"
        )
    out.append("")
    return out

def sql_insert_concerts() -> list[str]:
    out = ["-- Concerts"]
    for ev in sorted(concerts_set, key=lambda x: (x["date"], x["title"])):
        out.append(
            "INSERT OR IGNORE INTO concerts(title, date, location, poster_cloudinary_id, poster_local_filename, is_future, program_notes, created_at, updated_at)\n"
            f"VALUES('{esc(ev['title'])}','{esc(ev['date'])}','{esc(ev['location'])}','{esc(ev['poster_cloud'])}','{esc(ev['poster_local'])}',{ev['is_future']},'{esc(ev['program_notes'])}',DATETIME('now'),DATETIME('now'));"
        )
    out.append("")
    return out

def sql_insert_concert_program() -> list[str]:
    out = ["-- Concert program"]
    for p in sorted(program_links, key=lambda x: (x["concert_key"][1], x["position"])):
        title, d = p["concert_key"]
        comp_slug = slugify(p["composer_full"])
        wkey = slugify(normalize_piece_title(p["work_title_raw"]) + ("-" + p["catalogue"] if p["catalogue"] else ""))
        out.append(
            "INSERT OR IGNORE INTO concert_program(concert_id, work_id, position, first_time, notes)\n"
            "SELECT cn.id, w.id, {pos}, 0, ''\n"
            "FROM concerts cn, works w, composers c\n"
            f"WHERE cn.title='{esc(title)}' AND cn.date='{esc(d)}'\n"
            f"  AND w.work_key='{esc(wkey)}'\n"
            f"  AND c.id = w.composer_id AND c.slug='{esc(comp_slug)}';"
            .format(pos=p["position"])
        )
    out.append("")
    return out

# -------------------------------------------------------------------
# Main
# -------------------------------------------------------------------
def main() -> None:
    if not REPERTOIRE_EXP.exists():
        raise SystemExit(f"Manca {REPERTOIRE_EXP}")
    if not COMPOSERS_INDEX.exists():
        raise SystemExit(f"Manca {COMPOSERS_INDEX}")

    rep_exp = load_json(REPERTOIRE_EXP)
    comp_index = load_json(COMPOSERS_INDEX)
    composer_map = build_composer_map(comp_index)

    concerts_path = CONCERTS_JSON_1 if CONCERTS_JSON_1.exists() else CONCERTS_JSON_2
    if not concerts_path.exists():
        raise SystemExit(f"Manca concerts.json (atteso {CONCERTS_JSON_1} oppure {CONCERTS_JSON_2})")
    concerts_json = load_json(concerts_path)

    # 1) importa dati
    import_repertoire(rep_exp, composer_map)
    import_concerts(concerts_json, composer_map)

    # 2) report
    REPORT_TXT.parent.mkdir(parents=True, exist_ok=True)
    with REPORT_TXT.open("w", encoding="utf-8") as rep:
        rep.write(f"UNMATCHED PROGRAM LINES: {len(unmatched)}\n")
        for row in unmatched:
            rep.write(json.dumps(row, ensure_ascii=False) + "\n")

    # 3) SQL
    lines: list[str] = []
    lines.append("-- AUTO-GENERATED BY migrate_unified.py")
    lines.append("PRAGMA foreign_keys=OFF;")
    lines.append("BEGIN;")
    lines.append("")

    lines.extend(sql_insert_categories())
    lines.extend(sql_insert_composers())
    lines.extend(sql_insert_works())
    lines.extend(sql_insert_concerts())
    lines.extend(sql_insert_concert_program())

    lines.append("COMMIT;")
    lines.append("PRAGMA foreign_keys=ON;")
    lines.append("")

    SEED_SQL.parent.mkdir(parents=True, exist_ok=True)
    with SEED_SQL.open("w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    print(f"[OK] Composers: {len(composers_set)}")
    print(f"[OK] Works:     {len(works_set)}")
    print(f"[OK] Concerts:  {len(concerts_set)}")
    print(f"[OK] Program rows linked: {len(program_links)}")
    print(f"[INFO] Unmatched program lines: {len(unmatched)}  →  {REPORT_TXT}")
    print(f"[OUT] SQL seed: {SEED_SQL}")
    print("")
    print("Applica i dati con:")
    print(f"  sqlite3 {DB_DIR/'main.sqlite'} < {SEED_SQL}")

if __name__ == "__main__":
    main()