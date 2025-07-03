const mockSend = jest.fn();

jest.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: jest.fn(() => ({}))
}));

jest.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: jest.fn(() => ({
      send: mockSend
    }))
  },
  PutCommand: jest.fn(),
  GetCommand: jest.fn(),
  UpdateCommand: jest.fn()
}));

const { PutCommand, GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { addUser, getUser, updateUser, handler, validateUserData } = require('../index');

const originalConsole = { ...console };

beforeEach(() => {
  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterEach(() => {
  Object.assign(console, originalConsole);
});

describe('Lambda Function Tests - Essential', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSend.mockClear();
    
    process.env.REGION = 'eu-west-1';
    process.env.STORAGE_TDDPROJECT_NAME = 'tddproject-test';
  });

  describe('validateUserData function', () => {
    it('should pass validation for valid user data', () => {
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 30,
        phone: '+1234567890'
      };

      const errors = validateUserData(userData);
      expect(errors).toEqual([]);
    });

    it('should fail validation for missing name', () => {
      const userData = { email: 'john@example.com' };
      const errors = validateUserData(userData);
      expect(errors).toContain('Name is required and must be a non-empty string');
    });

    it('should fail validation for invalid email format', () => {
      const userData = { name: 'John Doe', email: 'invalid-email' };
      const errors = validateUserData(userData);
      expect(errors).toContain('Invalid email format');
    });

    it('should fail validation for invalid age', () => {
      const userData = { name: 'John Doe', age: -5 };
      const errors = validateUserData(userData);
      expect(errors).toContain('Age must be a positive integer between 0 and 150');
    });

    it('should return multiple errors for multiple issues', () => {
      const userData = { name: '', email: 'invalid', age: -10 };
      const errors = validateUserData(userData);
      expect(errors.length).toBeGreaterThan(1);
    });
  });

  describe('addUser function', () => {
    it('should add a user successfully with valid data', async () => {
      const userId = 'user123';
      const userData = { name: 'John Doe', email: 'john@example.com', age: 30 };

      mockSend.mockResolvedValue({});

      const result = await addUser(userId, userData);

      expect(result.success).toBe(true);
      expect(result.message).toBe('User created successfully');
      expect(result.user.user).toBe(userId);
      expect(result.user.name).toBe(userData.name);
      expect(result.user.email).toBe(userData.email.toLowerCase());
    });

    it('should reject invalid user data', async () => {
      const userId = 'user123';
      const userData = { name: '', email: 'invalid-email' };

      await expect(addUser(userId, userData)).rejects.toThrow('Validation failed');
    });

    it('should reject empty userId', async () => {
      const userData = { name: 'John Doe' };
      await expect(addUser('', userData)).rejects.toThrow('User ID is required');
    });

    it('should throw error if user already exists', async () => {
      const userId = 'user123';
      const userData = { name: 'John Doe' };

      const conditionalError = new Error('ConditionalCheckFailedException');
      conditionalError.name = 'ConditionalCheckFailedException';
      mockSend.mockRejectedValue(conditionalError);

      await expect(addUser(userId, userData)).rejects.toThrow('User already exists');
    });
  });

  describe('getUser function', () => {
    it('should get a user successfully', async () => {
      const userId = 'user123';
      const mockUser = { user: userId, name: 'John Doe', email: 'john@example.com' };

      mockSend.mockResolvedValue({ Item: mockUser });

      const result = await getUser(userId);

      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockUser);
    });

    it('should reject empty userId', async () => {
      await expect(getUser('')).rejects.toThrow('User ID is required');
    });

    it('should throw error if user not found', async () => {
      const userId = 'nonexistent';
      mockSend.mockResolvedValue({});

      await expect(getUser(userId)).rejects.toThrow('User not found');
    });
  });

  describe('updateUser function', () => {
    it('should update a user successfully', async () => {
      const userId = 'user123';
      const updateData = { name: 'Jane Doe', age: 31 };
      const updatedUser = { user: userId, name: 'Jane Doe', age: 31 };

      mockSend.mockResolvedValue({ Attributes: updatedUser });

      const result = await updateUser(userId, updateData);

      expect(result.success).toBe(true);
      expect(result.message).toBe('User updated successfully');
      expect(result.user).toEqual(updatedUser);
    });

    it('should throw error if user not found for update', async () => {
      const userId = 'nonexistent';
      const updateData = { name: 'New Name' };

      const conditionalError = new Error('ConditionalCheckFailedException');
      conditionalError.name = 'ConditionalCheckFailedException';
      mockSend.mockRejectedValue(conditionalError);

      await expect(updateUser(userId, updateData)).rejects.toThrow('User not found');
    });
  });

  describe('Lambda handler', () => {
    it('should handle addUser action successfully', async () => {
      const event = {
        body: JSON.stringify({
          action: 'addUser',
          userId: 'user123',
          userData: { name: 'John Doe', email: 'john@example.com' }
        }),
        requestContext: { requestId: 'test-request-123' }
      };

      mockSend.mockResolvedValue({});

      const result = await handler(event);

      expect(result.statusCode).toBe(201);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.message).toBe('User created successfully');
    });

    it('should handle validation errors gracefully', async () => {
      const event = {
        body: JSON.stringify({
          action: 'addUser',
          userId: 'user123',
          userData: { name: '', email: 'invalid-email' }
        })
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(500);
      const body = JSON.parse(result.body);
      expect(body.error).toContain('Validation failed');
    });
  });
});
