// cypress/e2e/finance-flows.cy.js
describe('Core finance workflows', () => {
  beforeEach(() => {
    // 1. Mock Login (Bắt buộc để vào được trang chủ)
    cy.intercept('POST', '**/functions/v1/login-limiting', {
       statusCode: 200,
       body: { success: true, user_id: 1 }
    }).as('mockLogin');

    // 2. Mock API Thêm Giao dịch (Saga)
    cy.intercept('POST', '**/functions/v1/create-transaction-saga', {
        statusCode: 200,
        body: { success: true, message: "Giao dịch thành công" }
    }).as('mockTransaction');

    // 3. Mock Dữ liệu Thống kê (Supabase Views)
    // Mock biểu đồ tròn
    cy.intercept('GET', '**/rest/v1/view_expenses_by_category*', {
        statusCode: 200,
        body: [
            { category: 'Ăn uống', total_amount: 500000 },
            { category: 'Di chuyển', total_amount: 200000 }
        ]
    }).as('mockPieData');

    // Mock biểu đồ cột/đường
    cy.intercept('GET', '**/rest/v1/view_monthly_stats*', {
        statusCode: 200,
        body: [
            { month: '2023-10-01', total_income: 10000000, total_expense: 5000000, net_balance: 5000000 },
            { month: '2023-11-01', total_income: 12000000, total_expense: 6000000, net_balance: 6000000 }
        ]
    }).as('mockBarData');
    
    // Mock dữ liệu User/Ví để trang Home không bị lỗi loading
    cy.intercept('GET', '**/rest/v1/users*', { statusCode: 200, body: { full_name: "Tester" } });
    cy.intercept('GET', '**/rest/v1/wallets*', { statusCode: 200, body: { balance: 5000000, wallet_id: 1 } });
    cy.intercept('GET', '**/rest/v1/limit*', { statusCode: 200, body: [] });

    cy.login();
  });

  it('creates a new income transaction successfully', () => {
    cy.visit('/transaction');

    cy.get('input[placeholder="Nhập số tiền"]').type('250000');
    cy.contains('button', 'Tiền lương').click();
    cy.get('input[placeholder="Nhập ghi chú..."]').type('Test income');

    // Nhập ngày giờ hiện tại
    const now = new Date();
    const formatted = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString().slice(0, 16);
    cy.get('input[type="datetime-local"]').type(formatted);

    // Stub alert để bắt thông báo thành công
    const alerts = [];
    cy.on('window:alert', (text) => alerts.push(text));

    cy.contains('button', 'Xác nhận').click();
    
    // Chờ API giả lập trả về
    cy.wait('@mockTransaction');

    // Kiểm tra alert có xuất hiện không
    cy.wrap(null).should(() => {
      expect(alerts.some((text) => text.includes('thành công'))).to.be.true;
    });
  });

  it('shows spending and income reports', () => {
    cy.visit('/statistic');
    
    // Chờ dữ liệu load xong
    cy.wait(['@mockPieData', '@mockBarData']);

    // Kiểm tra tiêu đề biểu đồ đã hiện ra (chứng tỏ không còn loading)
    cy.contains('.chart-title', 'Chi tiêu theo danh mục').should('be.visible');
    cy.contains('.chart-title', 'Thu chi theo tháng').should('be.visible');
    cy.contains('.chart-title', 'Số dư ví theo thời gian').should('be.visible');
    
    // Kiểm tra canvas biểu đồ đã được vẽ
    cy.get('canvas').should('have.length.greaterThan', 0);
  });
});