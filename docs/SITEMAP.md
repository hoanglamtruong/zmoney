# SITEMAP — ỨNG DỤNG QUẢN LÝ TÀI CHÍNH
### Nền tảng: Kho chứa – Dòng chảy – Nghĩa vụ

Đối tượng sử dụng: cá nhân và hộ kinh doanh cá thể, với dòng tiền cá nhân và kinh doanh hòa trộn, có vay mượn/quay vòng vốn qua nhiều nơi.

---

## Nguyên lý nền tảng

Hệ thống không chia theo các "module chức năng" tách rời (thu chi, nợ, vốn, thuế...) vì thực tế dòng tiền không tách bạch cá nhân/kinh doanh. Toàn bộ hệ thống dựng trên 3 khối nguyên thủy:

- **Kho chứa (Pool)** — điểm chứa tiền: ví cá nhân, quỹ kinh doanh, tài khoản ngân hàng, dự án phụ, quỹ dự phòng thuế... Không giới hạn số lượng, không ép phân loại cá nhân/kinh doanh.
- **Dòng chảy (Flow)** — mỗi giao dịch là một mũi tên nối hai Kho chứa (hoặc nối ra/vào ngoài hệ thống). Gắn nhãn tự do chỉ để báo cáo, không ràng buộc logic cứng.
- **Nghĩa vụ (Obligation)** — Nợ và Thuế. Nợ có 2 chiều: **Nợ phải trả** (mình nợ người khác) và **Nợ phải thu** (người khác nợ mình) — hai chiều này tác động **ngược nhau** lên tài sản ròng.

### Công thức tài sản ròng (nguyên tắc xuyên suốt toàn hệ thống)

```
Tài sản ròng = Tổng số dư các Kho chứa
              + Tổng Nợ phải thu (cộng vào — người khác nợ mình)
              − Tổng Nợ phải trả (trừ ra — mình nợ người khác)
```

Lãi vay/lãi cho vay **không** làm thay đổi số nợ gốc — chỉ là Dòng chảy chi phí/thu nhập độc lập, làm tài sản ròng thay đổi thật (giảm nếu trả lãi, tăng nếu nhận lãi).

---

## SƠ ĐỒ TRANG

```
TRANG CHỦ (Tổng quan)
│
├── Tổng số dư tất cả Kho chứa
├── Tài sản ròng (Số dư Kho chứa + Nợ phải thu − Nợ phải trả)
├── Cảnh báo ưu tiên (sắp âm quỹ / nợ đến hạn / quỹ thuế hụt / biên lợi nhuận co hẹp)
├── Chỉ số "Độ liên tục ghi chép" theo từng Kho chứa (đèn tín hiệu xanh/vàng/đỏ)
├── Biểu đồ dòng tiền 30 ngày gần nhất/sắp tới
└── Nút "Ghi nhanh" nổi — truy cập Mục 2 từ mọi màn hình

├── 1. KHO CHỨA — ĐIỂM CHỨA TIỀN (/vaults)
│   ├── 1.1. Danh sách Kho chứa
│   ├── 1.2. Chi tiết một Kho chứa (số dư, lịch sử biến động, Dòng chảy liên quan, Nghĩa vụ liên quan)
│   ├── 1.3. Tạo/Sửa/Đóng Kho chứa
│   └── 1.4. Cấu hình Kho chứa đặc biệt (khóa một phần — dùng cho quỹ dự phòng thuế)
│
├── 2. DÒNG CHẢY — SỔ GHI CHUYỂN ĐỘNG TIỀN (/flows)
│   ├── 2.1. Ghi dòng chảy mới (Kho chứa nguồn → đích, hoặc ra/vào ngoài hệ thống)
│   ├── 2.2. Sổ ghi tổng (lọc theo Kho chứa / nhãn / thời gian / trạng thái Dự kiến-Thực tế)
│   ├── 2.3. Truy vết vòng xoay vốn (xem một luồng tiền đi qua bao nhiêu Kho chứa, quay vòng thế nào)
│   ├── 2.4. Đối chiếu Dự kiến ↔ Thực tế (khớp lệnh, cảnh báo lệch)
│   ├── 2.5. Danh mục/Nhãn dòng chảy (tự tạo, không giới hạn cá nhân/kinh doanh)
│   └── 2.6. Đối chiếu số dư thực tế (/reconciliation)
│         ├── Nhập số dư thật theo từng Kho chứa (đếm tiền mặt/xem số dư ngân hàng)
│         ├── So sánh với số dư hệ thống đang tính → hiện chênh lệch (thừa/thiếu)
│         ├── Xử lý chênh lệch: gán thành Dòng chảy cụ thể (nếu nhớ ra), hoặc ghi "Điều chỉnh chưa rõ nguyên nhân"
│         └── Danh sách "Điều chỉnh chưa rõ nguyên nhân" theo thời gian — dùng làm chỉ số cảnh báo kỷ luật ghi chép
│
├── 3. NGHĨA VỤ (Nợ & Thuế) (/obligations)
│   ├── 3.1. Nợ
│   │     ├── Danh sách khoản nợ — bắt buộc gắn rõ vai trò: Chủ nợ (phải thu) hay Con nợ (phải trả)
│   │     ├── Chi tiết một khoản nợ (loại lãi, chu kỳ, lịch trả/lịch thu, dư nợ gốc còn lại)
│   │     ├── Tạo loại nợ tùy chỉnh (định nghĩa công thức lãi/chu kỳ riêng: cố định/giảm dần/theo ngày/không lãi/tự do)
│   │     └── Lịch nhắc đến hạn (trả hoặc thu)
│   ├── 3.2. Thuế
│   │     ├── Cấu hình loại thuế áp dụng + tỷ lệ trích quỹ dự phòng
│   │     ├── Bảng tính thuế theo kỳ (dựa trên Dòng chảy doanh thu đã chốt số)
│   │     ├── Trạng thái quỹ dự phòng thuế (đủ/thiếu so với dự tính)
│   │     └── Lịch nộp thuế
│   └── 3.3. Tổng hợp nghĩa vụ (bảng cân đối: tổng phải thu – phải trả – phải nộp thuế)
│
├── 4. VỐN, ĐỊNH GIÁ & ĐIỂM HÒA VỐN (/pricing)
│   ├── 4.1. Tổng vốn theo từng Kho chứa (vốn góp, vốn vay, vốn bổ sung)
│   ├── 4.2. Phân loại chi phí cố định/biến đổi
│   ├── 4.3. Định giá sản phẩm
│   ├── 4.4. Điểm hòa vốn vận hành
│   └── 4.5. Điểm hòa vốn đầu tư
│
├── 5. DỰ BÁO DÒNG TIỀN (/forecast)
│   ├── 5.1. Biểu đồ số dư dự kiến từng Kho chứa theo ngày/tuần/tháng tới
│   ├── 5.2. Kịch bản giả lập (hoãn khoản chi / đẩy nhanh khoản thu / đổi giá bán...)
│   └── 5.3. Cảnh báo điểm âm quỹ (báo sớm bao nhiêu ngày trước khi xảy ra)
│
├── 6. BÁO CÁO & PHÂN TÍCH (/reports)
│   ├── 6.1. Thu/chi theo thời gian (ngày/tuần/tháng/quý)
│   ├── 6.2. Doanh thu theo sản phẩm/kênh bán/khách hàng
│   ├── 6.3. So sánh Dự kiến với Thực tế
│   └── 6.4. Xuất báo cáo (PDF/Excel)
│
└── 7. CÀI ĐẶT (/settings)
    ├── 7.1. Quản lý danh mục/nhãn
    ├── 7.2. Cấu hình loại nợ tùy chỉnh
    ├── 7.3. Cấu hình thuế
    ├── 7.4. Ngưỡng cảnh báo
    ├── 7.5. Người dùng/Bảo mật
    └── 7.6. Thông báo nhắc nhở
