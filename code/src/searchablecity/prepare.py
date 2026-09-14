"""Create eight directional images per panorama and preserve their metadata."""

import json
import math
import hashlib
from pathlib import Path
from .records import records, image_for
from .panoramas import crop8, DIR_NAMES


def prepare(source, image_root, output_dir):
    """Write images/ and images.jsonl into a new output directory.

    compass_angle is the heading at the panorama's horizontal center.
    Each crop covers 90 degrees; neighboring centers are 45 degrees apart.
    """
    output = Path(output_dir)
    output.mkdir(parents=True, exist_ok=False)
    images = output / "images"
    images.mkdir()
    partial = output / "images.jsonl.partial"
    seen = set()
    with partial.open("x", encoding="utf-8") as manifest:
        for number, row in enumerate(records(source)):
            if row["image_id"] in seen:
                raise ValueError("Duplicate panorama ID")
            seen.add(row["image_id"])
            compass = float(row["compass_angle"])
            if not math.isfinite(compass):
                raise ValueError("Panorama compass_angle must be finite")
            with image_for(row, image_root) as panorama:
                if abs(panorama.width / panorama.height - 2) > 0.05:
                    raise ValueError("Expected a 2:1 equirectangular panorama")
                crops = crop8(panorama, compass)
            for direction, image in crops.items():
                filename = f"{number:08d}_{direction}.jpg"
                image.save(images / filename, quality=95)
                image.close()
                record = dict(row)
                record.pop("caption", None)
                record.pop("record_id", None)
                record.pop("view_index", None)
                # These fields describe the input panorama, not the new JPEG.
                provenance = {
                    key: record.pop(key)
                    for key in (
                        "image_path",
                        "image_sha256",
                        "image_bytes",
                        "tar_file",
                        "member",
                        "offset_bytes",
                    )
                    if key in record
                }
                if "source_image" in record:
                    provenance["source_image"] = record.pop("source_image")
                crop_bytes = (images / filename).read_bytes()
                record.update(
                    source_image=provenance,
                    source_image_path=row["image_path"],
                    image_path="images/" + filename,
                    image_sha256=hashlib.sha256(crop_bytes).hexdigest(),
                    image_bytes=len(crop_bytes),
                    direction=direction,
                    bearing_deg=DIR_NAMES.index(direction) * 45,
                )
                manifest.write(json.dumps(record, ensure_ascii=False) + "\n")
    partial.rename(output / "images.jsonl")
