// cypress/e2e/auth.cy.js

describe('Authentication flows', () => {
  beforeEach(() => {
    // --- MOCKING (GIẢ LẬP) ---
    
    // 1. Giả lập API Đăng ký (Edge Function)
    cy.intercept('POST', '**/functions/v1/register-limiting', {
      statusCode: 200,
      body: { message: "Đăng ký thành công." }
    }).as('mockRegister');

    // 2. Giả lập API Đăng nhập (cho test case login)
    cy.intercept('POST', '**/functions/v1/login-limiting', {
      statusCode: 200,
      body: { success: true, user_id: 12345 }
    }).as('mockLogin');

    // 3. Giả lập các gọi Supabase trực tiếp (Check user, Create wallet...)
    // Chặn tất cả các request đến REST API của Supabase và trả về success
    cy.intercept('POST', '**/rest/v1/users*', { statusCode: 201, body: [] }).as('mockUserDB');
    cy.intercept('GET', '**/rest/v1/users*', { statusCode: 200, body: [] }).as('mockCheckUser');
    cy.intercept('POST', '**/rest/v1/wallets*', { statusCode: 201, body: [] }).as('mockWalletDB');
  });

  it('allows a new user to register and sign in', () => {
    const username = `cypress_user_${Date.now()}`;
    const password = 'StrongPass123!';

    cy.visit('/register');

    cy.get('input[name="fullName"]').type('Cypress Tester');
    cy.get('input[name="dob"]').type('01/01/1990');
    cy.get('input[name="email"]').type(`${username}@example.com`);
    cy.get('input[name="phone"]').type('0123456789');
    cy.get('input[name="username"]').type(username);
    cy.get('input[name="password"]').type(password);
    cy.get('input[name="confirmPassword"]').type(password);

    // Stub alert
    const alerts = [];
    cy.on('window:alert', (text) => alerts.push(text));

    // Submit form
    cy.get('form.register-form').submit();

    // Chờ API giả lập phản hồi
    cy.wait('@mockRegister');

    // Kiểm tra chuyển trang hoặc thông báo
    // (Lưu ý: Tùy logic app của bạn, nếu có redirect sang login thì check url)
    cy.url().should('include', '/login'); 

    // --- Test Login sau khi đăng ký ---
    cy.get('[data-testid="input-account"]').type(username);
    cy.get('[data-testid="input-password"]').type(password);

    cy.get('[data-testid="login-button"]').click();
    
    cy.wait('@mockLogin');
    
    cy.url().should('include', '/home');
  });

  it('authenticates an existing seeded user', () => {
    // Sử dụng custom command đã mock ở trên
    cy.login();
  });
});