import * as fs from 'fs';
import { DataFactory } from 'rdf-data-factory';
import { Resource, RdfObjectLoader } from 'rdf-object';

import type { ICreationStrategy } from '../../../lib/creationstrategy/ICreationStrategy';
import { ConfigConstructor } from '../../../lib/instantiation/ConfigConstructor';
import type { IInstantiationSettingsInner } from '../../../lib/instantiation/IInstantiationSettings';
import type { InstancePool } from '../../../lib/instantiation/InstancePool';
import type { IModuleState } from '../../../lib/ModuleStateBuilder';

const DF = new DataFactory();

describe('ConfigConstructor', () => {
  let objectLoader: RdfObjectLoader;
  let componentResources: Record<string, Resource>;
  let instancePool: InstancePool;
  let constructor: ConfigConstructor;
  let creationStrategy: ICreationStrategy<any>;
  let moduleState: IModuleState;
  let settings: IInstantiationSettingsInner<any>;

  beforeEach(async() => {
    objectLoader = new RdfObjectLoader({
      context: JSON.parse(fs.readFileSync(`${__dirname}/../../../components/context.jsonld`, 'utf8')),
    });
    await objectLoader.context;
    componentResources = {};
    instancePool = <any> {
      instantiate: jest.fn(() => 'INSTANCE'),
    };
    constructor = new ConfigConstructor({
      objectLoader,
      instancePool,
    });

    creationStrategy = {
      createArray: jest.fn(options => options.elements),
      createHash: jest.fn(options => ({ entries: options.entries })),
      createInstance: jest.fn(() => 'INSTANCESTRAT'),
      createLazySupplier: jest.fn(options => <any> options.supplier),
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
    settings = {
      moduleState,
      creationStrategy,
    };
  });

  describe('getArgumentValues', () => {
    it('should handle an empty array', async() => {
      expect(await constructor.getArgumentValues([], settings)).toEqual([]);
      expect(creationStrategy.createArray).toHaveBeenCalledWith({ settings, elements: []});
    });

    it('should handle a array with one unique value', async() => {
      const values = [
        objectLoader.createCompactedResource('"ABC"'),
      ];
      values[0].property.unique = objectLoader.createCompactedResource('"true"');
      expect(await constructor.getArgumentValues(values, settings)).toEqual('ABC');
      expect(creationStrategy.createArray).not.toHaveBeenCalled();
      expect(creationStrategy.createPrimitive).toHaveBeenCalledWith({ settings, value: 'ABC' });
    });

    it('should handle a array with multiple values, but unique', async() => {
      const values = [
        objectLoader.createCompactedResource('"ABC"'),
        objectLoader.createCompactedResource('"DEF"'),
        objectLoader.createCompactedResource('"GHI"'),
      ];
      values[0].property.unique = objectLoader.createCompactedResource('"true"');
      expect(await constructor.getArgumentValues(values, settings)).toEqual('ABC');
      expect(creationStrategy.createArray).not.toHaveBeenCalled();
      expect(creationStrategy.createPrimitive).toHaveBeenCalledWith({ settings, value: 'ABC' });
    });

    it('should handle a array with one non-unique value', async() => {
      const values = [
        objectLoader.createCompactedResource('"ABC"'),
      ];
      expect(await constructor.getArgumentValues(values, settings)).toEqual([ 'ABC' ]);
      expect(creationStrategy.createArray).toHaveBeenCalledWith({ settings, elements: [ 'ABC' ]});
      expect(creationStrategy.createPrimitive).toHaveBeenCalledWith({ settings, value: 'ABC' });
    });

    it('should handle a array with multiple values', async() => {
      const values = [
        objectLoader.createCompactedResource('"ABC"'),
        objectLoader.createCompactedResource('"DEF"'),
        objectLoader.createCompactedResource('"GHI"'),
      ];
      expect(await constructor.getArgumentValues(values, settings)).toEqual([ 'ABC', 'DEF', 'GHI' ]);
      expect(creationStrategy.createArray).toHaveBeenCalledWith({ settings, elements: [ 'ABC', 'DEF', 'GHI' ]});
      expect(creationStrategy.createPrimitive).toHaveBeenCalledWith({ settings, value: 'ABC' });
      expect(creationStrategy.createPrimitive).toHaveBeenCalledWith({ settings, value: 'DEF' });
      expect(creationStrategy.createPrimitive).toHaveBeenCalledWith({ settings, value: 'GHI' });
    });
  });

  describe('getArgumentValue', () => {
    describe('for fields', () => {
      it('should handle empty fields', async() => {
        const resource = objectLoader.createCompactedResource({
          hasFields: '"true"',
        });
        expect(await constructor.getArgumentValue(resource, settings)).toEqual({ entries: []});
        expect(creationStrategy.createHash).toHaveBeenCalledWith({ settings, entries: []});
      });

      it('should handle one field', async() => {
        const resource = objectLoader.createCompactedResource({
          fields: [
            {
              key: '"KEY"',
              value: '"ABC"',
            },
          ],
        });
        expect(await constructor.getArgumentValue(resource, settings)).toEqual({
          entries: [
            {
              key: 'KEY',
              value: [ 'ABC' ],
            },
          ],
        });
        expect(creationStrategy.createHash).toHaveBeenCalledWith({
          settings,
          entries: [
            {
              key: 'KEY',
              value: [ 'ABC' ],
            },
          ],
        });
      });

      it('should handle multiple fields', async() => {
        const resource = objectLoader.createCompactedResource({
          fields: [
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
        });
        expect(await constructor.getArgumentValue(resource, settings)).toEqual({
          entries: [
            {
              key: 'KEY1',
              value: [ 'A' ],
            },
            {
              key: 'KEY2',
              value: [ 'B' ],
            },
            {
              key: 'KEY3',
              value: [ 'C' ],
            },
          ],
        });
        expect(creationStrategy.createHash).toHaveBeenCalledWith({
          settings,
          entries: [
            {
              key: 'KEY1',
              value: [ 'A' ],
            },
            {
              key: 'KEY2',
              value: [ 'B' ],
            },
            {
              key: 'KEY3',
              value: [ 'C' ],
            },
          ],
        });
      });

      it('should throw on a missing key', async() => {
        const resource = objectLoader.createCompactedResource({
          fields: [
            {
              value: '"ABC"',
            },
          ],
        });
        await expect(constructor.getArgumentValue(resource, settings)).rejects
          .toThrowError(/^Missing key in fields entry\./u);
      });

      it('should throw on IRI key', async() => {
        const resource = objectLoader.createCompactedResource({
          fields: [
            {
              key: 'ex:abc',
              value: '"ABC"',
            },
          ],
        });
        await expect(constructor.getArgumentValue(resource, settings)).rejects
          .toThrowError(/^Illegal non-literal key \(ex:abc as NamedNode\) in fields entry\./u);
      });

      it('should ignore fields without value', async() => {
        const resource = objectLoader.createCompactedResource({
          fields: [
            {
              key: '"KEY"',
            },
          ],
        });
        expect(await constructor.getArgumentValue(resource, settings)).toEqual({
          entries: [ undefined ],
        });
        expect(creationStrategy.createHash).toHaveBeenCalledWith({
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
        expect(creationStrategy.createArray).toHaveBeenCalledWith({
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
        expect(creationStrategy.createArray).toHaveBeenCalledWith({
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
          .toThrowError(/^Missing value in array elements entry\./u);
      });
    });

    describe('for references', () => {
      it('should handle an IRI with value', async() => {
        const resource = objectLoader.createCompactedResource({
          '@id': 'ex:abc',
          value: '"ABC"',
        });
        expect(await constructor.getArgumentValue(resource, settings)).toEqual([
          'ABC',
        ]);
        expect(creationStrategy.createPrimitive).toHaveBeenCalledWith({
          settings,
          value: 'ABC',
        });
      });

      it('should handle a bnode with value', async() => {
        const resource = objectLoader.createCompactedResource({
          value: '"ABC"',
        });
        expect(await constructor.getArgumentValue(resource, settings)).toEqual([
          'ABC',
        ]);
        expect(creationStrategy.createPrimitive).toHaveBeenCalledWith({
          settings,
          value: 'ABC',
        });
      });

      it('should handle an IRI as instantiation', async() => {
        const resource = objectLoader.createCompactedResource({
          '@id': 'ex:abc',
        });
        expect(await constructor.getArgumentValue(resource, settings)).toEqual('INSTANCE');
        expect(instancePool.instantiate).toHaveBeenCalledWith(resource, settings);
      });

      it('should handle a bnode as instantiation', async() => {
        const resource = objectLoader.createCompactedResource({});
        expect(await constructor.getArgumentValue(resource, settings)).toEqual('INSTANCE');
        expect(instancePool.instantiate).toHaveBeenCalledWith(resource, settings);
      });

      it('should not handle an IRI with shallow instantiation', async() => {
        settings.shallow = true;
        const resource = objectLoader.createCompactedResource({
          '@id': 'ex:abc',
        });
        expect(await constructor.getArgumentValue(resource, settings)).toEqual({
          entries: [],
        });
        expect(creationStrategy.createHash).toHaveBeenCalledWith({
          settings,
          entries: [],
        });
      });

      it('should not handle a bnode with shallow instantiation', async() => {
        settings.shallow = true;
        const resource = objectLoader.createCompactedResource({});
        expect(await constructor.getArgumentValue(resource, settings)).toEqual({
          entries: [],
        });
        expect(creationStrategy.createHash).toHaveBeenCalledWith({
          settings,
          entries: [],
        });
      });

      it('should handle an IRI with lazy flag as instantiation', async() => {
        const resource = objectLoader.createCompactedResource({
          '@id': 'ex:abc',
          lazy: '"true"',
        });
        expect(await (await constructor.getArgumentValue(resource, settings))()).toEqual('INSTANCE');
        expect(instancePool.instantiate).toHaveBeenCalledWith(resource, settings);
        expect(creationStrategy.createLazySupplier).toHaveBeenCalledWith({
          settings,
          supplier: expect.any(Function),
        });
      });

      it('should handle a bnode with lazy flag as instantiation', async() => {
        const resource = objectLoader.createCompactedResource({
          lazy: '"true"',
        });
        expect(await (await constructor.getArgumentValue(resource, settings))()).toEqual('INSTANCE');
        expect(instancePool.instantiate).toHaveBeenCalledWith(resource, settings);
        expect(creationStrategy.createLazySupplier).toHaveBeenCalledWith({
          settings,
          supplier: expect.any(Function),
        });
      });
    });

    describe('for literals', () => {
      it('should handle a string value', async() => {
        const resource = objectLoader.createCompactedResource('"ABC"');
        expect(await constructor.getArgumentValue(resource, settings)).toEqual('ABC');
        expect(creationStrategy.createPrimitive).toHaveBeenCalledWith({
          settings,
          value: 'ABC',
        });
      });

      it('should handle a string value with lazy flag', async() => {
        const resource = objectLoader.createCompactedResource('"ABC"');
        resource.property.lazy = objectLoader.createCompactedResource('"true"');
        expect(await (await constructor.getArgumentValue(resource, settings))()).toEqual('ABC');
        expect(creationStrategy.createPrimitive).toHaveBeenCalledWith({ settings, value: 'ABC' });
        expect(creationStrategy.createLazySupplier).toHaveBeenCalledWith({
          settings,
          supplier: expect.any(Function),
        });
      });

      it('should handle a raw value', async() => {
        const resource = objectLoader.createCompactedResource('"123"');
        (<any> resource.term).valueRaw = 123;
        expect(await constructor.getArgumentValue(resource, settings)).toEqual(123);
        expect(creationStrategy.createPrimitive).toHaveBeenCalledWith({
          settings,
          value: 123,
        });
      });
    });

    it('should throw on graph terms', async() => {
      const resource = new Resource({ term: DF.defaultGraph() });
      await expect(constructor.getArgumentValue(resource, settings)).rejects
        .toThrowError(/^Unsupported argument value during config construction\./u);
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
              fields: [
                {
                  key: '"KEY"',
                  value: '"ABC"',
                },
              ],
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
              value: [ 'ABC' ],
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
        .toThrowError(/^Detected non-RDF-list as value for config arguments\./u);
    });
  });

  describe('createInstance', () => {
    it('should handle configs with minimal values', async() => {
      const config = objectLoader.createCompactedResource({
        '@id': 'ex:myConfig',
        requireName: '"REQUIRENAME"',
      });
      expect(await constructor.createInstance(config, settings)).toEqual('INSTANCESTRAT');
      expect(creationStrategy.createInstance).toHaveBeenCalledWith({
        settings,
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
      expect(creationStrategy.createInstance).toHaveBeenCalledWith({
        settings,
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
      expect(creationStrategy.createInstance).toHaveBeenCalledWith({
        settings,
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
      expect(creationStrategy.createInstance).toHaveBeenCalledWith({
        settings,
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
      expect(creationStrategy.createInstance).toHaveBeenCalledWith({
        settings,
        requireName: 'REQUIRENAME',
        requireElement: undefined,
        callConstructor: true,
        instanceId: 'ex:myConfig',
        args: [],
      });
    });
  });
});
