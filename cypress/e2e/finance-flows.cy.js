// cypress/e2e/finance-flows.cy.js

describe('Core finance workflows', () => {
  // Bỏ qua lỗi JS không quan trọng để tránh crash test
  Cypress.on('uncaught:exception', () => false);

  beforeEach(() => {
    // --- 1. MOCK AUTHENTICATION ---
    cy.intercept('POST', '**/functions/v1/login-limiting', {
       statusCode: 200,
       body: { success: true, user_id: 1 }
    }).as('mockLogin');

    // --- 2. MOCK TRANSACTIONS ---
    cy.intercept('POST', '**/functions/v1/create-transaction-saga', {
        statusCode: 200,
        body: { success: true, message: "Giao dịch thành công" }
    }).as('mockCreateTransaction');

    // --- 3. MOCK STATISTICS DATA ---
    // Mock Pie Chart
    cy.intercept('GET', '**/rest/v1/view_expenses_by_category*', {
        statusCode: 200,
        body: [
            { category: 'Ăn uống', total_amount: 150000 },
            { category: 'Di chuyển', total_amount: 50000 }
        ]
    }).as('mockPieData');

    // Mock Bar/Line Chart
    cy.intercept('GET', '**/rest/v1/view_monthly_stats*', {
        statusCode: 200,
        body: [
            { month: '2025-01-01', total_income: 5000000, total_expense: 2000000, net_balance: 3000000 },
            { month: '2025-02-01', total_income: 6000000, total_expense: 1000000, net_balance: 5000000 }
        ]
    }).as('mockMonthlyData');

    // --- 4. MOCK COMMON DATA ---
    cy.intercept('GET', '**/rest/v1/users*', { statusCode: 200, body: { full_name: "Test User" } });
    cy.intercept('GET', '**/rest/v1/wallets*', { statusCode: 200, body: [{ wallet_id: 1, balance: 10000000 }] });
    cy.intercept('GET', '**/rest/v1/limit*', { statusCode: 200, body: [] });
    cy.intercept('GET', '**/rest/v1/income*', { statusCode: 200, body: [] });
    cy.intercept('GET', '**/rest/v1/transactions*', { statusCode: 200, body: [] });

    // --- LOGIN ---
    cy.login();
  });

  it('creates a new income transaction successfully', () => {
    cy.visit('/transaction');

    const alertStub = cy.stub();
    cy.on('window:alert', alertStub);

    cy.get('input[placeholder="Nhập số tiền"]').should('be.visible').type('250000');
    cy.contains('button', 'Tiền lương').click();
    cy.get('input[placeholder="Nhập ghi chú..."]').type('Test income Cypress');

    const now = new Date();
    const formatted = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString().slice(0, 16);
    cy.get('input[type="datetime-local"]').type(formatted);

    cy.contains('button', 'Xác nhận').click();
    
    cy.wait('@mockCreateTransaction', { timeout: 10000 });

    cy.wrap(alertStub).should((stub) => {
      const calls = stub.getCalls();
      const successCall = calls.find(call => call.args[0] && call.args[0].includes('thành công'));
      expect(successCall, 'Alert success should appear').to.not.be.undefined;
    });
  });

  it('shows spending and income reports', () => {
    cy.visit('/statistic');
    
    // 1. Kiểm tra đã vào trang Thống kê (Sidebar hiển thị)
    cy.get('.sidebarhome').should('be.visible');

    // 2. Chờ request hoàn tất
    cy.wait(['@mockPieData', '@mockMonthlyData']);

    // 3. Debug: Kiểm tra xem có loading không (chờ nó biến mất)
    // Dùng timeout dài để đảm bảo React render xong
    cy.get('div.loading', { timeout: 10000 }).should('not.exist');

    // 4. Kiểm tra nội dung biểu đồ
    // Thử tìm text trực tiếp thay vì class cụ thể để tránh lỗi selector
    cy.contains('Chi tiêu theo danh mục', { timeout: 10000 }).should('be.visible');
    cy.contains('Thu chi theo tháng').should('be.visible');
    
    // 5. Kiểm tra Canvas (Chart.js render)
    cy.get('canvas').should('have.length.at.least', 1);
  });
});