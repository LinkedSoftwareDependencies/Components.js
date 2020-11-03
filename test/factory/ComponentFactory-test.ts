import { Resource } from 'rdf-object';
import { ComponentFactory } from '../../lib/factory/ComponentFactory';
import { UnnamedComponentFactory } from '../../lib/factory/UnnamedComponentFactory';
import { MappedNamedComponentFactory } from '../../lib/factory/MappedNamedComponentFactory';
import { UnmappedNamedComponentFactory } from '../../lib/factory/UnmappedNamedComponentFactory';
import Util = require('../../lib/Util');
import { Loader } from '../../lib/Loader';
import { RdfObjectLoader } from 'rdf-object/index';

// TODO: improve these imports
const N3 = require('n3');

describe('ComponentFactory', function () {
  let loader: Loader;
  let objectLoader: RdfObjectLoader;
  beforeEach(() => {
    loader = new Loader();
    // Create resources via object loader, so we can use CURIEs
    objectLoader = loader.objectLoader;
  });

  describe('for an unmapped N3 Lexer definition', function () {
    let n3LexerComponentDefinitionUnmapped: Resource;
    let module: Resource;
    beforeEach(function () {
      n3LexerComponentDefinitionUnmapped = objectLoader.createCompactedResource({
        '@id': 'http://example.org/n3#Lexer',
        types: [ Util.PREFIXES['oo'] + 'Class' ],
        requireElement: '"Lexer"',
        parameters: [
          'http://example.org/n3#lineMode',
          'http://example.org/n3#n3',
          'http://example.org/n3#comments'
        ]
      });
      module = objectLoader.createCompactedResource({
        '@id': 'http://example.org/n3',
        requireName: '"n3"',
        components: [
          n3LexerComponentDefinitionUnmapped,
        ]
      });
    });

    describe('for an unnamed config', function () {
      let n3LexerComponentConfigUnnamed: Resource;
      let constructor: ComponentFactory;
      beforeEach(function () {
        n3LexerComponentConfigUnnamed = objectLoader.createCompactedResource({
          types: [ Util.PREFIXES['oo'] + 'Class' ],
          requireName: '"n3"',
          requireElement: '"Lexer"',
          arguments: {
            list: [
              {
                fields: [ { key: '"comments"', value: '"true"' } ]
              }
            ]
          }
        });
        constructor = new ComponentFactory(module, n3LexerComponentDefinitionUnmapped, n3LexerComponentConfigUnnamed, {}, loader);
      });

      it('should use the unnamed component factory', function () {
        expect(constructor._getComponentFactory()).toBeInstanceOf(UnnamedComponentFactory);
      });

      it('should be valid', function () {
        expect(constructor).toBeTruthy();
      });

      it('should make a valid instance', async() => {
        const instance = await constructor.create();
        expect(instance).toBeTruthy();
        expect(instance).toBeInstanceOf(N3.Lexer);
      });
    });

    describe('for a named config', function () {
      let n3LexerComponentConfigNamed: Resource;
      let constructor: ComponentFactory;
      beforeEach(function () {
        n3LexerComponentConfigNamed = objectLoader.createCompactedResource({
          '@id': 'http://example.org/MyLexer',
          types: [ 'http://example.org/n3#Lexer' ],
          'http://example.org/n3#comments': '"true"',
        });
        constructor = new ComponentFactory(module, n3LexerComponentDefinitionUnmapped, n3LexerComponentConfigNamed, {}, loader);
      });

      it('should use the unmapped component factory', function () {
        expect(constructor._getComponentFactory()).toBeInstanceOf(UnmappedNamedComponentFactory);
      });

      it('should be valid', function () {
        expect(constructor).toBeTruthy();
      });

      it('should make a valid instance', async() => {
        const instance = await constructor.create();
        expect(instance).toBeTruthy();
        expect(instance).toBeInstanceOf(N3.Lexer);
      });
    });
  });

  describe('for a named N3 Lexer config and mapped definition', function () {
    let n3LexerComponentDefinitionMapped: Resource;
    let n3LexerComponentConfigNamed: Resource;
    let module: Resource;
    let constructor: ComponentFactory;
    beforeEach(function () {
      n3LexerComponentDefinitionMapped = objectLoader.createCompactedResource({
        types: [ Util.PREFIXES['oo'] + 'Class' ],
        requireElement: '"Lexer"',
        parameters: [
          'http://example.org/n3#lineMode',
          'http://example.org/n3#n3',
          'http://example.org/n3#comments'
        ],
        constructorArguments: {
          list: [
            {
              fields: [
                { key: '"lineMode"', value: 'http://example.org/n3#lineMode' },
                { key: '"n3"', value: 'http://example.org/n3#n3' },
                { key: '"comments"', value: 'http://example.org/n3#comments' }
              ]
            }
          ]
        }
      });
      n3LexerComponentConfigNamed = objectLoader.createCompactedResource({
        '@id': 'http://example.org/MyLexer',
        types: ['http://example.org/n3#Lexer'],
        'http://example.org/n3#comments': '"true"',
      });
      module = objectLoader.createCompactedResource({
        '@id': 'http://example.org/n3',
        requireName: '"n3"',
        components: [
          n3LexerComponentDefinitionMapped,
        ]
      });
      constructor = new ComponentFactory(module, n3LexerComponentDefinitionMapped, n3LexerComponentConfigNamed, {}, loader);
    });

    it('should use the mapped component factory', function () {
      expect(constructor._getComponentFactory()).toBeInstanceOf(MappedNamedComponentFactory);
    });

    it('should be valid', function () {
      expect(constructor).toBeTruthy();
    });

    it('should make a valid instance', async() => {
      const instance = await constructor.create();
      expect(instance).toBeTruthy();
      expect(instance).toBeInstanceOf(N3.Lexer);
    });
  });
});
