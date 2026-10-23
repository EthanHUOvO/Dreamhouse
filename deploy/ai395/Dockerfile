FROM docker.m.daocloud.io/rocm/pytorch:rocm7.2.1_ubuntu24.04_py3.12_pytorch_release_2.9.1

ENV PIP_INDEX_URL=https://pypi.tuna.tsinghua.edu.cn/simple \
    PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True \
    TORCH_ROCM_AOTRITON_ENABLE_EXPERIMENTAL=1 \
    HF_HUB_OFFLINE=1 \
    TRANSFORMERS_OFFLINE=1 \
    HF_HOME=/tmp/huggingface

ARG HTTP_PROXY
ARG HTTPS_PROXY

RUN python3 -m pip install --no-cache-dir \
      "transformers>=5.17,<6" \
      accelerate safetensors peft pillow \
      "git+https://github.com/huggingface/diffusers.git@08d69774f08f19ae903f97bc393a8abdeafc98aa"

WORKDIR /app
COPY server.py /app/server.py
EXPOSE 8200
ENTRYPOINT ["python3", "/app/server.py"]
