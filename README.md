#  Finsmart — Personal Finance Management System

> **Bài tập lớn môn Kiến trúc phần mềm – INT3105 2**  
> **Đề tài:** Cải tiến hệ thống quản lý tài chính cá nhân.
---

## 👥 Nhóm 18
- **Nguyễn Trung Hiếu - 23020664**
- **Đào Hồng Lĩnh - 23021613**
- **Nguyễn Anh Tuấn - 23021707**
- **Lê Duy Vũ - 23021751**

---

## 📌 Bản gốc
- GitHub Repository: https://github.com/natuan05/FinSmartProject-FSD

---

## 🧩 Chức năng chính của bản gốc

Hệ thống Finsmart bao gồm:
- Ghi và tra cứu lịch sử thu chi.
- Thêm hạn mức chi tiêu.
- Thêm và quản lý các giao dịch định kì.
- Thống kê chi tiêu cá nhân bằng biểu đồ.
- Thiết lập các danh mục tiết kiệm.

---

# 🚀 Các cải tiến & tính năng mới

## **1. Nguyễn Trung Hiếu**

---

# A. Testing & CI/CD cho FinSmart

### **1. Vấn đề (Problem)**
- **Thiếu kiểm thử tự động:** Trước khi cải tiến, hệ thống gần như không có test tự động. Khi sửa code frontend, các bạn phải tự mở app, click từng màn hình (Login, Giao dịch, Định kỳ, Tiết kiệm, …) để kiểm tra → dễ sót lỗi, khó lặp lại.
- **CI/CD chưa kiểm soát được chất lượng thay đổi:** Nếu một commit làm hỏng luồng nghiệp vụ quan trọng (ví dụ tạo giao dịch, thống kê, tiết kiệm), lỗi chỉ được phát hiện khi chạy demo hoặc khi người dùng phàn nàn.
- **Phụ thuộc vào Supabase thật khi test:** Các luồng đăng ký/đăng nhập, tạo giao dịch, gọi Edge Functions… đang phụ thuộc trực tiếp vào Supabase. Nếu mạng chậm, Supabase lỗi tạm thời, hoặc dữ liệu bị thay đổi → test tay dễ cho kết quả không ổn định, khó tái hiện.

### **2. Giải pháp (Solution)**
- **Bổ sung lớp kiểm thử End-to-End bằng Cypress:** Xây dựng các kịch bản E2E mô phỏng luồng người dùng thật:
  - Đăng ký & đăng nhập (Authentication).
  - Tạo giao dịch và xem thống kê (Transaction & Statistic).
  - Quản lý giao dịch định kỳ (Preodic).
  - Quản lý mục tiêu tiết kiệm (Economical).
- **Tích hợp kiểm thử vào CI pipeline trên GitHub Actions:** Mỗi lần push/pull request, pipeline sẽ tự động:
  - Cài đặt Node + dependency.
  - Build ứng dụng React.
  - Chạy npm run test:ci.
  - Chạy toàn bộ test E2E bằng Cypress (npm run e2e): Nếu bất kỳ bước nào fail → job dừng, commit bị đánh dấu đỏ, giúp phát hiện lỗi sớm.
- **Mock các API Supabase trong E2E test:** 
  - Sử dụng ```cy.intercept()``` để giả lập response từ Edge Functions và REST API của Supabase.
  - Giúp test chạy ổn định, không phụ thuộc mạng hay trạng thái database thật; đồng thời dễ tạo các kịch bản dữ liệu “đẹp” để demo.

### **3. Kết quả (Result)**
- **Kết quả chạy cục bộ:** 
  - ```npm run test:ci``` hiện chưa có file Jest test nên log “No tests found, exiting with code 0”, tuy nhiên exit code = 0 nên được coi là thành công.
  - **Đây sẽ là chỗ cho hình ảnh**
  - ```npm run e2e``` chạy 4 spec (auth, finance-flows, preodic, economical) với tổng 8 test, 8 passed, 0 failed (screenshot đính kèm).
  - **Đây sẽ là chỗ cho hình ảnh**
- **Lợi ích đạt được:**
  - Mỗi lần push code, GitHub Actions tự động build và chạy lại toàn bộ kịch bản E2E cho các luồng quan trọng nhất của FinSmart.
  - Nếu một thay đổi làm hỏng luồng đăng nhập, tạo giao dịch, định kỳ hoặc tiết kiệm, pipeline sẽ fail ngay trên GitHub, giúp nhóm phát hiện và sửa lỗi sớm.
  - Việc sử dụng ```cy.intercept()``` để mock Supabase giúp test ổn định, không bị phụ thuộc vào dữ liệu thật hoặc tình trạng của dịch vụ bên ngoài.

---

## **2. Đào Hồng Lĩnh**

---

# A. API Gateway (API Third Party Proxy)

### **1. Vấn đề (Problem)**
- **Lộ Key bảo mật:** Khi Client (Frontend) gọi trực tiếp đến các dịch vụ thứ 3 (như Database, AI Service, Payment Gateway), chúng ta buộc phải lưu API Key hoặc Token ở phía Client. Hacker có thể dễ dàng mở Network Tab của trình duyệt để lấy trộm các Key này.
- **Thiếu kiểm soát truy cập:** Không thể chặn hoặc lọc các yêu cầu từ Client gửi đi nếu gọi trực tiếp từ Frontend, không kiểm soát được ai đang gọi API, tần suất bao nhiêu, có thể spam gây ảnh hưởng tới hệ thống, cụ thể hơn là tốn token.

### **2. Giải pháp (Solution)**
- Chuyển đổi từ mô hình **Client** → **Third Party** sang mô hình **Client** → **Proxy (Server)** → **Third Party**.
- Xây dựng **API Proxy** sử dụng **Supabase Edge Functions (Deno)**.
- Tất cả các Key nhạy cảm (```SERVICE_KEY```, ```REDIS_TOKEN```, ```GEMINI_API_KEY```) được lưu trữ an toàn trong **biến môi trường** (Environment Variables) tại Server, tuyệt đối không lộ ra Frontend.
- Client chỉ gọi đến Proxy của hệ thống, Proxy sẽ xử lý nốt việc gọi tiếp đến dịch vụ thứ 3, tất cả những biến nhạy cảm đều không để bị lộ.

### **3. Tình huống cụ thể (Example)**
- **Nếu KHÔNG có Proxy:** 
  - Frontend gọi trực tiếp đến Gemini, sử dụng các biến nhạy cảm ở ```.env```. Chúng ta phải nhúng ```SECRET_KEY``` vào code JavaScript ở Frontend.
  - **Hậu quả:** Hacker mở **F12 (DevTools)**, vào tab **Network**, nhìn thấy ngay **Authorization: Bearer sk-12345abcxyz....** Họ copy key này, về nhà viết tool riêng khai thác tài nguyên sử dụng key này, ví dụ như API của gemini, từ đó có thể gây ra thiệt hại và ảnh hưởng tới hệ thống.
- **Khi CÓ Proxy:**
  - Client chỉ gọi POST /api/… về server của mình.
  - **Server (Supabase Edge Function)** giữ ```SECRET_KEY``` trong biến môi trường bí mật. Server tự mình gọi tới, mọi thao tác xử lý sẽ nằm ở Edge Function, nó sẽ tự lấy các biến hoặc tự gọi tới mô hình gemini để lấy dữ liệu.
  - **Kết quả:** Client không bao giờ chạm được vào Key, không thể nào biết key để có thể lợi dụng.

---

# B. Rate Limiting

### **1. Vấn đề (Problem)**
- **Tấn công dò mật khẩu (Brute-Force & Credential Stuffing):** 
  - Kẻ tấn công sử dụng công cụ tự động để thử hàng nghìn tổ hợp mật khẩu khác nhau vào một tài khoản trong thời gian ngắn.
  - **Hậu quả**: Gây quá tải hệ thống xác thực và nguy cơ bị lộ tài khoản người dùng.
- **Cạn kiệt tài nguyên (Resource Exhaustion/Spam):**
  - Bot hoặc Script độc hại thực hiện đăng ký tài khoản hàng loạt.
  - **Hậu quả**: Làm đầy Database với dữ liệu rác, tiêu tốn tài nguyên tính toán (CPU/RAM) cho việc mã hóa mật khẩu (Hashing), và khai thác tính năng đăng ký để kiểm tra sự tồn tại của người dùng (User Enumeration).
- **Lạm dụng từ nội bộ (Authenticated Abuse):** Ngay cả khi đã đăng nhập thành công, một tài khoản bị chiếm quyền (hoặc người dùng xấu) có thể spam request API để tấn công hệ thống từ bên trong (Internal DDoS).
- **Thách thức hạ tầng mạng (NAT Challenge):** Trong thực tế, nhiều người dùng (ví dụ: trường học, quán Cafe) chia sẻ chung một địa chỉ IP Public thông qua cơ chế NAT. Việc chặn IP đơn thuần sẽ dẫn đến chặn nhầm người dùng hợp lệ.

### **2. Giải pháp (Solution)**
- **Chiến lược bảo vệ Đăng nhập (2-Phase Defense):**
  - **Lớp 1 - Global IP Limit:** Giới hạn tổng số request từ 1 IP (Ví dụ: 100 req/5 phút). Mục tiêu: Chống Spam/DDoS diện rộng.
  - **Lớp 2 - Targeted User Limit:** Giới hạn số lần thử sai trên 1 tài khoản cụ thể (Ví dụ: 5 req/3 phút). Mục tiêu: Chống dò mật khẩu (Brute-force) vào mục tiêu cụ thể mà không ảnh hưởng đến người dùng khác cùng IP.
  - 2 lớp này có thể phủ được nhiều trường hợp, bao gồm trường hợp phổ biến nhất là người dùng quên mật khẩu, nhập lại nhiều lần nhưng không ảnh hưởng đến mọi người trong phòng, có thời gian reset hợp lí, đồng thời chống DDOS khi hacker muốn xâm nhập hệ thống.
- **Chiến lược bảo vệ Đăng ký (Write Protection):** Mỗi lần push/pull request, pipeline sẽ tự động:
  - **Global IP Limit:** Giới hạn nghiêm ngặt số lượng tài khoản được tạo từ 1 IP trong khoảng thời gian ngắn. Ngăn chặn việc làm rác Database, không reset khi người dùng đăng ký thành công.
- **Chiến lược bảo vệ sau đăng nhập (Internal Traffic Control):** 
  - Áp dụng giới hạn cho các API nội bộ (như /rl-check) ở mức 50 req/phút cho mỗi User ID. Đảm bảo hacker không thể dùng tài khoản hợp lệ để làm tê liệt hệ thống.

### **3. Phân tích Kỹ thuật**
- **Chính sách "No-Reset on Success":** 
  - **Cơ chế:** Bộ đếm Rate Limit sẽ không được reset về 0 ngay cả khi người dùng đăng nhập hoặc đăng ký thành công.
  - **Lý do bảo mật:** Để chống lại kỹ thuật "Gaming the System". Kẻ tấn công có thể thử 4 lần sai, sau đó thực hiện 1 lần đúng (hoặc login vào tài khoản rác) để reset bộ đếm, rồi lại tiếp tục tấn công. Việc giữ nguyên bộ đếm giúp duy trì áp lực bảo mật liên tục trong khung thời gian (Window).
  - **Trade-off:** Chấp nhận rủi ro nhỏ về trải nghiệm người dùng (UX) để đổi lấy sự an toàn tuyệt đối cho hệ thống.
- **Thuật toán Fixed Window (Cửa sổ cố định)**
  - Hệ thống sử dụng cơ chế đếm trên các key Redis Upstash có TTL.
  - **Ưu điểm:** Fixed Window có hiệu suất cao, là lựa chọn tuyệt vời cho các giới hạn tốc độ cơ bản và các ứng dụng có lưu lượng truy cập lớn cần tiết kiệm tài nguyên, hiệu năng cực cao, độ trễ thấp và chi phí triển khai trên Edge Functions rẻ hơn so với thuật toán Sliding Window Log phức tạp.
  - **Nhược điểm:** Trong khoảng thời gian cực ngắn (chỉ 1 giây, từ 00:59 đến 01:00.1), Server của bạn phải xử lý 10 request thay vì giới hạn 5 request. Nếu có hàng nghìn kẻ tấn công làm điều này đồng thời, toàn bộ hệ thống sẽ bị quá tải (Spike) ngay tại thời điểm chuyển giao cửa sổ (Window boundary), dẫn đến tình trạng treo máy hoặc chậm phản hồi, tức là hacker phải căn được thời điểm hoàn hảo để tấn công, tuy nhiên thực tế sẽ không đơn giản do tính không đồng bộ của mạng và đồng bộ hóa các Botnet trong thời gian tính bằng ms.
- **Kết quả đạt được:**
  - **Chặn đứng tấn công Brute-force & Spam:** Hệ thống tự động trả về lỗi 429 Too Many Requests khi vượt quá giới hạn.
  - **Tối ưu hiệu năng & Giảm tải Database:** Toàn bộ việc kiểm tra diễn ra tại Edge (Redis), request rác bị chặn ngay từ cổng, không làm tốn tài nguyên Database xử lý. Độ trễ cực thấp nhờ thuật toán Fixed Window (độ phức tạp O(1)).
  - **Giải quyết vấn đề NAT (Trải nghiệm người dùng):** Nhờ cơ chế Targeted User Limit, hệ thống chỉ khóa tài khoản đang bị tấn công, không khóa toàn bộ IP. Người dùng khác dùng chung Wifi (như quán Cafe) vẫn truy cập bình thường.
  - **Ngăn chặn lạm dụng nội bộ:** Ngay cả user đã đăng nhập cũng bị giới hạn tần suất gọi API (ví dụ: ```rl-check```), ngăn chặn việc dùng tài khoản hợp lệ để DDoS hệ thống từ bên trong.

---

# C. Retry Pattern

### **1. Vấn đề (Problem)**
- **Khả năng sẵn sàng kém (Poor Availability):** Hệ thống không thể xử lý các lỗi mạng chập chờn, lỗi timeout hoặc lỗi 5xx tạm thời (Transient Failures) mà Server dễ gặp phải trong môi trường Cloud.
  - **Lỗi ở Tầng Ứng dụng (Application Layer):** Các vấn đề về cache dữ liệu, lỗi mount component tạm thời, hoặc lỗi fetching dữ liệu nhanh từ phía Client.
  - **Lỗi ở Tầng Mạng/Dịch vụ (Network/Service Layer):** Các lỗi do dịch vụ Backend hoặc dịch vụ bên thứ ba (Third Party API) bị quá tải, gây ra lỗi 503 (Service Unavailable) hoặc Timeout.
- **Thundering Herd:** Nếu tất cả các Client thử lại cùng một lúc sau một lỗi đồng bộ, chúng sẽ tạo ra một làn sóng (Retry Storm) request khổng lồ, khiến Server đang yếu lại bị quá tải nặng hơn và sập hoàn toàn.

### **2. Giải pháp (Solution)**
 **Thuật toán Exponential Backoff và Jitter được triển khai theo Chiến lược Đa Lớp (Multi-layered Strategy) để tối ưu khả năng phục hồi ở từng tầng kiến trúc:**

 #### **a. Triển khai Lớp 1: Tầng Ứng dụng (Application Layer - React)**
Lớp này tập trung vào việc cải thiện trải nghiệm người dùng (UX) và xử lý các lỗi tức thời, không cần can thiệp sâu của Server.
- **Cơ chế:** Sử dụng thư viện quản lý trạng thái và fetching dữ liệu (React Query) để tự động xử lý request thất bại.
- **Cấu hình:** Đặt retry: 1
- **Mục tiêu:**
  - Xử lý lỗi mạng rất nhỏ, cục bộ xảy ra giữa thiết bị người dùng và Edge Function.
  - Tăng Trải nghiệm Người dùng (UX) bằng cách tự động thử lại nhanh chóng, không làm gián đoạn giao diện.

 #### **b. Triển khai Lớp 2: Tầng API (Network/HTTP Request - Edge Function)**
Lớp này tập trung vào bảo vệ hệ thống và ngăn chặn Retry Storm khi gọi các dịch vụ Backend/Bên thứ ba.
- **Cơ chế:** Hàm ```retryWrapper``` tùy chỉnh, được áp dụng cho mọi lời gọi HTTP request quan trọng trong Edge Function.
- **Logic Thử lại:**
  - Thử lại Lũy thừa (Backoff): Độ trễ chờ tăng theo cấp số mũ ( 2^i) cho phép Backend có thời gian phục hồi.
  - Thêm Nhiễu Ngẫu nhiên (Jitter): Chọn độ trễ thực tế (actualDelay) ngẫu nhiên trong khoảng đã tính toán. Mục tiêu là phá vỡ sự đồng bộ.
  - **Hạn chế:** Giới hạn số lần thử lại (maxRetries = 3) và thời gian chờ tối đa (maxDelayMs = 10000ms).
- **Mục tiêu:** Bảo vệ bệ thống khỏiretry storm, và đảm bảo tính nguyên tử của giao dịch khi tương tác với các dịch vụ bên ngoài.

### **3. Kết quả (Result)**
- Hệ thống khắc phục được những lúc gặp sự cố tạm thời nhờ cơ chế phân tầng:
  - Nếu React Cache có vấn đề hoặc lỗi kết nối Client-Side nhỏ, Lớp 1 sẽ xử lý bằng một lần retry nhanh chóng, không ảnh hưởng tới back-end hay trải nghiệm người dùng.
  - Nếu Tầng Network/Backend có vấn đề (ví dụ: Server bên thứ ba như Gemini gặp sự cố tạm thời 503), Lớp 2 (Edge Function) sẽ kích hoạt Backoff và Jitter. Lớp 2 sẽ dàn đều các yêu cầu thử lại theo thời gian. Điều này ngăn chặn làn sóng request đồng bộ đâm vào Server, cho phép Server có thời gian tự phục hồi, và đảm bảo tính sẵn sàng (Availability) của dịch vụ được duy trì.