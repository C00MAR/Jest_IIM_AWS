/* eslint-disable */

process.env.NODE_ENV = 'test';
process.env.REGION = 'eu-west-1';

global.AWS = {
  DynamoDB: {
    DocumentClient: jest.fn(() => ({
      put: jest.fn(),
      get: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      query: jest.fn(),
      scan: jest.fn()
    }))
  },
  config: {
    update: jest.fn()
  }
};

jest.doMock('aws-sdk', () => global.AWS);

global.createMockDynamoDBResponse = (data) => ({
  promise: jest.fn().mockResolvedValue(data)
});

global.createMockDynamoDBError = (error) => ({
  promise: jest.fn().mockRejectedValue(error)
});

global.fetch = jest.fn();
