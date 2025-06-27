import { BasePackageServer, ToolDefinition } from '@elchika-inc/package-readme-shared';
import { getPackageReadme } from './tools/get-package-readme.js';
import { getPackageInfo } from './tools/get-package-info.js';
import { searchPackages } from './tools/search-packages.js';
import {
  GetPackageReadmeParams,
  GetPackageInfoParams,
  SearchPackagesParams,
} from './types/index.js';
import { validatePackageName, validateSearchQuery, validateLimit } from './utils/validators.js';

const TOOL_DEFINITIONS: Record<string, ToolDefinition> = {
  get_readme_from_conan: {
    name: 'get_readme_from_conan',
    description: 'Get package README and usage examples from Conan Center',
    inputSchema: {
      type: 'object',
      properties: {
        package_name: {
          type: 'string',
          description: 'The name of the Conan package',
        },
        version: {
          type: 'string',
          description: 'The version of the package (default: "latest")',
          default: 'latest',
        },
        include_examples: {
          type: 'boolean',
          description: 'Whether to include usage examples (default: true)',
          default: true,
        }
      },
      required: ['package_name'],
    },
  },
  get_package_info_from_conan: {
    name: 'get_package_info_from_conan',
    description: 'Get package basic information and dependencies from Conan Center',
    inputSchema: {
      type: 'object',
      properties: {
        package_name: {
          type: 'string',
          description: 'The name of the Conan package',
        },
        include_dependencies: {
          type: 'boolean',
          description: 'Whether to include dependencies (default: true)',
          default: true,
        },
        include_options: {
          type: 'boolean',
          description: 'Whether to include package options (default: false)',
          default: false,
        }
      },
      required: ['package_name'],
    },
  },
  search_packages_from_conan: {
    name: 'search_packages_from_conan',
    description: 'Search for packages in Conan Center',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return (default: 20)',
          default: 20,
          minimum: 1,
          maximum: 100,
        }
      },
      required: ['query'],
    },
  },
} as const;

export class ConanPackageReadmeMcpServer extends BasePackageServer {
  constructor() {
    super({
      name: 'conan-package-readme-mcp',
      version: '1.0.0',
    });
  }

  protected getToolDefinitions(): Record<string, ToolDefinition> {
    return TOOL_DEFINITIONS;
  }

  protected async handleToolCall(name: string, args: unknown): Promise<unknown> {
    try {
      switch (name) {
        case 'get_readme_from_conan':
          return await getPackageReadme(this.validateGetPackageReadmeParams(args));
        
        case 'get_package_info_from_conan':
          return await getPackageInfo(this.validateGetPackageInfoParams(args));
        
        case 'search_packages_from_conan':
          return await searchPackages(this.validateSearchPackagesParams(args));
        
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      this.logger.error(`Tool execution failed: ${name}`, { error });
      throw error;
    }
  }


  private validateGetPackageReadmeParams(args: unknown): GetPackageReadmeParams {
    if (!args || typeof args !== 'object' || args === null) {
      throw new Error('Invalid parameters: expected object');
    }

    const params = args as Record<string, unknown>;
    
    if (typeof params.package_name !== 'string') {
      throw new Error('package_name is required and must be a string');
    }

    validatePackageName(params.package_name);

    return {
      package_name: params.package_name,
      version: typeof params.version === 'string' ? params.version : 'latest',
      include_examples: typeof params.include_examples === 'boolean' ? params.include_examples : true,
    };
  }


  private validateGetPackageInfoParams(args: unknown): GetPackageInfoParams {
    if (!args || typeof args !== 'object' || args === null) {
      throw new Error('Invalid parameters: expected object');
    }

    const params = args as Record<string, unknown>;
    
    if (typeof params.package_name !== 'string') {
      throw new Error('package_name is required and must be a string');
    }

    validatePackageName(params.package_name);

    return {
      package_name: params.package_name,
      include_dependencies: typeof params.include_dependencies === 'boolean' ? params.include_dependencies : true,
      include_options: typeof params.include_options === 'boolean' ? params.include_options : false,
    };
  }


  private validateSearchPackagesParams(args: unknown): SearchPackagesParams {
    if (!args || typeof args !== 'object' || args === null) {
      throw new Error('Invalid parameters: expected object');
    }

    const params = args as Record<string, unknown>;
    
    if (typeof params.query !== 'string') {
      throw new Error('query is required and must be a string');
    }

    validateSearchQuery(params.query);

    const limit = typeof params.limit === 'number' ? params.limit : 20;
    validateLimit(limit);

    return {
      query: params.query,
      limit,
    };
  }

}

export default ConanPackageReadmeMcpServer;