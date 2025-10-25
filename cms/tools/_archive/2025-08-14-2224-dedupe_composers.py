#!/usr/bin/env python3
import sqlite3, re, unicodedata, sys
from pathlib import Path

DB_PATH = Path(__file__).resolve().parents[1] / 'db' / 'main.sqlite'

def strip_accents(s: str) -> str:
  if not s: return ''
  nfkd = unicodedata.normalize('NFKD', s)
  return ''.join(c for c in nfkd if not unicodedata.combining(c))

def clean(s: str) -> str:
  s = s or ''
  s = strip_accents(s)
  s = s.lower()
  # togli punteggiatura comune, lascia solo lettere/numeri/spazi
  s = re.sub(r"[^a-z0-9\s]", " ", s)
  s = re.sub(r"\s+", " ", s).strip()
  return s

def kebab(s: str) -> str:
  s = strip_accents(s).strip()
  s = re.sub(r"\s+", "-", s)
  return s.lower()

def recompute_fields(full_name: str):
  full = full_name.strip()
  # sort_key
  parts = full.split()
  if len(parts) > 1:
    surname = parts[-1]
    given   = " ".join(parts[:-1])
    sort_key = f"{surname}, {given}"
    short_name = surname
  else:
    sort_key = full
    short_name = full
  slug = kebab(full)
  return slug, short_name, sort_key

def main():
  conn = sqlite3.connect(str(DB_PATH))
  conn.row_factory = sqlite3.Row
  cur = conn.cursor()
  cur.execute("PRAGMA foreign_keys=ON;")

  rows = list(cur.execute("SELECT id, full_name FROM composers"))
  buckets = {}
  for r in rows:
    norm = clean(r["full_name"])
    buckets.setdefault(norm, []).append(r["id"])

  merges = [(ids[0], ids[1:]) for norm, ids in buckets.items() if len(ids) > 1]

  print(f"[INFO] groups to merge: {len(merges)}")
  for keep_id, dup_ids in merges:
    if not dup_ids: continue
    q_marks = ",".join("?"*len(dup_ids))
    cur.execute(f"UPDATE works SET composer_id=? WHERE composer_id IN ({q_marks})",
                [keep_id, *dup_ids])
    cur.execute(f"DELETE FROM composers WHERE id IN ({q_marks})", dup_ids)

  # Ricalcola i campi derivati in modo uniforme
  rows = list(cur.execute("SELECT id, full_name FROM composers"))
  for r in rows:
    slug, short_name, sort_key = recompute_fields(r["full_name"])
    cur.execute("""UPDATE composers
                   SET slug=?, short_name=?, sort_key=?
                   WHERE id=?""",
                [slug, short_name, sort_key, r["id"]])

  conn.commit()
  # Report finale
  n_comp = cur.execute("SELECT COUNT(*) FROM composers").fetchone()[0]
  n_works = cur.execute("SELECT COUNT(*) FROM works").fetchone()[0]
  print(f"[OK] composers: {n_comp}, works: {n_works}")

if __name__ == "__main__":
  sys.exit(main())