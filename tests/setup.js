/* eslint-disable */

process.env.NODE_ENV = 'test';
process.env.REGION = 'eu-west-1';

global.fetch = jest.fn();

const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.sessionStorage = sessionStorageMock;

try {
  require.resolve('@aws-amplify/api');
  jest.doMock('@aws-amplify/api', () => ({
    API: {
      post: jest.fn(),
      get: jest.fn(),
      put: jest.fn(),
      del: jest.fn()
    }
  }));
} catch (e) {
  console.warn('Module @aws-amplify/api not found, skipping mock setup.');
}

global.createMockAPIResponse = (data, statusCode = 200) => ({
  statusCode,
  body: JSON.stringify(data)
});

global.mockLambdaResponse = (data) => Promise.resolve({
  statusCode: 200,
  body: JSON.stringify(data)
});

beforeEach(() => {
  jest.clearAllMocks();
  
  if (global.fetch) {
    global.fetch.mockClear();
  }
  
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  localStorageMock.clear.mockClear();
  
  sessionStorageMock.getItem.mockClear();
  sessionStorageMock.setItem.mockClear();
  sessionStorageMock.removeItem.mockClear();
  sessionStorageMock.clear.mockClear();
});
