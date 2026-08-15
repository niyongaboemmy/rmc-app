const nextJest = require('next/jest');

const createJestConfig = nextJest({ dir: './' });

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  // `.next_bak_root2` is a stale standalone build kept around in the repo; without it
  // here jest-haste-map reports a module-name collision on every run.
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/.next_bak_root2/',
    '<rootDir>/node_modules/',
  ],
  modulePathIgnorePatterns: ['<rootDir>/.next_bak_root2/'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts'],
};

module.exports = createJestConfig(customJestConfig);
