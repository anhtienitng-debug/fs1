#!/usr/bin/env bash
# Tải model giọng Kokoro (cho giọng thì thầm của kẻ thù). Chạy: bash tai-kokoro.sh <thư mục>
set -euo pipefail
D="${1:?cần thư mục lưu model}"
mkdir -p "$D"
U=https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0
curl -L -o "$D/kokoro.onnx" "$U/kokoro-v1.0.int8.onnx"
curl -L -o "$D/voices.bin" "$U/voices-v1.0.bin"
echo "xong: $D (dùng KOKORO_DIR=$D khi chạy dung-video.sh)"
