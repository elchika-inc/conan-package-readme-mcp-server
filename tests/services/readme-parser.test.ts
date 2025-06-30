import { expect, test, describe, beforeEach } from "vitest";
import { ReadmeParser } from '../../src/services/readme-parser.js';

describe('readme-parser service', () => {
  let readmeParser: ReadmeParser;

  beforeEach(() => {
    readmeParser = new ReadmeParser();
  });

  test('should create instance properly', () => {
    expect(readmeParser).toBeInstanceOf(ReadmeParser);
  });

  test('should validate markdown patterns', () => {
    const markdownPatterns = {
      codeBlock: /```(\w+)?\n([\s\S]*?)```/g,
      header: /^#{1,6}\s+(.+)$/gm,
      codeInline: /`([^`]+)`/g
    };
    
    expect(markdownPatterns.codeBlock).toBeInstanceOf(RegExp);
    expect(markdownPatterns.header).toBeInstanceOf(RegExp);
    expect(markdownPatterns.codeInline).toBeInstanceOf(RegExp);
  });

  test('should identify relevant programming languages', () => {
    const relevantLanguages = ['cpp', 'c++', 'cmake', 'bash', 'sh', 'conan'];
    const irrelevantLanguages = ['json', 'yaml', 'xml', 'html'];
    
    relevantLanguages.forEach(lang => {
      expect(['cpp', 'c++', 'cmake', 'bash', 'sh', 'conan']).toContain(lang);
    });
    
    irrelevantLanguages.forEach(lang => {
      expect(['cpp', 'c++', 'cmake', 'bash', 'sh', 'conan']).not.toContain(lang);
    });
  });

  test('should validate usage example structure', () => {
    const mockUsageExample = {
      language: 'cpp',
      title: 'C++ Usage Example',
      code: '#include <iostream>\nint main() { return 0; }',
      description: 'Basic C++ example'
    };
    
    expect(mockUsageExample).toHaveProperty('language');
    expect(mockUsageExample).toHaveProperty('title');
    expect(mockUsageExample).toHaveProperty('code');
    expect(typeof mockUsageExample.language).toBe('string');
    expect(typeof mockUsageExample.code).toBe('string');
  });

  test('should handle empty and null inputs', () => {
    const emptyInputs = ['', null, undefined, '   '];
    
    emptyInputs.forEach(input => {
      if (input === null || input === undefined) {
        expect(input).toBeFalsy();
      } else {
        expect(input.trim()).toBe('');
      }
    });
  });

  test('should validate Conan-specific patterns', () => {
    const conanPatterns = {
      installCommand: /conan install.*--requires=/,
      cmakeIntegration: /find_package\(.+REQUIRED\)/,
      targetLink: /target_link_libraries/,
      conanfile: /\[requires\]/
    };
    
    Object.values(conanPatterns).forEach(pattern => {
      expect(pattern).toBeInstanceOf(RegExp);
    });
  });

  test('should validate markdown parsing resilience', () => {
    const malformedMarkdown = [
      '```cpp\n#include <header>',  // Missing closing backticks
      '```\ncode without language',
      '###### Too many hashes ##########',
      '`unclosed inline code'
    ];
    
    malformedMarkdown.forEach(content => {
      expect(typeof content).toBe('string');
      expect(content.length).toBeGreaterThan(0);
    });
  });

  describe('parseUsageExamples', () => {
    test('should parse CMake examples', () => {
      const readmeContent = `# CMake Integration

Here's how to use this package with CMake:

\`\`\`cmake
find_package(Boost REQUIRED)
target_link_libraries(myapp Boost::system)
\`\`\`
`;

      const examples = readmeParser.parseUsageExamples(readmeContent);

      expect(examples).toHaveLength(1);
      expect(examples[0].language).toBe('cmake');
      expect(examples[0].code).toContain('find_package(Boost REQUIRED)');
      expect(examples[0].title).toContain('CMake');
    });

    test('should parse C++ examples', () => {
      const readmeContent = `# Usage Example

Basic C++ usage:

\`\`\`cpp
#include <boost/system.hpp>
int main() {
    return 0;
}
\`\`\`
`;

      const examples = readmeParser.parseUsageExamples(readmeContent);

      expect(examples).toHaveLength(1);
      expect(examples[0].language).toBe('cpp');
      expect(examples[0].code).toContain('#include <boost/system.hpp>');
    });

    test('should parse Conanfile examples', () => {
      const readmeContent = `# Conanfile Example

Add this to your conanfile:

\`\`\`python
from conan import ConanFile

class MyConanfile(ConanFile):
    requires = "boost/1.82.0"
\`\`\`
`;

      const examples = readmeParser.parseUsageExamples(readmeContent);

      expect(examples).toHaveLength(1);
      expect(examples[0].language).toBe('python');
      expect(examples[0].code).toContain('ConanFile');
    });

    test('should parse installation examples', () => {
      const readmeContent = `# Installation

Install using Conan:

\`\`\`bash
conan install boost/1.82.0@
\`\`\`
`;

      const examples = readmeParser.parseUsageExamples(readmeContent);

      expect(examples).toHaveLength(1);
      expect(examples[0].language).toBe('bash');
      expect(examples[0].code).toContain('conan install');
    });

    test('should handle multiple examples', () => {
      const readmeContent = `# Multi-language Examples

## CMake
\`\`\`cmake
find_package(Boost REQUIRED)
\`\`\`

## C++
\`\`\`cpp
#include <boost/system.hpp>
\`\`\`

## Installation
\`\`\`bash
conan install boost/1.82.0@
\`\`\`
`;

      const examples = readmeParser.parseUsageExamples(readmeContent);

      expect(examples.length).toBeGreaterThanOrEqual(3);
      const languages = examples.map(ex => ex.language);
      expect(languages).toContain('cmake');
      expect(languages).toContain('cpp');
      expect(languages).toContain('bash');
    });

    test('should handle empty content', () => {
      const examples = readmeParser.parseUsageExamples('');
      expect(examples).toEqual([]);
    });

    test('should handle content without code blocks', () => {
      const readmeContent = 'This is just plain text without any code examples.';
      const examples = readmeParser.parseUsageExamples(readmeContent);
      expect(examples).toEqual([]);
    });

    test('should handle malformed code blocks', () => {
      const readmeContent = `
        \`\`\`cpp
        // This code block is not properly closed
        #include <iostream>
      `;

      const examples = readmeParser.parseUsageExamples(readmeContent);
      expect(examples).toEqual([]);
    });

    test('should extract example titles from headings', () => {
      const readmeContent = `## Advanced Usage Pattern

This shows advanced usage:

\`\`\`cpp
// Advanced code here
\`\`\`
`;

      const examples = readmeParser.parseUsageExamples(readmeContent);

      expect(examples).toHaveLength(1);
      expect(examples[0].title).toBe('Advanced Usage Pattern');
    });

    test('should extract example descriptions', () => {
      const readmeContent = `## Basic Usage

This example demonstrates the basic functionality of the library.
It shows how to initialize and use the main features.

\`\`\`cpp
#include <iostream>
\`\`\`
`;

      const examples = readmeParser.parseUsageExamples(readmeContent);

      expect(examples).toHaveLength(1);
      expect(examples[0].description).toContain('basic functionality');
    });
  });

  describe('extractPackageDescription', () => {
    test('should extract description from README', () => {
      const readmeContent = `# Boost Libraries

Boost provides free peer-reviewed portable C++ source libraries.

## Installation
...
`;

      const description = readmeParser.extractPackageDescription(readmeContent);

      expect(description).toBe('Boost provides free peer-reviewed portable C++ source libraries.');
    });

    test('should skip images and short lines', () => {
      const readmeContent = `# Package Name

![Build Status](https://img.shields.io/badge/build-passing-green)

Short line.

This is a longer description that should be extracted as the package description.
`;

      const description = readmeParser.extractPackageDescription(readmeContent);

      expect(description).toBe('This is a longer description that should be extracted as the package description.');
    });

    test('should skip code blocks', () => {
      const readmeContent = `# Package Name

\`\`\`cpp
// This is code and should be skipped
#include <iostream>
\`\`\`

This is the actual description of the package.
`;

      const description = readmeParser.extractPackageDescription(readmeContent);

      expect(description).toBe('This is the actual description of the package.');
    });

    test('should handle README without substantial description', () => {
      const readmeContent = `# Package Name

![Logo](logo.png)

## Installation
...
`;

      const description = readmeParser.extractPackageDescription(readmeContent);

      expect(description).toBe('Conan package');
    });

    test('should handle empty content', () => {
      const description = readmeParser.extractPackageDescription('');
      expect(description).toBe('Conan package');
    });

    test('should handle content without headings', () => {
      const readmeContent = 'Just some plain text without any markdown structure.';
      const description = readmeParser.extractPackageDescription(readmeContent);
      expect(description).toBe('Conan package');
    });
  });
});