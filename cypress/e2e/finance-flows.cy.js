// cypress/e2e/finance-flows.cy.js
describe('Core finance workflows', () => {
  beforeEach(() => {
    // 1. Mock Login
    cy.intercept('POST', '**/functions/v1/login-limiting', {
       statusCode: 200,
       body: { success: true, user_id: 1 }
    }).as('mockLogin');

    // 2. Mock API Thêm Giao dịch (Saga)
    // Dùng wildcard * để bắt chắc chắn mọi query params
    cy.intercept('POST', '**/functions/v1/create-transaction-saga*', {
        statusCode: 200,
        body: { success: true, message: "Giao dịch thành công" }
    }).as('mockTransaction');

    // 3. Mock Dữ liệu Thống kê (Supabase Views)
    cy.intercept('GET', '**/rest/v1/view_expenses_by_category*', {
        statusCode: 200,
        body: [{ category: 'Ăn uống', total_amount: 500000 }]
    }).as('mockPieData');

    cy.intercept('GET', '**/rest/v1/view_monthly_stats*', {
        statusCode: 200,
        body: [{ month: '2023-11-01', total_income: 1000000, total_expense: 500000, net_balance: 500000 }]
    }).as('mockBarData');
    
    // 4. Mock User & Wallet (QUAN TRỌNG: Sửa thành Array)
    // Mock User (cho .single()) -> Trả về Object (hoặc Array tuỳ version, nhưng Object thường an toàn cho .single khi mock)
    cy.intercept('GET', '**/rest/v1/users*', { 
        statusCode: 200, 
        body: { full_name: "Tester" } 
    }).as('mockUser');

    // Mock Wallet (cho .limit(1)) -> BẮT BUỘC PHẢI LÀ ARRAY [{...}]
    cy.intercept('GET', '**/rest/v1/wallets*', { 
        statusCode: 200, 
        body: [{ balance: 5000000, wallet_id: 1 }] // <-- Đã sửa thành mảng
    }).as('mockWallet');

    // Mock các bảng khác để tránh lỗi 404
    cy.intercept('GET', '**/rest/v1/income*', { statusCode: 200, body: [] });
    cy.intercept('GET', '**/rest/v1/transactions*', { statusCode: 200, body: [] });
    cy.intercept('GET', '**/rest/v1/limit*', { statusCode: 200, body: [] });

    cy.login();
  });

  it('creates a new income transaction successfully', () => {
    cy.visit('/transaction');

    // Stub alert để bắt thông báo
    const alertStub = cy.stub();
    cy.on('window:alert', alertStub);

    cy.get('input[placeholder="Nhập số tiền"]').should('be.visible').type('250000');
    cy.contains('button', 'Tiền lương').click();
    cy.get('input[placeholder="Nhập ghi chú..."]').type('Test income');

    const now = new Date();
    const formatted = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString().slice(0, 16);
    cy.get('input[type="datetime-local"]').type(formatted);

    cy.contains('button', 'Xác nhận').click();
    
    // Chờ API transaction được gọi
    cy.wait('@mockTransaction', { timeout: 10000 });

    // Kiểm tra alert
    cy.wrap(alertStub).should((stub) => {
      const calls = stub.getCalls();
      // Logic app: "Thêm giao dịch thành công (Secured by Saga)."
      const successCall = calls.find(call => call.args[0] && call.args[0].includes('thành công'));
      expect(successCall).to.not.be.undefined;
    });
  });

  it('shows spending and income reports', () => {
    cy.visit('/statistic');
    
    // Chờ dữ liệu load xong
    cy.wait(['@mockPieData', '@mockBarData']);

    // Kiểm tra tiêu đề biểu đồ hiển thị
    cy.contains('.chart-title', 'Chi tiêu theo danh mục', { timeout: 10000 }).should('be.visible');
    cy.contains('.chart-title', 'Thu chi theo tháng').should('be.visible');
    
    // Kiểm tra canvas đã render
    cy.get('canvas').should('exist');
  });
});