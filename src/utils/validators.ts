import { ConanPackageReadmeMcpError } from '../types/index.js';

export function validatePackageName(packageName: unknown): string {
  if (typeof packageName !== 'string') {
    throw new ConanPackageReadmeMcpError(
      'Package name must be a string',
      'INVALID_PACKAGE_NAME'
    );
  }

  if (packageName.trim().length === 0) {
    throw new ConanPackageReadmeMcpError(
      'Package name cannot be empty',
      'INVALID_PACKAGE_NAME'
    );
  }

  // Conan package names can contain letters, numbers, hyphens, underscores, and dots
  const validNameRegex = /^[a-zA-Z0-9._-]+$/;
  if (!validNameRegex.test(packageName)) {
    throw new ConanPackageReadmeMcpError(
      'Package name contains invalid characters. Only letters, numbers, dots, hyphens, and underscores are allowed',
      'INVALID_PACKAGE_NAME'
    );
  }

  return packageName.trim();
}

export function validateVersion(version: unknown): string | undefined {
  if (version === undefined || version === null) {
    return undefined;
  }

  if (typeof version !== 'string') {
    throw new ConanPackageReadmeMcpError(
      'Version must be a string',
      'INVALID_VERSION'
    );
  }

  if (version.trim().length === 0) {
    return undefined;
  }

  // Basic version validation - Conan supports various version formats
  const validVersionRegex = /^[a-zA-Z0-9._-]+$/;
  if (!validVersionRegex.test(version)) {
    throw new ConanPackageReadmeMcpError(
      'Version contains invalid characters',
      'INVALID_VERSION'
    );
  }

  return version.trim();
}

export function validateSearchQuery(query: unknown): string {
  if (typeof query !== 'string') {
    throw new ConanPackageReadmeMcpError(
      'Search query must be a string',
      'INVALID_SEARCH_QUERY'
    );
  }

  if (query.trim().length === 0) {
    throw new ConanPackageReadmeMcpError(
      'Search query cannot be empty',
      'INVALID_SEARCH_QUERY'
    );
  }

  if (query.length > 200) {
    throw new ConanPackageReadmeMcpError(
      'Search query is too long (maximum 200 characters)',
      'INVALID_SEARCH_QUERY'
    );
  }

  return query.trim();
}

export function validateLimit(limit: unknown): number {
  if (limit === undefined || limit === null) {
    return 20; // Default limit
  }

  if (typeof limit !== 'number') {
    throw new ConanPackageReadmeMcpError(
      'Limit must be a number',
      'INVALID_LIMIT'
    );
  }

  if (!Number.isInteger(limit)) {
    throw new ConanPackageReadmeMcpError(
      'Limit must be an integer',
      'INVALID_LIMIT'
    );
  }

  if (limit < 1) {
    throw new ConanPackageReadmeMcpError(
      'Limit must be at least 1',
      'INVALID_LIMIT'
    );
  }

  if (limit > 100) {
    throw new ConanPackageReadmeMcpError(
      'Limit cannot exceed 100',
      'INVALID_LIMIT'
    );
  }

  return limit;
}

export function validateBoolean(value: unknown, fieldName: string): boolean | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== 'boolean') {
    throw new ConanPackageReadmeMcpError(
      `${fieldName} must be a boolean`,
      'INVALID_PARAMETER'
    );
  }

  return value;
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function sanitizeString(str: unknown): string {
  if (typeof str !== 'string') {
    return '';
  }
  
  // eslint-disable-next-line no-control-regex
  return str.trim().replace(/[\x00-\x1F\x7F]/g, ''); // Remove control characters
}