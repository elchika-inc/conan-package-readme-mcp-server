import { logger } from '../utils/logger.js';
import { handleApiError } from '../utils/error-handler.js';
import type { ConanCenterSearchResponse, ConanCenterRecipeResponse, ConanRecipeDetails } from '../types/index.js';

const CONAN_CENTER_BASE_URL = 'https://center.conan.io/api';
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
      const searchUrl = new URL(`${CONAN_CENTER_BASE_URL}/search`);
      searchUrl.searchParams.set('q', query);
      searchUrl.searchParams.set('size', limit.toString());

      logger.debug(`Searching packages: ${searchUrl.toString()}`);

      const response = await this.fetchWithTimeout(searchUrl.toString());

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as ConanCenterSearchResponse;
      logger.debug(`Found ${data.results?.length || 0} packages for query: ${query}`);

      return data;
    } catch (error) {
      handleApiError(error, 'Conan Center search');
    }
  }

  async getRecipeInfo(packageName: string): Promise<ConanCenterRecipeResponse> {
    try {
      const recipeUrl = `${CONAN_CENTER_BASE_URL}/recipes/${encodeURIComponent(packageName)}`;
      
      logger.debug(`Fetching recipe info: ${recipeUrl}`);

      const response = await this.fetchWithTimeout(recipeUrl);

      if (response.status === 404) {
        throw new Error(`Package '${packageName}' not found`);
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as ConanCenterRecipeResponse;
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