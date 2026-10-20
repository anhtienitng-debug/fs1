#!/usr/bin/env bash
# Dựng lại SNOOZE: 4 luồng hình song song + nhạc + giọng thì thầm, rồi ghép.
# Chạy: KOKORO_DIR=<thư mục có kokoro.onnx, voices.bin> bash dung-video.sh <thư mục tạm>
# Không có KOKORO_DIR thì video không có giọng thì thầm (chỉ nhạc và hiệu ứng).
set -euo pipefail
cd "$(dirname "$0")"
O="${1:?cần thư mục tạm}"
mkdir -p "$O"
export NODE_PATH="${NODE_PATH:-$(npm root -g)}"
for seg in "0 34" "34 67" "67 100" "100 133"; do
  set -- $seg
  node render.js video "$O/part_$1.mp4" "$1" "$2" 24 &
done
node render.js whispers "$O/whispers.json"
if [ -n "${KOKORO_DIR:-}" ]; then
  python3 am-thanh.py "$O/snooze.wav" "$O/whispers.json" "$KOKORO_DIR"
else
  python3 am-thanh.py "$O/snooze.wav"
fi
wait
printf "file '%s'\n" part_0.mp4 part_34.mp4 part_67.mp4 part_100.mp4 > "$O/list.txt"
# lọc trên 16 kHz (AAC vọt đỉnh với tiếng "tinh" cao), chặn đỉnh ở 192 kHz trước khi nén AAC (nén AAC làm vọt đỉnh), rồi nén lại hình (grain làm file to)
ffmpeg -y -loglevel error -i "$O/snooze.wav" -af "loudnorm=I=-14.5:TP=-3:LRA=11,lowpass=f=16000,aresample=192000,alimiter=limit=0.56:level=false:attack=1:release=60,aresample=48000" "$O/master.wav"
ffmpeg -y -loglevel error -f concat -safe 0 -i "$O/list.txt" -i "$O/master.wav" -c:v libx264 -preset slow -crf 25 -pix_fmt yuv420p \
  -c:a aac -b:a 192k -shortest -movflags +faststart "$O/phim.mp4"
# nối 6 giây màn hình kết thúc → một file duy nhất để đăng
ffmpeg -y -loglevel error -i "$O/phim.mp4" -i ../kenh-keep-the-fire/end-screen-6s.mp4 -filter_complex "[0:v]fps=24,format=yuv420p[v0];[1:v]fps=24,format=yuv420p[v1];[0:a]aresample=48000[a0];[1:a]aresample=48000[a1];[v0][a0][v1][a1]concat=n=2:v=1:a=1[v][a]" \
  -map "[v]" -map "[a]" -c:v libx264 -preset slow -crf 25 -c:a aac -b:a 192k -movflags +faststart SNOOZE-dang-youtube.mp4
echo "xong: SNOOZE-dang-youtube.mp4"
