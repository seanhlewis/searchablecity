"""Streaming record normalization; coordinates always describe the camera."""

import csv
import json
import math
from datetime import date, datetime, time
from pathlib import Path
from PIL import Image

DIRECTIONS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]


def rows(path):
    path = Path(path)
    if path.suffix == ".parquet":
        import pyarrow.parquet as pq

        for batch in pq.ParquetFile(path).iter_batches(batch_size=4096):
            yield from batch.to_pylist()
    elif path.suffix == ".csv":
        with path.open(encoding="utf-8-sig", newline="") as f:
            yield from csv.DictReader(f)
    else:
        with path.open(encoding="utf-8-sig") as f:
            for line in f:
                if line.strip():
                    yield json.loads(line)


def json_metadata(value, field="record"):
    """Convert Arrow dates to ISO 8601; keep timezone offsets, never invent UTC."""
    if value is None or isinstance(value, (str, bool, int)):
        return value
    if isinstance(value, float) and math.isfinite(value):
        return value
    if isinstance(value, (datetime, date, time)):
        return value.isoformat()
    if isinstance(value, dict):
        return {
            key: json_metadata(item, f"{field}.{key}") for key, item in value.items()
        }
    if isinstance(value, (list, tuple)):
        return [json_metadata(item, f"{field}[{i}]") for i, item in enumerate(value)]
    raise ValueError(f"Unsupported metadata at {field}: {type(value).__name__}")


def normalize(row):
    row = json_metadata(dict(row))
    ident = row.get("image_id", row.get("panoid", row.get("pano_id", row.get("id"))))
    if ident is None or str(ident) == "":
        raise ValueError("Missing source image ID")
    lat, lng = float(row["lat"]), float(row["lng"])
    if (
        not math.isfinite(lat)
        or not math.isfinite(lng)
        or not (-90 <= lat <= 90 and -180 <= lng <= 180)
    ):
        raise ValueError("Invalid camera coordinates")
    row.update(image_id=str(ident), lat=lat, lng=lng)
    if isinstance(row.get("captions"), list):
        captions = row.pop("captions")
        directions = row.pop("directions", None)
        if directions is not None and len(directions) != len(captions):
            raise ValueError("Caption/direction length mismatch")
        for i, caption in enumerate(captions):
            # Short lists cannot establish which headings were omitted.
            direction = (
                directions[i]
                if directions is not None
                else (DIRECTIONS[i] if len(captions) == 8 else None)
            )
            yield {**row, "caption": caption, "direction": direction, "view_index": i}
    else:
        yield row


def records(path):
    """Yield one caption/image view at a time from CSV, JSONL or Parquet."""
    for row in rows(path):
        yield from normalize(row)


def image_for(row, root):
    """Read one local image without changing the input file."""
    root = Path(root).resolve()
    relative = row.get("image_path")
    if not relative:
        raise ValueError("Captioning needs image_path relative to --image-root")
    path = (root / relative).resolve()
    if not path.is_relative_to(root):
        raise ValueError("Image path escapes image root")
    with Image.open(path) as image:
        return image.convert("RGB")
