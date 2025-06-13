// jest.config.server.cjs
/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: './server', // Run tests from the 'server' directory
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'], // Ensure .ts is prioritized
  moduleNameMapper: {
    // For imports from within source files (like adventureApi.ts)
    '^../../types\\.js$': '<rootDir>/../types.ts',
    '^../types\\.js$': '<rootDir>/../types.ts',
    '^../utils\\.js$': '<rootDir>/utils.ts',
    '^../schemas\\.js$': '<rootDir>/schemas.ts',
    '^../../server/prompts\\.js$': '<rootDir>/prompts.ts', // Used by adventureApi.ts

    // For imports within TEST files (extensionless, pointing to .ts files)
    // from server/utils/__tests__/utils.test.ts
    '^../utils$': '<rootDir>/utils.ts',
    '^../../../types$': '<rootDir>/../types.ts', // For all test files importing types

    // from server/prompts/__tests__/prompts.test.ts
    '^../prompts$': '<rootDir>/prompts.ts',

    // from server/routes/__tests__/adventureApi.test.ts
    '^../adventureApi$': '<rootDir>/routes/adventureApi.ts',
    '^../../prompts$': '<rootDir>/prompts.ts',
    '^../../utils$': '<rootDir>/utils.ts',
    '^../../schemas$': '<rootDir>/schemas.ts', // if adventureApi.test.ts imports schemas directly
  },
  setupFilesAfterEnv: ['./tests/setup.ts'],
  clearMocks: true,
};
