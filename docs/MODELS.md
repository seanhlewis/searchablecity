# Choose a model

Edit the JSON configuration or override a setting on the caption command. For example, `--max-new-tokens 512` gives captions more room to finish; `--min-new-tokens 0` allows earlier stopping. These are tunable limits, not a guarantee of complete sentences.

| Setting | FastVLM default | Purpose |
|---|---|---|
| `backend` | `fastvlm` | Adapter implementation |
| `model` | `apple/FastVLM-0.5B` | Model repository or local model |
| `revision` | Pinned FastVLM commit | Reproducible model/code revision |
| `prompt` | `Describe this image.` | Instruction sent with each image |
| `short_edge` | 224 | Source-image resize before model processing |
| `batch_size` | 32 | Images per batch |
| `min_new_tokens`, `max_new_tokens` | 196, 256 | Generation length bounds |
| `device` | `cuda` | Inference device |
| `dtype` | `auto` | Floating-point precision |

FastVLM was chosen for speed: Sean reports approximately 20 images/second on an L40S in his workload. This is historical throughput, not a guarantee for new configurations. Run inference on a GPU compute allocation, not a cluster login node.

The FastVLM adapter follows Apple's custom image-token and decoding interface. It resizes the source image to the selected short edge, then uses the native model processor. The encoder requires a larger internal tensor; 224 is the source resize, not the encoder tensor size. Both are recorded in the run report. It loads model repository code; review the selected revision and its license.

The `huggingface` adapter uses AutoProcessor and AutoModelForImageTextToText. Compatible models can be substituted through `configs/huggingface.json`. Their processors may perform further resizing or tiling after the configured short-edge resize.

For another model, implement `caption(images) -> list[str]`, returning one nonempty caption per image in the same order. Set `backend` to `your_module:Adapter`; the constructor receives the configuration. `examples/custom_adapter.py` shows this interface. Different VLMs may need different processors, so changing the model name alone is not always sufficient.

Each run saves its configuration, package versions, input hash, timing, and completion state beside the captions. CPU tests exercise the adapter contract; GPU inference and quality must be checked on the chosen model revision.

Reference implementations: [FastVLM](https://huggingface.co/apple/FastVLM-0.5B), [Transformers image-text models](https://huggingface.co/docs/transformers/en/tasks/image_text_to_text).

## Tested FastVLM configuration

For a reproducible FastVLM environment, use Python 3.11 and install the tested CUDA build before the package:

```sh
python -m pip install torch==2.6.0 torchvision==0.21.0 --index-url https://download.pytorch.org/whl/cu124
python -m pip install -e './code[vlm]' -c configs/fastvlm-constraints.txt
python -c "import torch; print(torch.cuda.is_available()); print(torch.cuda.get_device_name(0))"
```

Use an isolated virtual environment. A CPU-only PyTorch installation cannot run the CUDA caption command, even when an NVIDIA GPU is installed. Other VLMs may require different library versions.

On September 14, 2026, eight SF image views passed captioning and indexing on an NVIDIA L40S using model revision `16375720c2d673fa583e57e9876afde27549c7d0`, Python 3.10.8, PyTorch 2.6.0+cu124, torchvision 0.21.0+cu124, Transformers 4.51.3, Accelerate 1.6.0 and timm 1.0.15. The test used batch size 8, the default prompt, and 196/256 token limits. All eight source IDs, directions, coordinates, dates and image hashes were preserved.

The source resize was 224 pixels; FastVLM's native processor produced 1024 x 1024 tensors. Forcing the encoder tensor itself to 224 fails for this checkpoint. The successful smoke took 8.19 seconds including model loading; this is not a steady-state throughput benchmark. Captions were coherent but all eight reached the output budget and ended mid-sentence. Adjust `max_new_tokens` for your application; token-limited captions are not guaranteed to end on a sentence boundary. This test establishes pipeline operation, not dataset-wide caption accuracy. The alternative Hugging Face adapter has not been GPU-tested here.

### Local RTX 3090 batch sizing

The same eight SF views also passed the full caption/index/search pipeline on Windows with an RTX 3090 (24 GB), Python 3.11.14 and the CUDA/library versions above. Every input metadata field and image hash was verified. The default batch size of 32 passed a separate repeated-input batch smoke.

Two measured batches per size, after one warmup, gave the following results with the model kept loaded. These are small-fixture timings on an active desktop, not a sustained dataset benchmark. Larger batches repeat the eight fixture images.

| Batch size | Images/second | Peak allocated GPU memory | Peak reserved GPU memory |
|---|---:|---:|---:|
| 1 | 0.06 | 1.31 GiB | 1.43 GiB |
| 2 | 0.13 | 1.45 GiB | 1.67 GiB |
| 4 | 0.25 | 1.72 GiB | 2.14 GiB |
| 8 | 0.51 | 2.26 GiB | 3.06 GiB |
| 16 | 0.93 | 3.34 GiB | 4.83 GiB |
| 32 | 1.61 | 5.49 GiB | 8.46 GiB |

Memory figures are PyTorch process peaks and exclude other applications. Start with **batch 32 on a 24 GB RTX 3090** under these settings; use `--batch-size 16` or `8` when sharing GPU memory. Batch 8 has also passed on the L40S. For an untested GPU, start at 1 and increase while checking memory. Longer captions or another model can change the memory requirement. These tests do not establish the earlier historical 20 images/second claim for the current configuration.
