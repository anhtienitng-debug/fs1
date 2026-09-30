# autovid

Biến một link bài báo thành video review dài tiếng Việt cho YouTube: nghiên cứu
đối chiếu, viết kịch bản, đọc bằng giọng **Phạm Tuyên** của
[VieNeu-TTS](https://github.com/pnnbao97/VieNeu-TTS), tự lấy hình từ các kho
miễn phí, vẽ biểu đồ và bản đồ, rồi dựng thành `final.mp4` kèm phụ đề và metadata.

Bạn duyệt kịch bản ở giữa. Phần còn lại tự chạy.

## Luồng dùng

```bash
# 1. Tạo job: lấy bài → nghiên cứu → viết script, rồi DỪNG
autovid new https://www.economist.com/... --text-file bai.txt

# 2. Mở jobs/<job>/script.md, sửa thoải mái, rồi duyệt
autovid approve latest --reload

# 3. Dựng video
autovid run latest
```

Kết quả trong `jobs/<job>/`:

| File | Nội dung |
|---|---|
| `final.mp4` | Video hoàn chỉnh 1920×1080 |
| `subtitles.srt` | Phụ đề rời (bản `.ass` đã đốt sẵn vào hình) |
| `metadata.json` | Tiêu đề, mô tả, tag, chapters theo timestamp thật |
| `credits.txt` | Nguồn tham khảo + ghi công ảnh/video, dán vào mô tả |
| `thumbnail.jpg` | Ảnh bìa nháp |
| `script.md` | Kịch bản bạn đã duyệt |
| `brief.json` | Kết quả nghiên cứu đối chiếu |

## Pipeline

```
ingest → research → script → [BẠN DUYỆT] → scenes → tts → align
                                              ↓
                          charts ← visuals ← ─┘
                              ↓
                          assemble → package
```

Mỗi bước ghi ra file riêng, nên chạy lại được từ bất kỳ đâu. Sửa một cảnh không
phải đọc lại cả video:

```bash
autovid run latest --force visuals    # lấy lại hình, giữ nguyên audio
autovid status latest                 # xem đã chạy tới đâu
```

## Cài đặt

Cần **Linux/Windows + GPU NVIDIA** (chạy CPU được nhưng TTS chậm ~10×).

```bash
git clone <repo> && cd fs1
./scripts/setup.sh          # cài ffmpeg, venv, VieNeu-TTS
cp .env.example .env        # rồi điền DEEPSEEK_API_KEY
.venv/bin/autovid doctor    # kiểm tra mọi thứ
```

Mỗi lần dùng, mở một terminal riêng cho server giọng đọc:

```bash
cd VieNeu-TTS && uv run python -m apps.openai_speech
```

## API key

| Dịch vụ | Bắt buộc? | Ghi chú |
|---|---|---|
| **DeepSeek** | có | `deepseek-flash`, ~$0.05/video. Xem `autovid models` để biết tên model hiện có |
| Ollama (thay DeepSeek) | — | Chạy local trên GPU của bạn, **miễn phí, không key** |
| Tìm kiếm web | không | Mặc định dùng DuckDuckGo, không cần key |
| Ảnh & video | không | Openverse, Wikimedia, NASA, Internet Archive đều không cần key |
| Pexels / Pixabay | không | Tuỳ chọn, miễn phí. Có thì B-roll video đẹp hơn hẳn |

Chạy hoàn toàn miễn phí, không key nào:

```bash
ollama pull qwen2.5:14b
autovid new <url> -f bai.txt -s llm.provider=ollama -s llm.model_script=qwen2.5:14b
```

## Cấu hình

`config/default.yaml` là bản gốc. Đừng sửa nó — tạo `config/local.yaml` để ghi đè,
hoặc dùng `-s` cho từng lần chạy:

```bash
autovid new <url> -s script.target_minutes=25 -s script.chapters=8
autovid run latest -s tts.speed=1.05 -s video.subtitles_burn=false
```

Những khoá hay chỉnh nhất:

```yaml
channel.persona          # giọng điệu người dẫn, đưa thẳng vào prompt
script.target_minutes    # 18 phút mặc định
script.include_vietnam_angle   # chương "chuyện này ảnh hưởng gì tới người Việt"
tts.voice                # "Phạm Tuyên" (Bắc), "Quang Sơn" (Trung), "Thái Sơn" (Nam)
visuals.sources          # thứ tự ưu tiên kho ảnh
music.dir                # thả file nhạc nền vào đây, tự ducking khi có giọng
review.gates             # thêm "visuals" nếu muốn duyệt cả hình trước khi dựng
```

## Những chỗ đã cân nhắc

**Tường phí.** Tool không vượt paywall. Nếu bạn là thuê bao, lưu toàn văn ra file
rồi truyền qua `--text-file` — script sẽ sắc hơn hẳn. Không có thì nó vẫn chạy
bằng phần công khai cộng với nghiên cứu từ các nguồn khác, chỉ kém sắc hơn.

**Bản quyền nội dung.** System prompt ép kịch bản phải diễn đạt lại hoàn toàn bằng
lời người dẫn, không sao chép câu chữ. Nguồn tham khảo vẫn được ghi đầy đủ trong
`credits.txt` để dán vào mô tả video.

**Bản quyền hình ảnh.** Mọi file tải về đều ghi lại tác giả, giấy phép và URL gốc
vào `assets.json`, rồi xuất thành `credits.txt`. Chỉ nhận giấy phép cho dùng
thương mại (CC0, PDM, CC-BY, CC-BY-SA, Pexels, Pixabay).

**Kịch bản sinh theo nhiều nhịp** (dàn ý → từng chương → hook/outro) thay vì một
lần gọi, vì model nhỏ hay bị cắt ở khoảng 4–6k token đầu ra.

**Cắt cảnh bằng luật, không nhờ LLM** — cắt giữa câu sẽ làm giọng đọc và phụ đề
lệch nhau. LLM chỉ lo việc gán truy vấn tìm hình.

**Phụ đề căn ngược bằng faster-whisper** trên chính file audio vừa tạo, nên khớp
theo từng từ. Không cài được thì tự hạ xuống chế độ ước lượng, vẫn xem được.

**Biểu đồ** dùng bảng màu đã qua kiểm tra tách màu cho người mù màu trên nền tối,
thứ tự màu cố định, một trục (không bao giờ hai trục y), nhãn gắn thẳng vào điểm
dữ liệu thay vì ghi lên mọi điểm.

## Phát triển

```bash
.venv/bin/python -m pytest tests/ -q     # 15 test, chạy offline
.venv/bin/ruff check src/
```

`tests/` chỉ phủ phần chạy được không cần mạng/API/ffmpeg: chuẩn hoá văn bản
tiếng Việt cho TTS, cắt cảnh, vòng đời script.md ở cổng duyệt, ghép audio, sinh
phụ đề, vẽ biểu đồ. Các bước gọi mạng phải thử bằng job thật.
