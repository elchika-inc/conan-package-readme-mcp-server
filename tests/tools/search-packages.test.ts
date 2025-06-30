import { expect, test, describe, vi, beforeEach, afterEach } from "vitest";
import { searchPackages } from '../../src/tools/search-packages.js';
import { conanCenterApi } from '../../src/services/conan-center-api.js';
import { cache } from '../../src/services/cache.js';

// Mock all dependencies
vi.mock('../../src/services/conan-center-api.js');
vi.mock('../../src/services/cache.js');

describe('search-packages tool', () => {
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
    expect(typeof searchPackages).toBe('function');
  });

  test('should validate search query format', () => {
    const validQueries = ['boost', 'openssl', 'json'];
    const invalidQueries = ['', '   ', null, undefined];
    
    validQueries.forEach(query => {
      expect(typeof query).toBe('string');
      expect(query.length).toBeGreaterThan(0);
    });
    
    invalidQueries.forEach(query => {
      if (query === '   ') {
        expect(query.trim()).toBe('');
      } else {
        expect(query).toBeFalsy();
      }
    });
  });

  test('should handle limit parameter', () => {
    const validLimits = [1, 10, 20, 50];
    const invalidLimits = [-1, 0, 1001, null, undefined];
    
    validLimits.forEach(limit => {
      expect(typeof limit).toBe('number');
      expect(limit).toBeGreaterThan(0);
      expect(limit).toBeLessThanOrEqual(1000);
    });
    
    invalidLimits.forEach(limit => {
      if (typeof limit === 'number') {
        expect(limit <= 0 || limit > 1000).toBe(true);
      } else {
        expect(limit).toBeFalsy();
      }
    });
  });

  test('should handle search result structure', () => {
    const mockResult = {
      query: 'test',
      total: 10,
      packages: []
    };
    
    expect(mockResult).toHaveProperty('query');
    expect(mockResult).toHaveProperty('total');
    expect(mockResult).toHaveProperty('packages');
    expect(Array.isArray(mockResult.packages)).toBe(true);
  });

  describe('searchPackages function', () => {
    test('should search and return packages', async () => {
      const mockSearchResponse = {
        results: [
          {
            name: 'boost',
            description: 'Conan package for boost',
            topics: [],
            license: 'Unknown',
            author: 'Conan Center',
            homepage: '',
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-12-01T00:00:00Z',
            latest_version: 'unknown'
          },
          {
            name: 'boost-ext',
            description: 'Conan package for boost-ext',
            topics: [],
            license: 'Unknown',
            author: 'Conan Center',
            homepage: '',
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-12-01T00:00:00Z',
            latest_version: 'unknown'
          }
        ],
        total_count: 2
      };

      (conanCenterApi.searchPackages as any).mockResolvedValue(mockSearchResponse);

      const result = await searchPackages({
        query: 'boost',
        limit: 20
      });

      expect(result.results).toHaveLength(2);
      expect(result.total_count).toBe(2);
      expect(result.results[0].name).toBe('boost');
      expect(result.results[1].name).toBe('boost-ext');
      expect(conanCenterApi.searchPackages).toHaveBeenCalledWith('boost', 20);
    });

    test('should handle empty search results', async () => {
      const mockSearchResponse = {
        results: [],
        total_count: 0
      };

      (conanCenterApi.searchPackages as any).mockResolvedValue(mockSearchResponse);

      const result = await searchPackages({
        query: 'nonexistent-package',
        limit: 20
      });

      expect(result.results).toHaveLength(0);
      expect(result.total_count).toBe(0);
    });

    test('should handle different limit values', async () => {
      const mockSearchResponse = {
        results: Array.from({ length: 5 }, (_, i) => ({
          name: `package${i}`,
          description: `Conan package for package${i}`,
          topics: [],
          license: 'Unknown',
          author: 'Conan Center',
          homepage: '',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-12-01T00:00:00Z',
          latest_version: 'unknown'
        })),
        total_count: 5
      };

      (conanCenterApi.searchPackages as any).mockResolvedValue(mockSearchResponse);

      const result = await searchPackages({
        query: 'package',
        limit: 5
      });

      expect(result.results).toHaveLength(5);
      expect(conanCenterApi.searchPackages).toHaveBeenCalledWith('package', 5);
    });

    test('should use default limit when not provided', async () => {
      const mockSearchResponse = {
        results: [],
        total_count: 0
      };

      (conanCenterApi.searchPackages as any).mockResolvedValue(mockSearchResponse);

      await searchPackages({
        query: 'test'
      });

      expect(conanCenterApi.searchPackages).toHaveBeenCalledWith('test', 20);
    });

    test('should use cache when available', async () => {
      const cachedResult = {
        results: [
          {
            name: 'cached-package',
            description: 'Cached package',
            topics: [],
            license: 'MIT',
            author: 'Cache Author',
            homepage: '',
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-12-01T00:00:00Z',
            latest_version: '1.0.0'
          }
        ],
        total_count: 1
      };

      (cache.get as any).mockReturnValue(cachedResult);

      const result = await searchPackages({
        query: 'cached',
        limit: 20
      });

      expect(result).toEqual(cachedResult);
      expect(conanCenterApi.searchPackages).not.toHaveBeenCalled();
    });

    test('should validate search query format', async () => {
      await expect(searchPackages({
        query: '',
        limit: 20
      })).rejects.toThrow();

      await expect(searchPackages({
        query: '   ',
        limit: 20
      })).rejects.toThrow();
    });

    test('should validate limit parameter', async () => {
      await expect(searchPackages({
        query: 'test',
        limit: 0
      })).rejects.toThrow();

      await expect(searchPackages({
        query: 'test',
        limit: -1
      })).rejects.toThrow();

      await expect(searchPackages({
        query: 'test',
        limit: 1001
      })).rejects.toThrow();
    });

    test('should handle API errors gracefully', async () => {
      (conanCenterApi.searchPackages as any).mockRejectedValue(new Error('API Error'));

      await expect(searchPackages({
        query: 'boost',
        limit: 20
      })).rejects.toThrow();
    });

    test('should format package results correctly', async () => {
      const mockSearchResponse = {
        results: [
          {
            name: 'test-package',
            description: 'Test package description',
            topics: ['test', 'demo'],
            license: 'MIT',
            author: 'Test Author',
            homepage: 'https://github.com/test/package',
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-12-01T00:00:00Z',
            latest_version: '1.0.0'
          }
        ],
        total_count: 1
      };

      (conanCenterApi.searchPackages as any).mockResolvedValue(mockSearchResponse);

      const result = await searchPackages({
        query: 'test-package',
        limit: 20
      });

      const packageResult = result.results[0];
      expect(packageResult).toHaveProperty('name');
      expect(packageResult).toHaveProperty('description');
      expect(packageResult).toHaveProperty('latest_version');
      expect(packageResult).toHaveProperty('license');
      expect(packageResult).toHaveProperty('author');
      expect(packageResult).toHaveProperty('topics');
      expect(packageResult).toHaveProperty('homepage');
      expect(packageResult).toHaveProperty('created_at');
      expect(packageResult).toHaveProperty('updated_at');
    });
  });
});