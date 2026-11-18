
## Template for an AI log
## <YYYY-MM-DD> — <what you were working on>
Tool: <Claude Code / Copilot / Cursor / something else / none>
Asked for: <the task you gave it, in one sentence>
Kept: <what you took as it came>
Changed: <what you rewrote, and why>
Rejected: <what you threw away, and why>

`Changed` and `Rejected` are the two lines we read most closely: what the assistant got wrong, and which check caught it. "Nothing went wrong" is a fine entry if it says what you ran.

---

Every AI Log below are summarized briefly.

## Log number - 18/11/2026

**Tool used:** Gemini 3.1 pro
**Asked for:**


**Kept:**


**Rejected:**


**Changed:**


## Log 1 - 18/11/2026


**Tool used:** Gemini 3.1 pro

**Asked for:** Generate template for RELEASE.md, NOTES.md, BRIEF.md 
**Kept:** all these template file as an initial commit (after the `start` tag)
**Rejected:**Nothing
**Changed:**Nothing, since these files are templates



## Log 2 - 18/11/2026

**Tool used:** Gemini 3.1 pro

**Asked for:** Give me the roadmap to complete the IA4
Đây là repository mà tôi đã copy từ template của giáo viên: "https://github.com/BDCALM/awad-release-rollback-IA4"

**Kept:** Kept the "awad-release-rollback-IA4\roadmap.md" file


**Rejected:** Nothing


**Changed:** Nothing

## Log number 3 - 18/11/2026

**Tool used:** Gemini 3.8 FLASH high
**Asked for:** Viết Dockerfile, .dockerignore và cấu hình môi trường để đóng gói ứng dụng, Tuyệt đối không chỉnh sửa bất kỳ file nào trong thư mục `tools/` và file `test/app.test.js`. Không chạy npm run check cho tới khi các test Pass


**Kept:** Dockerfile, .dockerignore, src/config.js, src/server.js, package.json, env/


**Rejected:** Nothing


**Changed:** write file "Dockerfile, .dockerignore, src/config.js, src/server.js, package.json, env/


## Log number 4 - 18/11/2026

**Tool used:** Gemini 3.8 FLASH high
**Asked for:** Thực hiện yêu cầu thay đổi trong `docs/CHANGE.md` và đặt logic mới sau một feature flag. Chỉ sửa code trong thư mục `src/`. Điều kiện hoàn thành: Các Check ID `T3` và `F1` đến `F7` phải báo màu xanh.


**Kept:** migrations/002_expiry.up.sql, migrations/002_expiry.down.sql, src/app.js 
" Specific information:
`migrations/002_expiry.up.sql:`
Thêm cột expires_at TEXT (nullable) vào bảng links. V1 không bị ảnh hưởng vì không truy vấn hay bắt buộc cột này.
Tạo bảng flags (name TEXT PRIMARY KEY, value TEXT NOT NULL) và khởi tạo cờ mặc định: ('expiry', '0') (tắt).
`migrations/002_expiry.down.sql:`
ALTER TABLE links DROP COLUMN expires_at;
DROP TABLE IF EXISTS flags;
Đảm bảo rollback an toàn, đưa schema về trạng thái ban đầu để v1 tiếp tục hoạt động trơn tru (đạt C4).
`Triển khai Feature & Feature Flag trong src/app.js`
`Quản lý Feature Flag trong Database (đáp ứng F2, F3, F4):`
Lưu trữ trạng thái cờ expiry trực tiếp trong bảng flags của SQLite.
Endpoint PUT /admin/flags/expiry: Xác thực qua header x-admin-token so khớp với ADMIN_TOKEN. Trả về 401 nếu sai/thiếu token, trả về 200 khi cập nhật thành công.
Mọi instance cùng kết nối volume /data/app.db sẽ thấy thay đổi cờ tức thì (< 1ms), không cần khởi động lại container (đạt F4).
`Endpoint /version (đáp ứng F1, I7):`
Bổ sung trường flags: {"version": "2.0.0", "env": config.env, "flags": {"expiry": <boolean>}}.
`Hành vi khi cờ TẮT (expiry: false) (đáp ứng F1, F7, T3, C3):`
Giữ nguyên toàn bộ hành vi của v1.
Trường expiresInSeconds trong request body bị bỏ qua; mọi response trả về "expiresAt": null.
Endpoint GET /r/:code luôn trả về HTTP 302 chuyển hướng kể cả khi link đã quá hạn.
`Hành vi khi cờ BẬT (expiry: true) (đáp ứng F5, F6, C2):`
POST /links với expiresInSeconds: Kiểm tra số nguyên dương > 0 (trả về 400 nếu <= 0 hoặc sai định dạng); tính toán expiresAt theo chuẩn ISO 8601.
POST /links không có expiresInSeconds: Trả về "expiresAt": null (link vĩnh viễn).
GET /r/:code: Nếu link đã hết hạn (Date.now() >= expiresAtMs), trả về HTTP 410 với {"error": "expired", "message": "link has expired"} và không tăng số lượt hits. Nếu chưa hết hạn, tăng hits và trả về HTTP 302.
GET /links/:code và GET /links: Trả về HTTP 200 kèm thuộc tính expiresAt."
**Rejected:** Nothing
**Changed:** Changing/adding these files: migrations/002_expiry.up.sql, migrations/002_expiry.down.sql, src/app.js 



## Log number - 18/11/2026

**Tool used:** Gemini 3.1 pro
**Asked for:**


**Kept:**


**Rejected:**


**Changed:**