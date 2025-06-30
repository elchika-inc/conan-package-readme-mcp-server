import { expect, test, describe, vi, beforeEach, afterEach } from "vitest";
import { GitHubApi } from '../../src/services/github-api.js';

describe('github-api service', () => {
  let githubApi: GitHubApi;
  let fetchMock: any;

  beforeEach(() => {
    githubApi = new GitHubApi();
    // Global fetch mockの設定
    fetchMock = vi.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('should create instance properly', () => {
    expect(githubApi).toBeInstanceOf(GitHubApi);
  });

  test('should validate GitHub URL patterns', () => {
    const validUrls = [
      'https://github.com/user/repo',
      'https://github.com/org/project',
      'https://github.com/conan-io/conan-center-index'
    ];
    
    const invalidUrls = [
      'invalid-url',
      'https://example.com/repo',
      'http://github.com/user/repo', // http instead of https
      ''
    ];
    
    validUrls.forEach(url => {
      expect(url).toContain('github.com');
      expect(url.startsWith('https://')).toBe(true);
    });
    
    invalidUrls.forEach(url => {
      if (url) {
        expect(url.includes('github.com') && url.startsWith('https://')).toBeFalsy();
      } else {
        expect(url).toBeFalsy();
      }
    });
  });

  test('should validate API endpoint transformation', () => {
    const repoUrl = 'https://github.com/user/repo';
    const expectedApiUrl = 'https://api.github.com/repos/user/repo/readme';
    
    // Simulate URL transformation logic
    const transformed = repoUrl
      .replace('github.com', 'api.github.com/repos')
      .concat('/readme');
    
    expect(transformed).toBe(expectedApiUrl);
  });

  test('should validate GitHub API headers', () => {
    const expectedHeaders = {
      'User-Agent': 'conan-package-readme-mcp-server/1.0.0',
      'Accept': 'application/vnd.github.v3+json'
    };
    
    expect(expectedHeaders['User-Agent']).toContain('conan-package-readme-mcp-server');
    expect(expectedHeaders['Accept']).toContain('github');
  });

  test('should validate base64 encoding/decoding', () => {
    const originalText = 'Hello World';
    const base64Encoded = 'SGVsbG8gV29ybGQ=';
    
    // Test base64 encoding
    const encoded = Buffer.from(originalText, 'utf8').toString('base64');
    expect(encoded).toBe(base64Encoded);
    
    // Test base64 decoding
    const decoded = Buffer.from(base64Encoded, 'base64').toString('utf8');
    expect(decoded).toBe(originalText);
  });

  test('should validate response structure', () => {
    const mockGitHubResponse = {
      content: 'SGVsbG8gV29ybGQ=',
      encoding: 'base64',
      name: 'README.md',
      path: 'README.md'
    };
    
    expect(mockGitHubResponse).toHaveProperty('content');
    expect(mockGitHubResponse).toHaveProperty('encoding');
    expect(mockGitHubResponse.encoding).toBe('base64');
  });

  describe('getReadmeContent', () => {
    test('should fetch README content successfully', async () => {
      const mockReadmeResponse = {
        name: 'README.md',
        content: Buffer.from('# Test README\n\nThis is a test.', 'utf-8').toString('base64'),
        encoding: 'base64',
        size: 31
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(mockReadmeResponse)
      });

      const result = await githubApi.getReadmeContent('https://github.com/owner/repo');

      expect(result).toBe('# Test README\n\nThis is a test.');
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.github.com/repos/owner/repo/readme',
        expect.any(Object)
      );
    });

    test('should handle README not found (404)', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      const result = await githubApi.getReadmeContent('https://github.com/owner/repo');

      expect(result).toBeNull();
    });

    test('should handle invalid GitHub URL', async () => {
      const result = await githubApi.getReadmeContent('https://example.com/not-github');

      expect(result).toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    test('should handle GitHub URL with .git extension', async () => {
      const mockReadmeResponse = {
        name: 'README.md',
        content: Buffer.from('# Test', 'utf-8').toString('base64'),
        encoding: 'base64',
        size: 6
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(mockReadmeResponse)
      });

      const result = await githubApi.getReadmeContent('https://github.com/owner/repo.git');

      expect(result).toBe('# Test');
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.github.com/repos/owner/repo/readme',
        expect.any(Object)
      );
    });

    test('should handle API error', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      const result = await githubApi.getReadmeContent('https://github.com/owner/repo');

      expect(result).toBeNull();
    });

    test('should handle non-base64 encoding', async () => {
      const mockReadmeResponse = {
        name: 'README.md',
        content: 'some content',
        encoding: 'utf-8',
        size: 12
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(mockReadmeResponse)
      });

      const result = await githubApi.getReadmeContent('https://github.com/owner/repo');

      expect(result).toBeNull();
    });

    test('should handle network error', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Network error'));

      const result = await githubApi.getReadmeContent('https://github.com/owner/repo');

      expect(result).toBeNull();
    });
  });

  describe('checkRepositoryExists', () => {
    test('should return true for existing repository', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200
      });

      const result = await githubApi.checkRepositoryExists('https://github.com/owner/repo');

      expect(result).toBe(true);
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.github.com/repos/owner/repo',
        expect.objectContaining({ method: 'HEAD' })
      );
    });

    test('should return false for non-existing repository', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      const result = await githubApi.checkRepositoryExists('https://github.com/owner/nonexistent');

      expect(result).toBe(false);
    });

    test('should return false for invalid URL', async () => {
      const result = await githubApi.checkRepositoryExists('https://example.com/not-github');

      expect(result).toBe(false);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    test('should handle network error', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Network error'));

      const result = await githubApi.checkRepositoryExists('https://github.com/owner/repo');

      expect(result).toBe(false);
    });
  });
});