#!/usr/bin/env python3
"""Download Mapillary source images referenced by a Searchable.City release.

The release contains repeated directional caption rows. This tool deduplicates
by (city, image_id), downloads one Mapillary thumbnail per source panorama,
and writes a manifest whose image_path values are directly usable by the
Searchable.City prepare/caption pipeline. It never crops images and never
writes a Mapillary token to disk.
"""

from __future__ import annotations

import argparse
import csv
import io
import json
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Iterable
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

from PIL import Image

GRAPH_FIELDS = "id,thumb_1024_url,is_pano,captured_at,geometry,compass_angle,sequence,creator"
LICENSE_URL = "https://creativecommons.org/licenses/by-sa/4.0/"


def slug(value: str) -> str:
    return "-".join(value.lower().replace("_", " ").split())


def as_float(value):
    if value in (None, "", "nan", "NaN", "null"):
        return None
    return float(value)


def as_int(value):
    if value in (None, "", "nan", "NaN", "null"):
        return None
    return int(float(value))


def source_rows(path: Path) -> Iterable[dict]:
    suffix = path.suffix.lower()
    if suffix == ".parquet":
        import pyarrow.parquet as pq
        for batch in pq.ParquetFile(path).iter_batches(batch_size=4096):
            yield from batch.to_pylist()
    elif suffix in {".jsonl", ".ndjson"}:
        with path.open(encoding="utf-8") as handle:
            for line in handle:
                if line.strip():
                    yield json.loads(line)
    else:
        with path.open(encoding="utf-8-sig", newline="") as handle:
            yield from csv.DictReader(handle)


def normalize_row(row: dict, city_filter: str | None) -> dict | None:
    city = str(row.get("city") or city_filter or "").strip()
    image_id = str(row.get("image_id") or row.get("id") or "").strip()
    if not city or not image_id:
        return None
    if city_filter and city.lower() != city_filter.lower():
        return None
    lat = row.get("latitude", row.get("lat"))
    lng = row.get("longitude", row.get("lng"))
    return {
        "city": city,
        "image_id": image_id,
        "lat": as_float(lat),
        "lng": as_float(lng),
        "captured_at_ms": as_int(row.get("captured_at_ms")),
        "compass_angle": as_float(row.get("compass_angle")),
        "sequence_id": str(row.get("sequence_id") or row.get("sequence") or ""),
        "mapillary_url": str(row.get("mapillary_url") or f"https://www.mapillary.com/app/?focus=photo&pKey={image_id}"),
        "caption_rows": 1,
    }


def collect_records(path: Path, city_filter: str | None) -> list[dict]:
    records: dict[tuple[str, str], dict] = {}
    for raw in source_rows(path):
        row = normalize_row(raw, city_filter)
        if row is None:
            continue
        key = (row["city"], row["image_id"])
        if key in records:
            records[key]["caption_rows"] += 1
        else:
            records[key] = row
    return [records[key] for key in sorted(records)]


def graph_json(image_id: str, token: str) -> dict:
    url = f"https://graph.mapillary.com/{quote(image_id)}?fields={quote(GRAPH_FIELDS)}"
    request = Request(url, headers={"Authorization": f"OAuth {token}"})
    with urlopen(request, timeout=45) as response:
        return json.load(response)


def fetch_bytes(url: str) -> bytes:
    with urlopen(Request(url), timeout=90) as response:
        data = response.read(16 * 1024 * 1024 + 1)
    if len(data) > 16 * 1024 * 1024:
        raise RuntimeError("image exceeds 16 MiB safety limit")
    with Image.open(io.BytesIO(data)) as image:
        if image.format != "JPEG":
            raise RuntimeError(f"expected JPEG, received {image.format}")
        image.verify()
    return data


def download_one(row: dict, root: Path, token: str, overwrite: bool) -> dict:
    city_slug = slug(row["city"])
    relative = Path("images") / city_slug / f"{row['image_id']}.jpg"
    destination = root / relative
    if destination.exists() and not overwrite:
        return {**row, "status": "existing", "image_path": relative.as_posix(), "bytes": destination.stat().st_size}
    last_error = "unknown error"
    for attempt in range(4):
        try:
            metadata = graph_json(row["image_id"], token)
            if str(metadata.get("id")) != row["image_id"]:
                raise RuntimeError("Mapillary returned a different image ID")
            image_url = metadata.get("thumb_1024_url")
            if not image_url:
                raise RuntimeError("Mapillary did not return thumb_1024_url")
            data = fetch_bytes(image_url)
            destination.parent.mkdir(parents=True, exist_ok=True)
            partial = destination.with_suffix(".jpg.part")
            partial.write_bytes(data)
            partial.replace(destination)
            geometry = metadata.get("geometry") or {}
            coordinates = geometry.get("coordinates") or [row["lng"], row["lat"]]
            return {
                **row,
                "status": "downloaded",
                "image_path": relative.as_posix(),
                "bytes": len(data),
                "is_pano": metadata.get("is_pano"),
                "captured_at": metadata.get("captured_at"),
                "compass_angle": metadata.get("compass_angle", row["compass_angle"]),
                "sequence_id": metadata.get("sequence", {}).get("id", row["sequence_id"]) if isinstance(metadata.get("sequence"), dict) else metadata.get("sequence", row["sequence_id"]),
                "lat": coordinates[1] if len(coordinates) > 1 else row["lat"],
                "lng": coordinates[0] if coordinates else row["lng"],
                "creator": metadata.get("creator"),
                "license_url": LICENSE_URL,
            }
        except HTTPError as error:
            last_error = f"HTTP {error.code}"
            if error.code not in (408, 425, 429, 500, 502, 503, 504):
                break
        except (URLError, TimeoutError, RuntimeError, ValueError) as error:
            last_error = str(error)
        time.sleep(min(30, 2 ** attempt))
    return {**row, "status": "failed", "image_path": relative.as_posix(), "error": last_error}


def write_manifests(root: Path, results: list[dict]) -> None:
    by_city: dict[str, list[dict]] = {}
    for row in results:
        by_city.setdefault(slug(row["city"]), []).append(row)
    manifest_root = root / "manifests"
    manifest_root.mkdir(parents=True, exist_ok=True)
    for city_slug, rows in by_city.items():
        path = manifest_root / f"{city_slug}.jsonl"
        with path.open("w", encoding="utf-8") as handle:
            for row in sorted(rows, key=lambda item: item["image_id"]):
                public = {key: value for key, value in row.items() if key != "error" or row.get("status") == "failed"}
                handle.write(json.dumps(public, ensure_ascii=False) + "\n")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, required=True, help="Assembled release CSV, Parquet, or JSONL")
    parser.add_argument("--output-dir", type=Path, required=True, help="Directory that will receive images/ and manifests/")
    parser.add_argument("--city", help="Restrict a multi-city release to one city")
    parser.add_argument("--token", default=os.environ.get("MAPILLARY_ACCESS_TOKEN"), help="Mapillary token; MAPILLARY_ACCESS_TOKEN is preferred")
    parser.add_argument("--workers", type=int, default=8)
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--overwrite", action="store_true")
    args = parser.parse_args()
    if not args.token:
        raise SystemExit("Set MAPILLARY_ACCESS_TOKEN or pass --token; it is never written to output files.")
    if not args.input.exists():
        raise SystemExit(f"Input does not exist: {args.input}")
    root = args.output_dir.resolve()
    root.mkdir(parents=True, exist_ok=True)
    records = collect_records(args.input, args.city)
    if args.limit:
        records = records[: args.limit]
    print(json.dumps({"unique_source_images": len(records), "output_dir": str(root), "workers": args.workers}), flush=True)
    results: list[dict] = []
    with ThreadPoolExecutor(max_workers=max(1, args.workers)) as pool:
        futures = [pool.submit(download_one, row, root, args.token, args.overwrite) for row in records]
        for number, future in enumerate(as_completed(futures), 1):
            result = future.result()
            results.append(result)
            if number == len(futures) or number % 100 == 0:
                complete = sum(item["status"] in {"downloaded", "existing"} for item in results)
                print(f"{number}/{len(futures)} complete ({complete} available)", flush=True)
    write_manifests(root, results)
    report = {
        "input": str(args.input),
        "output_dir": str(root),
        "unique_source_images": len(results),
        "downloaded": sum(item["status"] == "downloaded" for item in results),
        "existing": sum(item["status"] == "existing" for item in results),
        "failed": sum(item["status"] == "failed" for item in results),
        "cropping": "not performed; use searchablecity prepare for panorama crops",
        "mapillary_token_written": False,
    }
    (root / "download-report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2), flush=True)
    if report["failed"]:
        raise SystemExit(2)


if __name__ == "__main__":
    main()
