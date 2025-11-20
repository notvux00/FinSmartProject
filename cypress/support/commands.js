// cypress/support/commands.js

Cypress.Commands.add('login', (username = 'demo', password = 'DemoPass123!') => {
  // 1. Giả lập API Đăng nhập (login-limiting)
  // Khi app gọi API này, Cypress sẽ chặn và trả về thành công ngay lập tức
  cy.intercept('POST', '**/functions/v1/login-limiting', {
    statusCode: 200,
    body: {
      success: true,
      user_id: 12345 // Fake user ID
    }
  }).as('mockLogin');

  // 2. Thực hiện thao tác trên giao diện
  cy.visit('/login');
  
  cy.get('[data-testid="input-account"]').clear().type(username);
  cy.get('[data-testid="input-password"]').clear().type(password);

  // Xử lý window.alert nếu có
  cy.on('window:alert', (str) => {
    return true; 
  });

  cy.get('[data-testid="login-button"]').click();

  // 3. Chờ request giả lập hoàn tất
  cy.wait('@mockLogin');

  // 4. Kiểm tra đã chuyển trang thành công
  cy.url().should('include', '/home');
});