import concurrent.futures
import hashlib
import json
import os
import subprocess
import time
from pathlib import Path


PROXY = "http://127.0.0.1:17897"
REGISTRY = "https://docker.m.daocloud.io/v2/rocm/pytorch/blobs/sha256:d0244ca65655dc61e88adc080c128e7a76dc9faf928ce89cab563bc6dcb43526"
TOKEN_URL = "https://m.daocloud.io/auth/token?service=docker.m.daocloud.io&scope=repository:rocm/pytorch:pull"
EXPECTED_SIZE = 8192972858
EXPECTED_SHA = "d0244ca65655dc61e88adc080c128e7a76dc9faf928ce89cab563bc6dcb43526"
SEGMENT_SIZE = 4194304
OUT_DIR = Path("/srv/ideal-home/cache/container-layers")
PARTS_DIR = OUT_DIR / (EXPECTED_SHA + ".parts")
OUTPUT = OUT_DIR / (EXPECTED_SHA + ".tar.gz")


def curl(args, *, capture=False):
    result = subprocess.run(
        ["curl", "-4", "--proxy", PROXY, "--silent", "--show-error", *args],
        check=True,
        stdout=subprocess.PIPE if capture else subprocess.DEVNULL,
    )
    return result.stdout if capture else b""


def fetch_segment(token, segment):
    index, start, end = segment
    expected = end - start + 1
    destination = PARTS_DIR / f"{index:04d}.part"
    if destination.exists() and destination.stat().st_size == expected:
        return index
    for attempt in range(12):
        temporary = destination.with_suffix(".partial")
        temporary.unlink(missing_ok=True)
        try:
            curl([
                "--fail", "--location", "--connect-timeout", "20", "--max-time", "120",
                "--retry", "3", "--retry-all-errors", "--range", f"{start}-{end}",
                "--header", f"Authorization: Bearer {token}", "--output", str(temporary), REGISTRY,
            ])
            actual = temporary.stat().st_size
            if actual != expected:
                raise RuntimeError(f"segment {index} returned {actual} bytes, expected {expected}")
            temporary.replace(destination)
            print(f"segment {index + 1} complete", flush=True)
            return index
        except Exception:
            temporary.unlink(missing_ok=True)
            if attempt == 11:
                raise
            time.sleep(min(2 ** attempt, 20))


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    PARTS_DIR.mkdir(parents=True, exist_ok=True)
    token_payload = json.loads(curl(["--fail", TOKEN_URL], capture=True))
    token = token_payload["token"]
    segments = []
    for start in range(0, EXPECTED_SIZE, SEGMENT_SIZE):
        index = len(segments)
        segments.append((index, start, min(start + SEGMENT_SIZE - 1, EXPECTED_SIZE - 1)))
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        for index in pool.map(lambda segment: fetch_segment(token, segment), segments):
            print(f"verified segment {index + 1}/{len(segments)}", flush=True)

    temporary = OUTPUT.with_suffix(".partial")
    digest = hashlib.sha256()
    total = 0
    with temporary.open("wb") as target:
        for index, _, _ in segments:
            with (PARTS_DIR / f"{index:04d}.part").open("rb") as source:
                while chunk := source.read(8 * 1024 * 1024):
                    target.write(chunk)
                    digest.update(chunk)
                    total += len(chunk)
    if total != EXPECTED_SIZE or digest.hexdigest() != EXPECTED_SHA:
        raise RuntimeError(f"blob verification failed: size={total} sha256={digest.hexdigest()}")
    temporary.replace(OUTPUT)
    print(f"verified {OUTPUT} ({total} bytes, sha256={EXPECTED_SHA})", flush=True)


if __name__ == "__main__":
    main()
