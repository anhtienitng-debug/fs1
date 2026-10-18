#!/usr/bin/env bash
# Dựng lại PERFECT: 4 luồng hình song song + nhạc + giọng thì thầm, rồi ghép.
# Chạy: KOKORO_DIR=<thư mục có kokoro.onnx, voices.bin> bash dung-video.sh <thư mục tạm>
# Không có KOKORO_DIR thì video không có giọng thì thầm (chỉ nhạc và hiệu ứng).
set -euo pipefail
cd "$(dirname "$0")"
O="${1:?cần thư mục tạm}"
mkdir -p "$O"
export NODE_PATH="${NODE_PATH:-$(npm root -g)}"
for seg in "0 40" "40 80" "80 120" "120 161"; do
  set -- $seg
  node render.js video "$O/part_$1.mp4" "$1" "$2" 24 &
done
node render.js whispers "$O/whispers.json"
if [ -n "${KOKORO_DIR:-}" ]; then
  python3 am-thanh.py "$O/perfect.wav" "$O/whispers.json" "$KOKORO_DIR"
else
  python3 am-thanh.py "$O/perfect.wav"
fi
wait
printf "file '%s'\n" part_0.mp4 part_40.mp4 part_80.mp4 part_120.mp4 > "$O/list.txt"
# chặn đỉnh ở 192 kHz trước khi nén AAC (nén AAC làm vọt đỉnh), rồi nén lại hình (grain làm file to)
ffmpeg -y -loglevel error -i "$O/perfect.wav" -af "loudnorm=I=-14.5:TP=-3:LRA=11,aresample=192000,alimiter=limit=0.56:level=false:attack=1:release=60,aresample=48000" "$O/master.wav"
ffmpeg -y -loglevel error -f concat -safe 0 -i "$O/list.txt" -i "$O/master.wav" -c:v libx264 -preset slow -crf 25 -pix_fmt yuv420p \
  -c:a aac -b:a 192k -shortest -movflags +faststart perfect-v1.mp4
echo "xong: perfect-v1.mp4"
