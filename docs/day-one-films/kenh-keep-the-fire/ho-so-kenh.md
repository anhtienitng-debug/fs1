# Keep The Fire: hồ sơ kênh quốc tế

Kênh hoạt hình ngắn, không lời. Mỗi phim là một trận chiến bên trong: nhân vật Spark mang ngọn lửa trước ngực, kẻ thù là bản sao đen viền đỏ thì thầm bên tai, một bộ đếm `FIRE %` và `DAY n`. Phim kết bằng câu cố định **"Keep the fire."**, cũng là tên kênh.

## 1. Thông tin cơ bản (YouTube Studio → Tùy chỉnh → Thông tin cơ bản)

| Mục | Nội dung |
|---|---|
| Tên kênh | `Keep The Fire` |
| Handle | `@keepthefirefilms`. Nếu đã có người dùng thì lấy `@keepthefire.films`, sau đó đến `@keepthefireanimation` |
| Quốc gia | Để trống hoặc Hoa Kỳ (nếu muốn CPM cao, khai đúng quy định thuế) |
| Ngôn ngữ kênh | English |
| Danh mục mặc định cho video | Film & Animation |

**Mô tả kênh (About), dán nguyên văn:**

```
Wordless animated short films about the war inside you.

Every one of us carries a fire: focus, courage, the part of you that wants more from life. And every one of us has a voice that wants to put it out. It whispers "just one more", "start tomorrow", "you're not enough".

Each film follows Spark through one of those battles. Scrolling. Procrastination. Comparison. Fear. No narration. Just a counter, a whisper, and a choice.

New film every week.

Keep the fire. 🔥
```

**Từ khoá kênh** (Cài đặt → Kênh → Từ khoá):
`animated short film, motivational animation, self improvement, wordless animation, short film, discipline, focus, phone addiction, procrastination, mental health animation, keep the fire, spark animation, inner demon, day one`

**Liên kết:** chưa cần. Khi có TikTok hay Instagram cùng tên thì thêm vào.

## 2. Bộ ảnh nhận diện (thư mục `anh/`)

| File | Kích thước | Đăng ở đâu | Ghi chú |
|---|---|---|---|
| `avatar-800.png` | 800×800 | Tùy chỉnh → Xây dựng thương hiệu → Ảnh | Chỉ có ngọn lửa trong vòng vàng, thu nhỏ còn 98 px vẫn rõ |
| `banner-2560x1440.png` | 2560×1440 | Ảnh biểu ngữ | Chữ và hai nhân vật nằm trong vùng an toàn 1546×423, điện thoại vẫn thấy đủ |
| `watermark-150.png` | 150×150, nền trong | Hình mờ video, hiện "Toàn bộ video" | Ngọn lửa nhỏ góc phải, bấm vào là đăng ký |
| `thumbnail-scroll-A.png` | 1280×720 | Thumbnail SCROLL (bản chính) | Kẻ thù ghé sát Spark đang cắm mặt vào điện thoại, chữ "IT STOLE MY FIRE", "FIRE 1%" |
| `thumbnail-scroll-B.png` | 1280×720 | Thumbnail SCROLL (bản thử) | Trước và sau: DAY 201 bên điện thoại, DAY 60 lửa bùng trước biển |
| `end-screen-nen.png` | 1920×1080 | Nền màn hình kết thúc | |
| `end-screen-vi-tri.png` | 1920×1080 | Chỉ để xem | Vị trí đặt 2 video và nút đăng ký |

**Nhận diện cố định:**
- Màu: nền `#0d0a09`, lửa `#ff8a1f` và `#ffd166`, vàng tốt `#ffd23f`, đỏ kẻ thù `#e3302b`, da `#e9d6bd`.
- Font: Inter (tiêu đề, độ đậm 800–900), JetBrains Mono (HUD).
- Quy tắc: vàng chỉ dùng cho điều tốt, đỏ chỉ dùng cho kẻ thù.

Vẽ lại toàn bộ ảnh: `node ve-kenh.js <thư mục ra> [endvideo]`. Script dùng đúng hàm vẽ nhân vật trong `../video-scroll/scene.js`, nên khi đổi nhân vật trong phim thì ảnh kênh đổi theo.

## 3. Màn hình kết thúc và bản đăng

- `end-screen-6s.mp4`: 6 giây, Spark ngồi trên đồi nhìn biển, lửa lay, có chữ "Keep the fire." và nhạc nền ấm nhỏ dần. Gắn vào cuối mọi phim. YouTube cho màn hình kết thúc dài 5–20 giây, nên 6 giây vẫn đủ để đặt video và nút đăng ký.
- `SCROLL-dang-youtube.mp4`: phim SCROLL 2:30 nối với 6 giây màn hình kết thúc, tổng 2:36. **Đây là file để tải lên.**
- **Quy ước (anh chốt):** mỗi phim chỉ xuất **một file duy nhất đã nối sẵn 6 giây kết**, đặt tên `<TÊN>-dang-youtube.mp4`. Không xuất bản phim không có kết. Script `dung-video.sh` của mỗi phim tự nối màn hình kết thúc.
- Khi đăng, vào Màn hình kết thúc rồi chọn mẫu "1 video + 1 video + đăng ký", đặt theo `end-screen-vi-tri.png`:
  - trái: "Video phù hợp nhất với người xem";
  - phải: "Video tải lên gần đây nhất";
  - giữa: nút đăng ký.
  - Mọi phần tử bắt đầu ở 2:30.

## 4. Mặc định khi tải lên (Cài đặt → Tải lên mặc định)

- Danh mục: Film & Animation. Ngôn ngữ video: English.
- Đối tượng: **Không, video không dành cho trẻ em.** Đây là hoạt hình nhưng nói về nghiện điện thoại và tâm lý tuổi teen và người lớn. Nếu chọn "dành cho trẻ em" thì video mất bình luận, màn hình kết thúc và quảng cáo cá nhân hoá.
- Nội dung thay đổi hoặc tổng hợp: **Không**. Phim vẽ bằng code, giọng thì thầm là TTS, không giả người thật hay sự kiện thật.
- Giấy phép: Giấy phép YouTube chuẩn. Cho phép nhúng.
- Bình luận: bật, giữ lại bình luận có thể không phù hợp để duyệt.

## 5. Phim đầu tiên: SCROLL

**Tiêu đề:**
```
SCROLL | An Animated Short Film
```

**Mô tả:**
```
Every scroll takes something. Not your time — your fire.

Spark had a fire once. Friends, books, mornings. Then came one more video. And one more. Day 12. Day 88. Day 201. Fire: 1%.

This is a wordless animated short about phone addiction, attention, and the day you finally put it down.

If you saw yourself in Spark, you're not alone. Day one starts when you put it down.

Keep the fire. 🔥

—
Keep The Fire makes wordless animated films about the war inside you. New film every week.
Subscribe: https://www.youtube.com/@keepthefirefilms?sub_confirmation=1

#animatedshortfilm #phoneaddiction #selfimprovement
```

**Thẻ (tags):**
`scroll animated short film, phone addiction animation, social media addiction short film, animated short film, motivational animation, doomscrolling, dopamine detox, stop scrolling, self improvement animation, wordless short film, keep the fire, digital detox, attention span, screen time`

**Bình luận ghim (đăng ngay sau khi công khai):**
```
Spark's screen time on Day 201: 9h 14m.
What's yours today? Be honest. 👇
```
Câu hỏi về số giờ dùng điện thoại dễ khiến người xem trả lời, kéo tương tác ở 24 giờ đầu.

**Thumbnail:** đăng bản A. Khi kênh đủ điều kiện thì bật **Thử nghiệm và so sánh** với bản B.

**Danh sách phát:** thêm vào `Battles Inside (All Films)` và `Phone & Focus`.

**Lịch đăng:** thứ Năm 18:00 giờ New York (thứ Sáu 05:00 giờ Việt Nam). Lúc đó học sinh và sinh viên Mỹ vừa tan học. Giữ cố định ngày và giờ mỗi tuần.

## 6. Danh sách phát

| Danh sách phát | Mô tả |
|---|---|
| Battles Inside (All Films) | Every Keep The Fire film, in order. |
| Phone & Focus | Scrolling, distraction, the battle for your attention. |
| Discipline | Procrastination, habits, starting again on day one. |
| Mind & Courage | Fear, comparison, self-doubt — the quiet enemies. |

## 7. Lộ trình 12 phim đầu

**Đây là danh sách câu chuyện của kênh.** ✅ là phim đã làm xong. Kế hoạch chi tiết (pitch, bảng cảnh) của từng phim nằm trong `story.md` ở thư mục của phim đó. Phim tiếp theo chọn trong các dòng chưa có ✅.

Mỗi phim theo công thức 6 nhịp trong `../ke-hoach-trien-khai.md`. Kẻ thù luôn là bản sao đen viền đỏ, mỗi phim thêm một chi tiết riêng cho kẻ thù.

| # | Tiêu đề | Kẻ thù thì thầm | Ẩn dụ lửa | Danh sách phát |
|---|---|---|---|---|
| 1 | SCROLL ✅ `video-scroll/` | "just one more" | Sợi lửa bị hút vào điện thoại | Phone & Focus |
| 2 | TOMORROW ✅ `video-tomorrow/` | "tomorrow." | Lịch tường: mỗi tờ kẻ thù viết "tomorrow" và nhốt một đốm lửa. Lỡ buổi open mic, rồi TOMORROW thành TODAY | Discipline |
| 3 | COMPARE | "look at them" | Lửa của người khác trên màn hình to hơn, lửa mình co lại | Mind & Courage |
| 4 | SNOOZE | "five more minutes" | Báo thức 5:00, mỗi lần bấm hoãn lửa nhỏ đi | Discipline |
| 5 | FEAR | "what if you fail" | Lửa bị bóng tối nuốt mỗi khi định giơ tay | Mind & Courage |
| 6 | NOTIFICATION | "someone texted you" | Mỗi tiếng ting dập một ngọn lửa đang tập trung | Phone & Focus |
| 7 | QUIT | "it's too hard" | Lửa lúc tập gym, dừng ở rep cuối | Discipline |
| 8 | ALONE | "nobody cares" | Lửa giữa đám đông, ai cũng cúi đầu nhìn điện thoại | Mind & Courage |
| 9 | BINGE | "next episode" | Đếm ngược autoplay hút lửa | Phone & Focus |
| 10 | PERFECT ✅ `video-perfect/` (làm thứ 3) | "not good enough." | Con chim bị tẩy 312 lần, `FINISHED 0`. Ném cục tẩy, PERFECT thành DONE, ký tên vào tranh | Mind & Courage |
| 11 | RESTART | "you already failed" | Bộ đếm về Day 1 lần thứ ba, vẫn đứng dậy | Discipline |
| 12 | 365 | (im lặng) | Tổng kết một năm của Spark, kẻ thù chỉ còn bằng ngón tay | Battles Inside |

## 8. Ngoài YouTube dài

- **Shorts:** cắt mỗi phim thành 2–3 đoạn dọc 9:16 dài 30–45 giây (bước ngoặt, trận cuối, kết). Gắn link phim dài bằng tính năng "Video liên quan" trong Shorts.
- **TikTok và Instagram Reels:** đăng lại các Shorts với cùng handle `keepthefirefilms`.
- **Ảnh cộng đồng:** đăng ảnh tĩnh "FIRE %" của Spark hằng tuần và hỏi người xem "What's your fire today?".

## 9. Việc còn lại phía anh

1. Tạo kênh bằng tài khoản Brand (để sau này thêm người quản lý), đặt tên và handle.
2. Tải avatar, banner và watermark lên. Dán mô tả, từ khoá và mặc định tải lên.
3. Tạo 4 danh sách phát.
4. Tải `SCROLL-dang-youtube.mp4` lên, điền mục 5, đặt màn hình kết thúc và lên lịch.
5. Xác minh số điện thoại để dùng thumbnail tuỳ chỉnh và video dài hơn 15 phút.
