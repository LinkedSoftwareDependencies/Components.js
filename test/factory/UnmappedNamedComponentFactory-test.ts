import type { RdfObjectLoader } from 'rdf-object';
import { Resource } from 'rdf-object';
import { UnmappedNamedComponentFactory } from '../../lib/factory/UnmappedNamedComponentFactory';
import { Loader } from '../../lib/Loader';

const N3 = require('n3');

describe('UnmappedNamedComponentFactory', () => {
  let loader: Loader;
  let objectLoader: RdfObjectLoader;
  beforeEach(() => {
    loader = new Loader();
    // Create resources via object loader, so we can use CURIEs
    objectLoader = loader.objectLoader;
  });

  describe('for an N3 Lexer', () => {
    let module: Resource;
    let n3LexerComponent: Resource;
    beforeEach(() => {
      n3LexerComponent = objectLoader.createCompactedResource({
        '@id': 'http://example.org/n3#Lexer',
        requireElement: '"Lexer"',
        parameters: [
          { '@id': 'http://example.org/n3#lineMode', unique: '"true"' },
          { '@id': 'http://example.org/n3#n3', unique: '"true"' },
          { '@id': 'http://example.org/n3#comments', unique: '"true"' },
        ],
      });
      module = objectLoader.createCompactedResource({
        '@id': 'http://example.org/n3',
        requireName: '"n3"',
        components: [
          n3LexerComponent,
        ],
      });
    });

    describe('for a constructor with arguments', () => {
      let constructor: UnmappedNamedComponentFactory;
      beforeEach(() => {
        constructor = new UnmappedNamedComponentFactory(module, n3LexerComponent, objectLoader.createCompactedResource({
          'http://example.org/n3#lineMode': objectLoader.createCompactedResource('"true"'),
          'http://example.org/n3#n3': objectLoader.createCompactedResource('"true"'),
          'http://example.org/n3#comments': objectLoader.createCompactedResource('"true"'),
        }), true, {}, loader);
      });

      it('should be valid', () => {
        expect(constructor).toBeTruthy();
      });

      it('should create valid arguments', async() => {
        const args = await constructor.makeArguments();
        expect(args).toEqual([{
          'http://example.org/n3#lineMode': 'true',
          'http://example.org/n3#n3': 'true',
          'http://example.org/n3#comments': 'true',
        }]);
      });

      it('should make a valid instance', async() => {
        const instance = await constructor.create();
        expect(instance).toBeTruthy();
        expect(instance).toBeInstanceOf(N3.Lexer);
      });
    });

    describe('#makeUnnamedDefinitionConstructor', () => {
      it('should create a valid definition constructor', () => {
        const constructor = UnmappedNamedComponentFactory
          .makeUnnamedDefinitionConstructor(module, n3LexerComponent, objectLoader);
        expect(constructor).toBeTruthy();
        expect(constructor).toBeInstanceOf(Function);
        expect(constructor(objectLoader.createCompactedResource({}))).toBeInstanceOf(Resource);
      });

      it('should create a resource with undefined arguments when constructed with no arguments', () => {
        const instance: Resource = UnmappedNamedComponentFactory
          .makeUnnamedDefinitionConstructor(module, n3LexerComponent, objectLoader)(
            objectLoader.createCompactedResource({}),
          );
        expect(instance).toBeInstanceOf(Resource);
        expect(instance).toHaveProperty('type', 'BlankNode');
        expect(instance.property).toHaveProperty('requireName', objectLoader.createCompactedResource('"n3"'));
        expect(instance.property).toHaveProperty('requireElement', objectLoader.createCompactedResource('"Lexer"'));
        expect(instance.property).toHaveProperty('arguments');
        expect(instance.property.arguments.list!.length).toEqual(1);
        expect(instance.property.arguments.list![0].properties.fields.length).toEqual(3);
        expect(instance.property.arguments.list![0].properties.fields[0].property.key.value)
          .toEqual('http://example.org/n3#lineMode');
        expect(instance.property.arguments.list![0].properties.fields[0].property.value).toBeUndefined();
        expect(instance.property.arguments.list![0].properties.fields[1].property.key.value)
          .toEqual('http://example.org/n3#n3');
        expect(instance.property.arguments.list![0].properties.fields[1].property.value).toBeUndefined();
        expect(instance.property.arguments.list![0].properties.fields[2].property.key.value)
          .toEqual('http://example.org/n3#comments');
        expect(instance.property.arguments.list![0].properties.fields[2].property.value).toBeUndefined();
      });

      it('should create a resource with defined arguments when constructed with arguments', () => {
        const instance: Resource = UnmappedNamedComponentFactory
          .makeUnnamedDefinitionConstructor(module, n3LexerComponent, objectLoader)(
            objectLoader.createCompactedResource({
              'http://example.org/n3#lineMode': objectLoader.createCompactedResource('"true"'),
              'http://example.org/n3#n3': objectLoader.createCompactedResource('"true"'),
              'http://example.org/n3#comments': objectLoader.createCompactedResource('"true"'),
            }),
          );
        expect(instance).toBeInstanceOf(Resource);
        expect(instance).toHaveProperty('type', 'BlankNode');
        expect(instance.property).toHaveProperty('requireName', objectLoader.createCompactedResource('"n3"'));
        expect(instance.property).toHaveProperty('requireElement', objectLoader.createCompactedResource('"Lexer"'));
        expect(instance.property).toHaveProperty('arguments');

        expect(instance.property.arguments.list!.length).toEqual(1);
        expect(instance.property.arguments.list![0].properties.fields.length).toEqual(3);
        expect(instance.property.arguments.list![0].properties.fields[0].property.key.value)
          .toEqual('http://example.org/n3#lineMode');
        expect(instance.property.arguments.list![0].properties.fields[0].property.value.value).toEqual('true');
        expect(instance.property.arguments.list![0].properties.fields[1].property.key.value)
          .toEqual('http://example.org/n3#n3');
        expect(instance.property.arguments.list![0].properties.fields[1].property.value.value).toEqual('true');
        expect(instance.property.arguments.list![0].properties.fields[2].property.key.value)
          .toEqual('http://example.org/n3#comments');
        expect(instance.property.arguments.list![0].properties.fields[2].property.value.value).toEqual('true');
      });
    });
  });

  describe('for an N3 Parser', () => {
    let module: Resource;
    let n3LexerComponent: Resource;
    let n3ParserComponent: Resource;
    let constructor: UnmappedNamedComponentFactory;
    beforeEach(() => {
      n3LexerComponent = objectLoader.createCompactedResource({
        '@id': 'http://example.org/n3#Lexer',
        requireElement: '"Lexer"',
        parameters: [
          { '@id': 'http://example.org/n3#lineMode', unique: '"true"' },
          { '@id': 'http://example.org/n3#n3', unique: '"true"' },
          { '@id': 'http://example.org/n3#comments', unique: '"true"' },
        ],
      });
      n3ParserComponent = objectLoader.createCompactedResource({
        '@id': 'http://example.org/n3#Parser',
        requireElement: '"Parser"',
        parameters: [
          { '@id': 'http://example.org/n3#format', unique: '"true"' },
          { '@id': 'http://example.org/n3#blankNodePrefix', unique: '"true"' },
          { '@id': 'http://example.org/n3#lexer', unique: '"true"' },
          { '@id': 'http://example.org/n3#explicitQuantifiers', unique: '"true"' },
        ],
      });
      module = objectLoader.createCompactedResource({
        '@id': 'http://example.org/n3',
        requireName: '"n3"',
        components: [
          n3LexerComponent,
          n3ParserComponent,
        ],
      });
      constructor = new UnmappedNamedComponentFactory(module, n3ParserComponent, objectLoader.createCompactedResource({
        'http://example.org/n3#format': objectLoader.createCompactedResource('"application/trig"'),
        'http://example.org/n3#lexer': UnmappedNamedComponentFactory
          .makeUnnamedDefinitionConstructor(module, n3LexerComponent, objectLoader)(objectLoader
            .createCompactedResource({
              'http://example.org/n3#lineMode': objectLoader.createCompactedResource('"true"'),
              'http://example.org/n3#n3': objectLoader.createCompactedResource('"true"'),
              'http://example.org/n3#comments': objectLoader.createCompactedResource('"true"'),
            })),
      }), true, {}, loader);
    });

    it('should be valid', () => {
      expect(constructor).toBeTruthy();
    });

    it('should create valid arguments', async() => {
      const args = await constructor.makeArguments();
      expect(args.length).toEqual(1);
      expect(args[0]['http://example.org/n3#format']).toEqual('application/trig');
      expect(args[0]['http://example.org/n3#lexer']).toBeInstanceOf(N3.Lexer);
    });

    it('should make a valid instance', async() => {
      const instance = await constructor.create();
      expect(instance).toBeTruthy();
      expect(instance).toBeInstanceOf(N3.Parser);
    });
  });

  describe('for an N3 Util', () => {
    let n3UtilComponent: Resource;
    let module: Resource;
    let constructor: UnmappedNamedComponentFactory;
    beforeEach(() => {
      n3UtilComponent = objectLoader.createCompactedResource({
        '@id': 'http://example.org/n3#Util',
        requireElement: '"Util"',
      });
      module = objectLoader.createCompactedResource({
        '@id': 'http://example.org/n3',
        requireName: '"n3"',
        components: [
          n3UtilComponent,
        ],
      });
      constructor = new UnmappedNamedComponentFactory(
        module,
        n3UtilComponent,
        objectLoader.createCompactedResource({}),
        false,
        {},
        loader,
      );
    });

    it('should be valid', () => {
      expect(constructor).toBeTruthy();
    });

    it('should create valid arguments', async() => {
      const args = await constructor.makeArguments();
      expect(args).toEqual([{}]);
    });

    it('should make a valid instance', async() => {
      const instance = await constructor.create();
      expect(instance).toBeTruthy();
      expect(instance).toBe(N3.Util);
    });
  });

  describe('for an N3 Dummy', () => {
    let n3DummyComponent: Resource;
    let module: Resource;
    let constructor: UnmappedNamedComponentFactory;
    beforeEach(() => {
      n3DummyComponent = objectLoader.createCompactedResource({
        '@id': 'http://example.org/n3#Dummy',
        requireElement: '"Dummy"',
        parameters: [
          { '@id': 'http://example.org/n3#dummyParam', unique: '"true"' },
        ],
      });
      module = objectLoader.createCompactedResource({
        '@id': 'http://example.org/n3',
        requireName: '"n3"',
        components: [
          n3DummyComponent,
        ],
      });
      constructor = new UnmappedNamedComponentFactory(module, n3DummyComponent, objectLoader.createCompactedResource({
        'http://example.org/n3#dummyParam': objectLoader.createCompactedResource('"true"'),
      }), true, {}, loader);
    });

    it('should be valid', () => {
      expect(constructor).toBeTruthy();
    });

    it('should create valid arguments', async() => {
      const args = await constructor.makeArguments();
      expect(args).toEqual([{
        'http://example.org/n3#dummyParam': 'true',
      }]);
    });

    it('should fail to make a valid instance', () => expect(constructor.create()).rejects
      .toThrow(new Error('Failed to get module element Dummy from module n3')));
  });

  describe('for an N3 Dummy with default values', () => {
    let n3DummyComponentDefaults: Resource;
    let module: Resource;
    let constructor: UnmappedNamedComponentFactory;
    beforeEach(() => {
      n3DummyComponentDefaults = objectLoader.createCompactedResource({
        '@id': 'http://example.org/n3#Dummy',
        requireElement: '"Dummy"',
        parameters: [
          {
            '@id': 'http://example.org/n3#dummyParam1',
            default: [
              '"a"',
              '"b"',
            ],
          },
          {
            '@id': 'http://example.org/n3#dummyParam2',
            unique: '"true"',
            default: [
              '"a"',
            ],
          },
        ],
      });
      module = objectLoader.createCompactedResource({
        '@id': 'http://example.org/n3',
        requireName: '"n3"',
        components: [
          n3DummyComponentDefaults,
        ],
      });
      constructor = new UnmappedNamedComponentFactory(
        module,
        n3DummyComponentDefaults,
        objectLoader.createCompactedResource({}),
        true,
        {},
        loader,
      );
    });

    it('should be valid', () => {
      expect(constructor).toBeTruthy();
    });

    it('should create valid arguments', async() => {
      const args = await constructor.makeArguments();
      expect(args).toEqual([{
        'http://example.org/n3#dummyParam1': [ 'a', 'b' ],
        'http://example.org/n3#dummyParam2': 'a',
      }]);
    });

    it('should fail to make a valid instance', () => expect(constructor.create()).rejects
      .toThrow(new Error('Failed to get module element Dummy from module n3')));
  });

  describe('for an N3 Dummy with overridden default values', () => {
    let n3DummyComponentDefaults: Resource;
    let module: Resource;
    let constructor: UnmappedNamedComponentFactory;
    beforeEach(() => {
      n3DummyComponentDefaults = objectLoader.createCompactedResource({
        '@id': 'http://example.org/n3#Dummy',
        requireElement: '"Dummy"',
        parameters: [
          {
            '@id': 'http://example.org/n3#dummyParam1',
            default: [
              '"a"',
              '"b"',
            ],
          },
          {
            '@id': 'http://example.org/n3#dummyParam2',
            unique: '"true"',
            default: [
              '"a"',
            ],
          },
        ],
      });
      module = objectLoader.createCompactedResource({
        '@id': 'http://example.org/n3',
        requireName: '"n3"',
        components: [
          n3DummyComponentDefaults,
        ],
      });
      constructor = new UnmappedNamedComponentFactory(module, n3DummyComponentDefaults, objectLoader
        .createCompactedResource({
          'http://example.org/n3#dummyParam1': objectLoader.createCompactedResource('"true"'),
          'http://example.org/n3#dummyParam2': objectLoader.createCompactedResource('"false"'),
        }), true, {}, loader);
    });

    it('should be valid', () => {
      expect(constructor).toBeTruthy();
    });

    it('should create valid arguments', async() => {
      const args = await constructor.makeArguments();
      expect(args).toEqual([{
        'http://example.org/n3#dummyParam1': [ 'true' ],
        'http://example.org/n3#dummyParam2': 'false',
      }]);
    });

    it('should fail to make a valid instance', () => expect(constructor.create()).rejects
      .toThrow(new Error('Failed to get module element Dummy from module n3')));
  });

  describe('for an N3 Dummy with default scoped values', () => {
    let n3DummyComponentDefaultsScoped: Resource;
    let module: Resource;
    let constructor: UnmappedNamedComponentFactory;
    beforeEach(() => {
      n3DummyComponentDefaultsScoped = objectLoader.createCompactedResource({
        '@id': 'http://example.org/n3#Dummy',
        requireElement: '"Dummy"',
        parameters: [
          {
            '@id': 'http://example.org/n3#dummyParam1',
            defaultScoped: [
              {
                defaultScope: 'http://example.org/n3#Dummy',
                defaultScopedValue: [
                  '"a"',
                  '"b"',
                ],
              },
            ],
          },
          {
            '@id': 'http://example.org/n3#dummyParam2',
            unique: '"true"',
            default: [
              '"a"',
            ],
          },
        ],
      });
      module = objectLoader.createCompactedResource({
        '@id': 'http://example.org/n3',
        requireName: '"n3"',
        components: [
          n3DummyComponentDefaultsScoped,
        ],
      });
      n3DummyComponentDefaultsScoped.properties.parameters[0].properties.defaultScoped[0].properties.scope
        .push(n3DummyComponentDefaultsScoped);
    });

    describe('without overrides', () => {
      beforeEach(() => {
        constructor = new UnmappedNamedComponentFactory(
          module,
          n3DummyComponentDefaultsScoped,
          objectLoader.createCompactedResource({}),
          true,
          {},
          loader,
        );
      });

      it('should be valid', () => {
        expect(constructor).toBeTruthy();
      });

      it('should create valid arguments', async() => {
        const args = await constructor.makeArguments();
        expect(args).toEqual([{
          'http://example.org/n3#dummyParam1': [ 'a', 'b' ],
          'http://example.org/n3#dummyParam2': 'a',
        }]);
      });

      it('should fail to make a valid instance', () => expect(constructor.create()).rejects
        .toThrow(new Error('Failed to get module element Dummy from module n3')));
    });

    describe('with overrides', () => {
      beforeEach(() => {
        constructor = new UnmappedNamedComponentFactory(module, n3DummyComponentDefaultsScoped, objectLoader
          .createCompactedResource({
            'http://example.org/n3#dummyParam1': objectLoader.createCompactedResource('"true"'),
            'http://example.org/n3#dummyParam2': objectLoader.createCompactedResource('"false"'),
          }), true, {}, loader);
      });

      it('should be valid', () => {
        expect(constructor).toBeTruthy();
      });

      it('should create valid arguments', async() => {
        const args = await constructor.makeArguments();
        expect(args).toEqual([{
          'http://example.org/n3#dummyParam1': [ 'true' ],
          'http://example.org/n3#dummyParam2': 'false',
        }]);
      });

      it('should fail to make a valid instance', () => expect(constructor.create()).rejects
        .toThrow(new Error('Failed to get module element Dummy from module n3')));
    });
  });

  describe('for an N3 Dummy with fixed values', () => {
    let n3DummyComponentFixed: Resource;
    let module: Resource;
    let constructor: UnmappedNamedComponentFactory;
    beforeEach(() => {
      n3DummyComponentFixed = objectLoader.createCompactedResource({
        '@id': 'http://example.org/n3#Dummy',
        requireElement: '"Dummy"',
        parameters: [
          {
            '@id': 'http://example.org/n3#dummyParam1',
            fixed: [
              '"a"',
              '"b"',
            ],
          },
          {
            '@id': 'http://example.org/n3#dummyParam2',
            unique: '"true"',
            fixed: '"a"',
          },
        ],
      });
      module = objectLoader.createCompactedResource({
        '@id': 'http://example.org/n3',
        requireName: '"n3"',
        components: [
          n3DummyComponentFixed,
        ],
      });
    });

    describe('without additional values', () => {
      beforeEach(() => {
        constructor = new UnmappedNamedComponentFactory(
          module,
          n3DummyComponentFixed,
          objectLoader.createCompactedResource({}),
          true,
          {},
          loader,
        );
      });

      it('should be valid', () => {
        expect(constructor).toBeTruthy();
      });

      it('should create valid arguments', async() => {
        const args = await constructor.makeArguments();
        expect(args).toEqual([{
          'http://example.org/n3#dummyParam1': [ 'a', 'b' ],
          'http://example.org/n3#dummyParam2': 'a',
        }]);
      });

      it('should fail to make a valid instance', () => expect(constructor.create()).rejects
        .toThrow(new Error('Failed to get module element Dummy from module n3')));
    });

    describe('with additional values', () => {
      beforeEach(() => {
        constructor = new UnmappedNamedComponentFactory(module, n3DummyComponentFixed, objectLoader
          .createCompactedResource({
            'http://example.org/n3#dummyParam1': [ objectLoader.createCompactedResource('"true"') ],
          }), true, {}, loader);
      });

      it('should be valid', () => {
        expect(constructor).toBeTruthy();
      });

      it('should create valid arguments', async() => {
        const args = await constructor.makeArguments();
        expect(args).toEqual([{
          'http://example.org/n3#dummyParam1': [ 'true', 'a', 'b' ],
          'http://example.org/n3#dummyParam2': 'a',
        }]);
      });

      it('should fail to make a valid instance', () => expect(constructor.create()).rejects
        .toThrow(new Error('Failed to get module element Dummy from module n3')));
    });

    describe('with additional value to a fixed, unique value', () => {
      it('should throw an error', async() => {
        await expect(async() => {
          new UnmappedNamedComponentFactory(module, n3DummyComponentFixed, objectLoader
            .createCompactedResource({
              'http://example.org/n3#dummyParam1': [ objectLoader.createCompactedResource('"true"') ],
              'http://example.org/n3#dummyParam2': [ objectLoader.createCompactedResource('"true"') ],
            }), true, {}, loader);
        }).rejects.toThrow(Error);
      });
    });
  });

  describe('for an N3 Dummy with a lazy parameter', () => {
    let n3DummyComponentLazy: Resource;
    let module: Resource;
    let constructor: UnmappedNamedComponentFactory;
    beforeEach(() => {
      n3DummyComponentLazy = objectLoader.createCompactedResource({
        '@id': 'http://example.org/n3#DummyLazy',
        requireElement: '"Dummy"',
        parameters: [
          {
            '@id': 'http://example.org/n3#dummyParam',
            lazy: '"true"',
            unique: '"true"',
          },
        ],
      });
      module = objectLoader.createCompactedResource({
        '@id': 'http://example.org/n3',
        requireName: '"n3"',
        components: [
          n3DummyComponentLazy,
        ],
      });
      constructor = new UnmappedNamedComponentFactory(module, n3DummyComponentLazy, objectLoader
        .createCompactedResource({
          'http://example.org/n3#dummyParam': objectLoader.createCompactedResource('"true"'),
        }), true, {}, loader);
    });

    it('should be valid', () => {
      expect(constructor).toBeTruthy();
    });

    it('should create valid arguments', async() => {
      const args = await constructor.makeArguments();
      expect(await args[0]['http://example.org/n3#dummyParam']()).toEqual('true');
    });
  });
});
