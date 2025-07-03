export default {
  testEnvironment: 'node',
  
  extensionsToTreatAsEsm: ['.js'],
  
  testMatch: [
    '**/tests/**/*.test.js',
    '**/?(*.)+(spec|test).js'
  ],
  
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/main.js',
    '!src/assets/**',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!**/*.config.js'
  ],
  
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'text-summary',
    'lcov',
    'html'
  ],
  
  transform: {
    '^.+\\.js: ['babel-jest', { useESM: true }]
  },
  
  moduleFileExtensions: [
    'js',
    'json'
  ],
  
  moduleNameMapping: {
    '^@/(.*): '<rootDir>/src/$1'
  },
  
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup.js'
  ],
  
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/amplify/#current-cloud-backend/',
    '/amplify/backend/function/'
  ],
  
  clearMocks: true,
  
  verbose: true,
  
  globals: {
    'process.env': {
      NODE_ENV: 'test'
    }
  }
};
