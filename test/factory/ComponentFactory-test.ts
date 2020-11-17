import type { Resource, RdfObjectLoader } from 'rdf-object';
import { ComponentFactory } from '../../lib/factory/ComponentFactory';
import { MappedNamedComponentFactory } from '../../lib/factory/MappedNamedComponentFactory';
import { UnmappedNamedComponentFactory } from '../../lib/factory/UnmappedNamedComponentFactory';
import { UnnamedComponentFactory } from '../../lib/factory/UnnamedComponentFactory';
import type { IInstancePool } from '../../lib/IInstancePool';
import { Loader } from '../../lib/Loader';
import type { IModuleState } from '../../lib/ModuleStateBuilder';
import * as Util from '../../lib/Util';

const N3 = require('n3');

describe('ComponentFactory', () => {
  let loader: Loader;
  let objectLoader: RdfObjectLoader;
  let moduleState: IModuleState;
  let instancePool: IInstancePool;
  beforeEach(async() => {
    loader = new Loader();
    moduleState = <any> {
      mainModulePath: `${__dirname}/..`,
      importPaths: {
        'http://example.org/': `${__dirname}/`,
      },
    };
    (<any> loader).moduleState = moduleState;
    objectLoader = (<any> loader).objectLoader;
    instancePool = await loader.getInstancePool();
  });

  function makeConstructor(
    moduleDefinition: Resource,
    componentDefinition: Resource,
    config: Resource,
    constructable = true,
  ) {
    return new ComponentFactory({
      objectLoader,
      moduleDefinition,
      componentDefinition,
      config,
      constructable,
      overrideRequireNames: {},
      instancePool,
    });
  }

  describe('for an unmapped N3 Lexer definition', () => {
    let n3LexerComponentDefinitionUnmapped: Resource;
    let module: Resource;
    beforeEach(() => {
      n3LexerComponentDefinitionUnmapped = objectLoader.createCompactedResource({
        '@id': 'http://example.org/n3#Lexer',
        types: [ `${Util.PREFIXES.oo}Class` ],
        requireElement: '"Lexer"',
        parameters: [
          'http://example.org/n3#lineMode',
          'http://example.org/n3#n3',
          'http://example.org/n3#comments',
        ],
      });
      module = objectLoader.createCompactedResource({
        '@id': 'http://example.org/n3',
        requireName: '"n3"',
        components: [
          n3LexerComponentDefinitionUnmapped,
        ],
      });
    });

    describe('for an unnamed config', () => {
      let n3LexerComponentConfigUnnamed: Resource;
      let constructor: ComponentFactory;
      beforeEach(() => {
        n3LexerComponentConfigUnnamed = objectLoader.createCompactedResource({
          types: [ `${Util.PREFIXES.oo}Class` ],
          requireName: '"n3"',
          requireElement: '"Lexer"',
          arguments: {
            list: [
              {
                fields: [{ key: '"comments"', value: '"true"' }],
              },
            ],
          },
        });
        constructor = makeConstructor(module, n3LexerComponentDefinitionUnmapped, n3LexerComponentConfigUnnamed);
      });

      it('should use the unnamed component factory', () => {
        expect(constructor._getComponentFactory()).toBeInstanceOf(UnnamedComponentFactory);
      });

      it('should be valid', () => {
        expect(constructor).toBeTruthy();
      });

      it('should make a valid instance', async() => {
        const instance = await constructor.create({ moduleState });
        expect(instance).toBeTruthy();
        expect(instance).toBeInstanceOf(N3.Lexer);
      });
    });

    describe('for a named config', () => {
      let n3LexerComponentConfigNamed: Resource;
      let constructor: ComponentFactory;
      beforeEach(() => {
        n3LexerComponentConfigNamed = objectLoader.createCompactedResource({
          '@id': 'http://example.org/MyLexer',
          types: [ 'http://example.org/n3#Lexer' ],
          'http://example.org/n3#comments': '"true"',
        });
        constructor = makeConstructor(module, n3LexerComponentDefinitionUnmapped, n3LexerComponentConfigNamed);
      });

      it('should use the unmapped component factory', () => {
        expect(constructor._getComponentFactory()).toBeInstanceOf(UnmappedNamedComponentFactory);
      });

      it('should be valid', () => {
        expect(constructor).toBeTruthy();
      });

      it('should make a valid instance', async() => {
        const instance = await constructor.create({ moduleState });
        expect(instance).toBeTruthy();
        expect(instance).toBeInstanceOf(N3.Lexer);
      });
    });
  });

  describe('for a named N3 Lexer config and mapped definition', () => {
    let n3LexerComponentDefinitionMapped: Resource;
    let n3LexerComponentConfigNamed: Resource;
    let module: Resource;
    let constructor: ComponentFactory;
    beforeEach(() => {
      n3LexerComponentDefinitionMapped = objectLoader.createCompactedResource({
        types: [ `${Util.PREFIXES.oo}Class` ],
        requireElement: '"Lexer"',
        parameters: [
          'http://example.org/n3#lineMode',
          'http://example.org/n3#n3',
          'http://example.org/n3#comments',
        ],
        constructorArguments: {
          list: [
            {
              fields: [
                { key: '"lineMode"', value: 'http://example.org/n3#lineMode' },
                { key: '"n3"', value: 'http://example.org/n3#n3' },
                { key: '"comments"', value: 'http://example.org/n3#comments' },
              ],
            },
          ],
        },
      });
      n3LexerComponentConfigNamed = objectLoader.createCompactedResource({
        '@id': 'http://example.org/MyLexer',
        types: [ 'http://example.org/n3#Lexer' ],
        'http://example.org/n3#comments': '"true"',
      });
      module = objectLoader.createCompactedResource({
        '@id': 'http://example.org/n3',
        requireName: '"n3"',
        components: [
          n3LexerComponentDefinitionMapped,
        ],
      });
      constructor = makeConstructor(module, n3LexerComponentDefinitionMapped, n3LexerComponentConfigNamed);
    });

    it('should use the mapped component factory', () => {
      expect(constructor._getComponentFactory()).toBeInstanceOf(MappedNamedComponentFactory);
    });

    it('should be valid', () => {
      expect(constructor).toBeTruthy();
    });

    it('should make a valid instance', async() => {
      const instance = await constructor.create({ moduleState });
      expect(instance).toBeTruthy();
      expect(instance).toBeInstanceOf(N3.Lexer);
    });
  });
});
