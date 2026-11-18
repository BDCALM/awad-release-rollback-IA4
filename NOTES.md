# Findings & Limitations

The content below is template
## Hardware / Environment Limitations
* **Load Test Constraints:** Kịch bản test `load-log.txt` yêu cầu duy trì mức tải 20 requests/second (`L2`). (Nếu máy bạn hoặc hệ thống Azure VPS/Docker bị nghẽn, hãy ghi rõ vào đây: *"Due to CPU constraints on my local machine / VM, the maximum throughput fluctuates, which might affect the strict 20 req/s load metric."*)
* **Operating System:** Tôi chạy bài tập này trên môi trường Windows (PowerShell/WSL2), nên một số thao tác bash shell hoặc pipe line log có thể mất thời gian xử lý I/O lâu hơn, dẫn đến độ trễ khi ghi log.

## Tool Findings (Nếu có phát hiện)
* *(Chỉ điền nếu bạn hoặc AI phát hiện ra công cụ của giáo viên có điểm bất hợp lý, ví dụ: file check bắt sai regex, router đôi khi rớt kết nối đột ngột không do code của bạn. Nếu mọi thứ trơn tru, bạn có thể để trống hoặc ghi "No issues found with the provided tools").*