require('should');
var expect = require('chai').expect;
const Constants = require("../../lib/Util");
const Resource = require("../../lib/rdf/Resource").Resource;
const fs = require("fs");
const N3 = require('n3');
const MappedNamedComponentFactory = require("../../lib/factory/MappedNamedComponentFactory").MappedNamedComponentFactory;
const Hello = require("../helloworld").Hello;

// Component definition for an N3 Parser
let n3ParserComponent = new Resource('http://example.org/n3#Parser', {
  requireElement: Resource.newString('Parser'),
  types: [ new Resource(Constants.PREFIXES['oo'] + 'Class') ],
  hasParameter: [
    new Resource('http://example.org/n3#format'),
    new Resource('http://example.org/n3#blankNodePrefix'),
    new Resource('http://example.org/n3#lexer'),
    new Resource('http://example.org/n3#explicitQuantifiers')
  ],
  constructorArguments: new Resource(null, {
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
  types: [ new Resource(Constants.PREFIXES['oo'] + 'Class') ],
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

// Component definition for an N3 Util
let n3UtilComponent = new Resource('http://example.org/n3#Util', {
  requireElement: Resource.newString('Util'),
  types: [ new Resource(Constants.PREFIXES['oo'] + 'ComponentInstance') ],
});

// Component definition for an N3 Dummy
let n3DummyComponent = new Resource('http://example.org/n3#Dummy', {
  requireElement: Resource.newString('Dummy'),
  types: [ new Resource(Constants.PREFIXES['oo'] + 'Class') ],
  hasParameter: [
    new Resource('http://example.org/n3#dummyParam')
  ],
  constructorArguments: new Resource(null, {
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
  types: [ new Resource(Constants.PREFIXES['oo'] + 'Class') ],
  hasParameter: [
    new Resource('http://example.org/HelloWorldModule#dummyParam')
  ],
  constructorArguments: new Resource(null, {
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
  types: [ new Resource(Constants.PREFIXES['oo'] + 'Class') ],
  hasParameter: [
    new Resource('http://example.org/HelloWorldModule#dummyParam'),
    new Resource('http://example.org/HelloWorldModule#instanceParam')
  ],
  constructorArguments: new Resource(null, {
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
  types: [ new Resource(Constants.PREFIXES['oo'] + 'Class') ],
  hasParameter: [
    new Resource('http://example.org/HelloWorldModule#dummyParam'),
    new Resource('http://example.org/HelloWorldModule#instanceParam'),
    new Resource('http://example.org/HelloWorldModule#idParam')
  ],
  constructorArguments: new Resource(null, {
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
  types: [ new Resource(Constants.PREFIXES['oo'] + 'Class') ],
  hasParameter: [
    new Resource('http://example.org/HelloWorldModule#dummyParam'),
    new Resource('http://example.org/HelloWorldModule#instanceParam'),
    new Resource('http://example.org/HelloWorldModule#idParam')
  ],
  constructorArguments: new Resource(null, {
    list: [
      new Resource("_:param_hello_0", {
        elements: {
          list: [
            new Resource('http://example.org/HelloWorldModule#dummyParam'),
            new Resource('http://example.org/HelloWorldModule#instanceParam')
          ]
        }
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
let helloWorldComponent5 = new Resource('http://example.org/HelloWorldModule#SayHelloComponent4', {
  requireElement: Resource.newString('Hello'),
  types: [ new Resource(Constants.PREFIXES['oo'] + 'Class') ],
  hasParameter: [ defaultedParam1, defaultedParam2, ],
  constructorArguments: new Resource(null, {
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

// Component definition for Hello World with default scoped values
let defaultScopedParam1 = new Resource('http://example.org/n3#dummyParam1', {
  defaultScoped: [
    {
      scope: [],
      scopedValue: [
        Resource.newString('a'),
        Resource.newString('b')
      ]
    }
  ]
});
let defaultScopedParam2 = new Resource('http://example.org/n3#dummyParam2', {
  unique: true,
  defaultScoped: [
    {
      scope: [],
      scopedValue: [
        Resource.newString('a')
      ]
    }
  ]
});
let helloWorldComponent6 = new Resource('http://example.org/HelloWorldModule#SayHelloComponent5', {
  requireElement: Resource.newString('Hello'),
  types: [ new Resource(Constants.PREFIXES['oo'] + 'Class') ],
  hasParameter: [ defaultScopedParam1, defaultScopedParam2, ],
  constructorArguments: new Resource(null, {
    list: [
      new Resource("_:param_parser_0", {
        fields: [
          { k: new Resource('"dummyParam1"'), v: defaultScopedParam1 },
          { k: new Resource('"dummyParam2"'), v: defaultScopedParam2 }
        ]
      })
    ]
  })
});
helloWorldComponent6.hasParameter.forEach((param) => param.defaultScoped[0].scope.push(helloWorldComponent6));

// Component definition for Hello World with array parameters
let helloWorldComponent7 = new Resource('http://example.org/HelloWorldModule#SayHelloComponent6', {
    requireElement: Resource.newString('Hello'),
    types: [ new Resource(Constants.PREFIXES['oo'] + 'Class') ],
    hasParameter: [
        new Resource('http://example.org/HelloWorldModule#requiredParam', { required: true })
    ],
    constructorArguments: new Resource(null, {
        list: [
            new Resource("_:param_hello_0", {
                elements: {
                    list: [
                        new Resource('http://example.org/HelloWorldModule#requiredParam')
                    ]
                }
            })
        ]
    })
});

// Component definition for Hello World with lazy parameters
let helloWorldComponent8 = new Resource('http://example.org/HelloWorldModule#SayHelloComponent8', {
    requireElement: Resource.newString('Hello'),
    types: [ new Resource(Constants.PREFIXES['oo'] + 'Class') ],
    hasParameter: [
        new Resource('http://example.org/HelloWorldModule#dummyParamLazy', { lazy: Resource.newBoolean(true) }),
        new Resource('http://example.org/HelloWorldModule#instanceParamLazy', { lazy: Resource.newBoolean(true) }),
        new Resource('http://example.org/HelloWorldModule#idParamLazy', { lazy: Resource.newBoolean(true) })
    ],
    constructorArguments: new Resource(null, {
        list: [
            new Resource("_:param_hello_0_lazy", {
                fields: [
                    { k: new Resource('"dummyParamLazy"'), v: new Resource('http://example.org/HelloWorldModule#dummyParamLazy', { lazy: Resource.newBoolean(true) }) },
                    { k: new Resource('"instanceParamLazy"'), v: new Resource('http://example.org/HelloWorldModule#instanceParamLazy', { lazy: Resource.newBoolean(true) }) },
                    { k: new Resource('"idParamLazy"'), v: new Resource(Constants.PREFIXES['rdf'] + 'subject') }
                ]
            })
        ]
    })
});

// Module definition for Hello World
let helloWorldModule = new Resource('http://example.org/HelloWorldModule', {
  requireName: Resource.newString('test/helloworld'),
  hasComponent: [
    helloWorldComponent1,
    helloWorldComponent2,
    helloWorldComponent3,
    helloWorldComponent4,
    helloWorldComponent5,
    helloWorldComponent6,
    helloWorldComponent7,
    helloWorldComponent8
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

    it('should create valid arguments', function (done) {
      constructor.makeArguments().then((args) => {
        args.should.deepEqual([ { comments: 'true', lineMode: 'true', n3: 'true' } ]);
        done();
      }).catch(done);
    });

    it('should make a valid instance', function (done) {
      constructor.create().then((instance) => {
        instance.should.not.be.null();
        instance.should.be.instanceof(N3.Lexer);
        done();
      }).catch(done);
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

    it('should create valid arguments', function (done) {
      constructor.makeArguments().then((args) => {
        args.length.should.equal(1);
        args[0].format.should.equal('application/trig');
        args[0].lexer.should.not.be.null();
        args[0].lexer.should.be.instanceof(N3.Lexer);
        done();
      }).catch(done);
    });

    it('should make a valid instance', function (done) {
      constructor.create().then((instance) => {
        instance.should.not.be.null();
        instance.should.be.instanceof(N3.Parser);
        done();
      }).catch(done);
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

    it('should create valid arguments', function (done) {
      constructor.makeArguments().then((args) => {
        args.should.deepEqual([]);
        done();
      }).catch(done);
    });

    it('should make a valid instance', function (done) {
      constructor.create().then((instance) => {
        instance.should.not.be.null();
        instance.should.be.instanceof(Function); // Because N3Util is a function
        done();
      }).catch(done);
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

    it('should create valid arguments', function (done) {
      constructor.makeArguments().then((args) => {
        args.should.deepEqual([{
          'dummyParam': 'true',
        }]);
        done();
      }).catch(done);
    });

    it('should fail to make a valid instance', function () {
      return expect(constructor.create()).to.be.rejectedWith(Error);
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

    it('should create valid arguments', function (done) {
      constructor.makeArguments().then((args) => {
        args.should.deepEqual([{
          'dummyParam': 'true',
          'instanceParam': new Hello()
        }]);
        done();
      }).catch(done);
    });

    it('should make a valid instance', function (done) {
      constructor.create().then((instance) => {
        instance.should.not.be.null();
        instance.should.be.instanceof(Hello);
        done();
      }).catch(done);
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

    it('should create valid arguments', function (done) {
      constructor.makeArguments().then((args) => {
        args.should.deepEqual([{
          'idParam': 'http://example.org/myHelloComponent'
        }]);
        done();
      }).catch(done);
    });

    it('should make a valid instance', function (done) {
      constructor.create().then((instance) => {
        instance.should.not.be.null();
        instance.should.be.instanceof(Hello);
        done();
      }).catch(done);
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

    it('should create valid arguments', function (done) {
      constructor.makeArguments().then((args) => {
        args.should.deepEqual([[
          'true', 'false'
        ]]);
        done();
      }).catch(done);
    });

    it('should ake a valid instance', function (done) {
      constructor.create().then((instance) => {
        instance.should.not.be.null();
        instance.should.be.instanceof(Hello);
        done();
      }).catch(done);
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

    it('should create valid arguments', function (done) {
      constructor.makeArguments().then((args) => {
        args.should.deepEqual([{
          'dummyParam1': [ 'a', 'b' ],
          'dummyParam2': [ 'a' ],
        }]);
        done();
      }).catch(done);
    });

    it('should make a valid instance', function (done) {
      constructor.create().then((instance) => {
        instance.should.not.be.null();
        instance.should.be.instanceof(Hello);
        done();
      }).catch(done);
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

    it('should create valid arguments', function (done) {
      constructor.makeArguments().then((args) => {
        args.should.deepEqual([{
          'dummyParam1': 'true',
          'dummyParam2': 'false',
        }]);
        done();
      }).catch(done);
    });

    it('should make a valid instance', function (done) {
      constructor.create().then((instance) => {
        instance.should.not.be.null();
        instance.should.be.instanceof(Hello);
        done();
      }).catch(done);
    });
  });

  describe('for a hello world component with default scoped values', function () {
    let constructor;
    beforeEach(function () {
      constructor = new MappedNamedComponentFactory(helloWorldModule, helloWorldComponent6, new Resource(null, { types: [ helloWorldComponent6 ] }), true);
    });

    it('should be valid', function () {
      constructor.should.not.be.null();
    });

    it('should create valid arguments', function (done) {
      constructor.makeArguments().then((args) => {
        args.should.deepEqual([{
          'dummyParam1': [ 'a', 'b' ],
          'dummyParam2': [ 'a' ],
        }]);
        done();
      }).catch(done);
    });

    it('should make a valid instance', function (done) {
      constructor.create().then((instance) => {
        instance.should.not.be.null();
        instance.should.be.instanceof(Hello);
        done();
      }).catch(done);
    });
  });

  describe('for a hello world component with overridden default scoped values', function () {
    let constructor;
    beforeEach(function () {
      constructor = new MappedNamedComponentFactory(helloWorldModule, helloWorldComponent6, {
        'http://example.org/n3#dummyParam1': Resource.newBoolean(true),
        'http://example.org/n3#dummyParam2': Resource.newBoolean(false)
      }, true);
    });

    it('should be valid', function () {
      constructor.should.not.be.null();
    });

    it('should create valid arguments', function (done) {
      constructor.makeArguments().then((args) => {
        args.should.deepEqual([{
          'dummyParam1': 'true',
          'dummyParam2': 'false',
        }]);
        done();
      }).catch(done);
    });

    it('should make a valid instance', function (done) {
      constructor.create().then((instance) => {
        instance.should.not.be.null();
        instance.should.be.instanceof(Hello);
        done();
      }).catch(done);
    });
  });

  describe('for a hello world component with non-applicable default scoped values', function () {
    let constructor;
    beforeEach(function () {
      constructor = new MappedNamedComponentFactory(helloWorldModule, helloWorldComponent6, new Resource(null, { types: [ helloWorldComponent5 ] }), true);
    });

    it('should be valid', function () {
      constructor.should.not.be.null();
    });

    it('should create valid arguments', function (done) {
      constructor.makeArguments().then((args) => {
        args.should.deepEqual([{}]);
        done();
      }).catch(done);
    });

    it('should make a valid instance', function (done) {
      constructor.create().then((instance) => {
        instance.should.not.be.null();
        instance.should.be.instanceof(Hello);
        done();
      }).catch(done);
    });
  });

    describe('for a hello world component with a missing required parameter', function () {
        let constructor;
        beforeEach(function () {
            constructor = new MappedNamedComponentFactory(helloWorldModule, helloWorldComponent7, {}, true);
        });

        it('should be valid', function () {
            constructor.should.not.be.null();
        });

        it('should not make a valid instance', function (done) {
            constructor.create().then(() => done('Instance can not be valid')).catch(() => done());
        });
    });

    describe('for a hello world component with a valid required parameter', function () {
        let constructor;
        beforeEach(function () {
            constructor = new MappedNamedComponentFactory(helloWorldModule, helloWorldComponent7, {
                'http://example.org/HelloWorldModule#requiredParam': Resource.newBoolean(true),
            }, true);
        });

        it('should be valid', function () {
            constructor.should.not.be.null();
        });

        it('should create valid arguments', function (done) {
            constructor.makeArguments().then((args) => {
                args.should.deepEqual([[
                    'true'
                ]]);
                done();
            }).catch(done);
        });

        it('should make a valid instance', function (done) {
            constructor.create().then((instance) => {
                instance.should.not.be.null();
                instance.should.be.instanceof(Hello);
                done();
            }).catch(done);
        });
    });

    describe('for a hello world component with lazy parameters', function () {
        let constructor;
        beforeEach(function () {
            constructor = new MappedNamedComponentFactory(helloWorldModule, helloWorldComponent8, {
                'http://example.org/HelloWorldModule#dummyParamLazy': Resource.newBoolean(true),
            }, true);
        });

        it('should be valid', function () {
            constructor.should.not.be.null();
        });

        it('should create valid arguments', function (done) {
            constructor.makeArguments().then((args) => {
                args[0]['dummyParamLazy']().then((value) => {
                    value.should.equal('true');
                    done();
                });
            }).catch(done);
        });

        it('should make a valid instance', function (done) {
            constructor.create().then((instance) => {
                instance.should.not.be.null();
                instance.should.be.instanceof(Hello);
                done();
            }).catch(done);
        });
    });

  describe('for a hello world component with variables', function () {
    let constructor;
    beforeEach(function () {
      const variable = new Resource('ex:var');
      variable.types = [new Resource(Constants.PREFIXES['om'] + 'Variable')];
      constructor = new MappedNamedComponentFactory(helloWorldModule, helloWorldComponent2, {
        'http://example.org/HelloWorldModule#dummyParam': variable,
        'http://example.org/HelloWorldModule#instanceParam': MappedNamedComponentFactory
            .makeUnnamedDefinitionConstructor(helloWorldModule, helloWorldComponent1)({})
      }, true);
    });

    it('should be valid', function () {
      constructor.should.not.be.null();
    });

    it('should create valid arguments', function (done) {
      constructor.makeArguments({
        variables: {
          'ex:var': 3000,
        },
      }).then((args) => {
        args.should.deepEqual([{
          'dummyParam': 3000,
          'instanceParam': new Hello()
        }]);
        done();
      }).catch(done);
    });

    it('should throw when a variable remains undefined', function (done) {
      constructor.makeArguments({
        variables: {},
      }).catch((error) => {
        error.should.deepEqual(new Error('Undefined variable: ex:var'));
        done();
      });
    });

    it('should throw when no variables are passed', function (done) {
      constructor.makeArguments().catch((error) => {
        error.should.deepEqual(new Error('Undefined variable: ex:var'));
        done();
      });
    });

    it('should make a valid instance', function (done) {
      constructor.create({
        variables: {
          'ex:var': 3000,
        },
      }).then((instance) => {
        instance.should.not.be.null();
        instance.should.be.instanceof(Hello);
        instance._params.dummyParam.should.equal(3000);
        done();
      }).catch(done);
    });
  });

});
