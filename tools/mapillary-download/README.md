# Mapillary image downloader

This folder contains the optional source-image downloader for the Searchable.City release. It is separate from the static caption/metadata download: the browser package never includes source JPEGs.

The tool reads an assembled release CSV, Parquet, or JSONL file, deduplicates repeated directional caption rows by `(city, image_id)`, asks Mapillary for each image's `thumb_1024_url`, and downloads the JPEGs in parallel. It writes images to `images/<city-slug>/<image_id>.jpg` and creates `manifests/<city-slug>.jsonl` with paths compatible with the rest of the Searchable.City pipeline. Existing files are reused by default.

## Use

```sh
python tools/mapillary-download/download_mapillary.py \
  --input nyc-metadata.csv \
  --output-dir data/mapillary \
  --workers 16
```

Set the token in the environment; it is never written to the output:

```sh
export MAPILLARY_ACCESS_TOKEN='YOUR_MAPILLARY_TOKEN'
```

On Windows PowerShell:

```powershell
$env:MAPILLARY_ACCESS_TOKEN = 'YOUR_MAPILLARY_TOKEN'
python tools/mapillary-download/download_mapillary.py --input nyc-metadata.csv --output-dir data/mapillary --workers 16
```

The downloader does not crop panoramas. For Mapillary panoramas, run the existing pipeline step against the generated manifest:

```sh
searchablecity prepare \
  --input data/mapillary/manifests/new-york-city.jsonl \
  --image-root data/mapillary \
  --output-dir runs/new-york-city-views
```

That creates the directional crops used by the captioning pipeline. The downloader writes no credentials and keeps each image path relative to the selected `--output-dir`.
