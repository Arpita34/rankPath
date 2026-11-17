"""
Turn official counselling closing-rank PDFs into data/cutoffs.json rows.

The official sources publish "last rank" statements as PDFs:
  - TG EAPCET: https://tgeapcet.nic.in  (Last Rank Statement, final phase)
  - AP EAPCET: https://eapcet-sche.aptonline.in (Last Rank Details)
  - JoSAA:     https://josaa.admissions.nic.in (Opening & Closing Ranks; export the table as CSV)
  - KCET:      https://cetonline.karnataka.gov.in/kea (Cut-off ranks PDF)

Usage:
  pip install pdfplumber
  python -I scripts/scrape_cutoffs.py --exam TG_EAPCET --pdf path/to/last_rank.pdf
  python -I scripts/scrape_cutoffs.py --exam JEE_MAIN --csv path/to/josaa.csv

It replaces the rows for that exam in data/cutoffs.json and keeps every other exam.
Column layouts change from year to year, so check COLUMN_HINTS against the file's header.
"""
import argparse
import csv
import json
import re
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "data" / "cutoffs.json"
BRANCHES = {"CSE", "CSM", "CSD", "AI", "AID", "ECE", "IT", "EEE"}

# Header names to look for (lower-case, substring match).
COLUMN_HINTS = {
    "college": ["inst_name", "institute", "college name", "college"],
    "branch": ["branch_code", "branch", "program", "course"],
    "rank": ["oc_boys", "oc gen", "closing rank", "gm", "oc"],
    "city": ["place", "district", "city"],
}


def find_col(header, key):
    lowered = [str(h or "").strip().lower() for h in header]
    for hint in COLUMN_HINTS[key]:
        for i, h in enumerate(lowered):
            if hint in h:
                return i
    return None


def to_rank(value):
    m = re.search(r"\d+", str(value or "").replace(",", ""))
    return int(m.group()) if m else None


def rows_from_table(header, body, exam):
    ci, bi, ri = find_col(header, "college"), find_col(header, "branch"), find_col(header, "rank")
    pi = find_col(header, "city")
    if None in (ci, bi, ri):
        return []
    out = []
    for r in body:
        branch = str(r[bi] or "").strip().upper()
        rank = to_rank(r[ri])
        if branch not in BRANCHES or not rank:
            continue
        out.append({
            "exam": exam,
            "college": " ".join(str(r[ci]).split()),
            "city": str(r[pi]).strip().title() if pi is not None and r[pi] else "",
            "state": {"TG_EAPCET": "Telangana", "AP_EAPCET": "Andhra Pradesh", "KCET": "Karnataka"}.get(exam, ""),
            "type": "Official list",
            "branch": branch,
            "closing_rank": rank,
            "fee_per_year_inr": 0,
        })
    return out


def from_pdf(path, exam):
    import pdfplumber  # imported here so the CSV mode works without it
    rows = []
    with pdfplumber.open(path) as pdf:
        header = None
        for page in pdf.pages:
            for table in page.extract_tables():
                if not table:
                    continue
                if header is None or find_col(table[0], "college") is not None:
                    header, body = table[0], table[1:]
                else:
                    body = table
                rows += rows_from_table(header, body, exam)
    return rows


def from_csv(path, exam):
    with open(path, newline="", encoding="utf-8-sig") as f:
        data = list(csv.reader(f))
    return rows_from_table(data[0], data[1:], exam)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--exam", required=True, choices=["JEE_MAIN", "TG_EAPCET", "AP_EAPCET", "KCET"])
    src = ap.add_mutually_exclusive_group(required=True)
    src.add_argument("--pdf")
    src.add_argument("--csv")
    args = ap.parse_args()

    new_rows = from_pdf(args.pdf, args.exam) if args.pdf else from_csv(args.csv, args.exam)
    if not new_rows:
        raise SystemExit("No rows parsed - check COLUMN_HINTS against the file's header row.")

    db = json.loads(DATA.read_text(encoding="utf-8"))
    db["rows"] = [r for r in db["rows"] if r["exam"] != args.exam] + new_rows
    db["_meta"]["source"] = db["_meta"]["source"].replace("SEED DATASET", "PARTLY OFFICIAL")
    DATA.write_text(json.dumps(db, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {len(new_rows)} {args.exam} rows to {DATA}")


if __name__ == "__main__":
    main()
