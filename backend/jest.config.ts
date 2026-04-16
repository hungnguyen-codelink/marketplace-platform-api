import type { Config } from 'jest';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env file for tests
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
};

export default config;
