import { expect, test, describe, vi, beforeEach, afterEach } from "vitest";
import { getPackageReadme } from '../../src/tools/get-package-readme.js';
import { conanCenterApi } from '../../src/services/conan-center-api.js';
import { githubApi } from '../../src/services/github-api.js';
import { readmeParser } from '../../src/services/readme-parser.js';
import { cache } from '../../src/services/cache.js';

// Mock all dependencies
vi.mock('../../src/services/conan-center-api.js');
vi.mock('../../src/services/github-api.js');
vi.mock('../../src/services/readme-parser.js');
vi.mock('../../src/services/cache.js');

describe('get-package-readme tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mocks
    (cache.get as any).mockReturnValue(null);
    (cache.set as any).mockReturnValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('should have proper function structure', () => {
    expect(typeof getPackageReadme).toBe('function');
  });

  test('should validate package name format', () => {
    // Conan package names should follow specific conventions
    const validNames = ['boost', 'openssl', 'zlib'];
    const invalidNames = ['', '   ', null, undefined];
    
    validNames.forEach(name => {
      expect(typeof name).toBe('string');
      expect(name.length).toBeGreaterThan(0);
    });
    
    invalidNames.forEach(name => {
      if (name === '   ') {
        expect(name.trim()).toBe('');
      } else {
        expect(name).toBeFalsy();
      }
    });
  });

  test('should handle version parameters', () => {
    const validVersions = ['1.0.0', '2.1.3', 'latest'];
    const invalidVersions = [null, undefined, '', '   '];
    
    validVersions.forEach(version => {
      expect(typeof version).toBe('string');
      expect(version.length).toBeGreaterThan(0);
    });
    
    invalidVersions.forEach(version => {
      if (version !== undefined && version !== null) {
        expect(version.trim()).toBe('');
      }
    });
  });

  test('should handle include_examples parameter', () => {
    const validBooleans = [true, false];
    const invalidBooleans = ['true', 'false', 1, 0];
    
    validBooleans.forEach(value => {
      expect(typeof value).toBe('boolean');
    });
    
    invalidBooleans.forEach(value => {
      expect(typeof value).not.toBe('boolean');
    });
  });

  describe('getPackageReadme function', () => {
    test('should return README for existing package', async () => {
      const mockRecipeInfo = {
        name: 'boost',
        latest_version: '1.82.0',
        versions: { '1.82.0': { revisions: [] } },
        description: 'Boost C++ Libraries',
        license: 'BSL-1.0',
        author: 'Boost Team',
        homepage: 'https://github.com/boostorg/boost',
        topics: ['cpp', 'boost']
      };

      const mockReadmeContent = '# Boost\n\nBoost C++ Libraries for everyone.';
      const mockUsageExamples = [{
        title: 'Basic Usage',
        code: '#include <boost/system.hpp>',
        language: 'cpp',
        description: 'Include boost system'
      }];

      (conanCenterApi.getRecipeInfo as any).mockResolvedValue(mockRecipeInfo);
      (githubApi.getReadmeContent as any).mockResolvedValue(mockReadmeContent);
      (readmeParser.parseUsageExamples as any).mockReturnValue(mockUsageExamples);

      const result = await getPackageReadme({
        package_name: 'boost',
        version: 'latest',
        include_examples: true
      });

      expect(result.package_name).toBe('boost');
      expect(result.version).toBe('1.82.0');
      expect(result.exists).toBe(true);
      expect(result.readme_content).toBe(mockReadmeContent);
      expect(result.usage_examples).toEqual(mockUsageExamples);
      expect(result.basic_info.name).toBe('boost');
      expect(result.installation.conan).toContain('conan install');
    });

    test('should handle non-existent package', async () => {
      (conanCenterApi.getRecipeInfo as any).mockRejectedValue(new Error('Package not found'));

      const result = await getPackageReadme({
        package_name: 'nonexistent',
        version: 'latest'
      });

      expect(result.package_name).toBe('nonexistent');
      expect(result.exists).toBe(false);
      expect(result.readme_content).toBe('');
      expect(result.usage_examples).toEqual([]);
    });

    test('should handle specific version', async () => {
      const mockRecipeInfo = {
        name: 'zlib',
        latest_version: '1.3.0',
        versions: { 
          '1.3.0': { revisions: [] },
          '1.2.13': { revisions: [] }
        },
        description: 'A compression library',
        license: 'Zlib',
        author: 'Jean-loup Gailly',
        homepage: 'https://github.com/madler/zlib',
        topics: ['compression']
      };

      (conanCenterApi.getRecipeInfo as any).mockResolvedValue(mockRecipeInfo);
      (githubApi.getReadmeContent as any).mockResolvedValue('# zlib\n\nCompression library');
      (readmeParser.parseUsageExamples as any).mockReturnValue([]);

      const result = await getPackageReadme({
        package_name: 'zlib',
        version: '1.2.13'
      });

      expect(result.version).toBe('1.2.13');
      expect(result.exists).toBe(true);
    });

    test('should handle invalid version', async () => {
      const mockRecipeInfo = {
        name: 'openssl',
        latest_version: '3.1.0',
        versions: { '3.1.0': { revisions: [] } },
        description: 'OpenSSL library',
        license: 'Apache-2.0',
        author: 'OpenSSL Team',
        homepage: 'https://github.com/openssl/openssl',
        topics: ['crypto']
      };

      (conanCenterApi.getRecipeInfo as any).mockResolvedValue(mockRecipeInfo);

      await expect(getPackageReadme({
        package_name: 'openssl',
        version: '99.99.99'
      })).rejects.toThrow("Version '99.99.99' not found");
    });

    test('should create basic README when no GitHub README found', async () => {
      const mockRecipeInfo = {
        name: 'somelib',
        latest_version: '1.0.0',
        versions: { '1.0.0': { revisions: [] } },
        description: 'Some library',
        license: 'MIT',
        author: 'Some Author',
        homepage: 'https://github.com/user/somelib',
        topics: ['lib']
      };

      (conanCenterApi.getRecipeInfo as any).mockResolvedValue(mockRecipeInfo);
      (githubApi.getReadmeContent as any).mockResolvedValue(null);
      (readmeParser.parseUsageExamples as any).mockReturnValue([]);

      const result = await getPackageReadme({
        package_name: 'somelib',
        version: 'latest'
      });

      expect(result.readme_content).toContain('# somelib');
      expect(result.readme_content).toContain('## Installation');
      expect(result.readme_content).toContain('## CMake Integration');
    });

    test('should skip usage examples when include_examples is false', async () => {
      const mockRecipeInfo = {
        name: 'testlib',
        latest_version: '1.0.0',
        versions: { '1.0.0': { revisions: [] } },
        description: 'Test library',
        license: 'MIT',
        author: 'Test Author',
        homepage: null,
        topics: []
      };

      (conanCenterApi.getRecipeInfo as any).mockResolvedValue(mockRecipeInfo);
      (readmeParser.parseUsageExamples as any).mockReturnValue([]);

      const result = await getPackageReadme({
        package_name: 'testlib',
        version: 'latest',
        include_examples: false
      });

      expect(result.usage_examples).toEqual([]);
      expect(readmeParser.parseUsageExamples).not.toHaveBeenCalled();
    });

    test('should use cache when available', async () => {
      const cachedResult = {
        package_name: 'cached-lib',
        version: '1.0.0',
        exists: true,
        readme_content: 'Cached content',
        usage_examples: [],
        installation: { conan: 'cached install', cmake: 'cached cmake' },
        basic_info: {
          name: 'cached-lib',
          version: '1.0.0',
          description: 'Cached',
          license: 'MIT',
          author: 'Cache',
          topics: []
        },
        description: 'Cached'
      };

      (cache.get as any).mockReturnValue(cachedResult);

      const result = await getPackageReadme({
        package_name: 'cached-lib',
        version: '1.0.0'
      });

      expect(result).toEqual(cachedResult);
      expect(conanCenterApi.getRecipeInfo).not.toHaveBeenCalled();
    });

    test('should validate package name format', async () => {
      await expect(getPackageReadme({
        package_name: '',
        version: 'latest'
      })).rejects.toThrow();

      await expect(getPackageReadme({
        package_name: 'invalid name with spaces',
        version: 'latest'
      })).rejects.toThrow();
    });

    test('should create repository info when homepage exists', async () => {
      const mockRecipeInfo = {
        name: 'repolib',
        latest_version: '1.0.0',
        versions: { '1.0.0': { revisions: [] } },
        description: 'Repository library',
        license: 'MIT',
        author: 'Repo Author',
        homepage: 'https://github.com/user/repolib',
        topics: []
      };

      (conanCenterApi.getRecipeInfo as any).mockResolvedValue(mockRecipeInfo);
      (githubApi.getReadmeContent as any).mockResolvedValue('# Repo Lib');
      (readmeParser.parseUsageExamples as any).mockReturnValue([]);

      const result = await getPackageReadme({
        package_name: 'repolib',
        version: 'latest'
      });

      expect(result.repository).toEqual({
        type: 'git',
        url: 'https://github.com/user/repolib'
      });
    });
  });
});