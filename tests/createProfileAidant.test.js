const request = require('supertest');
const app = require('../src/app'); 
const { sequelize } = require('../src/models');
const { User, ProfileAidant } = require('../src/models'); 

// Mock sendVerificationEmail to avoid real email calls
jest.mock('../src/utils/mail', () => ({
    generateEmailToken: jest.fn(() => 'mockEmailToken'),
    sendVerificationEmail: jest.fn(() => Promise.resolve(true)),
}));

describe('POST /api/aidant/create', () => {
    beforeEach(async () => {
        await User.destroy({ where: { email: 'johndoe@example.com' } });
    });
    

  afterAll(async () => {
    await User.destroy({ where: { email: 'johndoe@example.com' } });
    await ProfileAidant.destroy({ where: { email: 'johndoe@example.com' } });
    await sequelize.close();
  });

  it('should create a ProfileAidant successfully', async () => {

    const response = await request(app)
      .post('/api/aidant/create')
      .field('profile_type', 'Particulier')
      .field('first_name', 'John')
      .field('last_name', 'Doe')
      .field('email', 'johndoe@example.com')
      .field('password', 'password123')
      .field('age', 30)
      .field('closest_town', 'Somewhere')
      .field('commune', 'Some Commune')
      .field('aidant_is_aide', 'No')
      .field('active', true)
      .field('online', false)
      .attach('profile_pic', Buffer.from('dummy file content'), 'test-profile-pic.jpg'); // In-memory file content

    expect(response.status).toBe(201);
  });
});
