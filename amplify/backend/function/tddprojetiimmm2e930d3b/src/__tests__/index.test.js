const AWS = require('aws-sdk');
const { addUser, getUser, updateUser, handler } = require('../index');

jest.mock('aws-sdk');

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

  describe('addUser function', () => {
    it('should add a user successfully', async () => {
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
      expect(result.user.email).toBe(userData.email);
      expect(result.user.age).toBe(userData.age);
      expect(result.user.createdAt).toBeDefined();
      expect(result.user.updatedAt).toBeDefined();

      expect(mockDynamoDB.put).toHaveBeenCalledWith({
        TableName: 'tddproject-test',
        Item: expect.objectContaining({
          user: userId,
          name: userData.name,
          email: userData.email,
          age: userData.age,
          createdAt: expect.any(String),
          updatedAt: expect.any(String)
        }),
        ConditionExpression: 'attribute_not_exists(#user)',
        ExpressionAttributeNames: {
          '#user': 'user'
        }
      });
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
    });

    it('should throw error if userId is missing', async () => {
      await expect(addUser(null, { name: 'John' })).rejects.toThrow('User ID is required');
      await expect(addUser('', { name: 'John' })).rejects.toThrow('User ID is required');
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

  describe('getUser function', () => {
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

      expect(mockDynamoDB.get).toHaveBeenCalledWith({
        TableName: 'tddproject-test',
        Key: {
          user: userId
        }
      });
    });

    it('should throw error if user not found', async () => {
      const userId = 'nonexistent';

      mockDynamoDB.get.mockReturnValue({
        promise: jest.fn().mockResolvedValue({}) // No Item returned
      });

      await expect(getUser(userId)).rejects.toThrow('User not found');
    });

    it('should throw error if userId is missing', async () => {
      await expect(getUser(null)).rejects.toThrow('User ID is required');
      await expect(getUser('')).rejects.toThrow('User ID is required');
    });

    it('should handle DynamoDB errors', async () => {
      const userId = 'user123';

      mockDynamoDB.get.mockReturnValue({
        promise: jest.fn().mockRejectedValue(new Error('AWS Error'))
      });

      await expect(getUser(userId)).rejects.toThrow('Failed to get user');
    });
  });

  describe('updateUser function', () => {
    it('should update a user successfully', async () => {
      const userId = 'user123';
      const updateData = {
        name: 'Jane Doe',
        age: 31
      };

      const updatedUser = {
        user: userId,
        name: 'Jane Doe',
        email: 'john@example.com',
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

      expect(mockDynamoDB.update).toHaveBeenCalledWith({
        TableName: 'tddproject-test',
        Key: {
          user: userId
        },
        UpdateExpression: 'SET #attr0 = :val0, #attr1 = :val1, #updatedAt = :updatedAt',
        ExpressionAttributeNames: {
          '#attr0': 'name',
          '#attr1': 'age',
          '#updatedAt': 'updatedAt',
          '#user': 'user'
        },
        ExpressionAttributeValues: {
          ':val0': 'Jane Doe',
          ':val1': 31,
          ':updatedAt': expect.any(String)
        },
        ConditionExpression: 'attribute_exists(#user)',
        ReturnValues: 'ALL_NEW'
      });
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

    it('should throw error if userId is missing', async () => {
      await expect(updateUser(null, { name: 'John' })).rejects.toThrow('User ID is required');
    });
  });

  describe('Lambda handler', () => {
    it('should handle DynamoDB trigger events', async () => {
      const dynamoDBEvent = {
        Records: [
          {
            eventName: 'INSERT',
            dynamodb: {
              NewImage: {
                user: { S: 'user123' },
                name: { S: 'John Doe' }
              }
            }
          },
          {
            eventName: 'MODIFY',
            dynamodb: {
              NewImage: {
                user: { S: 'user123' },
                name: { S: 'Jane Doe' }
              }
            }
          }
        ]
      };

      const result = await handler(dynamoDBEvent);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.message).toBe('DynamoDB trigger processed successfully');
      expect(body.processedRecords).toBe(2);
    });

    it('should handle addUser action', async () => {
      const event = {
        body: JSON.stringify({
          action: 'addUser',
          userId: 'user123',
          userData: { name: 'John Doe', email: 'john@example.com' }
        })
      };

      mockDynamoDB.put.mockReturnValue({
        promise: jest.fn().mockResolvedValue({})
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(201);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.message).toBe('User created successfully');
    });

    it('should handle getUser action', async () => {
      const event = {
        body: JSON.stringify({
          action: 'getUser',
          userId: 'user123'
        })
      };

      const mockUser = {
        user: 'user123',
        name: 'John Doe'
      };

      mockDynamoDB.get.mockReturnValue({
        promise: jest.fn().mockResolvedValue({ Item: mockUser })
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.user).toEqual(mockUser);
    });

    it('should handle invalid action', async () => {
      const event = {
        body: JSON.stringify({
          action: 'invalidAction'
        })
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error).toContain('Invalid action');
    });

    it('should handle errors gracefully', async () => {
      const event = {
        body: JSON.stringify({
          action: 'getUser',
          userId: 'user123'
        })
      };

      mockDynamoDB.get.mockReturnValue({
        promise: jest.fn().mockRejectedValue(new Error('DynamoDB error'))
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(500);
      const body = JSON.parse(result.body);
      expect(body.error).toBe('Failed to get user');
    });

    it('should handle malformed JSON', async () => {
      const event = {
        body: 'invalid json'
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(500);
      const body = JSON.parse(result.body);
      expect(body.error).toBeDefined();
    });
  });
});
