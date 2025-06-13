// jest.config.client.cjs
/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom', // Use jsdom for React components
  rootDir: './', // Root of the project
  roots: [ // Look for tests within these directories
    '<rootDir>/src',
    '<rootDir>/components',
    '<rootDir>/services'
  ],
  testMatch: ['**/__tests__/**/*.test.tsx', '**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    // Handle CSS Modules (if used - assuming .module.css naming convention)
    '\\.module\\.(css|less|sass|scss)$': 'identity-obj-proxy',
    // Handle other CSS files (e.g. index.css or component-specific non-module css)
    '\\.(css|less|sass|scss)$': '<rootDir>/__mocks__/styleMock.js',
    // Handle static assets like images
    '\\.(gif|ttf|eot|svg|png|jpg|jpeg)$': '<rootDir>/__mocks__/fileMock.js',
    // Handle path aliases from tsconfig.json (e.g., "@/*": ["src/*"])
    // This regex assumes @/ refers to src/
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.json', // Ensure it uses the correct tsconfig for client (usually the root one)
    }],
  },
  // collectCoverage: true, // Optional: uncomment to enable coverage reports
  // coverageReporters: ['json', 'lcov', 'text', 'clover'], // Optional
  // coverageDirectory: 'coverage/client', // Optional
};
