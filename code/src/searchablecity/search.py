"""Build a local text index and return matching captions with their metadata."""

from pathlib import Path
import sqlite3
import json
from .records import records
from .files import fresh


def index(source, output):
    out = fresh(output)
    temp = fresh(str(out) + ".partial")
    con = sqlite3.connect(temp)
    count = 0
    try:
        con.execute(
            "CREATE TABLE records (rowid INTEGER PRIMARY KEY, payload TEXT NOT NULL)"
        )
        con.execute("CREATE VIRTUAL TABLE captions USING fts5(caption)")
        con.execute(
            "CREATE UNIQUE INDEX record_id ON records(json_extract(payload,'$.record_id'))"
        )
        for row in records(source):
            text = row.get("caption")
            if not isinstance(text, str) or not text.strip():
                raise ValueError("Every indexed row needs nonempty caption text")
            ident = row.get("record_id") or json.dumps(
                [
                    row.get("city"),
                    row.get("image_provider", row.get("caption_image_provider")),
                    row["image_id"],
                    row.get("direction"),
                    row.get("view_index"),
                ],
                separators=(",", ":"),
            )
            row["record_id"] = ident
            cur = con.execute(
                "INSERT INTO records(payload) VALUES (?)",
                (json.dumps(row, ensure_ascii=False),),
            )
            con.execute(
                "INSERT INTO captions(rowid,caption) VALUES (?,?)",
                (cur.lastrowid, text),
            )
            count += 1
        con.commit()
    finally:
        con.close()
    temp.rename(out)
    return count


def search(database, query, limit):
    if not Path(database).is_file():
        raise FileNotFoundError(database)
    con = sqlite3.connect(Path(database).resolve().as_uri() + "?mode=ro", uri=True)
    try:
        result = con.execute(
            "SELECT r.payload FROM captions c JOIN records r ON r.rowid=c.rowid WHERE captions MATCH ? ORDER BY bm25(captions) LIMIT ?",
            (query, limit),
        )
        return [json.loads(row[0]) for row in result]
    finally:
        con.close()
