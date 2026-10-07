# Sổ Nhà - Ứng Dụng Quản Lý Tài Chính Gia Đình (Offline-First)

Ứng dụng web tiến bộ (Progressive Web App - PWA) quản lý chi tiêu, thu nhập, ngân sách và mục tiêu tiết kiệm dành cho gia đình Việt (2–10 thành viên).

Ứng dụng hoạt động theo triết lý **Offline-First**, siêu tốc trên điện thoại di động, tối ưu chi phí duy trì **100% miễn phí vĩnh viễn trên gói Firebase Spark (No-cost)** mà không bao giờ cần nâng cấp Blaze.

---

## 🌟 Tính Năng Nổi Bật

1. **Ghi chép siêu tốc (5–10 giây)**:
   - Giao diện Bottom Sheet mở nhanh với bàn phím số lớn.
   - Gợi ý nhanh các khoản tiền phổ biến (+50k, +100k, +200k, +500k, +1tr).
   - Tự động điền ngày hiện tại và ghi chú nhanh.
2. **Dashboard trực quan**:
   - Nắm bắt ngay: Tháng này kiếm bao nhiêu, đã tiêu bao nhiêu, còn lại bao nhiêu.
   - Cảnh báo trạng thái ngân sách tháng (Bình thường / Chú ý / Vượt hạn mức).
   - Phân tích thông minh: Danh mục chiếm tỷ lệ cao nhất, so sánh với tháng trước, mức chi tiêu trung bình 7 ngày qua.
3. **Offline-First & Tự Động Đồng Bộ**:
   - Sử dụng Firestore Persistent Local Cache (`persistentLocalCache` + `persistentMultipleTabManager`).
   - Mất mạng vẫn xem, thêm, sửa, xóa giao dịch bình thường.
   - Khi có Internet trở lại, Firebase tự động đồng bộ lên mây không xung đột.
   - Hiển thị trạng thái rõ ràng: *Online, Offline, Đang đồng bộ, Đã đồng bộ*.
4. **Cài đặt như Native App (PWA)**:
   - Cài đặt trực tiếp trên Android, iPhone, Windows, macOS từ trình duyệt.
   - Hỗ trợ đầy đủ Web App Manifest, Service Worker precache tĩnh, icon chuẩn đa kích thước và icon maskable an toàn.
   - Hướng dẫn cài đặt riêng cho iOS Safari qua menu Chia sẻ.
5. **Chia sẻ gia đình an toàn**:
   - Phân quyền rõ ràng: Chủ nhà (*Owner*), Thành viên (*Member*), Người xem (*Viewer*).
   - Mời thành viên bằng mã token an toàn sinh từ `crypto.getRandomValues()`, xác thực qua email chính xác tại Firestore Security Rules.
6. **Báo cáo & Phân tích trực quan**:
   - Biểu đồ Donut tỷ lệ chi tiêu từng danh mục.
   - Biểu đồ Bar tổng thu vs tổng chi.
   - Biểu đồ Line xu hướng chi tiêu từng ngày trong tháng.
   - So sánh trực tiếp tháng hiện tại vs tháng trước.
7. **Khoản chi định kỳ & Mục tiêu tiết kiệm**:
   - Quản lý tiền điện, nước, internet, học phí định kỳ; app nhắc nhở khi đến ngày và người dùng bấm xác nhận để ghi nhận (không tạo ngầm tránh trùng lặp).
   - Theo dõi tiến độ tích lũy quỹ khẩn cấp, mua sắm lớn, du lịch.
8. **Sao lưu & Xuất dữ liệu bảo mật**:
   - Xuất dữ liệu giao dịch ra tệp Excel/CSV UTF-8.
   - Xuất/Nhập bản sao lưu JSON toàn bộ gia đình trực tiếp từ trình duyệt, không cần Cloud Storage đắt đỏ.

---

## 🛠 Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons
- **Biểu đồ**: Recharts
- **PWA**: `vite-plugin-pwa`, Workbox
- **Backend & Cơ sở dữ liệu**: Firebase Authentication, Cloud Firestore (Native Modular SDK v11)
- **Hosting**: Firebase Hosting tĩnh truyền thống
- **Chi phí**: **0đ** (Firebase Spark Free Tier, không yêu cầu thẻ tín dụng, không Cloud Functions, không App Hosting).

---

## 🚀 Hướng Dẫn Cài Đặt & Triển Khai (Deployment)

### 1. Cài đặt mã nguồn trên máy cục bộ
```bash
git clone <repository_url>
cd son-nha
npm install
```

### 2. Thiết lập dự án Firebase (Miễn phí)
1. Truy cập [Firebase Console](https://console.firebase.google.com/) và bấm **Add project** (Tạo dự án mới).
2. Đặt tên dự án (ví dụ: `so-nha-family`), tắt Google Analytics nếu muốn tối giản, bấm **Create project**.
3. **Bật Authentication**:
   - Vào menu **Build** > **Authentication** > Bấm **Get started**.
   - Tại tab **Sign-in method**, bật nhà cung cấp:
     - **Google** (bật và chọn email hỗ trợ).
     - **Email/Password** (bật tùy chọn Email/Password đầu tiên).
4. **Tạo Cloud Firestore Database**:
   - Vào menu **Build** > **Firestore Database** > Bấm **Create database**.
   - Chọn database edition: **Standard**.
   - Chọn vị trí lưu trữ gần Việt Nam (khuyên dùng: `asia-southeast1` tại Singapore hoặc `asia-east2` tại Hong Kong).
   - Chọn chế độ ban đầu: **Production mode** (sau đó ta sẽ cập nhật `firestore.rules`).
5. **Đăng ký Web App**:
   - Tại màn hình Project Overview, bấm vào biểu tượng Web `</>` để thêm web app.
   - Đặt nickname (ví dụ: `Son Nha Web`). Bấm **Register app**.
   - Copy các giá trị trong biến `firebaseConfig`.

### 3. Cấu hình biến môi trường
Tạo file `.env.local` ở thư mục gốc của dự án:
```env
VITE_FIREBASE_API_KEY="AIzaSy..."
VITE_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="your-project-id"
VITE_FIREBASE_STORAGE_BUCKET="your-project.firebasestorage.app"
VITE_FIREBASE_MESSAGING_SENDER_ID="1234567890"
VITE_FIREBASE_APP_ID="1:123456:web:abcdef"
VITE_FIREBASE_DATABASE_ID="(default)"
```

### 4. Triển khai Firestore Security Rules & Indexes
Cài đặt Firebase CLI (nếu chưa có):
```bash
npm install -g firebase-tools
firebase login
firebase use --add your-project-id
```

Triển khai quy tắc bảo mật và chỉ mục Firestore:
```bash
firebase deploy --only firestore:rules,firestore:indexes
```

### 5. Build và Triển khai lên Firebase Hosting
```bash
npm run build
firebase deploy --only hosting
```
Sau khi hoàn tất, Firebase CLI sẽ cung cấp đường link truy cập công khai dạng:
`https://your-project.web.app`

---

## 🔒 Quy Tắc Bảo Mật (Firestore Security Rules)

- Không cho phép truy cập nặc danh trái phép (`read, write: if false;` mặc định).
- Người dùng chỉ được đọc và sửa hồ sơ cá nhân của chính mình (`/users/{uid}`).
- Chỉ các thành viên thuộc gia đình (`isHouseholdMember`) mới được đọc dữ liệu thu chi.
- Quyền Người xem (`viewer`) chỉ có quyền xem, bị chặn mọi thao tác thêm/sửa/xóa giao dịch.
- Chủ gia đình (`owner`) có độc quyền sửa thiết lập gia đình và tạo mã mời.
- Mã mời (`invites`) được ràng buộc chặt chẽ với email của người nhận.

---

## 💡 Lưu Ý Tối Ưu Chi Phí (Spark Free Tier)

Hạn mức miễn phí hàng ngày của Cloud Firestore Spark:
- **50.000 lượt đọc (reads) / ngày**
- **20.000 lượt ghi (writes) / ngày**
- **1 GiB lưu trữ**

Ứng dụng Sổ Nhà được kiến trúc đặc biệt để giảm thiểu lượt read:
- Sử dụng **IndexedDB Persistent Local Cache** trên thiết bị; dữ liệu đã load không cần refetch lại từ máy chủ.
- Dashboard chỉ truy vấn các giao dịch trong tháng đang xem (`where date >= 'YYYY-MM-01'`).
- Mọi phép tính tổng, thống kê danh mục, tỷ lệ phần trăm đều thực hiện trên máy khách (Client-side TypeScript).
- Một gia đình 5 người ghi chép hàng ngày thường chỉ tiêu tốn dưới 200 reads/ngày (<0.5% hạn mức miễn phí).
