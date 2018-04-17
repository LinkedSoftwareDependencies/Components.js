require('should');
var chai = require("chai");
var expect = chai.expect;
chai.use(require("chai-as-promised"));
const Resource = require("../../lib/rdf/Resource").Resource;
const fs = require("fs");
const N3 = require('n3');
const UnmappedNamedComponentFactory = require("../../lib/factory/UnmappedNamedComponentFactory").UnmappedNamedComponentFactory;

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
let n3DummyComponentDefaultsScoped = new Resource('http://example.org/n3#Dummy', {
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
      constructor.should.not.be.null();
      constructor.should.be.instanceof(Function);
      constructor({}).should.be.instanceof(Resource);
    });

    it('should create a resource with undefined arguments when constructed with no arguments', function () {
      let instance = UnmappedNamedComponentFactory.makeUnnamedDefinitionConstructor(n3Module, n3LexerComponent)({});
      instance.should.be.instanceof(Resource);
      instance.should.have.property('value', 'http://example.org/n3#Lexer');
      instance.should.have.property('termType', 'NamedNode');
      instance.should.have.property('requireName', Resource.newString('n3'));
      instance.should.have.property('requireElement', Resource.newString('Lexer'));
      instance.should.have.property('arguments');
      instance.arguments.list.should.deepEqual([
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
      let instance = UnmappedNamedComponentFactory.makeUnnamedDefinitionConstructor(n3Module, n3LexerComponent)({
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
    let constructor;
    beforeEach(function () {
      constructor = new UnmappedNamedComponentFactory(n3Module, n3LexerComponent, {
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
        args.should.deepEqual([{
          'http://example.org/n3#lineMode': 'true',
          'http://example.org/n3#n3': 'true',
          'http://example.org/n3#comments': 'true'
        }]);
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
      constructor.should.not.be.null();
    });

    it('should create valid arguments', function (done) {
      constructor.makeArguments().then((args) => {
        args.length.should.equal(1);
        args[0].should.have.property('http://example.org/n3#format', 'application/trig');
        args[0]['http://example.org/n3#lexer'].should.be.instanceof(N3.Lexer);
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
      constructor = new UnmappedNamedComponentFactory(n3Module, n3UtilComponent, {}, false);
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
        instance.should.be.instanceof(Function); // Because N3Util is a function
        done();
      }).catch(done);;
    });
  });

  describe('for an N3 Dummy', function () {
    let constructor;
    beforeEach(function () {
      constructor = new UnmappedNamedComponentFactory(n3Module, n3DummyComponent, {
        'http://example.org/n3#dummyParam': Resource.newBoolean(true)
      }, true);
    });

    it('should be valid', function () {
      constructor.should.not.be.null();
    });

    it('should create valid arguments', function (done) {
      constructor.makeArguments().then((args) => {
        args.should.deepEqual([{
          'http://example.org/n3#dummyParam': 'true',
        }]);
        done();
      }).catch(done);
    });

    it('should fail to make a valid instance', function () {
      return expect(constructor.create()).to.be.rejectedWith(Error);
    });
  });

  describe('for an N3 Dummy with default values', function () {
    let constructor;
    beforeEach(function () {
      constructor = new UnmappedNamedComponentFactory(n3Module, n3DummyComponentDefaults, {}, true);
    });

    it('should be valid', function () {
      constructor.should.not.be.null();
    });

    it('should create valid arguments', function (done) {
      constructor.makeArguments().then((args) => {
        args.should.deepEqual([{
          'http://example.org/n3#dummyParam1': [ 'a', 'b' ],
          'http://example.org/n3#dummyParam2': [ 'a' ],
        }]);
        done();
      }).catch(done);
    });

    it('should fail to make a valid instance', function () {
      return expect(constructor.create()).to.be.rejectedWith(Error);
    });
  });

  describe('for an N3 Dummy with overridden default values', function () {
    let constructor;
    beforeEach(function () {
      constructor = new UnmappedNamedComponentFactory(n3Module, n3DummyComponentDefaults, {
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
          'http://example.org/n3#dummyParam1': 'true',
          'http://example.org/n3#dummyParam2': 'false',
        }]);
        done();
      }).catch(done);
    });

    it('should fail to make a valid instance', function () {
      return expect(constructor.create()).to.be.rejectedWith(Error);
    });
  });

  describe('for an N3 Dummy with default scoped values', function () {
    let constructor;
    beforeEach(function () {
      constructor = new UnmappedNamedComponentFactory(n3Module, n3DummyComponentDefaultsScoped, {}, true);
    });

    it('should be valid', function () {
      constructor.should.not.be.null();
    });

    it('should create valid arguments', function (done) {
      constructor.makeArguments().then((args) => {
        args.should.deepEqual([{
          'http://example.org/n3#dummyParam1': [ 'a', 'b' ],
          'http://example.org/n3#dummyParam2': [ 'a' ],
        }]);
        done();
      }).catch(done);
    });

    it('should fail to make a valid instance', function () {
      return expect(constructor.create()).to.be.rejectedWith(Error);
    });
  });

  describe('for an N3 Dummy with overridden default scoped values', function () {
    let constructor;
    beforeEach(function () {
      constructor = new UnmappedNamedComponentFactory(n3Module, n3DummyComponentDefaultsScoped, {
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
          'http://example.org/n3#dummyParam1': 'true',
          'http://example.org/n3#dummyParam2': 'false',
        }]);
        done();
      }).catch(done);
    });

    it('should fail to make a valid instance', function () {
      return expect(constructor.create()).to.be.rejectedWith(Error);
    });
  });

  describe('for an N3 Dummy with fixed values', function () {
    let constructor;
    beforeEach(function () {
      constructor = new UnmappedNamedComponentFactory(n3Module, n3DummyComponentFixed, {}, true);
    });

    it('should be valid', function () {
      constructor.should.not.be.null();
    });

    it('should create valid arguments', function (done) {
      constructor.makeArguments().then((args) => {
        args.should.deepEqual([{
          'http://example.org/n3#dummyParam1': [ 'a', 'b' ],
          'http://example.org/n3#dummyParam2': 'a',
        }]);
        done();
      }).catch(done);
    });

    it('should fail to make a valid instance', function () {
      return expect(constructor.create()).to.be.rejectedWith(Error);
    });
  });

  describe('for an N3 Dummy with fixed and additional values', function () {
    let constructor;
    beforeEach(function () {
      constructor = new UnmappedNamedComponentFactory(n3Module, n3DummyComponentFixed, {
        'http://example.org/n3#dummyParam1': [ Resource.newBoolean(true) ]
      }, true);
    });

    it('should be valid', function () {
      constructor.should.not.be.null();
    });

    it('should create valid arguments', function (done) {
      constructor.makeArguments().then((args) => {
        args.should.deepEqual([{
          'http://example.org/n3#dummyParam1': [ 'true', 'a', 'b' ],
          'http://example.org/n3#dummyParam2': 'a',
        }]);
        done();
      }).catch(done);
    });

    it('should fail to make a valid instance', function () {
      return expect(constructor.create()).to.be.rejectedWith(Error);
    });
  });

  describe('for an N3 Dummy with a lazy parameter', function () {
    let constructor;
    beforeEach(function () {
      constructor = new UnmappedNamedComponentFactory(n3Module, n3DummyComponentLazy, {
        'http://example.org/n3#dummyParam': Resource.newBoolean(true)
      }, true);
    });

    it('should be valid', function () {
      constructor.should.not.be.null();
    });

    it('should create valid arguments', function (done) {
      constructor.makeArguments().then((args) => {
        args[0]['http://example.org/n3#dummyParam']().then((value) => {
          value.should.equal('true');
          done();
        });
      }).catch(done);
    });
  });

  describe('for an N3 Dummy with fixed and additional values, adding to a fixed, unique value', function () {

    it('should throw an error', function () {
      expect(() => {
        new UnmappedNamedComponentFactory(n3Module, n3DummyComponentFixed, {
          'http://example.org/n3#dummyParam1': [ Resource.newBoolean(true) ],
          'http://example.org/n3#dummyParam2': [ Resource.newBoolean(true) ]
        }, true)
      }).to.throw(Error);
    });
  });

});
