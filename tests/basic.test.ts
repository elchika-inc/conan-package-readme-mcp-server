import { describe, it, expect } from 'vitest';

describe('Conan Package README MCP Server', () => {
  it('should have basic structure', () => {
    // Basic test to verify the test setup works
    expect(true).toBe(true);
  });

  it('should have package.json', () => {
    const packageJson = require('../package.json');
    expect(packageJson.name).toBe('conan-package-readme-mcp-server');
  });

  it('should have TypeScript configuration', () => {
    const tsConfig = require('../tsconfig.json');
    expect(tsConfig.compilerOptions).toBeDefined();
  });
});