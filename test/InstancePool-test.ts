import * as fs from 'fs';
import type { Resource } from 'rdf-object';
import { RdfObjectLoader } from 'rdf-object';
import type { ICreationStrategy } from '../lib/creationstrategy/ICreationStrategy';
import { ComponentFactory } from '../lib/factory/ComponentFactory';
import type { ICreationSettingsInner } from '../lib/factory/IComponentFactory';
import { InstancePool } from '../lib/InstancePool';
import type { IModuleState } from '../lib/ModuleStateBuilder';
import 'jest-rdf';

describe('InstancePool', () => {
  let objectLoader: RdfObjectLoader;
  let componentResources: Record<string, Resource>;
  let moduleState: IModuleState;
  let pool: InstancePool;
  let creationSettings: ICreationSettingsInner<any>;
  let creationStrategy: ICreationStrategy<any>;
  beforeEach(async() => {
    objectLoader = new RdfObjectLoader({
      context: JSON.parse(fs.readFileSync(`${__dirname}/../components/context.jsonld`, 'utf8')),
    });
    await objectLoader.context;
    componentResources = {
      'ex:Component': objectLoader.createCompactedResource({
        '@id': 'ex:Component',
        module: 'ex:Module',
        parameters: {
          '@id': 'ex:param1',
        },
      }),
      'ex:Component2': objectLoader.createCompactedResource({
        '@id': 'ex:Component2',
        module: 'ex:Module2',
        parameters: {
          '@id': 'ex:param2',
        },
      }),
      'ex:ComponentNoModule': objectLoader.createCompactedResource({
        '@id': 'ex:ComponentNoModule',
      }),
      'ex:ComponentInherit': objectLoader.createCompactedResource({
        '@id': 'ex:ComponentInherit',
        module: 'ex:Module',
        parameters: {
          '@id': 'ex:ComponentInherit#param1',
          inheritValues: {
            types: 'owl:Restriction',
            onParameter: 'ex:OtherComponent#param1',
            from: 'ex:OtherComponent',
          },
        },
      }),
    };
    moduleState = <any> {
      mainModulePath: __dirname,
      importPaths: {
        'http://example.org/': `${__dirname}/`,
      },
    };
    pool = new InstancePool({
      objectLoader,
      componentResources,
      moduleState,
    });

    (<any> pool).runTypeConfigs['ex:OtherComponent'] = [
      objectLoader.createCompactedResource({
        '@id': 'ex:myOtherComponentInstance',
        types: 'ex:OtherComponent',
        'ex:OtherComponent#param1': '"ABC"',
      }),
    ];

    creationStrategy = <any> {
      createUndefined: () => 'UNDEFINED',
      getVariableValue: ({ settings, variableName }: any) => settings.variables[variableName],
    };
    creationSettings = {
      moduleState,
      creationStrategy,
    };
  });

  describe('inheritParameterValues', () => {
    it('should not change a config for component without parameters', () => {
      const configIn = objectLoader.createCompactedResource({});
      const configOut = objectLoader.createCompactedResource({});
      const componentIn = objectLoader.createCompactedResource({});
      const componentOut = objectLoader.createCompactedResource({});
      pool.inheritParameterValues(configIn, componentIn);
      expect(configIn.toQuads()).toBeRdfIsomorphic(configOut.toQuads());
      expect(componentIn.toQuads()).toBeRdfIsomorphic(componentOut.toQuads());
    });

    it('should handle one inherited parameter value', () => {
      const configIn = objectLoader.createCompactedResource({});
      const configOut = objectLoader.createCompactedResource({
        'ex:OtherComponent#param1': '"ABC"',
      });
      const componentIn = objectLoader.createCompactedResource({
        '@id': 'ex:Component',
        parameters: {
          '@id': 'ex:param1',
          inheritValues: {
            types: 'owl:Restriction',
            onParameter: 'ex:OtherComponent#param1',
            from: 'ex:OtherComponent',
          },
        },
      });
      const componentOut = objectLoader.createCompactedResource({
        '@id': 'ex:Component',
        parameters: [
          {
            '@id': 'ex:param1',
            inheritValues: {
              types: 'owl:Restriction',
              onParameter: 'ex:OtherComponent#param1',
              from: 'ex:OtherComponent',
            },
          },
          'ex:OtherComponent#param1',
        ],
      });
      pool.inheritParameterValues(configIn, componentIn);
      expect(configIn.toQuads()).toBeRdfIsomorphic(configOut.toQuads());
      expect(componentIn.toQuads()).toBeRdfIsomorphic(componentOut.toQuads());
    });

    it('should handle one inherited parameter value with multiple instances', () => {
      (<any> pool).runTypeConfigs['ex:OtherComponent'] = [
        objectLoader.createCompactedResource({
          '@id': 'ex:myOtherComponentInstance',
          types: 'ex:OtherComponent',
          'ex:OtherComponent#param1': '"ABC"',
        }),
      ];
      (<any> pool).runTypeConfigs['ex:OtherComponent'] = [
        objectLoader.createCompactedResource({
          '@id': 'ex:myOtherComponentInstance',
          types: 'ex:OtherComponent',
          'ex:OtherComponent#param1': '"DEF"',
        }),
      ];

      const configIn = objectLoader.createCompactedResource({
      });
      const configOut = objectLoader.createCompactedResource({
        'ex:OtherComponent#param1': [
          '"ABC"',
          '"DEF"',
        ],
      });
      const component = objectLoader.createCompactedResource({
        '@id': 'ex:Component',
        parameters: {
          '@id': 'ex:param1',
          inheritValues: {
            types: 'owl:Restriction',
            onParameter: 'ex:OtherComponent#param1',
            from: 'ex:OtherComponent',
          },
        },
      });
      pool.inheritParameterValues(configIn, component);
      expect(configIn.toQuads()).toBeRdfIsomorphic(configOut.toQuads());
    });

    it('should not change a config for component with parameter without restrictions', () => {
      const configIn = objectLoader.createCompactedResource({});
      const configOut = objectLoader.createCompactedResource({});
      const component = objectLoader.createCompactedResource({
        parameters: {
          '@id': 'ex:param1',
          default: '"ABC"',
        },
      });
      pool.inheritParameterValues(configIn, component);
      expect(configIn.toQuads()).toBeRdfIsomorphic(configOut.toQuads());
    });

    it('should do nothing for an inherited parameter value without instances to inherit from', () => {
      delete (<any> pool).runTypeConfigs['ex:OtherComponent'];
      const configIn = objectLoader.createCompactedResource({});
      const configOut = objectLoader.createCompactedResource({});
      const component = objectLoader.createCompactedResource({
        '@id': 'ex:Component',
        parameters: {
          '@id': 'ex:param1',
          inheritValues: {
            types: 'owl:Restriction',
            onParameter: 'ex:OtherComponent#param1',
            from: 'ex:OtherComponent',
          },
        },
      });
      pool.inheritParameterValues(configIn, component);
      expect(configIn.toQuads()).toBeRdfIsomorphic(configOut.toQuads());
    });

    it('should do nothing for an inherited parameter value with instance without the parameter value', () => {
      const configIn = objectLoader.createCompactedResource({});
      const configOut = objectLoader.createCompactedResource({});
      const component = objectLoader.createCompactedResource({
        '@id': 'ex:Component',
        parameters: {
          '@id': 'ex:param1',
          inheritValues: {
            types: 'owl:Restriction',
            onParameter: 'ex:OtherComponent#paramUndefined',
            from: 'ex:OtherComponent',
          },
        },
      });
      pool.inheritParameterValues(configIn, component);
      expect(configIn.toQuads()).toBeRdfIsomorphic(configOut.toQuads());
    });

    it('should handle one inherited parameter value when the restriction also has other types', () => {
      const configIn = objectLoader.createCompactedResource({});
      const configOut = objectLoader.createCompactedResource({
        'ex:OtherComponent#param1': '"ABC"',
      });
      const component = objectLoader.createCompactedResource({
        '@id': 'ex:Component',
        parameters: {
          '@id': 'ex:param1',
          inheritValues: {
            types: [
              'ex:abc',
              'owl:Restriction',
              'ex:def',
            ],
            onParameter: 'ex:OtherComponent#param1',
            from: 'ex:OtherComponent',
          },
        },
      });
      pool.inheritParameterValues(configIn, component);
      expect(configIn.toQuads()).toBeRdfIsomorphic(configOut.toQuads());
    });

    it('should not change a config when the restriction does not have any types', () => {
      const configIn = objectLoader.createCompactedResource({});
      const configOut = objectLoader.createCompactedResource({});
      const component = objectLoader.createCompactedResource({
        '@id': 'ex:Component',
        parameters: {
          '@id': 'ex:param1',
          inheritValues: {
            onParameter: 'ex:OtherComponent#param1',
            from: 'ex:OtherComponent',
          },
        },
      });
      pool.inheritParameterValues(configIn, component);
      expect(configIn.toQuads()).toBeRdfIsomorphic(configOut.toQuads());
    });

    it('should not change a config when the restriction does not have the required type', () => {
      const configIn = objectLoader.createCompactedResource({});
      const configOut = objectLoader.createCompactedResource({});
      const component = objectLoader.createCompactedResource({
        '@id': 'ex:Component',
        parameters: {
          '@id': 'ex:param1',
          inheritValues: {
            types: [
              'ex:abc',
            ],
            onParameter: 'ex:OtherComponent#param1',
            from: 'ex:OtherComponent',
          },
        },
      });
      pool.inheritParameterValues(configIn, component);
      expect(configIn.toQuads()).toBeRdfIsomorphic(configOut.toQuads());
    });

    it('should throw when the restriction does not define from', () => {
      const configIn = objectLoader.createCompactedResource({});
      const component = objectLoader.createCompactedResource({
        '@id': 'ex:Component',
        parameters: {
          '@id': 'ex:param1',
          inheritValues: {
            types: 'owl:Restriction',
            onParameter: 'ex:OtherComponent#param1',
          },
        },
      });
      expect(() => pool.inheritParameterValues(configIn, component))
        .toThrowError(/^Missing from property on parameter value inheritance definition/u);
    });

    it('should throw when the restriction does not define onParameter', () => {
      const configIn = objectLoader.createCompactedResource({});
      const component = objectLoader.createCompactedResource({
        '@id': 'ex:Component',
        parameters: {
          '@id': 'ex:param1',
          inheritValues: {
            types: 'owl:Restriction',
            from: 'ex:OtherComponent',
          },
        },
      });
      expect(() => pool.inheritParameterValues(configIn, component))
        .toThrowError(/^Missing onParameter property on parameter value inheritance definition/u);
    });

    it('should throw when from refers to a literal', () => {
      const configIn = objectLoader.createCompactedResource({});
      const component = objectLoader.createCompactedResource({
        '@id': 'ex:Component',
        parameters: {
          '@id': 'ex:param1',
          inheritValues: {
            types: 'owl:Restriction',
            onParameter: 'ex:OtherComponent#param1',
            from: '"ex:OtherComponent"',
          },
        },
      });
      expect(() => pool.inheritParameterValues(configIn, component))
        .toThrowError(/^Detected invalid from term type 'Literal' on parameter value inheritance definition/u);
    });

    it('should throw when onParameter refers to a literal', () => {
      const configIn = objectLoader.createCompactedResource({});
      const component = objectLoader.createCompactedResource({
        '@id': 'ex:Component',
        parameters: {
          '@id': 'ex:param1',
          inheritValues: {
            types: 'owl:Restriction',
            onParameter: '"ex:OtherComponent#param1"',
            from: 'ex:OtherComponent',
          },
        },
      });
      expect(() => pool.inheritParameterValues(configIn, component))
        .toThrowError(/^Detected invalid onParameter term type 'Literal' on parameter value inheritance definition/u);
    });
  });

  describe('getConfigConstructor', () => {
    it('for a config with component type should return a component factory', () => {
      const config = objectLoader.createCompactedResource({
        '@id': 'ex:myComponentInstance',
        types: 'ex:Component',
      });
      const factory = pool.getConfigConstructor(config);
      expect(factory).toBeInstanceOf(ComponentFactory);
      expect((<any> factory).options.constructable).toBeTruthy();
      expect((<any> factory).options.config).toBe(config);
      expect((<any> factory).options.moduleDefinition).toBe(componentResources['ex:Component'].property.module);
      expect((<any> factory).options.componentDefinition).toBe(componentResources['ex:Component']);
    });

    it('for a config with require should return a component factory', () => {
      const config = objectLoader.createCompactedResource({
        '@id': 'ex:myComponentInstance',
        requireName: '"name"',
        requireElement: '"element"',
      });
      const factory = pool.getConfigConstructor(config);
      expect(factory).toBeInstanceOf(ComponentFactory);
      expect((<any> factory).options.constructable).toBeTruthy();
      expect((<any> factory).options.config).toBe(config);
      expect((<any> factory).options.moduleDefinition).toBeUndefined();
      expect((<any> factory).options.componentDefinition).toBeUndefined();
    });

    it('for a config that is an instance with require should return a component factory', () => {
      const config = objectLoader.createCompactedResource({
        '@id': 'ex:myComponentInstance',
        types: 'oo:ComponentInstance',
        requireName: '"name"',
        requireElement: '"element"',
      });
      const factory = pool.getConfigConstructor(config);
      expect(factory).toBeInstanceOf(ComponentFactory);
      expect((<any> factory).options.constructable).toBeFalsy();
      expect((<any> factory).options.config).toBe(config);
      expect((<any> factory).options.moduleDefinition).toBeUndefined();
      expect((<any> factory).options.componentDefinition).toBeUndefined();
    });

    it('for a config with component type should inherit parameters', () => {
      const configIn = objectLoader.createCompactedResource({
        types: 'ex:ComponentInherit',
      });
      const configOut = objectLoader.createCompactedResource({
        types: 'ex:ComponentInherit',
        'ex:OtherComponent#param1': '"ABC"',
      });
      pool.getConfigConstructor(configIn);
      expect(configIn.toQuads()).toBeRdfIsomorphic(configOut.toQuads());
    });

    it('should store one config into runTypeConfigs by component type', () => {
      const config = objectLoader.createCompactedResource({
        '@id': 'ex:myComponentInstance1',
        types: 'ex:Component',
      });
      pool.getConfigConstructor(config);
      expect((<any> pool).runTypeConfigs['ex:Component'][0]).toBe(config);
    });

    it('should store multiple configs into runTypeConfigs by component type', () => {
      const config1 = objectLoader.createCompactedResource({
        '@id': 'ex:myComponentInstance1',
        types: 'ex:Component',
      });
      const config2 = objectLoader.createCompactedResource({
        '@id': 'ex:myComponentInstance2',
        types: 'ex:Component',
      });
      pool.getConfigConstructor(config1);
      pool.getConfigConstructor(config2);
      expect((<any> pool).runTypeConfigs['ex:Component'][0]).toBe(config1);
      expect((<any> pool).runTypeConfigs['ex:Component'][1]).toBe(config2);
    });

    it('should throw for a config with two component types', () => {
      const config = objectLoader.createCompactedResource({
        '@id': 'ex:myComponentInstance',
        types: [ 'ex:Component', 'ex:Component2' ],
      });
      expect(() => pool.getConfigConstructor(config))
        // eslint-disable-next-line max-len
        .toThrowError(/^Detected more than one component types for ex:myComponentInstance: \[ex:Component,ex:Component2\]./u);
    });

    it('should throw for a config with zero component types', () => {
      const config = objectLoader.createCompactedResource({
        '@id': 'ex:myComponentInstance',
        types: [],
      });
      expect(() => pool.getConfigConstructor(config))
        // eslint-disable-next-line max-len
        .toThrowError(/^Could not find \(valid\) component types for ex:myComponentInstance among types \[\], or a requireName./u);
    });

    it('should throw for a config with only requireElement', () => {
      const config = objectLoader.createCompactedResource({
        '@id': 'ex:myComponentInstance',
        requireElement: '"element"',
      });
      expect(() => pool.getConfigConstructor(config))
        // eslint-disable-next-line max-len
        .toThrowError(/^Could not find \(valid\) component types for ex:myComponentInstance among types \[\], or a requireName./u);
    });

    it('should throw for a config with unregistered component types', () => {
      const config = objectLoader.createCompactedResource({
        '@id': 'ex:myComponentInstance',
        types: [ 'ex:ComponentUnknown', 'ex:ComponentUnknown2' ],
      });
      expect(() => pool.getConfigConstructor(config))
        // eslint-disable-next-line max-len
        .toThrowError(/^Could not find \(valid\) component types for ex:myComponentInstance among types \[ex:ComponentUnknown,ex:ComponentUnknown2\], or a requireName./u);
    });

    it('should throw for a config with a component type without module', () => {
      const config = objectLoader.createCompactedResource({
        '@id': 'ex:myComponentInstance',
        types: 'ex:ComponentNoModule',
      });
      expect(() => pool.getConfigConstructor(config))
        .toThrow(new Error(`No module was found for the component ex:ComponentNoModule`));
    });
  });

  describe('instantiate', () => {
    let createInstance: any;
    beforeEach(() => {
      let i = 0;
      createInstance = jest.fn(() => `INSTANCE${i++}`);
      pool.getConfigConstructor = <any> jest.fn((configResource: Resource) => {
        return {
          createInstance,
        };
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
      const config = objectLoader.createCompactedResource({
        '@id': 'ex:myComponentInstance',
        types: 'ex:Component',
      });
      expect(await pool.instantiate(config, creationSettings)).toEqual('INSTANCE0');
      expect(pool.getConfigConstructor).toHaveBeenCalledTimes(1);
      expect(pool.getConfigConstructor).toHaveBeenNthCalledWith(1, config);
      expect(createInstance).toHaveBeenCalledTimes(1);
      expect(createInstance).toHaveBeenNthCalledWith(1, {
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
