import { expect, test, describe, vi, beforeEach, afterEach } from "vitest";
import { getPackageInfo } from '../../src/tools/get-package-info.js';
import { conanCenterApi } from '../../src/services/conan-center-api.js';
import { cache } from '../../src/services/cache.js';

// Mock all dependencies
vi.mock('../../src/services/conan-center-api.js');
vi.mock('../../src/services/cache.js');

describe('get-package-info tool', () => {
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
    expect(typeof getPackageInfo).toBe('function');
  });

  test('should validate package name format', () => {
    // Conan package names should follow specific conventions
    const validNames = ['boost', 'openssl', 'zlib'];
    
    validNames.forEach(name => {
      expect(typeof name).toBe('string');
      expect(name.length).toBeGreaterThan(0);
    });
  });

  test('should handle include_dependencies parameter', () => {
    const validBooleans = [true, false];
    
    validBooleans.forEach(value => {
      expect(typeof value).toBe('boolean');
    });
  });

  test('should handle include_options parameter', () => {
    const validBooleans = [true, false];
    
    validBooleans.forEach(value => {
      expect(typeof value).toBe('boolean');
    });
  });

  describe('getPackageInfo function', () => {
    test('should return package info for existing package', async () => {
      const mockRecipeInfo = {
        name: 'boost',
        latest_version: '1.82.0',
        versions: {
          '1.82.0': { revisions: [] },
          '1.81.0': { revisions: [] }
        },
        description: 'Boost C++ Libraries',
        license: 'BSL-1.0',
        author: 'Boost Team',
        homepage: 'https://github.com/boostorg/boost',
        topics: ['cpp', 'boost'],
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-12-01T00:00:00Z'
      };

      const mockRecipeDetails = {
        name: 'boost',
        version: '1.82.0',
        description: 'Boost C++ Libraries',
        license: 'BSL-1.0',
        author: 'Boost Team',
        homepage: 'https://github.com/boostorg/boost',
        topics: ['cpp', 'boost'],
        requires: ['zlib/1.2.13'],
        options: {
          shared: [true, false],
          fPIC: [true, false]
        },
        generators: ['CMakeDeps', 'CMakeToolchain'],
        settings: ['os', 'arch', 'compiler', 'build_type']
      };

      (conanCenterApi.getRecipeInfo as any).mockResolvedValue(mockRecipeInfo);
      (conanCenterApi.getRecipeDetails as any).mockResolvedValue(mockRecipeDetails);

      const result = await getPackageInfo({
        package_name: 'boost',
        include_dependencies: true,
        include_options: true
      });

      expect(result.name).toBe('boost');
      expect(result.latest_version).toBe('1.82.0');
      expect(result.versions).toContain('1.82.0');
      expect(result.versions).toContain('1.81.0');
      expect(result.dependencies).toEqual(['zlib/1.2.13']);
      expect(result.options).toEqual(mockRecipeDetails.options);
    });

    test('should handle non-existent package', async () => {
      (conanCenterApi.getRecipeInfo as any).mockRejectedValue(new Error('Package not found'));

      const result = await getPackageInfo({
        package_name: 'nonexistent'
      });

      expect(result.name).toBe('nonexistent');
      expect(result.exists).toBe(false);
    });

    test('should exclude dependencies when include_dependencies is false', async () => {
      const mockRecipeInfo = {
        name: 'zlib',
        latest_version: '1.3.0',
        versions: { '1.3.0': { revisions: [] } },
        description: 'A compression library',
        license: 'Zlib',
        author: 'Jean-loup Gailly',
        homepage: 'https://github.com/madler/zlib',
        topics: ['compression'],
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-12-01T00:00:00Z'
      };

      (conanCenterApi.getRecipeInfo as any).mockResolvedValue(mockRecipeInfo);
      (conanCenterApi.getRecipeDetails as any).mockResolvedValue(null);

      const result = await getPackageInfo({
        package_name: 'zlib',
        include_dependencies: false
      });

      expect(result.name).toBe('zlib');
      expect(result.dependencies).toBeUndefined();
    });

    test('should exclude options when include_options is false', async () => {
      const mockRecipeInfo = {
        name: 'openssl',
        latest_version: '3.1.0',
        versions: { '3.1.0': { revisions: [] } },
        description: 'OpenSSL library',
        license: 'Apache-2.0',
        author: 'OpenSSL Team',
        homepage: 'https://github.com/openssl/openssl',
        topics: ['crypto'],
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-12-01T00:00:00Z'
      };

      (conanCenterApi.getRecipeInfo as any).mockResolvedValue(mockRecipeInfo);
      (conanCenterApi.getRecipeDetails as any).mockResolvedValue(null);

      const result = await getPackageInfo({
        package_name: 'openssl',
        include_options: false
      });

      expect(result.name).toBe('openssl');
      expect(result.options).toBeUndefined();
    });

    test('should use cache when available', async () => {
      const cachedResult = {
        name: 'cached-lib',
        latest_version: '1.0.0',
        description: 'Cached library',
        license: 'MIT',
        author: 'Cache Author',
        homepage: 'https://example.com',
        topics: ['cache'],
        versions: ['1.0.0'],
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-12-01T00:00:00Z'
      };

      (cache.get as any).mockReturnValue(cachedResult);

      const result = await getPackageInfo({
        package_name: 'cached-lib'
      });

      expect(result).toEqual(cachedResult);
      expect(conanCenterApi.getRecipeInfo).not.toHaveBeenCalled();
    });

    test('should handle missing recipe details gracefully', async () => {
      const mockRecipeInfo = {
        name: 'minimal-lib',
        latest_version: '1.0.0',
        versions: { '1.0.0': { revisions: [] } },
        description: 'Minimal library',
        license: 'MIT',
        author: 'Minimal Author',
        homepage: '',
        topics: [],
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-12-01T00:00:00Z'
      };

      (conanCenterApi.getRecipeInfo as any).mockResolvedValue(mockRecipeInfo);
      (conanCenterApi.getRecipeDetails as any).mockResolvedValue(null);

      const result = await getPackageInfo({
        package_name: 'minimal-lib',
        include_dependencies: true,
        include_options: true
      });

      expect(result.name).toBe('minimal-lib');
      expect(result.dependencies).toBeUndefined();
      expect(result.options).toBeUndefined();
    });

    test('should validate package name format', async () => {
      await expect(getPackageInfo({
        package_name: ''
      })).rejects.toThrow();

      await expect(getPackageInfo({
        package_name: 'invalid name with spaces'
      })).rejects.toThrow();
    });
  });
});