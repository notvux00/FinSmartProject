FinSmart – Ứng dụng Quản lý Tài Chính Cá Nhân (FSD Architecture)

Version: 2.0 (Refactored & Enhanced)
Course: INT3105 – Software Architecture

🌟 Giới thiệu

FinSmart là ứng dụng quản lý tài chính cá nhân hỗ trợ theo dõi thu chi, thiết lập ngân sách, phân tích tài chính và nhập liệu bằng giọng nói. Phiên bản 2.0 tập trung tái cấu trúc kiến trúc phần mềm, tăng cường bảo mật, hiệu năng và khả năng mở rộng.

🚀 Các Cải Tiến Kiến Trúc
1. Authentication & Security

Chuyển từ lưu token trong localStorage sang JWT + HttpOnly Cookies

Bảo vệ chống XSS, cookie tự động gửi theo request

Cập nhật ProtectedRoute để xác thực an toàn hơn

2. Hiệu năng Frontend (Client-side Caching)

Áp dụng Cache-Aside Pattern với React Query (TanStack Query)

Giảm số lượng API calls

UI phản hồi nhanh hơn, có cơ chế background refetching

3. CI/CD & Testing

Thiết lập GitHub Actions để tự động build + chạy test khi push

Cypress (E2E Testing) cho các luồng quan trọng

Unit Testing với Jest/Vitest cho logic tính toán & validator

4. Backend Optimization

Sử dụng Supabase PostgreSQL + RLS

Tối ưu truy vấn báo cáo

Tích hợp AI (Google Gemini) qua Edge Functions để xử lý nhập liệu giọng nói

5. Monitoring

Health Check API

UI hiển thị system status theo thời gian thực

🎯 Tính năng chính

Dashboard tổng quan tài chính

Quản lý thu/chi với phân loại

Nhập liệu giọng nói bằng AI

Đặt ngân sách & cảnh báo vượt hạn mức

Biểu đồ thống kê chi tiêu

Phân tích dòng tiền

🛠 Công nghệ sử dụng
Mảng	Công nghệ
Frontend	ReactJS, CSS Modules
State & Cache	React Query, Context API
Backend	Supabase PostgreSQL, Edge Functions
Testing	Cypress, Jest/Vitest
CI/CD	GitHub Actions
AI	Google Gemini API
📂 Cấu trúc dự án (Feature-Sliced Design – FSD)
src/
├── app/          # Global config: providers, router, styles
├── pages/        # Main screens (Home, Transaction, Profile...)
├── widgets/      # UI blocks: DashboardChart, TransactionList...
├── features/     # Business logic modules: Auth, AddTransaction...
├── entities/     # Data models: User, Budget, Transaction...
├── shared/       # Shared UI, hooks, libs, configs
└── ...

🔧 Hướng dẫn cài đặt (Local Development)
1. Clone project
git clone 
cd finsmartproject-fsd

2. Cài đặt dependencies
npm install

3. Tạo file .env
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_KEY=your_supabase_anon_key

4. Khởi chạy ứng dụng
npm start


App chạy tại:
👉 http://localhost:3000

🧪 Testing
Chạy Unit Test
npm test

Chạy E2E Test (Cypress)
npx cypress open

👥 Thành viên nhóm
Thành viên	Vai trò
Thành viên 1	DevOps & QA (CI/CD, Testing)
Thành viên 2	Frontend Lead (Caching, UI/UX, Performance)
Thành viên 3	Backend Lead (DB, Business Logic, Reports)
Thành viên 4	Security & Integration (Auth, API Gateway)