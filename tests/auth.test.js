const request = require('supertest');
const app = require('../src/app'); // Path to your Express app
const { User } = require('../src/models'); 
const { sequelize } = require('../src/models');

// Mock the sendVerificationEmail function
jest.mock('../src/utils/mail', () => ({
  generateEmailToken: jest.fn(() => 'mockEmailToken'),
  sendVerificationEmail: jest.fn(() => Promise.resolve('Mail sent')),
}));

describe('Authentication Endpoints', () => {
  // Clean up the database before each test
  beforeEach(async () => {
    await User.destroy({ where: { email: 'test@example.com' } });
  });

  // Clean up the database after all tests
  afterAll(async () => {
    await User.destroy({ where: { email: 'test@example.com' } });
    await sequelize.close();
  });

  it('should register a user successfully', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'password123',
        first_name: 'Test',
        last_name: 'User',
        roleId: 1,
      });

    expect(response.status).toBe(201);
    expect(response.body.message).toBe('User registered successfully.');

    // Verify that the user was created in the database
    const user = await User.findOne({ where: { email: 'test@example.com' } });
    expect(user).not.toBeNull();
    expect(user.email).toBe('test@example.com');
  });

  it('should return error if email already exists', async () => {
    // Create a user before testing duplicate email error
    await User.create({
      email: 'test@example.com',
      password: 'hashedPassword',
      first_name: 'Test',
      last_name: 'User',
      roleId: 1,
      is_email_verified: false,
      email_verification_token: 'mockEmailToken',
    });

    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'password123',
        first_name: 'Test',
        last_name: 'User',
        roleId: 1,
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Email already in use.');
  });
});
