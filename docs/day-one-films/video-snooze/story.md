# SNOOZE | An Animated Short Film: kế hoạch (đã DUYỆT 1 + 2, chọn A)

**v4 (làm theo review kể chuyện), phim dài 2:24, bản đăng 2:30:**
1. Mở phim: 1.6 giây đầu chỉ có con số **60** sáng trong bóng tối, kèm tiếng "tách". Sau đó camera lùi từ con số ra, thấy ông ngoài cửa sổ.
2. Ông gõ cửa lần 1 vẽ trên rèm, rõ như lần 2.
3. Gieo bà cụ từ sớm:
   - Ngày 15, nhìn qua cửa sổ lúc trưa thấy bà vẫy, trên đầu bà là số 10.
   - Ngày 22, nhìn từ công viên thấy Spark ngáp trong khung cửa sổ, bà vẫy lên, số 3.
   - Ngày 24, gặp bà ở ghế đá với số 1.
4. Ở bến, số của ông to hơn và tụt 1 ngay trước mắt người xem (57 → 56, 45 → 44).
5. Bỏ cảnh ngủ 0:39 ("next time") vì trùng lặp.
6. Bông hoa trắng từ đám tang đặt trên tủ đầu giường lúc Spark mở lọ, nối bước ngoặt với đám tang.
7. Sáng chủ nhật 5:55, không có cái bóng:
   - Spark theo thói quen kéo chăn trùm đầu, chữ "five more minutes." hiện bên gối.
   - Lặng một nhịp, con số trên đầu tụt 1, tiếng "tách".
   - Spark hất chăn, chữ vỡ vụn rơi xuống, rồi đi tắt chuông ở kệ xa.
8. Cảnh cuối thay cảnh ngồi một mình:
   - Spark đội mũ len, cầm hai ly ca cao, đặt một ly lên ghế trống (cần câu của ông dựng cạnh), rồi ngồi vào ghế của ông.
   - Nhìn sang ghế trống, rồi nhìn ra mặt trời. Đây là cú gặt của cảnh pha hai ly ca cao.
9. **Motif âm thanh:** mỗi lần con số tụt là cùng một tiếng "tách" (`numtick`). Cảnh cuối không còn tiếng tách.
10. Giữ chữ *"he has no time..."* theo yêu cầu của anh ở v3.

**v3 (sửa lần 2), phim dài 2:13, bản đăng 2:19:**
1. Lửa lúc nằm đặt cao hẳn trên con số ngày, không còn che chữ.
2. Bỏ cảnh đặt nhiều đồng hồ (42–58 bản gốc).
3. Đi bộ: tay vung về phía trước theo hướng đi.
4. Lúc thấy số 35 của ông: không có cái bóng. Thay bằng chữ Spark tự nghĩ thầm *"he has no time..."* (màu kem, không phải màu kẻ thù).
5. Bỏ cảnh 6:15 kéo rèm (1:39 bản v2).
6. Bỏ trận cuối bóng giữ chân (2:09 bản v2). Bước ngoặt là cái chết của bà hàng xóm; mọi cảnh sau đám tang là lúc Spark đã hiểu, nên cái bóng không còn xuất hiện (bỏ cả tay bóng trên nắp lọ và bóng teo dần ở 6:30).
7. Cầu tàu dài hết khung, Spark chạy trên cầu chứ không chạy giữa không trung.
8. Đoạn cuối: thời gian trôi chậm, chỉ 2 bình minh (số của ông 28 → 27 → 26). Rồi ông trao mũ len, cảnh cuối Spark một mình.

Kỹ thuật: thời gian ghép bằng bảng `EDL` trong `scene.js` và `am-thanh.py` (bỏ 42–58, 92–98, 116–132; chèn 72–78).

**v2 (sửa theo DUYỆT 3), phim dài 2:51, bản đăng 2:57:**
1. Các đoạn đang ngủ, chuông reo mà không dậy (0:05, 0:21, 0:39, 0:53): bỏ hình cái bóng, chỉ còn chữ thì thầm bên gối.
2. Mặt lúc ngủ:
   - ngủ say: mắt nhắm cong, miệng hé, có chữ "z" bay lên;
   - lúc với tay bấm báo lại hoặc mới dậy: mắt lim dim, ngáp nhỏ.
   - Không còn mặt buồn.
3. Bỏ cảnh 0:26 (cửa và ảnh nhét dưới cửa).
4. **Số ngày còn sống trên đầu mỗi người.** Mỗi ngày con số tụt 1.
   - Spark 21,915, ông 60.
   - 0:24: Spark ngước nhìn số của mình, quơ tay xua, nhún vai, không hiểu nó là gì.
   - Đoạn đáy viết lại (58–78 giây, chèn thêm 6 giây):
     - Công viên buổi trưa: bà cụ cho chim ăn, trên đầu bà là số **1**. Spark ngồi cạnh, nhìn số của bà rồi nhìn số của mình.
     - Hôm sau đám tang: số **0** trên tấm ảnh bà tắt. Spark thấy số trên đầu từng người và hiểu.
     - Spark quay sang thấy ông đứng cuối hàng: số **35**, phóng to. Cái bóng: "he has time."
   - Bỏ xe tải chuyển nhà. Phần thưởng mới:
     - Sau chủ nhật, hai ông cháu ngồi câu. Thời gian trôi nhanh, mỗi bình minh số của ông tụt 1, `SUNRISES` tăng từ 6 lên 33, đến khi số của ông còn **1**.
     - Ông nhấc mũ len, trao cho Spark.
     - Sáng hôm sau Spark đội mũ len, một mình ngồi đúng ghế của ông.
     - Cảnh kết: mũ len nằm cạnh lọ rỗng.
5. Chân bước đúng nhịp mỗi khi di chuyển (0:43 trước đây trượt đứng chân): đi đặt đồng hồ, đi vào công viên, lết trong trận cuối.
6. Trận cuối:
   - Spark ngồi dậy, đứng lên. Cái bóng cúi rạp, hai tay duỗi dài **sát và song song mặt sàn**, nắm chặt hai cổ chân.
   - Spark cố nhấc chân, bị giật lại hai lần, rồi lết từng bước tới cửa sổ và kéo rèm. Nắng làm bóng và hai tay tan.
   - Không còn cảnh níu tay.

Kênh Keep The Fire · phim 05 · dự kiến 2:45 · không lời dẫn.

## Tránh trùng phim cũ

| Phim | Nội dung đã có |
|---|---|
| KỶ LUẬT (kênh Việt) | Hứa dậy sớm, ngủ thêm, đồng hồ 5:00, chủ đề kỷ luật |
| SCROLL | Điện thoại |
| TOMORROW | Hạn chót |
| PERFECT | Cục tẩy |
| COMPARE | Thước dây |

**SNOOZE khác ở đâu:** phim không nói về kỷ luật mà về **thứ bị lấy mất sau mỗi lần bấm báo lại**: những buổi bình minh cùng ông nội, và chúng không quay lại.

**Trận cuối cũng khác bốn phim trước** (lao qua, bước đều, ký tên, nhảy ollie): Spark không bấm nút, mà **kéo rèm cửa**. Ánh bình minh đầu tiên làm cái bóng tan.

## DUYỆT 1: ba hướng

| | **A. SUNRISE JAR (đề xuất)** | B. THE BLANKET | C. 9 MINUTES |
|---|---|---|---|
| Nỗi đau | Ông rủ ra bến câu lúc bình minh. Spark bấm báo lại hết lần này đến lần khác, ông đi một mình, rồi ông sắp chuyển đi | Cái chăn ấm giữ chặt người, không dậy nổi | Mỗi lần bấm báo lại mất 9 phút, cộng lại thành cả đời |
| Câu kẻ thù | **"five more minutes."** · "he'll understand." | "stay." | "just nine more." |
| Device | Mỗi lần bấm báo lại, một **mặt trời nhỏ** rơi vào **lọ thuỷ tinh "MISSED"** trên kệ. HUD `SNOOZE ×n` và `MISSED ☀ n`. Ở bước ngoặt, chữ SNOOZE xám rụng N-O-O-Z, chữ R-I vàng trượt vào thành **RISE**. HUD đổi thành `SUNRISES ☀ n` vàng | Cái chăn có tay | Bộ đếm phút |
| Điểm mạnh | Cái giá cụ thể và có người thật: ông nội, cái ghế thứ hai trên bến bỏ trống. Lọ mặt trời hiểu ngay trong 2 giây. Kết thúc có nước mắt nhưng ấm | Hình ảnh hài | Số liệu rõ |
| Điểm yếu (nói thật) | Có tờ giấy ông dán ở cửa, ghi một chữ "SUNDAY?". Đây là chữ trong cảnh, không phải lời dẫn | Gần như lặp KỶ LUẬT | Khô, thiếu cảm xúc |

**Chọn A.**

> Bản nháp câu kẻ thù: `five more minutes.` (câu chính), `he'll understand.` (câu ở đáy). Anh viết lại nếu muốn.

## DUYỆT 2: bảng cảnh (hướng A)

**Bộ đếm**
- Trái: `FIRE %`.
- Phải: `SNOOZE ×n` màu xám, dưới là `MISSED ☀ n`.
- Sau bước ngoặt: `SUNRISES ☀ n` màu vàng.
- Có tiếng tick mỗi lần bộ đếm đổi.

**Gieo và gặt**
1. **Ông nội** (râu bạc, mũ len) gõ cửa sổ lúc 5:55, giơ hai cần câu. Ở cuối phim, hai người ngồi cạnh nhau trên bến, cùng câu lúc bình minh.
2. **Hai cái ghế gấp trên bến**, một ghế luôn trống. Cuối phim cái ghế đó có người ngồi, rồi sau khi ông đi, Spark tự ngồi đó mỗi sáng.
3. **Lọ "MISSED"** đầy những mặt trời nhỏ bị nhốt. Ở bước ngoặt, Spark mở nắp lọ.

| # | Nhịp | Giây | Cảnh (hành động) | HUD | Kẻ thù thì thầm |
|---|---|---|---|---|---|
| 1 | Vết thương | 0–14 | 5:55 AM, phòng còn tối.<br>1. Đồng hồ báo thức reo. Ông nội gõ cửa sổ, giơ hai cần câu, cười.<br>2. Kẻ thù mọc từ **bóng cái gối**, ghé tai Spark.<br>3. Ngón tay Spark bấm nút báo lại.<br>4. Một mặt trời nhỏ bay khỏi cửa sổ, rơi vào lọ "MISSED" trên kệ, nắp đóng "tách". Ông đứng chờ một lúc rồi đi một mình. | FIRE 70% · SNOOZE ×1 · MISSED ☀ 1 | "five more minutes." |
| 2 | Cái giá | 14–42 | Montage, mỗi cảnh khoảng 3.5 giây:<br>· Bấm, bấm, bấm. Đồng hồ nhảy 5:55 → 6:04 → 6:13 → 7:40.<br>· Bến câu lúc bình minh: ông ngồi một mình, cái ghế bên cạnh trống.<br>· Ông gõ cửa lần nữa, nhỏ hơn. Spark kéo chăn trùm đầu.<br>· Ông nhét dưới cửa một bức ảnh chụp bình minh trên bến.<br>· Lọ đầy dần mặt trời nhỏ.<br>· Spark ngủ dậy lúc trưa, mệt, ngoài trời xám. | FIRE 70 → 30 · SNOOZE ×1 → 38 · MISSED ☀ 1 → 21 | "it's still dark", "you deserve rest", "next time" |
| 3 | Cày | 42–58 | Spark cố dậy bằng mọi cách: **ba cái đồng hồ** đặt khắp phòng, ly nước lạnh, ghi chú dán trán.<br>Sáng hôm đó cả ba reo một lúc. Spark bò dậy tắt từng cái rồi quay lại giường.<br>Kẻ thù kéo chăn phủ lên Spark như một cái tay. | SNOOZE ×38 → 52 | "five more minutes." |
| 4 | Đáy | 58–72 | Một buổi trưa, Spark mở cửa: **tờ giấy ông dán** vẽ hai cần câu và một chữ **"SUNDAY?"**.<br>Ngoài sân có thùng carton, xe tải chuyển nhà: ông sắp chuyển đi.<br>Spark nhìn lọ: 21 mặt trời bị nhốt. Lửa chỉ còn đốm. | FIRE 4% · MISSED ☀ 21 | "he'll understand." |
| 5 | Bước ngoặt | 72–86 | 1. Spark cầm lọ, các mặt trời nhỏ đập nhẹ vào thành lọ như muốn ra.<br>2. Kẻ thù đặt tay lên nắp. Spark **mở nắp lọ**.<br>3. Các mặt trời bay ra, lơ lửng quanh phòng, thắp sáng những bức ảnh ông nhét dưới cửa. Spark thấy những buổi bình minh mình đã bỏ lỡ.<br>4. Chữ to **SNOOZE** xám: N, O, O, Z rụng xuống, R và I vàng trượt vào thành **RISE**, rồi bay vào góc.<br>5. Spark đặt đồng hồ lên kệ xa giường, cầm bút khoanh tròn chữ SUNDAY. | FIRE 4 → 18 · **SUNRISES ☀ 0** | (im lặng) |
| 6 | Montage | 86–116 | Tập cho chủ nhật, mỗi ngày dậy sớm hơn một chút:<br>· **6:30:** chân chạm sàn ngay khi chuông reo.<br>· **6:15:** kéo rèm, trời xanh nhạt.<br>· **6:00:** chạy ra bến, ông vẫn ở đó, hai ông cháu vẫy nhau.<br>· **5:55:** pha hai ly ca cao.<br>· Lọ trên kệ giờ để mở, mỗi buổi sáng một mặt trời bay ra ngoài cửa sổ. | FIRE 18 → 80 · SUNRISES ☀ 1 → 5 | "five more minutes" (teo dần rồi tan) |
| 7 | Trận cuối | 116–132 | **Chủ nhật, 5:55**, đêm hôm trước Spark mất ngủ.<br>1. Chuông reo. Kẻ thù khổng lồ mọc từ bóng cả căn phòng, **chăn hoá thành tay** đè Spark xuống, ngón tay bị kéo về nút báo lại.<br>2. Thì thầm dồn dập. Camera đẩy vào mặt.<br>3. Spark rút tay khỏi nút, vươn về phía **rèm cửa**.<br>4. Lặng 1.5 giây.<br>5. Spark **kéo rèm**: ánh bình minh đầu tiên tràn vào, kẻ thù là bóng nên tan ra trong nắng. | FIRE 80 → 40 → 100 | "five more minutes", "he'll understand", "it's warm here", "next time" |
| 8 | Phần thưởng | 132–150 | 1. Spark chạy ra bến, ông đang xếp đồ.<br>2. Ông cười, mở **cái ghế thứ hai**. Hai người ngồi câu, mặt trời lên.<br>3. Xe tải chở ông đi. Spark vẫy.<br>4. Sáng hôm sau, Spark ra bến một mình, ngồi đúng ghế của ông, mặt trời lên. | SUNRISES ☀ 6 → 7 | |
| 9 | Tấm gương + tên phim | 150–165 | Lọ thuỷ tinh trên kệ mở nắp, trống rỗng, nắng chiếu qua. Thẻ kết: *"Some mornings don't come back."* rồi **"Wake up for them."** (vàng). Sau đó hiện **SNOOZE** và *Keep the fire.* | | |

**Tổng thời lượng:** 165 giây = 2:45, nối sẵn 6 giây màn hình kết thúc trong một file đăng.

**Âm thanh**
- 0–72 giây: piano giọng thứ. Chuông báo thức là chuông cơ "reng" (không phải tiếng điện thoại). Tiếng bấm báo lại "tách", tiếng mặt trời rơi vào lọ "tinh", tiếng chim sáng ở xa mà Spark không ra kịp.
- 72–86 giây: im lặng, tiếng mở nắp lọ, các mặt trời ngân như chuông gió.
- Montage: giọng trưởng, tiếng chim mỗi sáng một rõ hơn.
- Trận cuối: chuông, nhịp tim, lặng 1.5 giây, tiếng rèm kéo "xoạt", nắng tràn vào, hợp âm lớn.
- Kết: sóng nước ở bến, tiếng cần câu quay, hợp âm ấm.

**Việc khó cần chú ý khi dựng**
- Nhân vật nằm trên giường với ngón tay chạm nút báo lại.
- Cái chăn biến thành tay kẻ thù.
- Ánh nắng tràn vào phòng làm bóng tan.
- Bến câu có nước và mặt trời mọc.
- Ông nội cần nét riêng: râu bạc, mũ len xanh, lưng hơi còng.
