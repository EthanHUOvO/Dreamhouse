import base64
import io
import json
import os
import signal
import threading
import time
import uuid
from contextlib import nullcontext
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import torch
from PIL import Image
from diffusers import FlowMatchEulerDiscreteScheduler, QwenImage21Pipeline


MODEL_PATH = Path(os.environ.get("QWEN_IMAGE_MODEL_PATH", "/models/Qwen-Image-2.1"))
LORA_PATH = Path(os.environ.get("QWEN_IMAGE_LORA_PATH", "/models/viggle-turbo"))
LORA_NAME = os.environ.get(
    "QWEN_IMAGE_LORA_NAME", "Qwen-Image-2.1-viggle-turbo-4step-lora-r64.safetensors"
)
SCHEDULER_PATH = Path(os.environ.get("QWEN_IMAGE_SCHEDULER_PATH", "/models/viggle-scheduler"))
TURBO8_PATH = Path(os.environ.get("QWEN_IMAGE_TURBO8_PATH", "/models/turbo8"))
TURBO8_NAME = os.environ.get("QWEN_IMAGE_TURBO8_NAME", "turbo8_lora_step2500.safetensors")
OUTPUT_DIR = Path(os.environ.get("GENERATED_IMAGE_DIR", "/data/generated"))
MAX_DIMENSION = int(os.environ.get("QWEN_IMAGE_MAX_DIMENSION", "512"))
STEPS = 4
SIGMAS = [1.0, 0.75, 0.5, 0.25]
pipe = None
turbo_scheduler = None
std_scheduler = None
turbo8_scheduler = None
device_name = "unavailable"
generation_lock = threading.Lock()
stage_timings = {}
profile_next = threading.Event()
compiled_components = []
WARMUP_SIZES = os.environ.get(
    "QWEN_IMAGE_WARMUP_SIZES", "256x256,256x144,144x256"
)


def request_profile(signum, frame):
    profile_next.set()


def timed_stage(owner, name, label):
    original = getattr(owner, name)

    def measured(*args, **kwargs):
        torch.cuda.synchronize()
        started = time.perf_counter()
        result = original(*args, **kwargs)
        torch.cuda.synchronize()
        elapsed = round((time.perf_counter() - started) * 1000)
        stage_timings[label] = stage_timings.get(label, 0) + elapsed
        print(f"[qwen-image-rocm] stage={label} elapsedMs={elapsed}", flush=True)
        return result

    setattr(owner, name, measured)


def json_response(handler, status, value):
    payload = json.dumps(value).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Cache-Control", "no-store")
    handler.send_header("Content-Length", str(len(payload)))
    handler.end_headers()
    handler.wfile.write(payload)


def decode_image(value):
    if not value.startswith("data:image/") or "," not in value:
        raise ValueError("image inputs must be image data URLs")
    return Image.open(io.BytesIO(base64.b64decode(value.split(",", 1)[1]))).convert("RGB")


def fit_image(image):
    width, height = image.size
    scale = min(1.0, MAX_DIMENSION / max(width, height))
    width = max(16, round(width * scale / 16) * 16)
    height = max(16, round(height * scale / 16) * 16)
    return image.resize((width, height), Image.Resampling.LANCZOS)


def parse_size(value):
    try:
        width_text, height_text = str(value or "512*512").lower().replace("x", "*").split("*", 1)
        width, height = int(width_text), int(height_text)
    except (TypeError, ValueError):
        width = height = MAX_DIMENSION
    scale = min(1.0, MAX_DIMENSION / max(width, height))
    width = max(16, round(width * scale / 16) * 16)
    height = max(16, round(height * scale / 16) * 16)
    return width, height


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        print("[qwen-image-rocm] " + (fmt % args), flush=True)

    def do_GET(self):
        if self.path != "/health":
            return json_response(self, 404, {"error": "not found"})
        return json_response(
            self,
            200 if pipe is not None else 503,
            {
                "ok": pipe is not None,
                "service": "qwen-image-diffusers",
                "model": "Qwen-Image-2.1",
                "backend": "rocm",
                "device": device_name,
                "steps": STEPS,
                "maxDimension": MAX_DIMENSION,
            },
        )

    def do_POST(self):
        if self.path != "/v1/images/generations":
            return json_response(self, 404, {"error": "not found"})
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length < 1 or length > 50 * 1024 * 1024:
                raise ValueError("request body must be between 1 byte and 50 MB")
            body = json.loads(self.rfile.read(length))
            prompt = str(body.get("prompt", "")).strip()
            if not prompt:
                raise ValueError("prompt is required")
            images = [fit_image(decode_image(value)) for value in body.get("images", [])[:3]]
            width, height = parse_size(body.get("size"))
            seed = int(body["seed"]) if body.get("seed") is not None else uuid.uuid4().int & 0xFFFFFFFF
            OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
            request_id = str(uuid.uuid4())
            output_path = OUTPUT_DIR / f"{request_id}.png"
            started = time.perf_counter()
            requested_steps = int(body["steps"]) if body.get("steps") is not None else STEPS
            with generation_lock, torch.inference_mode():
                stage_timings.clear()
                generator = torch.Generator(device="cuda").manual_seed(seed)
                if requested_steps <= 4:
                    # viggle-turbo 4-step: fastest preview, surface re-render only
                    pipe.set_adapters(["viggle"], adapter_weights=[1.0])
                    pipe.scheduler = turbo_scheduler
                    kwargs = {
                        "prompt": prompt,
                        "num_inference_steps": STEPS,
                        "sigmas": SIGMAS,
                        "true_cfg_scale": 1.0,
                        "generator": generator,
                    }
                elif requested_steps <= 8:
                    # Turbo8 8-step distilled edit: structural edits, ~5x faster
                    pipe.set_adapters(["turbo8"], adapter_weights=[1.0])
                    pipe.scheduler = turbo8_scheduler
                    kwargs = {
                        "prompt": prompt,
                        "num_inference_steps": 8,
                        "true_cfg_scale": 1.0,
                        "generator": generator,
                    }
                else:
                    # standard 40-step: highest fidelity
                    pipe.set_adapters(["viggle"], adapter_weights=[0.0])
                    pipe.scheduler = std_scheduler
                    kwargs = {
                        "prompt": prompt,
                        "num_inference_steps": requested_steps,
                        "true_cfg_scale": 4.0,
                        "generator": generator,
                    }
                if images:
                    kwargs["image"] = images
                    kwargs["output_resolution"] = MAX_DIMENSION
                else:
                    kwargs["width"] = width
                    kwargs["height"] = height
                pipeline_started = time.perf_counter()
                profiling = profile_next.is_set()
                if profiling:
                    profile_next.clear()
                    profiler = torch.profiler.profile(
                        activities=[
                            torch.profiler.ProfilerActivity.CPU,
                            torch.profiler.ProfilerActivity.CUDA,
                        ],
                        record_shapes=True,
                    )
                else:
                    profiler = nullcontext()
                with profiler as profile:
                    result = pipe(**kwargs).images[0]
                output_scale = min(1.0, MAX_DIMENSION / max(result.size))
                if output_scale < 1.0:
                    output_size = (
                        max(16, round(result.width * output_scale / 16) * 16),
                        max(16, round(result.height * output_scale / 16) * 16),
                    )
                    result = result.resize(output_size, Image.Resampling.LANCZOS)
                if profiling:
                    profile_path = OUTPUT_DIR / f"hip-profile-{request_id}.json"
                    profile.export_chrome_trace(str(profile_path))
                    top_ops = profile.key_averages().table(
                        sort_by="self_cuda_time_total", row_limit=25
                    )
                    print(f"[qwen-image-rocm] hipProfile={profile_path}\n{top_ops}", flush=True)
                pipeline_elapsed_ms = round((time.perf_counter() - pipeline_started) * 1000)
                save_started = time.perf_counter()
                result.save(output_path, format="PNG", optimize=True)
                save_elapsed_ms = round((time.perf_counter() - save_started) * 1000)
            elapsed_ms = round((time.perf_counter() - started) * 1000)
            print(
                f"[qwen-image-rocm] pipelineMs={pipeline_elapsed_ms} saveMs={save_elapsed_ms} totalMs={elapsed_ms} size={result.width}x{result.height}",
                flush=True,
            )
            return json_response(
                self,
                200,
                {
                    "requestId": request_id,
                    "model": "Qwen-Image-2.1",
                    "url": f"/api/generated-images/{output_path.name}",
                    "width": result.width,
                    "height": result.height,
                    "elapsedMs": elapsed_ms,
                    "stageTimingsMs": dict(stage_timings),
                    "usage": {"backend": "pytorch-rocm", "device": device_name, "steps": STEPS},
                },
            )
        except Exception as error:
            import traceback
            traceback.print_exc()
            print(f"[qwen-image-rocm] error: {error}", flush=True)
            return json_response(self, 503, {"error": str(error)[:1200]})


def load_pipeline():
    global pipe, device_name
    if not torch.cuda.is_available():
        raise RuntimeError("PyTorch ROCm cannot see an available GPU")
    device_name = torch.cuda.get_device_name(0)
    global turbo_scheduler, std_scheduler, turbo8_scheduler
    turbo_scheduler = FlowMatchEulerDiscreteScheduler.from_pretrained(
        SCHEDULER_PATH, local_files_only=True
    )
    std_scheduler = FlowMatchEulerDiscreteScheduler.from_pretrained(
        MODEL_PATH / "scheduler", local_files_only=True
    )
    # Turbo8 expects the base schedule with terminal shift disabled.
    turbo8_scheduler = FlowMatchEulerDiscreteScheduler.from_config(
        std_scheduler.config, shift_terminal=None
    )
    pipe = QwenImage21Pipeline.from_pretrained(
        MODEL_PATH,
        torch_dtype=torch.bfloat16,
        low_cpu_mem_usage=True,
        local_files_only=True,
    )
    pipe.scheduler = turbo_scheduler
    pipe.load_lora_weights(LORA_PATH, weight_name=LORA_NAME, adapter_name="viggle")
    pipe.load_lora_weights(TURBO8_PATH, weight_name=TURBO8_NAME, adapter_name="turbo8")
    pipe.set_adapters(["viggle"], adapter_weights=[1.0])
    pipe.to("cuda")
    # Tiled VAE decode keeps peak activation memory bounded; without it the
    # 768px decode path can hang the ROCm device.
    if os.environ.get("QWEN_IMAGE_VAE_TILING", "1") == "1":
        pipe.vae.enable_tiling()
        print("[qwen-image-rocm] VAE tiling enabled", flush=True)
    compile_components = {
        component.strip().lower()
        for component in os.environ.get("QWEN_COMPILE_COMPONENTS", "").split(",")
        if component.strip()
    }
    if compile_components:
        print(
            f"Inductor compile requested: {sorted(compile_components)}; "
            f"torch={torch.__version__}; hip={torch.version.hip}",
            flush=True,
        )
    if "text" in compile_components:
        pipe.text_encoder = torch.compile(
            pipe.text_encoder, backend="inductor", dynamic=True, mode="default"
        )
        compiled_components.append("text")
    if "vae" in compile_components:
        pipe.vae.decode = torch.compile(
            pipe.vae.decode, backend="inductor", dynamic=True, mode="default"
        )
        compiled_components.append("vae")
    timed_stage(pipe, "encode_prompt", "promptEncoding")
    timed_stage(pipe, "prepare_latents", "prepareLatents")
    timed_stage(pipe.vae, "decode", "vaeDecode")
    timed_stage(pipe.transformer, "forward", "diffusion")
    print(
        f"Loaded Qwen-Image-2.1 on {device_name}; LoRA={LORA_NAME}; steps={STEPS}; max={MAX_DIMENSION}",
        flush=True,
    )
    warm_pipeline()


def warm_pipeline():
    sizes = [parse_size(value) for value in WARMUP_SIZES.split(",") if value.strip()]
    if not sizes:
        return
    warm_prompt = "A simple, softly lit modern room"
    for index, (width, height) in enumerate(dict.fromkeys(sizes), start=1):
        source = Image.new("RGB", (width, height), (224, 224, 224))
        started = time.perf_counter()
        with generation_lock, torch.inference_mode():
            stage_timings.clear()
            generator = torch.Generator(device="cuda").manual_seed(0)
            result = pipe(
                prompt=warm_prompt,
                image=[source],
                output_resolution=max(width, height),
                num_inference_steps=STEPS,
                sigmas=SIGMAS,
                true_cfg_scale=1.0,
                generator=generator,
            )
        torch.cuda.synchronize()
        elapsed_ms = round((time.perf_counter() - started) * 1000)
        print(
            f"[qwen-image-rocm] warmup={index}/{len(set(sizes))} size={width}x{height} elapsedMs={elapsed_ms}",
            flush=True,
        )


if __name__ == "__main__":
    signal.signal(signal.SIGUSR1, request_profile)
    load_pipeline()
    ThreadingHTTPServer(("0.0.0.0", 8200), Handler).serve_forever()
