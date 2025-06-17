import { logger } from '../utils/logger.js';
import { handleApiError } from '../utils/error-handler.js';
import type { ConanCenterSearchResponse, ConanCenterRecipeResponse, ConanRecipeDetails } from '../types/index.js';

const CONAN_CENTER_INDEX_REPO = 'https://api.github.com/repos/conan-io/conan-center-index';
const REQUEST_TIMEOUT = 10000; // 10 seconds

export class ConanCenterApi {
  private async fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'User-Agent': 'conan-package-readme-mcp-server/1.0.0',
          'Accept': 'application/json',
          ...options.headers,
        },
      });

      clearTimeout(timeout);
      return response;
    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
  }

  async searchPackages(query: string, limit: number = 20): Promise<ConanCenterSearchResponse> {
    try {
      // Search for recipe folders in the conan-center-index repository
      const searchUrl = new URL(`${CONAN_CENTER_INDEX_REPO}/contents/recipes`);
      
      logger.debug(`Searching packages in Conan Center Index: ${searchUrl.toString()}`);

      const response = await this.fetchWithTimeout(searchUrl.toString());

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const recipeFolders = await response.json() as Array<{name: string, type: string}>;
      
      // Filter folders that match the query (case-insensitive)
      const matchingRecipes = recipeFolders
        .filter(folder => folder.type === 'dir' && 
                folder.name.toLowerCase().includes(query.toLowerCase()))
        .slice(0, limit)
        .map(folder => ({
          name: folder.name,
          description: `Conan package for ${folder.name}`,
          topics: [],
          license: 'Unknown',
          author: 'Conan Center',
          homepage: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          latest_version: 'unknown'
        }));

      const result: ConanCenterSearchResponse = {
        results: matchingRecipes,
        total_count: matchingRecipes.length
      };

      logger.debug(`Found ${matchingRecipes.length} packages for query: ${query}`);
      return result;
    } catch (error) {
      handleApiError(error, 'Conan Center search');
    }
  }

  async getRecipeInfo(packageName: string): Promise<ConanCenterRecipeResponse> {
    try {
      // Get the recipe folder contents from GitHub
      const recipeUrl = `${CONAN_CENTER_INDEX_REPO}/contents/recipes/${encodeURIComponent(packageName)}`;
      
      logger.debug(`Fetching recipe info: ${recipeUrl}`);

      const response = await this.fetchWithTimeout(recipeUrl);

      if (response.status === 404) {
        throw new Error(`Package '${packageName}' not found`);
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const folderContents = await response.json() as Array<{name: string, type: string}>;
      
      // Get available versions (folder names that look like versions)
      const versionFolders = folderContents
        .filter(item => item.type === 'dir')
        .map(item => item.name)
        .filter(name => /^\d+\.\d+/.test(name)); // Basic version pattern
      
      // Sort versions to get the latest
      const sortedVersions = versionFolders.sort((a, b) => {
        // Simple version comparison - this could be improved
        const aNum = parseFloat(a.split('.')[0] + '.' + a.split('.')[1]);
        const bNum = parseFloat(b.split('.')[0] + '.' + b.split('.')[1]);
        return bNum - aNum;
      });

      const latestVersion = sortedVersions[0] || 'unknown';
      
      // Build version map
      const versions: {[key: string]: {revisions: any[]}} = {};
      versionFolders.forEach(version => {
        versions[version] = { 
          revisions: [{ id: 'latest', timestamp: new Date().toISOString() }] 
        };
      });

      const data: ConanCenterRecipeResponse = {
        name: packageName,
        latest_version: latestVersion,
        versions: versions,
        description: `Conan package for ${packageName}`,
        license: 'Unknown',
        author: 'Conan Center',
        homepage: '',
        topics: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      logger.debug(`Fetched recipe info for: ${packageName}`);
      return data;
    } catch (error) {
      handleApiError(error, `Conan Center recipe for ${packageName}`);
    }
  }

  async getRecipeDetails(packageName: string, version: string): Promise<ConanRecipeDetails | null> {
    try {
      const recipeInfo = await this.getRecipeInfo(packageName);
      
      if (!recipeInfo.versions[version]) {
        return null; // Version not found
      }

      // For detailed recipe information, we'd typically need to fetch the conanfile.py
      // This is a simplified version based on available API data
      const details: ConanRecipeDetails = {
        name: recipeInfo.name,
        version: version,
        description: recipeInfo.description,
        license: recipeInfo.license,
        author: recipeInfo.author,
        homepage: recipeInfo.homepage,
        topics: recipeInfo.topics,
        // These would come from parsing the actual conanfile.py
        requires: undefined,
        options: undefined,
        generators: undefined,
        settings: undefined,
      };

      return details;
    } catch (error) {
      logger.debug(`Failed to get recipe details for ${packageName}@${version}:`, error);
      return null;
    }
  }

  async getLatestVersion(packageName: string): Promise<string> {
    try {
      const recipeInfo = await this.getRecipeInfo(packageName);
      return recipeInfo.latest_version;
    } catch (error) {
      handleApiError(error, `latest version for ${packageName}`);
    }
  }

  async getAvailableVersions(packageName: string): Promise<string[]> {
    try {
      const recipeInfo = await this.getRecipeInfo(packageName);
      return Object.keys(recipeInfo.versions).sort();
    } catch (error) {
      handleApiError(error, `available versions for ${packageName}`);
    }
  }
}

export const conanCenterApi = new ConanCenterApi();