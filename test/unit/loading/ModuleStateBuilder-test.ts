import * as Path from 'path';
import { mocked } from 'ts-jest/utils';
import { ModuleStateBuilder } from '../../../lib/loading/ModuleStateBuilder';

// Import syntax only works in Node > 12
const fs = require('fs').promises;

jest.mock('fs', () => ({
  promises: {
    realpath: jest.fn(),
    stat: jest.fn(),
    readdir: jest.fn(),
    readFile: jest.fn(),
  },
}));

describe('ModuleStateBuilder', () => {
  let builder: ModuleStateBuilder;
  let req: any;
  let files: string[];
  let fileContents: Record<string, any>;
  beforeEach(() => {
    builder = new ModuleStateBuilder();
    req = (path: string) => {
      if (path.includes('INVALID')) {
        throw new Error('Invalid require');
      }
      return true;
    };
    req.main = {
      paths: [
        '/a/b/c/node_modules',
        '/a/b/node_modules',
        '/a/node_modules',
        '/node_modules',
      ],
    };

    // Simulate file system based on files array
    files = [];
    fileContents = {};
    mocked(fs.realpath).mockImplementation(<any> (async(path: string) => path));
    mocked(fs.stat).mockImplementation(<any> (async(path: string) => {
      if (!files.includes(path)) {
        throw new Error(`File stat not found: ${path}`);
      }
      return {
        isFile: () => path.includes('.'),
        isDirectory: () => !path.includes('.'),
      };
    }));
    mocked(fs.readdir).mockImplementation(<any> (async(dir: string) => {
      const contents: string[] = [];
      for (const file of files) {
        if (file.startsWith(dir)) {
          const sub = file.slice(dir.length + 1);
          if (sub.length > 0 && !sub.includes('/')) {
            contents.push(sub);
          }
        }
      }
      return contents;
    }));
    mocked(fs.readFile).mockImplementation(<any> (async(path: string) => {
      if (!(path in fileContents)) {
        throw new Error(`File not found: ${path}`);
      }
      return fileContents[path];
    }));
  });

  describe('buildModuleState', () => {
    it('should handle an undefined mainModulePathIn', async() => {
      expect(await builder.buildModuleState(req)).toEqual({
        componentModules: {},
        contexts: {},
        importPaths: {},
        mainModulePath: '/a/b/c/',
        nodeModuleImportPaths: [
          '/a/b/c/',
          '/a/b/c',
          '/a/b',
          '/a',
        ],
        nodeModulePaths: [],
        packageJsons: {},
      });
    });

    it('should handle an defined mainModulePathIn', async() => {
      expect(await builder.buildModuleState(req, '/a/b')).toEqual({
        componentModules: {},
        contexts: {},
        importPaths: {},
        mainModulePath: '/a/b',
        nodeModuleImportPaths: [
          '/a/b',
          '/a',
        ],
        nodeModulePaths: [],
        packageJsons: {},
      });
    });

    it('should handle filled in component dependencies', async() => {
      files = [
        '/a/package.json',
        '/a/components/',
        '/a/config/',
        '/a/node_modules',
        '/a/node_modules/b',
        '/a/node_modules/b/package.json',
        '/a/node_modules/b/components/',
        '/a/node_modules/b/config/',
        '/a/node_modules/c',
        '/a/node_modules/c/package.json',
      ];
      fileContents = {
        '/a/package.json': `
{
  "name": "a",
  "version": "1.0.0",
  "lsd:module": "https://linkedsoftwaredependencies.org/bundles/npm/a",
  "lsd:components": "components/components.jsonld",
  "lsd:contexts": {
    "https://linkedsoftwaredependencies.org/bundles/npm/a/^1.0.0/components/context.jsonld": "components/context.jsonld"
  },
  "lsd:importPaths": {
    "https://linkedsoftwaredependencies.org/bundles/npm/a/^1.0.0/components/": "components/",
    "https://linkedsoftwaredependencies.org/bundles/npm/a/^1.0.0/config/": "config/"
  }
}`,
        '/a/components/context.jsonld': `{ "name": "a" }`,
        '/a/node_modules/b/package.json': `
{
  "name": "b",
  "version": "1.0.0",
  "lsd:module": "https://linkedsoftwaredependencies.org/bundles/npm/b",
  "lsd:components": "components/components.jsonld",
  "lsd:contexts": {
    "https://linkedsoftwaredependencies.org/bundles/npm/b/^1.0.0/components/context.jsonld": "components/context.jsonld"
  },
  "lsd:importPaths": {
    "https://linkedsoftwaredependencies.org/bundles/npm/b/^1.0.0/components/": "components/",
    "https://linkedsoftwaredependencies.org/bundles/npm/b/^1.0.0/config/": "config/"
  }
}`,
        '/a/node_modules/b/components/context.jsonld': `{ "name": "b" }`,
        '/a/node_modules/c/package.json': `
{
  "name": "c",
  "version": "1.0.0"
}`,
      };
      expect(await builder.buildModuleState(req, '/a/b')).toEqual({
        componentModules: {
          'https://linkedsoftwaredependencies.org/bundles/npm/a': '/a/components/components.jsonld',
          'https://linkedsoftwaredependencies.org/bundles/npm/b': '/a/node_modules/b/components/components.jsonld',
        },
        contexts: {
          'https://linkedsoftwaredependencies.org/bundles/npm/a/^1.0.0/components/context.jsonld': {
            name: 'a',
          },
          'https://linkedsoftwaredependencies.org/bundles/npm/b/^1.0.0/components/context.jsonld': {
            name: 'b',
          },
        },
        importPaths: {
          'https://linkedsoftwaredependencies.org/bundles/npm/a/^1.0.0/components/': '/a/components/',
          'https://linkedsoftwaredependencies.org/bundles/npm/a/^1.0.0/config/': '/a/config/',
          'https://linkedsoftwaredependencies.org/bundles/npm/b/^1.0.0/components/': '/a/node_modules/b/components/',
          'https://linkedsoftwaredependencies.org/bundles/npm/b/^1.0.0/config/': '/a/node_modules/b/config/',
        },
        mainModulePath: '/a/b',
        nodeModuleImportPaths: [
          '/a/b',
          '/a',
        ],
        nodeModulePaths: [
          '/a',
          '/a/node_modules/b',
          '/a/node_modules/c',
        ],
        packageJsons: {
          '/a': {
            'lsd:module': 'https://linkedsoftwaredependencies.org/bundles/npm/a',
            'lsd:components': 'components/components.jsonld',
            'lsd:contexts': {
              'https://linkedsoftwaredependencies.org/bundles/npm/a/^1.0.0/components/context.jsonld':
                'components/context.jsonld',
            },
            'lsd:importPaths': {
              'https://linkedsoftwaredependencies.org/bundles/npm/a/^1.0.0/components/': 'components/',
              'https://linkedsoftwaredependencies.org/bundles/npm/a/^1.0.0/config/': 'config/',
            },
            name: 'a',
            version: '1.0.0',
          },
          '/a/node_modules/b': {
            name: 'b',
            version: '1.0.0',
            'lsd:module': 'https://linkedsoftwaredependencies.org/bundles/npm/b',
            'lsd:components': 'components/components.jsonld',
            'lsd:contexts': {
              'https://linkedsoftwaredependencies.org/bundles/npm/b/^1.0.0/components/context.jsonld':
                'components/context.jsonld',
            },
            'lsd:importPaths': {
              'https://linkedsoftwaredependencies.org/bundles/npm/b/^1.0.0/components/': 'components/',
              'https://linkedsoftwaredependencies.org/bundles/npm/b/^1.0.0/config/': 'config/',
            },
          },
          '/a/node_modules/c': {
            name: 'c',
            version: '1.0.0',
          },
        },
      });
    });
  });

  describe('buildDefaultMainModulePath', () => {
    it('should error on a missing main', () => {
      req.main = undefined;
      expect(() => builder.buildDefaultMainModulePath(req))
        .toThrow(new Error(`Corrupt Node.js state: Could not find a main module.`));
    });

    it('should error on empty paths array', () => {
      req.main.paths = [];
      expect(() => builder.buildDefaultMainModulePath(req))
        .toThrow(new Error(`Corrupt Node.js state: None of the main module paths are valid.`));
    });

    it('should return the first valid main path', () => {
      expect(builder.buildDefaultMainModulePath(req)).toEqual('/a/b/c/');
    });

    it('should return the second valid main path', () => {
      req.main = {
        paths: [
          '/a/b/c/INVALID',
          '/a/b/node_modules',
          '/a/node_modules',
          '/node_modules',
        ],
      };
      expect(builder.buildDefaultMainModulePath(req)).toEqual('/a/b/');
    });

    it('should error on all invalid paths', () => {
      req.main = {
        paths: [
          '/a/b/c/INVALID',
          '/a/b/INVALID',
          '/a/INVALID',
          '/INVALID',
        ],
      };
      expect(() => builder.buildDefaultMainModulePath(req))
        .toThrow(new Error(`Corrupt Node.js state: None of the main module paths are valid.`));
    });
  });

  describe('buildNodeModuleImportPaths', () => {
    it('should return all parent directories', () => {
      expect(builder.buildNodeModuleImportPaths([ '', 'a', 'b', 'c', 'd' ].join(Path.sep))).toEqual([
        [ '', 'a', 'b', 'c', 'd' ].join(Path.sep),
        [ '', 'a', 'b', 'c' ].join(Path.sep),
        [ '', 'a', 'b' ].join(Path.sep),
        [ '', 'a' ].join(Path.sep),
      ]);
    });
  });

  describe('buildNodeModulePaths', () => {
    it('should handle empty import paths', async() => {
      expect(await builder.buildNodeModulePaths([])).toEqual([]);
    });

    it('should handle import paths without package.json\'s', async() => {
      expect(await builder.buildNodeModulePaths([
        '/a',
        '/',
      ])).toEqual([]);
    });

    it('should handle import paths with direct package.json\'s', async() => {
      files = [
        '/a/package.json',
        '/package.json',
      ];
      expect(await builder.buildNodeModulePaths([
        '/a',
        '/',
      ])).toEqual([
        '/a',
        '/',
      ]);
    });

    it('should handle import paths with package.json\'s and one level node_modules', async() => {
      files = [
        '/a/package.json',
        '/a/node_modules',
        '/a/node_modules/x',
        '/a/node_modules/x/package.json',
        '/a/node_modules/y',
        '/a/node_modules/y/package.json',
        '/package.json',
        '/node_modules',
        '/node_modules/x',
        '/node_modules/x/package.json',
      ];
      expect((await builder.buildNodeModulePaths([
        '/a',
        '/',
      ])).sort()).toEqual([
        '/a',
        '/',
        '/a/node_modules/x',
        '/a/node_modules/y',
        '/node_modules/x',
      ].sort());
    });

    it('should handle import paths with package.json\'s and two level node_modules', async() => {
      files = [
        '/a/package.json',
        '/a/node_modules',
        '/a/node_modules/x',
        '/a/node_modules/x/package.json',
        '/a/node_modules/y',
        '/a/node_modules/y/package.json',
        '/a/node_modules/y/node_modules',
        '/a/node_modules/y/node_modules/u',
        '/a/node_modules/y/node_modules/v',
        '/a/node_modules/y/node_modules/w',
        '/a/node_modules/y/node_modules/v/package.json',
        '/package.json',
        '/node_modules',
        '/node_modules/x',
        '/node_modules/x/package.json',
      ];
      expect((await builder.buildNodeModulePaths([
        '/a',
        '/',
      ])).sort()).toEqual([
        '/a',
        '/',
        '/a/node_modules/x',
        '/a/node_modules/y',
        '/a/node_modules/y/node_modules/v',
        '/node_modules/x',
      ].sort());
    });

    it('should handle import paths with package.json\'s and scoped node_modules', async() => {
      files = [
        '/a/package.json',
        '/a/node_modules',
        '/a/node_modules/x',
        '/a/node_modules/x/package.json',
        '/a/node_modules/y',
        '/a/node_modules/y/package.json',
        '/a/node_modules/y/node_modules',
        '/a/node_modules/y/node_modules/@me',
        '/a/node_modules/y/node_modules/@me/u',
        '/a/node_modules/y/node_modules/@me/v',
        '/a/node_modules/y/node_modules/@me/w',
        '/a/node_modules/y/node_modules/@me/v/package.json',
        '/package.json',
        '/node_modules',
        '/node_modules/x',
        '/node_modules/x/package.json',
      ];
      expect((await builder.buildNodeModulePaths([
        '/a',
        '/',
      ])).sort()).toEqual([
        '/a',
        '/',
        '/a/node_modules/x',
        '/a/node_modules/y',
        '/a/node_modules/y/node_modules/@me/v',
        '/node_modules/x',
      ].sort());
    });

    it('should handle import paths with package.json\'s and ignore .bin folders', async() => {
      files = [
        '/a/package.json',
        '/a/node_modules',
        '/a/node_modules/x',
        '/a/node_modules/x/package.json',
        '/a/node_modules/.bin',
        '/a/node_modules/.bin/package.json',
        '/a/node_modules/y',
        '/a/node_modules/y/package.json',
        '/a/node_modules/y/node_modules',
        '/a/node_modules/y/node_modules/u',
        '/a/node_modules/y/node_modules/u/.bin',
        '/a/node_modules/y/node_modules/u/.bin/package.json',
        '/a/node_modules/y/node_modules/v',
        '/a/node_modules/y/node_modules/w',
        '/a/node_modules/y/node_modules/v/package.json',
        '/package.json',
        '/node_modules',
        '/node_modules/x',
        '/node_modules/x/package.json',
      ];
      expect((await builder.buildNodeModulePaths([
        '/a',
        '/',
      ])).sort()).toEqual([
        '/a',
        '/',
        '/a/node_modules/x',
        '/a/node_modules/y',
        '/a/node_modules/y/node_modules/v',
        '/node_modules/x',
      ].sort());
    });

    it('should avoid infinite loops', async() => {
      files = [
        '/a/package.json',
        '/a/node_modules',
        '/a/node_modules/x',
        '/a/node_modules/x/package.json',
        '/a/node_modules/x/node_modules',
        '/a/node_modules/x/node_modules/a',
      ];
      mocked(fs.realpath).mockImplementation(<any> (async(path: string) => {
        // Simulate a symlink to /a
        if (path === '/a/node_modules/x/node_modules/a') {
          return '/a';
        }
        return path;
      }));
      expect((await builder.buildNodeModulePaths([
        '/a',
      ])).sort()).toEqual([
        '/a',
        '/a/node_modules/x',
      ].sort());
    });

    it('should ignore package.json that is a directory', async() => {
      files = [
        '/a/package.json',
        '/dir/package.json',
        '/package.json',
      ];
      mocked(fs.stat).mockImplementation(<any> (async(path: string) => {
        return {
          isFile: () => path !== '/dir/package.json',
        };
      }));
      expect(await builder.buildNodeModulePaths([
        '/a',
        '/dir',
        '/',
      ])).toEqual([
        '/a',
        '/',
      ]);
    });
  });

  describe('buildPackageJsons', () => {
    it('should handle an empty array', async() => {
      expect(await builder.buildPackageJsons([])).toEqual({});
    });

    it('should handle a non-empty array', async() => {
      fileContents = {
        '/a/package.json': `{ "name": "a" }`,
        '/package.json': `{ "name": "" }`,
      };
      expect(await builder.buildPackageJsons([
        '/a',
        '/',
      ])).toEqual({
        '/a': { name: 'a' },
        '/': { name: '' },
      });
    });
  });

  describe('buildComponentModules', () => {
    it('should handle an empty hash', async() => {
      expect(await builder.buildComponentModules({})).toEqual({});
    });

    it('should handle packages without expected entries', async() => {
      expect(await builder.buildComponentModules({
        a: {},
        b: {},
      })).toEqual({});
    });

    it('should not handle a package with only lsd:module', async() => {
      expect(await builder.buildComponentModules({
        a: {
          version: '1.0.0',
          'lsd:module': 'ex:module',
        },
      })).toEqual({});
    });

    it('should not handle a package with only lsd:components', async() => {
      expect(await builder.buildComponentModules({
        a: {
          version: '1.0.0',
          'lsd:components': 'components/components.jsonld',
        },
      })).toEqual({});
    });

    it('should handle a package with lsd:module and lsd:components', async() => {
      expect(await builder.buildComponentModules({
        a: {
          version: '1.0.0',
          'lsd:module': 'ex:module',
          'lsd:components': 'components/components.jsonld',
        },
      })).toEqual({
        'ex:module': 'a/components/components.jsonld',
      });
    });

    it('should handle packages with lsd:module and lsd:components', async() => {
      expect(await builder.buildComponentModules({
        a: {
          version: '1.0.0',
          'lsd:module': 'ex:module1',
          'lsd:components': 'components/components1.jsonld',
        },
        b: {
          version: '1.0.0',
          'lsd:module': 'ex:module2',
          'lsd:components': 'components/components2.jsonld',
        },
      })).toEqual({
        'ex:module1': 'a/components/components1.jsonld',
        'ex:module2': 'b/components/components2.jsonld',
      });
    });

    it('should resolve packages with the same lsd:module to the max version', async() => {
      expect(await builder.buildComponentModules({
        a: {
          version: '1.1.0',
          'lsd:module': 'ex:module',
          'lsd:components': 'components/components.jsonld',
        },
        b: {
          version: '1.0.0',
          'lsd:module': 'ex:module',
          'lsd:components': 'components/components.jsonld',
        },
      })).toEqual({
        'ex:module': 'a/components/components.jsonld',
      });
      expect(await builder.buildComponentModules({
        a: {
          version: '1.0.0',
          'lsd:module': 'ex:module',
          'lsd:components': 'components/components.jsonld',
        },
        b: {
          version: '1.0.1',
          'lsd:module': 'ex:module',
          'lsd:components': 'components/components.jsonld',
        },
      })).toEqual({
        'ex:module': 'b/components/components.jsonld',
      });
    });

    it('should resolve packages with the same lsd:module and one invalid version to the valid version', async() => {
      expect(await builder.buildComponentModules({
        a: {
          version: '1.1.0',
          'lsd:module': 'ex:module',
          'lsd:components': 'components/components.jsonld',
        },
        b: {
          version: 'invalid',
          'lsd:module': 'ex:module',
          'lsd:components': 'components/components.jsonld',
        },
      })).toEqual({
        'ex:module': 'a/components/components.jsonld',
      });
      expect(await builder.buildComponentModules({
        a: {
          version: 'invalid',
          'lsd:module': 'ex:module',
          'lsd:components': 'components/components.jsonld',
        },
        b: {
          version: '1.0.0',
          'lsd:module': 'ex:module',
          'lsd:components': 'components/components.jsonld',
        },
      })).toEqual({
        'ex:module': 'b/components/components.jsonld',
      });
    });

    it('should not warn on packages with the same lsd:module ' +
      'with different major versions without a logger', async() => {
      expect(await builder.buildComponentModules({
        a: {
          version: '2.0.0',
          'lsd:module': 'ex:module',
          'lsd:components': 'components/components.jsonld',
        },
        b: {
          version: '1.0.0',
          'lsd:module': 'ex:module',
          'lsd:components': 'components/components.jsonld',
        },
      })).toEqual({
        'ex:module': 'a/components/components.jsonld',
      });
    });

    it('should warn on packages with the same lsd:module ' +
      'with different major versions with a logger', async() => {
      const logger = <any> {
        warn: jest.fn(),
      };
      builder = new ModuleStateBuilder(logger);
      expect(await builder.buildComponentModules({
        a: {
          version: '2.0.0',
          'lsd:module': 'ex:module',
          'lsd:components': 'components/components.jsonld',
        },
        b: {
          version: '1.0.0',
          'lsd:module': 'ex:module',
          'lsd:components': 'components/components.jsonld',
        },
      })).toEqual({
        'ex:module': 'a/components/components.jsonld',
      });
      expect(logger.warn).toHaveBeenNthCalledWith(1, `Detected multiple incompatible occurrences of 'ex:module', in 'a/components/components.jsonld'@2.0.0 and 'b/components/components.jsonld'@1.0.0`);
    });
  });

  describe('buildComponentContexts', () => {
    it('should handle an empty hash', async() => {
      expect(await builder.buildComponentContexts({})).toEqual({});
    });

    it('should handle one package with one context', async() => {
      fileContents = {
        'a/components/context.jsonld': `{ "name": "a" }`,
      };
      expect(await builder.buildComponentContexts({
        a: {
          version: '1.0.0',
          'lsd:contexts': {
            'http://example.org/context.jsonld': 'components/context.jsonld',
          },
        },
      })).toEqual({
        'http://example.org/context.jsonld': {
          name: 'a',
        },
      });
    });

    it('should handle packages with contexts', async() => {
      fileContents = {
        'a/components/context1.jsonld': `{ "name1": "a" }`,
        'a/components/context2.jsonld': `{ "name2": "a" }`,
        'b/components/context1.jsonld': `{ "name1": "b" }`,
        'b/components/context2.jsonld': `{ "name2": "b" }`,
      };
      expect(await builder.buildComponentContexts({
        a: {
          version: '1.0.0',
          'lsd:contexts': {
            'http://example.org/context1.jsonld': 'components/context1.jsonld',
            'http://example.org/context2.jsonld': 'components/context2.jsonld',
          },
        },
        b: {
          version: '1.0.0',
          'lsd:contexts': {
            'http://example2.org/context1.jsonld': 'components/context1.jsonld',
            'http://example2.org/context2.jsonld': 'components/context2.jsonld',
          },
        },
      })).toEqual({
        'http://example.org/context1.jsonld': {
          name1: 'a',
        },
        'http://example.org/context2.jsonld': {
          name2: 'a',
        },
        'http://example2.org/context1.jsonld': {
          name1: 'b',
        },
        'http://example2.org/context2.jsonld': {
          name2: 'b',
        },
      });
    });

    it('should handle packages with the same context IRI', async() => {
      fileContents = {
        'a/components/context.jsonld': `{ "name1": "a" }`,
        'b/components/context.jsonld': `{ "name2": "a" }`,
      };
      expect(await builder.buildComponentContexts({
        a: {
          version: '1.0.1',
          'lsd:contexts': {
            'http://example.org/context.jsonld': 'components/context.jsonld',
          },
        },
        b: {
          version: '1.0.0',
          'lsd:contexts': {
            'http://example.org/context.jsonld': 'components/context.jsonld',
          },
        },
      })).toEqual({
        'http://example.org/context.jsonld': {
          name1: 'a',
        },
      });
      expect(await builder.buildComponentContexts({
        a: {
          version: '1.0.0',
          'lsd:contexts': {
            'http://example.org/context.jsonld': 'components/context.jsonld',
          },
        },
        b: {
          version: '1.1.0',
          'lsd:contexts': {
            'http://example.org/context.jsonld': 'components/context.jsonld',
          },
        },
      })).toEqual({
        'http://example.org/context.jsonld': {
          name2: 'a',
        },
      });
    });

    it('should warn on packages with the same context IRI ' +
      'with different major versions with a logger', async() => {
      const logger = <any> {
        warn: jest.fn(),
      };
      builder = new ModuleStateBuilder(logger);
      fileContents = {
        'a/components/context.jsonld': `{ "name1": "a" }`,
        'b/components/context.jsonld': `{ "name2": "a" }`,
      };
      expect(await builder.buildComponentContexts({
        a: {
          version: '1.0.0',
          'lsd:contexts': {
            'http://example.org/context.jsonld': 'components/context.jsonld',
          },
        },
        b: {
          version: '2.0.0',
          'lsd:contexts': {
            'http://example.org/context.jsonld': 'components/context.jsonld',
          },
        },
      })).toEqual({
        'http://example.org/context.jsonld': {
          name2: 'a',
        },
      });
      expect(logger.warn).toHaveBeenNthCalledWith(1, `Detected multiple incompatible occurrences of 'http://example.org/context.jsonld' for version 1.0.0 and 'b/components/context.jsonld'@2.0.0`);
    });
  });

  describe('buildComponentImportPaths', () => {
    it('should handle an empty hash', async() => {
      expect(await builder.buildComponentImportPaths({})).toEqual({});
    });

    it('should handle one package with one import path', async() => {
      files = [ 'a/components/' ];
      expect(await builder.buildComponentImportPaths({
        a: {
          version: '1.0.0',
          'lsd:importPaths': {
            'http://example.org/components/': 'components/',
          },
        },
      })).toEqual({
        'http://example.org/components/': 'a/components/',
      });
    });

    it('should handle packages with import paths', async() => {
      files = [
        'a/components/',
        'a/config/',
        'b/components/',
        'b/config/',
      ];
      expect(await builder.buildComponentImportPaths({
        a: {
          version: '1.0.0',
          'lsd:importPaths': {
            'http://example.org/components/': 'components/',
            'http://example.org/config/': 'config/',
          },
        },
        b: {
          version: '1.0.0',
          'lsd:importPaths': {
            'http://example2.org/components/': 'components/',
            'http://example2.org/config/': 'config/',
          },
        },
      })).toEqual({
        'http://example.org/components/': 'a/components/',
        'http://example.org/config/': 'a/config/',
        'http://example2.org/components/': 'b/components/',
        'http://example2.org/config/': 'b/config/',
      });
    });

    it('should error when a directory does not exist', async() => {
      await expect(builder.buildComponentImportPaths({
        a: {
          version: '1.0.0',
          'lsd:importPaths': {
            'http://example.org/components/': 'components/',
          },
        },
      })).rejects.toThrow(new Error(`Error while parsing import path 'http://example.org/components/' in a: a/components/ does not exist.`));
    });

    it('should error when a directory is actually a file', async() => {
      files = [
        'a/components.file',
      ];
      await expect(builder.buildComponentImportPaths({
        a: {
          version: '1.0.0',
          'lsd:importPaths': {
            'http://example.org/components/': 'components.file',
          },
        },
      })).rejects.toThrow(new Error(`Error while parsing import path 'http://example.org/components/' in a: a/components.file is not a directory.`));
    });

    it('should handle packages with the same import path', async() => {
      files = [
        'a/components/',
        'b/components/',
      ];
      expect(await builder.buildComponentImportPaths({
        a: {
          version: '1.0.1',
          'lsd:importPaths': {
            'http://example.org/components/': 'components/',
          },
        },
        b: {
          version: '1.0.0',
          'lsd:importPaths': {
            'http://example.org/components/': 'components/',
          },
        },
      })).toEqual({
        'http://example.org/components/': 'a/components/',
      });
      expect(await builder.buildComponentImportPaths({
        a: {
          version: '1.0.0',
          'lsd:importPaths': {
            'http://example.org/components/': 'components/',
          },
        },
        b: {
          version: '1.1.0',
          'lsd:importPaths': {
            'http://example.org/components/': 'components/',
          },
        },
      })).toEqual({
        'http://example.org/components/': 'b/components/',
      });
    });

    it('should warn on packages with the same import path ' +
      'with different major versions with a logger', async() => {
      const logger = <any> {
        warn: jest.fn(),
      };
      builder = new ModuleStateBuilder(logger);
      files = [
        'a/components/',
        'b/components/',
      ];
      expect(await builder.buildComponentImportPaths({
        a: {
          version: '1.0.0',
          'lsd:importPaths': {
            'http://example.org/components/': 'components/',
          },
        },
        b: {
          version: '2.0.0',
          'lsd:importPaths': {
            'http://example.org/components/': 'components/',
          },
        },
      })).toEqual({
        'http://example.org/components/': 'b/components/',
      });
      expect(logger.warn).toHaveBeenNthCalledWith(1, `Detected multiple incompatible occurrences of 'http://example.org/components/' for version 1.0.0 and 'b/components/'@2.0.0`);
    });
  });
});
