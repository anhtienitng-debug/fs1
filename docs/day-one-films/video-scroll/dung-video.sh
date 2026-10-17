#!/usr/bin/env bash
# Dựng lại SCROLL: 4 luồng hình song song + nhạc, rồi ghép. Chạy: bash dung-video.sh <thư mục tạm>
set -euo pipefail
cd "$(dirname "$0")"
O="${1:?cần thư mục tạm}"
mkdir -p "$O"
export NODE_PATH="${NODE_PATH:-$(npm root -g)}"
for seg in "0 38" "38 76" "76 114" "114 150"; do
  set -- $seg
  node render.js video "$O/part_$1.mp4" "$1" "$2" 24 &
done
python3 am-thanh.py "$O/scroll.wav"
wait
printf "file '%s'\n" part_0.mp4 part_38.mp4 part_76.mp4 part_114.mp4 > "$O/list.txt"
ffmpeg -y -loglevel error -f concat -safe 0 -i "$O/list.txt" -i "$O/scroll.wav" -c:v copy \
  -af "loudnorm=I=-15:TP=-1.5:LRA=11" -ar 48000 -c:a aac -b:a 192k -shortest -movflags +faststart scroll-ban-thu.mp4
echo "xong: scroll-ban-thu.mp4"
