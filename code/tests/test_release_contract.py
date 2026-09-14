"""Regression checks for crop provenance and Arrow metadata interoperability."""

import hashlib
import json
import tempfile
import unittest
from datetime import datetime, timezone, timedelta
from pathlib import Path

import pyarrow as pa
import pyarrow.parquet as pq
from PIL import Image
from searchablecity.prepare import prepare
from searchablecity.records import json_metadata
from searchablecity.search import index, search


class ReleaseContractTests(unittest.TestCase):
    def test_crop_hash_and_source_archive_identity(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            Image.new("RGB", (400, 200), "red").save(root / "panorama.jpg")
            original = (root / "panorama.jpg").read_bytes()
            row = dict(
                image_id="1",
                lat=1,
                lng=2,
                compass_angle=0,
                image_path="panorama.jpg",
                image_bytes=len(original),
                image_sha256=hashlib.sha256(original).hexdigest(),
                tar_file="source.tar",
                member="panorama.jpg",
                offset_bytes=512,
            )
            (root / "input.jsonl").write_text(json.dumps(row))
            prepare(root / "input.jsonl", root, root / "views")
            for line in (root / "views/images.jsonl").read_text().splitlines():
                crop = json.loads(line)
                data = (root / "views" / crop["image_path"]).read_bytes()
                self.assertEqual(crop["image_sha256"], hashlib.sha256(data).hexdigest())
                self.assertEqual(crop["image_bytes"], len(data))
                self.assertEqual(
                    crop["source_image"]["image_sha256"], row["image_sha256"]
                )
                self.assertEqual(crop["source_image"]["member"], "panorama.jpg")
                self.assertNotIn("member", crop)
            self.assertEqual((root / "panorama.jpg").read_bytes(), original)

    def test_parquet_timestamp_search_roundtrip(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            captured = datetime(
                2025, 1, 1, 12, 30, tzinfo=timezone(timedelta(hours=-5))
            )
            table = pa.Table.from_pylist(
                [
                    dict(
                        image_id="1",
                        lat=1.0,
                        lng=2.0,
                        caption="A street",
                        captured_at=captured,
                    )
                ]
            )
            pq.write_table(table, root / "input.parquet")
            self.assertEqual(index(root / "input.parquet", root / "search.sqlite"), 1)
            result = search(root / "search.sqlite", "street", 1)[0]
            self.assertEqual(datetime.fromisoformat(result["captured_at"]), captured)
            self.assertEqual(json_metadata(datetime(2025, 1, 1)), "2025-01-01T00:00:00")

    def test_unsupported_metadata_identifies_field(self):
        with self.assertRaisesRegex(ValueError, r"record.payload"):
            json_metadata({"payload": b"binary"})


if __name__ == "__main__":
    unittest.main()
