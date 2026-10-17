# SCROLL | An Animated Short Film (bản thử)

Kênh quốc tế · nhân vật **Spark** (người que, ngọn lửa trong ngực) · 2:30 · không lời dẫn.

**Ẩn dụ chính:** mỗi lần lướt, một sợi lửa từ ngực Spark bị hút vào điện thoại. Ánh sáng điện thoại là màu lạnh, ngọn lửa là màu ấm.
Câu chốt: *"The phone never stole your time. It stole your fire."*

| Nhịp | Thời gian | Cảnh | Chữ trên màn hình | Lửa | Screen time |
|---|---|---|---|---|---|
| 1. Mở đầu | 0:00–0:14 | Màn đen "11:47 PM" → cận cảnh điện thoại, ngón cái lướt feed, đốm lửa bay vào màn hình → Spark nằm trên giường lướt, sợi lửa bị hút đi | "Just one more." | 0.55 | |
| 2. Trượt dốc | 0:14–0:50 | Day 12 giường 2:14 AM · Day 45 bàn học, sách đóng · Day 88 bạn bè mờ dần · Day 140 vừa đi vừa lướt · Day 201 giường 3:12 AM · điện thoại sập nguồn, màn hình đen phản chiếu Spark với ngực chỉ còn tàn lửa | Khói thì thầm: "one more video", "you deserve a break", "it's only 5 minutes", "you'll start tomorrow" | 0.45 → 0.05 | 2h10 → 9h14 |
| 3. Bước ngoặt | 0:50–1:02 | Màn đen, một đốm tàn đập như nhịp tim | "The phone never stole your time." / "It stole your **fire**." | tàn | |
| 4. Montage | 1:02–1:52 | Day 1 cất điện thoại vào ngăn kéo, đặt tay lên ngực, lửa bùng lại · Day 4 đọc sách · Day 11 chạy lúc bình minh · Day 23 điện thoại rung "99+" nhưng không nhìn · Day 37 đi chơi với bạn · Day 60 vẽ tranh | Khói: "just check once" (rồi tan) | 0.25 → 0.9 | 9h14 → 1h05 |
| 5. Thử thách cuối | 1:52–2:10 | Điện thoại dưới sàn sáng lên, thông báo dồn dập, khói khổng lồ trồi lên, lời thì thầm chồng chéo. Lửa chập chờn → Spark đứng thẳng, lửa bùng, khói tan, điện thoại úp xuống | "you're missing out", "everyone's online", "just one", "you deserve it" | 0.9 → 0.45 → 1.25 | |
| 6. Kết | 2:10–2:30 | Bình minh trên đồi, Spark ngồi cạnh bạn, lửa cháy đều | "Your attention is your fire." / "Guard it." / **SCROLL** · Keep the fire. | 1.0 | |

**Âm thanh:**
- **0:00–0:50:** piano giọng thứ thưa thớt, tiếng lướt "tách" mỗi lần lướt, cuối đoạn có nhịp tim.
- **0:50–1:02:** gần như im lặng.
- **1:02–1:52:** piano chuyển sang giọng trưởng, có nhịp trống từ Day 11.
- **1:52–2:10:** tiếng ù trầm, tiếng thông báo dồn dập, tiếng "vút" khi lửa bùng.
- **2:10–2:30:** hợp âm ấm, nhỏ dần.

**Tiêu đề:** `SCROLL | An Animated Short Film`
**Mô tả gợi ý:** "Every scroll takes something. Not your time — your fire. Day one starts when you put it down. 🔥"

## Dựng lại

`bash dung-video.sh <thư mục tạm>` → `scroll-ban-thu.mp4`. Cần Node + Playwright (Chromium), Python 3 + numpy, ffmpeg.

- `scene.js`: vẽ từng khung hình theo thời gian. Muốn sửa cảnh nào thì sửa hàm `scene(...)` tương ứng.
- `render.js`: xuất ảnh hoặc video. Xem nhanh một khung hình: `node render.js stills <thư mục> 66.5`.
- `am-thanh.py`: nhạc và hiệu ứng, mốc thời gian khớp với `scene.js`.
