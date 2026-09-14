import unittest
import tempfile
import json
import argparse
from pathlib import Path
from unittest.mock import patch
from PIL import Image
from searchablecity.records import normalize, image_for
from searchablecity.cli import index, search, caption


class PackageTests(unittest.TestCase):
    def test_short_lists(self):
        rows = list(
            normalize({"panoid": "001", "lat": 1, "lng": 2, "captions": ["one", "two"]})
        )
        self.assertEqual([r["direction"] for r in rows], [None, None])
        self.assertEqual(rows[1]["view_index"], 1)
        with self.assertRaises(ValueError):
            list(normalize({"id": "1", "lat": 91, "lng": 0}))

    def test_index_search_and_duplicates(self):
        with tempfile.TemporaryDirectory() as temp:
            d = Path(temp)
            rows = [
                {
                    "image_id": "001",
                    "lat": 1,
                    "lng": 2,
                    "caption": "traffic light and tree",
                    "attribution": "A",
                },
                {"image_id": "002", "lat": 3, "lng": 4, "caption": "street corner"},
            ]
            src = d / "in.jsonl"
            src.write_text("\n".join(map(json.dumps, rows)))
            original = src.read_bytes()
            db = d / "db.sqlite"
            self.assertEqual(index(src, db), 2)
            self.assertEqual(len(search(db, "tree", 10)), 1)
            self.assertEqual(search(db, '"traffic light"', 10)[0]["attribution"], "A")
            self.assertEqual(src.read_bytes(), original)
            with self.assertRaises(FileExistsError):
                index(src, db)
            src.write_text(json.dumps(rows[0]) + "\n" + json.dumps(rows[0]))
            with self.assertRaises(Exception):
                index(src, d / "duplicates.sqlite")
            self.assertFalse((d / "duplicates.sqlite").exists())

    def test_local_image_access(self):
        with tempfile.TemporaryDirectory() as temp:
            d = Path(temp)
            Image.new("RGB", (10, 10), "red").save(d / "one.png")
            with image_for({"image_path": "one.png"}, d) as im:
                self.assertEqual(im.getpixel((0, 0)), (255, 0, 0))
            with self.assertRaises(ValueError):
                image_for({"image_path": "../outside.png"}, d)

    def test_panorama_preparation(self):
        from searchablecity.prepare import prepare

        with tempfile.TemporaryDirectory() as temp:
            d = Path(temp)
            Image.new("RGB", (800, 400), "blue").save(d / "pano.jpg")
            source = d / "source.jsonl"
            source.write_text(
                json.dumps(
                    {
                        "image_id": "001",
                        "image_path": "pano.jpg",
                        "lat": 1,
                        "lng": 2,
                        "compass_angle": 0,
                        "attribution": "owner",
                    }
                )
            )
            before = (d / "pano.jpg").read_bytes()
            prepare(source, d, d / "prepared")
            rows = [
                json.loads(line)
                for line in (d / "prepared/images.jsonl").read_text().splitlines()
            ]
            self.assertEqual(len(rows), 8)
            self.assertEqual(rows[0]["attribution"], "owner")
            self.assertEqual(rows[-1]["bearing_deg"], 315)
            self.assertTrue(
                all((d / "prepared" / row["image_path"]).is_file() for row in rows)
            )
            self.assertEqual(before, (d / "pano.jpg").read_bytes())

    def test_panorama_heading_and_wrap(self):
        from searchablecity.panoramas import crop8

        panorama = Image.new("RGB", (3600, 1800))
        gradient = Image.new("RGB", (3600, 1))
        gradient.putdata([(x // 20,) * 3 for x in range(3600)])
        panorama = gradient.resize((3600, 1800))
        crops = crop8(panorama, 0)
        self.assertEqual(list(crops), ["N", "NE", "E", "SE", "S", "SW", "W", "NW"])
        for direction, expected in [("N", 90), ("E", 135), ("W", 45)]:
            self.assertLessEqual(
                abs(crops[direction].getpixel((128, 128))[0] - expected), 1
            )
        rotated = crop8(panorama, 45)
        self.assertEqual(crops["N"].tobytes(), rotated["NE"].tobytes())

    def run_fake(self, broken):
        with tempfile.TemporaryDirectory() as temp:
            d = Path(temp)
            Image.new("RGB", (10, 10)).save(d / "one.png")
            (d / "in.jsonl").write_text(
                json.dumps(
                    {
                        "id": "001",
                        "lat": 1,
                        "lng": 2,
                        "image_path": "one.png",
                        "attribution": "A",
                    }
                )
            )
            (d / "config.json").write_text(
                json.dumps(
                    {
                        "backend": "fake",
                        "model": "test",
                        "revision": "fixture",
                        "prompt": "Describe this image.",
                        "short_edge": 224,
                        "batch_size": 1,
                        "min_new_tokens": 0,
                        "max_new_tokens": 5,
                        "device": "cpu",
                    }
                )
            )
            a = argparse.Namespace(
                input=str(d / "in.jsonl"),
                image_root=str(d),
                output=str(d / "out.jsonl"),
                config=str(d / "config.json"),
            )

            class Fake:
                def caption(self, images):
                    return [] if broken else ["fixture caption"]

            with patch("searchablecity.backends.create", return_value=Fake()):
                if broken:
                    with self.assertRaises(ValueError):
                        caption(a)
                else:
                    caption(a)
            report = json.loads((d / "out.jsonl.run.json").read_text())
            self.assertEqual(report["status"], "failed" if broken else "complete")
            self.assertEqual((d / "out.jsonl").exists(), not broken)
            if not broken:
                self.assertEqual(
                    json.loads((d / "out.jsonl").read_text())["attribution"], "A"
                )

    def test_adapter_success(self):
        self.run_fake(False)

    def test_adapter_failure(self):
        self.run_fake(True)
