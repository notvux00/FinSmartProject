// cypress/e2e/finance-flows.cy.js

describe('Core finance workflows', () => {
  // Bỏ qua các lỗi JS không quan trọng từ ứng dụng để test không bị dừng đột ngột
  Cypress.on('uncaught:exception', (err, runnable) => {
    return false;
  });

  beforeEach(() => {
    // 1. MOCK LOGIN
    cy.intercept('POST', '**/functions/v1/login-limiting', {
       statusCode: 200,
       body: { success: true, user_id: 1 }
    }).as('mockLogin');

    // 2. MOCK ADD TRANSACTION (SAGA)
    cy.intercept('POST', '**/functions/v1/create-transaction-saga', {
        statusCode: 200,
        body: { success: true, message: "Giao dịch thành công" }
    }).as('mockCreateTransaction');

    // 3. MOCK DATA CHO TRANG THỐNG KÊ (QUAN TRỌNG)
    // Sử dụng Query Param Matching để bắt dính chính xác request của Supabase
    
    // Mock dữ liệu biểu đồ tròn (Pie)
    cy.intercept('GET', '**/rest/v1/view_expenses_by_category*', {
        statusCode: 200,
        body: [
            { category: 'Ăn uống', total_amount: 150000 },
            { category: 'Di chuyển', total_amount: 50000 }
        ]
    }).as('mockPieData');

    // Mock dữ liệu biểu đồ cột/đường (Bar/Line)
    cy.intercept('GET', '**/rest/v1/view_monthly_stats*', {
        statusCode: 200,
        body: [
            { month: '2025-01-01', total_income: 5000000, total_expense: 2000000, net_balance: 3000000 },
            { month: '2025-02-01', total_income: 6000000, total_expense: 1000000, net_balance: 5000000 }
        ]
    }).as('mockMonthlyData');

    // 4. MOCK DỮ LIỆU CHUNG (USER, WALLET)
    cy.intercept('GET', '**/rest/v1/users*', { 
        statusCode: 200, 
        body: { full_name: "Test User" } 
    });
    
    // Mock Wallet trả về mảng để không bị lỗi .limit(1)
    cy.intercept('GET', '**/rest/v1/wallets*', { 
        statusCode: 200, 
        body: [{ wallet_id: 1, balance: 10000000 }] 
    });

    // Mock các bảng khác để tránh lỗi 404 rác
    cy.intercept('GET', '**/rest/v1/limit*', { statusCode: 200, body: [] });
    cy.intercept('GET', '**/rest/v1/income*', { statusCode: 200, body: [] });
    cy.intercept('GET', '**/rest/v1/transactions*', { statusCode: 200, body: [] });

    // --- THỰC HIỆN LOGIN ---
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

    // Nhập ngày giờ (Fix múi giờ)
    const now = new Date();
    const formatted = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString().slice(0, 16);
    cy.get('input[type="datetime-local"]').type(formatted);

    // Submit
    cy.contains('button', 'Xác nhận').click();
    
    // Chờ API mock trả về (Tăng timeout để chắc chắn)
    cy.wait('@mockCreateTransaction', { timeout: 10000 });

    // Kiểm tra alert
    cy.wrap(alertStub).should((stub) => {
      const calls = stub.getCalls();
      const successCall = calls.find(call => call.args[0] && call.args[0].includes('thành công'));
      expect(successCall, 'Alert success should appear').to.not.be.undefined;
    });
  });

  it('shows spending and income reports', () => {
    cy.visit('/statistic');
    
    // Chờ request hoàn tất
    cy.wait(['@mockPieData', '@mockMonthlyData']);

    // Kiểm tra không còn loading
    cy.get('div.loading').should('not.exist');

    // Kiểm tra tiêu đề biểu đồ (Tăng timeout chờ render)
    cy.contains('.chart-title', 'Chi tiêu theo danh mục', { timeout: 15000 }).should('be.visible');
    cy.contains('.chart-title', 'Thu chi theo tháng').should('be.visible');
    cy.contains('.chart-title', 'Số dư ví theo thời gian').should('be.visible');
    
    // Kiểm tra canvas đã được vẽ
    cy.get('canvas').should('have.length.at.least', 1);
  });
});