# Input fields

The pipeline reads JSONL, CSV, and Parquet. One image/view needs:

| Field | Meaning |
|---|---|
| `image_id` | Stable source ID, stored as a string |
| `lat`, `lng` | Camera coordinates in decimal degrees |
| `image_path` | Local image path relative to `--image-root`; needed only for captioning |
| `caption` | Description text; needed only for indexing/search |
| `compass_angle` | Heading at the panorama's horizontal center; needed only for panorama preparation |

Optional fields such as `direction`, `captured_at_ms`, `image_provider`, `source_url`, and `attribution` are preserved. Capture time is not download time. Camera coordinates do not establish the exact position of every object in a caption.

Parquet date, time and timestamp fields are written as ISO 8601 strings in JSON outputs. Existing timezone offsets are retained; timestamps without a timezone remain without one. Integer millisecond timestamps stay integers. Nested lists and objects follow the same conversion. Unsupported metadata types, including binary values and non-finite numbers, produce an error naming the field instead of silently losing information.

Downloaded panorama tables can use `panoid` with a `captions` list. The reader flattens them automatically. Explicit `directions` must align with captions. Eight captions without directions use the Searchable.City ordering N, NE, E, SE, S, SW, W, NW. Shorter lists keep their view indices without guessing which headings are missing. Other datasets should supply their actual directions.

Keep one unique record per source image/view. Indexing rejects duplicate identities. Combined city/provider datasets may supply a unique `record_id`. Paths must remain inside the image root. Download and unpack optional imagery before using it; storage and collection utilities are outside this repository's core pipeline.

Panorama preparation expects a 2:1 equirectangular image. It takes a central strip and eight overlapping rectangular crops, each resized to 256 x 256. These are panorama strips, not rectilinear perspective projections. Model preprocessing then applies the configured input resolution.

Each prepared JPEG has its own `image_sha256` and `image_bytes`. The input panorama's path, hash, byte count and archive member/offset fields are retained inside `source_image`; `source_image_path` also identifies its original path. Top-level `image_path` refers to the new crop. Source attribution, capture time and camera coordinates remain attached to each view.
