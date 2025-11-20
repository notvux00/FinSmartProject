// cypress/e2e/finance-flows.cy.js

describe('Core finance workflows', () => {
  beforeEach(() => {
    // --- MOCK AUTHENTICATION ---
    // 1. Mock Login Edge Function
    cy.intercept('POST', '**/functions/v1/login-limiting', {
       statusCode: 200,
       body: { success: true, user_id: 1 }
    }).as('mockLogin');

    // --- MOCK TRANSACTIONS ---
    // 2. Mock Create Transaction Saga
    cy.intercept('POST', '**/functions/v1/create-transaction-saga', {
        statusCode: 200,
        body: { success: true, message: "Giao dịch thành công" }
    }).as('mockCreateTransaction');

    // --- MOCK STATISTICS DATA ---
    // 3. Mock Pie Chart Data (View: view_expenses_by_category)
    // Dùng path matching để chắc chắn bắt được request
    cy.intercept({ method: 'GET', url: '**view_expenses_by_category*' }, {
        statusCode: 200,
        body: [
            { category: 'Ăn uống', total_amount: 150000 },
            { category: 'Di chuyển', total_amount: 50000 }
        ]
    }).as('mockPieData');

    // 4. Mock Bar/Line Chart Data (View: view_monthly_stats)
    cy.intercept({ method: 'GET', url: '**view_monthly_stats*' }, {
        statusCode: 200,
        body: [
            { month: '2025-01-01', total_income: 5000000, total_expense: 2000000, net_balance: 3000000 },
            { month: '2025-02-01', total_income: 6000000, total_expense: 1000000, net_balance: 5000000 }
        ]
    }).as('mockMonthlyData');

    // --- MOCK COMMON DATA (Tránh lỗi 404 ở Home/Global) ---
    cy.intercept('GET', '**rest/v1/users*', { statusCode: 200, body: { full_name: "Test User" } });
    // Mock Wallet trả về Array để tương thích với .limit(1) của logic thêm giao dịch
    cy.intercept('GET', '**rest/v1/wallets*', { statusCode: 200, body: [{ wallet_id: 1, balance: 10000000 }] });
    cy.intercept('GET', '**rest/v1/limit*', { statusCode: 200, body: [] });
    cy.intercept('GET', '**rest/v1/income*', { statusCode: 200, body: [] });
    cy.intercept('GET', '**rest/v1/transactions*', { statusCode: 200, body: [] });

    // --- LOGIN ---
    cy.login();
  });

  it('creates a new income transaction successfully', () => {
    cy.visit('/transaction');

    // Stub window.alert
    const alertStub = cy.stub();
    cy.on('window:alert', alertStub);

    // Điền form
    cy.get('input[placeholder="Nhập số tiền"]').should('be.visible').type('250000');
    cy.contains('button', 'Tiền lương').click();
    cy.get('input[placeholder="Nhập ghi chú..."]').type('Test income Cypress');

    const now = new Date();
    const formatted = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString().slice(0, 16);
    cy.get('input[type="datetime-local"]').type(formatted);

    // Submit
    cy.contains('button', 'Xác nhận').click();
    
    // Chờ API mock trả về
    cy.wait('@mockCreateTransaction');

    // Kiểm tra alert thành công
    cy.wrap(alertStub).should((stub) => {
      const calls = stub.getCalls();
      const successCall = calls.find(call => call.args[0] && call.args[0].includes('thành công'));
      expect(successCall, 'Alert success not found').to.not.be.undefined;
    });
  });

  it('shows spending and income reports', () => {
    cy.visit('/statistic');
    
    // Chờ cả 2 request thống kê hoàn tất
    cy.wait(['@mockPieData', '@mockMonthlyData']);

    // Kiểm tra UI: Đảm bảo không còn loading
    cy.get('div.loading').should('not.exist');

    // Kiểm tra nếu có lỗi (Error Boundary) hiển thị
    cy.contains('Đã xảy ra lỗi').should('not.exist');

    // Assert title biểu đồ (Cho phép timeout dài hơn chút để React render)
    cy.contains('.chart-title', 'Chi tiêu theo danh mục', { timeout: 15000 }).should('be.visible');
    cy.contains('.chart-title', 'Thu chi theo tháng').should('be.visible');
    cy.contains('.chart-title', 'Số dư ví theo thời gian').should('be.visible');
    
    // Kiểm tra canvas đã được vẽ
    cy.get('canvas').should('have.length.at.least', 1);
  });
});