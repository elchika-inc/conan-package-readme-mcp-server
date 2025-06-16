import { cache, createCacheKey } from '../services/cache.js';
import { conanCenterApi } from '../services/conan-center-api.js';
import { githubApi } from '../services/github-api.js';
import { readmeParser } from '../services/readme-parser.js';
import { logger } from '../utils/logger.js';
import { validatePackageName, validateVersion, validateBoolean } from '../utils/validators.js';
import { handleApiError } from '../utils/error-handler.js';
import type { GetPackageReadmeParams, PackageReadmeResponse, UsageExample, InstallationInfo, PackageBasicInfo, RepositoryInfo } from '../types/index.js';

export async function getPackageReadme(params: GetPackageReadmeParams): Promise<PackageReadmeResponse> {
  try {
    // Validate parameters
    const packageName = validatePackageName(params.package_name);
    const version = validateVersion(params.version) || 'latest';
    const includeExamples = validateBoolean(params.include_examples, 'include_examples') ?? true;

    logger.debug(`Getting package README for ${packageName}@${version}`);

    // Check cache first
    const cacheKey = createCacheKey.packageReadme(packageName, version);
    const cached = cache.get<PackageReadmeResponse>(cacheKey);
    if (cached) {
      logger.debug(`Using cached README for ${packageName}@${version}`);
      return cached;
    }

    // Get package information from Conan Center
    const recipeInfo = await conanCenterApi.getRecipeInfo(packageName);
    
    // Determine the actual version to use
    let actualVersion = version;
    if (version === 'latest') {
      actualVersion = recipeInfo.latest_version;
    } else if (!recipeInfo.versions[version]) {
      throw new Error(`Version '${version}' not found for package '${packageName}'`);
    }

    // Get README content
    let readmeContent = '';
    let usageExamples: UsageExample[] = [];

    if (recipeInfo.homepage) {
      readmeContent = await githubApi.getReadmeContent(recipeInfo.homepage) || '';
    }

    // If no README found, create a basic one
    if (!readmeContent) {
      readmeContent = createBasicReadme(packageName, actualVersion, recipeInfo.description);
    }

    // Parse usage examples if requested
    if (includeExamples && readmeContent) {
      usageExamples = readmeParser.parseUsageExamples(readmeContent);
    }

    // Create installation info
    const installation: InstallationInfo = {
      conan: `conan install --requires=${packageName}/${actualVersion}@`,
      cmake: `find_package(${packageName} REQUIRED)`,
    };

    // Create basic info
    const basicInfo: PackageBasicInfo = {
      name: packageName,
      version: actualVersion,
      description: recipeInfo.description,
      license: recipeInfo.license,
      author: recipeInfo.author,
      homepage: recipeInfo.homepage,
      topics: recipeInfo.topics,
    };

    // Create repository info
    let repository: RepositoryInfo | undefined;
    if (recipeInfo.homepage) {
      repository = {
        type: 'git',
        url: recipeInfo.homepage,
      };
    }

    const result: PackageReadmeResponse = {
      package_name: packageName,
      version: actualVersion,
      description: recipeInfo.description,
      readme_content: readmeContent,
      usage_examples: usageExamples,
      installation,
      basic_info: basicInfo,
      repository,
    };

    // Cache the result
    cache.set(cacheKey, result, 3600 * 1000); // Cache for 1 hour

    logger.info(`Successfully retrieved README for ${packageName}@${actualVersion}`);
    return result;
  } catch (error) {
    handleApiError(error, `get package README for ${params.package_name}`);
  }
}

function createBasicReadme(packageName: string, version: string, description: string): string {
  return `# ${packageName}

${description}

## Installation

Add the following to your conanfile.txt:

\`\`\`
[requires]
${packageName}/${version}@
\`\`\`

Or use the command line:

\`\`\`bash
conan install --requires=${packageName}/${version}@
\`\`\`

## CMake Integration

\`\`\`cmake
find_package(${packageName} REQUIRED)
target_link_libraries(your_target ${packageName}::${packageName})
\`\`\`

## Usage

Refer to the package documentation for detailed usage instructions.
`;
}