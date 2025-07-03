const AWS = require('aws-sdk');
const { addUser, getUser, updateUser, handler, validateUserData } = require('../index');

jest.mock('aws-sdk');
const originalConsole = { ...console };
beforeEach(() => {
  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterEach(() => {
  Object.assign(console, originalConsole);
});

describe('Lambda Function Tests', () => {
  let mockDynamoDB;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockDynamoDB = {
      put: jest.fn(),
      get: jest.fn(),
      update: jest.fn()
    };

    AWS.DynamoDB.DocumentClient.mockImplementation(() => mockDynamoDB);
    
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
      const userData = {
        email: 'john@example.com'
      };

      const errors = validateUserData(userData);
      expect(errors).toContain('Name is required and must be a non-empty string');
    });

    it('should fail validation for empty name', () => {
      const userData = {
        name: '   ',
        email: 'john@example.com'
      };

      const errors = validateUserData(userData);
      expect(errors).toContain('Name is required and must be a non-empty string');
    });

    it('should fail validation for invalid email format', () => {
      const userData = {
        name: 'John Doe',
        email: 'invalid-email'
      };

      const errors = validateUserData(userData);
      expect(errors).toContain('Invalid email format');
    });

    it('should fail validation for negative age', () => {
      const userData = {
        name: 'John Doe',
        age: -5
      };

      const errors = validateUserData(userData);
      expect(errors).toContain('Age must be a positive integer between 0 and 150');
    });

    it('should fail validation for age over 150', () => {
      const userData = {
        name: 'John Doe',
        age: 200
      };

      const errors = validateUserData(userData);
      expect(errors).toContain('Age must be a positive integer between 0 and 150');
    });

    it('should fail validation for decimal age', () => {
      const userData = {
        name: 'John Doe',
        age: 25.5
      };

      const errors = validateUserData(userData);
      expect(errors).toContain('Age must be a positive integer between 0 and 150');
    });

    it('should fail validation for invalid phone number', () => {
      const userData = {
        name: 'John Doe',
        phone: 'abc123'
      };

      const errors = validateUserData(userData);
      expect(errors).toContain('Invalid phone number format');
    });

    it('should fail validation for name too long', () => {
      const userData = {
        name: 'a'.repeat(256)
      };

      const errors = validateUserData(userData);
      expect(errors).toContain('Name must be less than 256 characters');
    });

    it('should fail validation for email too long', () => {
      const userData = {
        name: 'John Doe',
        email: 'a'.repeat(250) + '@example.com'
      };

      const errors = validateUserData(userData);
      expect(errors).toContain('Email must be less than 256 characters');
    });

    it('should return multiple errors for multiple issues', () => {
      const userData = {
        name: '',
        email: 'invalid-email',
        age: -10,
        phone: 'invalid'
      };

      const errors = validateUserData(userData);
      expect(errors).toHaveLength(4);
      expect(errors).toContain('Name is required and must be a non-empty string');
      expect(errors).toContain('Invalid email format');
      expect(errors).toContain('Age must be a positive integer between 0 and 150');
      expect(errors).toContain('Invalid phone number format');
    });
  });

  describe('addUser function with validation', () => {
    it('should add a user successfully with valid data', async () => {
      const userId = 'user123';
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 30
      };

      mockDynamoDB.put.mockReturnValue({
        promise: jest.fn().mockResolvedValue({})
      });

      const result = await addUser(userId, userData);

      expect(result.success).toBe(true);
      expect(result.message).toBe('User created successfully');
      expect(result.user.user).toBe(userId);
      expect(result.user.name).toBe(userData.name);
      expect(result.user.email).toBe(userData.email.toLowerCase());
      expect(result.user.age).toBe(userData.age);
      expect(result.user.createdAt).toBeDefined();
      expect(result.user.updatedAt).toBeDefined();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('"level":"INFO"')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Starting addUser operation')
      );
    });

    it('should reject invalid email format', async () => {
      const userId = 'user123';
      const userData = {
        name: 'John Doe',
        email: 'invalid-email'
      };

      await expect(addUser(userId, userData)).rejects.toThrow('Validation failed: Invalid email format');
      
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('"level":"ERROR"')
      );
    });

    it('should reject negative age', async () => {
      const userId = 'user123';
      const userData = {
        name: 'John Doe',
        age: -5
      };

      await expect(addUser(userId, userData)).rejects.toThrow('Age must be a positive integer between 0 and 150');
    });

    it('should reject missing name', async () => {
      const userId = 'user123';
      const userData = {
        email: 'john@example.com'
      };

      await expect(addUser(userId, userData)).rejects.toThrow('Name is required and must be a non-empty string');
    });

    it('should reject empty userId', async () => {
      const userData = { name: 'John Doe' };

      await expect(addUser('', userData)).rejects.toThrow('User ID is required and must be a non-empty string');
      await expect(addUser('   ', userData)).rejects.toThrow('User ID is required and must be a non-empty string');
    });

    it('should reject non-string userId', async () => {
      const userData = { name: 'John Doe' };

      await expect(addUser(123, userData)).rejects.toThrow('User ID is required and must be a non-empty string');
      await expect(addUser(null, userData)).rejects.toThrow('User ID is required and must be a non-empty string');
    });

    it('should trim and normalize user data', async () => {
      const userId = '  user123  ';
      const userData = {
        name: '  John Doe  ',
        email: '  JOHN@EXAMPLE.COM  '
      };

      mockDynamoDB.put.mockReturnValue({
        promise: jest.fn().mockResolvedValue({})
      });

      const result = await addUser(userId, userData);

      expect(result.user.user).toBe('user123');
      expect(result.user.name).toBe('John Doe');
      expect(result.user.email).toBe('john@example.com');
    });

    it('should throw error if user already exists', async () => {
      const userId = 'user123';
      const userData = { name: 'John Doe' };

      const conditionalError = new Error('ConditionalCheckFailedException');
      conditionalError.code = 'ConditionalCheckFailedException';

      mockDynamoDB.put.mockReturnValue({
        promise: jest.fn().mockRejectedValue(conditionalError)
      });

      await expect(addUser(userId, userData)).rejects.toThrow('User already exists');
      
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('"level":"WARN"')
      );
    });

    it('should handle DynamoDB errors', async () => {
      const userId = 'user123';
      const userData = { name: 'John Doe' };

      mockDynamoDB.put.mockReturnValue({
        promise: jest.fn().mockRejectedValue(new Error('AWS Error'))
      });

      await expect(addUser(userId, userData)).rejects.toThrow('Failed to add user');
    });
  });

  describe('getUser function with validation', () => {
    it('should get a user successfully', async () => {
      const userId = 'user123';
      const mockUser = {
        user: userId,
        name: 'John Doe',
        email: 'john@example.com',
        createdAt: '2024-01-01T00:00:00.000Z'
      };

      mockDynamoDB.get.mockReturnValue({
        promise: jest.fn().mockResolvedValue({
          Item: mockUser
        })
      });

      const result = await getUser(userId);

      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockUser);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Starting getUser operation')
      );
    });

    it('should reject empty userId', async () => {
      await expect(getUser('')).rejects.toThrow('User ID is required and must be a non-empty string');
      await expect(getUser('   ')).rejects.toThrow('User ID is required and must be a non-empty string');
    });

    it('should reject non-string userId', async () => {
      await expect(getUser(123)).rejects.toThrow('User ID is required and must be a non-empty string');
      await expect(getUser(null)).rejects.toThrow('User ID is required and must be a non-empty string');
    });

    it('should throw error if user not found', async () => {
      const userId = 'nonexistent';

      mockDynamoDB.get.mockReturnValue({
        promise: jest.fn().mockResolvedValue({})
      });

      await expect(getUser(userId)).rejects.toThrow('User not found');
      
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('"level":"WARN"')
      );
    });

    it('should handle DynamoDB errors', async () => {
      const userId = 'user123';

      mockDynamoDB.get.mockReturnValue({
        promise: jest.fn().mockRejectedValue(new Error('AWS Error'))
      });

      await expect(getUser(userId)).rejects.toThrow('Failed to get user');
    });
  });

  describe('updateUser function with validation', () => {
    it('should update a user successfully with valid data', async () => {
      const userId = 'user123';
      const updateData = {
        name: 'Jane Doe',
        age: 31,
        email: 'JANE@EXAMPLE.COM'
      };

      const updatedUser = {
        user: userId,
        name: 'Jane Doe',
        email: 'jane@example.com',
        age: 31,
        updatedAt: expect.any(String)
      };

      mockDynamoDB.update.mockReturnValue({
        promise: jest.fn().mockResolvedValue({
          Attributes: updatedUser
        })
      });

      const result = await updateUser(userId, updateData);

      expect(result.success).toBe(true);
      expect(result.message).toBe('User updated successfully');
      expect(result.user).toEqual(updatedUser);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Starting updateUser operation')
      );
    });

    it('should reject invalid update data', async () => {
      const userId = 'user123';
      const updateData = {
        name: '',
        email: 'invalid-email',
        age: -10
      };

      await expect(updateUser(userId, updateData)).rejects.toThrow('Validation failed');
    });

    it('should reject empty userId', async () => {
      const updateData = { name: 'New Name' };

      await expect(updateUser('', updateData)).rejects.toThrow('User ID is required and must be a non-empty string');
    });

    it('should throw error if user not found for update', async () => {
      const userId = 'nonexistent';
      const updateData = { name: 'New Name' };

      const conditionalError = new Error('ConditionalCheckFailedException');
      conditionalError.code = 'ConditionalCheckFailedException';

      mockDynamoDB.update.mockReturnValue({
        promise: jest.fn().mockRejectedValue(conditionalError)
      });

      await expect(updateUser(userId, updateData)).rejects.toThrow('User not found');
    });
  });

  describe('Lambda handler with logging', () => {
    it('should handle DynamoDB trigger events with logging', async () => {
      const dynamoDBEvent = {
        Records: [
          {
            eventName: 'INSERT',
            dynamodb: {
              Keys: { user: { S: 'user123' } },
              NewImage: {
                user: { S: 'user123' },
                name: { S: 'John Doe' }
              }
            }
          }
        ]
      };

      const result = await handler(dynamoDBEvent);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.message).toBe('DynamoDB trigger processed successfully');
      expect(body.processedRecords).toBe(1);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Processing DynamoDB trigger event')
      );
    });

    it('should handle addUser action with proper logging', async () => {
      const event = {
        body: JSON.stringify({
          action: 'addUser',
          userId: 'user123',
          userData: { name: 'John Doe', email: 'john@example.com' }
        }),
        requestContext: { requestId: 'test-request-123' }
      };

      mockDynamoDB.put.mockReturnValue({
        promise: jest.fn().mockResolvedValue({})
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(201);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.message).toBe('User created successfully');
      expect(result.headers['X-Request-ID']).toBe('test-request-123');

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Processing API request')
      );
    });

    it('should handle validation errors in API requests', async () => {
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

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('"level":"ERROR"')
      );
    });

    it('should handle malformed JSON with proper error logging', async () => {
      const event = {
        body: 'invalid json'
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(500);
      const body = JSON.parse(result.body);
      expect(body.error).toBeDefined();

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Lambda handler error')
      );
    });
  });

  describe('Edge cases and special scenarios', () => {
    it('should handle special characters in user data', async () => {
      const userId = 'special-user';
      const userData = {
        name: 'José María Aznar-López',
        email: 'josé@example.com'
      };

      mockDynamoDB.put.mockReturnValue({
        promise: jest.fn().mockResolvedValue({})
      });

      const result = await addUser(userId, userData);

      expect(result.success).toBe(true);
      expect(result.user.name).toBe(userData.name);
      expect(result.user.email).toBe('josé@example.com');
    });

    it('should handle optional fields correctly', async () => {
      const userId = 'minimal-user';
      const userData = {
        name: 'Minimal User'
      };

      mockDynamoDB.put.mockReturnValue({
        promise: jest.fn().mockResolvedValue({})
      });

      const result = await addUser(userId, userData);

      expect(result.success).toBe(true);
      expect(result.user.name).toBe(userData.name);
      expect(result.user.email).toBeUndefined();
      expect(result.user.age).toBeUndefined();
    });

    it('should handle valid phone number formats', async () => {
      const testCases = [
        '+1234567890',
        '1234567890',
        '+33123456789',
        '0123456789'
      ];

      for (const phone of testCases) {
        const userData = { name: 'Test User', phone };
        const errors = validateUserData(userData);
        expect(errors.filter(e => e.includes('phone'))).toHaveLength(0);
      }
    });

    it('should reject invalid phone number formats', async () => {
      const testCases = [
        'abc123',
        '123',
        '+',
        '++1234567890',
        '123-456-7890'
      ];

      for (const phone of testCases) {
        const userData = { name: 'Test User', phone };
        const errors = validateUserData(userData);
        expect(errors).toContain('Invalid phone number format');
      }
    });
  });
});
