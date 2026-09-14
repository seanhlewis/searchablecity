"""Caption images in batches, retaining their source IDs and coordinates."""

from pathlib import Path
from itertools import islice
import json
import hashlib
import platform
import time
import importlib.metadata
from .records import records, image_for
from .files import fresh


def caption(args):
    from .backends import create

    config = json.loads(Path(args.config).read_text(encoding="utf-8-sig"))
    for key in [
        "backend",
        "model",
        "revision",
        "prompt",
        "short_edge",
        "batch_size",
        "min_new_tokens",
        "max_new_tokens",
        "device",
    ]:
        value = getattr(args, key, None)
        if value is not None:
            config[key] = value
    if not config.get("revision"):
        raise ValueError("Set an immutable model revision in config or --revision")
    if (
        config["batch_size"] < 1
        or config["short_edge"] < 1
        or not 0 <= config["min_new_tokens"] <= config["max_new_tokens"]
    ):
        raise ValueError("Invalid batching, size or token settings")
    output = fresh(args.output)
    report_path = fresh(str(output) + ".run.json")
    partial = fresh(str(output) + ".partial")
    run_report = {
        "configuration": config,
        "status": "starting",
        "completed": 0,
        "python": platform.python_version(),
        "packages": {},
    }
    for name in ["torch", "transformers", "Pillow", "searchablecity"]:
        try:
            run_report["packages"][name] = importlib.metadata.version(name)
        except importlib.metadata.PackageNotFoundError:
            pass
    digest = hashlib.sha256()
    with Path(args.input).open("rb") as source:
        for block in iter(lambda: source.read(8 * 1024 * 1024), b""):
            digest.update(block)
    run_report["input_sha256"] = digest.hexdigest()
    start = time.time()
    try:
        model = create(config)
        iterator = iter(records(args.input))
        seen = set()
        with partial.open("x", encoding="utf-8") as f:
            while True:
                batch = list(islice(iterator, config["batch_size"]))
                if not batch:
                    break
                images = []
                try:
                    for row in batch:
                        key = (
                            row["image_id"],
                            row.get("direction"),
                            row.get("view_index"),
                        )
                        if key in seen:
                            raise ValueError("Duplicate image/view in input")
                        seen.add(key)
                        images.append(image_for(row, args.image_root))
                    captions = model.caption(images)
                    run_report["preprocessing"] = getattr(model, "preprocessing", None)
                    if len(captions) != len(batch):
                        raise ValueError("Backend caption count mismatch")
                    for row, text in zip(batch, captions):
                        if not isinstance(text, str) or not text.strip():
                            raise ValueError("Backend returned an empty caption")
                        f.write(
                            json.dumps(
                                {
                                    **row,
                                    "caption": text,
                                    "model": config["model"],
                                    "model_revision": config["revision"],
                                    "prompt": config["prompt"],
                                    "image_short_edge": config["short_edge"],
                                },
                                ensure_ascii=False,
                            )
                            + "\n"
                        )
                        run_report["completed"] += 1
                finally:
                    for image in images:
                        image.close()
                print(json.dumps({"completed": run_report["completed"]}), flush=True)
        partial.rename(output)
        run_report["status"] = "complete"
    except Exception as exc:
        run_report["status"] = "failed"
        run_report["error_type"] = type(exc).__name__
        raise
    finally:
        run_report["elapsed_seconds"] = time.time() - start
        report_path.write_text(json.dumps(run_report, indent=2), encoding="utf-8")
