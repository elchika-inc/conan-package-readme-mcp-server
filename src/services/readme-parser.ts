import { logger } from '../utils/logger.js';
import type { UsageExample } from '../types/index.js';

export class ReadmeParser {
  parseUsageExamples(readmeContent: string): UsageExample[] {
    const examples: UsageExample[] = [];
    
    try {
      // Look for CMake examples
      const cmakeExamples = this.extractCMakeExamples(readmeContent);
      examples.push(...cmakeExamples);

      // Look for C++ code examples
      const cppExamples = this.extractCppExamples(readmeContent);
      examples.push(...cppExamples);

      // Look for Conanfile examples
      const conanfileExamples = this.extractConanfileExamples(readmeContent);
      examples.push(...conanfileExamples);

      // Look for installation/usage sections
      const installExamples = this.extractInstallationExamples(readmeContent);
      examples.push(...installExamples);

      logger.debug(`Parsed ${examples.length} usage examples from README`);
      return examples;
    } catch (error) {
      logger.warn('Failed to parse usage examples:', error);
      return [];
    }
  }

  private extractCMakeExamples(content: string): UsageExample[] {
    const examples: UsageExample[] = [];
    
    // Look for CMake code blocks
    const cmakeRegex = /```(?:cmake|CMake)\s*\n([\s\S]*?)\n```/gi;
    let match;
    
    while ((match = cmakeRegex.exec(content)) !== null) {
      const code = match[1].trim();
      if (code.length > 0) {
        const title = this.extractExampleTitle(content, match.index) || 'CMake Usage';
        examples.push({
          title,
          code,
          language: 'cmake',
          description: this.extractExampleDescription(content, match.index),
        });
      }
    }

    return examples;
  }

  private extractCppExamples(content: string): UsageExample[] {
    const examples: UsageExample[] = [];
    
    // Look for C++ code blocks
    const cppRegex = /```(?:cpp|c\+\+|cxx)\s*\n([\s\S]*?)\n```/gi;
    let match;
    
    while ((match = cppRegex.exec(content)) !== null) {
      const code = match[1].trim();
      if (code.length > 0) {
        const title = this.extractExampleTitle(content, match.index) || 'C++ Usage';
        examples.push({
          title,
          code,
          language: 'cpp',
          description: this.extractExampleDescription(content, match.index),
        });
      }
    }

    return examples;
  }

  private extractConanfileExamples(content: string): UsageExample[] {
    const examples: UsageExample[] = [];
    
    // Look for Python/Conanfile code blocks
    const conanfileRegex = /```(?:python|py)\s*\n([\s\S]*?conanfile[\s\S]*?)\n```/gi;
    let match;
    
    while ((match = conanfileRegex.exec(content)) !== null) {
      const code = match[1].trim();
      if (code.length > 0) {
        const title = this.extractExampleTitle(content, match.index) || 'Conanfile Usage';
        examples.push({
          title,
          code,
          language: 'python',
          description: this.extractExampleDescription(content, match.index),
        });
      }
    }

    return examples;
  }

  private extractInstallationExamples(content: string): UsageExample[] {
    const examples: UsageExample[] = [];
    
    // Look for bash/shell code blocks containing conan commands
    const bashRegex = /```(?:bash|shell|sh)\s*\n([\s\S]*?conan[\s\S]*?)\n```/gi;
    let match;
    
    while ((match = bashRegex.exec(content)) !== null) {
      const code = match[1].trim();
      if (code.length > 0) {
        const title = this.extractExampleTitle(content, match.index) || 'Installation';
        examples.push({
          title,
          code,
          language: 'bash',
          description: this.extractExampleDescription(content, match.index),
        });
      }
    }

    return examples;
  }

  private extractExampleTitle(content: string, codeBlockIndex: number): string | undefined {
    // Look for heading before the code block
    const beforeCode = content.substring(Math.max(0, codeBlockIndex - 500), codeBlockIndex);
    
    // Look for markdown headings
    const headingMatch = beforeCode.match(/#+\s*([^\n]+)\s*$/m);
    if (headingMatch) {
      return headingMatch[1].trim();
    }

    // Look for bold text that might be a title
    const boldMatch = beforeCode.match(/\*\*([^*]+)\*\*\s*$/m);
    if (boldMatch) {
      return boldMatch[1].trim();
    }

    return undefined;
  }

  private extractExampleDescription(content: string, codeBlockIndex: number): string | undefined {
    // Look for text after the title but before the code block
    const beforeCode = content.substring(Math.max(0, codeBlockIndex - 300), codeBlockIndex);
    
    // Split by lines and find text that's not a heading
    const lines = beforeCode.split('\n').reverse();
    let description = '';
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip empty lines, headings, and the line with the code block marker
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('```')) {
        if (description) break; // Stop if we found some description
        continue;
      }
      
      description = trimmed + (description ? ' ' + description : '');
      
      // Stop at a reasonable length
      if (description.length > 200) {
        break;
      }
    }

    return description.length > 10 ? description : undefined;
  }

  extractPackageDescription(readmeContent: string): string {
    // Look for the first substantial paragraph or description
    const lines = readmeContent.split('\n');
    let description = '';
    let inCodeBlock = false;
    let foundTitle = false;

    for (const line of lines) {
      const trimmed = line.trim();

      // Track code blocks
      if (trimmed.startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        continue;
      }

      // Skip code blocks
      if (inCodeBlock) {
        continue;
      }

      // Skip titles until we find one
      if (trimmed.startsWith('#')) {
        foundTitle = true;
        continue;
      }

      // Look for substantial content after a title
      if (foundTitle && trimmed.length > 20 && !trimmed.startsWith('![')) {
        description = trimmed;
        break;
      }
    }

    return description || 'Conan package';
  }
}

export const readmeParser = new ReadmeParser();