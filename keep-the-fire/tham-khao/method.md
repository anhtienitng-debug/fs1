# Method — kênh Bước đầu

Người là đạo diễn, AI là họa sĩ hoạt hình rất nhanh. Vòng lặp: **Mô tả → Nhìn → Sửa.**
Nhịp kênh: 3–4 phim mỗi tuần. Độ dài theo kịch bản (không cố định), thường 1:30–3:30.

## 9 bước của mỗi phim (3 lần anh duyệt)
0. **Ý tưởng**: anh gửi một nỗi đau / một video tham khảo / chọn từ `ideas.md`. Video tham khảo: phân tích từng cảnh, rồi đổi sang bối cảnh Việt Nam và sắp lại cho có nhân quả.
1. **Pitch → DUYỆT 1**: 3 ý tưởng (tên 1 từ, câu kẻ thù, device, 3 dòng), nói nên chọn cái nào và vì sao, nói thật nếu ý yếu. Anh viết lại câu kẻ thù.
2. **Story + timeline → DUYỆT 2**: 8 nhịp, bảng cảnh có giây, dấu hiệu trên màn hình (HUD/bộ đếm, ≤2 từ khoá), câu thì thầm; **không câu dẫn chuyện**; cộng đúng tổng thời gian. Ghi vào `story.md`.
3. **Thư mục phim**: `new_film.py`, rồi đưa bảng cảnh vào `project/audio/timing.json` (nguồn sự thật duy nhất).
4. **Dựng từng cảnh**: bối cảnh + đạo cụ trước (đạo cụ nào được chạm thì khai điểm cầm), rồi animate, khai `DP.touch` cho mọi cái chạm; `sheet.py`; tự trả lời 5 câu hỏi contact sheet; sửa; mới gửi anh.
5. **Contact check**: `node tools/contact_check.cjs` đến khi "no misses"; zoom bằng mắt 3 thời điểm mỗi cảnh có cầm nắm.
6. **Âm thanh**: `tools/build_audio.py` (venv); giọng thì thầm: `vbee_tts.py` → `whisper.py`; kiểm tra nhận dạng giọng; xem bảng loudness từng cảnh.
7. **Honest review + render → DUYỆT 3**: honest review (sheet mỗi 10 s, người xem bỏ đi ở đâu); render; ghép âm bằng `python tools/mux.py renders/<TỪ>_vN_video.mp4 renders/<TỪ>_vN.mp4` (chặn đỉnh + ghép + `verify.py`). Anh gửi danh sách sửa đánh số → sửa hết → render một lần → lặp.
8. **Đóng gói + ghi nhớ**: 2–3 thumbnail (`make_thumb.py`, xem ảnh cỡ điện thoại), `youtube/UPLOAD.md` (markdown); bản cuối `films/<NN>_<TỪ>/<TỪ>_final.mp4` + bản điện thoại; cập nhật style-bible, method, films (chỉ điều đúng cho mọi phim); cải tiến công cụ đưa vào `toolkit/`.
9. **Sau 48 giờ**: anh gửi ảnh retention + vài bình luận; đọc 10 giây đầu và đoạn tụt nhất; ghi bài học vào đây, ý tưởng mới vào `ideas.md`, số liệu vào `films.md`.

## Câu chuyện
- **Nỗi đau, không phải đức tính.** Đọc to: nghe như khẩu hiệu treo lớp → bỏ; nghe như lời bạn thú nhận lúc 2 giờ sáng → dùng.
- **Câu kẻ thù**: ngắn, chữ thường, cụ thể, hơi tàn nhẫn, điều người thật hay tự nói. Anh viết.
- **Device**: hiểu trong 2 s · sai suốt phim · đổi nghĩa ở bước ngoặt · nhân vật chạm được (HUD + tiếng tick).
- **8 nhịp**: vết thương → cái giá → cày → đáy → bước ngoặt → trận cuối → phần thưởng → tấm gương + tên phim. Bước ngoặt rơi ngay trước giữa phim.
- **5 chi tiết**: kẻ thù sinh ra từ thứ trên màn hình; gieo rồi gặt; thất bại vẫn sống sót; im lặng trước cú lớn; chi tiết cụ thể (giờ, số).
- **Không câu dẫn chuyện** (anh, phim 03: "để người xem tự hiểu"). Thay bằng: hành động rõ, HUD/bộ đếm kể thời gian và trạng thái, và ở bước ngoặt tối đa 1–2 từ khoá. Chỉ thẻ kết có cặp câu (câu lặng + câu đấm màu vàng).
- **Bỏ câu thì phải thêm hình**: khi bỏ lời dẫn, những gì câu từng nói phải có hình tương ứng — thời gian trôi (bộ đếm NGÀY, cửa sổ ngày/đêm), "chờ" (xoè tay chờ tia lửa, tia lửa tắt giữa đường), "thay thế" (hai bộ đếm cạnh nhau, nguồn sáng đổi từ tay sang chân).
- **Bước ngoặt phải được diễn ra**: nhân vật làm một việc khác trước (nhìn tay trống → nắm tay → đứng dậy dù không có lửa), và device đổi nghĩa ngay giây đó (bộ đếm đổi tên + đổi màu).
- **Quy tắc 6 giây**: montage 2–3.5 s; cảm xúc 4–6 s; thì thầm 1.5–2.3 s nối nhau; reveal 4–6 s; trận cuối 15–30 s. Muốn dài hơn: thêm nơi chốn / montage / hình bài học / nhân vật phụ, không làm chậm cảnh.
- **Trận cuối có nhịp**: dừng nghĩ (đẩy vào mặt ~1 s) → lao → vấp, bị đẩy lùi (~1.5 s) → nhích dần, nhanh dần → vỡ (chớp + rung). Trước đó: đứng im, chỉ nhịp tim.

## Hình
- Nhân vật to; tay và đạo cụ là hai hình riêng chạm nhau; **tay cầm vật phải thật sự chạm và luôn nhìn thấy** (vẽ tay/cánh tay đè lên đạo cụ: đàn, sách, điện thoại áp má, tay mẹ trên cán chảo).
- Đạo cụ đơn giản, to, đọc được: sách đóng nhìn nghiêng; mũ lưỡi trai cần lưỡi dài phẳng (vòm tròn trông như mũ bảo hộ). Kiểm tra vật ở cỡ thumbnail.
- Điện thoại trong phòng: thấy mặt lưng, ánh sáng hắt lên mặt; màn hình chỉ thấy ở cận cảnh chèn.
- Đồ vật quen thuộc giúp hiểu: icon Facebook/TikTok, biển "TRÀ ĐÁ VỈA HÈ" để ly không bị nhầm là bia.
- Một núm kể chuyện: vẽ mọi thứ có màu, một bộ lọc bão hòa (`DP.stage` sat) để làm thế giới xám/màu.
- Tay gần camera giơ lên sẽ che mặt → giơ tay kia; cầm đồ ngang hông.
- Bối cảnh rộng hơn khung hình ở góc máy rộng nhất. Hình chữ nhật vẽ có làm mượt mà không chia nhỏ sẽ thành cục tròn.
- Chữ theo màn hình đi ngược camera đang di chuyển: kiểm tra trên mọi khung của sheet.
- Thử phong cách/nhân vật mới: làm trong thư mục lab riêng, 1–4 ảnh thử; không đổi bộ máy của phim khi chưa duyệt.

## Âm thanh
- Một chủ đề, nhiều vai (70 bpm suy ngẫm, 80 cày, 96 khi "vào", 120 montage lướt rỗng). Thứ dopamine rẻ có âm riêng (synth bồn chồn) và tắt thành drone khi màu cạn.
- Mọi hành động có tiếng đúng giây. Nhịp tim nhanh dần khi căng; cắt hết 1–2 s trước cú lớn.
- Loa điện thoại không phát dưới ~300 Hz: âm trầm luôn kèm lớp trung (nhịp tim + tiếng gõ, boom + tiếng nứt). Các cảnh trong ~5 dB. Master -14 LUFS, ghép `mix.wav` sau render (renderer làm nhỏ tiếng).
- Giọng thì thầm làm mất thanh điệu tiếng Việt: luôn giữ lớp giọng thật; câu dưới 1 s khó nghe → làm chậm (~0.78×), tăng lớp giọng; chữ trên màn hình gánh phần còn lại. Kiểm tra bằng nhận dạng giọng (faster-whisper).
- Vbee: gọi API bằng file mã `D:\Yt\.secrets\vbee_token.txt` (anh tạo một lần), không đọc từ trang web đã đăng nhập.

## Checklist
**Mỗi cảnh**: sheet đọc như người xem với tiếng tắt · không vật nào đọc nhầm · không chữ đè mặt/tay/chỗ rối/HUD · không ai bị đồ vẽ đè · mặt và lông mày đúng nhịp · luật màu còn giữ · mọi cái nắm đã zoom.
**Trước render cuối**: sheet cả phim mỗi 12 s · độ dài đúng kế hoạch · contact check sạch · loudness từng cảnh trong ~5 dB · honest review đã chạy.
**Sau render**: `verify.py` (khung từ chính mp4, độ dài, LUFS, bản 720p) · xem trọn một lần trên điện thoại có tiếng.
**Trước khi đăng**: 5 giây đầu nói ra nỗi đau, không logo chậm · thumbnail đặt cạnh thumbnail khác, thu nhỏ · tiêu đề `[TỪ] | Phim Hoạt Hình Ngắn` · mô tả = cảm xúc + cặp câu ở thẻ kết · ghi chú phim đã lưu.

## Quy trình làm việc
- Một file thời gian là nguồn sự thật; chèn cảnh phải dời mọi thứ sau nó (cảnh, bộ đếm, chữ, âm).
- Đọc/ghi mọi file văn bản bằng UTF-8 (`PYTHONUTF8=1`).
- Giữ mọi phiên bản (v1, v2…). Sửa theo danh sách đánh số: sửa hết rồi render một lần. Có sửa mới giữa lúc render → dừng bản cũ.
- Sheet và thumbnail chạy bằng `python` hệ thống (có PIL); nhạc chạy bằng venv `D:/Yt/KyLuat/.venv`.
- Chat dài bị chậm → lưu tiến độ vào `story.md`, mở chat mới với lệnh "tiếp tục phim" trong `prompts.md`.

## Bẫy đã tốn giờ
- Tay ngồi với không xa → để vật gần hoặc cho đứng. Tay nhạt trên giấy kem → giấy vàng/bàn gỗ.
- Font thiếu ký hiệu → vẽ bằng hình. Số ngẫu nhiên → mọi thứ phải "ngẫu nhiên nhưng lặp lại được".
- Muffle cắt quá thấp → điện thoại không nghe gì. Vật đọc sai ở cỡ nhỏ (chậu thành mũ).
- Trùng id giữa gradient và filter trong SVG (vd. `<id>-glow`) → màu biến mất: đặt tên riêng.
- `gen_index.py` nạp **mọi** file `.js` trong `assets/` → bản sao lưu đặt trong đó (`lua_v1.js`) nạp sau và đè bản mới. Sao lưu để ở `films/<NN>_<TỪ>/versions/`.
- Nén AAC làm vọt đỉnh ~+1 dB: chặn đỉnh ở 48 kHz hay loudnorm lúc ghép đều không giữ được ≤ -1 dBTP → `tools/mux.py` (chặn đỉnh ở 192 kHz trước khi ghép).
- Dời mốc thời gian bằng script: giữ nguyên mọi trường của mỗi mốc (từng làm mất giá trị % của HUD) — so lại vài mốc sau khi dời.
- Kẻ thù để trong lớp bị làm tối (`bright`) sẽ biến mất khi phòng tối; để trong lớp `villain` (không bị làm tối) thì thân phải gần đen — màu sáng hơn phòng sẽ thành "con ma".
- Câu Vbee ngắn: thử tốc độ đọc chậm (`VBEE_SPEED=0.75`) trước khi chỉnh bộ lọc; hạ tiếng mưa/gió/chuông đúng giây có thì thầm. Vbee đôi khi trả 502 → chạy lại riêng câu đó.
- Thumbnail kiểu phẳng/hình nhỏ không ăn click; cận cảnh mặt to + một nguồn sáng + chữ có dấu chấm thì ăn.
