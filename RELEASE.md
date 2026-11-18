# Release Plan

The content below is template

| Step | Schema after step | Serving Version | Exact Command | How to undo it | Compatible Versions |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1. Deploy initial version | `v1` | `v1` (100%) | `npm run release -- starter` (hoặc v1) | Không có | `v1` |
| 2. Migrate Database up | `v2` (chứa thay đổi mới) | `v1` (100%) | `npm run migrate up` | `npm run migrate down` | `v1`, `v2` |
| 3. Canary Release v2 | `v2` | `v1` (75%), `v2` (25%) | `npm run release -- v2` | `npm run rollback` | `v1`, `v2` |
| 4. Full Release v2 | `v2` | `v2` (100%) | Tự động chuyển 100% nếu gate pass | `npm run rollback` | `v2` |

## Point of No Return
* Điểm không thể quay đầu (Point of no return) nằm ở: **[Điền bước mà sau đó bạn không thể rollback database một cách an toàn mà không làm mất dữ liệu người dùng, ví dụ: "Sau khi Full Release v2 chạy ổn định và phát sinh dữ liệu mới trên schema v2, việc chạy migrate down sẽ làm mất các dữ liệu mới này."]**
* *(Hoặc nếu không có point of no return, hãy giải thích lý do tại sao schema v2 tương thích ngược hoàn toàn và có thể down bất cứ lúc nào).*

## Canary Gate
* **Gate's limit (Giới hạn của gate):** [Ví dụ: 5% lỗi, hoặc > 2 request lỗi trong x giây]
* **Why that number (Tại sao chọn con số này):** [Giải thích dựa trên toán học hoặc yêu cầu nghiệp vụ, ví dụ: Ở mức tải 20 req/s, 25% traffic vào v2 là 5 req/s. Nếu test trong 10 giây sẽ có 50 request. Giới hạn x lỗi là đủ để phát hiện bản bad release mà không ảnh hưởng diện rộng]
* **What it misses (Gate này bỏ sót điều gì):** [Ví dụ: Gate chỉ đo lường HTTP status code (như 500), nó sẽ bỏ qua