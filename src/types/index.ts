export interface UsageExample {
  title: string;
  description?: string | undefined;
  code: string;
  language: string; // 'cmake', 'cpp', 'bash', etc.
}

export interface InstallationInfo {
  conan: string;      // "conan install --requires=package/version@"
  cmake?: string;     // "find_package(package REQUIRED)"
  pkgconfig?: string; // "pkg-config --cflags --libs package"
}

export interface AuthorInfo {
  name: string;
  email?: string;
  url?: string;
}

export interface RepositoryInfo {
  type: string;
  url: string;
  directory?: string | undefined;
}

export interface PackageBasicInfo {
  name: string;
  version: string;
  description: string;
  homepage?: string | undefined;
  license: string;
  author: string | AuthorInfo;
  topics: string[];
}

export interface ConanRecipeRevision {
  id: string;
  timestamp: string;
}

export interface ConanPackageSearchResult {
  name: string;
  version: string;
  description: string;
  topics: string[];
  author: string;
  homepage?: string | undefined;
  license: string;
  created_at: string;
  updated_at: string;
}

// Tool Parameters
export interface GetPackageReadmeParams {
  package_name: string;    // Package name (required)
  version?: string;        // Version specification (optional, default: "latest")
  include_examples?: boolean; // Whether to include examples (optional, default: true)
}

export interface GetPackageInfoParams {
  package_name: string;
  include_dependencies?: boolean; // Whether to include dependencies (default: true)
  include_options?: boolean; // Whether to include package options (default: false)
}

export interface SearchPackagesParams {
  query: string;          // Search query
  limit?: number;         // Max results (default: 20)
}

// Tool Responses
export interface PackageReadmeResponse {
  package_name: string;
  version: string;
  description: string;
  readme_content: string;
  usage_examples: UsageExample[];
  installation: InstallationInfo;
  basic_info: PackageBasicInfo;
  repository?: RepositoryInfo | undefined;
}

export interface PackageInfoResponse {
  package_name: string;
  latest_version: string;
  description: string;
  author: string;
  license: string;
  topics: string[];
  dependencies?: string[] | undefined;
  options?: Record<string, unknown> | undefined;
  repository?: RepositoryInfo | undefined;
}

export interface SearchPackagesResponse {
  query: string;
  total: number;
  packages: ConanPackageSearchResult[];
}

// Cache Types
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface CacheOptions {
  ttl?: number;
  maxSize?: number;
}

// Conan Center API Types
export interface ConanCenterSearchResponse {
  results: ConanCenterPackage[];
  total_count: number;
}

export interface ConanCenterPackage {
  name: string;
  description: string;
  topics: string[];
  license: string;
  author: string;
  homepage?: string | undefined;
  created_at: string;
  updated_at: string;
  latest_version: string;
}

export interface ConanCenterRecipeResponse {
  name: string;
  description: string;
  topics: string[];
  license: string;
  author: string;
  homepage?: string | undefined;
  created_at: string;
  updated_at: string;
  versions: {
    [version: string]: {
      revisions: ConanRecipeRevision[];
    };
  };
  latest_version: string;
}

export interface ConanRecipeDetails {
  name: string;
  version: string;
  description: string;
  license: string;
  author: string;
  homepage?: string | undefined;
  topics: string[];
  requires?: string[] | undefined;
  options?: Record<string, unknown> | undefined;
  generators?: string[] | undefined;
  settings?: string[] | undefined;
}

// GitHub API Types (for README fetching)
export interface GitHubReadmeResponse {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string;
  type: string;
  content: string;
  encoding: string;
  _links: {
    self: string;
    git: string;
    html: string;
  };
}

// Error Types
export class ConanPackageReadmeMcpError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ConanPackageReadmeMcpError';
  }
}

export class PackageNotFoundError extends ConanPackageReadmeMcpError {
  constructor(packageName: string) {
    super(`Package '${packageName}' not found`, 'PACKAGE_NOT_FOUND', 404);
  }
}

export class VersionNotFoundError extends ConanPackageReadmeMcpError {
  constructor(packageName: string, version: string) {
    super(`Version '${version}' of package '${packageName}' not found`, 'VERSION_NOT_FOUND', 404);
  }
}

export class RateLimitError extends ConanPackageReadmeMcpError {
  constructor(service: string, retryAfter?: number) {
    super(`Rate limit exceeded for ${service}`, 'RATE_LIMIT_EXCEEDED', 429, { retryAfter });
  }
}

export class NetworkError extends ConanPackageReadmeMcpError {
  constructor(message: string, originalError?: Error) {
    super(`Network error: ${message}`, 'NETWORK_ERROR', undefined, originalError);
  }
}