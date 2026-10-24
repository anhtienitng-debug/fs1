#!/usr/bin/env bash
# Kiểm tra máy đã đủ công cụ để dựng phim Keep The Fire chưa. Chạy: bash kiem-tra-may.sh [thư mục model Kokoro]
# Windows: chạy trong Git Bash hoặc WSL.
cd "$(dirname "$0")"
ok=0
chk() { if eval "$2" >/dev/null 2>&1; then echo "  [OK]   $1"; else echo "  [THIẾU] $1 → $3"; ok=1; fi; }
echo "Kiểm tra công cụ:"
chk "Node 18+" 'node -e "process.exit(+process.versions.node.split(\".\")[0] >= 18 ? 0 : 1)"' "cài Node LTS từ nodejs.org"
chk "Playwright (npm toàn cục)" 'NODE_PATH=$(npm root -g) node -e "require(\"playwright\")"' "npm i -g playwright && npx playwright install chromium"
chk "Chromium cho Playwright" 'NODE_PATH=$(npm root -g) node -e "require(\"playwright\").chromium.launch().then(b=>b.close())"' "npx playwright install chromium"
PY=$(command -v python3 || command -v python)
chk "Python 3" '[ -n "$PY" ]' "cài Python 3 từ python.org"
chk "numpy" '"$PY" -c "import numpy"' "pip install numpy"
chk "kokoro-onnx" '"$PY" -c "import kokoro_onnx"' "pip install kokoro-onnx"
chk "ffmpeg" 'ffmpeg -version' "cài ffmpeg và thêm vào PATH"
chk "Font Inter" 'fc-list 2>/dev/null | grep -qi "Inter" || ls /c/Windows/Fonts 2>/dev/null | grep -qi "^Inter" || ls "$LOCALAPPDATA/Microsoft/Windows/Fonts" 2>/dev/null | grep -qi "^Inter"' "tải Inter tại fonts.google.com/specimen/Inter, cài cho mọi người dùng"
chk "Màn hình kết thúc (end-screen-6s.mp4)" '[ -f kenh-keep-the-fire/end-screen-6s.mp4 ]' "lấy từ file zip keep-the-fire.zip (file mp4 không nằm trên git)"
KD="${1:-}"
if [ -n "$KD" ]; then
  chk "Model Kokoro trong $KD" '[ -f "$KD/kokoro.onnx" ] && [ -f "$KD/voices.bin" ]' "bash tai-kokoro.sh $KD"
else
  echo "  (bỏ qua model Kokoro: chạy lại với thư mục model, ví dụ bash kiem-tra-may.sh ../kokoro)"
fi
[ $ok = 0 ] && echo "Máy đã sẵn sàng." || echo "Cài các mục THIẾU rồi chạy lại."
exit $ok
