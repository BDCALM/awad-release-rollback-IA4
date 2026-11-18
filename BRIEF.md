# AI Briefs & Hand-overs

The content below is template

## Hand-over 1: Docker Packaging (Tiêu chí 1)
* **Goal:** Viết Dockerfile, .dockerignore và cấu hình môi trường để đóng gói ứng dụng.
* **Limits/Constraints:** Tuyệt đối không chỉnh sửa bất kỳ file nào trong thư mục `tools/` và file `test/app.test.js`.
* **Acceptance Criteria:** Các Check ID từ `I1` đến `I15` phải báo màu xanh (Green) khi chạy `npm run check`.

## Hand-over 2: Feature Implementation behind Flag (Tiêu chí 2)
* **Goal:** Thực hiện yêu cầu thay đổi trong `docs/CHANGE.md` và đặt logic mới sau một feature flag.
* **Limits/Constraints:** Chỉ sửa code trong thư mục `src/`.
* **Acceptance Criteria:** Các Check ID `T3` và `F1` đến `F7` phải báo màu xanh.

## Hand-over 3: Database Migrations & Deploy Order (Tiêu chí 3)
* **Goal:** Viết file `.up.sql` và `.down.sql` để migrate DB, đồng thời viết script update database.
* **Limits/Constraints:** Đảm bảo `v1` không bị crash khi database đã được migrate lên bản mới (backward compatible). 
* **Acceptance Criteria:** Các Check ID `C1` đến `C4` và `L5` phải xanh.

## Hand-over 4: Canary Release Script (Tiêu chí 4)
* **Goal:** Viết script `deploy/release.js` thực hiện Canary Release, chuyển traffic từ từ (với stage đầu tiên <= 25% traffic trong ít nhất 10 giây), và phải đợi Docker báo `healthy` trước khi chuyển hướng.
* **Limits/Constraints:** Dùng công cụ docker/cấu hình router đã cấp sẵn, không sửa `tools/`.
* **Acceptance Criteria:** Các Check ID `L0` đến `L4` phải xanh.

## Hand-over 5: Automatic Rollback (Tiêu chí 5)
* **Goal:** Viết kịch bản `deploy/rollback.js` và cấu hình Gate để TỰ ĐỘNG phát hiện lỗi và rollback mà không cần con người gõ lệnh. Quá trình rollback phải diễn ra dưới 5 phút.
* **Limits/Constraints:** Rollback script phải cấu hình lại trọng số (weights) của router và có thể xác minh qua `GET :8081/state`.
* **Acceptance Criteria:** Các Check ID `L6` đến `L9` phải xanh.