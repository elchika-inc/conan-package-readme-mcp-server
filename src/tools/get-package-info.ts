import { cache, createCacheKey } from '../services/cache.js';
import { conanCenterApi } from '../services/conan-center-api.js';
import { logger } from '../utils/logger.js';
import { validatePackageName, validateBoolean } from '../utils/validators.js';
import { handleApiError } from '../utils/error-handler.js';
import type { GetPackageInfoParams, PackageInfoResponse, RepositoryInfo } from '../types/index.js';

export async function getPackageInfo(params: GetPackageInfoParams): Promise<PackageInfoResponse> {
  try {
    // Validate parameters
    const packageName = validatePackageName(params.package_name);
    const includeDependencies = validateBoolean(params.include_dependencies, 'include_dependencies') ?? true;
    const includeOptions = validateBoolean(params.include_options, 'include_options') ?? false;

    logger.debug(`Getting package info for ${packageName}`);

    // Check cache first
    const cacheKey = createCacheKey.packageInfo(packageName, 'latest');
    const cached = cache.get<PackageInfoResponse>(cacheKey);
    if (cached) {
      logger.debug(`Using cached info for ${packageName}`);
      return cached;
    }

    // Verify package exists by trying to get its recipe info
    logger.debug(`Checking package existence: ${packageName}`);
    let recipeInfo;
    let packageExists = true;
    
    try {
      recipeInfo = await conanCenterApi.getRecipeInfo(packageName);
      logger.debug(`Package found: ${packageName}`);
    } catch (error) {
      logger.debug(`Package not found: ${packageName}`);
      packageExists = false;
      
      // Return a response indicating the package doesn't exist
      const result: PackageInfoResponse = {
        name: packageName,
        package_name: packageName,
        latest_version: '',
        description: '',
        author: '',
        license: '',
        topics: [],
        exists: false,
      };
      
      // Cache the negative result briefly
      cache.set(cacheKey, result, 300 * 1000); // Cache for 5 minutes
      
      return result;
    }
    
    if (!packageExists || !recipeInfo) {
      throw new Error(`Failed to get package information for '${packageName}'`);
    }

    // Get recipe details for dependencies and options if requested
    let dependencies: string[] | undefined;
    let options: Record<string, unknown> | undefined;

    if (includeDependencies || includeOptions) {
      const recipeDetails = await conanCenterApi.getRecipeDetails(packageName, recipeInfo.latest_version);
      
      if (recipeDetails) {
        if (includeDependencies) {
          dependencies = recipeDetails.requires;
        }
        if (includeOptions) {
          options = recipeDetails.options;
        }
      }
    }

    // Create repository info
    let repository: RepositoryInfo | undefined;
    if (recipeInfo.homepage) {
      repository = {
        type: 'git',
        url: recipeInfo.homepage,
      };
    }

    const result: PackageInfoResponse = {
      name: packageName,
      package_name: packageName,
      latest_version: recipeInfo.latest_version,
      versions: Object.keys(recipeInfo.versions).sort(),
      description: recipeInfo.description,
      author: recipeInfo.author,
      license: recipeInfo.license,
      ...(recipeInfo.homepage && { homepage: recipeInfo.homepage }),
      topics: recipeInfo.topics,
      dependencies,
      options,
      repository,
      ...(recipeInfo.created_at && { created_at: recipeInfo.created_at }),
      ...(recipeInfo.updated_at && { updated_at: recipeInfo.updated_at }),
      exists: true,
    };

    // Cache the result
    cache.set(cacheKey, result, 1800 * 1000); // Cache for 30 minutes

    logger.info(`Successfully retrieved info for ${packageName}`);
    return result;
  } catch (error) {
    handleApiError(error, `get package info for ${params.package_name}`);
  }
}