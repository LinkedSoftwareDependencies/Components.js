require('should');
const Resource = require("../../lib/rdf/Resource").Resource;
const UnnamedComponentFactory = require("../../lib/factory/UnnamedComponentFactory").UnnamedComponentFactory;
const ComponentRunner = require("../../lib/Loader").Loader;
const Hello = require("../helloworld").HelloNested.Deeper.Hello;
const fs = require("fs");
const N3 = require('n3');

// Component definition for an N3 Lexer
let n3LexerComponent = new Resource('http://example.org/n3#Lexer', {
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

// Component definition for an N3 Parser
let n3ParserComponent = new Resource('http://example.org/n3#Parser', {
  requireName: Resource.newString('n3'),
  requireElement: Resource.newString('Parser'),
  arguments: new Resource(null, {
    list: [
      new Resource("_:param_parser_0", {
        fields: [
          { k: new Resource('"format"'), v: new Resource('"application/trig"') },
          { k: new Resource('"lexer"') , v: n3LexerComponent }
        ]
      })
    ]
  })
});

// Component definition for an N3 Parser
let nestedHelloWorldComponent = new Resource('http://example.org/n3#Parser', {
  requireName: Resource.newString('../../test/helloworld'),
  requireElement: Resource.newString('HelloNested.Deeper.Hello'),
  arguments: new Resource(null, {
    list: []
  })
});

// Component definition for an N3 Lexer with an array argument
let n3LexerComponentArray = new Resource('http://example.org/n3#Lexer', {
  requireName: Resource.newString('n3'),
  requireElement: Resource.newString('Lexer'),
  arguments: new Resource(null, {
    list: [
      new Resource("_:param_lexer_0", {
        elements: [ { v: new Resource('"A"') }, { v: new Resource('"B"') }, { v: new Resource('"C"') } ]
      })
    ]
  })
});

describe('UnnamedComponentFactory', function () {

  describe('#getArgumentValue', function () {
    it('should create valid literals', function () {
      UnnamedComponentFactory.getArgumentValue(new Resource('"application/trig"')).should.equal('application/trig');
    });

    it('should create valid instances', function () {
      let instance = UnnamedComponentFactory.getArgumentValue(n3LexerComponent, new ComponentRunner());
      instance.should.not.be.null();
      instance.should.be.instanceof(N3.Lexer);
    });
  });

  describe('for an N3 Lexer', function () {
    let constructor;
    beforeEach(function () {
      constructor = new UnnamedComponentFactory(n3LexerComponent, true);
    });

    it('should be valid', function () {
      constructor.should.not.be.null();
    });

    it('should create valid arguments', function () {
      constructor.makeArguments().should.deepEqual([ { comments: 'true' } ]);
    });

    it('should make a valid instance', function () {
      let instance = constructor.create();
      instance.should.not.be.null();
      instance.should.be.instanceof(N3.Lexer);
    });
  });

  describe('for an N3 Lexer with array arguments', function () {
    let constructor;
    beforeEach(function () {
      constructor = new UnnamedComponentFactory(n3LexerComponentArray, true);
    });

    it('should be valid', function () {
      constructor.should.not.be.null();
    });

    it('should create valid arguments', function () {
      constructor.makeArguments().should.deepEqual([ [ 'A', 'B', 'C' ] ]);
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
      constructor = new UnnamedComponentFactory(n3ParserComponent, true);
    });

    it('should be valid', function () {
      constructor.should.not.be.null();
    });

    it('should create valid arguments', function () {
      let args = constructor.makeArguments();
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

  describe('for a nested HelloWorld component', function () {
    let constructor;
    beforeEach(function () {
      constructor = new UnnamedComponentFactory(nestedHelloWorldComponent, true);
    });

    it('should be valid', function () {
      constructor.should.not.be.null();
    });

    it('should create valid arguments', function () {
      let args = constructor.makeArguments();
      args.length.should.equal(0);
    });

    it('should make a valid instance', function () {
      let instance = constructor.create();
      instance.should.not.be.null();
      instance.should.be.instanceof(Hello);
    });
  });
});
