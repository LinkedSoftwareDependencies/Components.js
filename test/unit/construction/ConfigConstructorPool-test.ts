import * as fs from 'fs';
import type { Resource } from 'rdf-object';
import { RdfObjectLoader } from 'rdf-object';
import { ConfigConstructorPool } from '../../../lib/construction/ConfigConstructorPool';
import type { IConstructionSettings } from '../../../lib/construction/IConstructionSettings';
import type { IConstructionStrategy } from '../../../lib/construction/strategy/IConstructionStrategy';
import type { IModuleState } from '../../../lib/loading/ModuleStateBuilder';
import 'jest-rdf';
import { ConfigPreprocessorComponent } from '../../../lib/preprocess/ConfigPreprocessorComponent';
import { ConfigPreprocessorComponentMapped } from '../../../lib/preprocess/ConfigPreprocessorComponentMapped';
import type { IConfigPreprocessor } from '../../../lib/preprocess/IConfigPreprocessor';
import { ParameterHandler } from '../../../lib/preprocess/ParameterHandler';

describe('ConfigConstructorPool', () => {
  let objectLoader: RdfObjectLoader;
  let componentResources: Record<string, Resource>;
  let rawConfigFactories: IConfigPreprocessor<any>[];
  let pool: ConfigConstructorPool<any>;
  let constructionStrategy: IConstructionStrategy<any>;
  let moduleState: IModuleState;
  let creationSettings: IConstructionSettings;
  let parameterHandler: ParameterHandler;
  beforeEach(async() => {
    objectLoader = new RdfObjectLoader({
      context: JSON.parse(fs.readFileSync(`${__dirname}/../../../components/context.jsonld`, 'utf8')),
    });
    await objectLoader.context;
    componentResources = {};
    rawConfigFactories = [];
    constructionStrategy = <any> {
      createUndefined: () => 'UNDEFINED',
      getVariableValue: ({ settings, variableName }: any) => settings.variables[variableName],
    };
    moduleState = <any> {
      mainModulePath: __dirname,
      importPaths: {
        'http://example.org/': `${__dirname}/`,
      },
    };
    pool = new ConfigConstructorPool({
      objectLoader,
      configPreprocessors: rawConfigFactories,
      constructionStrategy,
      moduleState,
    });
    creationSettings = {};
    parameterHandler = new ParameterHandler({ objectLoader });
  });

  describe('with no preprocessors', () => {
    describe('getRawConfig', () => {
      it('for a config with require should return the original config', () => {
        const config = objectLoader.createCompactedResource({
          '@id': 'ex:myComponentInstance',
          requireName: '"name"',
          requireElement: '"element"',
        });
        expect(pool.getRawConfig(config)).toBe(config);
      });

      it('for a component config should throw', () => {
        const configIn = objectLoader.createCompactedResource({
          '@id': 'ex:myComponentInstance',
          types: 'ex:ComponentThis',
          'ex:myComponentInstance#param1': '"A"',
        });
        componentResources['ex:ComponentThis'] = objectLoader.createCompactedResource({
          '@id': 'ex:ComponentThis',
          module: {
            '@id': 'ex:Module',
            requireName: '"my-module"',
          },
          parameters: [
            {
              '@id': 'ex:myComponentInstance#param1',
            },
          ],
        });
        expect(() => pool.getRawConfig(configIn))
          .toThrowError(/^Invalid config: Missing requireName/u);
      });

      it('for a mapped component config should throw', () => {
        const configIn = objectLoader.createCompactedResource({
          '@id': 'ex:myComponentInstance',
          types: 'ex:ComponentThis',
          'ex:myComponentInstance#param1': '"A"',
        });
        componentResources['ex:ComponentThis'] = objectLoader.createCompactedResource({
          '@id': 'ex:ComponentThis',
          module: {
            '@id': 'ex:Module',
            requireName: '"my-module"',
          },
          parameters: [
            {
              '@id': 'ex:myComponentInstance#param1',
            },
          ],
          constructorArguments: {
            key: '"KEY"',
            value: 'ex:myComponentInstance#param1',
          },
        });
        expect(() => pool.getRawConfig(configIn))
          .toThrowError(/^Invalid config: Missing requireName/u);
      });
    });
  });

  describe('with mapped component and component preprocessors', () => {
    beforeEach(() => {
      const runTypeConfigs = {};
      rawConfigFactories.push(new ConfigPreprocessorComponentMapped({
        objectLoader,
        componentResources,
        runTypeConfigs,
        parameterHandler,
        logger: <any> { warn: jest.fn() },
      }));
      rawConfigFactories.push(new ConfigPreprocessorComponent({
        objectLoader,
        componentResources,
        runTypeConfigs,
        parameterHandler,
        logger: <any> { warn: jest.fn() },
      }));
    });

    describe('getRawConfig', () => {
      it('for a raw config should return the original config', () => {
        const config = objectLoader.createCompactedResource({
          '@id': 'ex:myComponentInstance',
          requireName: '"name"',
          requireElement: '"element"',
        });
        expect(pool.getRawConfig(config)).toBe(config);
      });

      it('for a component config should return a mapped config', () => {
        const configIn = objectLoader.createCompactedResource({
          '@id': 'ex:myComponentInstance',
          types: 'ex:ComponentThis',
          'ex:myComponentInstance#param1': '"A"',
        });
        componentResources['ex:ComponentThis'] = objectLoader.createCompactedResource({
          '@id': 'ex:ComponentThis',
          module: {
            '@id': 'ex:Module',
            requireName: '"my-module"',
          },
          parameters: [
            {
              '@id': 'ex:myComponentInstance#param1',
            },
          ],
        });
        const configOut = objectLoader.createCompactedResource({
          originalInstance: configIn,
          requireName: '"my-module"',
          arguments: [
            {
              list: [
                {
                  hasFields: '"true"',
                  fields: [
                    {
                      key: '"ex:myComponentInstance#param1"',
                      value: '"A"',
                    },
                  ],
                },
              ],
            },
          ],
        });
        expect(pool.getRawConfig(configIn).toQuads()).toBeRdfIsomorphic(configOut.toQuads());
      });

      it('for a mapped component config should return a mapped config', () => {
        const configIn = objectLoader.createCompactedResource({
          '@id': 'ex:myComponentInstance',
          types: 'ex:ComponentThis',
          'ex:myComponentInstance#param1': '"A"',
        });
        componentResources['ex:ComponentThis'] = objectLoader.createCompactedResource({
          '@id': 'ex:ComponentThis',
          module: {
            '@id': 'ex:Module',
            requireName: '"my-module"',
          },
          parameters: [
            {
              '@id': 'ex:myComponentInstance#param1',
            },
          ],
          constructorArguments: {
            key: '"KEY"',
            value: 'ex:myComponentInstance#param1',
          },
        });
        const configOut = objectLoader.createCompactedResource({
          originalInstance: configIn,
          requireName: '"my-module"',
          arguments: [
            {
              key: '"KEY"',
              value: '"A"',
            },
          ],
        });
        expect(pool.getRawConfig(configIn).toQuads()).toBeRdfIsomorphic(configOut.toQuads());
      });
    });

    describe('instantiate', () => {
      let createInstance: any;
      beforeEach(() => {
        let i = 0;
        createInstance = jest.fn(() => `INSTANCE${i++}`);
        (<any> pool).configConstructor = {
          createInstance,
        };
        componentResources['ex:Component'] = objectLoader.createCompactedResource({
          '@id': 'ex:Component',
          requireName: '"some-require"',
          module: 'ex:Module',
          parameters: {
            '@id': 'ex:param1',
          },
          constructorArguments: {
            '@id': 'ex:Component#constructorArgs',
          },
        });
      });

      it('should handle a blacklisted resource', async() => {
        const config = objectLoader.createCompactedResource({
          '@id': 'ex:myComponentInstance',
        });
        creationSettings.resourceBlacklist = {
          'ex:myComponentInstance': true,
        };
        expect(await pool.instantiate(config, creationSettings)).toEqual('UNDEFINED');
      });

      it('should handle a variable', async() => {
        const config = objectLoader.createCompactedResource({
          '@id': 'ex:myComponentInstance',
          types: 'om:Variable',
        });
        creationSettings.variables = {
          'ex:myComponentInstance': 'abc',
        };
        expect(await pool.instantiate(config, creationSettings)).toEqual('abc');
      });

      it('should create an instance', async() => {
        jest.spyOn(pool, 'getRawConfig');
        const configIn = objectLoader.createCompactedResource({
          '@id': 'ex:myComponentInstance',
          types: 'ex:Component',
        });
        expect(await pool.instantiate(configIn, creationSettings)).toEqual('INSTANCE0');
        expect(pool.getRawConfig).toHaveBeenCalledTimes(1);
        expect(pool.getRawConfig).toHaveBeenNthCalledWith(1, configIn);
        expect(createInstance).toHaveBeenCalledTimes(1);
        expect(createInstance).toHaveBeenNthCalledWith(1, expect.anything(), {
          resourceBlacklist: {
            'ex:myComponentInstance': true,
          },
          ...creationSettings,
        });
      });

      it('should create different instances by different id', async() => {
        const instance1 = await pool.instantiate(objectLoader.createCompactedResource({
          '@id': 'ex:myComponentInstance1',
          types: 'ex:Component',
        }), creationSettings);
        const instance2 = await pool.instantiate(objectLoader.createCompactedResource({
          '@id': 'ex:myComponentInstance2',
          types: 'ex:Component',
        }), creationSettings);
        expect(instance1).not.toBe(instance2);
      });

      it('should return the same instances by equal id', async() => {
        const instance1 = await pool.instantiate(objectLoader.createCompactedResource({
          '@id': 'ex:myComponentInstance1',
          types: 'ex:Component',
        }), creationSettings);
        const instance2 = await pool.instantiate(objectLoader.createCompactedResource({
          '@id': 'ex:myComponentInstance1',
          types: 'ex:Component',
        }), creationSettings);
        expect(instance1).toBe(instance2);
      });

      it('should return the same instances by equal id when fetched in parallel', async() => {
        const [ instance1, instance2 ] = await Promise.all([
          pool.instantiate(objectLoader.createCompactedResource({
            '@id': 'ex:myComponentInstance1',
            types: 'ex:Component',
          }), creationSettings),
          pool.instantiate(objectLoader.createCompactedResource({
            '@id': 'ex:myComponentInstance1',
            types: 'ex:Component',
          }), creationSettings),
        ]);
        expect(instance1).toBe(instance2);
      });
    });
  });

  describe('validateRawConfig', () => {
    it('should not throw on a valid config with all fields', () => {
      const config = objectLoader.createCompactedResource({
        '@id': 'ex:myComponentInstance',
        requireName: '"name"',
        requireElement: '"element"',
        requireNoConstructor: '"true"',
      });
      expect(() => pool.validateRawConfig(config)).not.toThrow();
    });

    it('should not throw on a valid config without requireNoConstructor', () => {
      const config = objectLoader.createCompactedResource({
        '@id': 'ex:myComponentInstance',
        requireName: '"name"',
        requireElement: '"element"',
      });
      expect(() => pool.validateRawConfig(config)).not.toThrow();
    });

    it('should not throw on a valid config with out requireElement', () => {
      const config = objectLoader.createCompactedResource({
        '@id': 'ex:myComponentInstance',
        requireName: '"name"',
        requireNoConstructor: '"true"',
      });
      expect(() => pool.validateRawConfig(config)).not.toThrow();
    });

    it('should not throw on a valid config with only requireName', () => {
      const config = objectLoader.createCompactedResource({
        '@id': 'ex:myComponentInstance',
        requireName: '"name"',
      });
      expect(() => pool.validateRawConfig(config)).not.toThrow();
    });

    it('should throw on a missing requireName', () => {
      const config = objectLoader.createCompactedResource({
        '@id': 'ex:myComponentInstance',
        requireElement: '"element"',
        requireNoConstructor: '"true"',
      });
      expect(() => pool.validateRawConfig(config))
        .toThrowError(/^Invalid config: Missing requireName/u);
    });

    it('should throw on a non-literal requireName', () => {
      const config = objectLoader.createCompactedResource({
        '@id': 'ex:myComponentInstance',
        requireName: 'ex:abc',
        requireElement: '"element"',
        requireNoConstructor: '"true"',
      });
      expect(() => pool.validateRawConfig(config))
        .toThrowError(/^Invalid config: requireName "ex:abc" must be a Literal, but got NamedNode/u);
    });

    it('should throw on a non-literal requireElement', () => {
      const config = objectLoader.createCompactedResource({
        '@id': 'ex:myComponentInstance',
        requireName: '"name"',
        requireElement: 'ex:abc',
        requireNoConstructor: '"true"',
      });
      expect(() => pool.validateRawConfig(config))
        .toThrowError(/^Invalid config: requireElement "ex:abc" must be a Literal, but got NamedNode/u);
    });

    it('should throw on a non-literal requireNoConstructor', () => {
      const config = objectLoader.createCompactedResource({
        '@id': 'ex:myComponentInstance',
        requireName: '"name"',
        requireElement: '"element"',
        requireNoConstructor: 'ex:abc',
      });
      expect(() => pool.validateRawConfig(config))
        .toThrowError(/^Invalid config: requireNoConstructor "ex:abc" must be a Literal, but got NamedNode/u);
    });
  });
});
