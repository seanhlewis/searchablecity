"""Model-specific adapters implement caption(images) -> list[str]."""

import importlib


def create(config):
    """Load the adapter selected by backend in the editable configuration."""
    backend = config["backend"]
    if backend == "fastvlm":
        return FastVLM(config)
    if backend == "huggingface":
        return HuggingFace(config)
    if ":" in backend:
        module, name = backend.split(":", 1)
        return getattr(importlib.import_module(module), name)(config)
    raise ValueError("Unknown backend: " + backend)


def setup(config):
    import torch

    if config["device"].startswith("cuda") and not torch.cuda.is_available():
        raise RuntimeError(
            "CUDA unavailable; run on a GPU compute node or explicitly select cpu"
        )
    dtype = config.get("dtype", "auto")
    if dtype == "auto":
        dtype = (
            "bfloat16"
            if config["device"].startswith("cuda") and torch.cuda.is_bf16_supported()
            else ("float16" if config["device"].startswith("cuda") else "float32")
        )
    return torch, getattr(torch, dtype)


def resize(image, edge):
    from PIL import Image

    scale = edge / min(image.size)
    return image.resize(
        (round(image.width * scale), round(image.height * scale)),
        Image.Resampling.LANCZOS,
    )


class FastVLM:
    def __init__(self, config):
        from transformers import AutoModelForCausalLM, AutoTokenizer

        self.config = config
        self.torch, self.dtype = setup(config)
        load_options = {
            "revision": config["revision"],
            "trust_remote_code": config.get("trust_remote_code", False),
        }
        self.tokenizer = AutoTokenizer.from_pretrained(config["model"], **load_options)
        self.model = (
            AutoModelForCausalLM.from_pretrained(
                config["model"], torch_dtype=self.dtype, **load_options
            )
            .to(config["device"])
            .eval()
        )
        self.processor = self.model.get_vision_tower().image_processor

    def caption(self, images):
        torch = self.torch
        config = self.config
        tokenizer = self.tokenizer
        prompt = tokenizer.apply_chat_template(
            [{"role": "user", "content": "<image>\n" + config["prompt"]}],
            add_generation_prompt=True,
            tokenize=False,
        )
        before, after = prompt.split("<image>", 1)
        prefix_ids = tokenizer(
            before, return_tensors="pt", add_special_tokens=False
        ).input_ids
        suffix_ids = tokenizer(
            after, return_tensors="pt", add_special_tokens=False
        ).input_ids
        input_ids = (
            torch.cat(
                [
                    prefix_ids,
                    torch.tensor([[-200]], dtype=prefix_ids.dtype),
                    suffix_ids,
                ],
                dim=1,
            )
            .repeat(len(images), 1)
            .to(config["device"])
        )
        # Preserve the chosen source resolution, then use the model's native processor.
        # FastVLM's vision encoder cannot consume a forced 224 x 224 tensor.
        resized = [resize(image, config["short_edge"]) for image in images]
        try:
            pixels = self.processor(images=resized, return_tensors="pt")[
                "pixel_values"
            ].to(config["device"], dtype=self.dtype)
        finally:
            for image in resized:
                image.close()
        self.preprocessing = {
            "input_short_edge": config["short_edge"],
            "processor_size": getattr(self.processor, "size", None),
            "processor_crop_size": getattr(self.processor, "crop_size", None),
            "pixel_tensor_shape": list(pixels.shape),
        }
        with torch.inference_mode():
            generated_ids = self.model.generate(
                inputs=input_ids,
                attention_mask=torch.ones_like(input_ids),
                images=pixels,
                # Token limits are editable in the config or via CLI flags.
                # Raising max_new_tokens allows longer captions but costs time;
                # reaching the limit can cut a sentence short. Lower min_new_tokens
                # to allow the model to stop earlier. Keep min <= max.
                min_new_tokens=config["min_new_tokens"],
                max_new_tokens=config["max_new_tokens"],
                do_sample=False,
                num_beams=1,
                use_cache=True,
            )
        # FastVLM's inputs_embeds path returns generated tokens, as in Apple's example.
        return [
            text.strip()
            for text in tokenizer.batch_decode(generated_ids, skip_special_tokens=True)
        ]


class HuggingFace:
    def __init__(self, config):
        from transformers import AutoProcessor, AutoModelForImageTextToText

        self.config = config
        self.torch, self.dtype = setup(config)
        load_options = {
            "revision": config["revision"],
            "trust_remote_code": config.get("trust_remote_code", False),
        }
        self.processor = AutoProcessor.from_pretrained(config["model"], **load_options)
        self.model = (
            AutoModelForImageTextToText.from_pretrained(
                config["model"], torch_dtype=self.dtype, **load_options
            )
            .to(config["device"])
            .eval()
        )

    def caption(self, images):
        config = self.config
        # One image per call accommodates differing VLM batching contracts.
        texts = []
        for image in images:
            message = [
                {
                    "role": "user",
                    "content": [
                        {"type": "image"},
                        {"type": "text", "text": config["prompt"]},
                    ],
                }
            ]
            text = self.processor.apply_chat_template(
                message, tokenize=False, add_generation_prompt=True
            )
            inputs = self.processor(
                text=text,
                images=resize(image, config["short_edge"]),
                return_tensors="pt",
            ).to(config["device"])
            for key, value in inputs.items():
                if value.is_floating_point():
                    inputs[key] = value.to(self.dtype)
            with self.torch.inference_mode():
                generated_ids = self.model.generate(
                    **inputs,
                    min_new_tokens=config["min_new_tokens"],
                    max_new_tokens=config["max_new_tokens"],
                    do_sample=False
                )
            if not self.model.config.is_encoder_decoder:
                generated_ids = generated_ids[:, inputs["input_ids"].shape[1] :]
            texts.append(
                self.processor.batch_decode(generated_ids, skip_special_tokens=True)[
                    0
                ].strip()
            )
        return texts
