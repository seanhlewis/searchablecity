"""Small file helpers shared by the pipeline steps."""

from pathlib import Path
import json


def fresh(path):
    path = Path(path)
    if path.exists():
        raise FileExistsError("Refusing to overwrite: " + str(path))
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


def write_jsonl(source, output):
    out = fresh(output)
    with out.open("x", encoding="utf-8") as f:
        for row in source:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")
