Dựa trên file rubric, mục tiêu chính của bài tập IA#4 là đóng gói một service nhỏ, phát hành bản thay đổi (canary release) trong lúc hệ thống vẫn đang nhận request, để bản phát hành lỗi này thất bại trên một lượng nhỏ traffic, và sau đó hệ thống phải quay lui (rollback). Tất cả mã nguồn phải do AI assistant viết thông qua prompt, bạn không được tự tay gõ code.

Dưới đây là các công việc cụ thể bạn cần thực hiện cho repository `awad-release-rollback-IA4`:

**1. Quản lý Git và Nguyên tắc Cốt lõi**

* Commit và gắn tag `starter` cho repository ngay khi vừa nhận, trước khi tạo ra bất kỳ thay đổi nào.


* Tuyệt đối không chỉnh sửa bất kỳ nội dung nào trong thư mục `tools/` và file `test/app.test.js`. Việc thay đổi các file này sẽ khiến mã fingerprint `4b56096c90ea819d` bị sai lệch và toàn bộ tiêu chí 4, 5 sẽ bị 0 điểm.


* Phân chia lịch sử commit rõ ràng: cấu hình đóng gói (packaging), mã nguồn thay đổi, và các script release phải nằm ở các commit tách biệt. Mỗi phần phải bắt đầu từ một commit sạch để lệnh `git diff` có thể hiển thị chính xác.


* Gắn tag `v1` cho ứng dụng được đóng gói với hành vi gốc và `v2` cho phiên bản chứa thay đổi.



**2. Đóng gói và Thay đổi (Tiêu chí 1 & 2)**

* Tạo `Dockerfile`, `.dockerignore`, `src/config.js` và thư mục `env/` để xử lý việc đóng gói và cấu hình theo từng môi trường.


* Thực hiện các thay đổi theo yêu cầu của `docs/CHANGE.md` bên trong thư mục `src/`, đồng thời đặt phần logic mới này ẩn sau một feature flag.


* Tạo các script cơ sở dữ liệu `migrations/002_*.up.sql` và `.down.sql` để quản lý thay đổi schema.



**3. Script Release và Rollback (Tiêu chí 3, 4, 5)**

* Viết kịch bản `deploy/release.js` (thực thi qua `npm run release -- <tag>`) và `deploy/rollback.js` (thực thi qua `npm run rollback`).


* Quá trình canary release phải thiết lập ít nhất 2 giai đoạn (stage) dưới 100% lượng traffic. Giai đoạn đầu tiên phải giữ ở mức 25% traffic (hoặc thấp hơn) trong khoảng thời gian ít nhất là 10 giây.


* Script release phải đợi Docker báo cáo container ở trạng thái `healthy` trước khi chuyển hướng traffic.


* Hệ thống kiểm soát (gate) phải **tự động** chặn đứng bản release lỗi mà không cần bạn phải can thiệp gõ lệnh.


* Thời gian hoàn thành quá trình rollback (tính từ request thất bại đầu tiên của bản lỗi đến request phản hồi cuối cùng) phải nằm trong giới hạn tối đa 5 phút.



**4. Chạy tải và Trích xuất Log**

* Chạy duy nhất **một phiên liên tục** lệnh `npm run load`, bắt đầu từ trước khi chạy migration cho đến sau khi bản bad release bị rollback. Lưu toàn bộ tiến trình này vào file `load-log.txt`. Không được phép có bất kỳ request nào thất bại bên ngoài phạm vi của bản bad canary.


* Lưu toàn bộ output của các lệnh migrate, release và rollback được gọi trong quá trình chạy tải đó vào file `release-log.txt`.


* Ngay sau phiên chạy tải, thi hành lệnh kiểm tra `npm run check 2>&1 | tee check-log.txt` và nộp file log kết quả.



**5. Chuẩn bị Tài liệu Markdown (Tiêu chí 3, 4, 5 & 6)**

* `RELEASE.md`: Lập bảng chi tiết kế hoạch release. Mỗi dòng tương ứng với một bước bao gồm: schema sau bước đó, phiên bản đang phục vụ, lệnh thực thi chính xác, cách hoàn tác (undo), và các version tương thích với schema. Bạn phải định nghĩa "point of no return", lý do thiết lập giới hạn cho gate, và ghi chú rõ những gì rollback không thể phục hồi (ví dụ: link bị hết hạn khi `v1` đang phục vụ).


* `BRIEF.md`: Ghi chép lại các đoạn prompt bàn giao cho AI ở từng bước, những giới hạn thiết lập (như cung cấp thư mục `tools/`), và các check IDs dùng để nghiệm thu.


* `AI-LOG.md`: Ghi chép nhật ký dùng AI, bắt buộc phải có mục `Changed` và `Rejected` thực tế (ít nhất một lần AI làm sai, chỉ rõ lệnh check hoặc dòng log nào đã phát hiện ra lỗi đó).


* `NOTES.md`: Nơi ghi chú mọi vấn đề về công cụ hoặc sự cố máy tính (như cấu hình không gánh nổi 20 requests/giây).


* `SELF_ASSESSMENT_REPORT.md`: Tự đánh giá điểm số cho từng tiêu chí, kèm theo bằng chứng cụ thể trỏ tới tên file, commit, tag, ID check hoặc số dòng trong log.



**6. Quy chuẩn Nộp bài**
Đóng gói kho lưu trữ thành một file nén zip duy nhất, **phải chứa thư mục `.git` ẩn** nhưng bỏ qua thư mục `data/` và `env/production.env`.

File zip phải được đặt tên theo định dạng `<MSSV>_<TổngĐiểm>.zip`. Dựa trên mã số sinh viên của bạn, hãy đặt tên file là `23120242_<tổng_điểm_bạn_tự_chấm>.zip` (ví dụ: `23120242_90.zip`) và nộp thông qua email sinh viên HCMUS trước 22:00 ngày hôm nay (18/11/2026). Điểm số tự đánh giá chênh lệch trên 10 điểm so với chấm thực tế sẽ bị trừ điểm theo hệ số.