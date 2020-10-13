import { Resource } from '../../lib/rdf/Resource';
import { ComponentFactory } from '../../lib/factory/ComponentFactory';
import { UnnamedComponentFactory } from '../../lib/factory/UnnamedComponentFactory';
import { MappedNamedComponentFactory } from '../../lib/factory/MappedNamedComponentFactory';
import { UnmappedNamedComponentFactory } from '../../lib/factory/UnmappedNamedComponentFactory';
import Util = require('../../lib/Util');

// TODO: improve these imports
const N3 = require('n3');
const _ = require('lodash');

// Unnamed component config for an N3 Lexer
let n3LexerComponentConfigUnnamed = new Resource('http://example.org/MyLexer', {
  types: [ new Resource(Util.PREFIXES['oo'] + 'Class') ],
  requireName: Resource.newString('n3'),
  requireElement: Resource.newString('Lexer'),
  arguments: new Resource(null, {
    list: [
      new Resource("_:param_lexer_0", {
        fields: [ { k: new Resource('"comments"'), v: new Resource('"true"') } ]
      })
    ]
  })
});

// Named component config for an N3 Lexer
let n3LexerComponentConfigNamed = _.assign(new Resource('http://example.org/MyLexer', {
  types: [ new Resource('http://example.org/n3#Lexer') ],
}), { 'http://example.org/n3#comments': Resource.newBoolean(true) });

// Named component definition for an N3 Lexer
let n3LexerComponentDefinitionUnmapped = new Resource('http://example.org/n3#Lexer', {
  types: [ new Resource(Util.PREFIXES['oo'] + 'Class') ],
  requireElement: Resource.newString('Lexer'),
  hasParameter: [
    new Resource('http://example.org/n3#lineMode'),
    new Resource('http://example.org/n3#n3'),
    new Resource('http://example.org/n3#comments')
  ]
});

// Mapped component definition for an N3 Lexer
let n3LexerComponentDefinitionMapped = new Resource('http://example.org/n3#Lexer', {
  types: [ new Resource(Util.PREFIXES['oo'] + 'Class') ],
  requireElement: Resource.newString('Lexer'),
  hasParameter: [
    new Resource('http://example.org/n3#lineMode'),
    new Resource('http://example.org/n3#n3'),
    new Resource('http://example.org/n3#comments')
  ],
  constructorArguments: new Resource(null, {
    list: [
      new Resource("_:param_parser_0", {
        fields: [
          { k: new Resource('"lineMode"'), v: new Resource('http://example.org/n3#lineMode') },
          { k: new Resource('"n3"'), v: new Resource('http://example.org/n3#n3') },
          { k: new Resource('"comments"'), v: new Resource('http://example.org/n3#comments') }
        ]
      })
    ]
  })
});

// Module definition for N3
let n3ModuleDefinition = new Resource('http://example.org/n3', {
  requireName: Resource.newString('n3'),
  hasComponent: [
    n3LexerComponentDefinitionMapped,
  ]
});

describe('ComponentFactory', function () {

  describe('for an unnamed N3 Lexer config', function () {
    let constructor: ComponentFactory;
    beforeEach(function () {
      constructor = new ComponentFactory(n3ModuleDefinition, n3LexerComponentDefinitionUnmapped, n3LexerComponentConfigUnnamed);
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

  describe('for a named N3 Lexer config and unmapped definition', function () {
    let constructor: ComponentFactory;
    beforeEach(function () {
      constructor = new ComponentFactory(n3ModuleDefinition, n3LexerComponentDefinitionUnmapped, n3LexerComponentConfigNamed);
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

  describe('for a named N3 Lexer config and mapped definition', function () {
    let constructor: ComponentFactory;
    beforeEach(function () {
      constructor = new ComponentFactory(n3ModuleDefinition, n3LexerComponentDefinitionMapped, n3LexerComponentConfigNamed);
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
