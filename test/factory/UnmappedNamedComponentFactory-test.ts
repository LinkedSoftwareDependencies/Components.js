import { Resource } from '../../lib/rdf/Resource';
import { UnmappedNamedComponentFactory } from '../../lib/factory/UnmappedNamedComponentFactory';

const fs = require("fs");
const N3 = require('n3');

// Component definition for an N3 Parser
let n3ParserComponent = new Resource('http://example.org/n3#Parser', {
  requireElement: Resource.newString('Parser'),
  hasParameter: [
    new Resource('http://example.org/n3#format'),
    new Resource('http://example.org/n3#blankNodePrefix'),
    new Resource('http://example.org/n3#lexer'),
    new Resource('http://example.org/n3#explicitQuantifiers')
  ]
});

// Component definition for an N3 Lexer
let n3LexerComponent = new Resource('http://example.org/n3#Lexer', {
  requireElement: Resource.newString('Lexer'),
  hasParameter: [
    new Resource('http://example.org/n3#lineMode'),
    new Resource('http://example.org/n3#n3'),
    new Resource('http://example.org/n3#comments')
  ]
});

// Component definition for an N3 Util
let n3UtilComponent = new Resource('http://example.org/n3#Util', {
  requireElement: Resource.newString('Util')
});

// Component definition for an N3 Dummy
let n3DummyComponent = new Resource('http://example.org/n3#Dummy', {
  requireElement: Resource.newString('Dummy'),
  hasParameter: [
    new Resource('http://example.org/n3#dummyParam')
  ]
});

// Component definition for an N3 Dummy with default param values
let n3DummyComponentDefaults = new Resource('http://example.org/n3#Dummy', {
  requireElement: Resource.newString('Dummy'),
  hasParameter: [
    new Resource('http://example.org/n3#dummyParam1', {
      defaults: [
        Resource.newString('a'),
        Resource.newString('b')
      ]
    }),
    new Resource('http://example.org/n3#dummyParam2', {
      unique: true,
      defaults: [
        Resource.newString('a')
      ]
    })
  ]
});

// Component definition for an N3 Dummy with default scoped param values
let n3DummyComponentDefaultsScoped: any = new Resource('http://example.org/n3#Dummy', {
  requireElement: Resource.newString('Dummy'),
  hasParameter: [
    new Resource('http://example.org/n3#dummyParam1', {
      defaultScoped: [
        {
          scope: [],
          scopedValue: [
            Resource.newString('a'),
            Resource.newString('b')
          ]
        }
      ]
    }),
    new Resource('http://example.org/n3#dummyParam2', {
      unique: true,
      defaults: [
        Resource.newString('a')
      ]
    })
  ]
});
n3DummyComponentDefaultsScoped.hasParameter[0].defaultScoped[0].scope.push(n3DummyComponentDefaultsScoped);

// Component definition for an N3 Dummy with a lazy parameter
let n3DummyComponentLazy = new Resource('http://example.org/n3#DummyLazy', {
    requireElement: Resource.newString('Dummy'),
    hasParameter: [
        new Resource('http://example.org/n3#dummyParam', {
          lazy: Resource.newBoolean(true)
        }),
    ]
});


// Component definition for an N3 Dummy with fixed param values
let n3DummyComponentFixed = new Resource('http://example.org/n3#Dummy', {
  requireElement: Resource.newString('Dummy'),
  hasParameter: [
    new Resource('http://example.org/n3#dummyParam1', {
      fixed: [
        Resource.newString('a'),
        Resource.newString('b')
      ]
    }),
    new Resource('http://example.org/n3#dummyParam2', {
      unique: true,
      fixed: Resource.newString('a')
    })
  ]
});

// Module definition for N3
let n3Module = new Resource('http://example.org/n3', {
  requireName: Resource.newString('n3'),
  hasComponent: [
    n3ParserComponent,
    n3LexerComponent,
    n3UtilComponent,
    n3DummyComponent,
    n3DummyComponentDefaults,
    n3DummyComponentFixed,
    n3DummyComponentLazy
  ]
});

describe('UnmappedNamedComponentFactory', function () {

  describe('#makeUnnamedDefinitionConstructor', function () {
    it('should create a valid definition constructor', function () {
      let constructor = UnmappedNamedComponentFactory.makeUnnamedDefinitionConstructor(n3Module, n3LexerComponent);
      expect(constructor).toBeTruthy();
      expect(constructor).toBeInstanceOf(Function);
      expect(constructor({})).toBeInstanceOf(Resource);
    });

    it('should create a resource with undefined arguments when constructed with no arguments', function () {
      let instance: any = UnmappedNamedComponentFactory.makeUnnamedDefinitionConstructor(n3Module, n3LexerComponent)({});
      expect(instance).toBeInstanceOf(Resource);
      expect(instance).toHaveProperty('value', 'http://example.org/n3#Lexer');
      expect(instance).toHaveProperty('termType', 'NamedNode');
      expect(instance).toHaveProperty('requireName', Resource.newString('n3'));
      expect(instance).toHaveProperty('requireElement', Resource.newString('Lexer'));
      expect(instance).toHaveProperty('arguments');
      expect(instance.arguments.list).toEqual([
        new Resource('_:param_0', {
          fields: [
            { k: Resource.newString('http://example.org/n3#lineMode'), v: undefined },
            { k: Resource.newString('http://example.org/n3#n3'), v: undefined },
            { k: Resource.newString('http://example.org/n3#comments'), v: undefined }
          ]
        })
      ]);
    });

    it('should create a resource with defined arguments when constructed with arguments', function () {
      let instance: any = UnmappedNamedComponentFactory.makeUnnamedDefinitionConstructor(n3Module, n3LexerComponent)({
        'http://example.org/n3#lineMode': Resource.newBoolean(true),
        'http://example.org/n3#n3': Resource.newBoolean(true),
        'http://example.org/n3#comments': Resource.newBoolean(true)
      });
      expect(instance).toBeInstanceOf(Resource);
      expect(instance).toHaveProperty('value', 'http://example.org/n3#Lexer');
      expect(instance).toHaveProperty('termType', 'NamedNode');
      expect(instance).toHaveProperty('requireName', Resource.newString('n3'));
      expect(instance).toHaveProperty('requireElement', Resource.newString('Lexer'));
      expect(instance).toHaveProperty('arguments');
      expect(instance.arguments.list).toEqual([
        new Resource('_:param_0', {
          fields: [
            { k: Resource.newString('http://example.org/n3#lineMode'), v: Resource.newBoolean(true) },
            { k: Resource.newString('http://example.org/n3#n3'), v: Resource.newBoolean(true) },
            { k: Resource.newString('http://example.org/n3#comments'), v: Resource.newBoolean(true) }
          ]
        })
      ]);
    });
  });

  describe('for an N3 Lexer', function () {
    let constructor: UnmappedNamedComponentFactory;
    beforeEach(function () {
      constructor = new UnmappedNamedComponentFactory(n3Module, n3LexerComponent, {
        'http://example.org/n3#lineMode': Resource.newBoolean(true),
        'http://example.org/n3#n3': Resource.newBoolean(true),
        'http://example.org/n3#comments': Resource.newBoolean(true)
      }, true);
    });

    it('should be valid', function () {
      expect(constructor).toBeTruthy();
    });

    it('should create valid arguments', async() => {
      const args = await constructor.makeArguments();
      expect(args).toEqual([{
        'http://example.org/n3#lineMode': 'true',
        'http://example.org/n3#n3': 'true',
        'http://example.org/n3#comments': 'true'
      }]);
    });

    it('should make a valid instance', async() => {
      const instance = await constructor.create();
      expect(instance).toBeTruthy();
      expect(instance).toBeInstanceOf(N3.Lexer);
    });
  });

  describe('for an N3 Parser', function () {
    let constructor: UnmappedNamedComponentFactory;
    beforeEach(function () {
      constructor = new UnmappedNamedComponentFactory(n3Module, n3ParserComponent, {
        'http://example.org/n3#format': Resource.newString('application/trig'),
        'http://example.org/n3#lexer': UnmappedNamedComponentFactory.makeUnnamedDefinitionConstructor(n3Module, n3LexerComponent)({
          'http://example.org/n3#lineMode': Resource.newBoolean(true),
          'http://example.org/n3#n3': Resource.newBoolean(true),
          'http://example.org/n3#comments': Resource.newBoolean(true)
        }),
      }, true);
    });

    it('should be valid', function () {
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

  describe('for an N3 Util', function () {
    let constructor: UnmappedNamedComponentFactory;
    beforeEach(function () {
      constructor = new UnmappedNamedComponentFactory(n3Module, n3UtilComponent, {}, false);
    });

    it('should be valid', function () {
      expect(constructor).toBeTruthy();
    });

    it('should create valid arguments', async() => {
      const args = await constructor.makeArguments();
      expect(args).toEqual([{}]);
    });

    it('should make a valid instance', async() => {
      const instance = await constructor.create();
      expect(instance).toBeTruthy();
      expect(instance).toBeInstanceOf(Function); // Because N3Util is a function
    });
  });

  describe('for an N3 Dummy', function () {
    let constructor: UnmappedNamedComponentFactory;
    beforeEach(function () {
      constructor = new UnmappedNamedComponentFactory(n3Module, n3DummyComponent, {
        'http://example.org/n3#dummyParam': Resource.newBoolean(true)
      }, true);
    });

    it('should be valid', function () {
      expect(constructor).toBeTruthy();
    });

    it('should create valid arguments', async() => {
      const args = await constructor.makeArguments();
      expect(args).toEqual([{
        'http://example.org/n3#dummyParam': 'true',
      }]);
    });

    it('should fail to make a valid instance', function () {
      return expect(constructor.create()).rejects
        .toThrow(new Error('Failed to get module element Dummy from module n3'));
    });
  });

  describe('for an N3 Dummy with default values', function () {
    let constructor: UnmappedNamedComponentFactory;
    beforeEach(function () {
      constructor = new UnmappedNamedComponentFactory(n3Module, n3DummyComponentDefaults, {}, true);
    });

    it('should be valid', function () {
      expect(constructor).toBeTruthy();
    });

    it('should create valid arguments', async() => {
      const args = await constructor.makeArguments();
      expect(args).toEqual([{
        'http://example.org/n3#dummyParam1': [ 'a', 'b' ],
        'http://example.org/n3#dummyParam2': [ 'a' ],
      }]);
    });

    it('should fail to make a valid instance', function () {
      return expect(constructor.create()).rejects
        .toThrow(new Error('Failed to get module element Dummy from module n3'));
    });
  });

  describe('for an N3 Dummy with overridden default values', function () {
    let constructor: UnmappedNamedComponentFactory;
    beforeEach(function () {
      constructor = new UnmappedNamedComponentFactory(n3Module, n3DummyComponentDefaults, {
        'http://example.org/n3#dummyParam1': Resource.newBoolean(true),
        'http://example.org/n3#dummyParam2': Resource.newBoolean(false)
      }, true);
    });

    it('should be valid', function () {
      expect(constructor).toBeTruthy();
    });

    it('should create valid arguments', async() => {
      const args = await constructor.makeArguments();
      expect(args).toEqual([{
        'http://example.org/n3#dummyParam1': 'true',
        'http://example.org/n3#dummyParam2': 'false',
      }]);
    });

    it('should fail to make a valid instance', function () {
      return expect(constructor.create()).rejects
        .toThrow(new Error('Failed to get module element Dummy from module n3'));
    });
  });

  describe('for an N3 Dummy with default scoped values', function () {
    let constructor: UnmappedNamedComponentFactory;
    beforeEach(function () {
      constructor = new UnmappedNamedComponentFactory(n3Module, n3DummyComponentDefaultsScoped, {}, true);
    });

    it('should be valid', function () {
      expect(constructor).toBeTruthy();
    });

    it('should create valid arguments', async() => {
      const args = await constructor.makeArguments();
      expect(args).toEqual([{
        'http://example.org/n3#dummyParam1': [ 'a', 'b' ],
        'http://example.org/n3#dummyParam2': [ 'a' ],
      }]);
    });

    it('should fail to make a valid instance', function () {
      return expect(constructor.create()).rejects
        .toThrow(new Error('Failed to get module element Dummy from module n3'));
    });
  });

  describe('for an N3 Dummy with overridden default scoped values', function () {
    let constructor: UnmappedNamedComponentFactory;
    beforeEach(function () {
      constructor = new UnmappedNamedComponentFactory(n3Module, n3DummyComponentDefaultsScoped, {
        'http://example.org/n3#dummyParam1': Resource.newBoolean(true),
        'http://example.org/n3#dummyParam2': Resource.newBoolean(false)
      }, true);
    });

    it('should be valid', function () {
      expect(constructor).toBeTruthy();
    });

    it('should create valid arguments', async() => {
      const args = await constructor.makeArguments();
      expect(args).toEqual([{
        'http://example.org/n3#dummyParam1': 'true',
        'http://example.org/n3#dummyParam2': 'false',
      }]);
    });

    it('should fail to make a valid instance', function () {
      return expect(constructor.create()).rejects
        .toThrow(new Error('Failed to get module element Dummy from module n3'));
    });
  });

  describe('for an N3 Dummy with fixed values', function () {
    let constructor: UnmappedNamedComponentFactory;
    beforeEach(function () {
      constructor = new UnmappedNamedComponentFactory(n3Module, n3DummyComponentFixed, {}, true);
    });

    it('should be valid', function () {
      expect(constructor).toBeTruthy();
    });

    it('should create valid arguments', async() => {
      const args = await constructor.makeArguments();
      expect(args).toEqual([{
        'http://example.org/n3#dummyParam1': [ 'a', 'b' ],
        'http://example.org/n3#dummyParam2': 'a',
      }]);
    });

    it('should fail to make a valid instance', function () {
      return expect(constructor.create()).rejects
        .toThrow(new Error('Failed to get module element Dummy from module n3'));
    });
  });

  describe('for an N3 Dummy with fixed and additional values', function () {
    let constructor: UnmappedNamedComponentFactory;
    beforeEach(function () {
      constructor = new UnmappedNamedComponentFactory(n3Module, n3DummyComponentFixed, {
        'http://example.org/n3#dummyParam1': [ Resource.newBoolean(true) ]
      }, true);
    });

    it('should be valid', function () {
      expect(constructor).toBeTruthy();
    });

    it('should create valid arguments', async() => {
      const args = await constructor.makeArguments();
      expect(args).toEqual([{
        'http://example.org/n3#dummyParam1': [ 'true', 'a', 'b' ],
        'http://example.org/n3#dummyParam2': 'a',
      }]);
    });

    it('should fail to make a valid instance', function () {
      return expect(constructor.create()).rejects
        .toThrow(new Error('Failed to get module element Dummy from module n3'));
    });
  });

  describe('for an N3 Dummy with a lazy parameter', function () {
    let constructor: UnmappedNamedComponentFactory;
    beforeEach(function () {
      constructor = new UnmappedNamedComponentFactory(n3Module, n3DummyComponentLazy, {
        'http://example.org/n3#dummyParam': Resource.newBoolean(true)
      }, true);
    });

    it('should be valid', function () {
      expect(constructor).toBeTruthy();
    });

    it('should create valid arguments', async() => {
      const args = await constructor.makeArguments();
      expect(await args[0]['http://example.org/n3#dummyParam']()).toEqual('true');
    });
  });

  describe('for an N3 Dummy with fixed and additional values, adding to a fixed, unique value', function () {

    it('should throw an error', function () {
      expect(async() => {
        await new UnmappedNamedComponentFactory(n3Module, n3DummyComponentFixed, {
          'http://example.org/n3#dummyParam1': [ Resource.newBoolean(true) ],
          'http://example.org/n3#dummyParam2': [ Resource.newBoolean(true) ]
        }, true)
      }).rejects.toThrow(Error);
    });
  });

});
