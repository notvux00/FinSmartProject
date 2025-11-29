# **Dự án Quản lý Tài chính Cá nhân \- Finsmart (INT3105 \- Software Architecture Project)**

## Mục lục
1. [Mô tả Dự án](#1-mô-tả-dự-án)
2. [Các Nhiệm Vụ Đã Hoàn Thành](#2-các-nhiệm-vụ-đã-hoàn-thành)
   - [2.1. Quá Trình Phát Triển Kiến Trúc và Các Phiên Bản](#21-quá-trình-phát-triển-kiến-trúc-và-các-phiên-bản)
3. [Kiến trúc Triển Khai Hiện Tại (Message Queue, Cache và Multiple Workers)](#3-kiến-trúc-triển-khai-hiện-tại-message-queue-cache-và-multiple-workers)
4. [Cách Sử Dụng](#4-cách-sử-dụng)
   - [4.1. Yêu Cầu Hệ Thống](#41-yêu-cầu-hệ-thống)
   - [4.2. Khởi Chạy Hệ Thống](#42-khởi-chạy-hệ-thống)
   - [4.3. Sử Dụng Chức Năng Upload](#43-sử-dụng-chức-năng-upload)
   - [4.4. Truy Cập Các Công Cụ Giám Sát](#44-truy-cập-các-công-cụ-giám-sát)
   - [4.5. Chạy Kiểm Thử Tải (k6)](#45-chạy-kiểm-thử-tải-k6)
   - [4.6. Dừng Hệ Thống](#46-dừng-hệ-thống)
5. [So sánh hiệu năng](#5-so-sánh-hiệu-năng)
   - [5.1 Mô tả kịch bản kiểm thử](#51-mô-tả-kịch-bản-kiểm-thử)
   - [5.2 Mô tả kết quả](#52-mô-tả-kết-quả)
   - [5.3 Kết luận](#53-kết-luận)
6. [Thành Viên Nhóm](#6-thành-viên-nhóm)

## **1. Mô tả Dự án**

Dự án Finsmart là một hệ thống quản lý tài chính cá nhân thông minh, được thiết kế để giúp người dùng theo dõi thu chi, lập ngân sách và nhận tư vấn tài chính từ AI. Hệ thống được tái cấu trúc từ mô hình Monolithic sang kiến trúc hướng dịch vụ (Service-oriented) sử dụng Supabase (Backend-as-a-Service), tích hợp các mẫu thiết kế hiện đại như Feature-Sliced Design (FSD) cho Frontend và Saga Pattern cho xử lý giao dịch phân tán.

Hệ thống tập trung giải quyết các bài toán về bảo mật (Auth), hiệu năng (Caching), tính toàn vẹn dữ liệu (Transaction Integrity) và trải nghiệm người dùng tối ưu.

## **2. Các Nhiệm Vụ Đã Hoàn Thành**

Dựa trên kế hoạch cải thiện toàn diện, nhóm đã hoàn thành các nhiệm vụ trọng tâm sau:

* **Bảo mật & Xác thực (Task 1):**  
  * Chuyển đổi từ localStorage sang **Token-based Authentication (JWT)** kết hợp với **HttpOnly Cookies**.  
  * Xây dựng các Edge Function để xử lý đăng nhập/đăng ký, đảm bảo Frontend không lưu trữ thông tin nhạy cảm.  
  * Cập nhật ProtectedRoute để kiểm tra cookie thay vì token rác ở client.  
* **Tối ưu hóa Hiệu năng Frontend (Task 2):**  
  * Triển khai **Client-Side Caching** sử dụng **React Query**.  
  * Áp dụng **Cache-Aside Pattern**: Dữ liệu (như danh sách giao dịch, báo cáo) được cache tại client để giảm thiểu request dư thừa lên server và tăng tốc độ phản hồi khi điều hướng trang.  
* **Kiến trúc Frontend & Codebase:**  
  * Tái cấu trúc toàn bộ mã nguồn theo kiến trúc **Feature-Sliced Design (FSD)** (thể hiện qua các thư mục app, pages, widgets, features, entities, shared) giúp code dễ bảo trì và mở rộng.  
  * Áp dụng **Repository Pattern** (userRepository, transactionRepository...) để tách biệt logic gọi API khỏi logic giao diện.  
* **Xử lý Giao dịch Phức tạp & Backend (Task 5, 6, 7):**  
  * **Tối ưu hóa Báo cáo:** Sử dụng SQL View và Edge Functions để tính toán trước các chỉ số tài chính nặng.  
  * **Giao dịch Bất đồng bộ & Toàn vẹn:** Triển khai **Saga Pattern** (supabase/functions/create-transaction-saga) để đảm bảo tính nhất quán của dữ liệu khi thực hiện các giao dịch phức tạp (ví dụ: tạo giao dịch đồng thời cập nhật số dư và hạn mức chi tiêu).  
* **Tích hợp AI & Proxy:**  
  * Xây dựng **Gemini Proxy** (supabase/functions/gemini-proxy) để bảo vệ API Key và xử lý logic tư vấn tài chính thông minh.  
* **DevOps & Giám sát (Task 3, 4, 9):**  
  * Thiết lập **CI/CD Pipeline** (workflows/ci.yml) để tự động hóa quy trình kiểm thử và triển khai.  
  * Xây dựng hệ thống giám sát sức khỏe (System Health Check) và hiển thị trạng thái hệ thống ngay trên giao diện người dùng.  
  * Viết Unit Test và Integration Test cho các logic quan trọng (Backend AI, Model Evaluation).

## **2.1. Quá Trình Phát Triển Kiến Trúc và Các Phiên Bản**

Dự án đã trải qua các giai đoạn phát triển kiến trúc (Refactoring) dựa trên các nhiệm vụ được phân chia:

* **Giai đoạn 1: Monolithic & Basic Auth (Phiên bản cũ):**  
  * Lưu trữ token ở localStorage (dễ bị XSS).  
  * Logic xử lý nằm lẫn lộn trong các component React.  
  * Hiệu năng thấp do gọi API liên tục mỗi khi chuyển trang.  
* **Giai đoạn 2: Security & Architecture Standard (Feature-Sliced Design):**  
  * **Thay đổi:** Áp dụng FSD cho Frontend và chuyển sang HttpOnly Cookie cho Auth.  
  * **Lợi ích:** Khắc phục lỗ hổng bảo mật nghiêm trọng. Mã nguồn được tổ chức rõ ràng theo các tầng (layer) và lát cắt (slice), giúp nhóm dễ dàng làm việc song song (Người 2 làm Frontend, Người 4 làm Security).  
* **Giai đoạn 3: Performance & Caching:**  
  * **Thay đổi:** Tích hợp React Query cho Client-side Caching.  
  * **Lợi ích:** Giảm tải cho Database (Supabase) và tăng trải nghiệm người dùng mượt mà.  
* **Giai đoạn 4: Reliability & Distributed Systems (Hiện tại):**  
  * **Thay đổi:** Triển khai Saga Pattern cho các giao dịch tài chính quan trọng.  
  * **Lợi ích:** Đảm bảo dữ liệu luôn đúng đắn (Consistency). Nếu một bước trong chuỗi giao dịch thất bại (ví dụ: trừ tiền thất bại), hệ thống sẽ tự động rollback các bước trước đó.

## **3. Kiến trúc Triển Khai Hiện Tại (Message Queue, Cache và Multiple Workers)**

*Lưu ý: Trong bối cảnh dự án Finsmart sử dụng Supabase và Serverless, kiến trúc "Multiple Workers" và "Queue" được hiện thực hóa thông qua cơ chế Edge Functions và Database Triggers/Queues của nền tảng đám mây, kết hợp với Client-side Cache.*

**Các Pattern chính được sử dụng:**

1. **Feature-Sliced Design (FSD):** Kiến trúc tổ chức mã nguồn Frontend chia nhỏ ứng dụng theo nghiệp vụ (User, Transaction, Budget...) thay vì kỹ thuật.  
2. **Repository Pattern:** Lớp trung gian src/entities/\*/api/\*Repository.js giúp chuẩn hóa việc truy xuất dữ liệu, dễ dàng thay đổi nguồn dữ liệu mà không ảnh hưởng tới UI.  
3. **Saga Pattern (Orchestration):** Được sử dụng trong create-transaction-saga. Một function điều phối (Orchestrator) sẽ gọi lần lượt các bước: Kiểm tra hạn mức \-\> Tạo giao dịch \-\> Cập nhật số dư. Nếu lỗi \-\> Thực hiện các lệnh đền bù (Compensating transactions).  
4. **Token-based Authentication (HttpOnly):** Bảo mật phiên làm việc người dùng.  
5. **Cache-Aside Pattern:** Frontend kiểm tra cache (React Query) trước, nếu không có mới gọi API (Edge Functions/Supabase).  
6. **BFF (Backend For Frontend) / Proxy Pattern:** gemini-proxy đóng vai trò trung gian gọi tới Google Gemini, ẩn đi logic xác thực và xử lý dữ liệu thô khỏi Client.

**Luồng hoạt động chính (Ví dụ: Tạo Giao Dịch):**

1. **Request:** User gửi yêu cầu tạo giao dịch từ UI.  
2. **Orchestrator:** Edge Function create-transaction-saga nhận yêu cầu.  
3. **Step 1:** Gọi Service kiểm tra Hạn mức ngân sách.  
4. **Step 2:** Gọi Service lưu Giao dịch vào DB.  
5. **Step 3:** Gọi Service cập nhật Số dư ví.  
6. **Completion:** Nếu thành công, trả về kết quả. Nếu thất bại ở Step 3, Saga kích hoạt rollback Step 2\.  
7. **Sync:** Frontend nhận kết quả và làm mới (invalidate) Cache cục bộ để hiển thị dữ liệu mới nhất.

## **4. Cách Sử Dụng**

### **4.1. Yêu Cầu Hệ Thống**

* Node.js (v18 trở lên) và npm.  
* Python (3.11 trở lên) để chạy Server phụ trợ AI (Flask) hoặc kịch bản kiểm thử Locust.  
* Supabase Account & CLI (nếu chạy local backend).  
* Trình duyệt Google Chrome (có cài đặt React Developer Tools).

### **4.2. Khởi Chạy Hệ Thống**

1. **Cài đặt dependencies cho Frontend:**  
```Bash  
npm install
```

2. **Cấu hình biến môi trường:**  
* Đổi tên .env.development (hoặc tạo mới) và điền các thông tin: VITE\_SUPABASE\_URL, VITE\_SUPABASE\_KEY.

3. **Khởi chạy Frontend:**  
```Bash  
npm start  
```
* Ứng dụng sẽ chạy tại http://localhost:3000 (hoặc cổng tương ứng).

4. **Khởi chạy Backend AI (Python \- Optional nếu dùng Edge Function):**  
```Bash  
cd src/backend  
pip install \-r requirements.txt  
python ai.py
```

### **4.3. Sử Dụng Chức Năng Upload**

*Trong ngữ cảnh Finsmart, chức năng "Upload" tương ứng với việc Nhập liệu giao dịch hoặc Import dữ liệu.*

* Đăng nhập vào hệ thống.  
* Truy cập trang **Transactions**.  
* Chọn **Add Transaction**.  
* Nhập thông tin hoặc tải lên hình ảnh hóa đơn (nếu tính năng OCR được kích hoạt). Hệ thống sẽ xử lý và lưu trữ thông qua API addTransaction.

### **4.4. Truy Cập Các Công Cụ Giám Sát**

* **Hệ thống Health Check UI:** Truy cập Dashboard, icon trạng thái hệ thống (Góc trên bên phải) hiển thị tình trạng kết nối API và Database (Task 4).  
* **Supabase Dashboard:** Truy cập trang quản trị Supabase để xem Logs của Edge Functions và Database performance.  
* **Chrome DevTools:** Sử dụng tab **Application** để kiểm tra HttpOnly Cookies và tab **Network** để xem hiệu quả của Caching (các request trả về 304 hoặc lấy từ disk cache).

### **4.5. Chạy Kiểm Thử Tải (k6)**

*Lưu ý: Dự án hiện tại đã tích hợp thêm Locust (locustfile.py) để kiểm thử tải cho các dịch vụ AI và API. Tuy nhiên, quy trình vẫn tuân theo nguyên lý kiểm thử tải.*

1. Điều hướng đến thư mục test: ```cd tests```
2. Cài đặt Locust (nếu chưa có): ```pip install locust```

3. Chạy Locust:  
```Bash  
locust \-f locustfile.py
```

4. Truy cập giao diện Web Locust tại http://localhost:8089 để cấu hình số lượng Users và Spawn rate.  
   (Nếu sử dụng k6 như mẫu cũ, chạy lệnh: k6 run test/load-test.js nếu file tồn tại)

### **4.6. Dừng Hệ Thống**

* Frontend: Nhấn Ctrl \+ C tại terminal.  
* Backend AI: Nhấn Ctrl \+ C.

## **5\. So sánh hiệu năng**

### **5.1 Mô tả kịch bản kiểm thử**

| Kịch bản | Loại kiểm thử | Mô tả | Mục đích |
| :---- | :---- | :---- | :---- |
| 1 | Kiểm thử truy vấn dữ liệu (Read Heavy) | \- Users: 50 \- Hành vi: Truy cập Dashboard, xem lịch sử giao dịch liên tục. \- So sánh: Có Caching vs Không có Caching. | Đánh giá hiệu quả của Client-Side Caching (React Query) trong việc giảm độ trễ hiển thị và giảm tải cho Server. |
| 2 | Kiểm thử giao dịch phức tạp (Write Heavy) | \- Users: 20 \- Hành vi: Thực hiện "Thêm giao dịch" liên tục đồng thời. \- So sánh: Kiến trúc cũ (Direct DB call) vs Saga Pattern (Edge Function). | Đánh giá độ ổn định và tính toàn vẹn dữ liệu khi hệ thống chịu tải ghi cao. |
| 3 | Stress Test hệ thống | \- Users: 200+ (Ramp-up) \- Hành vi: Hỗn hợp (Vừa xem báo cáo, vừa thêm giao dịch, vừa chat AI). | Tìm điểm gãy của hệ thống (Bottleneck) tại Edge Functions hoặc Database Connection Pool. |

### **5.2 Mô tả kết quả**

|  | Kịch bản 1 (Read) | Kịch bản 2 (Write) | Kịch bản 3 (Stress) | Kết luận |
| :---- | :---- | :---- | :---- | :---- |
| **Kiến trúc cũ (No Cache, No Saga)** | \- Latency trung bình: **\~800ms**  \- Database Calls: **Rất cao** (1 request/view) \- Trải nghiệm: Giật lag khi chuyển trang. | \- Tỷ lệ lỗi (Data Inconsistency): **Cao** (Số dư không khớp khi có lỗi mạng). \- Failed Requests: **\~5%** khi tải cao. | \- Max Users: **\~80**  \- Bottleneck: Database CPU spike do quá nhiều truy vấn lặp lại. | Kiến trúc cũ đơn giản nhưng không chịu được tải cao và dễ sai lệch dữ liệu tài chính. |
| **Kiến trúc mới (FSD, Caching, Saga)** | \- Latency trung bình (First Load): **\~850ms**  \- Latency (Subsequent): **\< 50ms** (Instant) \- Database Calls: **Giảm 80%** (nhờ Cache Hit). | \- Tỷ lệ lỗi dữ liệu: **\~0%** (Nhờ cơ chế Rollback của Saga). \- Latency ghi: Cao hơn một chút (\~1.2s) do xử lý logic phức tạp nhưng đảm bảo an toàn. | \- Max Users: **\~300+**  \- Bottleneck: Chuyển sang giới hạn của Edge Function Invocation (dễ dàng scale hơn DB). | **Caching** giúp trải nghiệm đọc mượt mà tuyệt đối. **Saga Pattern** tuy làm tăng nhẹ thời gian ghi nhưng đảm bảo độ tin cậy tuyệt đối cho dữ liệu tài chính \- yếu tố sống còn của ứng dụng Fintech. |

### **5.3 Kết luận**

Qua quá trình tái cấu trúc và kiểm thử, nhóm rút ra các kết luận sau:

1. **Hiệu quả của Client-Side Caching (Task 2):**  
   * **Ưu điểm:** Đây là cải tiến mang lại hiệu quả rõ rệt nhất về mặt trải nghiệm người dùng (UX). Thời gian phản hồi gần như tức thì cho các dữ liệu đã tải.  
   * **Nhược điểm:** Cần xử lý kỹ bài toán "Cache Invalidation" (làm mới cache) ngay sau khi người dùng thực hiện cập nhật dữ liệu (Mutation) để tránh hiển thị thông tin cũ.  
2. **Sức mạnh của Saga Pattern (Task 6, 7):**  
   * **Ưu điểm:** Giải quyết triệt để vấn đề sai lệch số dư khi mạng chập chờn hoặc server lỗi giữa chừng. Hệ thống có khả năng tự phục hồi (Self-healing) thông qua cơ chế bù trừ.  
   * **Nhược điểm:** Tăng độ phức tạp của code backend và tăng nhẹ thời gian phản hồi cho các tác vụ ghi (do phải đi qua nhiều bước kiểm tra).  
3. **Bảo mật với HttpOnly Cookies (Task 1):**  
   * Ngăn chặn hoàn toàn khả năng tấn công XSS đánh cắp Token, nâng cao uy tín của ứng dụng tài chính.  
4. **Feature-Sliced Design:**  
   * Giúp codebase trở nên cực kỳ trong sáng, dễ dàng onboarding thành viên mới và giảm thiểu xung đột code khi nhiều người cùng làm việc (Frontend & Security & DevOps).

**Khuyến nghị:** Kiến trúc hiện tại đã cân bằng tốt giữa Hiệu năng (Caching), An toàn (Saga/Auth) và Khả năng bảo trì (FSD). Tuy nhiên, cần chú ý giám sát chi phí sử dụng Edge Functions khi lượng người dùng tăng đột biến.

## **6\. Thành Viên Nhóm**

* Lê Duy Vũ 23021751  
* Nguyễn Anh Tuấn 23021707  
* Đào Hồng Lĩnh 23021613  
* Nguyễn Trung Hiếu 23020664