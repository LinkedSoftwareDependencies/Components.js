require('should');
var expect = require('chai').expect;
const Constants = require("../../lib/Constants");
const Resource = require("../../lib/rdf/Resource").Resource;
const fs = require("fs");
const N3 = require('n3');
const MappedNamedComponentFactory = require("../../lib/factory/MappedNamedComponentFactory").MappedNamedComponentFactory;
const Hello = require("../helloworld").Hello;

// Component definition for an N3 Parser
let n3ParserComponent = new Resource('http://example.org/n3#Parser', {
  requireElement: Resource.newString('Parser'),
  types: [ new Resource(Constants.PREFIXES['lsdc'] + 'ComponentConstructable') ],
  hasParameter: [
    new Resource('http://example.org/n3#format'),
    new Resource('http://example.org/n3#blankNodePrefix'),
    new Resource('http://example.org/n3#lexer'),
    new Resource('http://example.org/n3#explicitQuantifiers')
  ],
  constructorMapping: new Resource(null, {
    list: [
      new Resource("_:param_parser_0", {
        fields: [
          { k: new Resource('"format"'), v: new Resource('http://example.org/n3#format') },
          { k: new Resource('"blankNodePrefix"'), v: new Resource('http://example.org/n3#blankNodePrefix') },
          { k: new Resource('"lexer"'), v: new Resource('http://example.org/n3#lexer') },
          { k: new Resource('"explicitQuantifiers"'), v: new Resource('http://example.org/n3#explicitQuantifiers') }
        ]
      })
    ]
  })
});

// Component definition for an N3 Lexer
let n3LexerComponent = new Resource('http://example.org/n3#Lexer', {
  requireElement: Resource.newString('Lexer'),
  types: [ new Resource(Constants.PREFIXES['lsdc'] + 'ComponentConstructable') ],
  hasParameter: [
    new Resource('http://example.org/n3#lineMode'),
    new Resource('http://example.org/n3#n3'),
    new Resource('http://example.org/n3#comments')
  ],
  constructorMapping: new Resource(null, {
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

// Component definition for an N3 Util
let n3UtilComponent = new Resource('http://example.org/n3#Util', {
  requireElement: Resource.newString('Util'),
  types: [ new Resource(Constants.PREFIXES['lsdc'] + 'ComponentInstance') ],
});

// Component definition for an N3 Dummy
let n3DummyComponent = new Resource('http://example.org/n3#Dummy', {
  requireElement: Resource.newString('Dummy'),
  types: [ new Resource(Constants.PREFIXES['lsdc'] + 'ComponentConstructable') ],
  hasParameter: [
    new Resource('http://example.org/n3#dummyParam')
  ],
  constructorMapping: new Resource(null, {
    list: [
      new Resource("_:param_parser_0", {
        fields: [
          { k: new Resource('"dummyParam"'), v: new Resource('http://example.org/n3#dummyParam') }
        ]
      })
    ]
  })
});

// Module definition for N3
let n3Module = new Resource('http://example.org/n3', {
  requireName: Resource.newString('n3'),
  hasComponent: [
    n3ParserComponent,
    n3LexerComponent,
    n3UtilComponent,
    n3DummyComponent
  ]
});

// Component definition for Hello World
let helloWorldComponent1 = new Resource('http://example.org/HelloWorldModule#SayHelloComponent1', {
  requireElement: Resource.newString('Hello'),
  types: [ new Resource(Constants.PREFIXES['lsdc'] + 'ComponentConstructable') ],
  hasParameter: [
    new Resource('http://example.org/HelloWorldModule#dummyParam')
  ],
  constructorMapping: new Resource(null, {
    list: [
      new Resource("_:param_parser_0", {
        fields: [
          { k: new Resource('"dummyParam"'), v: new Resource('http://example.org/HelloWorldModule#dummyParam') }
        ]
      })
    ]
  })
});

// Component definition for Hello World
let helloWorldComponent2 = new Resource('http://example.org/HelloWorldModule#SayHelloComponent2', {
  requireElement: Resource.newString('Hello'),
  types: [ new Resource(Constants.PREFIXES['lsdc'] + 'ComponentConstructable') ],
  hasParameter: [
    new Resource('http://example.org/HelloWorldModule#dummyParam'),
    new Resource('http://example.org/HelloWorldModule#instanceParam')
  ],
  constructorMapping: new Resource(null, {
    list: [
      new Resource("_:param_hello_0", {
        fields: [
          { k: new Resource('"dummyParam"'), v: new Resource('http://example.org/HelloWorldModule#dummyParam') },
          { k: new Resource('"instanceParam"'), v: new Resource('http://example.org/HelloWorldModule#instanceParam') }
        ]
      })
    ]
  })
});

// Component definition for Hello World
let helloWorldComponent3 = new Resource('http://example.org/HelloWorldModule#SayHelloComponent3', {
  requireElement: Resource.newString('Hello'),
  types: [ new Resource(Constants.PREFIXES['lsdc'] + 'ComponentConstructable') ],
  hasParameter: [
    new Resource('http://example.org/HelloWorldModule#dummyParam'),
    new Resource('http://example.org/HelloWorldModule#instanceParam'),
    new Resource('http://example.org/HelloWorldModule#idParam')
  ],
  constructorMapping: new Resource(null, {
    list: [
      new Resource("_:param_hello_0", {
        fields: [
          { k: new Resource('"dummyParam"'), v: new Resource('http://example.org/HelloWorldModule#dummyParam') },
          { k: new Resource('"instanceParam"'), v: new Resource('http://example.org/HelloWorldModule#instanceParam') },
          { k: new Resource('"idParam"'), v: new Resource(Constants.PREFIXES['rdf'] + 'subject') }
        ]
      })
    ]
  })
});

// Component definition for Hello World with array parameters
let helloWorldComponent4 = new Resource('http://example.org/HelloWorldModule#SayHelloComponent3', {
  requireElement: Resource.newString('Hello'),
  types: [ new Resource(Constants.PREFIXES['lsdc'] + 'ComponentConstructable') ],
  hasParameter: [
    new Resource('http://example.org/HelloWorldModule#dummyParam'),
    new Resource('http://example.org/HelloWorldModule#instanceParam'),
    new Resource('http://example.org/HelloWorldModule#idParam')
  ],
  constructorMapping: new Resource(null, {
    list: [
      new Resource("_:param_hello_0", {
        elements: [
          { v: new Resource('http://example.org/HelloWorldModule#dummyParam') },
          { v: new Resource('http://example.org/HelloWorldModule#instanceParam') }
        ]
      })
    ]
  })
});

// Component definition for Hello World with default values
let defaultedParam1 = new Resource('http://example.org/n3#dummyParam1', {
  defaults: [
    Resource.newString('a'),
    Resource.newString('b')
  ]
});
let defaultedParam2 = new Resource('http://example.org/n3#dummyParam2', {
  unique: true,
  defaults: [
    Resource.newString('a')
  ]
});
let helloWorldComponent5 = new Resource('http://example.org/HelloWorldModule#SayHelloComponent1', {
  requireElement: Resource.newString('Hello'),
  types: [ new Resource(Constants.PREFIXES['lsdc'] + 'ComponentConstructable') ],
  hasParameter: [ defaultedParam1, defaultedParam2, ],
  constructorMapping: new Resource(null, {
    list: [
      new Resource("_:param_parser_0", {
        fields: [
          { k: new Resource('"dummyParam1"'), v: defaultedParam1 },
          { k: new Resource('"dummyParam2"'), v: defaultedParam2 }
        ]
      })
    ]
  })
});

// Module definition for Hello World
let helloWorldModule = new Resource('http://example.org/HelloWorldModule', {
  requireName: Resource.newString('../../test/helloworld'),
  hasComponent: [
    helloWorldComponent1,
    helloWorldComponent2,
    helloWorldComponent3,
    helloWorldComponent4,
    helloWorldComponent5
  ]
});

describe('MappedNamedComponentFactory', function () {

  describe('#makeUnnamedDefinitionConstructor', function () {
    it('should create a valid definition constructor', function () {
      let constructor = MappedNamedComponentFactory.makeUnnamedDefinitionConstructor(n3Module, n3LexerComponent);
      constructor.should.not.be.null();
      constructor.should.be.instanceof(Function);
      constructor({}).should.be.instanceof(Resource);
    });

    it('should create a resource with undefined arguments when constructed with no arguments', function () {
      let instance = MappedNamedComponentFactory.makeUnnamedDefinitionConstructor(n3Module, n3LexerComponent)({});
      instance.should.be.instanceof(Resource);
      instance.should.have.property('value', 'http://example.org/n3#Lexer');
      instance.should.have.property('termType', 'NamedNode');
      instance.should.have.property('requireName', Resource.newString('n3'));
      instance.should.have.property('requireElement', Resource.newString('Lexer'));
      instance.should.have.property('arguments');
      instance.arguments.list.should.deepEqual([
        new Resource(null, {
          fields: [
            { k: Resource.newString('lineMode'), v: undefined },
            { k: Resource.newString('n3'), v: undefined },
            { k: Resource.newString('comments'), v: undefined }
          ]
        })
      ]);
    });

    it('should create a resource with defined arguments when constructed with arguments', function () {
      let instance = MappedNamedComponentFactory.makeUnnamedDefinitionConstructor(n3Module, n3LexerComponent)({
        'http://example.org/n3#lineMode': Resource.newBoolean(true),
        'http://example.org/n3#n3': Resource.newBoolean(true),
        'http://example.org/n3#comments': Resource.newBoolean(true)
      });
      instance.should.be.instanceof(Resource);
      instance.should.have.property('value', 'http://example.org/n3#Lexer');
      instance.should.have.property('termType', 'NamedNode');
      instance.should.have.property('requireName', Resource.newString('n3'));
      instance.should.have.property('requireElement', Resource.newString('Lexer'));
      instance.should.have.property('arguments');
      instance.arguments.list.should.deepEqual([
        new Resource(null, {
          fields: [
            { k: Resource.newString('lineMode'), v: Resource.newBoolean(true) },
            { k: Resource.newString('n3'), v: Resource.newBoolean(true) },
            { k: Resource.newString('comments'), v: Resource.newBoolean(true) }
          ]
        })
      ]);
    });
  });

  describe('for an N3 Lexer', function () {
    let constructor;
    beforeEach(function () {
      constructor = new MappedNamedComponentFactory(n3Module, n3LexerComponent, {
        'http://example.org/n3#lineMode': Resource.newBoolean(true),
        'http://example.org/n3#n3': Resource.newBoolean(true),
        'http://example.org/n3#comments': Resource.newBoolean(true)
      }, true);
    });

    it('should be valid', function () {
      constructor.should.not.be.null();
    });

    it('should create valid arguments', function () {
      constructor._makeArguments().should.deepEqual([ { comments: 'true', lineMode: 'true', n3: 'true' } ]);
    });

    it('should make a valid instance', function () {
      let instance = constructor.create();
      instance.should.not.be.null();
      instance.should.be.instanceof(N3.Lexer);
    });
  });

  describe('for an N3 Parser', function () {
    let constructor;
    beforeEach(function () {
      constructor = new MappedNamedComponentFactory(n3Module, n3ParserComponent, {
        'http://example.org/n3#format': Resource.newString('application/trig'),
        'http://example.org/n3#lexer': MappedNamedComponentFactory.makeUnnamedDefinitionConstructor(n3Module, n3LexerComponent)({
          'http://example.org/n3#lineMode': Resource.newBoolean(true),
          'http://example.org/n3#n3': Resource.newBoolean(true),
          'http://example.org/n3#comments': Resource.newBoolean(true)
        }),
      }, true);
    });

    it('should be valid', function () {
      constructor.should.not.be.null();
    });

    it('should create valid arguments', function () {
      let args = constructor._makeArguments();
      args.length.should.equal(1);
      args[0].format.should.equal('application/trig');
      args[0].lexer.should.not.be.null();
      args[0].lexer.should.be.instanceof(N3.Lexer);
    });

    it('should make a valid instance', function () {
      let instance = constructor.create();
      instance.should.not.be.null();
      instance.should.be.instanceof(N3.Parser);
    });
  });

  describe('for an N3 Util', function () {
    let constructor;
    beforeEach(function () {
      constructor = new MappedNamedComponentFactory(n3Module, n3UtilComponent, {}, false);
    });

    it('should be valid', function () {
      constructor.should.not.be.null();
    });

    it('should create valid arguments', function () {
      constructor._makeArguments().should.deepEqual([]);
    });

    it('should make a valid instance', function () {
      let instance = constructor.create();
      instance.should.not.be.null();
      instance.should.be.instanceof(Function); // Because N3Util is a function
    });
  });

  describe('for an N3 Dummy', function () {
    let constructor;
    beforeEach(function () {
      constructor = new MappedNamedComponentFactory(n3Module, n3DummyComponent, {
        'http://example.org/n3#dummyParam': Resource.newBoolean(true)
      }, true);
    });

    it('should be valid', function () {
      constructor.should.not.be.null();
    });

    it('should create valid arguments', function () {
      constructor._makeArguments().should.deepEqual([{
        'dummyParam': 'true',
      }]);
    });

    it('should fail to make a valid instance', function () {
      expect(constructor.create).to.throw(Error);
    });
  });

  describe('for a hello world component', function () {
    let constructor;
    beforeEach(function () {
      constructor = new MappedNamedComponentFactory(helloWorldModule, helloWorldComponent2, {
        'http://example.org/HelloWorldModule#dummyParam': Resource.newBoolean(true),
        'http://example.org/HelloWorldModule#instanceParam': MappedNamedComponentFactory
          .makeUnnamedDefinitionConstructor(helloWorldModule, helloWorldComponent1)({})
      }, true);
    });

    it('should be valid', function () {
      constructor.should.not.be.null();
    });

    it('should create valid arguments', function () {
      constructor._makeArguments().should.deepEqual([{
        'dummyParam': 'true',
        'instanceParam': new Hello()
      }]);
    });

    it('should fail to make a valid instance', function () {
      expect(constructor.create).to.throw(Error);
    });
  });

  describe('for a hello world component with id param', function () {
    let constructor;
    beforeEach(function () {
      constructor = new MappedNamedComponentFactory(helloWorldModule, helloWorldComponent3, {
        value: 'http://example.org/myHelloComponent'
      }, true);
    });

    it('should be valid', function () {
      constructor.should.not.be.null();
    });

    it('should create valid arguments', function () {
      constructor._makeArguments().should.deepEqual([{
        'idParam': 'http://example.org/myHelloComponent'
      }]);
    });

    it('should fail to make a valid instance', function () {
      expect(constructor.create).to.throw(Error);
    });
  });

  describe('for a hello world component with array params', function () {
    let constructor;
    beforeEach(function () {
      constructor = new MappedNamedComponentFactory(helloWorldModule, helloWorldComponent4, {
        'http://example.org/HelloWorldModule#dummyParam': Resource.newBoolean(true),
        'http://example.org/HelloWorldModule#instanceParam': Resource.newBoolean(false),
      }, true);
    });

    it('should be valid', function () {
      constructor.should.not.be.null();
    });

    it('should create valid arguments', function () {
      constructor._makeArguments().should.deepEqual([[
        'true', 'false'
      ]]);
    });

    it('should fail to make a valid instance', function () {
      expect(constructor.create).to.throw(Error);
    });
  });

  describe('for a hello world component with default values', function () {
    let constructor;
    beforeEach(function () {
      constructor = new MappedNamedComponentFactory(helloWorldModule, helloWorldComponent5, {}, true);
    });

    it('should be valid', function () {
      constructor.should.not.be.null();
    });

    it('should create valid arguments', function () {
      constructor._makeArguments().should.deepEqual([{
        'dummyParam1': [ 'a', 'b' ],
        'dummyParam2': [ 'a' ],
      }]);
    });

    it('should fail to make a valid instance', function () {
      expect(constructor.create).to.throw(Error);
    });
  });

  describe('for a hello world component with overridden default values', function () {
    let constructor;
    beforeEach(function () {
      constructor = new MappedNamedComponentFactory(helloWorldModule, helloWorldComponent5, {
        'http://example.org/n3#dummyParam1': Resource.newBoolean(true),
        'http://example.org/n3#dummyParam2': Resource.newBoolean(false)
      }, true);
    });

    it('should be valid', function () {
      constructor.should.not.be.null();
    });

    it('should create valid arguments', function () {
      constructor._makeArguments().should.deepEqual([{
        'dummyParam1': 'true',
        'dummyParam2': 'false',
      }]);
    });

    it('should fail to make a valid instance', function () {
      expect(constructor.create).to.throw(Error);
    });
  });

});
