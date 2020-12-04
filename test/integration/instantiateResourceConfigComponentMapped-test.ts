import type { Resource, RdfObjectLoader } from 'rdf-object';
import { mocked } from 'ts-jest/utils';
import type { IConfigConstructorPool } from '../../lib/construction/IConfigConstructorPool';
import type { IConstructionSettings } from '../../lib/construction/IConstructionSettings';
import type { Loader } from '../../lib/Loader';
import * as Util from '../../lib/Util';
import { LoaderMocked } from './LoaderMocked';

const N3 = require('n3');
jest.mock('n3', () => ({
  Lexer: jest.fn((args: any) => ({ type: 'LEXER', args })),
  Parser: jest.fn((args: any) => ({ type: 'PARSER', args })),
  Util: { type: 'UTIL' },
}));

const Hello = require('../../__mocks__/helloworld').Hello;

describe('construction with mapped component configs as Resource', () => {
  let loader: Loader<any>;
  let configConstructorPool: IConfigConstructorPool<any>;
  let objectLoader: RdfObjectLoader;
  let settings: IConstructionSettings;
  beforeEach(async() => {
    loader = new LoaderMocked();
    configConstructorPool = await loader.getInstancePool();
    objectLoader = (<any> loader).objectLoader;
    settings = {};
    jest.clearAllMocks();
  });

  describe('for a component that requires no construction', () => {
    beforeEach(() => {
      (<any> loader).componentResources['http://example.org/n3#Util'] = objectLoader.createCompactedResource({
        '@id': 'http://example.org/n3#Util',
        requireElement: '"Util"',
        types: `${Util.PREFIXES.oo}ComponentInstance`,
        constructorArguments: {
          list: [],
        },
        module: {
          '@id': 'http://example.org/n3',
          requireName: '"n3"',
        },
      });
    });

    it('instantiated with a config with all parameters', async() => {
      const config = objectLoader.createCompactedResource({
        types: 'http://example.org/n3#Util',
      });
      const instance = await configConstructorPool.instantiate(config, settings);
      expect(instance.type).toEqual('UTIL');
      expect(instance).toBe(N3.Util);
    });
  });

  describe('for a component without parameters', () => {
    beforeEach(() => {
      (<any> loader).componentResources['http://example.org/n3#Lexer'] = objectLoader.createCompactedResource({
        '@id': 'http://example.org/n3#Lexer',
        requireElement: '"Lexer"',
        constructorArguments: {
          list: [],
        },
        module: {
          '@id': 'http://example.org/n3',
          requireName: '"n3"',
        },
      });
    });

    it('instantiated with a config', async() => {
      const config = objectLoader.createCompactedResource({
        types: 'http://example.org/n3#Lexer',
      });
      const instance = await configConstructorPool.instantiate(config, settings);
      expect(instance.type).toEqual('LEXER');
      expect(N3.Lexer).toHaveBeenCalledWith();
    });
  });

  describe('for a component with non-unique parameters', () => {
    beforeEach(() => {
      (<any> loader).componentResources['http://example.org/n3#Lexer'] = objectLoader.createCompactedResource({
        '@id': 'http://example.org/n3#Lexer',
        requireElement: '"Lexer"',
        parameters: [
          { '@id': 'http://example.org/n3#lineMode' },
          { '@id': 'http://example.org/n3#n3' },
          { '@id': 'http://example.org/n3#comments' },
        ],
        constructorArguments: {
          list: [
            {
              fields: [
                {
                  key: '"lineMode"',
                  value: 'http://example.org/n3#lineMode',
                },
                {
                  key: '"n3"',
                  value: 'http://example.org/n3#n3',
                },
                {
                  key: '"comments"',
                  value: 'http://example.org/n3#comments',
                },
              ],
            },
          ],
        },
        module: {
          '@id': 'http://example.org/n3',
          requireName: '"n3"',
        },
      });
    });

    it('instantiated with a config with all parameters', async() => {
      const config = objectLoader.createCompactedResource({
        types: 'http://example.org/n3#Lexer',
        'http://example.org/n3#lineMode': '"true"',
        'http://example.org/n3#n3': '"true"',
        'http://example.org/n3#comments': '"true"',
      });
      const instance = await configConstructorPool.instantiate(config, settings);
      expect(instance.type).toEqual('LEXER');
      expect(N3.Lexer).toHaveBeenCalledWith({
        lineMode: [ 'true' ],
        n3: [ 'true' ],
        comments: [ 'true' ],
      });
    });

    it('instantiated with a config with all parameters with multiple values', async() => {
      const config = objectLoader.createCompactedResource({
        types: 'http://example.org/n3#Lexer',
        'http://example.org/n3#lineMode': [ '"A1"', '"A2"' ],
        'http://example.org/n3#n3': [ '"B1"', '"B2"' ],
        'http://example.org/n3#comments': [ '"C1"', '"C2"' ],
      });
      const instance = await configConstructorPool.instantiate(config, settings);
      expect(instance.type).toEqual('LEXER');
      expect(N3.Lexer).toHaveBeenCalledWith({
        lineMode: [ 'A1', 'A2' ],
        n3: [ 'B1', 'B2' ],
        comments: [ 'C1', 'C2' ],
      });
    });
  });

  describe('for a component with unique parameters', () => {
    beforeEach(() => {
      (<any> loader).componentResources['http://example.org/n3#Lexer'] = objectLoader.createCompactedResource({
        '@id': 'http://example.org/n3#Lexer',
        requireElement: '"Lexer"',
        parameters: [
          { '@id': 'http://example.org/n3#lineMode', unique: '"true"' },
          { '@id': 'http://example.org/n3#n3', unique: '"true"' },
          { '@id': 'http://example.org/n3#comments', unique: '"true"' },
        ],
        constructorArguments: {
          list: [
            {
              fields: [
                {
                  key: '"lineMode"',
                  value: 'http://example.org/n3#lineMode',
                },
                {
                  key: '"n3"',
                  value: 'http://example.org/n3#n3',
                },
                {
                  key: '"comments"',
                  value: 'http://example.org/n3#comments',
                },
              ],
            },
          ],
        },
        module: {
          '@id': 'http://example.org/n3',
          requireName: '"n3"',
        },
      });
    });

    it('instantiated with a config with all parameters', async() => {
      const config = objectLoader.createCompactedResource({
        types: 'http://example.org/n3#Lexer',
        'http://example.org/n3#lineMode': '"true"',
        'http://example.org/n3#n3': '"true"',
        'http://example.org/n3#comments': '"true"',
      });
      const instance = await configConstructorPool.instantiate(config, settings);
      expect(instance.type).toEqual('LEXER');
      expect(N3.Lexer).toHaveBeenCalledWith({
        lineMode: 'true',
        n3: 'true',
        comments: 'true',
      });
    });

    it('instantiated with a config with all parameters with multiple values', async() => {
      const config = objectLoader.createCompactedResource({
        types: 'http://example.org/n3#Lexer',
        'http://example.org/n3#lineMode': [ '"A1"', '"A2"' ],
        'http://example.org/n3#n3': [ '"B1"', '"B2"' ],
        'http://example.org/n3#comments': [ '"C1"', '"C2"' ],
      });
      const instance = await configConstructorPool.instantiate(config, settings);
      expect(instance.type).toEqual('LEXER');
      expect(N3.Lexer).toHaveBeenCalledWith({
        lineMode: 'A1',
        n3: 'B1',
        comments: 'C1',
      });
    });

    describe('instantiated with a config with variables', () => {
      let config: Resource;
      beforeEach(() => {
        config = objectLoader.createCompactedResource({
          types: 'http://example.org/n3#Lexer',
          'http://example.org/n3#lineMode': { '@id': 'ex:var1', types: 'om:Variable' },
          'http://example.org/n3#n3': { '@id': 'ex:var2', types: 'om:Variable' },
          'http://example.org/n3#comments': { '@id': 'ex:var2', types: 'om:Variable' },
        });
      });

      it('with variables that are defined', async() => {
        settings.variables = {
          'ex:var1': 'A',
          'ex:var2': 'B',
          'ex:var3': 'C',
        };
        const instance = await configConstructorPool.instantiate(config, settings);
        expect(instance.type).toEqual('LEXER');
        expect(N3.Lexer).toHaveBeenCalledWith({
          lineMode: 'A',
          n3: 'B',
          comments: 'B',
        });
      });

      it('with undefined variables', async() => {
        await expect(configConstructorPool.instantiate(config, settings)).rejects
          .toThrowError(/^Undefined variable: ex:var1/u);
      });

      it('with variables that are undefined', async() => {
        settings.variables = {
          'ex:var1': 'A',
          'ex:var3': 'C',
        };
        await expect(configConstructorPool.instantiate(config, settings)).rejects
          .toThrowError(/^Undefined variable: ex:var2/u);
      });
    });
  });

  describe('for a component with required parameters', () => {
    beforeEach(() => {
      (<any> loader).componentResources['http://example.org/n3#Lexer'] = objectLoader.createCompactedResource({
        '@id': 'http://example.org/n3#Lexer',
        requireElement: '"Lexer"',
        parameters: [
          { '@id': 'http://example.org/n3#lineMode', unique: '"true"', required: '"true"' },
          { '@id': 'http://example.org/n3#n3', unique: '"true"', required: '"true"' },
          { '@id': 'http://example.org/n3#comments', unique: '"true"', required: '"true"' },
        ],
        constructorArguments: {
          list: [
            {
              fields: [
                {
                  key: '"lineMode"',
                  value: 'http://example.org/n3#lineMode',
                },
                {
                  key: '"n3"',
                  value: 'http://example.org/n3#n3',
                },
                {
                  key: '"comments"',
                  value: 'http://example.org/n3#comments',
                },
              ],
            },
          ],
        },
        module: {
          '@id': 'http://example.org/n3',
          requireName: '"n3"',
        },
      });
    });

    it('instantiated with a config with all parameters', async() => {
      const config = objectLoader.createCompactedResource({
        types: 'http://example.org/n3#Lexer',
        'http://example.org/n3#lineMode': '"true"',
        'http://example.org/n3#n3': '"true"',
        'http://example.org/n3#comments': '"true"',
      });
      const instance = await configConstructorPool.instantiate(config, settings);
      expect(instance.type).toEqual('LEXER');
      expect(N3.Lexer).toHaveBeenCalledWith({
        lineMode: 'true',
        n3: 'true',
        comments: 'true',
      });
    });

    it('instantiated with a config with no parameters', async() => {
      const config = objectLoader.createCompactedResource({
        types: 'http://example.org/n3#Lexer',
      });
      await expect(configConstructorPool.instantiate(config, settings)).rejects
        .toThrowError(/^No value was set for required parameter '.*' in./u);
    });
  });

  describe('for nested components', () => {
    beforeEach(() => {
      (<any> loader).componentResources['http://example.org/n3#Lexer'] = objectLoader.createCompactedResource({
        '@id': 'http://example.org/n3#Lexer',
        requireElement: '"Lexer"',
        parameters: [
          { '@id': 'http://example.org/n3#lineMode', unique: '"true"' },
          { '@id': 'http://example.org/n3#n3', unique: '"true"' },
          { '@id': 'http://example.org/n3#comments', unique: '"true"' },
        ],
        constructorArguments: {
          list: [
            {
              fields: [
                {
                  key: '"lineMode"',
                  value: 'http://example.org/n3#lineMode',
                },
                {
                  key: '"n3"',
                  value: 'http://example.org/n3#n3',
                },
                {
                  key: '"comments"',
                  value: 'http://example.org/n3#comments',
                },
              ],
            },
          ],
        },
        module: {
          '@id': 'http://example.org/n3',
          requireName: '"n3"',
        },
      });
      (<any> loader).componentResources['http://example.org/n3#Parser'] = objectLoader.createCompactedResource({
        '@id': 'http://example.org/n3#Parser',
        requireElement: '"Parser"',
        parameters: [
          { '@id': 'http://example.org/n3#format', unique: '"true"' },
          { '@id': 'http://example.org/n3#blankNodePrefix', unique: '"true"' },
          { '@id': 'http://example.org/n3#lexer', unique: '"true"' },
          { '@id': 'http://example.org/n3#explicitQuantifiers', unique: '"true"' },
        ],
        constructorArguments: {
          list: [
            {
              fields: [
                {
                  key: '"format"',
                  value: 'http://example.org/n3#format',
                },
                {
                  key: '"blankNodePrefix"',
                  value: 'http://example.org/n3#blankNodePrefix',
                },
                {
                  key: '"lexer"',
                  value: 'http://example.org/n3#lexer',
                },
                {
                  key: '"explicitQuantifiers"',
                  value: 'http://example.org/n3#explicitQuantifiers',
                },
              ],
            },
          ],
        },
        module: {
          '@id': 'http://example.org/n3',
          requireName: '"n3"',
        },
      });
    });

    it('instantiated with a config with all parameters', async() => {
      const config = objectLoader.createCompactedResource({
        types: 'http://example.org/n3#Parser',
        'http://example.org/n3#format': '"application/trig"',
        'http://example.org/n3#lexer': {
          types: 'http://example.org/n3#Lexer',
          'http://example.org/n3#lineMode': '"true"',
          'http://example.org/n3#n3': '"true"',
          'http://example.org/n3#comments': '"true"',
        },
      });
      const instance = await configConstructorPool.instantiate(config, settings);
      expect(instance.type).toEqual('PARSER');
      expect(N3.Parser).toHaveBeenCalledWith({
        format: 'application/trig',
        lexer: {
          type: 'LEXER',
          args: {
            lineMode: 'true',
            n3: 'true',
            comments: 'true',
          },
        },
      });
    });
  });

  describe('for a component with parameters with default values', () => {
    beforeEach(() => {
      (<any> loader).componentResources['http://example.org/n3#Lexer'] = objectLoader.createCompactedResource({
        '@id': 'http://example.org/n3#Lexer',
        requireElement: '"Lexer"',
        parameters: [
          { '@id': 'http://example.org/n3#lineMode', unique: '"true"', default: '"A"' },
          { '@id': 'http://example.org/n3#n3', unique: '"true"', default: [ '"B"', '"C"' ]},
          { '@id': 'http://example.org/n3#comments', unique: '"true"' },
        ],
        constructorArguments: {
          list: [
            {
              fields: [
                {
                  key: '"lineMode"',
                  value: 'http://example.org/n3#lineMode',
                },
                {
                  key: '"n3"',
                  value: 'http://example.org/n3#n3',
                },
                {
                  key: '"comments"',
                  value: 'http://example.org/n3#comments',
                },
              ],
            },
          ],
        },
        module: {
          '@id': 'http://example.org/n3',
          requireName: '"n3"',
        },
      });
    });

    it('instantiated with a config with all parameters', async() => {
      const config = objectLoader.createCompactedResource({
        types: 'http://example.org/n3#Lexer',
        'http://example.org/n3#lineMode': '"true"',
        'http://example.org/n3#n3': '"true"',
        'http://example.org/n3#comments': '"true"',
      });
      const instance = await configConstructorPool.instantiate(config, settings);
      expect(instance.type).toEqual('LEXER');
      expect(N3.Lexer).toHaveBeenCalledWith({
        lineMode: 'true',
        n3: 'true',
        comments: 'true',
      });
    });

    it('instantiated with a config without parameters', async() => {
      const config = objectLoader.createCompactedResource({
        types: 'http://example.org/n3#Lexer',
      });
      const instance = await configConstructorPool.instantiate(config, settings);
      expect(instance.type).toEqual('LEXER');
      expect(N3.Lexer).toHaveBeenCalledWith({
        lineMode: 'A',
        n3: 'B',
      });
    });
  });

  describe('for a component with parameters with default scoped values', () => {
    beforeEach(() => {
      (<any> loader).componentResources['http://example.org/n3#Lexer'] = objectLoader.createCompactedResource({
        '@id': 'http://example.org/n3#Lexer',
        requireElement: '"Lexer"',
        parameters: [
          {
            '@id': 'http://example.org/n3#lineMode',
            unique: '"true"',
            defaultScoped: [
              {
                defaultScope: 'http://example.org/n3#Lexer',
                defaultScopedValue: [
                  '"A"',
                ],
              },
            ],
          },
          {
            '@id': 'http://example.org/n3#n3',
            unique: '"true"',
            defaultScoped: [
              {
                defaultScope: 'http://example.org/n3#Lexer',
                defaultScopedValue: [
                  '"B"',
                  '"C"',
                ],
              },
            ],
          },
          {
            '@id': 'http://example.org/n3#comments',
            unique: '"true"',
          },
        ],
        constructorArguments: {
          list: [
            {
              fields: [
                {
                  key: '"lineMode"',
                  value: 'http://example.org/n3#lineMode',
                },
                {
                  key: '"n3"',
                  value: 'http://example.org/n3#n3',
                },
                {
                  key: '"comments"',
                  value: 'http://example.org/n3#comments',
                },
              ],
            },
          ],
        },
        module: {
          '@id': 'http://example.org/n3',
          requireName: '"n3"',
        },
      });
    });

    it('instantiated with a config with all parameters', async() => {
      const config = objectLoader.createCompactedResource({
        types: 'http://example.org/n3#Lexer',
        'http://example.org/n3#lineMode': '"true"',
        'http://example.org/n3#n3': '"true"',
        'http://example.org/n3#comments': '"true"',
      });
      const instance = await configConstructorPool.instantiate(config, settings);
      expect(instance.type).toEqual('LEXER');
      expect(N3.Lexer).toHaveBeenCalledWith({
        lineMode: 'true',
        n3: 'true',
        comments: 'true',
      });
    });

    it('instantiated with a config without parameters', async() => {
      const config = objectLoader.createCompactedResource({
        types: 'http://example.org/n3#Lexer',
      });
      const instance = await configConstructorPool.instantiate(config, settings);
      expect(instance.type).toEqual('LEXER');
      expect(N3.Lexer).toHaveBeenCalledWith({
        lineMode: 'A',
        n3: 'B',
      });
    });
  });

  describe('for a component with parameters with fixed values', () => {
    beforeEach(() => {
      (<any> loader).componentResources['http://example.org/n3#Lexer'] = objectLoader.createCompactedResource({
        '@id': 'http://example.org/n3#Lexer',
        requireElement: '"Lexer"',
        parameters: [
          { '@id': 'http://example.org/n3#lineMode', fixed: '"A"' },
          { '@id': 'http://example.org/n3#n3', fixed: [ '"B"', '"C"' ]},
          { '@id': 'http://example.org/n3#comments' },
        ],
        constructorArguments: {
          list: [
            {
              fields: [
                {
                  key: '"lineMode"',
                  value: 'http://example.org/n3#lineMode',
                },
                {
                  key: '"n3"',
                  value: 'http://example.org/n3#n3',
                },
                {
                  key: '"comments"',
                  value: 'http://example.org/n3#comments',
                },
              ],
            },
          ],
        },
        module: {
          '@id': 'http://example.org/n3',
          requireName: '"n3"',
        },
      });
    });

    it('instantiated with a config with all parameters', async() => {
      const config = objectLoader.createCompactedResource({
        types: 'http://example.org/n3#Lexer',
        'http://example.org/n3#lineMode': '"true"',
        'http://example.org/n3#n3': '"true"',
        'http://example.org/n3#comments': '"true"',
      });
      const instance = await configConstructorPool.instantiate(config, settings);
      expect(instance.type).toEqual('LEXER');
      expect(N3.Lexer).toHaveBeenCalledWith({
        lineMode: [ 'A', 'true' ],
        n3: [ 'B', 'C', 'true' ],
        comments: [ 'true' ],
      });
    });

    it('instantiated with a config without parameters', async() => {
      const config = objectLoader.createCompactedResource({
        types: 'http://example.org/n3#Lexer',
      });
      const instance = await configConstructorPool.instantiate(config, settings);
      expect(instance.type).toEqual('LEXER');
      expect(N3.Lexer).toHaveBeenCalledWith({
        lineMode: [ 'A' ],
        n3: [ 'B', 'C' ],
      });
    });
  });

  describe('for a component with parameters with fixed and unique values', () => {
    beforeEach(() => {
      (<any> loader).componentResources['http://example.org/n3#Lexer'] = objectLoader.createCompactedResource({
        '@id': 'http://example.org/n3#Lexer',
        requireElement: '"Lexer"',
        parameters: [
          { '@id': 'http://example.org/n3#lineMode', unique: '"true"', fixed: '"A"' },
          { '@id': 'http://example.org/n3#n3', unique: '"true"', fixed: [ '"B"', '"C"' ]},
          { '@id': 'http://example.org/n3#comments', unique: '"true"' },
        ],
        constructorArguments: {
          list: [
            {
              fields: [
                {
                  key: '"lineMode"',
                  value: 'http://example.org/n3#lineMode',
                },
                {
                  key: '"n3"',
                  value: 'http://example.org/n3#n3',
                },
                {
                  key: '"comments"',
                  value: 'http://example.org/n3#comments',
                },
              ],
            },
          ],
        },
        module: {
          '@id': 'http://example.org/n3',
          requireName: '"n3"',
        },
      });
    });

    it('instantiated with a config with all parameters', async() => {
      const config = objectLoader.createCompactedResource({
        types: 'http://example.org/n3#Lexer',
        'http://example.org/n3#lineMode': '"true"',
        'http://example.org/n3#n3': '"true"',
        'http://example.org/n3#comments': '"true"',
      });
      const instance = await configConstructorPool.instantiate(config, settings);
      expect(instance.type).toEqual('LEXER');
      expect(N3.Lexer).toHaveBeenCalledWith({
        lineMode: 'A',
        n3: 'B',
        comments: 'true',
      });
    });

    it('instantiated with a config without parameters', async() => {
      const config = objectLoader.createCompactedResource({
        types: 'http://example.org/n3#Lexer',
      });
      const instance = await configConstructorPool.instantiate(config, settings);
      expect(instance.type).toEqual('LEXER');
      expect(N3.Lexer).toHaveBeenCalledWith({
        lineMode: 'A',
        n3: 'B',
      });
    });
  });

  describe('for a component with lazy parameters', () => {
    beforeEach(() => {
      (<any> loader).componentResources['http://example.org/n3#Lexer'] = objectLoader.createCompactedResource({
        '@id': 'http://example.org/n3#Lexer',
        requireElement: '"Lexer"',
        parameters: [
          { '@id': 'http://example.org/n3#lineMode', unique: '"true"', lazy: '"true"' },
          { '@id': 'http://example.org/n3#n3', lazy: '"true"' },
        ],
        constructorArguments: {
          list: [
            {
              fields: [
                {
                  key: '"lineMode"',
                  value: 'http://example.org/n3#lineMode',
                },
                {
                  key: '"n3"',
                  value: 'http://example.org/n3#n3',
                },
                {
                  key: '"comments"',
                  value: 'http://example.org/n3#comments',
                },
              ],
            },
          ],
        },
        module: {
          '@id': 'http://example.org/n3',
          requireName: '"n3"',
        },
      });
    });

    it('instantiated with a config with all parameters', async() => {
      const config = objectLoader.createCompactedResource({
        types: 'http://example.org/n3#Lexer',
        'http://example.org/n3#lineMode': '"true"',
        'http://example.org/n3#n3': '"true"',
      });
      const instance = await configConstructorPool.instantiate(config, settings);
      expect(instance.type).toEqual('LEXER');
      expect(await mocked(N3.Lexer).mock.calls[0][0].lineMode()).toEqual('true');
      expect(await mocked(N3.Lexer).mock.calls[0][0].n3[0]()).toEqual('true');
    });

    it('instantiated with a config with all parameters with multiple values', async() => {
      const config = objectLoader.createCompactedResource({
        types: 'http://example.org/n3#Lexer',
        'http://example.org/n3#lineMode': [ '"A1"', '"A2"' ],
        'http://example.org/n3#n3': [ '"B1"', '"B2"' ],
      });
      const instance = await configConstructorPool.instantiate(config, settings);
      expect(instance.type).toEqual('LEXER');
      expect(await mocked(N3.Lexer).mock.calls[0][0].lineMode()).toEqual('A1');
      expect(await mocked(N3.Lexer).mock.calls[0][0].n3[0]()).toEqual('B1');
    });
  });

  describe('for an internal component', () => {
    beforeEach(() => {
      (<any> loader).componentResources['http://example.org/HelloWorldModule#SayHelloComponent'] = objectLoader
        .createCompactedResource({
          '@id': 'http://example.org/HelloWorldModule#SayHelloComponent',
          requireElement: '"Hello"',
          parameters: [
            {
              '@id': 'http://example.org/HelloWorldModule#dummyParam',
              unique: '"true"',
            },
          ],
          constructorArguments: {
            list: [
              {
                fields: [
                  {
                    key: '"dummyParam"',
                    value: 'http://example.org/HelloWorldModule#dummyParam',
                  },
                ],
              },
            ],
          },
          module: {
            '@id': 'http://example.org/HelloWorldModule',
            requireName: '"helloworld"',
          },
        });
    });

    it('instantiated with a config', async() => {
      const config = objectLoader.createCompactedResource({
        types: 'http://example.org/HelloWorldModule#SayHelloComponent',
        'http://example.org/HelloWorldModule#dummyParam': '"true"',
      });
      const instance = await configConstructorPool.instantiate(config, settings);
      expect(instance).toBeInstanceOf(Hello);
      expect(instance._params).toEqual([{
        dummyParam: 'true',
      }]);
    });
  });

  describe('for a component with rdf:subject param', () => {
    beforeEach(() => {
      (<any> loader).componentResources['http://example.org/HelloWorldModule#SayHelloComponent'] = objectLoader
        .createCompactedResource({
          '@id': 'http://example.org/HelloWorldModule#SayHelloComponent',
          requireElement: '"Hello"',
          constructorArguments: {
            list: [
              {
                fields: [
                  {
                    key: '"dummyParam"',
                    value: 'rdf:subject',
                  },
                ],
              },
            ],
          },
          module: {
            '@id': 'http://example.org/HelloWorldModule',
            requireName: '"helloworld"',
          },
        });
    });

    it('instantiated with a config', async() => {
      const config = objectLoader.createCompactedResource({
        '@id': 'http://example.org/myInstance',
        types: 'http://example.org/HelloWorldModule#SayHelloComponent',
        'http://example.org/HelloWorldModule#dummyParam': '"true"',
      });
      const instance = await configConstructorPool.instantiate(config, settings);
      expect(instance).toBeInstanceOf(Hello);
      expect(instance._params).toEqual([{
        dummyParam: 'http://example.org/myInstance',
      }]);
    });
  });

  describe('for a component with elements', () => {
    beforeEach(() => {
      (<any> loader).componentResources['http://example.org/HelloWorldModule#SayHelloComponent'] = objectLoader
        .createCompactedResource({
          '@id': 'http://example.org/HelloWorldModule#SayHelloComponent',
          requireElement: '"Hello"',
          parameters: [
            {
              '@id': 'http://example.org/HelloWorldModule#dummyParam1',
            },
            {
              '@id': 'http://example.org/HelloWorldModule#dummyParam2',
            },
          ],
          constructorArguments: {
            list: [
              {
                elements: {
                  list: [
                    'http://example.org/HelloWorldModule#dummyParam1',
                    'http://example.org/HelloWorldModule#dummyParam2',
                  ],
                },
              },
            ],
          },
          module: {
            '@id': 'http://example.org/HelloWorldModule',
            requireName: '"helloworld"',
          },
        });
    });

    it('instantiated with a config', async() => {
      const config = objectLoader.createCompactedResource({
        types: 'http://example.org/HelloWorldModule#SayHelloComponent',
        'http://example.org/HelloWorldModule#dummyParam1': '"A"',
        'http://example.org/HelloWorldModule#dummyParam2': '"B"',
      });
      const instance = await configConstructorPool.instantiate(config, settings);
      expect(instance).toBeInstanceOf(Hello);
      expect(instance._params).toEqual([[
        'A',
        'B',
      ]]);
    });
  });

  describe('for a component with root elements', () => {
    beforeEach(() => {
      (<any> loader).componentResources['http://example.org/HelloWorldModule#SayHelloComponent'] = objectLoader
        .createCompactedResource({
          '@id': 'http://example.org/HelloWorldModule#SayHelloComponent',
          requireElement: '"Hello"',
          parameters: [
            {
              '@id': 'http://example.org/HelloWorldModule#dummyParam1',
            },
            {
              '@id': 'http://example.org/HelloWorldModule#dummyParam2',
            },
          ],
          constructorArguments: {
            list: [
              'http://example.org/HelloWorldModule#dummyParam1',
              'http://example.org/HelloWorldModule#dummyParam2',
            ],
          },
          module: {
            '@id': 'http://example.org/HelloWorldModule',
            requireName: '"helloworld"',
          },
        });
    });

    it('instantiated with a config', async() => {
      const config = objectLoader.createCompactedResource({
        types: 'http://example.org/HelloWorldModule#SayHelloComponent',
        'http://example.org/HelloWorldModule#dummyParam1': '"A"',
        'http://example.org/HelloWorldModule#dummyParam2': '"B"',
      });
      const instance = await configConstructorPool.instantiate(config, settings);
      expect(instance).toBeInstanceOf(Hello);
      expect(instance._params).toEqual([
        'A',
        'B',
      ]);
    });
  });

  describe('for a component with raw reference param', () => {
    beforeEach(() => {
      (<any> loader).componentResources['http://example.org/HelloWorldModule#SayHelloComponent'] = objectLoader
        .createCompactedResource({
          '@id': 'http://example.org/HelloWorldModule#SayHelloComponent',
          requireElement: '"Hello"',
          parameters: [
            {
              '@id': 'http://example.org/HelloWorldModule#dummyParam',
            },
          ],
          constructorArguments: {
            list: [
              {
                fields: [
                  {
                    key: '"dummyParam"',
                    valueRawReference: 'http://example.org/HelloWorldModule#dummyParam',
                  },
                ],
              },
            ],
          },
          module: {
            '@id': 'http://example.org/HelloWorldModule',
            requireName: '"helloworld"',
          },
        });
    });

    it('instantiated with a config', async() => {
      const config = objectLoader.createCompactedResource({
        '@id': 'http://example.org/myInstance',
        types: 'http://example.org/HelloWorldModule#SayHelloComponent',
        'http://example.org/HelloWorldModule#dummyParam': 'ex:abc',
      });
      const instance = await configConstructorPool.instantiate(config, settings);
      expect(instance).toBeInstanceOf(Hello);
      expect(instance._params).toEqual([{
        dummyParam: 'ex:abc',
      }]);
    });
  });
});
