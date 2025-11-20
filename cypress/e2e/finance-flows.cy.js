// cypress/e2e/finance-flows.cy.js
describe('Core finance workflows', () => {
  beforeEach(() => {
    // 1. Mock Login
    cy.intercept('POST', '**/functions/v1/login-limiting', {
       statusCode: 200,
       body: { success: true, user_id: 1 }
    }).as('mockLogin');

    // 2. Mock Add Transaction
    cy.intercept('POST', '**/functions/v1/create-transaction-saga', {
        statusCode: 200,
        body: { success: true, message: "Giao dịch thành công" }
    }).as('mockTransaction');

    // 3. Mock Data cho Trang Thống kê & Home
    // Quan trọng: Dùng wildcard * để bắt mọi query params của Supabase
    cy.intercept('GET', '**/rest/v1/view_expenses_by_category*', {
        statusCode: 200,
        body: [{ category: 'Ăn uống', total_amount: 500000 }]
    }).as('mockPieData');

    cy.intercept('GET', '**/rest/v1/view_monthly_stats*', {
        statusCode: 200,
        body: [{ month: '2023-11-01', total_income: 1000000, total_expense: 500000, net_balance: 500000 }]
    }).as('mockBarData');
    
    // Mock User & Wallet để tránh lỗi loading ở Home
    cy.intercept('GET', '**/rest/v1/users*', { statusCode: 200, body: { full_name: "Tester" } });
    cy.intercept('GET', '**/rest/v1/wallets*', { statusCode: 200, body: { balance: 5000000, wallet_id: 1 } });
    // Mock income/transactions cho history
    cy.intercept('GET', '**/rest/v1/income*', { statusCode: 200, body: [] });
    cy.intercept('GET', '**/rest/v1/transactions*', { statusCode: 200, body: [] });
    cy.intercept('GET', '**/rest/v1/limit*', { statusCode: 200, body: [] });

    cy.login();
  });

  it('creates a new income transaction successfully', () => {
    cy.visit('/transaction');

    // FIX LỖI: Sử dụng cy.stub để bắt alert chính xác hơn
    const alertStub = cy.stub();
    cy.on('window:alert', alertStub);

    cy.get('input[placeholder="Nhập số tiền"]').type('250000');
    cy.contains('button', 'Tiền lương').click();
    cy.get('input[placeholder="Nhập ghi chú..."]').type('Test income');

    const now = new Date();
    const formatted = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString().slice(0, 16);
    cy.get('input[type="datetime-local"]').type(formatted);

    cy.contains('button', 'Xác nhận').click();
    
    // Chờ API trả về
    cy.wait('@mockTransaction');

    // Kiểm tra alert đã được gọi
    cy.wrap(alertStub).should((stub) => {
      // Kiểm tra xem alert có được gọi với nội dung chứa "thành công" không
      // Logic trong app là: "Thêm giao dịch thành công (Secured by Saga)."
      const calls = stub.getCalls();
      const successCall = calls.find(call => call.args[0].includes('thành công'));
      expect(successCall).to.not.be.undefined;
    });
  });

  it('shows spending and income reports', () => {
    cy.visit('/statistic');
    
    // Chờ các API mock trả về dữ liệu
    cy.wait(['@mockPieData', '@mockBarData']);

    // Kiểm tra xem loading đã biến mất chưa (nếu có)
    cy.get('.loading').should('not.exist');

    // Kiểm tra tiêu đề biểu đồ
    // (Tăng timeout lên 10s để chờ render chart library)
    cy.contains('.chart-title', 'Chi tiêu theo danh mục', { timeout: 10000 }).should('be.visible');
    cy.contains('.chart-title', 'Thu chi theo tháng').should('be.visible');
    
    // Kiểm tra canvas đã render
    cy.get('canvas').should('exist');
  });
});