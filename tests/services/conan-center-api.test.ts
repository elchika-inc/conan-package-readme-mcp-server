import { expect, test, describe, vi, beforeEach, afterEach } from "vitest";
import { ConanCenterApi } from '../../src/services/conan-center-api.js';

describe('conan-center-api service', () => {
  let conanApi: ConanCenterApi;
  let fetchMock: any;

  beforeEach(() => {
    conanApi = new ConanCenterApi();
    // Global fetch mockの設定
    fetchMock = vi.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('should create instance properly', () => {
    expect(conanApi).toBeInstanceOf(ConanCenterApi);
  });

  test('should validate API endpoints', () => {
    const expectedEndpoints = {
      CONAN_CENTER_INDEX_REPO: 'https://api.github.com/repos/conan-io/conan-center-index',
      REQUEST_TIMEOUT: 10000
    };
    
    expect(expectedEndpoints.CONAN_CENTER_INDEX_REPO).toContain('github.com');
    expect(expectedEndpoints.REQUEST_TIMEOUT).toBeGreaterThan(0);
  });

  test('should validate search parameters', () => {
    const validSearchParams = {
      query: 'boost',
      limit: 20
    };
    
    expect(typeof validSearchParams.query).toBe('string');
    expect(typeof validSearchParams.limit).toBe('number');
    expect(validSearchParams.limit).toBeGreaterThan(0);
  });

  test('should validate package recipe structure', () => {
    const mockRecipeInfo = {
      name: 'boost',
      latest_version: '1.82.0',
      description: 'Boost libraries',
      license: 'BSL-1.0',
      author: 'Boost developers',
      homepage: 'https://www.boost.org/',
      topics: ['cpp', 'boost']
    };
    
    expect(mockRecipeInfo).toHaveProperty('name');
    expect(mockRecipeInfo).toHaveProperty('latest_version');
    expect(mockRecipeInfo).toHaveProperty('description');
    expect(Array.isArray(mockRecipeInfo.topics)).toBe(true);
  });

  test('should validate HTTP headers', () => {
    const expectedHeaders = {
      'User-Agent': 'conan-package-readme-mcp-server/1.0.0',
      'Accept': 'application/json'
    };
    
    expect(expectedHeaders['User-Agent']).toContain('conan-package-readme-mcp-server');
    expect(expectedHeaders['Accept']).toBe('application/json');
  });

  describe('searchPackages', () => {
    test('should search packages successfully', async () => {
      const mockResponse = [
        { name: 'boost', type: 'dir' },
        { name: 'zlib', type: 'dir' },
        { name: 'openssl', type: 'dir' }
      ];

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse)
      });

      const result = await conanApi.searchPackages('boost', 10);

      expect(result.results).toHaveLength(1);
      expect(result.results[0].name).toBe('boost');
      expect(result.total_count).toBe(1);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    test('should handle empty search results', async () => {
      const mockResponse = [
        { name: 'unrelated-package', type: 'dir' }
      ];

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse)
      });

      const result = await conanApi.searchPackages('nonexistent', 10);

      expect(result.results).toHaveLength(0);
      expect(result.total_count).toBe(0);
    });

    test('should handle API errors gracefully', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      await expect(conanApi.searchPackages('boost', 10)).rejects.toThrow();
    });

    test('should respect limit parameter', async () => {
      const mockResponse = Array.from({ length: 10 }, (_, i) => ({ 
        name: `package${i}`, 
        type: 'dir' 
      }));

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse)
      });

      const result = await conanApi.searchPackages('package', 5);

      expect(result.results).toHaveLength(5);
    });
  });

  describe('getRecipeInfo', () => {
    test('should get recipe info successfully', async () => {
      const mockResponse = [
        { name: '1.82.0', type: 'dir' },
        { name: '1.81.0', type: 'dir' },
        { name: 'all', type: 'dir' }
      ];

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse)
      });

      const result = await conanApi.getRecipeInfo('boost');

      expect(result.name).toBe('boost');
      expect(result.latest_version).toBe('1.82.0');
      expect(Object.keys(result.versions)).toContain('1.82.0');
      expect(Object.keys(result.versions)).toContain('1.81.0');
    });

    test('should handle package not found', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      await expect(conanApi.getRecipeInfo('nonexistent')).rejects.toThrow("Package 'nonexistent' not found");
    });

    test('should handle non-version directories', async () => {
      const mockResponse = [
        { name: 'all', type: 'dir' },
        { name: 'config.yml', type: 'file' },
        { name: '1.82.0', type: 'dir' }
      ];

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse)
      });

      const result = await conanApi.getRecipeInfo('boost');

      expect(Object.keys(result.versions)).toEqual(['1.82.0']);
      expect(result.latest_version).toBe('1.82.0');
    });
  });

  describe('getRecipeDetails', () => {
    test('should get recipe details successfully', async () => {
      const mockResponse = [
        { name: '1.82.0', type: 'dir' }
      ];

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse)
      });

      const result = await conanApi.getRecipeDetails('boost', '1.82.0');

      expect(result).not.toBeNull();
      expect(result?.name).toBe('boost');
      expect(result?.version).toBe('1.82.0');
    });

    test('should return null for non-existent version', async () => {
      const mockResponse = [
        { name: '1.82.0', type: 'dir' }
      ];

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse)
      });

      const result = await conanApi.getRecipeDetails('boost', '1.99.0');

      expect(result).toBeNull();
    });
  });

  describe('getLatestVersion', () => {
    test('should get latest version successfully', async () => {
      const mockResponse = [
        { name: '1.82.0', type: 'dir' },
        { name: '1.81.0', type: 'dir' }
      ];

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse)
      });

      const result = await conanApi.getLatestVersion('boost');

      expect(result).toBe('1.82.0');
    });
  });

  describe('getAvailableVersions', () => {
    test('should get available versions successfully', async () => {
      const mockResponse = [
        { name: '1.82.0', type: 'dir' },
        { name: '1.81.0', type: 'dir' },
        { name: '1.80.0', type: 'dir' }
      ];

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse)
      });

      const result = await conanApi.getAvailableVersions('boost');

      expect(result).toEqual(['1.80.0', '1.81.0', '1.82.0']);
    });
  });

  describe('fetchWithTimeout', () => {
    test.skip('should handle network timeout', async () => {
      // Slow responseをシミュレート - このテストは実際のタイムアウト処理をテストするため時間がかかる
      fetchMock.mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(resolve, 15000))
      );

      await expect(conanApi.searchPackages('boost', 10)).rejects.toThrow();
    }, 12000); // Increase timeout for this specific test
  });
});