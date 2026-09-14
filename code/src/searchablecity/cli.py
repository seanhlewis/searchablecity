"""Command-line entry point. Each command delegates to one pipeline step."""

import argparse
import json
from .caption import caption
from .files import fresh, write_jsonl
from .search import index, search
from .prepare import prepare


def main():
    parser = argparse.ArgumentParser(
        description="Prepare images, caption them, and search the results."
    )
    commands = parser.add_subparsers(dest="command", required=True)

    prepare_parser = commands.add_parser(
        "prepare", help="Create directional views from local panoramas"
    )
    prepare_parser.add_argument("--input", required=True)
    prepare_parser.add_argument("--image-root", required=True)
    prepare_parser.add_argument("--output-dir", required=True)

    caption_parser = commands.add_parser(
        "caption", help="Caption geolocated images using your model config"
    )
    caption_parser.add_argument("--input", required=True)
    caption_parser.add_argument("--image-root", required=True)
    caption_parser.add_argument("--output", required=True)
    caption_parser.add_argument("--config", required=True)
    for field in ["backend", "model", "revision", "prompt", "device"]:
        caption_parser.add_argument("--" + field)
    for field in ["short-edge", "batch-size", "min-new-tokens", "max-new-tokens"]:
        caption_parser.add_argument("--" + field, type=int)

    index_parser = commands.add_parser(
        "index", help="Index existing captions; no images or GPU needed"
    )
    index_parser.add_argument("--input", required=True)
    index_parser.add_argument("--output", required=True)

    search_parser = commands.add_parser(
        "search", help="Search captions and export results"
    )
    search_parser.add_argument("--database", required=True)
    search_parser.add_argument("--query", required=True)
    search_parser.add_argument("--limit", type=int, default=100)
    search_parser.add_argument("--output", required=True)
    search_parser.add_argument("--geojson", action="store_true")

    args = parser.parse_args()
    if args.command == "prepare":
        prepare(args.input, args.image_root, args.output_dir)
    elif args.command == "caption":
        caption(args)
    elif args.command == "index":
        print(json.dumps({"indexed": index(args.input, args.output)}))
    else:
        if args.limit < 1:
            raise ValueError("limit must be positive")
        results = search(args.database, args.query, args.limit)
        if args.geojson:
            features = [
                {
                    "type": "Feature",
                    "geometry": {
                        "type": "Point",
                        "coordinates": [row["lng"], row["lat"]],
                    },
                    "properties": row,
                }
                for row in results
            ]
            fresh(args.output).write_text(
                json.dumps(
                    {"type": "FeatureCollection", "features": features},
                    ensure_ascii=False,
                ),
                encoding="utf-8",
            )
        else:
            write_jsonl(results, args.output)
        print(json.dumps({"matches_returned": len(results)}))


if __name__ == "__main__":
    main()
