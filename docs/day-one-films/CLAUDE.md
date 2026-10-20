# Đọc trước tiên: kênh Keep The Fire (bàn giao từ phiên cloud)

Đây là kênh YouTube quốc tế **Keep The Fire**: phim hoạt hình ngắn **không lời dẫn** về những cuộc chiến bên trong.
- Nhân vật chính **Spark** là hạt đậu màu kem, có ngọn lửa lơ lửng trước ngực.
- Kẻ thù là bản sao đen của Spark, **viền đỏ `#e3302b`**, thì thầm bằng chữ thường.
- Mỗi phim kết bằng câu "Keep the fire."
- Anh Tiến là người duyệt. Luôn trả lời anh bằng **tiếng Việt**.

Mọi phim được **vẽ bằng code**: SVG chạy trong Chromium qua Playwright, ffmpeg ghép hình, âm thanh tổng hợp bằng numpy, giọng thì thầm làm từ Kokoro TTS. Không dùng AI vẽ ảnh.

## Luật không bao giờ phá (anh đã chốt)

1. **Không dựng trước khi anh duyệt.**
   - DUYỆT 1: pitch 3 hướng, nói nên chọn hướng nào.
   - DUYỆT 2: bảng cảnh 8–9 nhịp, có giây.
   - Cả hai viết vào `video-<tên>/story.md`.
   - DUYỆT 3: anh xem video, gửi danh sách sửa đánh số. Sửa hết rồi render một lần.
2. **Chỉ xuất một file đăng duy nhất**, `<TÊN>-dang-youtube.mp4`, đã nối sẵn **6 giây** màn hình kết thúc (`kenh-keep-the-fire/end-screen-6s.mp4`). Script `dung-video.sh` của mỗi phim tự nối.
3. **Màu:**
   - Vàng `#ffd23f` chỉ dùng cho điều tốt: bước ngoặt, phần thưởng, câu kết, tên phim.
   - Đỏ chỉ dùng cho kẻ thù.
   - Graffiti hay đồ vật không dùng đỏ hoặc vàng.
4. **Kẻ thù:**
   - Luôn mọc ra từ một thứ có sẵn trên màn hình (bóng, gối, ánh đèn), không bao giờ xuất hiện từ hư không.
   - Lời thì thầm đặt cạnh đầu nó, phía lưng.
5. **Chữ:**
   - Không có câu dẫn chuyện.
   - Bước ngoặt dùng **một từ khoá đổi nghĩa** (TOMORROW→TODAY, PERFECT→DONE, THEM→YESTERDAY, SNOOZE→RISE).
   - Thẻ kết là một cặp câu: câu lặng màu trắng, rồi câu đấm màu vàng.
6. **Không chữ đè mặt, không tay lơ lửng** (tay cầm vật phải chạm vật).
7. **Âm thanh:**
   - Master khoảng −15 LUFS, đỉnh ≤ −1 dBTP. Chặn đỉnh ở 192 kHz trước khi nén AAC, đã có sẵn trong `dung-video.sh`, `limit=0.56`.
   - Âm lượng các cảnh chênh nhau ≤ khoảng 5 dB.
8. **Trận cuối mỗi phim phải khác các phim trước.** Anh không muốn lặp lại kiểu "lao đầu qua bóng". Danh sách các kiểu đã dùng nằm ở mục *Các phim* bên dưới.
9. **Nguyên nhân thay đổi phải được diễn ra rõ ràng.** Ví dụ: hồi tưởng vạch chiều cao ở COMPARE, tấm ảnh kỷ niệm ở SCROLL.
10. **Tranh hay đồ vật trong phim phải mang ý nghĩa với câu chuyện**, không chỉ để minh hoạ.

Bộ quy tắc gốc của anh nằm trong `tham-khao/` (style-bible, method, films, CLAUDE.md của kênh Việt). Phần nào nói về `D:\Yt\...` và toolkit thuộc kênh Việt "Bước đầu", không áp dụng cho thư mục này.

## Cấu trúc

```
keep-the-fire/
  CLAUDE.md                  ← file này
  kenh-keep-the-fire/        ← hồ sơ kênh: avatar, banner, watermark, end-screen-6s.mp4,
                               ho-so-kenh.md (mục 7 = LỘ TRÌNH PHIM, đánh ✅ phim đã làm)
  video-scroll/              ← phim 1 (bộ máy đời đầu)
  video-tomorrow/            ← phim 2
  video-perfect/             ← phim 3
  video-compare/             ← phim 4
  video-snooze/              ← phim 5 ← BỘ MÁY MỚI NHẤT, dùng làm gốc cho phim sau
  concept/ *.md              ← phân tích kênh mẫu, thiết kế nhân vật, tên kênh
  tham-khao/                 ← quy tắc gốc của anh
  tai-kokoro.sh              ← tải model giọng Kokoro
```

Mỗi thư mục phim có:

| File | Vai trò |
|---|---|
| `story.md` | Pitch, bảng cảnh, nhật ký sửa (v2, v3…) |
| `scene.js` | Vẽ từng khung hình: `window.frame(t)` trả về SVG |
| `render.js` | `node render.js stills <dir> t1 t2…` lấy ảnh; `video …` lấy đoạn video |
| `am-thanh.py` | Nhạc, hiệu ứng và giọng thì thầm (đọc `whispers.json`) |
| `dung-video.sh` | Dựng cả phim: 4 luồng hình song song, âm thanh, master, nối 6 giây kết, ra `<TÊN>-dang-youtube.mp4` |
| `ve-thumbnail.js` | Vẽ 3 thumbnail A/B/C vào `anh/`. A là bản chính (không lộ kết), B là bản thử, C là dự phòng (lộ kết) |
| `UPLOAD.md` | Tiêu đề, mô tả, thẻ, bình luận ghim, mốc màn hình kết thúc, lịch đăng |
| `<TÊN>-dang-youtube.mp4` | Bản cuối đã duyệt hoặc chờ duyệt |

## Cài đặt trên máy

- **Node 18+:** chạy `npm i -g playwright` rồi `npx playwright install chromium`. Script đặt `NODE_PATH=$(npm root -g)`.
- **Python 3:** chạy `pip install numpy kokoro-onnx`.
- **ffmpeg** phải có trong PATH. **Font Inter** cài trên máy, nếu thiếu thì chữ sẽ đổi font.
- **Model giọng:** chạy `bash tai-kokoro.sh <thư mục>`. Lệnh này tải `kokoro.onnx` và `voices.bin` từ GitHub release `model-files-v1.0` của kokoro-onnx.
- **Windows:** chạy `dung-video.sh` trong Git Bash hoặc WSL.

**Dựng một phim:**
```
cd video-snooze
KOKORO_DIR=<thư mục model> bash dung-video.sh <thư mục tạm>
```
Mất khoảng 15–20 phút cho mỗi phim 2:45.

## Làm phim mới (quy trình đã chạy ổn qua 5 phim)

1. Chọn chủ đề tiếp theo trong `kenh-keep-the-fire/ho-so-kenh.md`, mục 7 (dòng chưa có ✅): FEAR, NOTIFICATION, QUIT, ALONE, BINGE, RESTART, 365.
2. Viết `video-<tên>/story.md` gồm DUYỆT 1 (3 hướng, nêu cả điểm yếu) và DUYỆT 2 (bảng cảnh, câu kẻ thù, gieo và gặt, âm thanh, việc khó). **Chờ anh duyệt.**
3. Tạo thư mục mới bằng cách lấy `video-snooze/scene.js`:
   - giữ phần đầu (từ đầu file đến hết `const room = …`): tiện ích, nhân vật, tay chân cong mềm, các tư thế;
   - viết lại phần `// ===== <TÊN> =====`: đạo cụ, cảnh `scene(a, b, fn, {cam, nopush, fo})`, danh sách `WH`;
   - giữ phần đuôi (`whispers`, `DEFS`, `window.KIT`, `frame`), chỉnh `DUR`, `SHAKES` và `window.KIT`.
4. **Tự soát trước khi đưa anh xem:**
   - Lấy khoảng 40 khung bằng `render.js stills`, ghép thành tờ liên hoàn (contact sheet) 4×3.
   - Kiểm tra: chữ đè mặt hoặc đè HUD, tay không chạm vật, vật chồng lên người, kẻ thù bị nền che (phải vẽ kẻ thù **sau** nền đặc), chữ thì thầm tràn mép.
   - Sửa hết rồi soát lại.
5. Viết `am-thanh.py` (lấy khung từ `video-snooze/am-thanh.py`).
   - Đo RMS từng cảnh, chênh nhau tối đa khoảng 5 dB.
   - Khoảng lặng trước cú lớn: chỉnh `_duck` và nhịp tim.
6. Chạy `dung-video.sh`, rồi lấy khung từ **chính file mp4** để soát. Đo LUFS và đỉnh bằng `ffmpeg -af ebur128=peak=true`.
7. Vẽ thumbnail, viết `UPLOAD.md`, đánh ✅ trong lộ trình, commit.

## Các phim đã làm (đừng lặp lại góc và kiểu trận cuối)

| # | Phim | Câu kẻ thù | Device / từ khoá | Trận cuối | Trạng thái |
|---|---|---|---|---|---|
| 1 | SCROLL | "just one more" | Sợi lửa bị điện thoại hút, `FIRE %`; MORE… → FOCUS | Lao qua bóng | Xong (bộ máy đời đầu, nhân vật to) |
| 2 | TOMORROW | "tomorrow." · "there's always tomorrow." | Lịch tường; TOMORROW → TODAY | Bước đều, mỗi bước một ngày đã tập (DAY 1…45) | Đã duyệt |
| 3 | PERFECT | "not good enough." · "why even show it?" | `ERASED ×312 / FINISHED 0`; PERFECT → DONE | Ký tên giữa 7 vòng bút đỏ | Đã duyệt |
| 4 | COMPARE | "look at them." · "you'll never catch up." · "i told you." | Thước dây, `YOU vs THEM −88%`; THEM → YESTERDAY; hồi tưởng vạch chiều cao | Ollie ở dốc nhỏ, thước gãy | Đã duyệt (v3) |
| 5 | SNOOZE | "five more minutes." · "he has time." | Lọ "MISSED" chứa mặt trời; số ngày còn sống trên đầu (ông 60 → 1); SNOOZE → RISE | Bóng níu cổ chân dọc sàn, lết tới cửa sổ kéo rèm, nắng làm bóng tan | v2 đã sửa theo DUYỆT 3, chờ anh xem |

## Ghi chú kỹ thuật (bẫy đã gặp)

- **Bộ máy mới** (COMPARE, SNOOZE): `limb()` vẽ tay chân là đường cong bậc hai qua khớp. `ikArm` cho khuỷu luôn bẻ xuống (chỉ theo gợi ý khi giơ tay cao) để không lật khuỷu khi tay chuyển động nhanh.
- **Kích thước nhân vật:** trong `frame()`, `ZOOM = 0.8` làm nhân vật nhỏ đi 20%, công thức `cy` giữ đường mặt đất y = 560 cố định trên màn hình. Chữ giao diện bọc trong `ui()` để không bị phóng.
- **Hồi tưởng chèn giữa phim:** COMPARE có cơ chế `FLASH_A/FLASH_LEN` trong `frame()`. Thời gian phim gốc dời đi, `WH` dời theo, còn `am-thanh.py` dùng cờ `SHIFT`.
- **Lời thì thầm:** hàm `whispers()` ước lượng bề rộng chữ để không tràn mép. Nếu kẻ thù đứng sát mép trái, chữ sẽ bị đẩy đè lên đầu nó, khi đó dời camera (`STAND(x)`) sang trái.
- **SVG lồng:** thẻ `<svg x y>` lồng trong SVG khác có toạ độ riêng, phải bù `translate(-x,-y)`. Đã gặp lỗi này ở thumbnail SNOOZE.
- **AAC làm vọt đỉnh** khoảng 1 dB: dùng `alimiter limit=0.56` ở 192 kHz.
- **Font không có ký tự ☀:** tự vẽ bằng `sunIcon()`.
- **File mp4 không đưa lên git** (`.gitignore` có `*.mp4`). Các bản cuối nằm sẵn trong zip này.

## Việc đang chờ

- SNOOZE: v2 đã sửa 6 điểm của DUYỆT 3 (xem đầu `video-snooze/story.md`). Đoạn chèn 72–78 dùng cơ chế `FLASH_A/FLASH_LEN` + cảnh `{ ins: true }`; `am-thanh.py` tự lùi mốc ≥ 72 thêm 6 giây (`raw=True` để giữ giờ thật).
- Phim tiếp theo: anh chọn trong mục 7 của `ho-so-kenh.md`.
- Phía anh: tạo kênh với handle `@keepthefirefilms`, tải ảnh nhận diện, đăng theo `UPLOAD.md` từng phim. Lịch đăng thứ Năm, 18:00 giờ New York.
