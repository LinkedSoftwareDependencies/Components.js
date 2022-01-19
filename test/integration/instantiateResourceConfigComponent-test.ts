import type { Resource, RdfObjectLoader } from 'rdf-object';
import { mocked } from 'ts-jest/utils';
import { ComponentsManager } from '../../lib/ComponentsManager';
import type { IConfigConstructorPool } from '../../lib/construction/IConfigConstructorPool';
import type { IConstructionSettings } from '../../lib/construction/IConstructionSettings';
import { IRIS_OO } from '../../lib/rdf/Iris';

const N3 = require('n3');
jest.mock('n3', () => ({
  Lexer: jest.fn((args: any) => ({ type: 'LEXER', args })),
  Parser: jest.fn((args: any) => ({ type: 'PARSER', args })),
  Util: { type: 'UTIL' },
}));

describe('construction with component configs as Resource', () => {
  let manager: ComponentsManager<any>;
  let configConstructorPool: IConfigConstructorPool<any>;
  let objectLoader: RdfObjectLoader;
  let settings: IConstructionSettings;
  beforeEach(async() => {
    manager = await ComponentsManager.build({
      mainModulePath: `${__dirname}/../../__mocks__`,
      moduleState: <any> {
        mainModulePath: `${__dirname}/../../__mocks__`,
      },
      async moduleLoader() {
        // Register nothing
      },
    });
    configConstructorPool = manager.configConstructorPool;
    objectLoader = manager.objectLoader;
    settings = {};
    jest.clearAllMocks();
  });

  describe('for a component that requires no construction', () => {
    beforeEach(() => {
      manager.componentResources['http://example.org/n3#Util'] = objectLoader.createCompactedResource({
        '@id': 'http://example.org/n3#Util',
        requireElement: '"Util"',
        types: IRIS_OO.ComponentInstance,
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
      manager.componentResources['http://example.org/n3#Lexer'] = objectLoader.createCompactedResource({
        '@id': 'http://example.org/n3#Lexer',
        requireElement: '"Lexer"',
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
      expect(N3.Lexer).toHaveBeenCalledWith({});
    });
  });

  describe('for a component with parameters without range', () => {
    beforeEach(() => {
      manager.componentResources['http://example.org/n3#Lexer'] = objectLoader.createCompactedResource({
        '@id': 'http://example.org/n3#Lexer',
        requireElement: '"Lexer"',
        parameters: [
          { '@id': 'http://example.org/n3#lineMode' },
          { '@id': 'http://example.org/n3#n3' },
          { '@id': 'http://example.org/n3#comments' },
        ],
        module: {
          '@id': 'http://example.org/n3',
          requireName: '"n3"',
        },
      });
    });

    it('instantiated with a config without all parameters', async() => {
      const config = objectLoader.createCompactedResource({
        types: 'http://example.org/n3#Lexer',
      });
      const instance = await configConstructorPool.instantiate(config, settings);
      expect(instance.type).toEqual('LEXER');
      expect(N3.Lexer).toHaveBeenCalledWith({
        'http://example.org/n3#lineMode': undefined,
        'http://example.org/n3#n3': undefined,
        'http://example.org/n3#comments': undefined,
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
        'http://example.org/n3#lineMode': 'true',
        'http://example.org/n3#n3': 'true',
        'http://example.org/n3#comments': 'true',
      });
    });

    it('instantiated with a config with all parameters with multiple values should throw', async() => {
      const config = objectLoader.createCompactedResource({
        '@id': 'ex:config',
        types: 'http://example.org/n3#Lexer',
        'http://example.org/n3#lineMode': [ '"A1"', '"A2"' ],
        'http://example.org/n3#n3': [ '"B1"', '"B2"' ],
        'http://example.org/n3#comments': [ '"C1"', '"C2"' ],
      });
      await expect(configConstructorPool.instantiate(config, settings)).rejects
        .toThrowError(`Detected multiple values for parameter http://example.org/n3#lineMode in ex:config. RDF lists should be used for defining multiple values.`);
    });

    it('instantiated with a config with all parameters with multiple values as list', async() => {
      const config = objectLoader.createCompactedResource({
        types: 'http://example.org/n3#Lexer',
        'http://example.org/n3#lineMode': { list: [ '"A1"', '"A2"' ]},
        'http://example.org/n3#n3': { list: [ '"B1"', '"B2"' ]},
        'http://example.org/n3#comments': { list: [ '"C1"', '"C2"' ]},
      });
      const instance = await configConstructorPool.instantiate(config, settings);
      expect(instance.type).toEqual('LEXER');
      expect(N3.Lexer).toHaveBeenCalledWith({
        'http://example.org/n3#lineMode': [ 'A1', 'A2' ],
        'http://example.org/n3#n3': [ 'B1', 'B2' ],
        'http://example.org/n3#comments': [ 'C1', 'C2' ],
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
          'http://example.org/n3#lineMode': 'A',
          'http://example.org/n3#n3': 'B',
          'http://example.org/n3#comments': 'B',
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

  describe('for a component with non-unique parameters', () => {
    beforeEach(() => {
      manager.componentResources['http://example.org/n3#Lexer'] = objectLoader.createCompactedResource({
        '@id': 'http://example.org/n3#Lexer',
        requireElement: '"Lexer"',
        parameters: [
          {
            '@id': 'http://example.org/n3#lineMode',
            range: {
              '@type': 'ParameterRangeArray',
              parameterRangeValue: 'xsd:string',
            },
          },
          {
            '@id': 'http://example.org/n3#n3',
            range: {
              '@type': 'ParameterRangeArray',
              parameterRangeValue: 'xsd:string',
            },
          },
          {
            '@id': 'http://example.org/n3#comments',
            range: {
              '@type': 'ParameterRangeArray',
              parameterRangeValue: 'xsd:string',
            },
          },
        ],
        module: {
          '@id': 'http://example.org/n3',
          requireName: '"n3"',
        },
      });
    });

    it('instantiated with a config with all parameters as singular values should throw', async() => {
      const config = objectLoader.createCompactedResource({
        types: 'http://example.org/n3#Lexer',
        'http://example.org/n3#lineMode': '"true"',
        'http://example.org/n3#n3': '"true"',
        'http://example.org/n3#comments': '"true"',
      });
      await expect(configConstructorPool.instantiate(config, settings)).rejects
        .toThrowError(/The value "true" for parameter ".*lineMode" is not of required range type ".*string\[\]"/u);
    });

    it('instantiated with a config with all parameters as multiple non-list values should throw', async() => {
      const config = objectLoader.createCompactedResource({
        '@id': 'ex:config',
        types: 'http://example.org/n3#Lexer',
        'http://example.org/n3#lineMode': [ '"true"', '"false"' ],
        'http://example.org/n3#n3': [ '"true"', '"false"' ],
        'http://example.org/n3#comments': [ '"true"', '"false"' ],
      });
      await expect(configConstructorPool.instantiate(config, settings)).rejects
        .toThrowError(`Detected multiple values for parameter http://example.org/n3#lineMode in ex:config. RDF lists should be used for defining multiple values.`);
    });

    it('instantiated with a config with all parameters as singular values as list', async() => {
      const config = objectLoader.createCompactedResource({
        types: 'http://example.org/n3#Lexer',
        'http://example.org/n3#lineMode': { list: [ '"true"' ]},
        'http://example.org/n3#n3': { list: [ '"true"' ]},
        'http://example.org/n3#comments': { list: [ '"true"' ]},
      });
      const instance = await configConstructorPool.instantiate(config, settings);
      expect(instance.type).toEqual('LEXER');
      expect(N3.Lexer).toHaveBeenCalledWith({
        'http://example.org/n3#lineMode': [ 'true' ],
        'http://example.org/n3#n3': [ 'true' ],
        'http://example.org/n3#comments': [ 'true' ],
      });
    });

    it('instantiated with a config with all parameters with multiple values as list', async() => {
      const config = objectLoader.createCompactedResource({
        types: 'http://example.org/n3#Lexer',
        'http://example.org/n3#lineMode': { list: [ '"A1"', '"A2"' ]},
        'http://example.org/n3#n3': { list: [ '"B1"', '"B2"' ]},
        'http://example.org/n3#comments': { list: [ '"C1"', '"C2"' ]},
      });
      const instance = await configConstructorPool.instantiate(config, settings);
      expect(instance.type).toEqual('LEXER');
      expect(N3.Lexer).toHaveBeenCalledWith({
        'http://example.org/n3#lineMode': [ 'A1', 'A2' ],
        'http://example.org/n3#n3': [ 'B1', 'B2' ],
        'http://example.org/n3#comments': [ 'C1', 'C2' ],
      });
    });
  });

  describe('for a component with unique parameters', () => {
    beforeEach(() => {
      manager.componentResources['http://example.org/n3#Lexer'] = objectLoader.createCompactedResource({
        '@id': 'http://example.org/n3#Lexer',
        requireElement: '"Lexer"',
        parameters: [
          { '@id': 'http://example.org/n3#lineMode', range: 'xsd:string' },
          { '@id': 'http://example.org/n3#n3', range: 'xsd:string' },
          { '@id': 'http://example.org/n3#comments', range: 'xsd:string' },
        ],
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
        'http://example.org/n3#lineMode': 'true',
        'http://example.org/n3#n3': 'true',
        'http://example.org/n3#comments': 'true',
      });
    });

    it('instantiated with a config with all parameters with multiple values should throw', async() => {
      const config = objectLoader.createCompactedResource({
        '@id': 'ex:config',
        types: 'http://example.org/n3#Lexer',
        'http://example.org/n3#lineMode': [ '"A1"', '"A2"' ],
        'http://example.org/n3#n3': [ '"B1"', '"B2"' ],
        'http://example.org/n3#comments': [ '"C1"', '"C2"' ],
      });
      await expect(configConstructorPool.instantiate(config, settings)).rejects
        .toThrowError(`Detected multiple values for parameter http://example.org/n3#lineMode in ex:config. RDF lists should be used for defining multiple values.`);
    });

    it('instantiated with a config with all parameters with multiple values as list should throw', async() => {
      const config = objectLoader.createCompactedResource({
        types: 'http://example.org/n3#Lexer',
        'http://example.org/n3#lineMode': { list: [ '"A1"', '"A2"' ]},
        'http://example.org/n3#n3': { list: [ '"B1"', '"B2"' ]},
        'http://example.org/n3#comments': { list: [ '"C1"', '"C2"' ]},
      });
      await expect(configConstructorPool.instantiate(config, settings)).rejects
        .toThrowError(/The value ".*" for parameter ".*lineMode" is not of required range type ".*string"/u);
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
          'http://example.org/n3#lineMode': 'A',
          'http://example.org/n3#n3': 'B',
          'http://example.org/n3#comments': 'B',
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
      manager.componentResources['http://example.org/n3#Lexer'] = objectLoader.createCompactedResource({
        '@id': 'http://example.org/n3#Lexer',
        requireElement: '"Lexer"',
        parameters: [
          { '@id': 'http://example.org/n3#lineMode', range: 'xsd:string' },
          { '@id': 'http://example.org/n3#n3', range: 'xsd:string' },
          { '@id': 'http://example.org/n3#comments', range: 'xsd:string' },
        ],
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
        'http://example.org/n3#lineMode': 'true',
        'http://example.org/n3#n3': 'true',
        'http://example.org/n3#comments': 'true',
      });
    });

    it('instantiated with a config with no parameters', async() => {
      const config = objectLoader.createCompactedResource({
        types: 'http://example.org/n3#Lexer',
      });
      await expect(configConstructorPool.instantiate(config, settings)).rejects
        .toThrowError(/^The value "undefined" for parameter ".*lineMode" is not of required range type ".*string"/u);
    });
  });

  describe('for a component with optional parameters', () => {
    beforeEach(() => {
      manager.componentResources['http://example.org/n3#Lexer'] = objectLoader.createCompactedResource({
        '@id': 'http://example.org/n3#Lexer',
        requireElement: '"Lexer"',
        parameters: [
          {
            '@id': 'http://example.org/n3#lineMode',
            range: {
              '@type': 'ParameterRangeUnion',
              parameterRangeElements: [
                'xsd:string',
                { '@type': 'ParameterRangeUndefined' },
              ],
            },
          },
          {
            '@id': 'http://example.org/n3#n3',
            range: {
              '@type': 'ParameterRangeUnion',
              parameterRangeElements: [
                'xsd:string',
                { '@type': 'ParameterRangeUndefined' },
              ],
            },
          },
          {
            '@id': 'http://example.org/n3#comments',
            range: {
              '@type': 'ParameterRangeUnion',
              parameterRangeElements: [
                'xsd:string',
                { '@type': 'ParameterRangeUndefined' },
              ],
            },
          },
        ],
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
        'http://example.org/n3#lineMode': 'true',
        'http://example.org/n3#n3': 'true',
        'http://example.org/n3#comments': 'true',
      });
    });

    it('instantiated with a config with no parameters', async() => {
      const config = objectLoader.createCompactedResource({
        types: 'http://example.org/n3#Lexer',
      });
      const instance = await configConstructorPool.instantiate(config, settings);
      expect(instance.type).toEqual('LEXER');
      expect(N3.Lexer).toHaveBeenCalledWith({
        'http://example.org/n3#lineMode': undefined,
        'http://example.org/n3#n3': undefined,
        'http://example.org/n3#comments': undefined,
      });
    });
  });

  describe('for nested components', () => {
    beforeEach(() => {
      manager.componentResources['http://example.org/n3#Lexer'] = objectLoader.createCompactedResource({
        '@id': 'http://example.org/n3#Lexer',
        requireElement: '"Lexer"',
        parameters: [
          { '@id': 'http://example.org/n3#lineMode' },
          { '@id': 'http://example.org/n3#n3' },
          { '@id': 'http://example.org/n3#comments' },
        ],
        module: {
          '@id': 'http://example.org/n3',
          requireName: '"n3"',
        },
      });
      manager.componentResources['http://example.org/n3#Parser'] = objectLoader.createCompactedResource({
        '@id': 'http://example.org/n3#Parser',
        requireElement: '"Parser"',
        parameters: [
          { '@id': 'http://example.org/n3#format' },
          { '@id': 'http://example.org/n3#blankNodePrefix' },
          { '@id': 'http://example.org/n3#lexer' },
          { '@id': 'http://example.org/n3#explicitQuantifiers' },
        ],
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
        'http://example.org/n3#format': 'application/trig',
        'http://example.org/n3#lexer': {
          type: 'LEXER',
          args: {
            'http://example.org/n3#lineMode': 'true',
            'http://example.org/n3#n3': 'true',
            'http://example.org/n3#comments': 'true',
          },
        },
      });
    });
  });

  describe('for a component with parameters with default values', () => {
    beforeEach(() => {
      manager.componentResources['http://example.org/n3#Lexer'] = objectLoader.createCompactedResource({
        '@id': 'http://example.org/n3#Lexer',
        requireElement: '"Lexer"',
        parameters: [
          { '@id': 'http://example.org/n3#lineMode', default: '"A"' },
          { '@id': 'http://example.org/n3#n3', default: { list: [ '"B"', '"C"' ]}},
          { '@id': 'http://example.org/n3#comments' },
        ],
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
        'http://example.org/n3#lineMode': 'true',
        'http://example.org/n3#n3': 'true',
        'http://example.org/n3#comments': 'true',
      });
    });

    it('instantiated with a config without parameters', async() => {
      const config = objectLoader.createCompactedResource({
        types: 'http://example.org/n3#Lexer',
      });
      const instance = await configConstructorPool.instantiate(config, settings);
      expect(instance.type).toEqual('LEXER');
      expect(N3.Lexer).toHaveBeenCalledWith({
        'http://example.org/n3#lineMode': 'A',
        'http://example.org/n3#n3': [ 'B', 'C' ],
      });
    });
  });

  describe('for a component with parameters with default scoped values', () => {
    beforeEach(() => {
      manager.componentResources['http://example.org/n3#Lexer'] = objectLoader.createCompactedResource({
        '@id': 'http://example.org/n3#Lexer',
        requireElement: '"Lexer"',
        parameters: [
          {
            '@id': 'http://example.org/n3#lineMode',
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
            defaultScoped: [
              {
                defaultScope: 'http://example.org/n3#Lexer',
                defaultScopedValue: {
                  list: [
                    '"B"',
                    '"C"',
                  ],
                },
              },
            ],
          },
          {
            '@id': 'http://example.org/n3#comments',
          },
        ],
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
        'http://example.org/n3#lineMode': 'true',
        'http://example.org/n3#n3': 'true',
        'http://example.org/n3#comments': 'true',
      });
    });

    it('instantiated with a config without parameters', async() => {
      const config = objectLoader.createCompactedResource({
        types: 'http://example.org/n3#Lexer',
      });
      const instance = await configConstructorPool.instantiate(config, settings);
      expect(instance.type).toEqual('LEXER');
      expect(N3.Lexer).toHaveBeenCalledWith({
        'http://example.org/n3#lineMode': 'A',
        'http://example.org/n3#n3': [ 'B', 'C' ],
      });
    });
  });

  describe('for a component with parameters without range with fixed values', () => {
    beforeEach(() => {
      manager.componentResources['http://example.org/n3#Lexer'] = objectLoader.createCompactedResource({
        '@id': 'http://example.org/n3#Lexer',
        requireElement: '"Lexer"',
        parameters: [
          { '@id': 'http://example.org/n3#lineMode', fixed: '"A"' },
          { '@id': 'http://example.org/n3#n3', fixed: { list: [ '"B"', '"C"' ]}},
          { '@id': 'http://example.org/n3#comments' },
        ],
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
        'http://example.org/n3#lineMode': [ 'A', 'true' ],
        'http://example.org/n3#n3': [ 'B', 'C', 'true' ],
        'http://example.org/n3#comments': 'true',
      });
    });

    it('instantiated with a config without parameters', async() => {
      const config = objectLoader.createCompactedResource({
        types: 'http://example.org/n3#Lexer',
      });
      const instance = await configConstructorPool.instantiate(config, settings);
      expect(instance.type).toEqual('LEXER');
      expect(N3.Lexer).toHaveBeenCalledWith({
        'http://example.org/n3#lineMode': 'A',
        'http://example.org/n3#n3': [ 'B', 'C' ],
      });
    });
  });

  describe('for a component with parameters with array range with fixed values', () => {
    beforeEach(() => {
      manager.componentResources['http://example.org/n3#Lexer'] = objectLoader.createCompactedResource({
        '@id': 'http://example.org/n3#Lexer',
        requireElement: '"Lexer"',
        parameters: [
          {
            '@id': 'http://example.org/n3#lineMode',
            range: {
              '@type': 'ParameterRangeArray',
              parameterRangeValue: 'xsd:string',
            },
            fixed: { list: [ '"A"' ]},
          },
          {
            '@id': 'http://example.org/n3#n3',
            range: {
              '@type': 'ParameterRangeArray',
              parameterRangeValue: 'xsd:string',
            },
            fixed: { list: [ '"B"', '"C"' ]},
          },
          {
            '@id': 'http://example.org/n3#comments',
            range: {
              '@type': 'ParameterRangeUnion',
              parameterRangeElements: [
                {
                  '@type': 'ParameterRangeArray',
                  parameterRangeValue: 'xsd:string',
                },
                { '@type': 'ParameterRangeUndefined' },
              ],
            },
          },
        ],
        module: {
          '@id': 'http://example.org/n3',
          requireName: '"n3"',
        },
      });
    });

    it('instantiated with a config with all parameters as singular value', async() => {
      const config = objectLoader.createCompactedResource({
        types: 'http://example.org/n3#Lexer',
        'http://example.org/n3#lineMode': '"true"',
        'http://example.org/n3#n3': '"true"',
        'http://example.org/n3#comments': '"true"',
      });
      await expect(configConstructorPool.instantiate(config, settings)).rejects
        // eslint-disable-next-line max-len
        .toThrowError(/The value "true" for parameter ".*comments" is not of required range type ".*string\[\] | undefined"/u);
    });

    it('instantiated with a config with all parameters as multiple values in list', async() => {
      const config = objectLoader.createCompactedResource({
        '@id': 'ex:config',
        types: 'http://example.org/n3#Lexer',
        'http://example.org/n3#lineMode': [ '"true1"', '"true2"' ],
        'http://example.org/n3#n3': [ '"true"' ],
        'http://example.org/n3#comments': [ '"true"' ],
      });
      await expect(configConstructorPool.instantiate(config, settings)).rejects
        .toThrowError(`Detected multiple values for parameter http://example.org/n3#lineMode in ex:config. RDF lists should be used for defining multiple values.`);
    });

    it('instantiated with a config with all parameters as singular value in RDF list', async() => {
      const config = objectLoader.createCompactedResource({
        types: 'http://example.org/n3#Lexer',
        'http://example.org/n3#lineMode': { list: [ '"true"' ]},
        'http://example.org/n3#n3': { list: [ '"true"' ]},
        'http://example.org/n3#comments': { list: [ '"true"' ]},
      });
      const instance = await configConstructorPool.instantiate(config, settings);
      expect(instance.type).toEqual('LEXER');
      expect(N3.Lexer).toHaveBeenCalledWith({
        'http://example.org/n3#lineMode': [ 'A', 'true' ],
        'http://example.org/n3#n3': [ 'B', 'C', 'true' ],
        'http://example.org/n3#comments': [ 'true' ],
      });
    });

    it('instantiated with a config without parameters', async() => {
      const config = objectLoader.createCompactedResource({
        types: 'http://example.org/n3#Lexer',
      });
      const instance = await configConstructorPool.instantiate(config, settings);
      expect(instance.type).toEqual('LEXER');
      expect(N3.Lexer).toHaveBeenCalledWith({
        'http://example.org/n3#lineMode': [ 'A' ],
        'http://example.org/n3#n3': [ 'B', 'C' ],
      });
    });
  });

  describe('for a component with parameters with multiple fixed and unique values', () => {
    beforeEach(() => {
      manager.componentResources['http://example.org/n3#Lexer'] = objectLoader.createCompactedResource({
        '@id': 'http://example.org/n3#Lexer',
        requireElement: '"Lexer"',
        parameters: [
          { '@id': 'http://example.org/n3#lineMode', range: 'xsd:string', fixed: '"A"' },
          { '@id': 'http://example.org/n3#n3', range: 'xsd:string', fixed: { list: [ '"B"', '"C"' ]}},
          { '@id': 'http://example.org/n3#comments', range: 'xsd:string' },
        ],
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
      await expect(configConstructorPool.instantiate(config, settings)).rejects
        .toThrowError(/The value ".*" for parameter ".*lineMode" is not of required range type ".*string"/u);
    });

    it('instantiated with a config without parameters', async() => {
      const config = objectLoader.createCompactedResource({
        types: 'http://example.org/n3#Lexer',
      });
      await expect(configConstructorPool.instantiate(config, settings)).rejects
        .toThrowError(/The value ".*" for parameter ".*n3" is not of required range type ".*string"/u);
    });
  });

  describe('for a component with parameters with fixed and unique values', () => {
    beforeEach(() => {
      manager.componentResources['http://example.org/n3#Lexer'] = objectLoader.createCompactedResource({
        '@id': 'http://example.org/n3#Lexer',
        requireElement: '"Lexer"',
        parameters: [
          { '@id': 'http://example.org/n3#lineMode', range: 'xsd:string', fixed: '"A"' },
          { '@id': 'http://example.org/n3#n3', range: 'xsd:string', fixed: '"B"' },
          { '@id': 'http://example.org/n3#comments', range: 'xsd:string', fixed: '"C"' },
        ],
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
      await expect(configConstructorPool.instantiate(config, settings)).rejects
        .toThrowError(/The value ".*" for parameter ".*lineMode" is not of required range type ".*string"/u);
    });

    it('instantiated with a config without parameters', async() => {
      const config = objectLoader.createCompactedResource({
        types: 'http://example.org/n3#Lexer',
      });
      const instance = await configConstructorPool.instantiate(config, settings);
      expect(instance.type).toEqual('LEXER');
      expect(N3.Lexer).toHaveBeenCalledWith({
        'http://example.org/n3#lineMode': 'A',
        'http://example.org/n3#n3': 'B',
        'http://example.org/n3#comments': 'C',
      });
    });
  });

  describe('for a component with lazy parameters', () => {
    beforeEach(() => {
      manager.componentResources['http://example.org/n3#Lexer'] = objectLoader.createCompactedResource({
        '@id': 'http://example.org/n3#Lexer',
        requireElement: '"Lexer"',
        parameters: [
          { '@id': 'http://example.org/n3#lineMode', lazy: '"true"' },
          { '@id': 'http://example.org/n3#n3', lazy: '"true"' },
        ],
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
        'http://example.org/n3#n3': { list: [ '"true"' ]},
      });
      const instance = await configConstructorPool.instantiate(config, settings);
      expect(instance.type).toEqual('LEXER');
      expect(await mocked(N3.Lexer).mock.calls[0][0]['http://example.org/n3#lineMode']()).toEqual('true');
      expect(await mocked(N3.Lexer).mock.calls[0][0]['http://example.org/n3#n3'][0]()).toEqual('true');
    });

    it('instantiated with a config with all parameters with multiple values', async() => {
      const config = objectLoader.createCompactedResource({
        types: 'http://example.org/n3#Lexer',
        'http://example.org/n3#lineMode': { list: [ '"A1"', '"A2"' ]},
        'http://example.org/n3#n3': { list: [ '"B1"', '"B2"' ]},
      });
      const instance = await configConstructorPool.instantiate(config, settings);
      expect(instance.type).toEqual('LEXER');
      expect(await mocked(N3.Lexer).mock.calls[0][0]['http://example.org/n3#lineMode'][0]()).toEqual('A1');
      expect(await mocked(N3.Lexer).mock.calls[0][0]['http://example.org/n3#lineMode'][1]()).toEqual('A2');
      expect(await mocked(N3.Lexer).mock.calls[0][0]['http://example.org/n3#n3'][0]()).toEqual('B1');
      expect(await mocked(N3.Lexer).mock.calls[0][0]['http://example.org/n3#n3'][1]()).toEqual('B2');
    });
  });
});
