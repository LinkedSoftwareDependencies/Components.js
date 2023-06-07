import * as fs from 'fs';
import { DataFactory } from 'rdf-data-factory';
import { Resource, RdfObjectLoader } from 'rdf-object';
import { ConfigConstructor } from '../../../lib/construction/ConfigConstructor';
import type { ConfigConstructorPool } from '../../../lib/construction/ConfigConstructorPool';
import type { IConstructionSettings } from '../../../lib/construction/IConstructionSettings';
import type { IConstructionStrategy } from '../../../lib/construction/strategy/IConstructionStrategy';
import type { IModuleState } from '../../../lib/loading/ModuleStateBuilder';

const DF = new DataFactory();

describe('ConfigConstructor', () => {
  let objectLoader: RdfObjectLoader;
  let componentResources: Record<string, Resource>;
  let configConstructorPool: jest.Mocked<ConfigConstructorPool<any>>;
  let constructor: ConfigConstructor<any>;
  let constructionStrategy: IConstructionStrategy<any>;
  let moduleState: IModuleState;
  let settings: IConstructionSettings;

  beforeEach(async() => {
    objectLoader = new RdfObjectLoader({
      uniqueLiterals: true,
      context: JSON.parse(fs.readFileSync(`${__dirname}/../../../components/context.jsonld`, 'utf8')),
    });
    await objectLoader.context;
    componentResources = {};
    configConstructorPool = <any> {
      instantiate: jest.fn(() => 'INSTANCE'),
    };
    constructionStrategy = {
      createArray: jest.fn(options => options.elements),
      createHash: jest.fn(options => ({ entries: options.entries })),
      createInstance: jest.fn(() => 'INSTANCESTRAT'),
      createLazySupplier: <any> jest.fn(options => options.supplier),
      createPrimitive: jest.fn(options => options.value),
      createUndefined: jest.fn(),
      getVariableValue: jest.fn(),
    };
    moduleState = <any> {
      mainModulePath: __dirname,
      importPaths: {
        'http://example.org/': `${__dirname}/`,
      },
    };
    constructor = new ConfigConstructor({
      objectLoader,
      configConstructorPool,
      constructionStrategy,
      moduleState,
    });

    settings = {};
  });

  describe('getArgumentValues', () => {
    it('should handle an empty array', async() => {
      expect(await constructor.getArgumentValues([], settings)).toEqual(undefined);
      expect(constructionStrategy.createArray).not.toHaveBeenCalled();
      expect(constructionStrategy.createUndefined).toHaveBeenCalledWith();
    });

    it('should handle a array with one value', async() => {
      const values = [
        objectLoader.createCompactedResource('"ABC"'),
      ];
      expect(await constructor.getArgumentValues(values, settings)).toEqual('ABC');
      expect(constructionStrategy.createArray).not.toHaveBeenCalled();
      expect(constructionStrategy.createPrimitive).toHaveBeenCalledWith({ settings, value: 'ABC' });
    });

    it('should throw on a array with multiple values', async() => {
      const values = [
        objectLoader.createCompactedResource('"ABC"'),
        objectLoader.createCompactedResource('"DEF"'),
        objectLoader.createCompactedResource('"GHI"'),
      ];
      await expect(constructor.getArgumentValues(values, settings)).rejects
        .toThrowError(`Detected multiple values for an argument. RDF lists should be used for defining multiple values.`);
    });

    it('should handle an RDF list', async() => {
      const values = [
        objectLoader.createCompactedResource({
          list: [
            '"ABC"',
            '"DEF"',
            '"GHI"',
          ],
        }),
      ];
      expect(await constructor.getArgumentValues(values, settings)).toEqual([
        'ABC',
        'DEF',
        'GHI',
      ]);
      expect(constructionStrategy.createArray).toHaveBeenCalledWith({ settings, elements: [ 'ABC', 'DEF', 'GHI' ]});
    });
  });

  describe('getArgumentValue', () => {
    describe('for undefined', () => {
      it('should handle undefined values', async() => {
        const resource = objectLoader.createCompactedResource({
          undefined: '"true"',
        });
        expect(await constructor.getArgumentValue(resource, settings)).toEqual(undefined);
        expect(constructionStrategy.createUndefined).toHaveBeenCalled();
      });
    });

    describe('for fields', () => {
      it('should handle fields without list', async() => {
        const resource = objectLoader.createCompactedResource({
          fields: { bla: true },
        });
        expect(await constructor.getArgumentValue(resource, settings)).toEqual({ entries: []});
        expect(constructionStrategy.createHash).toHaveBeenCalledWith({ settings, entries: []});
      });

      it('should handle empty fields', async() => {
        const resource = objectLoader.createCompactedResource({
          fields: { list: []},
        });
        expect(await constructor.getArgumentValue(resource, settings)).toEqual({ entries: []});
        expect(constructionStrategy.createHash).toHaveBeenCalledWith({ settings, entries: []});
      });

      it('should handle one field', async() => {
        const resource = objectLoader.createCompactedResource({
          fields: {
            list: [
              {
                key: '"KEY"',
                value: '"ABC"',
              },
            ],
          },
        });
        expect(await constructor.getArgumentValue(resource, settings)).toEqual({
          entries: [
            {
              key: 'KEY',
              value: 'ABC',
            },
          ],
        });
        expect(constructionStrategy.createHash).toHaveBeenCalledWith({
          settings,
          entries: [
            {
              key: 'KEY',
              value: 'ABC',
            },
          ],
        });
      });

      it('should handle multiple fields', async() => {
        const resource = objectLoader.createCompactedResource({
          fields: {
            list: [
              {
                key: '"KEY1"',
                value: '"A"',
              },
              {
                key: '"KEY2"',
                value: '"B"',
              },
              {
                key: '"KEY3"',
                value: '"C"',
              },
            ],
          },
        });
        expect(await constructor.getArgumentValue(resource, settings)).toEqual({
          entries: [
            {
              key: 'KEY1',
              value: 'A',
            },
            {
              key: 'KEY2',
              value: 'B',
            },
            {
              key: 'KEY3',
              value: 'C',
            },
          ],
        });
        expect(constructionStrategy.createHash).toHaveBeenCalledWith({
          settings,
          entries: [
            {
              key: 'KEY1',
              value: 'A',
            },
            {
              key: 'KEY2',
              value: 'B',
            },
            {
              key: 'KEY3',
              value: 'C',
            },
          ],
        });
      });

      it('should throw on a missing key', async() => {
        const resource = objectLoader.createCompactedResource({
          fields: {
            list: [
              {
                value: '"ABC"',
              },
            ],
          },
        });
        await expect(constructor.getArgumentValue(resource, settings)).rejects
          .toThrowError(/^Missing key in fields entry/u);
      });

      it('can use dereferenced IRI values as keys', async() => {
        const resource = objectLoader.createCompactedResource({
          fields: {
            list: [
              {
                key: 'ex:abc',
                value: '"ABC"',
              },
            ],
          },
        });
        expect(await constructor.getArgumentValue(resource, settings)).toEqual({
          entries: [
            {
              key: 'INSTANCE',
              value: 'ABC',
            },
          ],
        });
        expect(constructionStrategy.createHash).toHaveBeenCalledWith({
          settings,
          entries: [
            {
              key: 'INSTANCE',
              value: 'ABC',
            },
          ],
        });
      });

      it('should throw on non-string keys', async() => {
        configConstructorPool.instantiate.mockResolvedValueOnce(new Error('this is an object'));
        const resource = objectLoader.createCompactedResource({
          fields: {
            list: [
              {
                key: `ex:abc`,
                value: '"ABC"',
              },
            ],
          },
        });
        await expect(constructor.getArgumentValue(resource, settings)).rejects
          .toThrowError(/^Illegal non-string key \(ex:abc as NamedNode\) in fields entry/u);
      });

      it('should ignore fields without value', async() => {
        const resource = objectLoader.createCompactedResource({
          fields: {
            list: [
              {
                key: '"KEY"',
              },
            ],
          },
        });
        expect(await constructor.getArgumentValue(resource, settings)).toEqual({
          entries: [ undefined ],
        });
        expect(constructionStrategy.createHash).toHaveBeenCalledWith({
          settings,
          entries: [ undefined ],
        });
      });
    });

    describe('for elements', () => {
      it('should handle one element', async() => {
        const resource = objectLoader.createCompactedResource({
          elements: [
            {
              value: '"ABC"',
            },
          ],
        });
        expect(await constructor.getArgumentValue(resource, settings)).toEqual([
          'ABC',
        ]);
        expect(constructionStrategy.createArray).toHaveBeenCalledWith({
          settings,
          elements: [
            'ABC',
          ],
        });
      });

      it('should handle multiple elements', async() => {
        const resource = objectLoader.createCompactedResource({
          elements: [
            {
              value: '"ABC"',
            },
            {
              value: '"DEF"',
            },
            {
              value: '"GHI"',
            },
          ],
        });
        expect(await constructor.getArgumentValue(resource, settings)).toEqual([
          'ABC',
          'DEF',
          'GHI',
        ]);
        expect(constructionStrategy.createArray).toHaveBeenCalledWith({
          settings,
          elements: [
            'ABC',
            'DEF',
            'GHI',
          ],
        });
      });

      it('should throw on an element without value', async() => {
        const resource = objectLoader.createCompactedResource({
          elements: [
            {
              valueWrong: '"ABC"',
            },
          ],
        });
        await expect(constructor.getArgumentValue(resource, settings)).rejects
          .toThrowError(/^Missing value in array elements entry/u);
      });
    });

    describe('for RDF lists', () => {
      it('should handle one element', async() => {
        const resource = objectLoader.createCompactedResource({
          list: [
            '"ABC"',
          ],
        });
        expect(await constructor.getArgumentValue(resource, settings)).toEqual([
          'ABC',
        ]);
        expect(constructionStrategy.createArray).toHaveBeenCalledWith({
          settings,
          elements: [
            'ABC',
          ],
        });
      });

      it('should handle multiple elements', async() => {
        const resource = objectLoader.createCompactedResource({
          list: [
            '"ABC"',
            '"DEF"',
            '"GHI"',
          ],
        });
        expect(await constructor.getArgumentValue(resource, settings)).toEqual([
          'ABC',
          'DEF',
          'GHI',
        ]);
        expect(constructionStrategy.createArray).toHaveBeenCalledWith({
          settings,
          elements: [
            'ABC',
            'DEF',
            'GHI',
          ],
        });
      });
    });

    describe('for references', () => {
      it('should handle an IRI with value', async() => {
        const resource = objectLoader.createCompactedResource({
          '@id': 'ex:abc',
          value: '"ABC"',
        });
        expect(await constructor.getArgumentValue(resource, settings)).toEqual('ABC');
        expect(constructionStrategy.createPrimitive).toHaveBeenCalledWith({
          settings,
          value: 'ABC',
        });
      });

      it('should handle a bnode with value', async() => {
        const resource = objectLoader.createCompactedResource({
          value: '"ABC"',
        });
        expect(await constructor.getArgumentValue(resource, settings)).toEqual('ABC');
        expect(constructionStrategy.createPrimitive).toHaveBeenCalledWith({
          settings,
          value: 'ABC',
        });
      });

      it('should handle an IRI as construction', async() => {
        const resource = objectLoader.createCompactedResource({
          '@id': 'ex:abc',
        });
        expect(await constructor.getArgumentValue(resource, settings)).toEqual('INSTANCE');
        expect(configConstructorPool.instantiate).toHaveBeenCalledWith(resource, settings);
      });

      it('should handle a bnode as construction', async() => {
        const resource = objectLoader.createCompactedResource({});
        expect(await constructor.getArgumentValue(resource, settings)).toEqual('INSTANCE');
        expect(configConstructorPool.instantiate).toHaveBeenCalledWith(resource, settings);
      });

      it('should not handle an IRI with shallow construction', async() => {
        settings.shallow = true;
        const resource = objectLoader.createCompactedResource({
          '@id': 'ex:abc',
        });
        expect(await constructor.getArgumentValue(resource, settings)).toEqual({
          entries: [],
        });
        expect(constructionStrategy.createHash).toHaveBeenCalledWith({
          settings,
          entries: [],
        });
      });

      it('should not handle a bnode with shallow construction', async() => {
        settings.shallow = true;
        const resource = objectLoader.createCompactedResource({});
        expect(await constructor.getArgumentValue(resource, settings)).toEqual({
          entries: [],
        });
        expect(constructionStrategy.createHash).toHaveBeenCalledWith({
          settings,
          entries: [],
        });
      });

      it('should handle an IRI with lazy flag as construction', async() => {
        const resource = objectLoader.createCompactedResource({
          '@id': 'ex:abc',
          lazy: '"true"',
        });
        expect(await (await constructor.getArgumentValue(resource, settings))()).toEqual('INSTANCE');
        expect(configConstructorPool.instantiate).toHaveBeenCalledWith(resource, settings);
        expect(constructionStrategy.createLazySupplier).toHaveBeenCalledWith({
          settings,
          supplier: expect.any(Function),
        });
      });

      it('should handle a bnode with lazy flag as construction', async() => {
        const resource = objectLoader.createCompactedResource({
          lazy: '"true"',
        });
        expect(await (await constructor.getArgumentValue(resource, settings))()).toEqual('INSTANCE');
        expect(configConstructorPool.instantiate).toHaveBeenCalledWith(resource, settings);
        expect(constructionStrategy.createLazySupplier).toHaveBeenCalledWith({
          settings,
          supplier: expect.any(Function),
        });
      });
    });

    describe('for literals', () => {
      it('should handle a string value', async() => {
        const resource = objectLoader.createCompactedResource('"ABC"');
        expect(await constructor.getArgumentValue(resource, settings)).toEqual('ABC');
        expect(constructionStrategy.createPrimitive).toHaveBeenCalledWith({
          settings,
          value: 'ABC',
        });
      });

      it('should handle a string value with lazy flag', async() => {
        const resource = objectLoader.createCompactedResource('"ABC"');
        resource.property.lazy = objectLoader.createCompactedResource('"true"');
        expect(await (await constructor.getArgumentValue(resource, settings))()).toEqual('ABC');
        expect(constructionStrategy.createPrimitive).toHaveBeenCalledWith({ settings, value: 'ABC' });
        expect(constructionStrategy.createLazySupplier).toHaveBeenCalledWith({
          settings,
          supplier: expect.any(Function),
        });
      });

      it('should handle a raw value', async() => {
        const resource = objectLoader.createCompactedResource('"123"');
        (<any> resource.term).valueRaw = 123;
        expect(await constructor.getArgumentValue(resource, settings)).toEqual(123);
        expect(constructionStrategy.createPrimitive).toHaveBeenCalledWith({
          settings,
          value: 123,
        });
      });
    });

    it('should throw on graph terms', async() => {
      const resource = new Resource({ term: DF.defaultGraph() });
      await expect(constructor.getArgumentValue(resource, settings)).rejects
        .toThrowError(/^Unsupported argument value during config construction/u);
    });
  });

  describe('createArguments', () => {
    it('should handle configs without arguments', async() => {
      const config = objectLoader.createCompactedResource({});
      expect(await constructor.createArguments(config, settings)).toEqual([]);
    });

    it('should handle configs with arguments', async() => {
      const config = objectLoader.createCompactedResource({
        arguments: {
          list: [
            '"ABC"',
            {
              fields: {
                list: [
                  {
                    key: '"KEY"',
                    value: '"ABC"',
                  },
                ],
              },
            },
          ],
        },
      });
      expect(await constructor.createArguments(config, settings)).toEqual([
        'ABC',
        {
          entries: [
            {
              key: 'KEY',
              value: 'ABC',
            },
          ],
        },
      ]);
    });

    it('should throw on configs with non-list arguments', async() => {
      const config = objectLoader.createCompactedResource({
        arguments: '"ABC"',
      });
      await expect(constructor.createArguments(config, settings)).rejects
        .toThrowError(/^Detected non-RDF-list as value for config arguments/u);
    });
  });

  describe('createInstance', () => {
    it('should handle configs with minimal values', async() => {
      const config = objectLoader.createCompactedResource({
        '@id': 'ex:myConfig',
        requireName: '"REQUIRENAME"',
      });
      expect(await constructor.createInstance(config, settings)).toEqual('INSTANCESTRAT');
      expect(constructionStrategy.createInstance).toHaveBeenCalledWith({
        settings,
        moduleState,
        requireName: 'REQUIRENAME',
        requireElement: undefined,
        callConstructor: true,
        instanceId: 'ex:myConfig',
        args: [],
      });
    });

    it('should handle configs with all possible values', async() => {
      const config = objectLoader.createCompactedResource({
        '@id': 'ex:myConfig',
        arguments: {
          list: [
            '"ABC"',
          ],
        },
        requireName: '"REQUIRENAME"',
        requireElement: '"REQUIREELEMENT"',
        types: 'oo:ComponentInstance',
      });
      expect(await constructor.createInstance(config, settings)).toEqual('INSTANCESTRAT');
      expect(constructionStrategy.createInstance).toHaveBeenCalledWith({
        settings,
        moduleState,
        requireName: 'REQUIRENAME',
        requireElement: 'REQUIREELEMENT',
        callConstructor: false,
        instanceId: 'ex:myConfig',
        args: [ 'ABC' ],
      });
    });

    it('should handle configs with original instance reference', async() => {
      const config = objectLoader.createCompactedResource({
        '@id': 'ex:myConfig',
        requireName: '"REQUIRENAME"',
        originalInstance: 'ex:myOriginalConfig',
      });
      expect(await constructor.createInstance(config, settings)).toEqual('INSTANCESTRAT');
      expect(constructionStrategy.createInstance).toHaveBeenCalledWith({
        settings,
        moduleState,
        requireName: 'REQUIRENAME',
        requireElement: undefined,
        callConstructor: true,
        instanceId: 'ex:myOriginalConfig',
        args: [],
      });
    });

    it('should handle configs with requireNoConstructor true', async() => {
      const config = objectLoader.createCompactedResource({
        '@id': 'ex:myConfig',
        requireName: '"REQUIRENAME"',
        requireNoConstructor: '"true"',
      });
      expect(await constructor.createInstance(config, settings)).toEqual('INSTANCESTRAT');
      expect(constructionStrategy.createInstance).toHaveBeenCalledWith({
        settings,
        moduleState,
        requireName: 'REQUIRENAME',
        requireElement: undefined,
        callConstructor: false,
        instanceId: 'ex:myConfig',
        args: [],
      });
    });

    it('should handle configs with requireNoConstructor false', async() => {
      const config = objectLoader.createCompactedResource({
        '@id': 'ex:myConfig',
        requireName: '"REQUIRENAME"',
        requireNoConstructor: '"false"',
      });
      expect(await constructor.createInstance(config, settings)).toEqual('INSTANCESTRAT');
      expect(constructionStrategy.createInstance).toHaveBeenCalledWith({
        settings,
        moduleState,
        requireName: 'REQUIRENAME',
        requireElement: undefined,
        callConstructor: true,
        instanceId: 'ex:myConfig',
        args: [],
      });
    });
  });
});
