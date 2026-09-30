#!/usr/bin/env bash
# Cai dat autovid tren Linux co GPU NVIDIA.
set -euo pipefail

say() { printf '\n\033[1;36m▸ %s\033[0m\n' "$1"; }

say "ffmpeg"
if ! command -v ffmpeg >/dev/null; then
  sudo apt-get update && sudo apt-get install -y ffmpeg
else
  echo "đã có $(ffmpeg -version | head -1)"
fi

say "Môi trường Python cho autovid"
python3 -m venv .venv
.venv/bin/pip install --upgrade pip
.venv/bin/pip install -e ".[align]"

say "VieNeu-TTS (giọng Phạm Tuyên)"
if [ ! -d VieNeu-TTS ]; then
  git clone https://github.com/pnnbao97/VieNeu-TTS.git
fi
cd VieNeu-TTS
if ! command -v uv >/dev/null; then
  curl -LsSf https://astral.sh/uv/install.sh | sh
  export PATH="$HOME/.local/bin:$PATH"
fi
uv sync --extra cuda     # bỏ --extra cuda nếu máy không có GPU NVIDIA
cd ..

say "Xong"
cat <<'MSG'
Còn hai việc bạn tự làm:

1. Tạo file .env từ .env.example rồi điền DEEPSEEK_API_KEY
   (hoặc dùng Ollama local, không cần key — xem ghi chú trong .env.example)

2. Mỗi lần dùng, mở một terminal riêng chạy server giọng đọc:
     cd VieNeu-TTS && uv run python -m apps.openai_speech

Rồi kiểm tra:
     .venv/bin/autovid doctor
MSG
