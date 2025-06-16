import { cache, createCacheKey } from '../services/cache.js';
import { conanCenterApi } from '../services/conan-center-api.js';
import { logger } from '../utils/logger.js';
import { validateSearchQuery, validateLimit } from '../utils/validators.js';
import { handleApiError } from '../utils/error-handler.js';
import type { SearchPackagesParams, SearchPackagesResponse, ConanPackageSearchResult } from '../types/index.js';

export async function searchPackages(params: SearchPackagesParams): Promise<SearchPackagesResponse> {
  try {
    // Validate parameters
    const query = validateSearchQuery(params.query);
    const limit = validateLimit(params.limit);

    logger.debug(`Searching packages with query: "${query}", limit: ${limit}`);

    // Check cache first
    const cacheKey = createCacheKey.searchResults(query, limit);
    const cached = cache.get<SearchPackagesResponse>(cacheKey);
    if (cached) {
      logger.debug(`Using cached search results for: ${query}`);
      return cached;
    }

    // Search packages using Conan Center API
    const searchResponse = await conanCenterApi.searchPackages(query, limit);

    // Transform the results to our format
    const packages: ConanPackageSearchResult[] = searchResponse.results.map(pkg => ({
      name: pkg.name,
      version: pkg.latest_version,
      description: pkg.description,
      topics: pkg.topics,
      author: pkg.author,
      homepage: pkg.homepage,
      license: pkg.license,
      created_at: pkg.created_at,
      updated_at: pkg.updated_at,
    }));

    const result: SearchPackagesResponse = {
      query,
      total: searchResponse.total_count,
      packages,
    };

    // Cache the result
    cache.set(cacheKey, result, 900 * 1000); // Cache for 15 minutes

    logger.info(`Found ${packages.length} packages for query: "${query}"`);
    return result;
  } catch (error) {
    handleApiError(error, `search packages with query "${params.query}"`);
  }
}